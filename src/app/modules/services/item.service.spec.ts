import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, doc, updateDoc, runTransaction, query, where, collectionData, serverTimestamp, Timestamp, DocumentReference } from '@angular/fire/firestore';
import { ItemService } from './item.service';
import { PackingQueueService } from './packing-queue.service';
import { Order, OrderItem } from '../model/order.model';
import { Product } from '../model/product.model';
import { of } from 'rxjs';

// Mocks for Firestore and PackingQueueService
const mockFirestore = {
  // We won't mock individual Firestore functions here if not directly testing their usage by ItemService's own logic,
  // but rather focus on the interaction with PackingQueueService.
  // However, addOrder itself uses runTransaction, addDoc, query, collectionData.
};

const mockPackingQueueService = {
  addItemToPackingQueue: jest.fn(),
};

// Mock top-level Firestore functions that ItemService uses
jest.mock('@angular/fire/firestore', () => {
  const originalModule = jest.requireActual('@angular/fire/firestore');
  return {
    ...originalModule,
    runTransaction: jest.fn(),
    addDoc: jest.fn(),
    collection: jest.fn().mockReturnValue({}), // Mock collection to return a dummy ref
    doc: jest.fn().mockReturnValue({}),       // Mock doc to return a dummy ref
    query: jest.fn(),
    where: jest.fn(),
    collectionData: jest.fn(),
    serverTimestamp: jest.fn(() => Timestamp.now()), // Mock serverTimestamp
  };
});


describe('ItemService', () => {
  let service: ItemService;
  let packingQueueServiceMock: PackingQueueService;
  let firestoreOps: { // To access the mocked top-level functions
    mockedRunTransaction: jest.Mock,
    mockedAddDoc: jest.Mock,
    mockedCollectionData: jest.Mock
  };

  const mockProduct: Product = {
    id: 'prod1',
    product_no: 'SKU007',
    product_name: 'Test Product',
    color: 'Blue',
    quantity: 10,
    product_type: 'Testable',
    price: 100,
    costPrice: 50,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ItemService,
        { provide: Firestore, useValue: mockFirestore }, // ItemService expects Firestore instance
        { provide: PackingQueueService, useValue: mockPackingQueueService }
      ]
    });
    service = TestBed.inject(ItemService);
    packingQueueServiceMock = TestBed.inject(PackingQueueService);

    // Assign mocked functions to an object for easier access in tests
    firestoreOps = {
        mockedRunTransaction: runTransaction as jest.Mock,
        mockedAddDoc: addDoc as jest.Mock,
        mockedCollectionData: collectionData as jest.Mock,
    };

    // Reset mocks before each test
    firestoreOps.mockedRunTransaction.mockReset();
    firestoreOps.mockedAddDoc.mockReset();
    firestoreOps.mockedCollectionData.mockReset();
    mockPackingQueueService.addItemToPackingQueue.mockReset();

    // Default mock implementations
    firestoreOps.mockedRunTransaction.mockImplementation(async (firestore, transactionExecutor) => {
      // Simulate transaction execution
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }), // Simulate doc not existing initially
        set: jest.fn(),
        update: jest.fn(),
      };
      await transactionExecutor(mockTransaction);
    });
    // Mock addDoc for the order itself to return a mock DocumentReference
    firestoreOps.mockedAddDoc.mockResolvedValue({ id: 'newOrderId123' } as DocumentReference<Order>);
    // Mock collectionData for product lookups (used in earnings calculation)
    firestoreOps.mockedCollectionData.mockReturnValue(of([mockProduct])); // Returns an Observable of Product array
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addOrder', () => {
    const orderItem: OrderItem = {
      product_no: 'SKU007',
      product_name: 'Test Product',
      quantity: 2,
      item_cost: 200, // Total for this line item
    };
    const orderData: Order = {
      user_id: 'userTest1',
      customer_name: 'John Doe',
      telephone: 1234567890,
      delivery_address: '123 Main St',
      payment_type: 'Credit Card',
      items: [orderItem],
      delivery_cost: 10,
      discount: 5,
      total_cost: 205, // (200 + 10 - 5)
      // created_date will be serverTimestamp
    };

    it('should add order to Firestore and then add items to packing queue', async () => {
      mockPackingQueueService.addItemToPackingQueue.mockResolvedValue(Promise.resolve({ id: 'packingItemId' } as any));

      const newOrderRef = await service.addOrder(orderData);

      expect(newOrderRef).toBeDefined();
      expect(newOrderRef.id).toBe('newOrderId123');
      expect(firestoreOps.mockedAddDoc).toHaveBeenCalledTimes(1); // For the order itself
      // addDoc is called with a collection ref and the order data.
      // Check some key properties of the order data passed to addDoc.
      expect(firestoreOps.mockedAddDoc).toHaveBeenCalledWith(
        expect.anything(), // The collection reference
        expect.objectContaining({
          customer_name: 'John Doe',
          total_cost: 205,
          totalEarnings: expect.any(Number), // Earnings calculation involves product lookup
        })
      );

      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledTimes(orderData.items.length);
      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'newOrderId123',
          productId: orderItem.product_no,
          productName: orderItem.product_name,
          quantityToPack: orderItem.quantity,
          status: 'pending',
          customerName: orderData.customer_name,
          deliveryAddress: orderData.delivery_address,
        })
      );
    });

    it('should calculate totalEarnings based on product costPrice', async () => {
        // costPrice = 50, quantity = 2, item_cost (line item total selling price) = 200
        // Expected earning for this item: 200 - (2 * 50) = 100
        const expectedTotalEarnings = (orderItem.item_cost) - (orderItem.quantity * (mockProduct.costPrice || 0));

        await service.addOrder(orderData);

        expect(firestoreOps.mockedAddDoc).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ totalEarnings: expectedTotalEarnings })
        );
        // Verify product lookup was attempted
        expect(firestoreOps.mockedCollectionData).toHaveBeenCalledWith(
            expect.anything(), // The query for product
            { idField: 'id' }
        );
    });

    it('should handle orders with no items gracefully for packing queue part', async () => {
      const orderWithNoItems: Order = { ...orderData, items: [] };

      await service.addOrder(orderWithNoItems);

      expect(firestoreOps.mockedAddDoc).toHaveBeenCalledTimes(1); // Order still added
      expect(packingQueueServiceMock.addItemToPackingQueue).not.toHaveBeenCalled();
    });

    it('should log a warning and skip packing item if orderItem is missing product_no or quantity', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const invalidItem: OrderItem = { product_no: '', quantity: 0, item_cost: 0 }; // Invalid
        const orderWithInvalidItem: Order = { ...orderData, items: [invalidItem] };

        await service.addOrder(orderWithInvalidItem);

        expect(packingQueueServiceMock.addItemToPackingQueue).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith('Skipping packing item due to missing product_no or quantity:', invalidItem);

        consoleWarnSpy.mockRestore();
    });

    it('should handle errors from packingQueueService.addItemToPackingQueue', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const packingError = new Error('Failed to add to queue');
      mockPackingQueueService.addItemToPackingQueue.mockRejectedValue(packingError);

      await service.addOrder(orderData);

      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to add item ${orderItem.product_no} to packing queue for order newOrderId123:`,
        packingError
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
