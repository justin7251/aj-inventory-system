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
let mockShopifyService: { fetchNewShopifyOrders: jasmine.Spy };
let mockItemService: { addOrder: jasmine.Spy };

const mockShopifyOrders: Order[] = [
  { id: 'shopify1', customer_name: 'ShopifyCust1', telephone: 1234567890, items: [{product_no: 'sp1', quantity: 1, item_cost: 100}], user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0 },
  { id: 'shopify2', customer_name: 'ShopifyCust2', telephone: 1234567890, items: [{product_no: 'sp2', quantity: 2, item_cost: 200}], user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0 },
];

describe('ShopifyConnectorComponent', () => {
  let component: ShopifyConnectorComponent;
  let fixture: ComponentFixture<ShopifyConnectorComponent>;

  beforeEach(async () => {
    mockShopifyService = {
      fetchNewShopifyOrders: jasmine.createSpy('fetchNewShopifyOrders')
    };
    mockItemService = {
      addOrder: jasmine.createSpy('addOrder')
    };

    await TestBed.configureTestingModule({
      declarations: [ ShopifyConnectorComponent ],
      imports: [
        HttpClientTestingModule,
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('syncShopifyOrders', () => {
    it('should fetch orders from ShopifyService and add them using ItemService', fakeAsync(() => {
      mockShopifyService.fetchNewShopifyOrders.and.returnValue(of(mockShopifyOrders));
      mockItemService.addOrder.and.returnValue(Promise.resolve({ id: 'firestoreId' } as any));

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
      mockShopifyService.fetchNewShopifyOrders.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.syncShopifyOrders();
      tick();

      expect(mockShopifyService.fetchNewShopifyOrders).toHaveBeenCalledTimes(1);
      expect(mockItemService.addOrder).not.toHaveBeenCalled();
      expect(component.errorMessages[0]).toContain('Error fetching Shopify orders: Shopify fetch failed');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle errors when adding an order using ItemService', fakeAsync(() => {
      const processError = new Error('Shopify process failed');
      mockShopifyService.fetchNewShopifyOrders.and.returnValue(of(mockShopifyOrders));
      mockItemService.addOrder.and.callFake((order: Order) => {
        if (order.id === mockShopifyOrders[1].id) {
          return Promise.reject(processError);
        }
        return Promise.resolve({ id: 'fsId1' } as any);
      });
      spyOn(console, 'error');

      component.syncShopifyOrders();
      tick();

      expect(mockItemService.addOrder).toHaveBeenCalledTimes(mockShopifyOrders.length);
      expect(component.ordersProcessed).toBe(1);
      expect(component.ordersFailed).toBe(1);
      expect(component.errorMessages[0]).toContain(`Failed to process Shopify order ${mockShopifyOrders[1].id}`);
      expect(component.isLoading).toBe(false);
    }));

    it('should correctly display message for no new Shopify orders', fakeAsync(() => {
        mockShopifyService.fetchNewShopifyOrders.and.returnValue(of([]));
        component.syncShopifyOrders();
        tick();
        expect(component.errorMessages[0]).toBe('No new Shopify orders found or an error occurred while fetching.');
        expect(component.ordersProcessed).toBe(0);
    }));
  });
});
