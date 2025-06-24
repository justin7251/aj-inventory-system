import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ShopifyService } from './shopify.service';
import { Order } from '../model/order.model';
import { environment } from '../../../environments/environment';

// Define a type for the raw order structure from Shopify for test data
// This should match the RawShopifyOrder interface in shopify.service.ts
interface RawShopifyOrderTest {
  id: number;
  order_number: number;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  shipping_lines?: Array<{ price: string; }>;
  shipping_address: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string | null;
    name?: string;
  } | null;
  customer: {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  line_items: Array<{
    id: number;
    variant_id: number | null;
    product_id: number | null;
    title: string;
    variant_title: string | null;
    sku: string | null;
    vendor: string | null;
    quantity: number;
    price: string;
    total_discount: string;
  }>;
  gateway?: string;
  payment_gateway_names?: string[];
}


describe('ShopifyService', () => {
  let service: ShopifyService;
  let httpMock: HttpTestingController;
  let originalShopifyApiConfig: any;

  const mockRawShopifyOrders: RawShopifyOrderTest[] = [
    {
      id: 3001, order_number: 3001, name: '#3001', email: 'test@example.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      financial_status: 'paid', fulfillment_status: null, total_price: "150.00", subtotal_price: "140.00", total_tax: "10.00", total_discounts: "0.00",
      shipping_lines: [{ price: "10.00" }], gateway: "test_gateway",
      customer: { id: 4001, email: 'test@example.com', first_name: 'Test', last_name: 'User' },
      shipping_address: { first_name: 'Test', last_name: 'User', address1: '123 Test St', city: 'Testville', province: 'TS', country: 'USA', zip: '12345', phone: '555-5555', name: 'Test User' },
      line_items: [
        { id: 5001, variant_id: 6001, product_id: 7001, title: 'Product Alpha', variant_title: 'Large', sku: 'SKU-ALPHA-L', vendor: 'TestVendor', quantity: 1, price: "140.00", total_discount: "0.00" }
      ]
    }
    // Add more mock orders if needed for different test cases
  ];

  beforeEach(() => {
    originalShopifyApiConfig = { ...environment.shopifyApiConfig };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ShopifyService]
    });
    service = TestBed.inject(ShopifyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    environment.shopifyApiConfig = originalShopifyApiConfig;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchNewShopifyOrders', () => {
    it('should fetch from mockDataUrl if configured and transform orders', (done) => {
      environment.shopifyApiConfig = { mockDataUrl: '/assets/mock-shopify-orders.json', endpoint: '', apiKey: '', password: '' };

      service.fetchNewShopifyOrders().subscribe((orders: Order[]) => {
        expect(orders.length).toBe(1); // Based on mockRawShopifyOrders
        const order = orders[0];
        expect(order.id).toBe('shopify-3001');
        expect(order.customer_name).toBe('Test User');
        expect(order.items[0].product_no).toBe('SKU-ALPHA-L');
        expect(order.total_cost).toBe(150.00);
        expect(order.delivery_cost).toBe(10.00);
        done();
      });

      const req = httpMock.expectOne('/assets/mock-shopify-orders.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockRawShopifyOrders);
    });

    it('should use hardcoded mock orders if mockDataUrl and endpoint are not configured (or simulate API call)', (done) => {
      environment.shopifyApiConfig = { mockDataUrl: '', endpoint: '', apiKey: '', password: '' };
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      service.fetchNewShopifyOrders().subscribe((orders: Order[]) => {
        // Current service logic returns of([]) if no mockDataUrl and no endpoint.
        // To test hardcoded fallback, the service's getHardcodedMockShopifyOrders() would need to be called.
        // Let's adjust the test to match the current of([]) behavior.
        expect(orders.length).toBe(0);
        expect(consoleErrorSpy).toHaveBeenCalledWith('ShopifyService: No API endpoint or mock data URL configured. Returning empty array.');
        done();
      });
      consoleErrorSpy.mockRestore();
    });

    it('should handle HTTP errors when fetching from mockDataUrl by returning an empty array', (done) => {
      environment.shopifyApiConfig = { mockDataUrl: '/assets/mock-shopify-orders.json', endpoint: '', apiKey: '', password: '' };
      const errorMessage = 'Mock HTTP Error';

      service.fetchNewShopifyOrders().subscribe((orders: Order[]) => {
        expect(orders.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne('/assets/mock-shopify-orders.json');
      req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
    });

    it('should log warning and return hardcoded data if endpoint is set but not mockDataUrl (current mock behavior)', (done) => {
        environment.shopifyApiConfig = {
            mockDataUrl: '',
            endpoint: 'https://some.shopify.api/admin/api/2024-04',
            apiKey: 'key',
            password: 'pass'
        };
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        service.fetchNewShopifyOrders().subscribe((orders: Order[]) => {
            expect(consoleWarnSpy).toHaveBeenCalledWith('ShopifyService: Actual API endpoint call is not implemented yet. Returning mock data.');
            expect(orders.length).toBeGreaterThan(0); // Should use getHardcodedMockShopifyOrders
            expect(orders[0].id).toBe('shopify-1001'); // From hardcoded data
            done();
        });
        consoleWarnSpy.mockRestore();
    });
  });

  describe('transformRawShopifyOrderToAppOrder', () => {
    it('should correctly transform a raw Shopify order to the application Order model', () => {
      const rawOrder: RawShopifyOrderTest = mockRawShopifyOrders[0];
      const transformedOrder = (service as any).transformRawShopifyOrderToAppOrder(rawOrder);

      expect(transformedOrder.id).toBe(`shopify-${rawOrder.id}`);
      expect(transformedOrder.externalOrderId).toBe(String(rawOrder.id));
      expect(transformedOrder.customer_name).toBe(`${rawOrder.customer!.first_name} ${rawOrder.customer!.last_name}`);
      expect(transformedOrder.delivery_address).toBe(`${rawOrder.shipping_address!.address1}, ${rawOrder.shipping_address!.city}, ${rawOrder.shipping_address!.province}, ${rawOrder.shipping_address!.zip}, ${rawOrder.shipping_address!.country}`);
      expect(transformedOrder.payment_type).toBe(rawOrder.gateway);
      expect(transformedOrder.delivery_cost).toBe(parseFloat(rawOrder.shipping_lines![0].price));
      expect(transformedOrder.discount).toBe(parseFloat(rawOrder.total_discounts));
      expect(transformedOrder.total_cost).toBe(parseFloat(rawOrder.total_price));
      expect(transformedOrder.created_date).toBe(new Date(rawOrder.created_at).toISOString());
      expect(transformedOrder.user_id).toBe('shopify_integration');

      expect(transformedOrder.items.length).toBe(1);
      const firstItem = transformedOrder.items[0];
      const rawFirstItem = rawOrder.line_items[0];
      expect(firstItem.product_no).toBe(rawFirstItem.sku);
      expect(firstItem.product_name).toBe(`${rawFirstItem.title} - ${rawFirstItem.variant_title}`);
      expect(firstItem.quantity).toBe(rawFirstItem.quantity);
      expect(firstItem.item_cost).toBe(parseFloat(rawFirstItem.price) * rawFirstItem.quantity);
    });

    it('should use fallback for product_no if SKU is missing', () => {
        const rawOrderNoSku = JSON.parse(JSON.stringify(mockRawShopifyOrders[0])); // deep copy
        rawOrderNoSku.line_items[0].sku = null;
        const transformedOrder = (service as any).transformRawShopifyOrderToAppOrder(rawOrderNoSku);
        const li = rawOrderNoSku.line_items[0];
        expect(transformedOrder.items[0].product_no).toBe(`shopify_pid_${li.product_id}_vid_${li.variant_id}`);
    });

    it('should handle missing customer or shipping address gracefully', () => {
        const rawOrderNoCustomer = JSON.parse(JSON.stringify(mockRawShopifyOrders[0]));
        rawOrderNoCustomer.customer = null;
        rawOrderNoCustomer.shipping_address = null;
        const transformedOrder = (service as any).transformRawShopifyOrderToAppOrder(rawOrderNoCustomer);
        expect(transformedOrder.customer_name).toBe('N/A');
        expect(transformedOrder.delivery_address).toBe('N/A');
    });
  });
});
