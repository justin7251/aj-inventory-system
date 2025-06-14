export interface Product {
   $key: string;
   product_no: string;
   product_name: string;
   color: string;
   quantity: number;
   product_type: string;
   price: number;
   costPrice?: number;
   update_date: Date;
   created_date: Date;
   deleted_date: Date;
   deleted: boolean;
}