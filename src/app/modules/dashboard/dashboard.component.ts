import { Component, OnInit } from '@angular/core'; // Removed OnDestroy
import { DashboardService, OrderSummaryData } from '../dashboard.service'; // Added OrderSummaryData
// import { ItemService } from '../services/item.service'; // No longer directly needed if all data comes from DashboardService
import { Order } from '../model/order.model'; // May still be needed if any other part uses it, or can be removed
import { Observable, of } from 'rxjs'; // Removed Subscription
import { finalize } from 'rxjs/operators';
import { Timestamp } from '@angular/fire/firestore';
import * as Highcharts from 'highcharts';

// Removed PeriodicElement interface as it appears to be unused example code

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit { // Removed OnDestroy

  // Existing properties for charts directly from service
  bigChart = [];
  cards = [];
  pieChart = [];

  // New property for order summary data
  orderSummaryData$: Observable<OrderSummaryData>;

  // Properties for other charts
  monthlySalesChartOptions$: Observable<Highcharts.Options>;
  salesByProductData$: Observable<{ name: string; y: number }[]> = of([]);
  salesByProductStartDate: string = '';
  salesByProductEndDate: string = '';
  isSalesByProductLoading: boolean = false;
  monthlyCogsRevenueChartOptions$: Observable<Highcharts.Options> = of({});
  isCogsRevenueLoading: boolean = false;
  topSellingProductsChartData$: Observable<{ name: string; y: number }[]>;
  
  constructor(
    private dashboardService: DashboardService
    // public itemService: ItemService // Removed ItemService injection
  ) { }
  
  ngOnInit() {
    this.bigChart = this.dashboardService.bigChart();
    this.cards = this.dashboardService.cards();
    this.pieChart = this.dashboardService.pieChart();

    // Get order summary data from the service
    this.orderSummaryData$ = this.dashboardService.getOrderSummaryData();

    // Chart data fetching
    this.monthlySalesChartOptions$ = this.dashboardService.getMonthlySalesAndOrdersData();

    this.isCogsRevenueLoading = true;
    this.monthlyCogsRevenueChartOptions$ = this.dashboardService.getMonthlyCogsAndRevenue().pipe(
      finalize(() => this.isCogsRevenueLoading = false)
    );

    // For sales by product, let's get data for the current month by default.
    this.loadSalesByProductData();

    // Load data for the new top selling products chart
    this.topSellingProductsChartData$ = this.dashboardService.getTopSellingProductsData();
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
              data.id = orderData.payload.doc.id; // Changed $key to id
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

  // Removed columnHeader and tableData properties as they appear to be unused example code
}
// Trivial change for new commit
