export interface Order {
	$key: string;
	user_id: string;
	customer_name: string;
	telephone: number;
	delivery_address: string;
	payment_type: string;
	items: [];
	delivery_cost: number;
	discount: number;
	total_cost: number;
	update_date: Date;
	created_date: Date;
	deleted_date: Date;
	deleted: boolean;
}