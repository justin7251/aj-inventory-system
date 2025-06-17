import { Component, OnInit, OnDestroy } from '@angular/core';
import { DashboardService } from '../dashboard.service';
import { ItemService } from '../services/item.service';
import { Order } from '../model/order.model';
import { Observable, Subscription, of } from 'rxjs';
import { finalize } from 'rxjs/operators'; // Added finalize
import { Timestamp } from '@angular/fire/firestore'; // Keep for existing logic
import * as Highcharts from 'highcharts'; // Import Highcharts for Options type

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Existing properties
  bigChart = []; // This is assigned from dashboardService.bigChart()
  cards = [];    // This is assigned from dashboardService.cards()
  pieChart = []; // This is assigned from dashboardService.pieChart() - the original generic one

  totalLifetimeEarnings: number = 0;
  totalOrders: number = 0;
  averageEarningsPerOrder: number = 0;
  isLoading: boolean = true;
  private ordersSubscription: Subscription;

  // New properties for our charts
  monthlySalesChartOptions$: Observable<Highcharts.Options>;
  salesByProductData$: Observable<{ name: string; y: number }[]> = of([]);
  salesByProductStartDate: string = '';
  salesByProductEndDate: string = '';
  isSalesByProductLoading: boolean = false;
  monthlyCogsRevenueChartOptions$: Observable<Highcharts.Options> = of({});
  isCogsRevenueLoading: boolean = false;
  
  constructor(
    private dashboardService: DashboardService,
    public itemService: ItemService
  ) { }
  
  ngOnInit() {
    // Existing initializations
    this.bigChart = this.dashboardService.bigChart(); // Keep as is, might be used by other parts of template
    this.cards = this.dashboardService.cards();       // Keep as is
    this.pieChart = this.dashboardService.pieChart(); // Keep as is (original pie chart data)

    this.fetchOrderData(); // Existing method for summary cards

    // New chart data fetching
    this.monthlySalesChartOptions$ = this.dashboardService.getMonthlySalesAndOrdersData(); // Assuming this one doesn't need a specific loader for now as per req.

    this.isCogsRevenueLoading = true;
    this.monthlyCogsRevenueChartOptions$ = this.dashboardService.getMonthlyCogsAndRevenue().pipe(
      finalize(() => this.isCogsRevenueLoading = false)
    );

    // For sales by product, let's get data for the current month by default.
    this.loadSalesByProductData();
  }

  loadSalesByProductData(): void {
    this.isSalesByProductLoading = true;
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (this.salesByProductStartDate) {
      startDate = new Date(this.salesByProductStartDate);
      if (isNaN(startDate.getTime())) { // Check if date is invalid
        startDate = undefined;
      }
    }

    if (this.salesByProductEndDate) {
      endDate = new Date(this.salesByProductEndDate);
      if (isNaN(endDate.getTime())) { // Check if date is invalid
        endDate = undefined;
      }
    }

    // If one date is set, but not the other, or if dates are invalid,
    // we might want to default to current month or show an error.
    // For now, if either is invalid or missing (when one is provided), we fetch default.
    if ((startDate && !endDate) || (!startDate && endDate) || !startDate || !endDate ) {
        // If dates are partially set or invalid, fetch current month's data
        this.salesByProductData$ = this.dashboardService.getSalesByProductData().pipe(
          finalize(() => this.isSalesByProductLoading = false)
        );
    } else {
        // Both dates are valid and provided
        this.salesByProductData$ = this.dashboardService.getSalesByProductData(startDate, endDate).pipe(
          finalize(() => this.isSalesByProductLoading = false)
        );
    }
  }

  fetchOrderData() {
    this.isLoading = true;
    this.ordersSubscription = this.itemService.GetOrdersList()
      .subscribe(
        (orders: any[]) => {
          let currentTotalEarnings = 0;
          let currentTotalOrders = 0;

          const processedOrders: Order[] = orders.map(orderData => {
            if (orderData.payload && orderData.payload.doc) {
              const data = orderData.payload.doc.data() as Order;
              data.$key = orderData.payload.doc.id;
              return data;
            }
            return orderData as Order;
          });

          for (const order of processedOrders) {
            // Ensure totalEarnings is a valid number before adding
            if (order.totalEarnings !== undefined && typeof order.totalEarnings === 'number' && !isNaN(order.totalEarnings)) {
                 currentTotalEarnings += order.totalEarnings;
            }
            currentTotalOrders++;
          }

          this.totalLifetimeEarnings = currentTotalEarnings;
          this.totalOrders = currentTotalOrders;
          this.averageEarningsPerOrder = this.totalOrders > 0 ? this.totalLifetimeEarnings / this.totalOrders : 0;

          this.isLoading = false;
        },
        (error) => {
          console.error('Error fetching orders for summary cards:', error);
          this.isLoading = false;
        }
      );
  }
  
  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    // No need to unsubscribe from monthlySalesChartOptions$ and salesByProductData$
    // if we use the async pipe in the template.
  }

  // Existing table data properties
  columnHeader = {'position': 'Position', 'name': 'Name', 'weight': 'Total Cost', 'symbol': 'Shipping'};
  tableData: PeriodicElement[] = [
    { position: 1, name: 'John', weight: 50.99, symbol: 'H' },
    { position: 2, name: 'Tim', weight: 10.52, symbol: 'He' },
    { position: 3, name: 'Alan', weight: 20.5, symbol: 'Li' },
    { position: 4, name: 'Henry', weight: 60, symbol: 'Be' },
  ];
}
// Trivial change for new commit
