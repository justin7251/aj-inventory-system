import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ShopifyConnectorComponent } from './shopify-connector.component';
import { ShopifyService } from '../../services/shopify.service';
import { ItemService } from '../../services/item.service';
import { Order } from '../../model/order.model';
import { SharedModule } from '../../../shared/shared.module';

// Mock services
const mockShopifyService = {
  fetchNewShopifyOrders: jest.fn()
};

const mockItemService = {
  addOrder: jest.fn()
};

const mockShopifyOrders: Order[] = [
  { id: 'shopify1', externalOrderId: 's1', customer_name: 'ShopifyCust1', items: [{product_no: 'sp1', quantity: 1, item_cost: 100}], user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0 },
  { id: 'shopify2', externalOrderId: 's2', customer_name: 'ShopifyCust2', items: [{product_no: 'sp2', quantity: 2, item_cost: 200}], user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0 },
];

describe('ShopifyConnectorComponent', () => {
  let component: ShopifyConnectorComponent;
  let fixture: ComponentFixture<ShopifyConnectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShopifyConnectorComponent ],
      imports: [
        HttpClientTestingModule, // ShopifyService might inject HttpClient
        NoopAnimationsModule,
        SharedModule
      ],
      providers: [
        { provide: ShopifyService, useValue: mockShopifyService },
        { provide: ItemService, useValue: mockItemService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShopifyConnectorComponent);
    component = fixture.componentInstance;

    mockShopifyService.fetchNewShopifyOrders.mockReset();
    mockItemService.addOrder.mockReset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('syncShopifyOrders', () => {
    it('should fetch orders from ShopifyService and add them using ItemService', fakeAsync(() => {
      mockShopifyService.fetchNewShopifyOrders.mockReturnValue(of(mockShopifyOrders));
      mockItemService.addOrder.mockResolvedValue({ id: 'firestoreId' } as any);

      component.syncShopifyOrders();
      tick();

      expect(mockShopifyService.fetchNewShopifyOrders).toHaveBeenCalledTimes(1);
      expect(mockItemService.addOrder).toHaveBeenCalledTimes(mockShopifyOrders.length);
      expect(mockItemService.addOrder).toHaveBeenCalledWith(mockShopifyOrders[0]);
      expect(mockItemService.addOrder).toHaveBeenCalledWith(mockShopifyOrders[1]);
      expect(component.ordersProcessed).toBe(mockShopifyOrders.length);
      expect(component.ordersFailed).toBe(0);
      expect(component.isLoading).toBe(false);
    }));

    it('should handle errors when fetching orders from ShopifyService', fakeAsync(() => {
      const error = new Error('Shopify fetch failed');
      mockShopifyService.fetchNewShopifyOrders.mockReturnValue(throwError(() => error));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      component.syncShopifyOrders();
      tick();

      expect(mockShopifyService.fetchNewShopifyOrders).toHaveBeenCalledTimes(1);
      expect(mockItemService.addOrder).not.toHaveBeenCalled();
      expect(component.errorMessages[0]).toContain('Error fetching Shopify orders: Shopify fetch failed');
      expect(component.isLoading).toBe(false);
      consoleErrorSpy.mockRestore();
    }));

    it('should handle errors when adding an order using ItemService', fakeAsync(() => {
      const processError = new Error('Shopify process failed');
      mockShopifyService.fetchNewShopifyOrders.mockReturnValue(of(mockShopifyOrders));
      mockItemService.addOrder
        .mockResolvedValueOnce({ id: 'fsId1' } as any)
        .mockRejectedValueOnce(processError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      component.syncShopifyOrders();
      tick();

      expect(mockItemService.addOrder).toHaveBeenCalledTimes(mockShopifyOrders.length);
      expect(component.ordersProcessed).toBe(1);
      expect(component.ordersFailed).toBe(1);
      expect(component.errorMessages[0]).toContain(`Failed to process Shopify order ${mockShopifyOrders[1].id || mockShopifyOrders[1].externalOrderId}`);
      expect(component.isLoading).toBe(false);
      consoleErrorSpy.mockRestore();
    }));

    it('should correctly display message for no new Shopify orders', fakeAsync(() => {
        mockShopifyService.fetchNewShopifyOrders.mockReturnValue(of([]));
        component.syncShopifyOrders();
        tick();
        expect(component.errorMessages[0]).toBe('No new Shopify orders found or an error occurred while fetching.');
        expect(component.ordersProcessed).toBe(0);
    }));
  });
});
