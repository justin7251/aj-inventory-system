import { Timestamp } from "@angular/fire/firestore"; // Or "firebase/firestore" depending on version

export interface Product {
   id?: string; // Changed from $key
   product_no: string;
   product_name: string;
   color: string; // Assuming color is generally required
   quantity: number;
   product_type: string; // Assuming product_type is generally required
   price: number;
   costPrice?: number;
   // Dates can be Timestamps from Firestore or Date objects when manipulated
   update_date?: Date | Timestamp | string;
   created_date?: Date | Timestamp | string;
   deleted_date?: Date | Timestamp | string;
   deleted?: boolean;
}