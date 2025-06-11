import { Component, OnInit } from '@angular/core';
import moment from 'moment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
	year = moment(new Date()).format('YYYY');
	constructor() {
	}

	ngOnInit() {
	}

}
