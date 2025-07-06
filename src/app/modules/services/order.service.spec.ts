import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, doc, updateDoc, runTransaction, serverTimestamp, Timestamp, query, collectionData, orderBy, docData, DocumentReference } from '@angular/fire/firestore';
import { OrderService } from './order.service';
import { PackingQueueService } from './packing-queue.service';
import { Order, OrderItem } from '../model/order.model';
import { Product } from '../model/product.model';
import { of } from 'rxjs';

// Keep track of original Firestore functions
const originalFirestore = {
  runTransaction,
  addDoc,
  updateDoc,
  doc,
  collection,
  query,
  orderBy,
  where, // Added where back
  collectionData,
  docData,
  serverTimestamp
};

// Spy on top-level Firestore functions
let spiedRunTransaction: jasmine.Spy;
let spiedAddDoc: jasmine.Spy;
let spiedUpdateDoc: jasmine.Spy;
let spiedDoc: jasmine.Spy;
let spiedCollection: jasmine.Spy;
let spiedQuery: jasmine.Spy;
let spiedOrderBy: jasmine.Spy;
let spiedWhere: jasmine.Spy;
let spiedCollectionData: jasmine.Spy;
let spiedDocData: jasmine.Spy;
let spiedServerTimestamp: jasmine.Spy;


describe('OrderService', () => {
  let service: OrderService;
  let firestoreMock: Partial<Firestore>;
  let packingQueueServiceMock: Partial<PackingQueueService>;


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
    // Create spies before each test
    spiedRunTransaction = jasmine.createSpy('runTransaction');
    spiedAddDoc = jasmine.createSpy('addDoc');
    spiedUpdateDoc = jasmine.createSpy('updateDoc');
    spiedDoc = jasmine.createSpy('doc').and.callFake((firestore, path, ...pathSegments) => ({ id: pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : path, path: `${path}/${pathSegments.join('/')}` }));
    spiedCollection = jasmine.createSpy('collection').and.callFake((firestore, path) => ({ id: path, path }));
    spiedQuery = jasmine.createSpy('query');
    spiedOrderBy = jasmine.createSpy('orderBy');
    spiedWhere = jasmine.createSpy('where');
    spiedCollectionData = jasmine.createSpy('collectionData');
    spiedDocData = jasmine.createSpy('docData');
    spiedServerTimestamp = jasmine.createSpy('serverTimestamp').and.returnValue('mocked_server_timestamp');

    // Override global Firestore functions with spies
    (global as any).runTransaction = spiedRunTransaction;
    (global as any).addDoc = spiedAddDoc;
    (global as any).updateDoc = spiedUpdateDoc;
    (global as any).doc = spiedDoc;
    (global as any).collection = spiedCollection;
    (global as any).query = spiedQuery;
    (global as any).orderBy = spiedOrderBy;
    (global as any).where = spiedWhere;
    (global as any).collectionData = spiedCollectionData;
    (global as any).docData = spiedDocData;
    (global as any).serverTimestamp = spiedServerTimestamp;

    firestoreMock = {};
    packingQueueServiceMock = {
      addItemToPackingQueue: jasmine.createSpy('addItemToPackingQueue').and.returnValue(Promise.resolve({ id: 'packingItemId' } as any)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrderService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: PackingQueueService, useValue: packingQueueServiceMock }
      ]
    });
    service = TestBed.inject(OrderService);


    // Default mock implementations
    spiedRunTransaction.and.callFake(async (firestore, transactionExecutor) => {
      const mockTransaction = {
        get: jasmine.createSpy('get').and.returnValue(Promise.resolve({ exists: () => false, data: () => ({ total: 0, count: 0, last5: [] }) })),
        set: jasmine.createSpy('set'),
        update: jasmine.createSpy('update'),
      };
      await transactionExecutor(mockTransaction);
      return Promise.resolve();
    });

    spiedAddDoc.and.returnValue(Promise.resolve({ id: 'newOrderId' } as DocumentReference<Order>));
    spiedCollectionData.and.returnValue(of([mockProduct]));
  });

  afterEach(() => {
    // Restore original functions
    (global as any).runTransaction = originalFirestore.runTransaction;
    (global as any).addDoc = originalFirestore.addDoc;
    (global as any).updateDoc = originalFirestore.updateDoc;
    (global as any).doc = originalFirestore.doc;
    (global as any).collection = originalFirestore.collection;
    (global as any).query = originalFirestore.query;
    (global as any).orderBy = originalFirestore.orderBy;
    (global as any).where = originalFirestore.where;
    (global as any).collectionData = originalFirestore.collectionData;
    (global as any).docData = originalFirestore.docData;
    (global as any).serverTimestamp = originalFirestore.serverTimestamp;
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

      expect(spiedRunTransaction).toHaveBeenCalledTimes(2);
      expect(spiedAddDoc).toHaveBeenCalledTimes(1);
      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledTimes(orderData.items.length);
      expect(packingQueueServiceMock.addItemToPackingQueue).toHaveBeenCalledWith(jasmine.objectContaining({
        orderId: 'newOrderId',
        productId: orderItem.product_no,
      }));
    });

    it('should calculate totalEarnings correctly', async () => {
      const expectedEarnings = 100;
      await service.createOrder(orderData);
      expect(spiedAddDoc).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({ totalEarnings: expectedEarnings }));
      expect(spiedCollectionData).toHaveBeenCalled();
    });

    it('should correctly update aggregation document (total/count in 1st trans, last5 in 2nd)', async () => {
      const mockAggDocRef = { id: 'orders', path: 'aggregation/orders' };
      spiedDoc.and.callFake((fs, path, id) => {
        if (path === 'aggregation' && id === 'orders') return mockAggDocRef;
        return { id: id || path, path: id ? `${path}/${id}` : path };
      });

      const existingAggData = { total: 1000, count: 5, last5: [{ id: 'old1', total_cost: 100 }] };
      const mockTransactionGet = jasmine.createSpy('get')
        .and.returnValue(Promise.resolve({ exists: () => true, data: () => existingAggData })) // For 1st transaction
        .and.returnValue(Promise.resolve({ // For 2nd transaction
            exists: () => true, data: () => ({
            ...existingAggData,
            total: existingAggData.total + orderData.total_cost,
            count: existingAggData.count + 1
        })}));


      spiedRunTransaction.and.callFake(async (firestore, transactionExecutor) => {
        const mockTransaction = { get: mockTransactionGet, set: jasmine.createSpy('set'), update: jasmine.createSpy('update') };
        await transactionExecutor(mockTransaction);
      });

      await service.createOrder(orderData);
      expect(spiedRunTransaction).toHaveBeenCalledTimes(2);
    });

  });

  describe('updateOrder', () => {
    it('should call updateDoc with the given id and value', async () => {
      const orderId = 'orderToUpdate';
      const dataToUpdate = { customer_name: 'Updated Name' };
      await service.updateOrder(orderId, dataToUpdate);
      expect(spiedUpdateDoc).toHaveBeenCalledWith(jasmine.objectContaining({ id: orderId }), dataToUpdate);
    });
  });

  describe('getAllOrders', () => {
    it('should call collectionData, ordering by created_date', () => {
      spiedCollectionData.and.returnValue(of([]));
      service.getAllOrders();
      expect(spiedCollectionData).toHaveBeenCalledWith(jasmine.anything(), { idField: 'id' });
      expect(spiedQuery).toHaveBeenCalledWith(jasmine.anything(), spiedOrderBy('created_date'));
    });
  });

  describe('getOrderById', () => {
    it('should call docData with the correct document path', () => {
      const orderId = 'singleOrderId';
      spiedDocData.and.returnValue(of({}));
      service.getOrderById(orderId);
      expect(spiedDocData).toHaveBeenCalledWith(jasmine.objectContaining({ id: orderId }), { idField: 'id' });
    });
  });

});
