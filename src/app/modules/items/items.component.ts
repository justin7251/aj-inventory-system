import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Product } from '../model/product.model';

import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import {MatLegacyPaginatorModule as MatPaginatorModule} from '@angular/material/legacy-paginator';

@Component({
  selector: 'app-items',
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  // // product: Product[];
  tableData: any = [];
  ProductData = [];
  displayedColumns: any[] = [
		'product_no',
		'product_name',
		'quantity',
		'color', 
    'price',
    'add',
    'edit',
    'delete'
	];
  constructor(private itemService: ItemService) { }
  
  ngOnInit() {
    const obj = {};
    const data = [];
    this.itemService.getProductList().subscribe(products => {
      products.forEach(item => {
        let a = item.payload.doc.data();
        a['$key'] = (item.payload.doc as any).id;
        a['from'] = 'products';
        a['add'] = 'Add';
        a['edit'] = 'Edit';
        a['delete'] = 'Delete';
        this.tableData.push(a as Product);
      });
    });
  }
  
  create(product: Product){
    this.itemService.AddProduct(product);
  }
  
  // update(product: Product) {
    //   this.itemService.updatePolicy(policy);
    // }
    
  deleteOrder(id: string) {
    this.itemService.Delete('products', id);
  }
    
  columnHeader = {
    'product_no': 'Product ID',
    'product_name': 'Product Name',
    'quantity': 'Quantity',
    'color': 'Color',
    'price': 'Price',
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete'
  };
}
