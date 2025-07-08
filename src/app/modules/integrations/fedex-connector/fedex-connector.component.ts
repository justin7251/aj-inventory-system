import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FedExService } from '../../services/fedex.service'; // Assuming service in modules/services

// Re-declare interfaces or import from service if they were exported
interface FedExRateRequest {
  shipperAddress: any;
  recipientAddress: any;
  packages: Array<{ weight: { value: number, units: 'LB' | 'KG' } }>;
}
interface FedExRateResponse {
  serviceName: string;
  totalNetCharge: number;
  currency: string;
  deliveryTimestamp?: string;
}
interface FedExLabelResponse {
  trackingNumber: string;
  labelImageBase64: string;
}
interface FedExTrackingResponse {
  trackingNumber: string;
  status: string;
  latestEvent: { timestamp: string; eventDescription: string; address: any; };
  estimatedDeliveryTimestamp?: string;
}

@Component({
  selector: 'app-fedex-connector',
  templateUrl: './fedex-connector.component.html',
  styleUrls: ['./fedex-connector.component.scss']
})
export class FedexConnectorComponent implements OnInit {
  isLoadingRates = false;
  isLoadingLabel = false;
  isLoadingTracking = false;

  rateForm: FormGroup;
  labelForm: FormGroup; // Simplified for now
  trackingForm: FormGroup;

  rates: FedExRateResponse[] = [];
  labelInfo: FedExLabelResponse | null = null;
  trackingInfo: FedExTrackingResponse | null = null;
  labelPreviewUrl: string | null = null;

  errorMessages: string[] = [];

  constructor(private fb: FormBuilder, private fedexService: FedExService) {
    this.rateForm = this.fb.group({
      shipperPostalCode: ['90210', Validators.required],
      shipperCountryCode: ['US', Validators.required],
      recipientPostalCode: ['10001', Validators.required],
      recipientCountryCode: ['US', Validators.required],
      packageWeight: [5, [Validators.required, Validators.min(0.1)]],
      packageWeightUnits: ['LB', Validators.required]
    });

    // Simplified label form for demonstration
    this.labelForm = this.fb.group({
      serviceType: ['FEDEX_GROUND', Validators.required] // This would come from selected rate
      // In a real app, more fields from rateForm/selectedRate would be used
    });

    this.trackingForm = this.fb.group({
      trackingNumber: ['', Validators.required]
    });
  }

  ngOnInit(): void { }

  getRates(): void {
    if (this.rateForm.invalid) {
      this.errorMessages = ['Rate form is invalid. Please check the fields.'];
      return;
    }
    this.isLoadingRates = true;
    this.rates = [];
    this.errorMessages = [];

    const formValue = this.rateForm.value;
    const rateRequest: FedExRateRequest = {
      shipperAddress: { postalCode: formValue.shipperPostalCode, countryCode: formValue.shipperCountryCode },
      recipientAddress: { postalCode: formValue.recipientPostalCode, countryCode: formValue.recipientCountryCode },
      packages: [{ weight: { value: formValue.packageWeight, units: formValue.packageWeightUnits } }]
    };

    this.fedexService.getShippingRates(rateRequest).subscribe(
      (response) => {
        this.rates = response;
        if (this.rates.length === 0) {
          this.errorMessages.push('No rates returned from FedEx (mock).');
        }
        this.isLoadingRates = false;
      },
      (err) => {
        this.errorMessages.push(`Error fetching rates: ${err.message || err}`);
        this.isLoadingRates = false;
      }
    );
  }

  createLabel(): void {
    // This is highly simplified. A real scenario would use more comprehensive address data
    // and selected rate information.
    if (this.labelForm.invalid) {
      this.errorMessages = ['Label form is invalid.'];
      return;
    }
    this.isLoadingLabel = true;
    this.labelInfo = null;
    this.labelPreviewUrl = null;
    this.errorMessages = [];

    // Example: Constructing a more complete (but still mock-level) label request
    const rateFormValue = this.rateForm.value; // Assuming rate form has relevant addresses
    const labelFormValue = this.labelForm.value;

    const labelRequest = {
      shipper: { name: 'Sender Name', street: '123 Main St', city: 'Beverly Hills', stateCode: 'CA', postalCode: rateFormValue.shipperPostalCode, countryCode: rateFormValue.shipperCountryCode, phone: '1234567890' },
      recipient: { name: 'Recipient Name', street: '456 Market St', city: 'New York', stateCode: 'NY', postalCode: rateFormValue.recipientPostalCode, countryCode: rateFormValue.recipientCountryCode, phone: '9876543210' },
      serviceType: labelFormValue.serviceType,
      packagingType: 'YOUR_PACKAGING',
      packages: [{ weight: { value: rateFormValue.packageWeight, units: rateFormValue.packageWeightUnits } }],
      labelSpecification: { imageType: 'PNG', labelStockType: 'PAPER_4X6' } // Request PNG for preview
    };

    this.fedexService.createShippingLabel(labelRequest as any).subscribe( // Cast as any due to simplified interface
      (response) => {
        this.labelInfo = response;
        if (response && response.labelImageBase64) {
          this.labelPreviewUrl = 'data:image/png;base64,' + response.labelImageBase64;
        } else if (!response) {
            this.errorMessages.push('No label data returned from FedEx (mock).');
        }
        this.isLoadingLabel = false;
      },
      (err) => {
        this.errorMessages.push(`Error creating label: ${err.message || err}`);
        this.isLoadingLabel = false;
      }
    );
  }

  trackPackage(): void {
    if (this.trackingForm.invalid) {
      this.errorMessages = ['Tracking form is invalid.'];
      return;
    }
    this.isLoadingTracking = true;
    this.trackingInfo = null;
    this.errorMessages = [];
    const formValue = this.trackingForm.value;

    this.fedexService.trackShipment({ trackingNumber: formValue.trackingNumber }).subscribe(
      (response) => {
        this.trackingInfo = response;
         if (!response) {
            this.errorMessages.push('No tracking data returned from FedEx (mock).');
        }
        this.isLoadingTracking = false;
      },
      (err) => {
        this.errorMessages.push(`Error tracking package: ${err.message || err}`);
        this.isLoadingTracking = false;
      }
    );
  }
}
