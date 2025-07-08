import { Component, OnInit } from '@angular/core';
import { AmazonService } from '../../services/amazon.service';
import { OrderService } from '../../services/order.service'; // Assuming OrderService is in modules/services
import { Order } from '../../model/order.model';

@Component({
  selector: 'app-amazon-connector',
  templateUrl: './amazon-connector.component.html',
  styleUrls: ['./amazon-connector.component.scss']
})
export class AmazonConnectorComponent implements OnInit {
  isLoading: boolean = false;
  ordersProcessed: number = 0;
  ordersFailed: number = 0;
  lastSyncTime: Date | null = null;
  errorMessages: string[] = [];

  constructor(
    private amazonService: AmazonService,
    private orderService: OrderService // To save/process orders into the main system
  ) { }

  ngOnInit(): void {
  }

  /**
   * Initiates the synchronization process for Amazon orders.
   */
  async syncAmazonOrders(): Promise<void> {
    this.isLoading = true;
    this.ordersProcessed = 0;
    this.ordersFailed = 0;
    this.errorMessages = [];

    this.amazonService.fetchNewAmazonOrders().subscribe(
      async (orders: Order[]) => {
        if (orders && orders.length > 0) {
          for (const order of orders) {
            try {
              // Ensure items array exists (it should be handled by the transformation, but good practice)
              if (!order.items) {
                order.items = [];
              }
              await this.orderService.createOrder(order); // Assuming createOrder exists
              this.ordersProcessed++;
            } catch (error: any) {
              this.ordersFailed++;
              const errorMessage = `Failed to process Amazon order ${order.id || 'N/A'}: ${error.message || error}`;
              console.error(errorMessage, error);
              this.errorMessages.push(errorMessage);
            }
          }
        } else {
          this.errorMessages.push('No new Amazon orders found or an error occurred while fetching.');
        }
        this.isLoading = false;
        this.lastSyncTime = new Date();
      },
      (error: any) => {
        console.error('Error fetching Amazon orders:', error);
        this.errorMessages.push(`Error fetching Amazon orders: ${error.message || error}`);
        this.isLoading = false;
        this.lastSyncTime = new Date(); // Record sync attempt time even on fetch error
      }
    );
  }

  // Placeholder methods for other Amazon functionalities
  syncAmazonProducts(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.amazonService.syncProductListings([] /* pass actual products here */).subscribe(
      (success) => {
        if (success) {
          // Handle success - maybe a success message
        } else {
          this.errorMessages.push('Failed to sync Amazon products.');
        }
        this.isLoading = false;
      },
      (error: any) => {
        this.errorMessages.push(`Error syncing Amazon products: ${error.message || error}`);
        this.isLoading = false;
      }
    );
  }

  updateAmazonInventory(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.amazonService.updateInventory([] /* pass actual inventory updates here */).subscribe(
      (success) => {
        if (success) {
          // Handle success
        } else {
          this.errorMessages.push('Failed to update Amazon inventory.');
        }
        this.isLoading = false;
      },
      (error: any) => {
        this.errorMessages.push(`Error updating Amazon inventory: ${error.message || error}`);
        this.isLoading = false;
      }
    );
  }
}
