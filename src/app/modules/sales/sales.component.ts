import { Component, OnInit } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Order } from '../model/order.model';
import * as moment from 'moment';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss']
})
export class SalesComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }
	columnHeader = {'user_id': 'User ID', 'customer_name': 'Customer Name', 'created_date': 'created_date', 'delivery_address': 'Delivery Address', 'total_cost': 'Total Cost'};
  tableData: Order[] = [];
  // tableData: Order[] = [
  //   { user_id: '1', customer_name: 'Hydrogen', total_cost: 1.0079, delivery_address: 'H', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '2', customer_name: 'Helium', total_cost: 4.0026, delivery_address: 'He', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '3', customer_name: 'Lithium', total_cost: 6.941, delivery_address: 'Li', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '4', customer_name: 'Beryllium', total_cost: 9.0122, delivery_address: 'Be', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '5', customer_name: 'Boron', total_cost: 10.811, delivery_address: 'B', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '6', customer_name: 'Carbon', total_cost: 12.0107, delivery_address: 'C', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '7', customer_name: 'Nitrogen', total_cost: 14.0067, delivery_address: 'N', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '8', customer_name: 'Oxygen', total_cost: 15.9994, delivery_address: 'O', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '9', customer_name: 'Fluorine', total_cost: 18.9984, delivery_address: 'F', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '10', customer_name: 'Neon', total_cost: 29, delivery_address: 'Ne', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '11', customer_name: 'Sodium', total_cost: 22.9897, delivery_address: 'Na', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '12', customer_name: 'Magnesium', total_cost: 24.305, delivery_address: 'Mg', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '13', customer_name: 'Aluminum', total_cost: 26.9815, delivery_address: 'Al', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '14', customer_name: 'Silicon', total_cost: 28.0855, delivery_address: 'Si', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '15', customer_name: 'Phosphorus', total_cost: 30.9738, delivery_address: 'P', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '16', customer_name: 'Sulfur', total_cost: 32.065, delivery_address: 'S', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '17', customer_name: 'Chlorine', total_cost: 35.453, delivery_address: 'Cl', created_date: '2020-05-30T18:30:00.000+0000'  },
  //   { user_id: '18', customer_name: 'Argon', total_cost: 39.948, delivery_address: 'Ar', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '19', customer_name: 'Potassium', total_cost: 39.0983, delivery_address: 'K', created_date: '2020-05-28T18:30:00.000+0000' },
  //   { user_id: '20', customer_name: 'Calcium', total_cost: 40.078, delivery_address: 'Ca', created_date: '2020-05-28T18:30:00.000+0000' },
  // ];
}
