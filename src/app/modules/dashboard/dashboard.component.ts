import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'; // Added OnDestroy
import { DashboardService } from '../dashboard.service';
import { ItemService } from '../services/item.service'; // Added ItemService
import { Order } from '../model/order.model'; // Added Order model
import { Subscription } from 'rxjs'; // Added Subscription

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

// Define a type for the order data if it's coming from the older Firebase SDK structure
// For now, assuming GetOrdersList returns Observable<Order[]> as per ItemService refactor
// interface FirestoreOrder {
//   payload: {
//     doc: {
//       data: () => Order;
//       id: string;
//     }
//   }
// }


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy { // Implemented OnDestroy

	bigChart = [];
	cards = [];
	pieChart = [];

  // Properties for aggregated data
  totalLifetimeEarnings: number = 0;
  totalOrders: number = 0;
  averageEarningsPerOrder: number = 0;
  isLoading: boolean = true;
  private ordersSubscription: Subscription;
  
	constructor(
    private dashboardService: DashboardService,
    public itemService: ItemService // Injected ItemService
  ) { }
  
	ngOnInit() {
    this.bigChart = this.dashboardService.bigChart();
		this.cards = this.dashboardService.cards(); // This might be replaced or augmented
		this.pieChart = this.dashboardService.pieChart();

    this.fetchOrderData();
  }

  fetchOrderData() {
    this.isLoading = true;
    this.ordersSubscription = this.itemService.GetOrdersList()
      .subscribe(
        (orders: any[]) => { // Use any[] for now due to Firestore data structure uncertainty
          let currentTotalEarnings = 0;
          let currentTotalOrders = 0;

          // Check if orders are in the old Firebase format or new
          // The OrderComponent used item.payload.doc.data()
          // ItemService.GetOrdersList was changed to return Observable<Order[]>
          // Let's assume it's Order[] for now as per ItemService's current signature
          // If it's from snapshotChanges(), it will be like FirestoreOrder[]

          const processedOrders: Order[] = orders.map(orderData => {
            // If orderData has payload.doc.data structure
            if (orderData.payload && orderData.payload.doc) {
              const data = orderData.payload.doc.data() as Order;
              data.$key = orderData.payload.doc.id;
              return data;
            }
            // If orderData is already in Order structure (from collectionData)
            return orderData as Order;
          });

          for (const order of processedOrders) {
            if (order.totalEarnings !== undefined && typeof order.totalEarnings === 'number' && !isNaN(order.totalEarnings)) {
              currentTotalEarnings += order.totalEarnings;
            }
            currentTotalOrders++;
          }

          this.totalLifetimeEarnings = currentTotalEarnings;
          this.totalOrders = currentTotalOrders;
          this.averageEarningsPerOrder = this.totalOrders > 0 ? this.totalLifetimeEarnings / this.totalOrders : 0;

          this.isLoading = false;
        },
        (error) => {
          console.error('Error fetching orders:', error);
          this.isLoading = false;
        }
      );
  }
  
  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
  }

	columnHeader = {'position': 'Position', 'name': 'Name', 'weight': 'Total Cost', 'symbol': 'Shipping'};
  tableData: PeriodicElement[] = [
    { position: 1, name: 'John', weight: 50.99, symbol: 'H' },
    { position: 2, name: 'Tim', weight: 10.52, symbol: 'He' },
    { position: 3, name: 'Alan', weight: 20.5, symbol: 'Li' },
    { position: 4, name: 'Henry', weight: 60, symbol: 'Be' },
  ];

}
