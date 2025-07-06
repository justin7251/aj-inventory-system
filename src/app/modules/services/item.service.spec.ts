import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { ItemService } from './item.service'; // Removed GenericRecordData as it's not exported
import { ItemRecordData } from './item.service'; // Import ItemRecordData instead

// Keep track of original Firestore functions
const originalFirestore = {
  collection,
  addDoc,
  serverTimestamp
};

// Spy on top-level Firestore functions
let spiedAddDoc: jasmine.Spy;
let spiedCollection: jasmine.Spy;
let spiedServerTimestamp: jasmine.Spy;


describe('ItemService', () => {
  let service: ItemService;
  let firestoreMock: Partial<Firestore>;

  beforeEach(() => {
    // Create spies before each test
    spiedAddDoc = jasmine.createSpy('addDoc');
    spiedCollection = jasmine.createSpy('collection').and.returnValue({}); // Mock collection to return a dummy ref
    spiedServerTimestamp = jasmine.createSpy('serverTimestamp').and.returnValue('mocked_server_timestamp');

    // Override global Firestore functions with spies
    (global as any).addDoc = spiedAddDoc;
    (global as any).collection = spiedCollection;
    (global as any).serverTimestamp = spiedServerTimestamp;


    firestoreMock = {}; // No methods needed on Firestore instance for these tests

    TestBed.configureTestingModule({
      providers: [
        ItemService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(ItemService);

    // Default mock implementation for addDoc for most tests
    spiedAddDoc.and.returnValue(Promise.resolve({ id: 'newRecordId123' } as any));
  });

  afterEach(() => {
    // Restore original functions after each test to avoid interference
    (global as any).addDoc = originalFirestore.addDoc;
    (global as any).collection = originalFirestore.collection;
    (global as any).serverTimestamp = originalFirestore.serverTimestamp;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addRecord', () => {
    const recordData: ItemRecordData = { // Use ItemRecordData
      // uid: 'user123', // Removed uid as it's not part of ItemRecordData
      name: 'Test Record',
      product_no: 'PN001',
      cost: 10.00,
      selling_price: 20.00
    };
    const userId = 'testUserId'; // Added userId for addRecord

    it('should call addDoc with the correct parameters and data', async () => {
      await service.addRecord(userId, recordData); // Pass userId

      expect(spiedAddDoc).toHaveBeenCalledTimes(1);
      expect(spiedAddDoc).toHaveBeenCalledWith(
        jasmine.anything(), // The collection reference from collection()
        {
          userId: userId, // Changed recordData.uid to userId
          name: recordData.name,
          product_no: recordData.product_no,
          cost: recordData.cost,
          selling_price: recordData.selling_price,
          created: 'mocked_server_timestamp'
        }
      );
       // Verify collection was called (optional, but good for completeness)
       expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'products');
    });

    it('should return the result of addDoc', async () => {
      const expectedResult = { id: 'newRecordId123' };
      // spiedAddDoc is already configured to return this in beforeEach
      const result = await service.addRecord(userId, recordData); // Pass userId
      expect(result.id).toEqual(expectedResult.id); // Compare id only
    });

    it('should handle errors from addDoc', async () => {
      const expectedError = new Error('Firestore error');
      spiedAddDoc.and.returnValue(Promise.reject(expectedError));

      try {
        await service.addRecord(userId, recordData); // Pass userId
        fail('addRecord should have thrown an error');
      } catch (error) {
        expect(error).toBe(expectedError);
      }
    });
  });
});
