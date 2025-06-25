import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, serverTimestamp, runTransaction, DocumentReference } from '@angular/fire/firestore';
import { Product } from '../model/product.model';
import { Observable, firstValueFrom, map } from 'rxjs';

// Interface for the data expected by updateProductUponRestock
export interface ProductRestockData {
  product_no: string;
  product_name: string;
  color?: string;
  quantity: number;
  price: number;        // This is the cost price for the restock
  product_type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(public firestore: Firestore) {}

  /* Create Product */
  addProduct(product: Product) {
    const productsCollection = collection(this.firestore, 'products');
    return addDoc(productsCollection, {
      ...product,
      quantity: +product.quantity,
      price: +product.price,
      costPrice: +product.costPrice, // Add costPrice
      created_date: serverTimestamp() // Use serverTimestamp
    });
  }

  async updateProductUponRestock(stock: ProductRestockData) {
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
        product_type: stock.product_type || ''
      });
    }
  }

  /* Get Product list */
  getAllProducts(): Observable<Product[]> {
    const productsCollectionRef = collection(this.firestore, 'products');
    return collectionData(productsCollectionRef, { idField: 'id' }) as Observable<Product[]>;
  }

  /* Get Low Stock Products */
  getLowStockProducts(threshold: number): Observable<Product[]> {
    const productsCollectionRef = collection(this.firestore, 'products');
    const q = query(productsCollectionRef, where('quantity', '<=', threshold));
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }
}
