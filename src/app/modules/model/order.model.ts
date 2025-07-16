import { Timestamp } from '@angular/fire/firestore';

export interface OrderItem {
  product_no: string;
  product_name?: string; // Or ensure it's always present
  quantity: number;
  item_cost: number; // This seems to be unit price * quantity for the line item
  // Add other item-specific fields if necessary
}

export interface Order {
	id?: string; // Changed from $key, to align with idField usage
	user_id: string;
	customer_name: string;
	telephone: number; // Consider if string is more appropriate for numbers with leading zeros
	delivery_address: string;
	payment_type: string;
	items: OrderItem[]; // Typed items array
	delivery_cost: number;
	discount: number;
	total_cost: number;
	totalEarnings?: number;
	// Firestore typically returns Timestamps. Allow string for flexibility if parsing from other sources.
	update_date?: Timestamp | Date | string;
	created_date?: Timestamp | Date | string;
	deleted_date?: Timestamp | Date | string;
	deleted?: boolean; // Make optional if not always present

	// Shipping properties
	shippingCarrier?: string;
	shippingServiceLevel?: string;
	shippingCost?: number;
	trackingNumber?: string;
	shippoTransactionId?: string;
	labelUrl?: string;
	estimatedDeliveryDate?: Date;
}