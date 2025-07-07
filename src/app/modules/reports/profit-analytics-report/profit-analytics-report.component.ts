import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardService, ChartData } from '../../dashboard.service';
import { MonthlyProfitSummary, ProfitAnalyticsOrderDetail } from '../../model/analytics.model';

@Component({
  selector: 'app-profit-analytics-report',
  templateUrl: './profit-analytics-report.component.html',
  styleUrls: ['./profit-analytics-report.component.scss']
})
export class ProfitAnalyticsReportComponent implements OnInit {

  monthlySummary$: Observable<ChartData<MonthlyProfitSummary[]>>;
  detailedOrders$: Observable<ChartData<ProfitAnalyticsOrderDetail[]>>;

  // For expanding/collapsing order items
  expandedOrderItems: { [orderId: string]: boolean } = {};

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.monthlySummary$ = this.dashboardService.getMonthlyProfitSummaryData();
    this.detailedOrders$ = this.dashboardService.getProfitMarginAnalyticsData();
  }

  toggleOrderItems(orderId: string): void {
    this.expandedOrderItems[orderId] = !this.expandedOrderItems[orderId];
  }

  // Helper to check if an order's items are expanded
  isOrderExpanded(orderId: string): boolean {
    return !!this.expandedOrderItems[orderId];
  }
}
