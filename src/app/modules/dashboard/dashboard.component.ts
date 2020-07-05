import { Component, OnInit, ViewChild } from '@angular/core';
import { DashboardService } from '../dashboard.service';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

	bigChart = [];
	cards = [];
	pieChart = [];
  
	constructor(private dashboardService: DashboardService) { }
  
	ngOnInit() {
    this.bigChart = this.dashboardService.bigChart();
		this.cards = this.dashboardService.cards();
		this.pieChart = this.dashboardService.pieChart();
  }
  
	columnHeader = {'position': 'Position', 'name': 'Name', 'weight': 'Total Cost', 'symbol': 'Shipping'};
  tableData: PeriodicElement[] = [
    { position: 1, name: 'John', weight: 50.99, symbol: 'H' },
    { position: 2, name: 'Tim', weight: 10.52, symbol: 'He' },
    { position: 3, name: 'Alan', weight: 20.5, symbol: 'Li' },
    { position: 4, name: 'Henry', weight: 60, symbol: 'Be' },
  ];

}
