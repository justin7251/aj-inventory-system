import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DefaultComponent } from './layouts/default/default.component';
import { DashboardComponent } from './modules/dashboard/dashboard.component';
import { PostsComponent } from './modules/posts/posts.component';
import { SalesComponent } from './modules/sales/sales.component';
import { PurchaseComponent } from './modules/purchase/purchase.component';
import { ItemsComponent } from './modules/items/items.component';
import { ProductFormComponent } from './modules/product-form/product-form.component';


const routes: Routes = [{
	path: '',
	component: DefaultComponent,
	children: [
		{ path: '', component: DashboardComponent},
		{ path: 'posts', component: PostsComponent},
		{ path: 'items', component: ItemsComponent},
		{ path: 'sales', component: SalesComponent},
		{ path: 'purchase', component: PurchaseComponent},
		{ path: 'product_form', component: ProductFormComponent},
	]
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
