import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PurchaseComponent } from './purchase.component';

@NgModule({
  declarations: [
    PurchaseComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    PurchaseComponent
  ]
})
export class PurchaseModule { }
