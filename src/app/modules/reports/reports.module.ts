import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProfitAnalyticsReportComponent } from './profit-analytics-report/profit-analytics-report.component';
import { SharedModule } from 'src/app/shared/shared.module'; // For potential pipes, components

@NgModule({
  declarations: [
    ProfitAnalyticsReportComponent
  ],
  imports: [
    CommonModule,
    SharedModule, // Includes Material components, pipes etc.
    RouterModule.forChild([ // Example route, can be defined elsewhere
      { path: 'profit-margin', component: ProfitAnalyticsReportComponent }
    ])
  ],
  exports: [
    ProfitAnalyticsReportComponent
  ]
})
export class ReportsModule { }
