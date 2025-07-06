import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, serverTimestamp, query, where, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { ProductService, ProductRestockData } from './product.service';
import { Product } from '../model/product.model';
import { of } from 'rxjs';

// Keep track of original Firestore functions
const originalFirestore = {
  addDoc,
  collection,
  doc,
  updateDoc,
  query,
  where,
  collectionData,
  serverTimestamp
};

// Spy on top-level Firestore functions
let spiedAddDoc: jasmine.Spy;
let spiedCollection: jasmine.Spy;
let spiedDoc: jasmine.Spy;
let spiedUpdateDoc: jasmine.Spy;
let spiedQuery: jasmine.Spy;
let spiedWhere: jasmine.Spy;
let spiedCollectionData: jasmine.Spy;
let spiedServerTimestamp: jasmine.Spy;


describe('ProductService', () => {
  let service: ProductService;
  let firestoreMock: Partial<Firestore>;


  beforeEach(() => {
    // Create spies before each test
    spiedAddDoc = jasmine.createSpy('addDoc');
    spiedCollection = jasmine.createSpy('collection').and.returnValue({});
    spiedDoc = jasmine.createSpy('doc').and.returnValue({});
    spiedUpdateDoc = jasmine.createSpy('updateDoc');
    spiedQuery = jasmine.createSpy('query').and.returnValue({});
    spiedWhere = jasmine.createSpy('where');
    spiedCollectionData = jasmine.createSpy('collectionData');
    spiedServerTimestamp = jasmine.createSpy('serverTimestamp').and.returnValue('mocked_server_timestamp');


    // Override global Firestore functions with spies
    (global as any).addDoc = spiedAddDoc;
    (global as any).collection = spiedCollection;
    (global as any).doc = spiedDoc;
    (global as any).updateDoc = spiedUpdateDoc;
    (global as any).query = spiedQuery;
    (global as any).where = spiedWhere;
    (global as any).collectionData = spiedCollectionData;
    (global as any).serverTimestamp = spiedServerTimestamp;

    firestoreMock = {};

    TestBed.configureTestingModule({
      providers: [
        ProductService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(ProductService);


    // Default mock implementations
    spiedAddDoc.and.returnValue(Promise.resolve({ id: 'newProductId' } as any));
    spiedUpdateDoc.and.returnValue(Promise.resolve(undefined));
  });

  afterEach(() => {
    // Restore original functions
    (global as any).addDoc = originalFirestore.addDoc;
    (global as any).collection = originalFirestore.collection;
    (global as any).doc = originalFirestore.doc;
    (global as any).updateDoc = originalFirestore.updateDoc;
    (global as any).query = originalFirestore.query;
    (global as any).where = originalFirestore.where;
    (global as any).collectionData = originalFirestore.collectionData;
    (global as any).serverTimestamp = originalFirestore.serverTimestamp;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addProduct', () => {
    const productData: Product = {
      product_no: 'P123',
      product_name: 'Test Product',
      quantity: 10,
      price: 100,
      costPrice: 50,
      color: 'Red',
      product_type: 'A'
    };

    it('should call addDoc with correct product data and server timestamp', async () => {
      await service.addProduct(productData);
      expect(spiedAddDoc).toHaveBeenCalledTimes(1);
      expect(spiedAddDoc).toHaveBeenCalledWith(
        jasmine.anything(),
        {
          ...productData,
          quantity: 10,
          price: 100,
          costPrice: 50,
          created_date: 'mocked_server_timestamp'
        }
      );
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'products');
    });

    it('should return the result from addDoc', async () => {
      const expectedResult = { id: 'newProductId' };
      // spiedAddDoc already configured in beforeEach
      const result = await service.addProduct(productData);
      expect(result.id).toBe('newProductId');
    });
  });

  describe('updateProductUponRestock', () => {
    const restockData: ProductRestockData = {
      product_no: 'P123',
      product_name: 'Test Product Restocked',
      quantity: 5,
      price: 55,
      color: 'Red',
      product_type: 'A'
    };

    const existingProduct: Product & { id: string } = {
      id: 'existingProdId',
      product_no: 'P123',
      product_name: 'Test Product',
      quantity: 10,
      price: 100,
      costPrice: 50,
      color: 'Red',
      product_type: 'A'
    };

    it('should update existing product quantity and costPrice if product_no exists', async () => {
      spiedCollectionData.and.returnValue(of([existingProduct]));

      await service.updateProductUponRestock(restockData);

      expect(spiedCollectionData).toHaveBeenCalled();
      expect(spiedUpdateDoc).toHaveBeenCalledTimes(1);
      expect(spiedUpdateDoc).toHaveBeenCalledWith(
        jasmine.anything(),
        {
          quantity: existingProduct.quantity + restockData.quantity,
          costPrice: restockData.price
        }
      );
      expect(spiedDoc).toHaveBeenCalledWith(firestoreMock as Firestore, 'products', existingProduct.id);
      expect(spiedAddDoc).not.toHaveBeenCalled();
    });

    it('should add a new product if product_no does not exist', async () => {
      spiedCollectionData.and.returnValue(of([]));

      await service.updateProductUponRestock(restockData);

      expect(spiedCollectionData).toHaveBeenCalled();
      expect(spiedAddDoc).toHaveBeenCalledTimes(1);
      expect(spiedAddDoc).toHaveBeenCalledWith(
        jasmine.anything(),
        {
          product_no: restockData.product_no,
          product_name: restockData.product_name,
          color: restockData.color,
          costPrice: restockData.price,
          price: (restockData.price * 120 / 100),
          quantity: restockData.quantity,
          created_date: 'mocked_server_timestamp',
          product_type: restockData.product_type || ''
        }
      );
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'products');
      expect(spiedUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('getAllProducts', () => {
    it('should call collectionData for the products collection', () => {
      spiedCollectionData.and.returnValue(of([]));
      service.getAllProducts();
      expect(spiedCollectionData).toHaveBeenCalledWith(jasmine.anything(), { idField: 'id' });
      expect(spiedQuery).toHaveBeenCalledWith(jasmine.anything()); // Query without where/orderBy
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'products');
    });
  });

  describe('getLowStockProducts', () => {
    it('should call collectionData with a query for low stock', () => {
      spiedCollectionData.and.returnValue(of([]));
      const threshold = 5;
      service.getLowStockProducts(threshold);
      expect(spiedCollectionData).toHaveBeenCalledWith(jasmine.anything(), { idField: 'id' });
      expect(spiedQuery).toHaveBeenCalledWith(jasmine.anything(), spiedWhere('quantity', '<=', threshold));
      expect(spiedCollection).toHaveBeenCalledWith(firestoreMock as Firestore, 'products');
    });
  });

});
