import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShippoService } from '../../services/shippo.service'; // Assuming service in modules/services

// Re-declare or import interfaces (ensure they match service or are more specific to component needs)
interface ShippoAddress { name: string; street1: string; city: string; state: string; zip: string; country: string; phone?: string; email?: string; }
interface ShippoParcel { length: string; width: string; height: string; distance_unit: 'cm' | 'in'; weight: string; mass_unit: 'g' | 'oz' | 'lb' | 'kg'; }
interface ShippoShipmentRequest { address_from: ShippoAddress; address_to: ShippoAddress; parcels: ShippoParcel[]; }
interface ShippoRate { object_id: string; amount: string; currency: string; provider: string; servicelevel: { token: string; name: string }; estimated_days?: number; provider_image_75?: string; }
interface ShippoTransaction { object_id: string; status: string; tracking_number: string; tracking_url_provider: string; label_url: string; messages?: any[]; }
interface ShippoTrack { carrier: string; tracking_number: string; tracking_status?: { status: string; status_details: string; status_date: string; location?: any; }; eta?: string; tracking_history?: any[]; }


@Component({
  selector: 'app-shippo-connector',
  templateUrl: './shippo-connector.component.html',
  styleUrls: ['./shippo-connector.component.scss']
})
export class ShippoConnectorComponent implements OnInit {
  isLoadingRates = false;
  isLoadingLabel = false;
  isLoadingTracking = false;

  // Forms
  addressFromForm: FormGroup;
  addressToForm: FormGroup;
  parcelForm: FormGroup;
  trackingForm: FormGroup;

  rates: ShippoRate[] = [];
  selectedRateId: string | null = null;
  transactionInfo: ShippoTransaction | null = null;
  trackingInfo: ShippoTrack | null = null;

  errorMessages: string[] = [];

  // Shippo carrier tokens for tracking form (examples)
  shippoCarriers = [
    { token: 'fedex', name: 'FedEx' },
    { token: 'ups', name: 'UPS' },
    { token: 'usps', name: 'USPS' },
    { token: 'dhl_express', name: 'DHL Express' },
    // Add more as supported by your Shippo account
  ];

  constructor(private fb: FormBuilder, private shippoService: ShippoService) {
    this.addressFromForm = this.fb.group({
      name: ['Sender Co.', Validators.required],
      street1: ['1 Infinite Loop', Validators.required],
      city: ['Cupertino', Validators.required],
      state: ['CA', Validators.required],
      zip: ['95014', Validators.required],
      country: ['US', Validators.required],
      phone: ['5551234567']
    });
    this.addressToForm = this.fb.group({
      name: ['Receiver Inc.', Validators.required],
      street1: ['1600 Amphitheatre Parkway', Validators.required],
      city: ['Mountain View', Validators.required],
      state: ['CA', Validators.required],
      zip: ['94043', Validators.required],
      country: ['US', Validators.required],
      phone: ['5559876543']
    });
    this.parcelForm = this.fb.group({
      length: ['10', Validators.required],
      width: ['8', Validators.required],
      height: ['6', Validators.required],
      distance_unit: ['in', Validators.required],
      weight: ['5', Validators.required],
      mass_unit: ['lb', Validators.required]
    });
    this.trackingForm = this.fb.group({
      carrierToken: ['fedex', Validators.required], // Default to FedEx for example
      trackingNumber: ['', Validators.required]
    });
  }

  ngOnInit(): void { }

  getShipmentRates(): void {
    if (this.addressFromForm.invalid || this.addressToForm.invalid || this.parcelForm.invalid) {
      this.errorMessages = ['Please fill all required address and parcel fields.'];
      return;
    }
    this.isLoadingRates = true;
    this.rates = [];
    this.selectedRateId = null;
    this.transactionInfo = null;
    this.errorMessages = [];

    const shipmentRequest: ShippoShipmentRequest = {
      address_from: this.addressFromForm.value,
      address_to: this.addressToForm.value,
      parcels: [this.parcelForm.value]
    };

    this.shippoService.createShipmentAndGetRates(shipmentRequest).subscribe(
      (responseRates) => {
        this.rates = responseRates;
        if (this.rates.length === 0) {
          this.errorMessages.push('No rates returned from Shippo (mock).');
        }
        this.isLoadingRates = false;
      },
      (err) => {
        this.errorMessages.push(`Error fetching rates: ${err.message || err}`);
        this.isLoadingRates = false;
      }
    );
  }

  selectRate(rateId: string): void {
    this.selectedRateId = rateId;
    this.transactionInfo = null; // Clear previous transaction if a new rate is selected
  }

  createLabel(): void {
    if (!this.selectedRateId) {
      this.errorMessages = ['Please select a shipping rate first.'];
      return;
    }
    this.isLoadingLabel = true;
    this.transactionInfo = null;
    this.errorMessages = [];

    this.shippoService.createShippingLabel({ rate: this.selectedRateId, label_file_type: 'PNG' }).subscribe(
      (response) => {
        this.transactionInfo = response;
        if (!response || response.status !== 'SUCCESS') {
            this.errorMessages.push(`Label creation failed or status is not SUCCESS (mock). Status: ${response?.status}`);
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
      this.errorMessages = ['Please select a carrier and enter a tracking number.'];
      return;
    }
    this.isLoadingTracking = true;
    this.trackingInfo = null;
    this.errorMessages = [];
    const formValue = this.trackingForm.value;

    this.shippoService.trackShipment({ carrier: formValue.carrierToken, tracking_number: formValue.trackingNumber }).subscribe(
      (response) => {
        this.trackingInfo = response;
        if (!response) {
            this.errorMessages.push('No tracking data returned from Shippo (mock).');
        }
        this.isLoadingTracking = false;
      },
      (err) => {
        this.errorMessages.push(`Error tracking package: ${err.message || err}`);
        this.isLoadingTracking = false;
      }
    );
  }

  getTrackingStatus(track: ShippoTrack | null): string {
    if (!track || !track.tracking_status) return 'N/A';
    return `${track.tracking_status.status_details} (${track.tracking_status.status_date ? new Date(track.tracking_status.status_date).toLocaleString() : 'No date'})`;
  }
}
