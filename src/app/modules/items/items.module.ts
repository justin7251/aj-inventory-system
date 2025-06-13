import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemsComponent } from './items.component';
import { ItemDialogComponent } from '../item-dialog/item-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    ItemsComponent,
    ItemDialogComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule,
    SharedModule
  ],
  exports: [
    ItemsComponent,
    ItemDialogComponent
  ]
})
export class ItemsModule { }
