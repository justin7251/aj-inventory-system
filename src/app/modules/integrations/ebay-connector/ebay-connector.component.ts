import { Component, OnInit } from '@angular/core';
import { EbayService } from '../../services/ebay.service'; // Corrected path
import { OrderService } from '../../services/order.service'; // Path was already corrected
import { Order } from '../../model/order.model'; // Ensure this path is correct

@Component({
  selector: 'app-ebay-connector',
  templateUrl: './ebay-connector.component.html',
  styleUrls: ['./ebay-connector.component.scss']
})
export class EbayConnectorComponent implements OnInit {
  isLoading: boolean = false;
  ordersProcessed: number = 0;
  ordersFailed: number = 0;
  lastSyncTime: Date | null = null;
  errorMessages: string[] = [];

  constructor(
    private ebayService: EbayService,
    private orderService: OrderService // Changed itemService to orderService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Initiates the synchronization process for eBay orders.
   * It sets the loading state, fetches new orders via `EbayService`,
   * and then processes each order using `ItemService.addOrder()`.
   * Updates component properties to reflect the outcome (processed count, failures, errors).
   * This method is asynchronous due to the nature of service calls.
   */
  async syncEbayOrders(): Promise<void> {
    this.isLoading = true;
    this.ordersProcessed = 0;
    this.ordersFailed = 0;
    this.errorMessages = [];

    this.ebayService.fetchNewEbayOrders().subscribe(
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
              const errorMessage = `Failed to process order ${order.id || 'N/A'}: ${error.message || error}`;
              console.error(errorMessage, error);
              this.errorMessages.push(errorMessage);
            }
          }
        } else {
          this.errorMessages.push('No new orders found or an error occurred while fetching.');
        }
        this.isLoading = false;
        this.lastSyncTime = new Date();
      },
      (error: any) => {
        console.error('Error fetching eBay orders:', error);
        this.errorMessages.push(`Error fetching eBay orders: ${error.message || error}`);
        this.isLoading = false;
        this.lastSyncTime = new Date();
      }
    );
  }

  // Placeholder methods for other eBay functionalities
  syncEbayProducts(): void {
    this.isLoading = true;
    this.errorMessages = []; // Clear previous errors
    // Potentially add specific product processing counters if needed
    this.ebayService.syncProductListings([] /* pass actual products from your app here */).subscribe(
      (success) => {
        if (success) {
          // Handle success - maybe a success message or update UI
          // e.g., this.productSyncSuccessMessage = "Products synced successfully!";
          console.log('Ebay products synced successfully.');
        } else {
          this.errorMessages.push('Failed to sync eBay products.');
        }
        this.isLoading = false;
      },
      (error: any) => {
        this.errorMessages.push(`Error syncing eBay products: ${error.message || error}`);
        this.isLoading = false;
      }
    );
  }

  updateEbayInventory(): void {
    this.isLoading = true;
    this.errorMessages = []; // Clear previous errors
    // Potentially add specific inventory update counters if needed
    this.ebayService.updateInventory([] /* pass actual inventory updates from your app here */).subscribe(
      (success) => {
        if (success) {
          // Handle success - maybe a success message or update UI
          // e.g., this.inventoryUpdateMessage = "Inventory updated successfully!";
          console.log('Ebay inventory updated successfully.');
        } else {
          this.errorMessages.push('Failed to update eBay inventory.');
        }
        this.isLoading = false;
      },
      (error: any) => {
        this.errorMessages.push(`Error updating eBay inventory: ${error.message || error}`);
        this.isLoading = false;
      }
    );
  }
}
