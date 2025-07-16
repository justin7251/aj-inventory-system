import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, doc, updateDoc, collectionData, query, where, orderBy, serverTimestamp } from '@angular/fire/firestore';
import { PackingQueueService } from './packing-queue.service';
import { PackingItem, PackingStatus } from '../model/packing-item.model';
import { Timestamp } from '@angular/fire/firestore'; // Correct import for Timestamp
import { Observable, of } from 'rxjs';

// Keep track of original Firestore functions
const originalFirestore = {
  collection,
  addDoc,
  doc,
  updateDoc,
  collectionData,
  query,
  where,
  orderBy,
  serverTimestamp
};

// Spy on top-level Firestore functions
let spiedCollection: jasmine.Spy;
let spiedAddDoc: jasmine.Spy;
let spiedDoc: jasmine.Spy;
let spiedUpdateDoc: jasmine.Spy;
let spiedCollectionData: jasmine.Spy;
let spiedQuery: jasmine.Spy;
let spiedWhere: jasmine.Spy;
let spiedOrderBy: jasmine.Spy;
let spiedServerTimestamp: jasmine.Spy;


describe('PackingQueueService', () => {
  let service: PackingQueueService;
  let firestoreMock: Partial<Firestore>;


  beforeEach(() => {
    // Create spies before each test
    spiedCollection = jasmine.createSpy('collection').and.returnValue({}); // Mock collection to return a dummy ref
    spiedAddDoc = jasmine.createSpy('addDoc');
    spiedDoc = jasmine.createSpy('doc').and.returnValue({}); // Mock doc to return a dummy ref
    spiedUpdateDoc = jasmine.createSpy('updateDoc');
    spiedCollectionData = jasmine.createSpy('collectionData');
    spiedQuery = jasmine.createSpy('query').and.returnValue({}); // Mock query to return a dummy ref
    spiedWhere = jasmine.createSpy('where');
    spiedOrderBy = jasmine.createSpy('orderBy');
    spiedServerTimestamp = jasmine.createSpy('serverTimestamp').and.returnValue(Timestamp.now()); // Or a fixed date

    // Override global Firestore functions with spies
    (window as any).collection = spiedCollection;
    (window as any).addDoc = spiedAddDoc;
    (window as any).doc = spiedDoc;
    (window as any).updateDoc = spiedUpdateDoc;
    (window as any).collectionData = spiedCollectionData;
    (window as any).query = spiedQuery;
    (window as any).where = spiedWhere;
    (window as any).orderBy = spiedOrderBy;
    (window as any).serverTimestamp = spiedServerTimestamp;

    firestoreMock = {}; // No methods needed on Firestore instance itself for these tests

    TestBed.configureTestingModule({
      providers: [
        PackingQueueService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(PackingQueueService);

    // Default mock implementations for spies
    spiedAddDoc.and.returnValue(Promise.resolve({ id: 'mockDocId' } as any));
    spiedUpdateDoc.and.returnValue(Promise.resolve(undefined));
    // collectionData is more complex as it returns an Observable, set it per test or provide a generic Observable
  });

  afterEach(() => {
    // Restore original functions
    (window as any).collection = originalFirestore.collection;
    (window as any).addDoc = originalFirestore.addDoc;
    (window as any).doc = originalFirestore.doc;
    (window as any).updateDoc = originalFirestore.updateDoc;
    (window as any).collectionData = originalFirestore.collectionData;
    (window as any).query = originalFirestore.query;
    (window as any).where = originalFirestore.where;
    (window as any).orderBy = originalFirestore.orderBy;
    (window as any).serverTimestamp = originalFirestore.serverTimestamp;
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
        warehouseId: 'wh1'
      };
      const expectedDocData = {
        ...newItem,
        status: 'pending',
        creationDate: jasmine.anything(),
        lastUpdateDate: jasmine.anything(),
      };

      await service.addItemToPackingQueue(newItem);

      expect(spiedAddDoc).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining(expectedDocData));
      // Check that collection was called to create the packingQueueCollection reference
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'packingQueue');
    });
  });

  describe('getPendingPackingItems', () => {
    it('should call collectionData with a query for pending items ordered by creationDate', () => {
      const mockItems: PackingItem[] = [
        { id: '1', orderId: 'o1', productName: 'p1', quantityToPack: 1, status: 'pending', customerName: 'c1', deliveryAddress: 'a1', productId: 'pid1', creationDate: Timestamp.now(), warehouseId: 'wh1' },
      ];
      spiedCollectionData.and.returnValue(of(mockItems));

      service.getPendingPackingItems().subscribe(items => {
        expect(items).toEqual(mockItems);
      });

      expect(spiedCollectionData).toHaveBeenCalledWith(jasmine.anything(), { idField: 'id' });
      expect(spiedQuery).toHaveBeenCalledWith(jasmine.anything(), spiedWhere('status', '==', 'pending'), spiedOrderBy('creationDate', 'asc'));
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'packingQueue');
    });
  });

  describe('getAllPackingItems', () => {
    it('should call collectionData ordered by creationDate descending', () => {
      const mockItems: PackingItem[] = [ /* ... mock items ... */ ];
      spiedCollectionData.and.returnValue(of(mockItems));

      service.getAllPackingItems().subscribe(items => {
        expect(items).toEqual(mockItems);
      });
      expect(spiedCollectionData).toHaveBeenCalledWith(jasmine.anything(), { idField: 'id' });
      expect(spiedQuery).toHaveBeenCalledWith(jasmine.anything(), spiedOrderBy('creationDate', 'desc'));
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'packingQueue');
    });
  });

  describe('updatePackingItemStatus', () => {
    it('should call updateDoc with new status and lastUpdateDate', async () => {
      const itemId = 'item123';
      const newStatus: PackingStatus = 'packed';
      const expectedUpdateData = {
        status: newStatus,
        lastUpdateDate: jasmine.anything(),
        packedDate: jasmine.anything(),
      };

      await service.updatePackingItemStatus(itemId, newStatus);
      expect(spiedUpdateDoc).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining(expectedUpdateData));
      expect(spiedDoc).toHaveBeenCalledWith(firestoreMock as Firestore, 'packingQueue', itemId);
    });

    it('should include shippedDate when status is shipped', async () => {
        const itemId = 'item123';
        const newStatus: PackingStatus = 'shipped';
        const expectedUpdateData = {
          status: newStatus,
          lastUpdateDate: jasmine.anything(),
          shippedDate: jasmine.anything(),
        };
        await service.updatePackingItemStatus(itemId, newStatus);
        expect(spiedUpdateDoc).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining(expectedUpdateData));
        expect(spiedDoc).toHaveBeenCalledWith(firestoreMock as Firestore, 'packingQueue', itemId);
      });
  });

  describe('updatePackingItem', () => {
    it('should call updateDoc with provided updates and lastUpdateDate', async () => {
        const itemId = 'itemXYZ';
        const updates: Partial<PackingItem> = { notes: 'Test note', priority: 1 };
        const expectedData = {
            ...updates,
            lastUpdateDate: jasmine.anything(),
        };
        await service.updatePackingItem(itemId, updates);
        expect(spiedUpdateDoc).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining(expectedData));
        expect(spiedDoc).toHaveBeenCalledWith(firestoreMock as Firestore, 'packingQueue', itemId);
    });
  });

});
