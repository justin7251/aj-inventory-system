import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PackingListComponent } from './packing-list.component';
import { PackingQueueService } from '../../services/packing-queue.service';
import { PackingItem, PackingStatus } from '../../model/packing-item.model';
import { SharedModule } from '../../../shared/shared.module'; // For Material components
import { Timestamp } from '@angular/fire/firestore';

// Mock PackingQueueService
const mockPackingQueueService = {
  getAllPackingItems: jest.fn(),
  getPendingPackingItems: jest.fn(), // If you switch to this
  updatePackingItemStatus: jest.fn()
};

// Mock MatSnackBar
const mockMatSnackBar = {
  open: jest.fn()
};

const mockPackingItems: PackingItem[] = [
  { id: 'item1', orderId: 'order1', productId: 'prod1', productName: 'Product A', quantityToPack: 1, status: 'pending', customerName: 'Cust A', deliveryAddress: 'Addr A', creationDate: Timestamp.now() },
  { id: 'item2', orderId: 'order2', productId: 'prod2', productName: 'Product B', quantityToPack: 2, status: 'packed', customerName: 'Cust B', deliveryAddress: 'Addr B', creationDate: Timestamp.now() },
];

describe('PackingListComponent', () => {
  let component: PackingListComponent;
  let fixture: ComponentFixture<PackingListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PackingListComponent ],
      imports: [
        NoopAnimationsModule, // For Material animations
        SharedModule          // For MatTable, MatSelect, MatSnackBar etc.
      ],
      providers: [
        { provide: PackingQueueService, useValue: mockPackingQueueService },
        { provide: MatSnackBar, useValue: mockMatSnackBar }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PackingListComponent);
    component = fixture.componentInstance;

    // Reset mocks
    mockPackingQueueService.getAllPackingItems.mockReset();
    mockPackingQueueService.updatePackingItemStatus.mockReset();
    mockMatSnackBar.open.mockReset();

    // Default mock implementation
    mockPackingQueueService.getAllPackingItems.mockReturnValue(of(mockPackingItems));

    fixture.detectChanges(); // ngOnInit will be called, items$ will be set
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display packing items from the service', (done) => {
    component.packingItems$.subscribe(items => {
      expect(items.length).toBe(mockPackingItems.length);
      expect(items).toEqual(mockPackingItems);
      expect(mockPackingQueueService.getAllPackingItems).toHaveBeenCalledTimes(1);
      done();
    });
  });

  describe('updateStatus', () => {
    const testItem: PackingItem = mockPackingItems[0]; // A 'pending' item
    const newStatus: PackingStatus = 'packed';

    it('should call packingQueueService.updatePackingItemStatus and show success message', fakeAsync(() => {
      mockPackingQueueService.updatePackingItemStatus.mockResolvedValue(undefined);

      component.updateStatus(testItem, newStatus);
      tick(); // Resolve promise

      expect(mockPackingQueueService.updatePackingItemStatus).toHaveBeenCalledWith(testItem.id, newStatus);
      expect(mockMatSnackBar.open).toHaveBeenCalledWith(
        `Item ${testItem.productName} (Order: ${testItem.orderId}) status updated to ${newStatus}.`,
        'Close',
        expect.any(Object)
      );
    }));

    it('should show error message if updatePackingItemStatus fails', fakeAsync(() => {
      const error = new Error('Update failed');
      mockPackingQueueService.updatePackingItemStatus.mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});


      component.updateStatus(testItem, newStatus);
      tick();

      expect(mockPackingQueueService.updatePackingItemStatus).toHaveBeenCalledWith(testItem.id, newStatus);
      expect(mockMatSnackBar.open).toHaveBeenCalledWith(
        `Failed to update status for item ${testItem.productName}: ${error.message || error}`,
        'Close',
        expect.any(Object)
      );
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    }));

    it('should show error if item ID is missing', async () => {
      const itemWithoutId: PackingItem = { ...testItem, id: undefined };
      await component.updateStatus(itemWithoutId, newStatus);

      expect(mockPackingQueueService.updatePackingItemStatus).not.toHaveBeenCalled();
      expect(mockMatSnackBar.open).toHaveBeenCalledWith(
        'Item ID is missing, cannot update status.',
        'Close',
        expect.any(Object)
      );
    });

    it('should show message if item status is already the new status', async () => {
        const itemAlreadyPacked: PackingItem = { ...testItem, status: 'packed' };
        await component.updateStatus(itemAlreadyPacked, 'packed');

        expect(mockPackingQueueService.updatePackingItemStatus).not.toHaveBeenCalled();
        expect(mockMatSnackBar.open).toHaveBeenCalledWith(
          `Item is already packed.`,
          'Close',
          expect.any(Object)
        );
      });
  });

  it('should have a list of available statuses', () => {
    expect(component.availableStatuses).toEqual(['pending', 'packed', 'shipped', 'on_hold', 'cancelled']);
  });

  // Test ngOnDestroy if there are subscriptions to clean up (currently itemSubscription is commented out)
  // it('should unsubscribe from itemSubscription on destroy', () => {
  //   component.ngOnInit(); // To ensure subscription is made if logic changes
  //   const sub = component['itemSubscription']; // Access private member for test
  //   if (sub) { // Only if it was initialized
  //     const unsubscribeSpy = jest.spyOn(sub, 'unsubscribe');
  //     component.ngOnDestroy();
  //     expect(unsubscribeSpy).toHaveBeenCalled();
  //   } else {
  //     // If no subscription, this test can pass or be adapted
  //     component.ngOnDestroy(); // Call to ensure no errors
  //     expect(true).toBe(true); // Placeholder assertion
  _    //   }
  // });

});
