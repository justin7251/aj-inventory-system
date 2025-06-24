import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http'; // Needed for EbayService

import { EbayConnectorComponent } from './ebay-connector/ebay-connector.component';
import { ShopifyConnectorComponent } from './shopify-connector/shopify-connector.component'; // Import new component
import { IntegrationsLandingComponent } from './integrations-landing/integrations-landing.component'; // Import landing component
import { SharedModule } from '../../shared/shared.module'; // For UI components like buttons

const routes: Routes = [
  {
    path: '', // Default route for this module, now the landing page
    component: IntegrationsLandingComponent
  },
  {
    path: 'ebay', // Route for eBay connector
    component: EbayConnectorComponent
  },
  {
    path: 'shopify', // Route for Shopify connector
    component: ShopifyConnectorComponent
  }
];

@NgModule({
  declarations: [
    EbayConnectorComponent,
    ShopifyConnectorComponent, // Declare new component
    IntegrationsLandingComponent // Declare landing component
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
