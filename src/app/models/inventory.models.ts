export interface Product {
  SKU: string; // Primary Key
  name: string;
  description?: string;
  currentStock: { [warehouseId: string]: number }; // warehouseId: quantity
  safetyStockQuantity: number;
  preferredSupplierId: string; // Foreign Key to Supplier
  // Fields for multi-warehouse inventory sync (can be added later)
  // e.g., lastSyncTimestamp?: Date;

  // Shipping related fields
  weight?: number; // e.g., 0.5
  weightUnit?: 'kg' | 'lb' | 'oz' | 'g'; // Kilograms or Pounds
  length?: number; // e.g., 10
  width?: number; // e.g., 10
  height?: number; // e.g., 10
  dimensionUnit?: 'cm' | 'in'; // Centimeters or Inches
}

export interface Warehouse {
  warehouseId: string; // Primary Key
  locationName: string;
  address?: string;
}

export interface SalesOrderItem {
  SKU: string;
  quantity: number;
  price?: number; // Price per unit at the time of sale
}

export interface SalesOrder {
  orderId: string; // Primary Key
  orderDate: Date;
  items: SalesOrderItem[];
  customerLocation?: string; // For order routing
  // Fields for sales velocity calculation
  // e.g., channel?: 'online' | 'store' | 'ebay';

  // Shipping related fields
  shippingCarrier?: string; // e.g., 'Shippo', 'UPS', 'RoyalMail', 'FedEx'
  shippingServiceLevel?: string; // e.g., 'ups_ground', 'royal_mail_first_class', 'shippo_fedex_ground'
  shippingCost?: number;
  trackingNumber?: string;
  shippoTransactionId?: string; // If Shippo is used for label generation
  labelUrl?: string; // URL to the label if hosted by provider (e.g., Shippo)
  labelData?: string; // Base64 encoded label data if generated directly or not URL-addressable
  estimatedDeliveryDate?: Date;
}

export interface Supplier {
  supplierId: string; // Primary Key
  name: string;
  contactInfo?: string;
  // Fields for supplier performance tracking
  // e.g., averageOnTimeDeliveryRate?: number;
}

export interface SupplierProductInfo {
  supplierProductInfoId: string; // Primary Key or combine supplierId+SKU for PK
  supplierId: string; // Foreign Key
  SKU: string; // Foreign Key
  leadTimeDays: number; // Average lead time
  unitCost: number;
  minimumOrderQuantity: number;
  // Fields for tracking supplier reliability for this specific product
  // e.g., historicalLeadTimeVariance?: number;
}

export interface PurchaseOrderItem {
  SKU: string;
  quantity: number;
  unitCost: number; // Cost at the time of PO creation
}

export interface PurchaseOrder {
  poId: string; // Primary Key
  creationDate: Date;
  supplierId: string; // Foreign Key
  items: PurchaseOrderItem[];
  expectedDeliveryDate: Date;
  status: 'pending' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  // Fields for tracking
  // e.g., actualDeliveryDate?: Date;
  // e.g., notes?: string;
}

// Basic representation for sales velocity calculation
export interface HistoricalSale {
  SKU: string;
  quantitySold: number;
  saleDate: Date;
}

// Interface for the result of a stock prediction
export interface StockPrediction {
  SKU: string;
  daysUntilStockout: number;
  predictedStockoutDate: Date | null;
}

// Interface for reorder advice
export interface ReorderAdvice {
  SKU: string;
  shouldReorder: boolean;
  currentStock: number;
  safetyStock: number;
  salesVelocityPerDay: number;
  daysUntilStockout: number;
  leadTimeDays: number;
  reorderQuantity?: number;
  preferredSupplierId?: string;
  minimumOrderQuantity?: number;
  finalOrderQuantity?: number;
  estimatedCost?: number;
}
