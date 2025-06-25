import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, serverTimestamp } from '@angular/fire/firestore';
import { Restock } from '../model/restock.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RestockService {
  constructor(public firestore: Firestore) {}

  addRestockTransaction(stock: Restock) {
    const restockCollection = collection(this.firestore, 'restock');
    return addDoc(restockCollection, {
      ...stock,
      quantity: +stock.quantity,
      price: +stock.price, // This is cost price for the restock batch
      created_date: serverTimestamp()
    });
  }

  getRestockHistory(): Observable<Restock[]> {
    const restockCollectionRef = collection(this.firestore, 'restock');
    return collectionData(restockCollectionRef, { idField: 'id' }) as Observable<Restock[]>;
  }
}
