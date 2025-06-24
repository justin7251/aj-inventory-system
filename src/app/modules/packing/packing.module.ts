import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms'; // For potential ngModel use if adding filters/forms

import { PackingListComponent } from './packing-list/packing-list.component';
import { SharedModule } from '../../shared/shared.module'; // For Material components

// Services are provided in root, no need to add PackingQueueService here unless scoping.

const routes: Routes = [
  {
    path: '', // Default route for this module, e.g., /packing
    component: PackingListComponent
  }
];

@NgModule({
  declarations: [
    PackingListComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    SharedModule // For Material table, buttons, select, etc.
  ]
})
export class PackingModule { }
