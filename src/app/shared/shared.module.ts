import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {MatDividerModule} from '@angular/material/divider';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatMenuModule} from '@angular/material/menu';
import {MatListModule} from '@angular/material/list';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';

import { RouterModule } from '@angular/router';
import { HighchartsChartModule } from 'highcharts-angular';

import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AreaComponent } from './widgets/area/area.component';
import { CardComponent } from './widgets/card/card.component';
import { PieComponent } from './widgets/pie/pie.component';
import { TableComponent } from './widgets/table/table.component';


@NgModule({
	declarations: [
		HeaderComponent,
		FooterComponent,
		SidebarComponent,
		AreaComponent,
		CardComponent,
		CardComponent,
		PieComponent,
		TableComponent
	],
	imports: [
		CommonModule,
		MatDividerModule,
		MatToolbarModule,
		MatIconModule,
		MatButtonModule,
		MatMenuModule,
		MatListModule,
		RouterModule,
		HighchartsChartModule,
		MatTableModule,
		MatPaginatorModule
	],
	exports: [
		HeaderComponent,
		FooterComponent,
		SidebarComponent,
		AreaComponent,
		CardComponent,
		PieComponent,
		TableComponent
	]
})
export class SharedModule { }
