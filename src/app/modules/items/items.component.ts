import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Product } from '../model/product.model';

import { MatTableDataSource } from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';

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
	];
  constructor(private itemService: ItemService) { }
  
  ngOnInit() {
    const obj = {};
    const data = [];
    this.itemService.getProductList().subscribe(products => {
      products.forEach(item => {
        let a = item.payload.doc.data();
        a['$key'] = item.payload.doc.id;
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
    
    // delete(id: string) {
      //   this.itemService.deletePolicy(id);
      // }
      
      columnHeader = {'product_no': 'Product ID', 'product_name': 'Product Name', 'quantity': 'Quantity', 'color': 'Color', 'price': 'Price'};
      // tableData = this.ProductData;

      // columnHeader = {'product_no': 'Product ID', 'product_name': 'Product Name'};
      // tableData = this.ProductData;
      // tableData = [
      //   { product_no: '0', product_name: 'Hydrogen', price: 1.0079, color: 'H', quantity: 20 },
      //   { product_no: '2', product_name: 'Helium', price: 4.0026, color: 'He', quantity: 20 },
      // ];
}
