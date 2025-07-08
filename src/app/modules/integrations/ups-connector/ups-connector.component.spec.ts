import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { UpsConnectorComponent } from './ups-connector.component';
import { UPSService } from '../../services/ups.service';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock UPSService
class MockUPSService {
  getShippingRates = jasmine.createSpy('getShippingRates').and.returnValue(of([]));
  createShippingLabel = jasmine.createSpy('createShippingLabel').and.returnValue(of(null));
  trackShipment = jasmine.createSpy('trackShipment').and.returnValue(of(null));
}

describe('UpsConnectorComponent', () => {
  let component: UpsConnectorComponent;
  let fixture: ComponentFixture<UpsConnectorComponent>;
  let upsService: MockUPSService;

  const mockRatesResponse = [{ service: { Code: '03', Description: 'UPS Ground' }, totalCharges: { MonetaryValue: '12.75', CurrencyCode: 'USD' } }];
  const mockLabelApiResponse = { shipmentResponse: { shipmentResults: { trackingNumber: '1ZTRACKING', packageResults: { shippingLabel: { ImageFormat: { Code: 'PNG' }, GraphicImage: 'base64==' } } } } };
  const mockTrackingApiResponse = { shipment: [{ package: [{ trackingNumber: '1ZTRACKING', activity: [{ status: {Type: 'D', Description: 'Delivered'}, date: '20230101', time:'120000'}] }] }] };


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpsConnectorComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatProgressBarModule,
        MatIconModule,
        MatListModule
      ],
      providers: [
        { provide: UPSService, useClass: MockUPSService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpsConnectorComponent);
    component = fixture.componentInstance;
    upsService = TestBed.inject(UPSService) as unknown as MockUPSService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getRates', () => {
    it('should not call service if rateForm is invalid', () => {
      component.rateForm.controls['shipperPostalCode'].setValue('');
      component.getRates();
      expect(upsService.getShippingRates).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Rate form is invalid.');
    });

    it('should call upsService.getShippingRates and populate rates if form is valid', fakeAsync(() => {
      upsService.getShippingRates.and.returnValue(of(mockRatesResponse));
      component.getRates(); // Form is valid by default
      tick();

      expect(upsService.getShippingRates).toHaveBeenCalled();
      expect(component.rates.length).toBe(1);
      expect(component.rates[0].service.Code).toBe('03');
      expect(component.isLoadingRates).toBeFalse();
    }));

     it('should handle empty rates response', fakeAsync(() => {
      upsService.getShippingRates.and.returnValue(of([]));
      component.getRates();
      tick();
      expect(component.rates.length).toBe(0);
      expect(component.errorMessages).toContain('No rates returned from UPS (mock).');
      expect(component.isLoadingRates).toBeFalse();
    }));

    it('should handle error from getShippingRates', fakeAsync(() => {
      upsService.getShippingRates.and.returnValue(throwError(() => new Error('UPS Rate API Error')));
      component.getRates();
      tick();
      expect(component.errorMessages).toContain('Error fetching rates: UPS Rate API Error');
      expect(component.isLoadingRates).toBeFalse();
    }));
  });

  describe('createLabel', () => {
    it('should not call service if labelForm or rateForm is invalid', () => {
      component.labelForm.controls['serviceCode'].setValue(''); // Invalid
      component.createLabel();
      expect(upsService.createShippingLabel).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Label or address/weight form is invalid.');

      component.labelForm.controls['serviceCode'].setValue('03'); // Valid
      component.rateForm.controls['shipperPostalCode'].setValue(''); // rateForm invalid
      component.createLabel();
      expect(upsService.createShippingLabel).not.toHaveBeenCalled(); // Still not called
    });

    it('should call upsService.createShippingLabel and set labelInfo/labelPreviewUrl', fakeAsync(() => {
      upsService.createShippingLabel.and.returnValue(of(mockLabelApiResponse as any));
      // Ensure forms are valid
      component.rateForm.patchValue({ shipperPostalCode: '90210', shipperCountryCode: 'US', recipientPostalCode: '10001', recipientCountryCode: 'US', packageWeight: '5', packageWeightUnits: 'LBS' });
      component.labelForm.patchValue({ serviceCode: '03' });
      component.createLabel();
      tick();

      expect(upsService.createShippingLabel).toHaveBeenCalled();
      expect(component.labelInfo).toEqual(mockLabelApiResponse as any);
      expect(component.labelPreviewUrl).toBe('data:image/png;base64,' + mockLabelApiResponse.shipmentResponse.shipmentResults.packageResults.shippingLabel.GraphicImage);
      expect(component.isLoadingLabel).toBeFalse();
    }));

    it('should handle null response from createShippingLabel', fakeAsync(() => {
      upsService.createShippingLabel.and.returnValue(of(null));
      component.createLabel(); // Assuming forms are valid
      tick();
      expect(component.labelInfo).toBeNull();
      expect(component.labelPreviewUrl).toBeNull();
      expect(component.errorMessages).toContain('No label data returned from UPS (mock).');
      expect(component.isLoadingLabel).toBeFalse();
    }));


    it('should handle error from createShippingLabel', fakeAsync(() => {
      upsService.createShippingLabel.and.returnValue(throwError(() => new Error('UPS Label API Error')));
      component.createLabel(); // Assuming forms are valid
      tick();
      expect(component.errorMessages).toContain('Error creating label: UPS Label API Error');
      expect(component.isLoadingLabel).toBeFalse();
    }));
  });

  describe('trackPackage', () => {
    it('should not call service if trackingForm is invalid', () => {
      component.trackingForm.controls['trackingNumber'].setValue('');
      component.trackPackage();
      expect(upsService.trackShipment).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Tracking form is invalid.');
    });

    it('should call upsService.trackShipment and set trackingInfo', fakeAsync(() => {
      upsService.trackShipment.and.returnValue(of(mockTrackingApiResponse as any));
      component.trackingForm.controls['trackingNumber'].setValue('1ZTRACKING');
      component.trackPackage();
      tick();

      expect(upsService.trackShipment).toHaveBeenCalledWith({ trackingNumber: '1ZTRACKING' });
      expect(component.trackingInfo).toEqual(mockTrackingApiResponse as any);
      expect(component.isLoadingTracking).toBeFalse();
    }));

    it('should handle unexpected/null response from trackShipment', fakeAsync(() => {
      upsService.trackShipment.and.returnValue(of(null));
      component.trackingForm.controls['trackingNumber'].setValue('1ZTRACKING');
      component.trackPackage();
      tick();
      expect(component.trackingInfo).toBeNull();
      expect(component.errorMessages).toContain('No tracking data returned or in unexpected format from UPS (mock).');
      expect(component.isLoadingTracking).toBeFalse();
    }));

    it('should handle error from trackShipment', fakeAsync(() => {
      upsService.trackShipment.and.returnValue(throwError(() => new Error('UPS Track API Error')));
      component.trackingForm.controls['trackingNumber'].setValue('1ZTRACKING');
      component.trackPackage();
      tick();
      expect(component.errorMessages).toContain('Error tracking package: UPS Track API Error');
      expect(component.isLoadingTracking).toBeFalse();
    }));
  });

  describe('Helper methods for tracking display', () => {
    it('getLatestActivity should format correctly', () => {
      const pkg = mockTrackingApiResponse.shipment[0].package[0];
      const activityString = component.getLatestActivity(pkg);
      expect(activityString).toContain('Delivered on 20230101 at 120000');
    });
     it('getLatestActivity should return default if no activity', () => {
      const activityString = component.getLatestActivity({ activity: [] } as any); // Cast for test
      expect(activityString).toBe('No activity found.');
    });

    it('getDeliveryDate should return date if delivered', () => {
       const pkgWithDelivery = { deliveryDate: [{ type: "DEL", date: "20231025" }] };
       expect(component.getDeliveryDate(pkgWithDelivery)).toBe("20231025");
    });
     it('getDeliveryDate should return default if not delivered', () => {
       expect(component.getDeliveryDate({} as any)).toBe("Not yet delivered.");
    });
  });

});
