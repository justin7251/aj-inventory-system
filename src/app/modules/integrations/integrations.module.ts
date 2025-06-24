import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http'; // Needed for EbayService

import { EbayConnectorComponent } from './ebay-connector/ebay-connector.component';
import { SharedModule } from '../../shared/shared.module'; // For UI components like buttons

const routes: Routes = [
  {
    path: '', // Default route for this module
    component: EbayConnectorComponent
  }
];

@NgModule({
  declarations: [
    EbayConnectorComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    HttpClientModule, // Make sure HttpClientModule is available for EbayService
    SharedModule      // Import SharedModule for Material components or other UI elements
  ],
  providers: [
    // EbayService and ItemService are already providedIn: 'root'
  ]
})
export class IntegrationsModule { }
