import { Timestamp } from '@angular/fire/firestore';

export interface ProfitAnalyticsItemDetail {
  SKU: string;
  productName?: string;
  quantity: number;
  sellingPricePerUnit: number;
  costPricePerUnit: number;
  grossProfitPerUnit: number;
  profitMarginPercentage: number;
  totalRevenueForItem: number;
  totalCostForItem: number;
  totalProfitForItem: number;
}

export interface ProfitAnalyticsOrderDetail {
  orderId: string;
  orderDate: Timestamp | Date | string;
  customerName?: string;
  totalRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  overallOrderProfitMargin: number;
  items: ProfitAnalyticsItemDetail[];
}

export interface MonthlyProfitSummary {
  monthYear: string; // e.g., "Jan 2023" or "2023-01"
  totalRevenue: number;
  totalCOGS: number;
  totalGrossProfit: number;
  overallProfitMargin: number;
  totalOrders: number;
}

// Optional: For product-level aggregation
export interface ProductProfitSummary {
  SKU: string;
  productName?: string;
  totalQuantitySold: number;
  totalRevenueGenerated: number;
  totalCOGS: number;
  totalGrossProfit: number;
  averageProfitMargin: number; // Could be weighted average or simple average of item margins
}
