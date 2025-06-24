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
    { name: 'eBay Integration', path: './ebay', description: 'Synchronize orders from your eBay store.' },
    { name: 'Shopify Integration', path: './shopify', description: 'Synchronize orders from your Shopify store.' }
  ];

  constructor() { }
}
