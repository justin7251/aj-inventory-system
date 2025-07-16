import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { XeroService } from './xero.service';
import { environment } from '../../../environments/environment';

describe('XeroService', () => {
  let service: XeroService;
  let httpMock: HttpTestingController;

  interface RawXeroInvoice { // Basic structure for testing
    InvoiceID?: string;
    InvoiceNumber?: string;
    Type: 'ACCREC' | 'ACCPAY';
    Contact: { Name?: string };
    Total?: number;
    Status?: string;
  }

  const mockXeroInvoicesResponse = { // Xero often wraps arrays
    Invoices: [
      { InvoiceID: "x1", InvoiceNumber: "XINV001", Type: "ACCREC", Contact: { Name: "Customer X1" }, Total: 150, Status: "AUTHORISED" },
      { InvoiceID: "x2", InvoiceNumber: "XINV002", Type: "ACCREC", Contact: { Name: "Customer X2" }, Total: 250, Status: "PAID" }
    ]
  };
  const mockXeroInvoicesArray: RawXeroInvoice[] = mockXeroInvoicesResponse.Invoices as any;


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [XeroService]
    });
    service = TestBed.inject(XeroService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.xeroApiConfig = {
      endpoint: 'https://mock-xero-api.com',
      mockDataUrlPrefix: '/assets/mocks/xero-',
      apiKey: 'test',
      apiMocking: true
    };
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('syncInvoicesToXero', () => {
    it('should simulate success and log if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      service.syncInvoicesToXero([{ id: 'appInv1' }]).subscribe(result => {
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith('XeroService: Actual API call for syncInvoicesToXero not implemented. Simulating success.');
        done();
      });
    });
    it('should simulate success and log if API endpoint is NOT set (mock)', (done) => {
      environment.xeroApiConfig.endpoint = undefined;
      spyOn(console, 'log');
      const appInvoices = [{ id: 'appInv1' }];
      service.syncInvoicesToXero(appInvoices).subscribe(result => {
        expect(result).toBe(true);
        expect(console.log).toHaveBeenCalledWith('XeroService: Simulating invoice sync to Xero (mock). Data:', appInvoices);
        done();
      });
    });
  });

  describe('fetchInvoicesFromXero', () => {
    it('should fetch invoices from mockDataUrlPrefix if configured', (done) => {
      service.fetchInvoicesFromXero().subscribe(invoices => {
        expect(invoices.length).toBe(2);
        expect(invoices[0].InvoiceID).toBe("x1");
        done();
      });
      const req = httpMock.expectOne(`${environment.xeroApiConfig.mockDataUrlPrefix}invoices.json`);
      expect(req.request.method).toBe('GET');
      req.flush(mockXeroInvoicesResponse); // Respond with the wrapped structure
    });

     it('should return hardcoded mock invoices if mockDataUrlPrefix is not set but API endpoint is', (done) => {
      environment.xeroApiConfig.mockDataUrlPrefix = undefined;
      spyOn(console, 'warn');
      const hardcoded = (service as any).getHardcodedMockXeroInvoices();

      service.fetchInvoicesFromXero().subscribe(invoices => {
        expect(invoices.length).toBe(hardcoded.length);
        expect(console.warn).toHaveBeenCalledWith('XeroService: Actual API call for fetchInvoicesFromXero not implemented. Returning mock data.');
        if(hardcoded.length > 0) {
            expect(invoices[0].InvoiceID).toEqual(hardcoded[0].InvoiceID);
        }
        done();
      });
    });


    it('should return hardcoded mock invoices if neither mockDataUrlPrefix nor API endpoint is set', (done) => {
        environment.xeroApiConfig.mockDataUrlPrefix = undefined;
        environment.xeroApiConfig.endpoint = undefined;
        spyOn(console, 'error');
        const hardcoded = (service as any).getHardcodedMockXeroInvoices();

        service.fetchInvoicesFromXero().subscribe(invoices => {
          expect(invoices.length).toBe(hardcoded.length);
          expect(console.error).toHaveBeenCalledWith('XeroService: No API endpoint or mock data URL for Xero. Returning hardcoded mock invoices.');
          if(hardcoded.length > 0) {
            expect(invoices[0].InvoiceID).toEqual(hardcoded[0].InvoiceID);
          }
          done();
        });
      });

    it('should return an empty array on HTTP error when using mockDataUrlPrefix', (done) => {
      service.fetchInvoicesFromXero().subscribe(invoices => {
        expect(invoices).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(`${environment.xeroApiConfig.mockDataUrlPrefix}invoices.json`);
      req.flush('Simulated HTTP error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle cases where Invoices property might be missing in mock file response', (done) => {
        service.fetchInvoicesFromXero().subscribe(invoices => {
          expect(invoices).toEqual([]); // Should default to empty array
          done();
        });
        const req = httpMock.expectOne(`${environment.xeroApiConfig.mockDataUrlPrefix}invoices.json`);
        req.flush({}); // Empty object instead of {Invoices: []}
      });
  });

  describe('syncPaymentsToXero', () => {
    it('should simulate success and log (mock)', (done) => {
      spyOn(console, 'warn'); // Assuming endpoint is set by default from beforeEach
      service.syncPaymentsToXero([{ id: 'pay1' }]).subscribe(result => {
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith('XeroService: Actual API call for syncPaymentsToXero not implemented. Simulating success.');
        done();
      });
    });
  });

  describe('syncContactsToXero', () => {
    it('should simulate success and log (mock)', (done) => {
      environment.xeroApiConfig.endpoint = undefined; // Test the other path
      spyOn(console, 'log');
      const contacts = [{ id: 'contact1' }];
      service.syncContactsToXero(contacts).subscribe(result => {
        expect(result).toBe(true);
        expect(console.log).toHaveBeenCalledWith('XeroService: Simulating contact sync to Xero (mock). Data:', contacts);
        done();
      });
    });
  });
});
