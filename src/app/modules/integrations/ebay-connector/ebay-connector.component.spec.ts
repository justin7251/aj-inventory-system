import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { EbayConnectorComponent } from './ebay-connector.component';
import { EbayService } from '../../services/ebay.service';
import { ItemService } from '../../services/item.service';
import { Order } from '../../model/order.model';
import { SharedModule } from '../../../shared/shared.module'; // For Material components used in template

// Mock services
const mockEbayService = {
  fetchNewEbayOrders: jest.fn()
};

const mockItemService = {
  addOrder: jest.fn()
};

const mockOrders: Order[] = [
  { id: 'ebay1', customer_name: 'Cust1', items: [{product_no: 'p1', quantity: 1, item_cost: 10}], user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0 },
  { id: 'ebay2', customer_name: 'Cust2', items: [{product_no: 'p2', quantity: 2, item_cost: 20}], user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0 },
];

describe('EbayConnectorComponent', () => {
  let component: EbayConnectorComponent;
  let fixture: ComponentFixture<EbayConnectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EbayConnectorComponent ],
      imports: [
        HttpClientTestingModule, // EbayService might inject HttpClient
        NoopAnimationsModule,    // To handle Material animations
        SharedModule             // Import SharedModule that exports Material modules
      ],
      providers: [
        { provide: EbayService, useValue: mockEbayService },
        { provide: ItemService, useValue: mockItemService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EbayConnectorComponent);
    component = fixture.componentInstance;

    // Reset mocks before each test
    mockEbayService.fetchNewEbayOrders.mockReset();
    mockItemService.addOrder.mockReset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('syncEbayOrders', () => {
    it('should fetch orders from EbayService and add them using ItemService', fakeAsync(() => {
      mockEbayService.fetchNewEbayOrders.mockReturnValue(of(mockOrders));
      mockItemService.addOrder.mockResolvedValue({ id: 'firestoreId' } as any);

      component.syncEbayOrders();
      tick(); // Process Observables and Promises

      expect(mockEbayService.fetchNewEbayOrders).toHaveBeenCalledTimes(1);
      expect(mockItemService.addOrder).toHaveBeenCalledTimes(mockOrders.length);
      expect(mockItemService.addOrder).toHaveBeenCalledWith(mockOrders[0]);
      expect(mockItemService.addOrder).toHaveBeenCalledWith(mockOrders[1]);
      expect(component.ordersProcessed).toBe(mockOrders.length);
      expect(component.ordersFailed).toBe(0);
      expect(component.isLoading).toBe(false);
      expect(component.lastSyncTime).not.toBeNull();
    }));

    it('should handle errors when fetching orders from EbayService', fakeAsync(() => {
      const error = new Error('Failed to fetch');
      mockEbayService.fetchNewEbayOrders.mockReturnValue(throwError(() => error));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      component.syncEbayOrders();
      tick();

      expect(mockEbayService.fetchNewEbayOrders).toHaveBeenCalledTimes(1);
      expect(mockItemService.addOrder).not.toHaveBeenCalled();
      expect(component.ordersProcessed).toBe(0);
      expect(component.ordersFailed).toBe(0); // No orders were attempted
      expect(component.errorMessages.length).toBeGreaterThan(0);
      expect(component.errorMessages[0]).toContain('Failed to fetch');
      expect(component.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    }));

    it('should handle errors when adding an order using ItemService', fakeAsync(() => {
      const processError = new Error('Failed to process');
      mockEbayService.fetchNewEbayOrders.mockReturnValue(of(mockOrders));
      // First order succeeds, second fails
      mockItemService.addOrder
        .mockResolvedValueOnce({ id: 'firestoreId1' } as any)
        .mockRejectedValueOnce(processError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      component.syncEbayOrders();
      tick();

      expect(mockItemService.addOrder).toHaveBeenCalledTimes(mockOrders.length);
      expect(component.ordersProcessed).toBe(1);
      expect(component.ordersFailed).toBe(1);
      expect(component.errorMessages.length).toBeGreaterThan(0);
      expect(component.errorMessages[0]).toContain(`Failed to process order ${mockOrders[1].id}`);
      expect(component.isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    }));

    it('should handle empty order array from EbayService', fakeAsync(() => {
        mockEbayService.fetchNewEbayOrders.mockReturnValue(of([]));

        component.syncEbayOrders();
        tick();

        expect(mockEbayService.fetchNewEbayOrders).toHaveBeenCalledTimes(1);
        expect(mockItemService.addOrder).not.toHaveBeenCalled();
        expect(component.ordersProcessed).toBe(0);
        expect(component.ordersFailed).toBe(0);
        expect(component.errorMessages[0]).toBe('No new orders found or an error occurred while fetching.');
        expect(component.isLoading).toBe(false);
      }));

      it('should ensure order.items is initialized if null/undefined before calling addOrder', fakeAsync(() => {
        const orderWithNullItems: Order = {
            id: 'ebayNull', customer_name: 'CustNull', items: null as any, // Test case
            user_id: '', delivery_address: '', payment_type: '', delivery_cost:0, discount:0, total_cost:0
        };
        mockEbayService.fetchNewEbayOrders.mockReturnValue(of([orderWithNullItems]));
        mockItemService.addOrder.mockResolvedValue({ id: 'firestoreId' } as any);

        component.syncEbayOrders();
        tick();

        expect(mockItemService.addOrder).toHaveBeenCalledWith(expect.objectContaining({
            id: 'ebayNull',
            items: [] // Should be initialized to empty array
        }));
        expect(component.ordersProcessed).toBe(1);
      }));
  });
});
