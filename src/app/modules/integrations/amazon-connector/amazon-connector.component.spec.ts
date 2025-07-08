import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { AmazonConnectorComponent } from './amazon-connector.component';
import { AmazonService } from '../../services/amazon.service';
import { OrderService } from '../../services/order.service'; // Path corrected based on previous assumptions
import { Order } from '../../model/order.model';

// Material Module imports (minimal set for testing this component)
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';


// Mock services
class MockAmazonService {
  fetchNewAmazonOrders = jasmine.createSpy('fetchNewAmazonOrders').and.returnValue(of([]));
  syncProductListings = jasmine.createSpy('syncProductListings').and.returnValue(of(true));
  updateInventory = jasmine.createSpy('updateInventory').and.returnValue(of(true));
}

class MockOrderService {
  createOrder = jasmine.createSpy('createOrder').and.returnValue(Promise.resolve({id: 'order-123'}));
}

describe('AmazonConnectorComponent', () => {
  let component: AmazonConnectorComponent;
  let fixture: ComponentFixture<AmazonConnectorComponent>;
  let amazonService: MockAmazonService;
  let orderService: MockOrderService;

  const mockOrder: Order = {
    id: 'amz-order-1',
    user_id: 'amazon-user',
    customer_name: 'Test Customer',
    items: [{ product_no: 'prod1', product_name: 'Product 1', quantity: 1, item_cost: 10 }],
    total_cost: 10,
    created_date: new Date().toISOString(),
    delivery_address: '123 Test St',
    payment_type: 'Credit Card',
    delivery_cost: 0,
    discount:0
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AmazonConnectorComponent],
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule, // Though services are mocked, good to have if component ever used http directly
        NoopAnimationsModule, // For Material animations
        MatCardModule,
        MatButtonModule,
        MatProgressBarModule,
        MatIconModule
      ],
      providers: [
        { provide: AmazonService, useClass: MockAmazonService },
        { provide: OrderService, useClass: MockOrderService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AmazonConnectorComponent);
    component = fixture.componentInstance;
    amazonService = TestBed.inject(AmazonService) as unknown as MockAmazonService;
    orderService = TestBed.inject(OrderService) as unknown as MockOrderService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('syncAmazonOrders', () => {
    it('should set isLoading to true and reset messages/counters', () => {
      component.syncAmazonOrders();
      expect(component.isLoading).toBeTrue();
      expect(component.ordersProcessed).toBe(0);
      expect(component.ordersFailed).toBe(0);
      expect(component.errorMessages.length).toBe(0);
    });

    it('should call amazonService.fetchNewAmazonOrders and process orders', fakeAsync(() => {
      amazonService.fetchNewAmazonOrders.and.returnValue(of([mockOrder, mockOrder]));
      orderService.createOrder.and.returnValue(Promise.resolve({id: 'new-id'}));

      component.syncAmazonOrders();
      tick(); // Allow promises and observables to resolve

      expect(amazonService.fetchNewAmazonOrders).toHaveBeenCalled();
      expect(orderService.createOrder).toHaveBeenCalledTimes(2);
      expect(orderService.createOrder).toHaveBeenCalledWith(mockOrder);
      expect(component.ordersProcessed).toBe(2);
      expect(component.ordersFailed).toBe(0);
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle errors from fetchNewAmazonOrders', fakeAsync(() => {
      amazonService.fetchNewAmazonOrders.and.returnValue(throwError(() => new Error('Fetch failed')));
      component.syncAmazonOrders();
      tick();

      expect(component.errorMessages).toContain('Error fetching Amazon orders: Fetch failed');
      expect(component.isLoading).toBeFalse();
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle errors from orderService.createOrder', fakeAsync(() => {
      amazonService.fetchNewAmazonOrders.and.returnValue(of([mockOrder]));
      orderService.createOrder.and.returnValue(Promise.reject(new Error('Create order failed')));

      component.syncAmazonOrders();
      tick(); // for observable
      tick(); // for promise rejection

      expect(component.ordersFailed).toBe(1);
      expect(component.ordersProcessed).toBe(0);
      expect(component.errorMessages.length).toBeGreaterThan(0);
      expect(component.errorMessages[0]).toContain(`Failed to process Amazon order ${mockOrder.id}`);
      expect(component.isLoading).toBeFalse();
    }));

     it('should handle empty orders array from fetchNewAmazonOrders', fakeAsync(() => {
      amazonService.fetchNewAmazonOrders.and.returnValue(of([]));
      component.syncAmazonOrders();
      tick();

      expect(component.errorMessages).toContain('No new Amazon orders found or an error occurred while fetching.');
      expect(orderService.createOrder).not.toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
    }));
  });

  describe('syncAmazonProducts', () => {
    it('should call amazonService.syncProductListings', fakeAsync(() => {
      amazonService.syncProductListings.and.returnValue(of(true));
      component.syncAmazonProducts();
      tick();
      expect(amazonService.syncProductListings).toHaveBeenCalledWith([]); // Expects empty array as per current component code
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle failure from syncProductListings', fakeAsync(() => {
      amazonService.syncProductListings.and.returnValue(of(false));
      component.syncAmazonProducts();
      tick();
      expect(component.errorMessages).toContain('Failed to sync Amazon products.');
      expect(component.isLoading).toBeFalse();
    }));
  });

    describe('updateAmazonInventory', () => {
    it('should call amazonService.updateInventory', fakeAsync(() => {
      amazonService.updateInventory.and.returnValue(of(true));
      component.updateAmazonInventory();
      tick();
      expect(amazonService.updateInventory).toHaveBeenCalledWith([]); // Expects empty array
      expect(component.isLoading).toBeFalse();
    }));

    it('should handle failure from updateInventory', fakeAsync(() => {
      amazonService.updateInventory.and.returnValue(of(false));
      component.updateAmazonInventory();
      tick();
      expect(component.errorMessages).toContain('Failed to update Amazon inventory.');
      expect(component.isLoading).toBeFalse();
    }));
  });

});
