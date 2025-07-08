import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FedExService } from './fedex.service';
import { environment } from '../../../environments/environment';

// Define simplified interfaces for testing as used in the service
interface FedExRateRequest {
  shipperAddress: any;
  recipientAddress: any;
  packages: Array<{ weight: { value: number, units: 'LB' | 'KG' } }>;
}

interface FedExLabelRequest {
  shipper: any; recipient: any; serviceType: string; packagingType: string;
  packages: Array<{ weight: { value: number, units: 'LB' | 'KG' } }>;
  labelSpecification: { imageType: 'PNG' | 'PDF' | 'ZPLII', labelStockType: string };
}

interface FedExTrackingRequest {
  trackingNumber: string;
}


describe('FedExService', () => {
  let service: FedExService;
  let httpMock: HttpTestingController;

  const mockRateRequest: FedExRateRequest = {
    shipperAddress: { postalCode: '90210', countryCode: 'US' },
    recipientAddress: { postalCode: '10001', countryCode: 'US' },
    packages: [{ weight: { value: 5, units: 'LB' } }]
  };

  const mockLabelRequest: FedExLabelRequest = {
    shipper: { name: 'Test Shipper' }, recipient: { name: 'Test Recipient' },
    serviceType: 'FEDEX_GROUND', packagingType: 'YOUR_PACKAGING',
    packages: [{ weight: { value: 5, units: 'LB' } }],
    labelSpecification: { imageType: 'PNG', labelStockType: 'PAPER_4X6' }
  };

  const mockTrackingRequest: FedExTrackingRequest = { trackingNumber: '123456789012' };


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FedExService]
    });
    service = TestBed.inject(FedExService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.fedexApiConfig = { // Ensure this is defined for tests
      endpoint: 'https://mock-fedex-api.com'
      // mockRateDataUrl: undefined // if you had specific mock files
    };
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getShippingRates', () => {
    it('should return hardcoded mock rates if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedRates = (service as any).getHardcodedMockRates(mockRateRequest);
      service.getShippingRates(mockRateRequest).subscribe(rates => {
        expect(rates.length).toBe(hardcodedRates.length);
        expect(console.warn).toHaveBeenCalledWith('FedExService: Actual API call for getShippingRates not implemented. Returning mock data.');
        if (hardcodedRates.length > 0) {
            expect(rates[0].serviceName).toEqual(hardcodedRates[0].serviceName);
        }
        done();
      });
      // No HTTP call expected for this path in mock implementation
    });

    it('should return hardcoded mock rates if API endpoint is NOT set (mock)', (done) => {
        environment.fedexApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedRates = (service as any).getHardcodedMockRates(mockRateRequest);
        service.getShippingRates(mockRateRequest).subscribe(rates => {
          expect(rates.length).toBe(hardcodedRates.length);
          expect(console.log).toHaveBeenCalledWith('FedExService: Simulating getShippingRates (mock). Request:', mockRateRequest);
           if (hardcodedRates.length > 0) {
            expect(rates[0].serviceName).toEqual(hardcodedRates[0].serviceName);
        }
          done();
        });
        // No HTTP call expected
      });
  });

  describe('createShippingLabel', () => {
    it('should return a hardcoded mock label if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedLabel = (service as any).getHardcodedMockLabel(mockLabelRequest);
      service.createShippingLabel(mockLabelRequest).subscribe(labelResponse => {
        expect(labelResponse?.trackingNumber).toEqual(hardcodedLabel.trackingNumber);
        expect(console.warn).toHaveBeenCalledWith('FedExService: Actual API call for createShippingLabel not implemented. Returning mock data.');
        done();
      });
    });
    it('should return a hardcoded mock label if API endpoint is NOT set (mock)', (done) => {
        environment.fedexApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedLabel = (service as any).getHardcodedMockLabel(mockLabelRequest);
        service.createShippingLabel(mockLabelRequest).subscribe(labelResponse => {
          expect(labelResponse?.trackingNumber).toEqual(hardcodedLabel.trackingNumber);
          expect(console.log).toHaveBeenCalledWith('FedExService: Simulating createShippingLabel (mock). Request:', mockLabelRequest);
          done();
        });
      });
  });

  describe('trackShipment', () => {
    it('should return hardcoded mock tracking info if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedTracking = (service as any).getHardcodedMockTrackingInfo(mockTrackingRequest.trackingNumber);
      service.trackShipment(mockTrackingRequest).subscribe(trackingResponse => {
        expect(trackingResponse?.trackingNumber).toEqual(hardcodedTracking.trackingNumber);
        expect(console.warn).toHaveBeenCalledWith('FedExService: Actual API call for trackShipment not implemented. Returning mock data.');
        done();
      });
    });

     it('should return hardcoded mock tracking info if API endpoint is NOT set (mock)', (done) => {
        environment.fedexApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedTracking = (service as any).getHardcodedMockTrackingInfo(mockTrackingRequest.trackingNumber);
        service.trackShipment(mockTrackingRequest).subscribe(trackingResponse => {
          expect(trackingResponse?.trackingNumber).toEqual(hardcodedTracking.trackingNumber);
          expect(console.log).toHaveBeenCalledWith('FedExService: Simulating trackShipment (mock). Request:', mockTrackingRequest);
          done();
        });
      });
  });
});
