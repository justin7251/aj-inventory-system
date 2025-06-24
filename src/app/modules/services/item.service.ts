import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, collectionData, docData, where, query, orderBy, runTransaction, serverTimestamp, DocumentReference, CollectionReference, Query, DocumentSnapshot, Timestamp } from '@angular/fire/firestore';
import { Product } from '../model/product.model';
import { Restock } from '../model/restock.model';
import { Order, OrderItem } from '../model/order.model'; // Import full Order model
import { PackingQueueService } from './packing-queue.service'; // Import PackingQueueService
import { PackingItem } from '../model/packing-item.model'; // Import PackingItem model
import { Observable, firstValueFrom, forkJoin, of } from 'rxjs'; // Ensure Observable is imported from 'rxjs'
import { map, switchMap, catchError } from 'rxjs/operators';

// Define a simple Order interface for typing within this service
interface OrderForService {
  id?: string;
  items?: { product_no: string; quantity: number; [key: string]: any }[];
  created_date?: Timestamp | Date | string; // Allow for various date types from Firestore/input
  [key: string]: any; // Allow other properties
}


@Injectable({
  providedIn: 'root'
})
export class ItemService {
  // These properties seem to be used for UpdateProduct logic, may need refactoring
  // exist:boolean; // Can be inferred from productID presence
  // productID: string;
  // old_quantity: number;

  constructor(
    public firestore: Firestore, // Changed db to firestore
    private packingQueueService: PackingQueueService // Inject PackingQueueService
  ) {}

  addRecord(value: any) { // Added type for value
    const recordsCollection = collection(this.firestore, 'records');
    return addDoc(recordsCollection, {
      user_id: value.uid,
      name: value.name,
      product_no: value.product_no,
      cost: value.cost,
      selling_price: value.selling_price,
      created: serverTimestamp() // Use serverTimestamp
    });
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
  async addOrder(orderData: Order): Promise<DocumentReference<Order>> {
    const orderCollectionRef = collection(this.firestore, 'aggregation');
    const orderDocRef = doc(orderCollectionRef, 'orders');

    // Ensure items are part of orderData before trying to access them
    const itemsForAggregation = orderData.items || [];

    try {
      await runTransaction(this.firestore, async (transaction) => {
        const sfDoc = await transaction.get(orderDocRef);
        let last5_data = [];
        // Ensure total_cost is a number
        let newTotal = +orderData.total_cost;
        let newCount = 1;

        if (sfDoc.exists()) {
          const data = sfDoc.data();
          last5_data = data.last5 || [];
          if (last5_data.length >= 5) {
            last5_data.shift();
          }
          // Push a summary or the full orderData as needed for 'last5'
          last5_data.push({ id: 'new_order_placeholder', total_cost: orderData.total_cost, customer_name: orderData.customer_name });
          newTotal = +data.total + +orderData.total_cost;
          newCount = +data.count + 1;
          transaction.update(orderDocRef, { total: newTotal, count: newCount, last5: last5_data });
        } else {
          last5_data.push({ id: 'new_order_placeholder', total_cost: orderData.total_cost, customer_name: orderData.customer_name });
          transaction.set(orderDocRef, { total: newTotal, count: newCount, last5: last5_data });
        }
      });
    } catch (e) {
      console.error("Order aggregation transaction failed: ", e);
      // Decide if you want to proceed with adding the order if aggregation fails
    }

    const ordersCollection = collection(this.firestore, 'orders');

    // Calculate totalEarnings
    let totalEarnings = 0;
    if (itemsForAggregation.length > 0) {
      const productPromises = itemsForAggregation.map(item => {
        if (!item.product_no || typeof item.quantity !== 'number' || typeof item.item_cost !== 'number') {
          console.warn(`Order item is missing product_no, quantity, or item_cost. Skipping earnings calculation for this item.`, item);
          return Promise.resolve(null); // Resolve with null for items that can't be processed
        }
        const productsCollectionRef = collection(this.firestore, 'products');
        const productQuery = query(productsCollectionRef, where('product_no', "==", item.product_no));
        return firstValueFrom(collectionData(productQuery, { idField: 'id' }).pipe(map(results => results[0] as Product || null)));
      });

      const products = await Promise.all(productPromises);

      itemsForAggregation.forEach((item, index) => {
        const productData = products[index];
        if (productData && productData.costPrice !== undefined && productData.costPrice !== null) {
          const itemQuantity = +item.quantity;
          // Assuming item.item_cost is total for the line item. If it's per unit, adjust logic.
          // For earnings, we need (Total Selling Price for line) - (Quantity * Cost Price per unit)
          const lineItemTotalSellingPrice = +item.item_cost;
          const itemCostPrice = +productData.costPrice;

          if (isNaN(itemQuantity) || isNaN(lineItemTotalSellingPrice) || isNaN(itemCostPrice)) {
            console.warn(`Invalid number format for earnings calculation on item: ${item.product_no}.`);
            return; // Skip this item
          }
          totalEarnings += lineItemTotalSellingPrice - (itemQuantity * itemCostPrice);
        } else if (productData) {
          console.warn(`Product ${item.product_no} found, but costPrice is missing. Skipping earnings for this item.`);
        } else if (item.product_no) { // Only warn if product_no was valid enough to attempt fetch
          console.warn(`Product ${item.product_no} not found. Skipping earnings for this item.`);
        }
      });
    }

    const orderDocToSave: Omit<Order, 'id'> = {
      ...orderData,
      user_id: orderData.user_id || '0012', // Default or from orderData
      totalEarnings: totalEarnings,
      created_date: serverTimestamp() as Timestamp, // Firestore server timestamp
      // created_by: 'Justin', // Consider making this dynamic if needed
    };

    const newOrderRef = await addDoc(ordersCollection, orderDocToSave as any) as DocumentReference<Order>;

    // After order is successfully added, add items to packing queue
    if (newOrderRef.id && itemsForAggregation.length > 0) {
      for (const orderItem of itemsForAggregation) {
        if (!orderItem.product_no || typeof orderItem.quantity !== 'number') {
          console.warn('Skipping packing item due to missing product_no or quantity:', orderItem);
          continue;
        }
        const packingItemData: Omit<PackingItem, 'id' | 'creationDate' | 'lastUpdateDate'> = {
          orderId: newOrderRef.id,
          externalOrderId: orderData.id, // Assuming orderData.id might be an external ID if provided
          productId: orderItem.product_no, // Using product_no as the reference. Consider if a Firestore product ID is better.
          productName: orderItem.product_name || 'N/A', // Ensure product_name is available
          quantityToPack: orderItem.quantity,
          status: 'pending',
          customerName: orderData.customer_name,
          deliveryAddress: orderData.delivery_address,
        };
        try {
          await this.packingQueueService.addItemToPackingQueue(packingItemData);
        } catch (packError) {
          console.error(`Failed to add item ${orderItem.product_no} to packing queue for order ${newOrderRef.id}:`, packError);
          // Potentially add to a retry queue or log for manual intervention
        }
      }
    }
    return newOrderRef;
  }

  UpdateOrder(id: string, value: Partial<Order>) { // Typed value
    const orderDocRef = doc(this.firestore, 'orders', id);
    return updateDoc(orderDocRef, value);
  }

  /* Create Product */
  AddProduct(product: Product) {
    const productsCollection = collection(this.firestore, 'products');
    return addDoc(productsCollection, {
      ...product,
      quantity: +product.quantity,
      price: +product.price,
      costPrice: +product.costPrice, // Add costPrice
      created_date: serverTimestamp() // Use serverTimestamp
    });
  }

  AddRestock(stock: Restock) {
    const restockCollection = collection(this.firestore, 'restock');
    return addDoc(restockCollection, {
      ...stock,
      quantity: +stock.quantity,
      price: +stock.price,
      created_date: serverTimestamp() // Use serverTimestamp
    });
  }

  async UpdateProduct(stock: any) { // Made async due to await
    const productsCollectionRef = collection(this.firestore, 'products');
    const q = query(productsCollectionRef, where('product_no', "==", stock.product_no));

    const querySnapshot = await firstValueFrom(collectionData(q, { idField: 'id' }).pipe(map(results => results)));

    if (querySnapshot.length > 0) {
      const existingProductDoc = querySnapshot[0];
      const productDocRef = doc(this.firestore, 'products', existingProductDoc.id);
      const old_quantity = (existingProductDoc as Product).quantity;
      // Update costPrice and quantity
      return updateDoc(productDocRef, {
        quantity: +stock.quantity + +old_quantity,
        costPrice: +stock.price // stock.price is the new costPrice
        // Selling price is not changed here as per requirements
      });
    } else {
      // Add new product with costPrice and calculated selling price
      return addDoc(productsCollectionRef, {
        product_no: stock.product_no,
        product_name: stock.product_name,
        color: stock.color,
        costPrice: +stock.price, // stock.price is the costPrice
        price: (+stock.price * 120 / 100), // Calculate selling price
        quantity: +stock.quantity,
        created_date: serverTimestamp(), // Use serverTimestamp
        // Ensure other Product fields are considered if necessary e.g. product_type
        // For now, aligning with existing fields in this block.
        product_type: stock.product_type || '' // Add product_type, default to empty string if not provided
      });
    }
  }

  Delete(table: string, id: string) {
    const docRef = doc(this.firestore, table, id);
    return updateDoc(docRef, {
      deleted: true,
      deleted_date: serverTimestamp() // Use serverTimestamp
    });
  }

  /* Get Product list */
  getProductList() {
    const productsCollectionRef = collection(this.firestore, 'products');
    // Assuming snapshotChanges() is used for real-time updates with metadata
    // For v9, this is typically collectionData or docData with an idField option
    // or stateChanges for more detailed snapshot information.
    // For simplicity, let's use collectionData for now if full snapshot isn't strictly needed.
    // If snapshotChanges' full DocumentChangeAction[] is needed, it's more complex.
    // Sticking to a simpler collectionData for now.
    return collectionData(productsCollectionRef, { idField: 'id' }); // Returns Observable<Product[]>
  }

  /* Get Low Stock Products */
  getLowStockProducts(threshold: number) {
    const productsCollectionRef = collection(this.firestore, 'products');
    const q = query(productsCollectionRef, where('quantity', '<=', threshold));
    return collectionData(q, { idField: 'id' }); // Returns Observable<Product[]>
  }

  GetRestockList() {
    const restockCollectionRef = collection(this.firestore, 'restock');
    return collectionData(restockCollectionRef, { idField: 'id' }); // Returns Observable<Restock[]>
  }

  /* Get Order list */
  GetOrdersList() {
    const ordersCollectionRef = collection(this.firestore, 'orders');
    const q = query(ordersCollectionRef, orderBy('created_date'));
    // Similar to getProductList, using collectionData
    return collectionData(q, { idField: 'id' }); // Returns Observable<Order[]>
  }

  /* Get Order */
  GetOrder(id: string) {
    const orderDocRef = doc(this.firestore, 'orders', id);
    return docData(orderDocRef, { idField: 'id' }); // Returns Observable<Order>
    // If you need the DocumentSnapshot, use getDoc(orderDocRef) which returns a Promise
    // or snapshot(orderDocRef) for an Observable of DocumentSnapshot
  }

  /**
   * Retrieves the sales history for a specific product.
   * @param productNo The product number (SKU or identifier) to find sales for.
   * @returns Observable of an array, where each element is { date: Timestamp, quantity: number }
   */
  getProductSalesHistory(productNo: string): Observable<{ date: Timestamp, quantity: number }[]> {
    const ordersCollectionRef = collection(this.firestore, 'orders');
    return collectionData<OrderForService>(ordersCollectionRef, { idField: 'id' }).pipe(
      map(orders => {
        const salesHistory: { date: Timestamp, quantity: number }[] = [];
        orders.forEach(order => {
          // Ensure created_date is properly handled and converted to Timestamp if necessary
          let validatedTimestamp: Timestamp | null = null;
          if (order.created_date) {
            if (order.created_date instanceof Timestamp) {
              validatedTimestamp = order.created_date;
            } else if (order.created_date instanceof Date) {
              validatedTimestamp = Timestamp.fromDate(order.created_date);
            } else if (typeof order.created_date === 'string') {
              // Attempt to parse if string, though this is less reliable
              const parsed = new Date(order.created_date);
              if (!isNaN(parsed.getTime())) {
                validatedTimestamp = Timestamp.fromDate(parsed);
              }
            }
          }

          if (order.items && Array.isArray(order.items) && validatedTimestamp) {
            order.items.forEach((item: any) => {
              if (item.product_no === productNo && item.quantity) {
                salesHistory.push({
                  date: validatedTimestamp as Timestamp,
                  quantity: +item.quantity
                });
              }
            });
          }
        });
        // Sort by date ascending, which is good for time series analysis
        return salesHistory.sort((a, b) => a.date.toMillis() - b.date.toMillis());
      })
    );
  }

  /**
   * Predicts stock levels for the next 7 days based on sales history.
   * @param productNo The product number (SKU or identifier).
   * @param currentStock The current available stock quantity.
   * @returns Observable of an array of { date: Date, predictedStock: number } for the next 7 days.
   */
  predictStock(productNo: string, currentStock: number): Observable<{ date: Date, predictedStock: number }[]> {
    return this.getProductSalesHistory(productNo).pipe(
      map(salesHistory => { // salesHistory is now { date: Timestamp, quantity: number }[]
        const predictions: { date: Date, predictedStock: number }[] = [];
        let averageDailySales = 0;

        if (salesHistory && salesHistory.length > 0) {
          // Filter sales for the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          // Ensure date comparison is correct (toDate() needed for Timestamp)
          const recentSales = salesHistory.filter(sale => sale.date.toDate() > thirtyDaysAgo);

          let relevantSales = recentSales.length > 0 ? recentSales : salesHistory;

          // Calculate total quantity sold and the time span in days
          if (relevantSales.length > 0) {
            const totalQuantitySold = relevantSales.reduce((sum, sale) => sum + sale.quantity, 0);

            const firstSaleDate = relevantSales[0].date.toDate(); // convert Timestamp to Date
            const lastSaleDate = relevantSales[relevantSales.length - 1].date.toDate(); // convert Timestamp to Date

            let timeSpanDays = (lastSaleDate.getTime() - firstSaleDate.getTime()) / (1000 * 3600 * 24);
            if (timeSpanDays < 1 && relevantSales.length >=1) {
                timeSpanDays = 1;
            } else if (relevantSales.length > 1) {
                timeSpanDays = Math.max(1, Math.round(timeSpanDays));
            }

            if (timeSpanDays > 0) {
              averageDailySales = totalQuantitySold / timeSpanDays;
            } else if (totalQuantitySold > 0) {
              averageDailySales = totalQuantitySold;
            }
          }
        }

        let predictedStock = currentStock;
        for (let i = 0; i < 7; i++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + i);

          if (i > 0) { // For day 0 (today), prediction is current stock before deduction
            predictedStock -= averageDailySales;
          }

          predictions.push({
            date: futureDate,
            predictedStock: Math.max(0, Math.round(predictedStock)) // Ensure stock doesn't go below zero and round it
          });
        }
        return predictions;
      })
    );
  }
}