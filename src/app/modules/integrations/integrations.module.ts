import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule

import { SharedModule } from '../../shared/shared.module';

import { IntegrationsLandingComponent } from './integrations-landing/integrations-landing.component';
import { EbayConnectorComponent } from './ebay-connector/ebay-connector.component';
import { ShopifyConnectorComponent } from './shopify-connector/shopify-connector.component';
import { AmazonConnectorComponent } from './amazon-connector/amazon-connector.component';
import { QuickbooksConnectorComponent } from './quickbooks-connector/quickbooks-connector.component';
import { XeroConnectorComponent } from './xero-connector/xero-connector.component';
import { FedexConnectorComponent } from './fedex-connector/fedex-connector.component';
import { UpsConnectorComponent } from './ups-connector/ups-connector.component';
import { ShippoConnectorComponent } from './shippo-connector/shippo-connector.component';

const routes: Routes = [
  { path: '', component: IntegrationsLandingComponent },
  { path: 'ebay', component: EbayConnectorComponent },
  { path: 'shopify', component: ShopifyConnectorComponent },
  { path: 'amazon', component: AmazonConnectorComponent },
  { path: 'quickbooks', component: QuickbooksConnectorComponent },
  { path: 'xero', component: XeroConnectorComponent },
  { path: 'fedex', component: FedexConnectorComponent },
  { path: 'ups', component: UpsConnectorComponent },
  { path: 'shippo', component: ShippoConnectorComponent },
];

@NgModule({
  declarations: [
    IntegrationsLandingComponent,
    EbayConnectorComponent,
    ShopifyConnectorComponent,
    AmazonConnectorComponent,
    QuickbooksConnectorComponent,
    XeroConnectorComponent,
    FedexConnectorComponent,
    UpsConnectorComponent,
    ShippoConnectorComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    HttpClientModule, // For services that use HttpClient
    ReactiveFormsModule, // Add for form functionalities in new components
    SharedModule      // For Material components and other shared UI elements
  ],
  providers: [
    // Services are typically providedIn: 'root'
  ]
})
export class IntegrationsModule { }
