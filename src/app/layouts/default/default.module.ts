import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultComponent } from './default.component';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { DashboardService } from 'src/app/modules/dashboard.service';
import { ItemService } from 'src/app/modules/services/item.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialogModule} from '@angular/material/dialog';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';

import { DashboardModule } from 'src/app/modules/dashboard/dashboard.module';
import { PostsModule } from 'src/app/modules/posts/posts.module';
import { ItemsModule } from 'src/app/modules/items/items.module';
import { OrderModule } from 'src/app/modules/order/order.module';
import { PurchaseModule } from 'src/app/modules/purchase/purchase.module';
import { ProductFormModule } from 'src/app/modules/product-form/product-form.module';



@NgModule({
  declarations: [
    DefaultComponent
  ],
  imports: [
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    CommonModule,
    RouterModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    DashboardModule,
    PostsModule,
    ItemsModule,
    OrderModule,
    PurchaseModule,
    ProductFormModule
  ],
  providers: [
    DashboardService,
    ItemService
  ]
})
export class DefaultModule { }
