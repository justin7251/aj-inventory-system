import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, collectionData, docData, where, query, orderBy, runTransaction, serverTimestamp, DocumentReference, CollectionReference, Query, DocumentSnapshot } from '@angular/fire/firestore';
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
      return updateDoc(productDocRef, { quantity: +stock.quantity + +old_quantity });
    } else {
      return addDoc(productsCollectionRef, {
        product_no: stock.product_no,
        product_name: stock.product_name,
        color: stock.color,
        price: (+stock.price * 120 / 100),
        quantity: +stock.quantity,
        created_date: serverTimestamp() // Use serverTimestamp
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
}