import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AmazonService } from './amazon.service';
import { environment } from '../../../environments/environment';
import { Order } from '../model/order.model'; // Assuming Order model is used

describe('AmazonService', () => {
  let service: AmazonService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AmazonService]
    });
    service = TestBed.inject(AmazonService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mock environment config if your service uses it for URLs
    environment.amazonMwsApiConfig = {
      endpoint: 'https://mock-amazon-api.com',
      mockDataUrl: '/assets/mock-amazon-orders.json', // Example mock data URL
      apiKey: 'test',
      apiMocking: true
    };
  });

  afterEach(() => {
    httpMock.verify(); // Verify that no unmatched requests are outstanding
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchNewAmazonOrders', () => {
    it('should fetch orders from mockDataUrl if configured', (done) => {
      const mockRawOrders = [
        { AmazonOrderId: '123-1', PurchaseDate: new Date().toISOString(), OrderItems: [{ OrderItemId: 'oi-1', ASIN: 'ASIN1', QuantityOrdered: 1 }] },
        { AmazonOrderId: '123-2', PurchaseDate: new Date().toISOString(), OrderItems: [{ OrderItemId: 'oi-2', ASIN: 'ASIN2', QuantityOrdered: 2 }] }
      ];
      const expectedOrders: Order[] = mockRawOrders.map(rawOrder => ({
        id: `amazon-${rawOrder.AmazonOrderId}`,
        user_id: 'amazon_integration',
        customer_name: 'N/A', // Simplified for this test based on current transform
        telephone: 0,
        delivery_address: 'N/A',
        payment_type: 'Amazon Pay',
        items: (rawOrder.OrderItems || []).map(item => ({
          product_no: item.ASIN,
          product_name: 'N/A',
          quantity: item.QuantityOrdered,
          item_cost: 0, // Simplified
        })),
        delivery_cost: 0,
        discount: 0,
        total_cost: 0, // Simplified
        created_date: new Date(rawOrder.PurchaseDate).toISOString(),
      }));


      service.fetchNewAmazonOrders().subscribe(orders => {
        expect(orders.length).toBe(2);
        // Deeper comparison can be done here if needed, for now just checking length and basic structure
        expect(orders[0].id).toEqual(expectedOrders[0].id);
        expect(orders[1].items[0].product_no).toEqual(expectedOrders[1].items[0].product_no);
        done();
      });

      const req = httpMock.expectOne(environment.amazonMwsApiConfig.mockDataUrl!);
      expect(req.request.method).toBe('GET');
      req.flush(mockRawOrders);
    });

    it('should return hardcoded mock orders if mockDataUrl is not set but API endpoint is (and API not implemented)', (done) => {
      environment.amazonMwsApiConfig.mockDataUrl = undefined; // Ensure mockDataUrl is not set
      // Service should fall back to hardcoded mock data
      const hardcodedMock = (service as any).getHardcodedMockAmazonOrders(); // Access private method for test

      service.fetchNewAmazonOrders().subscribe(orders => {
        expect(orders.length).toBe(hardcodedMock.length);
        // Add more specific checks if necessary based on the hardcoded data
        if (hardcodedMock.length > 0) {
          expect(orders[0].id).toBe(`amazon-${hardcodedMock[0].AmazonOrderId}`);
        }
        done();
      });
      // No HTTP request is expected in this specific fallback path of the current service implementation
    });

    it('should return an empty array on HTTP error when using mockDataUrl', (done) => {
      service.fetchNewAmazonOrders().subscribe(orders => {
        expect(orders).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(environment.amazonMwsApiConfig.mockDataUrl!);
      req.flush('Simulated HTTP error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('syncProductListings', () => {
    it('should return of(true) and log warning (mock implementation)', (done) => {
      spyOn(console, 'warn');
      service.syncProductListings([{id: 'prod1'}]).subscribe(result => {
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith('AmazonService: syncProductListings is not implemented yet.');
        done();
      });
    });
  });

  describe('updateInventory', () => {
    it('should return of(true) and log warning (mock implementation)', (done) => {
      spyOn(console, 'warn');
      service.updateInventory([{sku: 'SKU1', quantity: 10}]).subscribe(result => {
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalledWith('AmazonService: updateInventory is not implemented yet.');
        done();
      });
    });
  });

  // Test the private transform method indirectly via fetchNewAmazonOrders or make it public/protected if direct testing is crucial
  // For this example, we assume its correctness is sufficiently covered by testing fetchNewAmazonOrders outputs.

});
