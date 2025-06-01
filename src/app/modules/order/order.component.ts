import { Component, OnInit, ViewChild } from '@angular/core';
import {MatLegacyTableModule as MatTableModule, MatLegacyTableDataSource as MatTableDataSource} from '@angular/material/legacy-table';
import {MatLegacyPaginator as MatPaginator} from '@angular/material/legacy-paginator';
import { MatSort} from '@angular/material/sort';


import {MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA} from '@angular/material/legacy-dialog';
import { ItemDialogComponent } from '../item-dialog/item-dialog.component';
// User item service for now
import { ItemService } from '../services/item.service';

import { Order } from '../model/order.model';


@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {
	dataSource: MatTableDataSource<Order>;
  @ViewChild(MatPaginator,{static:false}) paginator: MatPaginator;
  @ViewChild(MatSort, {}) sort: MatSort;

	OrderData: any = [];
	displayedColumns: any[] = [
		'customer_name',
		'created_date', 
		'telephone',
		'delivery_address',
		'payment_type',
		'delivery_cost',
		'discount',
		'total_cost',
		'items',
		'action'
	];

	constructor(
		public db: ItemService,
		public dialog: MatDialog
	) { 
		this.db.GetOrdersList()
			.subscribe(order => {
		    order.forEach(item => {
		      let a = item.payload.doc.data();
		      a['$key'] = (item.payload.doc as any).id;
		      this.OrderData.push(a as Order)
		    })
		    /* Data table */
		    this.dataSource = new MatTableDataSource(this.OrderData);
		    /* Pagination */
		    setTimeout(() => {
		      this.dataSource.paginator = this.paginator;
		    }, 0);
		})
  }
  
  openDialog(items) {
		const dialogRef = this.dialog.open(ItemDialogComponent, {
		  width: '800px',
		  data: items
		})
	}

  ngOnInit(): void {
  }

  /* Delete */
	DeleteOrder(index: number, e){
		if(window.confirm('Are you sure?')) {
		  const data = this.dataSource.data;
		  data.splice((this.paginator.pageIndex * this.paginator.pageSize) + index, 1);
		  this.dataSource.data = data;
		  this.db.Delete('orders', e.$key)
		}
	}

}
