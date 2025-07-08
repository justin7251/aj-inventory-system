import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ShippoService } from './shippo.service';
import { environment } from '../../../environments/environment';

// Simplified interfaces for testing
interface ShippoAddress { name: string; street1: string; city: string; state: string; zip: string; country: string; }
interface ShippoParcel { length: string; width: string; height: string; distance_unit: 'cm' | 'in'; weight: string; mass_unit: 'g' | 'oz' | 'lb' | 'kg'; }
interface ShippoShipmentRequest { address_from: ShippoAddress; address_to: ShippoAddress; parcels: ShippoParcel[]; }
interface ShippoTransactionRequest { rate: string; label_file_type?: 'PDF' | 'PNG' | 'PDF_4x6' | 'ZPLII'; }
interface ShippoTrackRequest { carrier: string; tracking_number: string; }

describe('ShippoService', () => {
  let service: ShippoService;
  let httpMock: HttpTestingController;

  const mockAddressFrom: ShippoAddress = { name: 'From', street1: '1 St', city: 'CityA', state: 'CA', zip: '10000', country: 'US' };
  const mockAddressTo: ShippoAddress = { name: 'To', street1: '2 St', city: 'CityB', state: 'NY', zip: '20000', country: 'US' };
  const mockParcel: ShippoParcel = { length: '10', width: '10', height: '10', distance_unit: 'in', weight: '1', mass_unit: 'lb' };
  const mockShipmentRequest: ShippoShipmentRequest = { address_from: mockAddressFrom, address_to: mockAddressTo, parcels: [mockParcel] };
  const mockTransactionRequest: ShippoTransactionRequest = { rate: 'rate_mock_id_123', label_file_type: 'PNG' };
  const mockTrackRequest: ShippoTrackRequest = { carrier: 'fedex', tracking_number: 'track123' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ShippoService]
    });
    service = TestBed.inject(ShippoService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.shippoApiConfig = { // Ensure this is defined
      endpoint: 'https://api.goshippo.com/mock/' // Mock endpoint
    };
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createShipmentAndGetRates', () => {
    it('should return hardcoded mock rates if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedRates = (service as any).getHardcodedMockRates(mockShipmentRequest);
      service.createShipmentAndGetRates(mockShipmentRequest).subscribe(rates => {
        expect(rates.length).toEqual(hardcodedRates.length);
        expect(console.warn).toHaveBeenCalledWith('ShippoService: Actual API call for createShipmentAndGetRates not implemented. Returning mock data.');
        if(hardcodedRates.length > 0) expect(rates[0].provider).toEqual(hardcodedRates[0].provider);
        done();
      });
    });
     it('should return hardcoded mock rates if API endpoint is NOT set (mock)', (done) => {
        environment.shippoApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedRates = (service as any).getHardcodedMockRates(mockShipmentRequest);
        service.createShipmentAndGetRates(mockShipmentRequest).subscribe(rates => {
          expect(rates.length).toEqual(hardcodedRates.length);
          expect(console.log).toHaveBeenCalledWith('ShippoService: Simulating createShipmentAndGetRates (mock). Request:', mockShipmentRequest);
          if(hardcodedRates.length > 0) expect(rates[0].provider).toEqual(hardcodedRates[0].provider);
          done();
        });
      });
  });

  describe('createShippingLabel', () => {
    it('should return a hardcoded mock transaction if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedTransaction = (service as any).getHardcodedMockTransaction(mockTransactionRequest);
      service.createShippingLabel(mockTransactionRequest).subscribe(transaction => {
        expect(transaction?.tracking_number).toEqual(hardcodedTransaction.tracking_number);
        expect(console.warn).toHaveBeenCalledWith('ShippoService: Actual API call for createShippingLabel (transaction) not implemented. Returning mock data.');
        done();
      });
    });
    it('should return a hardcoded mock transaction if API endpoint is NOT set (mock)', (done) => {
        environment.shippoApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedTransaction = (service as any).getHardcodedMockTransaction(mockTransactionRequest);
        service.createShippingLabel(mockTransactionRequest).subscribe(transaction => {
          expect(transaction?.tracking_number).toEqual(hardcodedTransaction.tracking_number);
          expect(console.log).toHaveBeenCalledWith('ShippoService: Simulating createShippingLabel (mock). Request:', mockTransactionRequest);
          done();
        });
      });
  });

  describe('trackShipment', () => {
    it('should return hardcoded mock tracking info if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const hardcodedTrack = (service as any).getHardcodedMockTrackingInfo(mockTrackRequest);
      service.trackShipment(mockTrackRequest).subscribe(trackInfo => {
        expect(trackInfo?.tracking_number).toEqual(hardcodedTrack.tracking_number);
        expect(console.warn).toHaveBeenCalledWith('ShippoService: Actual API call for trackShipment not implemented. Returning mock data.');
        done();
      });
    });
    it('should return hardcoded mock tracking info if API endpoint is NOT set (mock)', (done) => {
        environment.shippoApiConfig.endpoint = undefined;
        spyOn(console, 'log');
        const hardcodedTrack = (service as any).getHardcodedMockTrackingInfo(mockTrackRequest);
        service.trackShipment(mockTrackRequest).subscribe(trackInfo => {
          expect(trackInfo?.tracking_number).toEqual(hardcodedTrack.tracking_number);
          expect(console.log).toHaveBeenCalledWith('ShippoService: Simulating trackShipment (mock). Request:', mockTrackRequest);
          done();
        });
      });
  });
});
