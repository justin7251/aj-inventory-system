import { Component } from '@angular/core';

/**
 * Component that serves as a landing page for accessing different
 * external system integrations (e.g., eBay, Shopify).
 * It displays a list of available integrations for the user to navigate to.
 */
@Component({
  selector: 'app-integrations-landing',
  templateUrl: './integrations-landing.component.html',
  styleUrls: ['./integrations-landing.component.scss']
})
export class IntegrationsLandingComponent {
  integrations = [
    { name: 'Amazon Marketplace', path: './amazon', description: 'Sync orders, products, and inventory with Amazon.', icon: 'shopping_cart' },
    { name: 'eBay Marketplace', path: './ebay', description: 'Sync orders, products, and inventory with eBay.', icon: 'storefront' },
    { name: 'Shopify Store', path: './shopify', description: 'Synchronize orders from your Shopify store.', icon: 'store' },
    { name: 'QuickBooks Accounting', path: './quickbooks', description: 'Sync invoices, payments, and customers with QuickBooks.', icon: 'assessment' },
    { name: 'Xero Accounting', path: './xero', description: 'Sync invoices, payments, and contacts with Xero.', icon: 'account_balance_wallet' },
    { name: 'FedEx Shipping', path: './fedex', description: 'Get rates, create labels, and track FedEx shipments.', icon: 'local_shipping' },
    { name: 'UPS Shipping', path: './ups', description: 'Get rates, create labels, and track UPS shipments.', icon: 'rv_hookup' }, // rv_hookup is a truck icon
    { name: 'Shippo Multi-Carrier', path: './shippo', description: 'Manage shipping with multiple carriers via Shippo.', icon: 'dynamic_feed' }
  ];

  constructor() { }
}
