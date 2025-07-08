import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ShippoConnectorComponent } from './shippo-connector.component';
import { ShippoService } from '../../services/shippo.service';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio'; // For rate selection
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock ShippoService
class MockShippoService {
  createShipmentAndGetRates = jasmine.createSpy('createShipmentAndGetRates').and.returnValue(of([]));
  createShippingLabel = jasmine.createSpy('createShippingLabel').and.returnValue(of(null));
  trackShipment = jasmine.createSpy('trackShipment').and.returnValue(of(null));
}

describe('ShippoConnectorComponent', () => {
  let component: ShippoConnectorComponent;
  let fixture: ComponentFixture<ShippoConnectorComponent>;
  let shippoService: MockShippoService;

  const mockRates = [{ object_id: 'rate1', amount: '10', currency: 'USD', provider: 'USPS', servicelevel: { token: 'usps_priority', name: 'Priority' } }];
  const mockTransaction = { object_id: 'txn1', status: 'SUCCESS', tracking_number: 'track123', label_url: 'label.pdf', tracking_url_provider: 'track.com' };
  const mockTrackInfo = { carrier: 'usps', tracking_number: 'track123', tracking_status: { status: 'DELIVERED', status_details: 'Delivered', status_date: new Date().toISOString() } };


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShippoConnectorComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatProgressBarModule, MatIconModule, MatListModule, MatRadioModule
      ],
      providers: [
        { provide: ShippoService, useClass: MockShippoService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShippoConnectorComponent);
    component = fixture.componentInstance;
    shippoService = TestBed.inject(ShippoService) as unknown as MockShippoService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getShipmentRates', () => {
    it('should not call service if forms are invalid', () => {
      component.addressFromForm.controls['name'].setValue(''); // Invalid
      component.getShipmentRates();
      expect(shippoService.createShipmentAndGetRates).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Please fill all required address and parcel fields.');
    });

    it('should call service and populate rates if forms are valid', fakeAsync(() => {
      shippoService.createShipmentAndGetRates.and.returnValue(of(mockRates as any[]));
      // Forms are valid by default in this setup
      component.getShipmentRates();
      tick();

      expect(shippoService.createShipmentAndGetRates).toHaveBeenCalled();
      expect(component.rates.length).toBe(1);
      expect(component.rates[0].provider).toBe('USPS');
      expect(component.isLoadingRates).toBeFalse();
    }));

    it('should handle empty rates response', fakeAsync(() => {
      shippoService.createShipmentAndGetRates.and.returnValue(of([]));
      component.getShipmentRates();
      tick();
      expect(component.rates.length).toBe(0);
      expect(component.errorMessages).toContain('No rates returned from Shippo (mock).');
    }));


    it('should handle error from service', fakeAsync(() => {
      shippoService.createShipmentAndGetRates.and.returnValue(throwError(() => new Error('Shippo API Error')));
      component.getShipmentRates();
      tick();
      expect(component.errorMessages).toContain('Error fetching rates: Shippo API Error');
      expect(component.isLoadingRates).toBeFalse();
    }));
  });

  describe('selectRate', () => {
    it('should set selectedRateId and clear transactionInfo', () => {
      component.transactionInfo = mockTransaction as any; // Pre-set some info
      component.selectRate('new_rate_id');
      expect(component.selectedRateId).toBe('new_rate_id');
      expect(component.transactionInfo).toBeNull();
    });
  });

  describe('createLabel', () => {
    it('should not call service if no rate is selected', () => {
      component.selectedRateId = null;
      component.createLabel();
      expect(shippoService.createShippingLabel).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Please select a shipping rate first.');
    });

    it('should call service and set transactionInfo if rate is selected', fakeAsync(() => {
      shippoService.createShippingLabel.and.returnValue(of(mockTransaction as any));
      component.selectedRateId = 'rate1';
      component.createLabel();
      tick();

      expect(shippoService.createShippingLabel).toHaveBeenCalledWith({ rate: 'rate1', label_file_type: 'PNG' });
      expect(component.transactionInfo).toEqual(mockTransaction as any);
      expect(component.isLoadingLabel).toBeFalse();
    }));

    it('should handle non-SUCCESS status from createShippingLabel', fakeAsync(() => {
      const errorTransaction = { ...mockTransaction, status: 'ERROR' };
      shippoService.createShippingLabel.and.returnValue(of(errorTransaction as any));
      component.selectedRateId = 'rate1';
      component.createLabel();
      tick();
      expect(component.errorMessages).toContain('Label creation failed or status is not SUCCESS (mock). Status: ERROR');
      expect(component.isLoadingLabel).toBeFalse();
    }));

    it('should handle error from service', fakeAsync(() => {
      shippoService.createShippingLabel.and.returnValue(throwError(() => new Error('Shippo Label Error')));
      component.selectedRateId = 'rate1';
      component.createLabel();
      tick();
      expect(component.errorMessages).toContain('Error creating label: Shippo Label Error');
      expect(component.isLoadingLabel).toBeFalse();
    }));
  });

  describe('trackPackage', () => {
    it('should not call service if trackingForm is invalid', () => {
      component.trackingForm.controls['trackingNumber'].setValue(''); // Invalid
      component.trackPackage();
      expect(shippoService.trackShipment).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Please select a carrier and enter a tracking number.');
    });

    it('should call service and set trackingInfo', fakeAsync(() => {
      shippoService.trackShipment.and.returnValue(of(mockTrackInfo as any));
      component.trackingForm.patchValue({ carrierToken: 'usps', trackingNumber: 'track123' });
      component.trackPackage();
      tick();

      expect(shippoService.trackShipment).toHaveBeenCalledWith({ carrier: 'usps', tracking_number: 'track123' });
      expect(component.trackingInfo).toEqual(mockTrackInfo as any);
      expect(component.isLoadingTracking).toBeFalse();
    }));

     it('should handle null response from trackShipment', fakeAsync(() => {
      shippoService.trackShipment.and.returnValue(of(null));
      component.trackingForm.patchValue({ carrierToken: 'usps', trackingNumber: 'track123' });
      component.trackPackage();
      tick();
      expect(component.trackingInfo).toBeNull();
      expect(component.errorMessages).toContain('No tracking data returned from Shippo (mock).');
    }));

    it('should handle error from service', fakeAsync(() => {
      shippoService.trackShipment.and.returnValue(throwError(() => new Error('Shippo Track Error')));
      component.trackingForm.patchValue({ carrierToken: 'usps', trackingNumber: 'track123' });
      component.trackPackage();
      tick();
      expect(component.errorMessages).toContain('Error tracking package: Shippo Track Error');
      expect(component.isLoadingTracking).toBeFalse();
    }));
  });

  describe('getTrackingStatus', () => {
    it('should format tracking status correctly', () => {
      const statusString = component.getTrackingStatus(mockTrackInfo as any);
      expect(statusString).toContain('Delivered');
      expect(statusString).toContain(new Date(mockTrackInfo.tracking_status.status_date).toLocaleString());
    });

    it('should return N/A if no track info or status', () => {
      expect(component.getTrackingStatus(null)).toBe('N/A');
      expect(component.getTrackingStatus({ tracking_status: undefined } as any)).toBe('N/A');
    });
  });
});
