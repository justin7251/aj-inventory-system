import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, orderBy, serverTimestamp, Timestamp, DocumentReference } from '@angular/fire/firestore'; // Added DocumentReference
import { Observable, firstValueFrom } from 'rxjs'; // Added firstValueFrom
import { PackingItem, PackingStatus } from '../model/packing-item.model';
import { InventoryManagementService } from '../../services/inventory-management.service'; // Added

@Injectable({
  providedIn: 'root'
})
export class PackingQueueService {
  private packingQueueCollection = collection(this.firestore, 'packingQueue');

  constructor(
    private firestore: Firestore,
    private inventoryService: InventoryManagementService // Added
    ) {}

  /**
   * Adds a new item to the packing queue in Firestore.
   * @param item - The partial PackingItem object to add (without id, creationDate, lastUpdateDate, as these are set by service/server).
   * @returns A Promise resolving with the DocumentReference of the newly created packing item.
   */
  async addItemToPackingQueue(item: Omit<PackingItem, 'id' | 'creationDate' | 'lastUpdateDate'>): Promise<DocumentReference<PackingItem>> {
    const docData: Omit<PackingItem, 'id'> = {
      ...item,
      status: item.status || 'pending', // Default status to 'pending' if not provided
      creationDate: serverTimestamp() as Timestamp, // Firestore will set this
      lastUpdateDate: serverTimestamp() as Timestamp,
    };
    // Type assertion needed as addDoc expects DocumentData, not specific types with serverTimestamp
    return addDoc(this.packingQueueCollection, docData as any) as Promise<DocumentReference<PackingItem>>;
  }

  /**
   * Retrieves all packing items with 'pending' status, ordered by creation date.
   * @returns An Observable array of PackingItem objects.
   */
  getPendingPackingItems(): Observable<PackingItem[]> {
    const q = query(
      this.packingQueueCollection,
      where('status', '==', 'pending'),
      orderBy('creationDate', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<PackingItem[]>;
  }

  /**
   * Retrieves all packing items regardless of status, ordered by creation date.
   * @returns An Observable array of PackingItem objects.
   */
  getAllPackingItems(): Observable<PackingItem[]> {
    const q = query(
      this.packingQueueCollection,
      orderBy('creationDate', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<PackingItem[]>;
  }


  /**
   * Updates the status of a specific packing item and triggers stock adjustment if applicable.
   * @param itemId The ID of the packing item to update.
   * @param status The new status to set.
   * @param itemDetails The full PackingItem object, required for stock adjustments if status is 'packed'.
   * @returns A Promise that resolves when the update is complete.
   */
  async updatePackingItemStatus(
    itemId: string,
    status: PackingStatus,
    itemDetails?: PackingItem // Optional for statuses not requiring stock change, but required for 'packed'
  ): Promise<void> {
    const itemDocRef = doc(this.firestore, 'packingQueue', itemId);

    const updateData: Partial<PackingItem> = {
      status: status,
      lastUpdateDate: serverTimestamp() as Timestamp
    };

    if (status === 'packed') {
      updateData.packedDate = serverTimestamp() as Timestamp;
      if (itemDetails && itemDetails.productId && itemDetails.warehouseId && itemDetails.quantityToPack > 0) {
        try {
          // Ensure quantityToPack is negative for decrementing stock
          const quantityChange = -Math.abs(itemDetails.quantityToPack);
          this.inventoryService.updateStock(itemDetails.productId, itemDetails.warehouseId, quantityChange);
          console.log(`Stock updated for SKU ${itemDetails.productId} in warehouse ${itemDetails.warehouseId} by ${quantityChange}`);
        } catch (stockError) {
          console.error(`Failed to update stock for item ${itemId} (SKU: ${itemDetails.productId}, Warehouse: ${itemDetails.warehouseId}):`, stockError);
          // Consider how to handle this error:
          // - Revert status update (complex, might need transaction)
          // - Log for manual correction (simpler for now)
          // - Throw error to let caller decide
          // For now, just logging. The status update will proceed.
        }
      } else {
         console.warn(`Skipping stock update for item ${itemId} marked as 'packed' due to missing itemDetails or invalid data for stock adjustment. ItemDetails received:`, itemDetails);
      }
    } else if (status === 'shipped') {
      updateData.shippedDate = serverTimestamp() as Timestamp;
      // If stock is decremented at 'shipped' instead of 'packed', the logic would be here.
      // For now, assuming stock is decremented when 'packed'.
    }

    return updateDoc(itemDocRef, updateData as any); // Type assertion for serverTimestamp
  }

  /**
   * Updates specific fields of a packing item.
   * @param itemId The ID of the packing item to update.
   * @param updates An object containing the fields to update.
   * @returns A Promise that resolves when the update is complete.
   */
  async updatePackingItem(itemId: string, updates: Partial<Omit<PackingItem, 'id' | 'creationDate'>>): Promise<void> {
    const itemDocRef = doc(this.firestore, 'packingQueue', itemId);
    const updateData = {
      ...updates,
      lastUpdateDate: serverTimestamp() as Timestamp
    };
    return updateDoc(itemDocRef, updateData as any); // Type assertion for serverTimestamp
  }
}
