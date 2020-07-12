import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Product } from '../model/product.model';
import { Restock } from '../model/restock.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  exist:boolean;
  productID: string;
  old_quantity: number;

  constructor(
    public db: AngularFirestore,
  ) {}

  addRecord(value) {
    return this.db.collection('records').add({
      user_id: value.uid,
      name: value.name,
      product_no: value.product_no,
      cost: value.cost,
      selling_price: value.selling_price,
      created: new Date()
    });
  }


  addOrder(value) {
    // aggregation/orders
    const order_collection = this.db.collection('aggregation').doc('orders');
    order_collection.ref.get().then(function(data) {
      var last5_data = [];
      if (data.exists) {
          last5_data = data.data().last5;
          if (last5_data.length > 5) {
            //remove oldest order
            last5_data.shift();
          }
          last5_data.push(value);
          order_collection.set({
            total: +data.data().total + +value.total_cost,
            count: +data.data().count + 1,
            last5: last5_data
          });
      } else {
          order_collection.set({
            total: +value.total_cost,
            count: 1,
            last5: [value]
          });
      }
    }).catch(function(error) {
        console.log("Error getting aggregation:", error);
    });

    const user = JSON.parse(localStorage.getItem('user'));
    return this.db.collection('orders').add({
      // user_id: value.uid,
      user_id: '0012',
      customer_name: value.customer_name,
      telephone: value.telephone,
      delivery_address: value.delivery_address,
      payment_type: value.payment_type,
      delivery_cost: value.delivery_cost,
      discount: value.discount,
      items: value.items,
      total_cost: value.total_cost,
      // created_by: user.name,
      created_by: 'Justin',
      created_date: new Date()
    });
  }

  UpdateOrder(id, value) {
    return this.db.collection('orders').doc(id).update(value);
  }

  /* Create Product */
  AddProduct(product: Product) {
    return this.db.collection('products').add({
      product_no: product.product_no,
      product_name: product.product_name,
      color: product.color,
      quantity: +product.quantity,
      price: +product.price,
      created_date: new Date()
    });
  }

  AddRestock(stock: Restock) {
    return this.db.collection('restock').add({
      buyer_name: stock.buyer_name,
      buyer_telephone: stock.buyer_telephone,
      product_no: stock.product_no,
      product_name: stock.product_name,
      color: stock.color,
      quantity: +stock.quantity,
      price: +stock.price,
      created_date: new Date()
    });
  }

  UpdateProduct(stock) {
    this.productID = null;
    this.exist = false;
    this.db.collection('products', ref => ref.where('product_no', "==", stock.product_no)).snapshotChanges()
      .subscribe(product => {
          if (product.length > 0) {
            this.exist = true;
            product.forEach(item => {
              this.productID = item.payload.doc.id;
              const data = item.payload.doc.data() as Product;
              this.old_quantity = data.quantity;
            });
          }
      });
    // hack delay 1 sec
    setTimeout(() =>  {
      if (this.exist && this.productID) {
        this.db.collection('products').doc(this.productID).update({ quantity: +stock.quantity + +this.old_quantity });
      } else {
        this.db.collection('products').add({
          product_no: stock.product_no,
          product_name: stock.product_name,
          color: stock.color,
          price: (+stock.price * 120 / 100),
          quantity: +stock.quantity,
          created_date: new Date()
        });
      }
    }, 1000);
  }

  Delete(table: string,id: string) {
    return this.db.collection(table).doc(id).update({
      deleted: true,
      deleted_date: new Date(),
    });
  }

  /* Get Product list */
  getProductList() {
    return this.db.collection('products').snapshotChanges();
  }

  GetRestockList() {
    return this.db.collection('restock').snapshotChanges();
  }

  /* Get Order list */
  GetOrdersList(){
    // .where('deleted', '==', false)
    return this.db.collection('orders', ref => ref.orderBy('created_date'))
      .snapshotChanges();
  }

  /* Get Order */
  GetOrder(id: string) {
    return this.db.collection('orders').doc(id);
  }  
}