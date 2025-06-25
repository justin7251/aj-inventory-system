// item.service.ts (now significantly leaner)
import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
// Removed imports that are no longer used directly in this file:
// Product, Restock, Order, OrderItem, PackingQueueService, PackingItem,
// Observable, firstValueFrom, forkJoin, of, map, switchMap, catchError,
// doc, getDoc, setDoc, updateDoc, deleteDoc, collectionData, docData,
// where, query, orderBy, runTransaction, DocumentReference, CollectionReference,
// Query, DocumentSnapshot, Timestamp

// Interface for the data expected by addRecord
export interface GenericRecordData {
  uid: string;
  name: string;
  product_no: string;
  cost: number;
  selling_price: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  // Commented out properties are no longer needed here
  // exist:boolean;
  // productID: string;
  // old_quantity: number;

  constructor(
    public firestore: Firestore,
    // private packingQueueService: PackingQueueService // No longer needed here
  ) {}

  // This method's purpose is still under review. Keeping it here for now.
  addRecord(value: GenericRecordData) {
    const recordsCollection = collection(this.firestore, 'records');
    return addDoc(recordsCollection, {
      user_id: value.uid, // Assuming value.uid corresponds to user_id
      name: value.name,
      product_no: value.product_no,
      cost: value.cost,
      selling_price: value.selling_price,
      created: serverTimestamp()
    });
  }

  // All other methods have been moved to more specific services:
  // - addOrder, UpdateOrder, GetOrdersList, GetOrder -> OrderService
  // - AddProduct, UpdateProduct, getProductList, getLowStockProducts -> ProductService
  // - AddRestock, GetRestockList -> RestockService
  // - Delete -> FirestoreGenericService
  // - getProductSalesHistory, predictStock -> StockAnalysisService
  // - OrderForService interface was moved to StockAnalysisService (renamed to OrderForSalesHistory)
}