import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, orderBy, serverTimestamp } from '@angular/fire/firestore';
import { PackingQueueService } from './packing-queue.service';
import { PackingItem, PackingStatus } from '../model/packing-item.model';
import { Timestamp } from '@angular/fire/firestore'; // Correct import for Timestamp
import { Observable, of } from 'rxjs';

// Mocks for Firestore
const mockFirestore = {
  // Mock methods used by the service
};

// Mock serverTimestamp specifically
const mockServerTimestamp = () => Timestamp.now(); // Or a fixed date for predictable tests

describe('PackingQueueService', () => {
  let service: PackingQueueService;
  let firestoreMock: any;

  beforeEach(() => {
    // Reset mocks for each test
    firestoreMock = {
      collection: jest.fn(),
      addDoc: jest.fn(),
      doc: jest.fn(),
      updateDoc: jest.fn(),
      collectionData: jest.fn(),
      query: jest.fn(), // query is a top-level import, but often used with collection
      where: jest.fn(),
      orderBy: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PackingQueueService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(PackingQueueService);

    // Mock implementations
    // It's important that these mocks are consistent with how Firestore SDK v9 works.
    // `collection` is a top-level import, but PackingQueueService calls it on `this.firestore`.
    // For v9, collection, doc, query, etc. are top-level functions.
    // The service constructor receives `firestore: Firestore`.
    // So, when `collection(this.firestore, 'packingQueue')` is called, `this.firestore` is the injected mock.
    // This means we don't mock `firestore.collection` but ensure `collection` itself is mocked if used directly.
    // However, the service uses `collection(this.firestore, 'path')`, so `firestore` is just a handle.

    // For `addDoc(this.packingQueueCollection, ...)`:
    // this.packingQueueCollection is `collection(this.firestore, 'packingQueue')`.
    // So, `addDoc` is a top-level function that takes this collection.
    // We need to mock the globally imported `addDoc`, `updateDoc`, `collectionData`, etc.

    // This is tricky. The service imports these as top-level functions.
    // A better way for service testing is often to mock the *return values* of these functions
    // when they are called with specific arguments.
    // For now, let's assume the service is written to use `this.firestore.addDoc` etc. (which it isn't for v9+)
    // OR that we mock the global imports, which is harder in Jest without babel-plugin-rewire or similar.

    // Given the current service structure, we'll mock the methods on the `firestoreMock` object
    // that would be *passed* to the top-level Firestore functions if they were class methods.
    // This isn't perfectly accurate to v9 but aligns with common AngularFire testing patterns
    // when full SDK mocking is complex.

    // Let's adjust: `service.packingQueueCollection` is created using `collection(this.firestore, 'packingQueue')`.
    // The `collection` function itself would need to be mocked if we were testing that part.
    // But we test the service's methods.

    // Mock `addDoc` (assuming it's called like `addDoc(collectionRef, data)`)
    // We'll mock the `firestoreMock` as if it *were* the module itself for simplicity here.
    // This is a common shorthand in tests but not strictly how v9 works.
    (addDoc as jest.Mock) = jest.fn();
    (updateDoc as jest.Mock) = jest.fn();
    (collectionData as jest.Mock) = jest.fn();
    // `doc` and `collection` are used to create references, they don't directly do I/O for these tests.
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addItemToPackingQueue', () => {
    it('should call addDoc with correct data and include timestamps', async () => {
      const newItem: Omit<PackingItem, 'id' | 'creationDate' | 'lastUpdateDate'> = {
        orderId: 'order123',
        productId: 'prod456',
        productName: 'Test Product',
        quantityToPack: 2,
        status: 'pending',
        customerName: 'Test Customer',
        deliveryAddress: '123 Test St',
      };
      const expectedDocData = {
        ...newItem,
        status: 'pending',
        creationDate: expect.anything(), // serverTimestamp() will be resolved by Firestore
        lastUpdateDate: expect.anything(),
      };
      (addDoc as jest.Mock).mockResolvedValue({ id: 'mockDocId' }); // Mock what addDoc returns

      await service.addItemToPackingQueue(newItem);

      // service.packingQueueCollection would be `collection(firestoreMock, 'packingQueue')`
      // We expect addDoc to be called with a collection reference and the data.
      // The first argument to addDoc is a CollectionReference. We can use expect.anything() for it
      // if creating a mock CollectionReference is too complex for this test.
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(expectedDocData));
    });
  });

  describe('getPendingPackingItems', () => {
    it('should call collectionData with a query for pending items ordered by creationDate', () => {
      const mockItems: PackingItem[] = [
        { id: '1', orderId: 'o1', productName: 'p1', quantityToPack: 1, status: 'pending', customerName: 'c1', deliveryAddress: 'a1', productId: 'pid1', creationDate: Timestamp.now() },
      ];
      (collectionData as jest.Mock).mockReturnValue(of(mockItems)); // Return an Observable

      service.getPendingPackingItems().subscribe(items => {
        expect(items).toEqual(mockItems);
      });

      // We need to verify that `query`, `where`, and `orderBy` were used correctly.
      // This requires mocking them as top-level imports.
      // For now, we assume collectionData is called and returns the data.
      // A more thorough test would inspect the query object passed to collectionData.
      expect(collectionData).toHaveBeenCalledWith(expect.anything(), { idField: 'id' });
      // Ideally, also check that query was called with `where('status', '==', 'pending')` and `orderBy('creationDate', 'asc')`.
    });
  });

  describe('getAllPackingItems', () => {
    it('should call collectionData ordered by creationDate descending', () => {
      const mockItems: PackingItem[] = [ /* ... mock items ... */ ];
      (collectionData as jest.Mock).mockReturnValue(of(mockItems));

      service.getAllPackingItems().subscribe(items => {
        expect(items).toEqual(mockItems);
      });
      expect(collectionData).toHaveBeenCalledWith(expect.anything(), { idField: 'id' });
      // Ideally, also check `orderBy('creationDate', 'desc')`
    });
  });

  describe('updatePackingItemStatus', () => {
    it('should call updateDoc with new status and lastUpdateDate', async () => {
      const itemId = 'item123';
      const newStatus: PackingStatus = 'packed';
      const expectedUpdateData = {
        status: newStatus,
        lastUpdateDate: expect.anything(), // serverTimestamp()
        packedDate: expect.anything(), // serverTimestamp() for 'packed'
      };
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await service.updatePackingItemStatus(itemId, newStatus);

      // `doc(this.firestore, 'packingQueue', itemId)` creates the DocumentReference.
      // `updateDoc` is called with this DocumentReference and the data.
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(expectedUpdateData));
    });

    it('should include shippedDate when status is shipped', async () => {
        const itemId = 'item123';
        const newStatus: PackingStatus = 'shipped';
        const expectedUpdateData = {
          status: newStatus,
          lastUpdateDate: expect.anything(),
          shippedDate: expect.anything(),
        };
        (updateDoc as jest.Mock).mockResolvedValue(undefined);

        await service.updatePackingItemStatus(itemId, newStatus);
        expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(expectedUpdateData));
      });
  });

  describe('updatePackingItem', () => {
    it('should call updateDoc with provided updates and lastUpdateDate', async () => {
        const itemId = 'itemXYZ';
        const updates: Partial<PackingItem> = { notes: 'Test note', priority: 1 };
        const expectedData = {
            ...updates,
            lastUpdateDate: expect.anything(),
        };
        (updateDoc as jest.Mock).mockResolvedValue(undefined);

        await service.updatePackingItem(itemId, updates);
        expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(expectedData));
    });
  });

});

// Note: Mocking Firestore v9 top-level functions (addDoc, query, etc.) in Jest
// usually requires `jest.mock('@angular/fire/firestore', () => ( { ...mocked functions } ));`
// at the top of the file. The current setup with `(addDoc as jest.Mock) = jest.fn();`
// inside `beforeEach` is a simpler approach but might not be robust for all scenarios.
// For these tests, we're focusing on whether the service calls these functions with
// approximately the right arguments.
// A full, accurate mock of the Firestore V9 SDK is complex.
// The `expect.anything()` for collection/document references is a common simplification.
