import { Timestamp } from '@angular/fire/firestore';

export type PackingStatus = 'pending' | 'packed' | 'shipped' | 'on_hold' | 'cancelled';

export interface PackingItem {
  id?: string; // Firestore document ID
  orderId: string; // Reference to the original order
  externalOrderId?: string; // Optional: ID from the external system (e.g., eBay order ID)

  productId: string; // Reference to the product in our system
  productSku?: string; // Optional: SKU from the external system / product master
  productName: string;
  quantityToPack: number;

  status: PackingStatus;
  priority?: number; // Optional: for prioritizing packing

  customerName: string;
  deliveryAddress: string; // Could be an object if more structured address is needed

  // Timestamps
  creationDate: Timestamp;
  lastUpdateDate?: Timestamp;
  packedDate?: Timestamp;
  shippedDate?: Timestamp;

  // Additional notes or details
  notes?: string;
  packerAssigned?: string; // ID or name of the person/station assigned to pack
}
