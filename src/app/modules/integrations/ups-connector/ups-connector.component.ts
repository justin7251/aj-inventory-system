import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UPSService } from '../../services/ups.service'; // Assuming service in modules/services

// Re-declare or import interfaces if not exported from service
interface UPSRateRequest { /* ... */ }
interface UPSRateResponse {
  service: { Code: string, Description?: string };
  totalCharges: { MonetaryValue: string, CurrencyCode: string };
  estimatedDelivery?: { date: string, time?: string };
}
interface UPSLabelResponse {
  shipmentResponse: {
    shipmentResults: {
      trackingNumber: string;
      packageResults: { shippingLabel: { ImageFormat: { Code: string }, GraphicImage: string } };
    }
  }
}
interface UPSTrackingResponse { /* ... simplified for brevity */
  shipment: [{
    package: [{
      trackingNumber: string;
      activity: Array<{ status: { Type: string, Description: string }, date: string, time: string, location?: any }>;
      deliveryDate?: any[];
    }];
  }];
}


@Component({
  selector: 'app-ups-connector',
  templateUrl: './ups-connector.component.html',
  styleUrls: ['./ups-connector.component.scss']
})
export class UpsConnectorComponent implements OnInit {
  isLoadingRates = false;
  isLoadingLabel = false;
  isLoadingTracking = false;

  rateForm: FormGroup;
  labelForm: FormGroup; // Simplified
  trackingForm: FormGroup;

  rates: UPSRateResponse[] = [];
  labelInfo: UPSLabelResponse | null = null;
  trackingInfo: UPSTrackingResponse | null = null;
  labelPreviewUrl: string | null = null;

  errorMessages: string[] = [];

  // Common UPS Service Codes for dropdown
  upsServiceCodes = [
    { Code: '01', Description: 'UPS Next Day Air' },
    { Code: '02', Description: 'UPS 2nd Day Air' },
    { Code: '03', Description: 'UPS Ground' },
    { Code: '12', Description: 'UPS 3 Day Select' },
    { Code: '13', Description: 'UPS Next Day Air Saver' },
    { Code: '14', Description: 'UPS Next Day Air Early' },
    { Code: '59', Description: 'UPS 2nd Day Air A.M.' },
    // Add more as needed, including international
  ];

  constructor(private fb: FormBuilder, private upsService: UPSService) {
    this.rateForm = this.fb.group({
      shipperPostalCode: ['90210', Validators.required],
      shipperCountryCode: ['US', Validators.required],
      recipientPostalCode: ['10001', Validators.required],
      recipientCountryCode: ['US', Validators.required],
      packageWeight: ['5', [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
      packageWeightUnits: ['LBS', Validators.required]
    });

    this.labelForm = this.fb.group({
      serviceCode: ['03', Validators.required] // Default to UPS Ground
    });

    this.trackingForm = this.fb.group({
      trackingNumber: ['', Validators.required]
    });
  }

  ngOnInit(): void { }

  getRates(): void {
    if (this.rateForm.invalid) {
      this.errorMessages = ['Rate form is invalid.'];
      return;
    }
    this.isLoadingRates = true;
    this.rates = [];
    this.errorMessages = [];
    const formVal = this.rateForm.value;

    const rateRequest: UPSRateRequest = {
      shipper: { address: { PostalCode: formVal.shipperPostalCode, CountryCode: formVal.shipperCountryCode } },
      shipTo: { address: { PostalCode: formVal.recipientPostalCode, CountryCode: formVal.recipientCountryCode } },
      package: {
        packageWeight: { Weight: formVal.packageWeight, UnitOfMeasurement: { Code: formVal.packageWeightUnits } },
        packagingType: { Code: '02' } // 02 for Your Packaging
      }
      // service field can be omitted to get all applicable rates, or specified
    };

    this.upsService.getShippingRates(rateRequest as any).subscribe( // Cast as any due to simplified interface
      (response) => {
        this.rates = response;
        if (this.rates.length === 0) {
          this.errorMessages.push('No rates returned from UPS (mock).');
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
    if (this.labelForm.invalid || this.rateForm.invalid) { // Also check rate form for address info
      this.errorMessages = ['Label or address/weight form is invalid.'];
      return;
    }
    this.isLoadingLabel = true;
    this.labelInfo = null;
    this.labelPreviewUrl = null;
    this.errorMessages = [];

    const rateVal = this.rateForm.value;
    const labelVal = this.labelForm.value;

    const labelRequest = { // This is a simplified structure for UPSLabelRequest
      shipmentRequest: {
        shipment: {
          shipper: { Name: 'Mock Sender', ShipperNumber: 'YOUR_SHIPPER_NUMBER', Address: { AddressLine: '123 Sender Ln', City: 'Beverly Hills', StateProvinceCode: 'CA', PostalCode: rateVal.shipperPostalCode, CountryCode: rateVal.shipperCountryCode }, Phone: {Number: '1234567890'} },
          shipTo: { Name: 'Mock Recipient', Address: { AddressLine: '456 Recipient Rd', City: 'New York', StateProvinceCode: 'NY', PostalCode: rateVal.recipientPostalCode, CountryCode: rateVal.recipientCountryCode }, Phone: {Number: '0987654321'} },
          service: { Code: labelVal.serviceCode },
          package: {
            packagingType: { Code: '02' }, // Your Packaging
            packageWeight: { Weight: rateVal.packageWeight, UnitOfMeasurement: { Code: rateVal.packageWeightUnits } }
          },
          paymentInformation: { shipmentCharge: { type: '01', billShipper: { accountNumber: 'YOUR_SHIPPER_NUMBER' } } }, // Bill Shipper
          labelSpecification: {
            LabelImageFormat: { Code: 'PNG' }, // Request PNG for preview
            LabelStockSize: { Height: '6', Width: '4' }
          }
        }
      }
    };

    this.upsService.createShippingLabel(labelRequest as any).subscribe( // Cast as any
      (response) => {
        this.labelInfo = response;
        if (response?.shipmentResponse?.shipmentResults?.packageResults?.shippingLabel?.GraphicImage) {
          this.labelPreviewUrl = 'data:image/png;base64,' + response.shipmentResponse.shipmentResults.packageResults.shippingLabel.GraphicImage;
        } else if (!response) {
          this.errorMessages.push('No label data returned from UPS (mock).');
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
    const formVal = this.trackingForm.value;

    this.upsService.trackShipment(formVal.trackingNumber).subscribe(
      (response) => {
        this.trackingInfo = response;
        if (!response || !response.shipment || !response.shipment.length || !response.shipment[0].package || !response.shipment[0].package.length) {
            this.errorMessages.push('No tracking data returned or in unexpected format from UPS (mock).');
        }
        this.isLoadingTracking = false;
      },
      (err) => {
        this.errorMessages.push(`Error tracking package: ${err.message || err}`);
        this.isLoadingTracking = false;
      }
    );
  }

  // Helper to display tracking activity
  getLatestActivity(pkg: any): string {
    if (pkg && pkg.activity && pkg.activity.length > 0) {
      const latest = pkg.activity[0]; // UPS usually returns most recent first
      return `${latest.status.Description} on ${latest.date} at ${latest.time} in ${latest.location?.address?.City || 'N/A'}`;
    }
    return 'No activity found.';
  }

  getDeliveryDate(pkg: any): string {
    if(pkg && pkg.deliveryDate && pkg.deliveryDate.length > 0 && pkg.deliveryDate[0].type === 'DEL') {
      return pkg.deliveryDate[0].date;
    }
    return 'Not yet delivered.';
  }
}
