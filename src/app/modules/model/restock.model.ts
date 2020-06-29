export interface Restock {
   $key: string;
   product_no: string;
   product_name: string;
   color: string;
   quantity: number;
   price: number;
   buyer_name: string;
   buyer_telephone: number;
   created_date: Date;
   deleted_date: Date;
   deleted: boolean;
}