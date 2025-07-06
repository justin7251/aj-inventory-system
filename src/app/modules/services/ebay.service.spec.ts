import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EbayService } from './ebay.service';
import { Order } from '../model/order.model';
import { environment } from '../../../environments/environment';

// Define a type for the raw order structure from the mock eBay API for test data
interface RawEbayOrderTest {
  ebayOrderId: string;
  buyerUsername: string;
  buyerShippingAddress: string;
  paymentMethod: string;
  shippingCost: number;
  orderDiscount: number;
  orderTotal: number;
  items: Array<{
    sku: string;
    productTitle: string;
    quantitySold: number;
    unitPrice: number;
    lineItemTotal: number;
  }>;
  orderDate: string;
}

describe('EbayService', () => {
  let service: EbayService;
  let httpMock: HttpTestingController;
  let originalEbayApiConfig: any;

  const mockRawEbayOrders: RawEbayOrderTest[] = [
    {
      ebayOrderId: 'EBAY-TEST-001',
      buyerUsername: 'test_buyer_1',
      buyerShippingAddress: '1 Test Address, Testville',
      paymentMethod: 'TestPay',
      shippingCost: 5.00,
      orderDiscount: 1.00,
      orderTotal: 24.00,
      items: [
        { sku: 'TSKU001', productTitle: 'Test Product A', quantitySold: 1, unitPrice: 20.00, lineItemTotal: 20.00 },
      ],
      orderDate: new Date().toISOString()
    },
    {
      ebayOrderId: 'EBAY-TEST-002',
      buyerUsername: 'test_buyer_2',
      buyerShippingAddress: '2 Another St, Anothertown',
      paymentMethod: 'CreditCardTest',
      shippingCost: 2.50,
      orderDiscount: 0.00,
      orderTotal: 42.50,
      items: [
        { sku: 'TSKU002', productTitle: 'Test Product B', quantitySold: 2, unitPrice: 20.00, lineItemTotal: 40.00 },
      ],
      orderDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
    }
  ];

  beforeEach(() => {
    // Store original environment config and restore it later if necessary,
    // though TestBed usually isolates this.
    originalEbayApiConfig = { ...environment.ebayApiConfig };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EbayService]
    });
    service = TestBed.inject(EbayService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verify that no unmatched requests are outstanding.
    environment.ebayApiConfig = originalEbayApiConfig; // Restore original config
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchNewEbayOrders', () => {
    it('should fetch from mockDataUrl if configured and transform orders', (done) => {
      environment.ebayApiConfig = { mockDataUrl: '/assets/mock-ebay-orders.json', endpoint: '', apiKey: '' };

      service.fetchNewEbayOrders().subscribe((orders: Order[]) => {
        expect(orders.length).toBe(2);
        expect(orders[0].id).toBe('EBAY-TEST-001');
        expect(orders[0].customer_name).toBe('test_buyer_1');
        expect(orders[0].items[0].product_no).toBe('TSKU001');
        expect(orders[0].total_cost).toBe(24.00);

        expect(orders[1].id).toBe('EBAY-TEST-002');
        expect(orders[1].items[0].quantity).toBe(2);
        done();
      });

      const req = httpMock.expectOne('/assets/mock-ebay-orders.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockRawEbayOrders); // Respond with mock data
    });

    it('should use hardcoded mock orders if mockDataUrl and endpoint are not configured (or simulate API call)', (done) => {
      // Simulate no mockDataUrl and no real endpoint for this test path
      environment.ebayApiConfig = { mockDataUrl: '', endpoint: '', apiKey: '' };
      // Spy on getHardcodedMockOrders to ensure it's called as a fallback
      // and to control its output if needed, though here we test its direct usage.
      // In the actual service, if endpoint is also empty, it uses hardcoded.
      // If endpoint IS set, it would try to call it (and we'd mock that HTTP call).
      // The current service logic prefers mockDataUrl, then endpoint (logs warning), then hardcoded if both empty.

      // To specifically test the hardcoded path when endpoint is also empty:
      environment.ebayApiConfig.endpoint = ''; // Ensure endpoint is empty
      environment.ebayApiConfig.mockDataUrl = ''; // Ensure mockDataUrl is empty

      const consoleWarnSpy = spyOn(console, 'warn').and.callThrough();
      const consoleErrorSpy = spyOn(console, 'error').and.callThrough();


      service.fetchNewEbayOrders().subscribe((orders: Order[]) => {
        expect(orders.length).toBeGreaterThan(0); // Hardcoded data has 2 items
        expect(orders[0].id).toMatch(/^EBAY-ORDER-\d{3}$/); // Matches format from getHardcodedMockOrders
        // Check one transformation
        expect(orders[0].customer_name).toBe('ebay_user_alpha');
        expect(orders[0].items[0].product_name).toBe('Fancy Gadget Model X');
        // Check that it logged an error because no endpoint/mock was configured
        expect(consoleErrorSpy).toHaveBeenCalledWith('EbayService: No API endpoint or mock data URL configured. Returning empty array.');
        done();
      });
    });

    it('should handle HTTP errors when fetching from mockDataUrl by returning an empty array', (done) => {
      environment.ebayApiConfig = { mockDataUrl: '/assets/mock-ebay-orders.json', endpoint: '', apiKey: '' };
      const errorMessage = 'Mock HTTP Error';

      service.fetchNewEbayOrders().subscribe((orders: Order[]) => {
        expect(orders.length).toBe(0); // Should return empty array on error
        done();
      });

      const req = httpMock.expectOne('/assets/mock-ebay-orders.json');
      req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
    });

    it('should call the real API endpoint if configured and mockDataUrl is not (simulated)', (done) => {
        environment.ebayApiConfig = {
            mockDataUrl: '', // No mock data URL
            endpoint: 'https://api.ebay.com/real/orders',
            apiKey: 'test-key'
        };
        const consoleWarnSpy = spyOn(console, 'warn').and.callThrough();

        // The service currently logs a warning and returns hardcoded data if endpoint is set but not mockDataUrl.
        // This test verifies that behavior.
        service.fetchNewEbayOrders().subscribe((orders: Order[]) => {
            expect(consoleWarnSpy).toHaveBeenCalledWith('EbayService: Actual API endpoint call is not implemented yet. Returning mock data.');
            expect(orders.length).toBeGreaterThan(0); // Should return hardcoded mock orders
            expect(orders[0].id).toMatch(/^EBAY-ORDER-\d{3}$/);
            done();
        });
        // If the service were to make an actual HTTP call:
        // const req = httpMock.expectOne('https://api.ebay.com/real/orders');
        // expect(req.request.method).toBe('GET');
        // req.flush(mockRawEbayOrders);
    });

  });

  describe('transformRawOrderToAppOrder', () => {
    it('should correctly transform a raw eBay order to the application Order model', () => {
      const rawOrder: RawEbayOrderTest = mockRawEbayOrders[0];
      // Access private method for testing (common pattern, but be mindful of encapsulation)
      const transformedOrder = (service as any).transformRawOrderToAppOrder(rawOrder);

      expect(transformedOrder.id).toBe(rawOrder.ebayOrderId);
      expect(transformedOrder.customer_name).toBe(rawOrder.buyerUsername);
      expect(transformedOrder.delivery_address).toBe(rawOrder.buyerShippingAddress);
      expect(transformedOrder.payment_type).toBe(rawOrder.paymentMethod);
      expect(transformedOrder.delivery_cost).toBe(rawOrder.shippingCost);
      expect(transformedOrder.discount).toBe(rawOrder.orderDiscount);
      expect(transformedOrder.total_cost).toBe(rawOrder.orderTotal);
      expect(transformedOrder.created_date).toBe(new Date(rawOrder.orderDate).toISOString());
      expect(transformedOrder.user_id).toBe('ebay_integration');

      expect(transformedOrder.items.length).toBe(1);
      const firstItem = transformedOrder.items[0];
      const rawFirstItem = rawOrder.items[0];
      expect(firstItem.product_no).toBe(rawFirstItem.sku);
      expect(firstItem.product_name).toBe(rawFirstItem.productTitle);
      expect(firstItem.quantity).toBe(rawFirstItem.quantitySold);
      expect(firstItem.item_cost).toBe(rawFirstItem.lineItemTotal);
    });
  });
});
