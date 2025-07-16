import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, docData, query, orderBy, runTransaction, serverTimestamp, DocumentReference, Timestamp, deleteDoc } from '@angular/fire/firestore';
import { Order, OrderItem } from '../model/order.model'; // This is likely the Firestore Order model
import { PackingQueueService } from './packing-queue.service';
import { PackingItem, PackingStatus } from '../model/packing-item.model';
import { Product as AppProduct } from '../model/product.model'; // This is likely the Firestore Product model for COGS
import { Observable, firstValueFrom, map, shareReplay, of, forkJoin } from 'rxjs'; // Added forkJoin
import { InventoryManagementService } from '../../services/inventory-management.service';
// Explicitly import SalesOrder from inventory.models.ts to avoid confusion with Order from order.model.ts
import { Product as InventoryProduct, SalesOrder as InventorySalesOrder, Warehouse } from '../../models/inventory.models';
import { ShippoService, ShippoAddress, ShippoRate } from './shippo.service'; // Assuming ExtendedShippoAddress is not strictly needed here
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    public firestore: Firestore,
    private packingQueueService: PackingQueueService,
    private firestoreDb: Firestore,
    private inventoryService: InventoryManagementService,
    private shippoService: ShippoService // Injected ShippoService
  ) {}

  private productCostMap$: Observable<Map<string, number>>; // For COGS from Firestore Product model

  /**
   * Fetches all products from Firestore and creates a map of product_no to costPrice.
   * This observable is shared and replayed to avoid multiple Firestore reads for the same data
   * within a short period. Uses firstValueFrom to return a Promise for easier use in async functions.
   */
  public getProductCostMap(): Promise<Map<string, number>> {
    if (!this.productCostMap$) {
      const productsRef = collection(this.firestoreDb, 'products');
      this.productCostMap$ = (collectionData(query(productsRef), { idField: 'id' }) as Observable<AppProduct[]>).pipe(
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

    // ** Automated Order Routing and Packing Item Generation **
    // For each item in the order, determine warehouse(s) for fulfillment based on stock availability.
    // This logic splits items across warehouses if necessary.
    if (newOrderRef.id && itemsForAggregation.length > 0) {
      // --- Start: Collect all products for the order for shipping calculation ---
      const orderProductsSKUs = itemsForAggregation.map(item => item.product_no);
      const productObservables = orderProductsSKUs.map(sku => this.inventoryService.getProductBySKU(sku));
      const inventoryProductsForShipment = (await firstValueFrom(forkJoin(productObservables))).filter(p => p !== undefined) as InventoryProduct[];
      // --- End: Collect all products ---


      // For simplicity, we'll assume a single 'ship from' address for the entire order.
      // This could be the address of the primary warehouse or a company headquarters.
      // In a multi-warehouse fulfillment scenario for a single order, this would be more complex.
      // We'll use the first warehouse found as a mock 'ship from' address.
      const warehouses = await firstValueFrom(this.inventoryService.warehouses$);
      let shipFromAddress: ShippoAddress | undefined;

      if (warehouses && warehouses.length > 0) {
        const primaryWarehouse = warehouses[0]; // Example: Use the first warehouse
        shipFromAddress = {
          name: primaryWarehouse.locationName,
          street1: primaryWarehouse.street1,
          street2: primaryWarehouse.street2,
          city: primaryWarehouse.city,
          state: primaryWarehouse.state,
          zip: primaryWarehouse.zip,
          country: primaryWarehouse.country,
          phone: primaryWarehouse.phone,
          email: primaryWarehouse.email
        };
      } else {
        console.warn('OrderService: No warehouses configured. Cannot determine ship_from address for shipping.');
        // Fallback to a very generic default if no warehouses
        shipFromAddress = { name: 'Our Company', street1: '1 Corporate Dr', city: 'Anytown', state: 'CA', zip: '90210', country: 'US', phone: '1234567890', email: 'shipping@example.com' };
      }

      // Construct Ship To Address from orderData (assuming orderData.delivery_address is a structured object or string)
      // This is a simplified mapping. Real implementation needs robust address parsing/validation.
      let shipToAddress: ShippoAddress | undefined;
      if (typeof orderData.delivery_address === 'string') { // Assuming string like "John Doe, 123 Main St, Anytown, CA, 90210, US"
          const parts = orderData.delivery_address.split(',').map(p => p.trim());
          if (parts.length >= 5) {
              shipToAddress = {
                  name: orderData.customer_name || parts[0], // Use customer_name if available
                  street1: parts.length > 1 ? parts[1] : 'N/A',
                  city: parts.length > 2 ? parts[2] : 'N/A',
                  state: parts.length > 3 ? parts[3] : 'N/A', // Assuming state is 4th part
                  zip: parts.length > 4 ? parts[4] : 'N/A',  // Assuming zip is 5th part
                  country: parts.length > 5 ? parts[5] : 'US', // Default to US if not specified
                  // phone and email might come from other orderData fields
              };
          }
      } else if (orderData.delivery_address && typeof orderData.delivery_address === 'object') { // If it's already an object
          const addr = orderData.delivery_address as any; // Cast to any to access potential fields
          shipToAddress = {
              name: orderData.customer_name || addr.name || 'N/A',
              street1: addr.street1 || addr.addressLine1 || 'N/A',
              street2: addr.street2 || addr.addressLine2,
              city: addr.city || 'N/A',
              state: addr.state || addr.province || 'N/A',
              zip: addr.zip || addr.postalCode || 'N/A',
              country: addr.country || 'US', // Default to US
              phone: addr.phone,
              email: addr.email,
              is_residential: addr.is_residential // Assuming this might be part of the address object
          };
      }

      if (!shipToAddress) {
          console.error(`OrderService: Could not construct valid ship_to address for order ${newOrderRef.id}. Shipping will be skipped.`);
      }


      // --- Shipping Integration Logic ---
      if (shipFromAddress && shipToAddress && inventoryProductsForShipment.length > 0) {
        try {
          const rates = await firstValueFrom(this.shippoService.createShipmentAndGetRates(shipFromAddress, shipToAddress, inventoryProductsForShipment));

          if (rates && rates.length > 0) {
            // Simulate rate selection: pick the first rate (cheapest or default)
            // In a real UI, user would select this. Or more complex business logic.
            const selectedRate: ShippoRate = rates.sort((a,b) => parseFloat(a.amount) - parseFloat(b.amount))[0]; // Pick cheapest
            console.log(`OrderService: Selected rate for order ${newOrderRef.id}:`, selectedRate);

            const transaction = await firstValueFrom(this.shippoService.createShippingLabel(selectedRate.object_id));

            if (transaction && transaction.status === 'SUCCESS') {
              console.log(`OrderService: Label created for order ${newOrderRef.id}. Tracking: ${transaction.tracking_number}`);
              const shippingUpdate: Partial<Order> = { // Use InventorySalesOrder for type safety on shipping fields
                shippingCarrier: selectedRate.provider,
                shippingServiceLevel: selectedRate.servicelevel.name,
                shippingCost: parseFloat(selectedRate.amount),
                trackingNumber: transaction.tracking_number,
                shippoTransactionId: transaction.object_id,
                labelUrl: transaction.label_url,
                // estimatedDeliveryDate: new Date(selectedRate.estimated_days) // This is not quite right, need to calculate from now
              };
              if (selectedRate.estimated_days) {
                const estDate = new Date();
                estDate.setDate(estDate.getDate() + selectedRate.estimated_days);
                shippingUpdate.estimatedDeliveryDate = estDate;
              }

              await this.updateOrder(newOrderRef.id, shippingUpdate); // Cast back to Order for Firestore update
            } else {
              console.error(`OrderService: Failed to create label for order ${newOrderRef.id}. Transaction status: ${transaction?.status}`);
            }
          } else {
            console.warn(`OrderService: No shipping rates returned for order ${newOrderRef.id}.`);
          }
        } catch (shippingError) {
          console.error(`OrderService: Error during shipping process for order ${newOrderRef.id}:`, shippingError);
        }
      }
      // --- End Shipping Integration Logic ---


      // Original Packing Item Generation (Loop through itemsForAggregation)
      for (const orderItem of itemsForAggregation) {
        // Basic validation for the order item
        if (!orderItem.product_no || typeof orderItem.quantity !== 'number' || orderItem.quantity <= 0) {
          console.warn(`Skipping order item due to missing product_no, invalid/zero quantity:`, orderItem);
          continue;
        }

        const sku = orderItem.product_no;
        const quantityOrdered = Number(orderItem.quantity);
        let remainingQuantityToFulfill = quantityOrdered;
        // Stores data for PackingItem(s) to be created for this order item
        const assignedPackingItems: Omit<PackingItem, 'id' | 'creationDate' | 'lastUpdateDate'>[] = [];

        try {
          // 1. Fetch current stock levels for the SKU across all warehouses.
          const stockByWarehouse = await firstValueFrom(this.inventoryService.getProductStockByWarehouse(sku));

          const availableWarehouses = Object.keys(stockByWarehouse).filter(whId => stockByWarehouse[whId] > 0);

          if (!availableWarehouses.length) {
            console.warn(`ROUTING: No stock found for SKU ${sku} (Order: ${newOrderRef.id}) in any warehouse. Item cannot be fulfilled at this time.`);
            continue;
          }

          // 2. Attempt to fulfill the entire item quantity from a single warehouse first.
          for (const warehouseId of availableWarehouses) {
            if (stockByWarehouse[warehouseId] >= remainingQuantityToFulfill) {
              assignedPackingItems.push({
                orderId: newOrderRef.id,
                externalOrderId: orderData.id,
                productId: sku,
                productName: orderItem.product_name || 'N/A',
                quantityToPack: remainingQuantityToFulfill,
                warehouseId: warehouseId,
                status: 'pending' as PackingStatus,
                customerName: orderData.customer_name,
                deliveryAddress: orderData.delivery_address,
              });
              remainingQuantityToFulfill = 0;
              console.log(`ROUTING: SKU ${sku} (Qty: ${quantityOrdered}) fully assigned to single warehouse ${warehouseId} for order ${newOrderRef.id}.`);
              break;
            }
          }

          // 3. If not fully assigned, attempt multi-warehouse fulfillment.
          if (remainingQuantityToFulfill > 0) {
            console.log(`ROUTING: SKU ${sku} (Order: ${newOrderRef.id}) requires splitting. Remaining to fulfill: ${remainingQuantityToFulfill}.`);
            assignedPackingItems.length = 0;
            remainingQuantityToFulfill = quantityOrdered;

            for (const warehouseId of availableWarehouses) {
              const stockInWarehouse = stockByWarehouse[warehouseId];
              if (stockInWarehouse > 0 && remainingQuantityToFulfill > 0) {
                const quantityFromThisWarehouse = Math.min(remainingQuantityToFulfill, stockInWarehouse);
                assignedPackingItems.push({
                  orderId: newOrderRef.id,
                  externalOrderId: orderData.id,
                  productId: sku,
                  productName: orderItem.product_name || 'N/A',
                  quantityToPack: quantityFromThisWarehouse,
                  warehouseId: warehouseId,
                  status: 'pending' as PackingStatus,
                  customerName: orderData.customer_name,
                  deliveryAddress: orderData.delivery_address,
                });
                remainingQuantityToFulfill -= quantityFromThisWarehouse;
                console.log(`ROUTING: SKU ${sku} (Order: ${newOrderRef.id}) assigned ${quantityFromThisWarehouse} units from warehouse ${warehouseId}. Remaining: ${remainingQuantityToFulfill}.`);
                if (remainingQuantityToFulfill === 0) {
                  break;
                }
              }
            }
          }

          // 4. Add all generated packing items for this order item to the PackingQueueService.
          if (assignedPackingItems.length > 0) {
            for (const packingItemData of assignedPackingItems) {
              try {
                await this.packingQueueService.addItemToPackingQueue(packingItemData);
                console.log(`ROUTING: Packing item for SKU ${packingItemData.productId} (Qty: ${packingItemData.quantityToPack}) from WHS ${packingItemData.warehouseId} added to queue for order ${newOrderRef.id}.`);
              } catch (packError) {
                console.error(`ROUTING ERROR: Failed to add packing item for SKU ${sku} from warehouse ${packingItemData.warehouseId} (Order: ${newOrderRef.id}):`, packError);
              }
            }
          } else if (quantityOrdered > 0 && remainingQuantityToFulfill === quantityOrdered) {
             console.warn(`ROUTING: Could not fulfill ANY quantity of SKU ${sku} for order ${newOrderRef.id}. Original quantity: ${quantityOrdered}. This may indicate an earlier stock check issue or logic error.`);
          }

          // 5. Handle any remaining unfulfillable quantity for this item.
          if (remainingQuantityToFulfill > 0) {
            console.warn(`ROUTING: Partially fulfilled SKU ${sku} for order ${newOrderRef.id}. Unable to fulfill ${remainingQuantityToFulfill} units. This quantity will not be packed.`);
          }
        } catch (error) {
          console.error(`ROUTING CRITICAL: Error processing order item ${sku} for order ${newOrderRef.id}:`, error);
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
