import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  DashboardService,
  OrderSummaryData,
  HighchartsChartOptionsData,
  SalesByProductData
} from '../dashboard.service';
import { Observable, of } from 'rxjs';
// Finalize is no longer needed here as loading state is part of the emitted value by the service
// import { finalize } from 'rxjs/operators';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  cards$: Observable<number[]>;

  orderSummaryData$: Observable<OrderSummaryData>;
  monthlySalesChartOptions$: Observable<HighchartsChartOptionsData>;
  salesByProductData$: Observable<SalesByProductData>;
  monthlyCogsRevenueChartOptions$: Observable<HighchartsChartOptionsData>;
  topSellingProductsChartData$: Observable<SalesByProductData>;

  salesByProductStartDate: string = '';
  salesByProductEndDate: string = '';
  
  constructor(
    private dashboardService: DashboardService
  ) { }
  
  ngOnInit() {
    this.cards$ = this.dashboardService.cards();

    this.orderSummaryData$ = this.dashboardService.getOrderSummaryData();
    this.monthlySalesChartOptions$ = this.dashboardService.getMonthlySalesAndOrdersData();
    this.monthlyCogsRevenueChartOptions$ = this.dashboardService.getMonthlyCogsAndRevenue();
    this.topSellingProductsChartData$ = this.dashboardService.getTopSellingProductsData(); // For top 5 products pie chart

    // Initial load for sales by product (e.g., current month)
    this.loadSalesByProductData();
  }

  loadSalesByProductData(): void {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (this.salesByProductStartDate) {
      startDate = new Date(this.salesByProductStartDate);
      if (isNaN(startDate.getTime())) {
        startDate = undefined;
      }
    }

    if (this.salesByProductEndDate) {
      endDate = new Date(this.salesByProductEndDate);
      if (isNaN(endDate.getTime())) {
        endDate = undefined;
      }
    }

    // The service now handles default behavior if dates are not provided correctly.
    // The service methods return Observables that emit objects including loading state.
    this.salesByProductData$ = this.dashboardService.getSalesByProductData(startDate, endDate);
  }
  
  ngOnDestroy() {
    // Observables managed by async pipe don't need manual unsubscription.
  }

  // Unused properties like tableData, columnHeader were already removed.
  // Loading flags like isSalesByProductLoading, isCogsRevenueLoading are removed.
}
