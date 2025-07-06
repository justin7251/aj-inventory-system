import { Component, OnInit, ViewChild } from '@angular/core';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import { MatSort} from '@angular/material/sort';


import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { ItemDialogComponent } from '../item-dialog/item-dialog.component';
import { OrderService } from '../services/order.service'; // Changed ItemService to OrderService

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
		'totalEarnings', // Added totalEarnings
		'items',
		'action'
	];

	constructor(
		public orderService: OrderService, // Changed db to orderService
		public dialog: MatDialog
	) { 
    // Changed db.GetOrdersList to orderService.getAllOrders
		this.orderService.getAllOrders()
			.subscribe(orders => { // Changed order to orders
        // Assuming getAllOrders returns Order[] directly, or adjust mapping if it's still DocumentChangeAction[]
        // If it's Order[] directly:
        this.OrderData = orders;

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
		  // Assuming e is the Order object and has an id property
		  const orderId = e.id;
		  data.splice((this.paginator.pageIndex * this.paginator.pageSize) + index, 1);
		  this.dataSource.data = data;
      // Changed db.Delete to orderService.deleteOrder
		  this.orderService.deleteOrder('orders', orderId);
		}
	}

}
