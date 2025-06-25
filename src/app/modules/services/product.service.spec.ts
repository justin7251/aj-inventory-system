import { TestBed } from '@angular/core/testing';
import { Firestore, collection, addDoc, serverTimestamp, query, where, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { ProductService, ProductRestockData } from './product.service';
import { Product } from '../model/product.model';
import { of } from 'rxjs';

// Mock top-level Firestore functions
jest.mock('@angular/fire/firestore', () => {
  const originalModule = jest.requireActual('@angular/fire/firestore');
  return {
    ...originalModule,
    addDoc: jest.fn(),
    collection: jest.fn().mockReturnValue({}), // Mock collection default
    doc: jest.fn().mockReturnValue({}),       // Mock doc default
    updateDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    collectionData: jest.fn(),
    serverTimestamp: jest.fn(() => 'mocked_server_timestamp'),
  };
});

describe('ProductService', () => {
  let service: ProductService;
  let firestoreMock: Partial<Firestore>;
  let mockedAddDoc: jest.Mock;
  let mockedUpdateDoc: jest.Mock;
  let mockedCollectionData: jest.Mock;
  // let mockedCollection: jest.Mock; // If needed to inspect collection path

  beforeEach(() => {
    firestoreMock = {}; // No direct methods on Firestore instance itself are called by ProductService methods

    TestBed.configureTestingModule({
      providers: [
        ProductService,
        { provide: Firestore, useValue: firestoreMock }
      ]
    });
    service = TestBed.inject(ProductService);

    mockedAddDoc = addDoc as jest.Mock;
    mockedUpdateDoc = updateDoc as jest.Mock;
    mockedCollectionData = collectionData as jest.Mock;
    // mockedCollection = collection as jest.Mock;

    // Reset mocks
    mockedAddDoc.mockReset();
    mockedUpdateDoc.mockReset();
    mockedCollectionData.mockReset();
    // mockedCollection.mockReset();

    // Default mock implementations
    mockedAddDoc.mockResolvedValue({ id: 'newProductId' } as any);
    mockedUpdateDoc.mockResolvedValue(undefined);
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
      // created_date will be serverTimestamp
    };

    it('should call addDoc with correct product data and server timestamp', async () => {
      await service.addProduct(productData);
      expect(mockedAddDoc).toHaveBeenCalledTimes(1);
      expect(mockedAddDoc).toHaveBeenCalledWith(
        expect.anything(), // Firestore collection reference
        {
          ...productData,
          quantity: 10, // Ensure numbers are not strings
          price: 100,
          costPrice: 50,
          created_date: 'mocked_server_timestamp'
        }
      );
    });

    it('should return the result from addDoc', async () => {
      const expectedResult = { id: 'newProductId' };
      mockedAddDoc.mockResolvedValue(expectedResult as any);
      const result = await service.addProduct(productData);
      expect(result.id).toBe('newProductId');
    });
  });

  describe('updateProductUponRestock', () => {
    const restockData: ProductRestockData = {
      product_no: 'P123',
      product_name: 'Test Product Restocked',
      quantity: 5, // quantity being restocked
      price: 55,    // new cost price for this batch
      color: 'Red',
      product_type: 'A'
    };

    const existingProduct: Product & { id: string } = {
      id: 'existingProdId',
      product_no: 'P123',
      product_name: 'Test Product',
      quantity: 10, // current quantity
      price: 100,
      costPrice: 50, // old cost price
      color: 'Red',
      product_type: 'A'
    };

    it('should update existing product quantity and costPrice if product_no exists', async () => {
      mockedCollectionData.mockReturnValue(of([existingProduct])); // Simulate product found

      await service.updateProductUponRestock(restockData);

      expect(mockedCollectionData).toHaveBeenCalled(); // Verify query was made
      expect(mockedUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockedUpdateDoc).toHaveBeenCalledWith(
        expect.anything(), // Document reference
        {
          quantity: existingProduct.quantity + restockData.quantity,
          costPrice: restockData.price // new costPrice from restock
        }
      );
      expect(mockedAddDoc).not.toHaveBeenCalled();
    });

    it('should add a new product if product_no does not exist', async () => {
      mockedCollectionData.mockReturnValue(of([])); // Simulate product not found

      await service.updateProductUponRestock(restockData);

      expect(mockedCollectionData).toHaveBeenCalled();
      expect(mockedAddDoc).toHaveBeenCalledTimes(1);
      expect(mockedAddDoc).toHaveBeenCalledWith(
        expect.anything(), // Collection reference
        {
          product_no: restockData.product_no,
          product_name: restockData.product_name,
          color: restockData.color,
          costPrice: restockData.price,
          price: (restockData.price * 120 / 100), // Calculated selling price
          quantity: restockData.quantity,
          created_date: 'mocked_server_timestamp',
          product_type: restockData.product_type || ''
        }
      );
      expect(mockedUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('getAllProducts', () => {
    it('should call collectionData for the products collection', () => {
      mockedCollectionData.mockReturnValue(of([])); // Return empty observable for simplicity
      service.getAllProducts();
      // TODO: Need to mock collection() properly to assert the path 'products'
      // For now, just ensure collectionData itself is called.
      expect(mockedCollectionData).toHaveBeenCalledWith(expect.anything(), { idField: 'id' });
    });
  });

  describe('getLowStockProducts', () => {
    it('should call collectionData with a query for low stock', () => {
      mockedCollectionData.mockReturnValue(of([]));
      const threshold = 5;
      service.getLowStockProducts(threshold);
      // TODO: Need to mock query() and where() to assert the query conditions
      expect(mockedCollectionData).toHaveBeenCalledWith(expect.anything(), { idField: 'id' });
    });
  });

});
