import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UPSService } from './ups.service';
import { environment } from '../../../environments/environment';

// Define simplified interfaces for testing as used in the service
interface UPSRateRequest {
  shipper: { address: any }; shipTo: { address: any };
  package: {
    packageWeight: { Weight: string; UnitOfMeasurement: { Code: 'LBS' | 'KGS' } };
    packagingType?: { Code: string };
  };
}

interface UPSLabelRequest {
  shipmentRequest: { shipment: {
    shipper: any; shipTo: any; service: { Code: string };
    package: any; labelSpecification: { LabelImageFormat: { Code: string } };
  }};
}

interface UPSTrackingRequest {
  trackingNumber: string;
}

describe('UPSService', () => {
  let service: UPSService;
  let httpMock: HttpTestingController;

  const mockRateRequest: UPSRateRequest = {
    shipper: { address: { PostalCode: '90210', CountryCode: 'US' } },
    shipTo: { address: { PostalCode: '10001', CountryCode: 'US' } },
    package: { packageWeight: { Weight: '5', UnitOfMeasurement: { Code: 'LBS' } }, packagingType: { Code: '02' } }
  };

  const mockLabelRequest: UPSLabelRequest = {
    shipmentRequest: { shipment: {
      shipper: { Name: 'Test Shipper' }, shipTo: { Name: 'Test Recipient' },
      service: { Code: '03' }, // UPS Ground
      package: { packageWeight: { Weight: '5', UnitOfMeasurement: { Code: 'LBS' } } },
      labelSpecification: { LabelImageFormat: { Code: 'PNG' } }
    }}
  };

  const mockTrackingRequest: UPSTrackingRequest = { trackingNumber: '1Z12345E0205271688' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UPSService]
    });
    service = TestBed.inject(UPSService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.upsApiConfig = { // Ensure this is defined for tests
      endpoint: 'https://mock-ups-api.com'
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
        expect(console.warn).toHaveBeenCalledWith('UPSService: Actual API call for getShippingRates not implemented. Returning mock data.');
        if(hardcodedRates.length > 0) expect(rates[0].service.Code).toEqual(hardcodedRates[0].service.Code);
        done();
      });
    });
     it('should return hardcoded mock rates if API endpoint is NOT set (mock)', (done) => {
        environment.upsApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedRates = (service as any).getHardcodedMockRates(mockRateRequest);
        service.getShippingRates(mockRateRequest).subscribe(rates => {
          expect(rates.length).toBe(hardcodedRates.length);
          expect(console.log).toHaveBeenCalledWith('UPSService: Simulating getShippingRates (mock). Request:', mockRateRequest);
          if(hardcodedRates.length > 0) expect(rates[0].service.Code).toEqual(hardcodedRates[0].service.Code);
          done();
        });
      });
  });

  describe('createShippingLabel', () => {
    it('should return a hardcoded mock label if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedLabel = (service as any).getHardcodedMockLabel(mockLabelRequest);
      service.createShippingLabel(mockLabelRequest).subscribe(labelResponse => {
        expect(labelResponse?.shipmentResponse.shipmentResults.trackingNumber).toEqual(hardcodedLabel.shipmentResponse.shipmentResults.trackingNumber);
        expect(console.warn).toHaveBeenCalledWith('UPSService: Actual API call for createShippingLabel not implemented. Returning mock data.');
        done();
      });
    });
     it('should return a hardcoded mock label if API endpoint is NOT set (mock)', (done) => {
        environment.upsApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedLabel = (service as any).getHardcodedMockLabel(mockLabelRequest);
        service.createShippingLabel(mockLabelRequest).subscribe(labelResponse => {
          expect(labelResponse?.shipmentResponse.shipmentResults.trackingNumber).toEqual(hardcodedLabel.shipmentResponse.shipmentResults.trackingNumber);
          expect(console.log).toHaveBeenCalledWith('UPSService: Simulating createShippingLabel (mock). Request:', mockLabelRequest);
          done();
        });
      });
  });

  describe('trackShipment', () => {
    it('should return hardcoded mock tracking info if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedTracking = (service as any).getHardcodedMockTrackingInfo(mockTrackingRequest.trackingNumber);
      service.trackShipment(mockTrackingRequest).subscribe(trackingResponse => {
        expect(trackingResponse?.shipment[0].package[0].trackingNumber).toEqual(hardcodedTracking.shipment[0].package[0].trackingNumber);
        expect(console.warn).toHaveBeenCalledWith('UPSService: Actual API call for trackShipment not implemented. Returning mock data.');
        done();
      });
    });
    it('should return hardcoded mock tracking info if API endpoint is NOT set (mock)', (done) => {
        environment.upsApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedTracking = (service as any).getHardcodedMockTrackingInfo(mockTrackingRequest.trackingNumber);
        service.trackShipment(mockTrackingRequest).subscribe(trackingResponse => {
          expect(trackingResponse?.shipment[0].package[0].trackingNumber).toEqual(hardcodedTracking.shipment[0].package[0].trackingNumber);
          expect(console.log).toHaveBeenCalledWith('UPSService: Simulating trackShipment (mock). Request:', mockTrackingRequest);
          done();
        });
      });
  });
});
