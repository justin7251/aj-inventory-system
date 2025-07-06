import { Component, OnInit } from '@angular/core';
import { ShopifyService } from '../../services/shopify.service'; // Changed import
import { OrderService } from '../../services/order.service'; // Changed ItemService to OrderService
import { Order } from '../../model/order.model';

@Component({
  selector: 'app-shopify-connector', // Changed selector
  templateUrl: './shopify-connector.component.html', // Changed template URL
  styleUrls: ['./shopify-connector.component.scss'] // Changed style URL
})
export class ShopifyConnectorComponent implements OnInit {
  isLoading: boolean = false;
  ordersProcessed: number = 0;
  ordersFailed: number = 0;
  lastSyncTime: Date | null = null;
  errorMessages: string[] = [];

  constructor(
    private shopifyService: ShopifyService, // Changed service
    private orderService: OrderService // Changed itemService to orderService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Initiates the synchronization process for Shopify orders.
   * It sets the loading state, fetches new orders via `ShopifyService`,
   * and then processes each order using `ItemService.addOrder()`.
   * Updates component properties to reflect the outcome (processed count, failures, errors).
   */
  async syncShopifyOrders(): Promise<void> { // Changed method name for clarity
    this.isLoading = true;
    this.ordersProcessed = 0;
    this.ordersFailed = 0;
    this.errorMessages = [];

    this.shopifyService.fetchNewShopifyOrders().subscribe( // Changed service call
      async (orders: Order[]) => {
        if (orders && orders.length > 0) {
          for (const order of orders) {
            try {
              // Ensure items array exists and is not null
              if (!order.items) {
                order.items = []; // Initialize with empty array if null/undefined
              }
              // Changed itemService.addOrder to orderService.createOrder
              await this.orderService.createOrder(order);
              this.ordersProcessed++;
            } catch (error: any) {
              this.ordersFailed++;
              // Removed order.externalOrderId as it's not on the Order model
              const errorMessage = `Failed to process Shopify order ${order.id || 'N/A'}: ${error.message || error}`;
              console.error(errorMessage, error);
              this.errorMessages.push(errorMessage);
            }
          }
        } else {
          this.errorMessages.push('No new Shopify orders found or an error occurred while fetching.');
        }
        this.isLoading = false;
        this.lastSyncTime = new Date();
      },
      (error: any) => {
        console.error('Error fetching Shopify orders:', error);
        this.errorMessages.push(`Error fetching Shopify orders: ${error.message || error}`);
        this.isLoading = false;
        this.lastSyncTime = new Date();
      }
    );
  }
}
