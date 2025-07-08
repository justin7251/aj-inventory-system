import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { FedexConnectorComponent } from './fedex-connector.component';
import { FedExService } from '../../services/fedex.service';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list'; // For displaying rates
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock FedExService
class MockFedExService {
  getShippingRates = jasmine.createSpy('getShippingRates').and.returnValue(of([]));
  createShippingLabel = jasmine.createSpy('createShippingLabel').and.returnValue(of(null));
  trackShipment = jasmine.createSpy('trackShipment').and.returnValue(of(null));
}

describe('FedexConnectorComponent', () => {
  let component: FedexConnectorComponent;
  let fixture: ComponentFixture<FedexConnectorComponent>;
  let fedexService: MockFedExService;

  const mockRatesResponse = [{ serviceName: 'FedEx Ground', totalNetCharge: 15.50, currency: 'USD' }];
  const mockLabelResponse = { trackingNumber: 'FX12345', labelImageBase64: 'base64string==' };
  const mockTrackingResponse = { trackingNumber: 'FX12345', status: 'IN_TRANSIT', latestEvent: { timestamp: '', eventDescription: 'Departed', address: {} } };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FedexConnectorComponent],
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
        { provide: FedExService, useClass: MockFedExService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FedexConnectorComponent);
    component = fixture.componentInstance;
    fedexService = TestBed.inject(FedExService) as unknown as MockFedExService;
    fixture.detectChanges(); // Initial binding
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getRates', () => {
    it('should not call service if rateForm is invalid', () => {
      component.rateForm.controls['shipperPostalCode'].setValue(''); // Make form invalid
      component.getRates();
      expect(fedexService.getShippingRates).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Rate form is invalid. Please check the fields.');
    });

    it('should call fedexService.getShippingRates and populate rates if form is valid', fakeAsync(() => {
      fedexService.getShippingRates.and.returnValue(of(mockRatesResponse));
      // Form is valid by default in this setup
      component.getRates();
      tick();

      expect(fedexService.getShippingRates).toHaveBeenCalled();
      expect(component.rates.length).toBe(1);
      expect(component.rates[0].serviceName).toBe('FedEx Ground');
      expect(component.isLoadingRates).toBeFalse();
    }));

    it('should handle empty rates response', fakeAsync(() => {
      fedexService.getShippingRates.and.returnValue(of([]));
      component.getRates();
      tick();
      expect(component.rates.length).toBe(0);
      expect(component.errorMessages).toContain('No rates returned from FedEx (mock).');
      expect(component.isLoadingRates).toBeFalse();
    }));

    it('should handle error from getShippingRates', fakeAsync(() => {
      fedexService.getShippingRates.and.returnValue(throwError(() => new Error('Rate API Down')));
      component.getRates();
      tick();
      expect(component.errorMessages).toContain('Error fetching rates: Rate API Down');
      expect(component.isLoadingRates).toBeFalse();
    }));
  });

  describe('createLabel', () => {
    it('should not call service if labelForm or rateForm is invalid', () => {
      component.labelForm.controls['serviceType'].setValue(''); // Make labelForm invalid
      component.createLabel();
      expect(fedexService.createShippingLabel).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Label form is invalid.');

      component.labelForm.controls['serviceType'].setValue('FEDEX_GROUND'); // Valid
      component.rateForm.controls['shipperPostalCode'].setValue(''); // Make rateForm invalid
      component.createLabel();
      expect(fedexService.createShippingLabel).not.toHaveBeenCalledTimes(2); // Not called again
    });

    it('should call fedexService.createShippingLabel and set labelInfo/labelPreviewUrl', fakeAsync(() => {
      fedexService.createShippingLabel.and.returnValue(of(mockLabelResponse));
      component.createLabel(); // Assuming forms are valid
      tick();

      expect(fedexService.createShippingLabel).toHaveBeenCalled();
      expect(component.labelInfo).toEqual(mockLabelResponse);
      expect(component.labelPreviewUrl).toBe('data:image/png;base64,' + mockLabelResponse.labelImageBase64);
      expect(component.isLoadingLabel).toBeFalse();
    }));

     it('should handle null response from createShippingLabel', fakeAsync(() => {
      fedexService.createShippingLabel.and.returnValue(of(null));
      component.createLabel();
      tick();
      expect(component.labelInfo).toBeNull();
      expect(component.labelPreviewUrl).toBeNull();
      expect(component.errorMessages).toContain('No label data returned from FedEx (mock).');
      expect(component.isLoadingLabel).toBeFalse();
    }));


    it('should handle error from createShippingLabel', fakeAsync(() => {
      fedexService.createShippingLabel.and.returnValue(throwError(() => new Error('Label API Down')));
      component.createLabel();
      tick();
      expect(component.errorMessages).toContain('Error creating label: Label API Down');
      expect(component.isLoadingLabel).toBeFalse();
    }));
  });

  describe('trackPackage', () => {
    it('should not call service if trackingForm is invalid', () => {
      component.trackingForm.controls['trackingNumber'].setValue('');
      component.trackPackage();
      expect(fedexService.trackShipment).not.toHaveBeenCalled();
      expect(component.errorMessages).toContain('Tracking form is invalid.');
    });

    it('should call fedexService.trackShipment and set trackingInfo', fakeAsync(() => {
      fedexService.trackShipment.and.returnValue(of(mockTrackingResponse));
      component.trackingForm.controls['trackingNumber'].setValue('12345');
      component.trackPackage();
      tick();

      expect(fedexService.trackShipment).toHaveBeenCalledWith({ trackingNumber: '12345' });
      expect(component.trackingInfo).toEqual(mockTrackingResponse);
      expect(component.isLoadingTracking).toBeFalse();
    }));

    it('should handle null response from trackShipment', fakeAsync(() => {
      fedexService.trackShipment.and.returnValue(of(null));
      component.trackingForm.controls['trackingNumber'].setValue('12345');
      component.trackPackage();
      tick();
      expect(component.trackingInfo).toBeNull();
      expect(component.errorMessages).toContain('No tracking data returned from FedEx (mock).');
      expect(component.isLoadingTracking).toBeFalse();
    }));

    it('should handle error from trackShipment', fakeAsync(() => {
      fedexService.trackShipment.and.returnValue(throwError(() => new Error('Track API Down')));
       component.trackingForm.controls['trackingNumber'].setValue('12345');
      component.trackPackage();
      tick();
      expect(component.errorMessages).toContain('Error tracking package: Track API Down');
      expect(component.isLoadingTracking).toBeFalse();
    }));
  });
});
