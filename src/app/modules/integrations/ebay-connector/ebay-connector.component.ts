import { Component, OnInit } from '@angular/core';
import { EbayService } from '../../services/ebay.service';
import { ItemService } from '../../services/item.service';
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
    private itemService: ItemService
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
              await this.itemService.addOrder(order);
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
}
