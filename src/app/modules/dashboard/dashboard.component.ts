import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  DashboardService,
  OrderSummaryData,
  HighchartsChartOptionsData,
  SalesByProductData
} from '../dashboard.service';
import { Observable } from 'rxjs';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // ── Period toggle ──────────────────────────────────────
  activePeriod: string = '30d';

  setPeriod(period: string): void {
    this.activePeriod = period;
    // TODO: pass period into your service calls to re-fetch filtered data
  }

  // ── Observables ────────────────────────────────────────
  orderSummaryData$!:             Observable<OrderSummaryData>;
  monthlySalesChartOptions$!:     Observable<HighchartsChartOptionsData>;
  salesByProductData$!:           Observable<SalesByProductData>;
  monthlyCogsRevenueChartOptions$!: Observable<HighchartsChartOptionsData>;
  channelBreakdownData$!:         Observable<any>;   // ← was missing
  recentOrders$!:                 Observable<any>;   // ← was missing

  salesByProductStartDate: string = '';
  salesByProductEndDate:   string = '';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    Highcharts.setOptions({ accessibility: { enabled: false } });

    this.orderSummaryData$             = this.dashboardService.getOrderSummaryData();
    this.monthlySalesChartOptions$     = this.dashboardService.getMonthlySalesAndOrdersData();
    this.monthlyCogsRevenueChartOptions$ = this.dashboardService.getMonthlyCogsAndRevenue();

    // Hook these up once your service has the methods.
    // For now, emit empty loading states so the template doesn't crash.
    this.channelBreakdownData$ = this.dashboardService.getChannelBreakdownData
      ? this.dashboardService.getChannelBreakdownData()
      : new Observable(obs => obs.next({ isLoading: false, items: [], growth: '—', totalOrders: 0, churn: '—' }));

    this.recentOrders$ = this.dashboardService.getRecentOrders
      ? this.dashboardService.getRecentOrders()
      : new Observable(obs => obs.next({ isLoading: false, data: [] }));

    this.loadSalesByProductData();
  }

  loadSalesByProductData(): void {
    const startDate = this.salesByProductStartDate
      ? new Date(this.salesByProductStartDate) : undefined;
    const endDate = this.salesByProductEndDate
      ? new Date(this.salesByProductEndDate) : undefined;

    this.salesByProductData$ = this.dashboardService.getSalesByProductData(startDate, endDate);
  }

  ngOnDestroy(): void {}
}
