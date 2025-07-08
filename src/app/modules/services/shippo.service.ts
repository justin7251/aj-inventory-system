import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Simplified interfaces for Shippo API data
// Based on common Shippo API functionalities (Addresses, Parcels, Shipments, Rates, Transactions, Tracks)

interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string; // State/Province code (e.g., "CA")
  zip: string;
  country: string; // ISO 3166-1 alpha-2 country code (e.g., "US")
  phone?: string;
  email?: string;
  is_residential?: boolean;
  // validate?: boolean; // To request address validation
}

interface ShippoParcel {
  length: string; // cm, in
  width: string;
  height: string;
  distance_unit: 'cm' | 'in';
  weight: string; // g, oz, lb, kg
  mass_unit: 'g' | 'oz' | 'lb' | 'kg';
  template?: string; // e.g., "FedEx_Box_10kg"
  // metadata?: string;
}

interface ShippoShipmentRequest {
  address_from: ShippoAddress | string; // Can be an object_id or an address object
  address_to: ShippoAddress | string;
  parcels: ShippoParcel[] | string[]; // Array of object_ids or parcel objects
  // customs_declaration?: any; // For international
  // carrier_accounts?: string[]; // Specific accounts to use
  async?: boolean; // Default true for rates
}

interface ShippoRate {
  object_id: string;
  amount: string; // e.g., "7.54"
  currency: string; // e.g., "USD"
  provider: string; // e.g., "FedEx"
  provider_image_75: string; // URL
  provider_image_200: string; // URL
  servicelevel: {
    token: string; // e.g., "fedex_ground"
    name: string; // e.g., "FedEx Ground"
  };
  estimated_days: number;
  duration_terms: string; // e.g. "Delivery in 3 business days"
  // attributes: string[]; // e.g. "CHEAPEST", "BESTVALUE", "FASTEST"
  // ... other fields like messages, zone
}

interface ShippoTransactionRequest {
  rate: string; // object_id of the selected rate
  label_file_type?: 'PDF' | 'PNG' | 'PDF_4x6' | 'ZPLII'; // Default PDF_4x6
  async?: boolean;
}

interface ShippoTransaction {
  object_id: string;
  status: 'QUEUED' | 'WAITING' | 'SUCCESS' | 'ERROR' | 'REFUNDED' | 'REFUNDPENDING' | 'REFUNDREJECTED';
  rate: string; // Rate object_id
  tracking_number: string;
  tracking_url_provider: string; // Link to carrier's tracking page
  label_url: string; // Link to download the label
  commercial_invoice_url?: string;
  messages?: Array<{text: string}>;
  // eta?: string; // ISO 8601
  // ... other fields
}

interface ShippoTrackRequest {
  carrier: string; // e.g., "fedex", "ups", "usps" (Shippo carrier token)
  tracking_number: string;
}

interface ShippoTrack {
  carrier: string;
  tracking_number: string;
  address_from?: ShippoAddress;
  address_to?: ShippoAddress;
  eta?: string; // ISO 8601
  original_eta?: string;
  servicelevel?: { token: string, name: string };
  tracking_status?: {
    status: 'PRE_TRANSIT' | 'TRANSIT' | 'DELIVERED' | 'RETURNED' | 'FAILURE' | 'UNKNOWN';
    status_details: string;
    status_date: string; // ISO 8601
    location?: any; // Simplified address object
  };
  tracking_history?: Array<{ // Most recent first
    status: string; // As above
    status_details: string;
    status_date: string;
    location?: any;
  }>;
  // messages?: any[];
}


@Injectable({
  providedIn: 'root'
})
export class ShippoService {
  private shippoApiEndpoint = environment.shippoApiConfig?.endpoint; // e.g., https://api.goshippo.com/
  // Mock data URLs if needed, e.g., for a complex rate list

  constructor(private http: HttpClient) {
    if (!this.shippoApiEndpoint) {
      console.warn('ShippoService: API endpoint is not configured in environment files. Mock mode only.');
    }
  }

  // In Shippo, you typically create a Shipment object first, then its rates are retrieved.
  createShipmentAndGetRates(shipmentRequest: ShippoShipmentRequest): Observable<ShippoRate[]> {
    if (this.shippoApiEndpoint) {
      console.warn('ShippoService: Actual API call for createShipmentAndGetRates not implemented. Returning mock data.');
      // TODO: Implement actual POST to this.shippoApiEndpoint/shipments/
      // The response from Shippo for a shipment creation will contain the rates array.
      // This mock simplifies by directly returning rates.
      return of(this.getHardcodedMockRates(shipmentRequest));
    } else {
      console.log('ShippoService: Simulating createShipmentAndGetRates (mock). Request:', shipmentRequest);
      return of(this.getHardcodedMockRates(shipmentRequest));
    }
  }

  createShippingLabel(transactionRequest: ShippoTransactionRequest): Observable<ShippoTransaction | null> {
    if (this.shippoApiEndpoint) {
      console.warn('ShippoService: Actual API call for createShippingLabel (transaction) not implemented. Returning mock data.');
      // TODO: Implement actual POST to this.shippoApiEndpoint/transactions/
      return of(this.getHardcodedMockTransaction(transactionRequest));
    } else {
      console.log('ShippoService: Simulating createShippingLabel (mock). Request:', transactionRequest);
      return of(this.getHardcodedMockTransaction(transactionRequest));
    }
  }

  // Shippo uses a specific endpoint for tracking, not per carrier.
  trackShipment(trackRequest: ShippoTrackRequest): Observable<ShippoTrack | null> {
    if (this.shippoApiEndpoint) {
      console.warn('ShippoService: Actual API call for trackShipment not implemented. Returning mock data.');
      // TODO: Implement actual GET to this.shippoApiEndpoint/tracks/{carrier}/{tracking_number}/
      return of(this.getHardcodedMockTrackingInfo(trackRequest));
    } else {
      console.log('ShippoService: Simulating trackShipment (mock). Request:', trackRequest);
      return of(this.getHardcodedMockTrackingInfo(trackRequest));
    }
  }

  private getHardcodedMockRates(request: ShippoShipmentRequest): ShippoRate[] {
    // Mock rates from various carriers
    return [
      { object_id: 'rate_mock_fedex_ground', amount: '10.25', currency: 'USD', provider: 'FedEx', provider_image_75: '', provider_image_200: '', servicelevel: { token: 'fedex_ground', name: 'FedEx Ground' }, estimated_days: 3, duration_terms: 'Est. 3 business days' },
      { object_id: 'rate_mock_ups_ground', amount: '11.50', currency: 'USD', provider: 'UPS', provider_image_75: '', provider_image_200: '', servicelevel: { token: 'ups_ground', name: 'UPS Ground' }, estimated_days: 3, duration_terms: 'Est. 3 business days' },
      { object_id: 'rate_mock_usps_priority', amount: '9.80', currency: 'USD', provider: 'USPS', provider_image_75: '', provider_image_200: '', servicelevel: { token: 'usps_priority', name: 'USPS Priority Mail' }, estimated_days: 2, duration_terms: 'Est. 2 business days' },
      { object_id: 'rate_mock_dhl_express', amount: '25.00', currency: 'USD', provider: 'DHL Express', provider_image_75: '', provider_image_200: '', servicelevel: { token: 'dhl_express_worldwide', name: 'DHL Express Worldwide' }, estimated_days: 1, duration_terms: 'Est. 1 business day' }
    ];
  }

  private getHardcodedMockTransaction(request: ShippoTransactionRequest): ShippoTransaction {
    const selectedRateId = request.rate;
    let carrier = 'unknown';
    if (selectedRateId.includes('fedex')) carrier = 'FedEx';
    else if (selectedRateId.includes('ups')) carrier = 'UPS';
    else if (selectedRateId.includes('usps')) carrier = 'USPS';
    else if (selectedRateId.includes('dhl')) carrier = 'DHL';

    return {
      object_id: `txn_mock_${Date.now()}`,
      status: 'SUCCESS',
      rate: selectedRateId,
      tracking_number: `${carrier.toUpperCase()}_TRACK_${Date.now()}`,
      tracking_url_provider: `https://www.tracking.example.com/${carrier}/?tn=${Date.now()}`, // Placeholder
      label_url: 'https://api.goshippo.com/mocklabel.pdf', // Placeholder
      messages: [{text: 'Mock label generated successfully.'}]
    };
  }

  private getHardcodedMockTrackingInfo(request: ShippoTrackRequest): ShippoTrack {
    const now = new Date().toISOString();
    return {
      carrier: request.carrier,
      tracking_number: request.tracking_number,
      tracking_status: {
        status: 'TRANSIT',
        status_details: 'Package is on its way to the destination.',
        status_date: now,
        location: { city: 'CHICAGO', state: 'IL', zip: '60607', country: 'US' }
      },
      eta: new Date(Date.now() + 2 * 86400000).toISOString(), // 2 days from now
      tracking_history: [
        { status: 'TRANSIT', status_details: 'Arrived at sort facility.', status_date: now, location: { city: 'CHICAGO', state: 'IL', zip: '60607', country: 'US' } },
        { status: 'TRANSIT', status_details: 'Departed from origin.', status_date: new Date(Date.now() - 86400000).toISOString(), location: { city: 'LOS ANGELES', state: 'CA', zip: '90001', country: 'US' } }
      ]
    };
  }
}
