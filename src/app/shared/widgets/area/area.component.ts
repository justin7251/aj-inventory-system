import { Component, OnInit, Input } from '@angular/core'; // Added Input
import * as Highcharts from 'highcharts';
import HC_exporting from 'highcharts/modules/exporting';

@Component({
  selector: 'app-widget-area',
  templateUrl: './area.component.html',
  styleUrls: ['./area.component.scss']
})
export class AreaComponent implements OnInit {

  @Input() chartOptions: Highcharts.Options = {}; // Added Input and type
  Highcharts = Highcharts;


	constructor() { }

	ngOnInit() {
    // Default options if none are provided
    const defaultOptions: Highcharts.Options = {
		    chart: {
		        type: 'line'
		    },
		    title: {
		        text: 'Monthly Average Temperature'
		    },
		    subtitle: {
		        text: 'Source: WorldClimate.com'
		    },
		    xAxis: {
		        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
		    },
		    yAxis: {
		        title: {
		            text: 'Temperature (°C)'
		        }
		    },
		    plotOptions: {
		        line: {
		            dataLabels: {
		                enabled: true
		            },
		            enableMouseTracking: false
		        }
		    },
		    series: [{
		        name: 'Tokyo',
		        type: 'line', // Added type to series
		        data: [7.0, 6.9, 9.5, 14.5, 18.4, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
		    }, {
		        name: 'London',
		        type: 'line', // Added type to series
		        data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2, 17.0, 16.6, 14.2, 10.3, 6.6, 4.8]
		    }]
		};

    this.chartOptions = {
      ...defaultOptions,
      ...this.chartOptions // User-provided options will override defaults
    };

		HC_exporting(Highcharts);

		setTimeout(() => {
	      window.dispatchEvent(
	        new Event('resize')
	      );
	    }, 300);
	}

}
