import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { ItemService, GenericRecordData } from './item.service';

// Mock top-level Firestore functions used by ItemService
jest.mock('@angular/fire/firestore', () => {
  const originalModule = jest.requireActual('@angular/fire/firestore');
  return {
    ...originalModule,
    addDoc: jest.fn(),
    collection: jest.fn().mockReturnValue({}), // Mock collection to return a dummy ref
    serverTimestamp: jest.fn(() => 'mocked_server_timestamp'), // Mock serverTimestamp to return a placeholder
  };
});

describe('ItemService', () => {
  let service: ItemService;
  let firestoreMock: Partial<Firestore>; // Use Partial for simpler mocking if not all methods needed
  let mockedAddDoc: jest.Mock;

  beforeEach(() => {
    // Simple mock for Firestore if only specific functionalities are needed by the slimmed-down service
    firestoreMock = {
      // No methods needed to be mocked on the Firestore instance itself for addRecord
    };

    TestBed.configureTestingModule({
      providers: [
        ItemService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(ItemService);

    // Assign mocked top-level function
    mockedAddDoc = addDoc as jest.Mock;
    mockedAddDoc.mockReset();

    // Default mock implementation for addDoc
    mockedAddDoc.mockResolvedValue({ id: 'newRecordId123' } as any); // Cast to any to satisfy DocumentReference<T>
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addRecord', () => {
    const recordData: GenericRecordData = {
      uid: 'user123',
      name: 'Test Record',
      product_no: 'PN001',
      cost: 10.00,
      selling_price: 20.00
    };

    it('should call addDoc with the correct parameters and data', async () => {
      await service.addRecord(recordData);

      expect(mockedAddDoc).toHaveBeenCalledTimes(1);
      expect(mockedAddDoc).toHaveBeenCalledWith(
        expect.anything(), // The collection reference from collection()
        {
          user_id: recordData.uid,
          name: recordData.name,
          product_no: recordData.product_no,
          cost: recordData.cost,
          selling_price: recordData.selling_price,
          created: 'mocked_server_timestamp' // From our serverTimestamp mock
        }
      );
    });

    it('should return the result of addDoc', async () => {
      const expectedResult = { id: 'newRecordId123' };
      mockedAddDoc.mockResolvedValue(expectedResult as any);

      const result = await service.addRecord(recordData);
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors from addDoc', async () => {
      const expectedError = new Error('Firestore error');
      mockedAddDoc.mockRejectedValue(expectedError);

      await expect(service.addRecord(recordData)).rejects.toThrow('Firestore error');
    });
  });
});
