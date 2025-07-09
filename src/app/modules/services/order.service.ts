import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, docData, query, orderBy, runTransaction, serverTimestamp, DocumentReference, Timestamp, deleteDoc } from '@angular/fire/firestore'; // Added deleteDoc
import { Order, OrderItem } from '../model/order.model';
import { PackingQueueService } from './packing-queue.service';
import { PackingItem, PackingStatus } from '../model/packing-item.model'; // Added PackingStatus
import { Product as AppProduct } from '../model/product.model'; // Renamed to avoid clash
import { Observable, firstValueFrom, map, shareReplay, of } from 'rxjs'; // Added map, shareReplay, of
import { InventoryManagementService } from '../../services/inventory-management.service'; // Added
import { Product as InventoryProduct } from '../../models/inventory.models'; // Added to clarify product source for stock


@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    public firestore: Firestore,
    private packingQueueService: PackingQueueService,
    private firestoreDb: Firestore, // Injected Firestore for product lookups
    private inventoryService: InventoryManagementService // Added
  ) {}

  private productCostMap$: Observable<Map<string, number>>;

  /**
   * Fetches all products from Firestore and creates a map of product_no to costPrice.
   * This observable is shared and replayed to avoid multiple Firestore reads for the same data
   * within a short period. Uses firstValueFrom to return a Promise for easier use in async functions.
   */
  public getProductCostMap(): Promise<Map<string, number>> {
    if (!this.productCostMap$) {
      const productsRef = collection(this.firestoreDb, 'products');
      this.productCostMap$ = (collectionData(query(productsRef), { idField: 'id' }) as Observable<Product[]>).pipe(
        map(products => {
          const map = new Map<string, number>();
          products.forEach(p => {
            if (p.product_no && p.costPrice !== undefined) {
              map.set(p.product_no, Number(p.costPrice));
            }
          });
          return map;
        }),
        shareReplay(1) // Cache the last emitted value and replay it for new subscribers
      );
    }
    return firstValueFrom(this.productCostMap$); // Return a promise
  }

  private async _calculateCogsAndEarnings(items: OrderItem[], productCostMap: Map<string, number>): Promise<{ cogs: number; earnings: number }> {
    let totalCogs = 0;
    let totalRevenue = 0;

    if (!items || items.length === 0) {
      return { cogs: 0, earnings: 0 };
    }

    items.forEach(item => {
      const itemRevenue = Number(item.item_cost) * Number(item.quantity);
      totalRevenue += itemRevenue;
      const costPrice = productCostMap.get(item.product_no);
      if (costPrice !== undefined) {
        totalCogs += costPrice * Number(item.quantity);
      } else {
        // Optional: Log or handle missing cost price for a product in an order
        console.warn(`Cost price not found for product_no: ${item.product_no}. COGS for this item will be 0.`);
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

    // Fetch product cost map
    const productCostMap = await this.getProductCostMap();

    // Calculate total earnings
    const { earnings: totalEarnings } = await this._calculateCogsAndEarnings(itemsForAggregation, productCostMap);

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

    // Add items to packing queue - NEW LOGIC
    if (newOrderRef.id && itemsForAggregation.length > 0) {
      for (const orderItem of itemsForAggregation) {
        if (!orderItem.product_no || typeof orderItem.quantity !== 'number' || orderItem.quantity <= 0) {
          console.warn('Skipping order item due to missing product_no, invalid quantity, or zero quantity:', orderItem);
          continue;
        }

        const sku = orderItem.product_no;
        const quantityOrdered = Number(orderItem.quantity);
        let remainingQuantityToFulfill = quantityOrdered;
        const assignedPackingItems: Omit<PackingItem, 'id' | 'creationDate' | 'lastUpdateDate'>[] = [];

        try {
          const stockByWarehouse = await firstValueFrom(this.inventoryService.getProductStockByWarehouse(sku));
          const availableWarehouses = Object.keys(stockByWarehouse).filter(whId => stockByWarehouse[whId] > 0);

          if (!availableWarehouses.length) {
            console.warn(`No stock found for SKU ${sku} in any warehouse. Item cannot be fulfilled.`);
            // TODO: Handle unfulfillable items - e.g., add to a backorder list or notify
            continue;
          }

          // Attempt Single Warehouse Fulfillment
          for (const warehouseId of availableWarehouses) {
            if (stockByWarehouse[warehouseId] >= remainingQuantityToFulfill) {
              assignedPackingItems.push({
                orderId: newOrderRef.id,
                externalOrderId: orderData.id,
                productId: sku,
                productName: orderItem.product_name || 'N/A',
                quantityToPack: remainingQuantityToFulfill,
                warehouseId: warehouseId, // Assigned warehouse
                status: 'pending' as PackingStatus,
                customerName: orderData.customer_name,
                deliveryAddress: orderData.delivery_address,
              });
              remainingQuantityToFulfill = 0;
              break;
            }
          }

          // Attempt Multi-Warehouse Fulfillment (if not fully assigned)
          if (remainingQuantityToFulfill > 0) {
            assignedPackingItems.length = 0; // Clear previous attempts if any, start fresh for split
            remainingQuantityToFulfill = quantityOrdered; // Reset for split logic

            for (const warehouseId of availableWarehouses) { // Could sort warehouses by preference here
              const stockInWarehouse = stockByWarehouse[warehouseId];
              if (stockInWarehouse > 0 && remainingQuantityToFulfill > 0) {
                const quantityFromThisWarehouse = Math.min(remainingQuantityToFulfill, stockInWarehouse);

                assignedPackingItems.push({
                  orderId: newOrderRef.id,
                  externalOrderId: orderData.id,
                  productId: sku,
                  productName: orderItem.product_name || 'N/A',
                  quantityToPack: quantityFromThisWarehouse,
                  warehouseId: warehouseId, // Assigned warehouse
                  status: 'pending' as PackingStatus,
                  customerName: orderData.customer_name,
                  deliveryAddress: orderData.delivery_address,
                });
                remainingQuantityToFulfill -= quantityFromThisWarehouse;
                if (remainingQuantityToFulfill === 0) break;
              }
            }
          }

          // Add assigned packing items to the queue
          if (assignedPackingItems.length > 0) {
            for (const packingItemData of assignedPackingItems) {
              try {
                await this.packingQueueService.addItemToPackingQueue(packingItemData);
              } catch (packError) {
                console.error(`Failed to add packing item for SKU ${sku} from warehouse ${packingItemData.warehouseId} to packing queue for order ${newOrderRef.id}:`, packError);
              }
            }
          } else if (quantityOrdered > 0 && remainingQuantityToFulfill === quantityOrdered) {
             // This means an item was in the order, but we couldn't assign any part of it.
             console.warn(`Could not fulfill any quantity of SKU ${sku} for order ${newOrderRef.id}. Original quantity: ${quantityOrdered}. Check stock levels.`);
          } else if (remainingQuantityToFulfill > 0) {
            // This means some quantity was fulfilled, but not all.
            console.warn(`Partially fulfilled SKU ${sku} for order ${newOrderRef.id}. Unable to fulfill ${remainingQuantityToFulfill} units.`);
            // TODO: Handle partially unfulfillable items
          }

        } catch (error) {
          console.error(`Error processing order item ${sku} for order ${newOrderRef.id}:`, error);
          // TODO: Decide if this should halt processing for the whole order or just this item
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
