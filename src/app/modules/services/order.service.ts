import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, docData, query, orderBy, runTransaction, serverTimestamp, DocumentReference, Timestamp, deleteDoc } from '@angular/fire/firestore'; // Added deleteDoc
import { Order, OrderItem } from '../model/order.model';
import { PackingQueueService } from './packing-queue.service';
import { PackingItem } from '../model/packing-item.model';
import { Product } from '../model/product.model'; // Needed for earnings calculation
import { Observable, firstValueFrom, map } from 'rxjs'; // Added map

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    public firestore: Firestore,
    private packingQueueService: PackingQueueService,
    private firestoreDb: Firestore // Injected Firestore for product lookups
  ) {}

  private async _calculateCogsAndEarnings(items: OrderItem[]): Promise<{ cogs: number; earnings: number }> {
    let totalCogs = 0;
    let totalRevenue = 0;

    if (!items || items.length === 0) {
      return { cogs: 0, earnings: 0 };
    }

    const productNos = items.map(item => item.product_no).filter(pn => !!pn);
    if (productNos.length === 0) {
      items.forEach(item => totalRevenue += (Number(item.item_cost) * Number(item.quantity)));
      return { cogs: 0, earnings: totalRevenue }; // No product numbers, so COGS is 0
    }

    // Fetch all relevant products in one go (or batched if too many)
    // This assumes product_no is unique and directly usable for lookup.
    // For simplicity, fetching all products if specific filtering is complex or not performant for small datasets.
    const productsRef = collection(this.firestoreDb, 'products');
    // A more optimized query would be: query(productsRef, where('product_no', 'in', productNos))
    // However, 'in' queries are limited to 30 items. If more, batching or fetching all is needed.
    // For this example, let's assume fetching relevant products or all if the list is small.
    // This part needs a robust strategy for fetching product cost prices.
    // Placeholder: fetch all products and map. In a real app, optimize this.
    const productsSnap = await firstValueFrom(collectionData(query(productsRef), {idField: 'id'}) as Observable<Product[]>);
    const productCostMap = new Map<string, number>();
    productsSnap.forEach(p => {
      if (p.product_no && p.costPrice !== undefined) {
        productCostMap.set(p.product_no, Number(p.costPrice));
      }
    });

    items.forEach(item => {
      const itemRevenue = Number(item.item_cost) * Number(item.quantity);
      totalRevenue += itemRevenue;
      const costPrice = productCostMap.get(item.product_no);
      if (costPrice !== undefined) {
        totalCogs += costPrice * Number(item.quantity);
      }
    });

    return { cogs: totalCogs, earnings: totalRevenue - totalCogs };
  }

  /**
   * Adds a new order to the system. This includes:
   * - Updating order aggregation data (total orders, count, last 5 orders summary).
   * - Calculating total earnings for the order based on product cost prices.
   * - Saving the order document to the 'orders' collection in Firestore.
   * - Adding each item from the order to the packing queue via `PackingQueueService`.
   *
   * @param orderData - The `Order` object containing all details of the order.
   * @returns A Promise resolving with the `DocumentReference` of the newly created order in Firestore.
   */
  async createOrder(orderData: Order): Promise<DocumentReference<Order>> {
    const itemsForAggregation = orderData.items || []; // Used for packing queue and earnings
    const aggregationDocRef = doc(this.firestore, 'aggregation', 'orders');

    // Transaction 1: Update total and count
    try {
      await runTransaction(this.firestore, async (transaction) => {
        const aggDocSnap = await transaction.get(aggregationDocRef);
        let newTotal = +orderData.total_cost;
        let newCount = 1;

        if (aggDocSnap.exists()) {
          const data = aggDocSnap.data();
          newTotal = (data.total || 0) + +orderData.total_cost; // Ensure data.total is a number
          newCount = (data.count || 0) + 1; // Ensure data.count is a number
          transaction.update(aggregationDocRef, { total: newTotal, count: newCount });
        } else {
          // If 'aggregation/orders' doc doesn't exist, set it with initial values (last5 will be added in 2nd transaction)
          transaction.set(aggregationDocRef, { total: newTotal, count: newCount, last5: [] });
        }
      });
    } catch (e) {
      console.error("Order aggregation transaction (total/count) failed: ", e);
      // Decide if we should proceed if this part fails. For now, we do.
    }

    // Calculate total earnings
    const { earnings: totalEarnings } = await this._calculateCogsAndEarnings(itemsForAggregation);

    // Prepare and save the main order document
    const ordersCollection = collection(this.firestore, 'orders');
    const orderDocToSave: Omit<Order, 'id'> = {
      ...orderData,
      user_id: orderData.user_id || '0012', // Consider making this mandatory or configurable
      totalEarnings: totalEarnings,
      created_date: serverTimestamp() as Timestamp,
    };
    const newOrderRef = await addDoc(ordersCollection, orderDocToSave as any) as DocumentReference<Order>;

    // Transaction 2: Update last5 array in aggregation document
    if (newOrderRef.id) {
      try {
        await runTransaction(this.firestore, async (transaction) => {
          const aggDocSnap = await transaction.get(aggregationDocRef);
          let last5_data = [];

          if (aggDocSnap.exists()) {
            last5_data = aggDocSnap.data().last5 || [];
          }
          // Add new order summary to the beginning or end, then trim. Pushing to end and trimming start is common.
          last5_data.push({
            id: newOrderRef.id,
            total_cost: orderData.total_cost,
            customer_name: orderData.customer_name,
            created_date: serverTimestamp() // Use a server timestamp for the entry in last5
          });
          while (last5_data.length > 5) {
            last5_data.shift(); // Remove oldest entries if array exceeds 5
          }

          if (aggDocSnap.exists()) {
            transaction.update(aggregationDocRef, { last5: last5_data });
          } else {
            // This case should ideally be covered by the first transaction ensuring the doc exists.
            // However, as a fallback, setting it here.
            console.warn("'aggregation/orders' document did not exist for last5 update, creating it.");
            transaction.set(aggregationDocRef, { last5: last5_data }, { merge: true }); // Merge true to not overwrite total/count if they were set by a concurrent op
          }
        });
      } catch (e) {
        console.error("Order aggregation transaction (last5) failed: ", e);
      }
    }

    // Add items to packing queue
    if (newOrderRef.id && itemsForAggregation.length > 0) {
      for (const orderItem of itemsForAggregation) {
        if (!orderItem.product_no || typeof orderItem.quantity !== 'number') {
          console.warn('Skipping packing item due to missing product_no or quantity:', orderItem);
          continue;
        }
        const packingItemData: Omit<PackingItem, 'id' | 'creationDate' | 'lastUpdateDate'> = {
          orderId: newOrderRef.id,
          externalOrderId: orderData.id,
          productId: orderItem.product_no,
          productName: orderItem.product_name || 'N/A',
          quantityToPack: orderItem.quantity,
          status: 'pending',
          customerName: orderData.customer_name,
          deliveryAddress: orderData.delivery_address,
        };
        try {
          await this.packingQueueService.addItemToPackingQueue(packingItemData);
        } catch (packError) {
          console.error(`Failed to add item ${orderItem.product_no} to packing queue for order ${newOrderRef.id}:`, packError);
        }
      }
    }
    return newOrderRef;
  }

  updateOrder(id: string, value: Partial<Order>) {
    const orderDocRef = doc(this.firestore, 'orders', id);
    return updateDoc(orderDocRef, value);
  }

  getAllOrders(): Observable<Order[]> {
    const ordersCollectionRef = collection(this.firestore, 'orders');
    const q = query(ordersCollectionRef, orderBy('created_date'));
    return collectionData(q, { idField: 'id' }) as Observable<Order[]>;
  }

  getOrderById(id: string): Observable<Order> {
    const orderDocRef = doc(this.firestore, 'orders', id);
    return docData(orderDocRef, { idField: 'id' }) as Observable<Order>;
  }

  /* Delete Order */
  deleteOrder(collectionName: string, id: string) { // Added collectionName for consistency
    const orderDocRef = doc(this.firestore, collectionName, id); // Use collectionName
    return deleteDoc(orderDocRef); // deleteDoc is not imported, need to import it
  }
}
