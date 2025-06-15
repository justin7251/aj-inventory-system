import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, collectionData, docData, where, query, orderBy, runTransaction, serverTimestamp, DocumentReference, CollectionReference, Query, DocumentSnapshot, Timestamp } from '@angular/fire/firestore';
import { Product } from '../model/product.model';
import { Restock } from '../model/restock.model';
import { firstValueFrom } from 'rxjs'; // For UpdateProduct logic
import { map } from 'rxjs/operators'; // For UpdateProduct logic

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

  async addOrder(value: any) { // Added type, made async for transaction
    const orderCollectionRef = collection(this.firestore, 'aggregation');
    const orderDocRef = doc(orderCollectionRef, 'orders');

    try {
      await runTransaction(this.firestore, async (transaction) => {
        const sfDoc = await transaction.get(orderDocRef);
        let last5_data = [];
        let newTotal = +value.total_cost;
        let newCount = 1;

        if (sfDoc.exists()) {
          const data = sfDoc.data();
          last5_data = data.last5 || [];
          if (last5_data.length >= 5) { // ensure it's >= 5, not > 5 for shift
            last5_data.shift();
          }
          last5_data.push(value); // Assuming value is the order object itself
          newTotal = +data.total + +value.total_cost;
          newCount = +data.count + 1;
          transaction.update(orderDocRef, { total: newTotal, count: newCount, last5: last5_data });
        } else {
          last5_data.push(value);
          transaction.set(orderDocRef, { total: newTotal, count: newCount, last5: last5_data });
        }
      });
    } catch (e) {
      console.log("Transaction failed: ", e);
    }

    // const user = JSON.parse(localStorage.getItem('user')); // This needs to be handled if still relevant
    const ordersCollection = collection(this.firestore, 'orders');

    // Calculate totalEarnings
    let totalEarnings = 0;
    if (value.items && Array.isArray(value.items)) {
      for (const item of value.items) {
        if (!item.product_no || !item.quantity || !item.item_cost) {
          console.warn(`Order item is missing product_no, quantity, or item_cost. Skipping earnings calculation for this item.`, item);
          continue;
        }

        const productsCollectionRef = collection(this.firestore, 'products');
        const productQuery = query(productsCollectionRef, where('product_no', "==", item.product_no));

        try {
          const querySnapshot = await firstValueFrom(collectionData(productQuery, { idField: 'id' }).pipe(map(results => results)));

          if (querySnapshot.length > 0) {
            const productData = querySnapshot[0] as Product; // Assuming Product model has costPrice
            if (productData.costPrice !== undefined && productData.costPrice !== null) {
              const itemQuantity = parseFloat(item.quantity);
              const itemSellingPrice = parseFloat(item.item_cost); // This is price_per_unit * quantity for that item line from order form
              // item_cost in order is often total for that line, not per unit. Assuming item.item_cost is price per unit here.
              // If item.item_cost is total for line, then it should be item_total_selling_price = parseFloat(item.item_cost)
              // And earnings would be item_total_selling_price - (itemQuantity * parseFloat(productData.costPrice))
              // Let's assume item.item_cost is PER UNIT as per typical order forms.

              const itemCostPrice = parseFloat(productData.costPrice.toString());

              if (isNaN(itemQuantity) || isNaN(itemSellingPrice) || isNaN(itemCostPrice)) {
                console.warn(`Invalid number format for item: ${item.product_no}. Skipping earnings calculation for this item.`);
                continue;
              }

              // Earnings for this line item = (Quantity * Selling Price/Unit) - (Quantity * Cost Price/Unit)
              const item_earnings = (itemQuantity * itemSellingPrice) - (itemQuantity * itemCostPrice);
              totalEarnings += item_earnings;
            } else {
              console.warn(`Product ${item.product_no} found, but costPrice is missing. Skipping earnings calculation for this item.`);
            }
          } else {
            console.warn(`Product ${item.product_no} not found in database. Skipping earnings calculation for this item.`);
          }
        } catch (error) {
          console.error(`Error fetching product ${item.product_no}:`, error);
        }
      }
    }

    return addDoc(ordersCollection, {
      user_id: '0012', // value.uid,
      customer_name: value.customer_name,
      telephone: value.telephone,
      delivery_address: value.delivery_address,
      payment_type: value.payment_type,
      delivery_cost: value.delivery_cost,
      discount: value.discount,
      items: value.items,
      total_cost: value.total_cost,
      totalEarnings: totalEarnings, // Add totalEarnings to the order
      created_by: 'Justin', // user.name,
      created_date: serverTimestamp() // Use serverTimestamp
    });
  }

  UpdateOrder(id: string, value: any) { // Added type for value
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
    // Fetch all orders and then filter client-side.
    // This is because querying for a value within an array of objects is complex with Firestore directly.
    // For very large 'orders' collections, consider alternative data structures or backend processing.
    return (collectionData(ordersCollectionRef, { idField: 'id' }) as Observable<any[]>).pipe(
      map(orders => {
        const salesHistory: { date: Timestamp, quantity: number }[] = [];
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items) && order.created_date) {
            order.items.forEach((item: any) => {
              if (item.product_no === productNo && item.quantity) {
                salesHistory.push({
                  date: order.created_date as Timestamp, // Assuming created_date is a Firestore Timestamp
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
      map(salesHistory => {
        const predictions: { date: Date, predictedStock: number }[] = [];
        let averageDailySales = 0;

        if (salesHistory && salesHistory.length > 0) {
          // Filter sales for the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentSales = salesHistory.filter(sale => sale.date.toDate() > thirtyDaysAgo);

          let relevantSales = recentSales.length > 0 ? recentSales : salesHistory;

          // Calculate total quantity sold and the time span in days
          if (relevantSales.length > 0) {
            const totalQuantitySold = relevantSales.reduce((sum, sale) => sum + sale.quantity, 0);

            const firstSaleDate = relevantSales[0].date.toDate();
            const lastSaleDate = relevantSales[relevantSales.length - 1].date.toDate();

            let timeSpanDays = (lastSaleDate.getTime() - firstSaleDate.getTime()) / (1000 * 3600 * 24);
            if (timeSpanDays < 1 && relevantSales.length >=1) { // if all sales on same day, or only one sale
                timeSpanDays = 1; // avoid division by zero and assume it's one day's worth of sales
            } else if (relevantSales.length > 1) {
                timeSpanDays = Math.max(1, Math.round(timeSpanDays)); // Ensure at least 1 day
            }


            if (timeSpanDays > 0) {
              averageDailySales = totalQuantitySold / timeSpanDays;
            } else if (totalQuantitySold > 0) { // All sales on the same day
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