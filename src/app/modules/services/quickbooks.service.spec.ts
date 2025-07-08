import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QuickBooksService } from './quickbooks.service';
import { environment } from '../../../environments/environment';

describe('QuickBooksService', () => {
  let service: QuickBooksService;
  let httpMock: HttpTestingController;

  // Define a basic structure for RawQuickBooksInvoice for testing purposes
  interface RawQuickBooksInvoice {
    Id: string;
    DocNumber?: string;
    TotalAmt: number;
    CustomerRef: { value: string; name?: string };
    Line: Array<any>;
    SyncToken: string;
    TxnDate?: string;
  }

  const mockInvoices: RawQuickBooksInvoice[] = [
    { Id: "1", DocNumber: "INV001", TotalAmt: 100, CustomerRef: { value: "cust1", name: "Customer 1" }, Line: [], SyncToken: "0", TxnDate: "2023-01-01" },
    { Id: "2", DocNumber: "INV002", TotalAmt: 200, CustomerRef: { value: "cust2", name: "Customer 2" }, Line: [], SyncToken: "0", TxnDate: "2023-01-02" }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QuickBooksService]
    });
    service = TestBed.inject(QuickBooksService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.quickbooksApiConfig = {
      endpoint: 'https://mock-quickbooks-api.com',
      mockDataUrlPrefix: '/assets/mocks/quickbooks-'
    };
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('syncInvoices', () => {
    it('should simulate success and log if API endpoint is set (mock)', (done) => {
      spyOn(console, 'warn');
      const appInvoices = [{ id: 'appInv1', amount: 150 }];
      service.syncInvoices(appInvoices).subscribe(result => {
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith('QuickBooksService: Actual API call for syncInvoices not implemented. Simulating success.');
        done();
      });
    });
    it('should simulate success and log if API endpoint is NOT set (mock)', (done) => {
      environment.quickbooksApiConfig.endpoint = undefined;
      spyOn(console, 'log');
      const appInvoices = [{ id: 'appInv1', amount: 150 }];
      service.syncInvoices(appInvoices).subscribe(result => {
        expect(result).toBe(true);
        expect(console.log).toHaveBeenCalledWith('QuickBooksService: Simulating invoice sync (mock). Data:', appInvoices);
        done();
      });
    });
  });

  describe('fetchQuickBooksInvoices', () => {
    it('should fetch invoices from mockDataUrlPrefix if configured', (done) => {
      service.fetchQuickBooksInvoices().subscribe(invoices => {
        expect(invoices.length).toBe(2);
        expect(invoices[0].Id).toBe("1");
        done();
      });
      const req = httpMock.expectOne(`${environment.quickbooksApiConfig.mockDataUrlPrefix}invoices.json`);
      expect(req.request.method).toBe('GET');
      req.flush(mockInvoices);
    });

    it('should return hardcoded mock invoices if mockDataUrlPrefix is not set but API endpoint is', (done) => {
      environment.quickbooksApiConfig.mockDataUrlPrefix = undefined;
      spyOn(console, 'warn');
      const hardcoded = (service as any).getHardcodedMockInvoices();

      service.fetchQuickBooksInvoices().subscribe(invoices => {
        expect(invoices.length).toBe(hardcoded.length);
        expect(console.warn).toHaveBeenCalledWith('QuickBooksService: Actual API call for fetchQuickBooksInvoices not implemented. Returning mock data.');
        if (hardcoded.length > 0) {
            expect(invoices[0].Id).toEqual(hardcoded[0].Id);
        }
        done();
      });
    });

    it('should return hardcoded mock invoices if neither mockDataUrlPrefix nor API endpoint is set', (done) => {
        environment.quickbooksApiConfig.mockDataUrlPrefix = undefined;
        environment.quickbooksApiConfig.endpoint = undefined;
        spyOn(console, 'error');
        const hardcoded = (service as any).getHardcodedMockInvoices();

        service.fetchQuickBooksInvoices().subscribe(invoices => {
          expect(invoices.length).toBe(hardcoded.length);
          expect(console.error).toHaveBeenCalledWith('QuickBooksService: No API endpoint or mock data URL. Returning hardcoded mock invoices.');
           if (hardcoded.length > 0) {
            expect(invoices[0].Id).toEqual(hardcoded[0].Id);
          }
          done();
        });
      });


    it('should return an empty array on HTTP error when using mockDataUrlPrefix', (done) => {
        service.fetchQuickBooksInvoices().subscribe(invoices => {
        expect(invoices).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(`${environment.quickbooksApiConfig.mockDataUrlPrefix}invoices.json`);
      req.flush('Simulated HTTP error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('syncPayments', () => {
    it('should simulate success and log (mock implementation)', (done) => {
      // Similar to syncInvoices, test both cases: endpoint defined or not
      environment.quickbooksApiConfig.endpoint = 'https://mock-quickbooks-api.com';
      spyOn(console, 'warn');
      service.syncPayments([{id: 'pay1'}]).subscribe(result => {
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith('QuickBooksService: Actual API call for syncPayments not implemented. Simulating success.');
        done();
      });
    });
  });

  describe('syncCustomers', () => {
    it('should simulate success and log (mock implementation)', (done) => {
      environment.quickbooksApiConfig.endpoint = undefined;
      spyOn(console, 'log');
      service.syncCustomers([{id: 'cust1'}]).subscribe(result => {
        expect(result).toBe(true);
        expect(console.log).toHaveBeenCalledWith('QuickBooksService: Simulating customer sync (mock). Data:', [{id: 'cust1'}]);
        done();
      });
    });
  });
});
