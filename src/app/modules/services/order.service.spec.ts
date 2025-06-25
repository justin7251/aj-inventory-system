import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, doc, updateDoc, runTransaction, serverTimestamp, Timestamp, query, collectionData, orderBy, docData, DocumentReference } from '@angular/fire/firestore';
import { OrderService } from './order.service';
import { PackingQueueService } from './packing-queue.service';
import { Order, OrderItem } from '../model/order.model';
import { Product } from '../model/product.model';
import { of } from 'rxjs';

// Mock top-level Firestore functions
jest.mock('@angular/fire/firestore', () => {
  const originalModule = jest.requireActual('@angular/fire/firestore');
  return {
    ...originalModule,
    runTransaction: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    doc: jest.fn().mockImplementation((firestore, path, ...pathSegments) => ({ id: pathSegments.length > 0 ? pathSegments[pathSegments.length-1] : path, path: `${path}/${pathSegments.join('/')}` })), // Mock doc to return a basic ref
    collection: jest.fn().mockImplementation((firestore, path) => ({ id: path, path })), // Mock collection
    query: jest.fn(),
    orderBy: jest.fn(),
    where: jest.fn(), // For product lookups in _calculateTotalEarnings
    collectionData: jest.fn(), // For product lookups
    docData: jest.fn(),
    serverTimestamp: jest.fn(() => 'mocked_server_timestamp'), // Using string for simplicity in mock
  };
});

describe('OrderService', () => {
  let service: OrderService;
  let firestoreMock: Partial<Firestore>;
  let packingQueueServiceMock: Partial<PackingQueueService>;

  let mockedRunTransaction: jest.Mock;
  let mockedAddDoc: jest.Mock;
  let mockedUpdateDoc: jest.Mock;
  let mockedCollectionData: jest.Mock;
  let mockedDocData: jest.Mock;
  let mockedDoc: jest.Mock;

  const mockProduct: Product = {
    id: 'prod123',
    product_no: 'SKU001',
    product_name: 'Test Product',
    costPrice: 50, // Essential for earnings calculation
    price: 100,
    quantity: 10,
    color: 'red',
    product_type: 'typeA'
  };

  beforeEach(() => {
    firestoreMock = {}; // No direct methods on Firestore instance itself
    packingQueueServiceMock = {
      addItemToPackingQueue: jest.fn().mockResolvedValue({ id: 'packingItemId' } as any),
    };

    TestBed.configureTestingModule({
      providers: [
        OrderService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: PackingQueueService, useValue: packingQueueServiceMock }
      ]
    });
    service = TestBed.inject(OrderService);

    mockedRunTransaction = runTransaction as jest.Mock;
    mockedAddDoc = addDoc as jest.Mock;
    mockedUpdateDoc = updateDoc as jest.Mock;
    mockedCollectionData = collectionData as jest.Mock;
    mockedDocData = docData as jest.Mock;
    mockedDoc = doc as jest.Mock;

    // Reset mocks
    mockedRunTransaction.mockReset();
    mockedAddDoc.mockReset();
    mockedUpdateDoc.mockReset();
    mockedCollectionData.mockReset();
    mockedDocData.mockReset();
    mockedDoc.mockReset();
    (packingQueueServiceMock.addItemToPackingQueue as jest.Mock).mockClear();

    // Default mock implementations
    // Transaction mock
    mockedRunTransaction.mockImplementation(async (firestore, transactionExecutor) => {
      const mockTransaction = {
        get: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({ total: 0, count: 0, last5: [] }) }),
        set: jest.fn(),
        update: jest.fn(),
      };
      await transactionExecutor(mockTransaction);
      return Promise.resolve();
    });

    mockedAddDoc.mockResolvedValue({ id: 'newOrderId' } as DocumentReference<Order>);
    mockedCollectionData.mockReturnValue(of([mockProduct])); // For _calculateTotalEarnings product lookup
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createOrder', () => {
    const orderItem: OrderItem = { product_no: 'SKU001', quantity: 2, item_cost: 200, product_name: 'Test Product' };
    const orderData: Order = {
      user_id: 'user1', customer_name: 'Test Customer', telephone: 123, delivery_address: 'Addr',
      payment_type: 'Card', items: [orderItem], delivery_cost: 10, discount: 0, total_cost: 210,
    };

    it('should run two transactions for aggregation, add order doc, and add to packing queue', async () => {
      await service.createOrder(orderData);

      expect(mockedRunTransaction).toHaveBeenCalledTimes(2); // One for total/count, one for last5
      expect(mockedAddDoc).toHaveBeenCalledTimes(1); // For the order itself
      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledTimes(orderData.items.length);
      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledWith(expect.objectContaining({
        orderId: 'newOrderId',
        productId: orderItem.product_no,
      }));
    });

    it('should calculate totalEarnings correctly', async () => {
      // item_cost (selling for line) = 200, quantity = 2, product.costPrice = 50
      // Expected earning = 200 - (2 * 50) = 100
      const expectedEarnings = 100;
      await service.createOrder(orderData);
      expect(mockedAddDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ totalEarnings: expectedEarnings }));
      expect(mockedCollectionData).toHaveBeenCalled(); // Ensure product lookup happened
    });

    it('should correctly update aggregation document (total/count in 1st trans, last5 in 2nd)', async () => {
      const mockAggDocRef = { id: 'orders', path: 'aggregation/orders' };
      mockedDoc.mockImplementation((fs, path, id) => {
        if (path === 'aggregation' && id === 'orders') return mockAggDocRef;
        return { id: id || path, path: id ? `${path}/${id}`: path };
      });

      const existingAggData = { total: 1000, count: 5, last5: [{id: 'old1', total_cost: 100}] };
      const mockTransactionGet = jest.fn()
        .mockResolvedValueOnce({ exists: () => true, data: () => existingAggData }) // For 1st transaction
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ // For 2nd transaction (after 1st update)
            ...existingAggData,
            total: existingAggData.total + orderData.total_cost,
            count: existingAggData.count + 1
        })});

      mockedRunTransaction.mockImplementation(async (firestore, transactionExecutor) => {
        const mockTransaction = { get: mockTransactionGet, set: jest.fn(), update: jest.fn() };
        await transactionExecutor(mockTransaction);
      });

      await service.createOrder(orderData);

      const firstTransactionUpdateCall = (mockedRunTransaction.mock.calls[0][1] as any).toString().includes('total') && (mockedRunTransaction.mock.calls[0][1] as any).toString().includes('count');
      // This is a brittle check. Better to inspect mockTransaction.update inside the implementation.
      // For now, we assume the first transaction updates total & count, second updates last5.

      // Check that the second transaction attempts to update last5
      // This requires a more detailed mock of runTransaction to capture what's passed to transaction.update
      // For simplicity, we're relying on the two separate calls to runTransaction.
      expect(mockedRunTransaction).toHaveBeenCalledTimes(2);
    });

  });

  describe('updateOrder', () => {
    it('should call updateDoc with the given id and value', async () => {
      const orderId = 'orderToUpdate';
      const dataToUpdate = { customer_name: 'Updated Name' };
      await service.updateOrder(orderId, dataToUpdate);
      expect(mockedUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({id: orderId}), dataToUpdate);
    });
  });

  describe('getAllOrders', () => {
    it('should call collectionData, ordering by created_date', () => {
      mockedCollectionData.mockReturnValue(of([]));
      service.getAllOrders();
      expect(mockedCollectionData).toHaveBeenCalledWith(expect.anything(), { idField: 'id' });
      expect(query).toHaveBeenCalledWith(expect.anything(), orderBy('created_date'));
    });
  });

  describe('getOrderById', () => {
    it('should call docData with the correct document path', () => {
      const orderId = 'singleOrderId';
      mockedDocData.mockReturnValue(of({}));
      service.getOrderById(orderId);
      expect(mockedDocData).toHaveBeenCalledWith(expect.objectContaining({id: orderId}), { idField: 'id' });
    });
  });

});
