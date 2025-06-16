import { Component, OnInit, OnDestroy } from '@angular/core';
import { DashboardService } from '../dashboard.service';
import { ItemService } from '../services/item.service';
import { Order } from '../model/order.model';
import { Observable, Subscription } from 'rxjs'; // Added Observable
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
  salesByProductData$: Observable<{ name: string; y: number }[]>;
  
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
    this.monthlySalesChartOptions$ = this.dashboardService.getMonthlySalesAndOrdersData();
    // For sales by product, let's get data for the current month by default.
    // We can enhance this later with a month selector if needed.
    this.salesByProductData$ = this.dashboardService.getSalesByProductData();
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
