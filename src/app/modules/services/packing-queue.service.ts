import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, orderBy, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { PackingItem, PackingStatus } from '../model/packing-item.model';

@Injectable({
  providedIn: 'root'
})
export class PackingQueueService {
  private packingQueueCollection = collection(this.firestore, 'packingQueue');

  constructor(private firestore: Firestore) {}

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
   * Updates the status of a specific packing item.
   * @param itemId The ID of the packing item to update.
   * @param status The new status to set.
   * @returns A Promise that resolves when the update is complete.
   */
  async updatePackingItemStatus(itemId: string, status: PackingStatus): Promise<void> {
    const itemDocRef = doc(this.firestore, 'packingQueue', itemId);
    const updateData: Partial<PackingItem> = {
      status: status,
      lastUpdateDate: serverTimestamp() as Timestamp
    };
    if (status === 'packed') {
      updateData.packedDate = serverTimestamp() as Timestamp;
    } else if (status === 'shipped') {
      updateData.shippedDate = serverTimestamp() as Timestamp;
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
