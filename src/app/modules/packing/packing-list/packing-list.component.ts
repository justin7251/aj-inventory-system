import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PackingItem, PackingStatus } from '../../model/packing-item.model';
import { PackingQueueService } from '../../services/packing-queue.service';
import { MatSnackBar } from '@angular/material/snack-bar'; // For user feedback

@Component({
  selector: 'app-packing-list',
  templateUrl: './packing-list.component.html',
  styleUrls: ['./packing-list.component.scss']
})
export class PackingListComponent implements OnInit, OnDestroy {
  packingItems$: Observable<PackingItem[]>;
  displayedColumns: string[] = [
    'creationDate',
    'orderId',
    'productName',
    'quantityToPack',
    'customerName',
    'status',
    'actions'
  ];

  availableStatuses: PackingStatus[] = ['pending', 'packed', 'shipped', 'on_hold', 'cancelled'];

  private itemSubscription: Subscription | undefined;

  constructor(
    private packingQueueService: PackingQueueService,
    private snackBar: MatSnackBar
  ) {
    this.packingItems$ = this.packingQueueService.getAllPackingItems(); // Or getPendingPackingItems() initially
  }

  ngOnInit(): void {
    // Optionally, subscribe here if you need to react to data changes locally
    // For example, logging or triggering other actions.
    // this.itemSubscription = this.packingItems$.subscribe(items => {
    //   console.log('Packing items updated:', items);
    // });
  }

  /**
   * Updates the status of a given packing item.
   * Validates if the item ID exists and if the new status is different from the current one.
   * Calls the `PackingQueueService` to persist the change and uses `MatSnackBar` to show feedback.
   *
   * @param item - The `PackingItem` to update.
   * @param newStatus - The `PackingStatus` to set for the item.
   */
  async updateStatus(item: PackingItem, newStatus: PackingStatus): Promise<void> {
    if (!item.id) {
      this.showError('Item ID is missing, cannot update status.');
      return;
    }
    if (item.status === newStatus) {
        this.showMessage(`Item is already ${newStatus}.`);
        return;
    }

    try {
      await this.packingQueueService.updatePackingItemStatus(item.id, newStatus);
      this.showMessage(`Item ${item.productName} (Order: ${item.orderId}) status updated to ${newStatus}.`);
    } catch (error: any) {
      this.showError(`Failed to update status for item ${item.productName}: ${error.message || error}`);
      console.error('Error updating packing item status:', error);
    }
  }

  // Helper to show a Material Snack Bar message
  private showMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'] // You might need to define this style globally
    });
  }

  ngOnDestroy(): void {
    if (this.itemSubscription) {
      this.itemSubscription.unsubscribe();
    }
  }
}
