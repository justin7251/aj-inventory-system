import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { LowStockProductsComponent } from './components/low-stock-products/low-stock-products.component'; // Added import
import { StockPredictionGraphComponent } from './components/stock-prediction-graph/stock-prediction-graph.component'; // Added import
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    DashboardComponent,
    LowStockProductsComponent, // Added component
    StockPredictionGraphComponent // Added component
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    SharedModule
  ],
  exports: [
    DashboardComponent,
    LowStockProductsComponent, // Added component
    StockPredictionGraphComponent // Added component
  ]
})
export class DashboardModule { }
