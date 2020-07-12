import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DefaultComponent } from './layouts/default/default.component';
import { DashboardComponent } from './modules/dashboard/dashboard.component';
import { PostsComponent } from './modules/posts/posts.component';
import { OrderComponent } from './modules/order/order.component';
import { PurchaseComponent } from './modules/purchase/purchase.component';
import { ItemsComponent } from './modules/items/items.component';
import { ProductFormComponent } from './modules/product-form/product-form.component';
import { OrderFormComponent } from './modules/order-form/order-form.component';
import { OrderEditComponent } from './modules/order-edit/order-edit.component';


const routes: Routes = [{
	path: '',
	component: DefaultComponent,
	children: [
		{ path: '', component: DashboardComponent},
		{ path: 'posts', component: PostsComponent},
		{ path: 'items', component: ItemsComponent},
		{ path: 'order', component: OrderComponent},
		{ path: 'purchase', component: PurchaseComponent},
		{ path: 'product_form', component: ProductFormComponent},
		{ path: 'order_form', component: OrderFormComponent},
		{ path: 'order_edit', component: OrderEditComponent},
	]
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
