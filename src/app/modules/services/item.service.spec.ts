import { TestBed } from '@angular/core/testing';
import { ItemService } from './item.service';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  collectionData,
  query,
  where,
  serverTimestamp,
} from '@angular/fire/firestore';
import { of } from 'rxjs';
import { Product } from '../models/product'; // Assuming Product model exists

// Mock Firestore functions
// It's generally better to use jest.SpyInstance for better typing with .and.returnValue etc.
// However, the prompt used jest.fn(), so we'll stick to that for now.
const mockCollection = jest.fn();
const mockAddDoc = jest.fn();
const mockDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollectionData = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockServerTimestamp = jest.fn();

const fixedDate = new Date('2024-01-01T00:00:00.000Z');

describe('ItemService', () => {
  let service: ItemService;
  // No need for firestoreMock variable if we are using jest.fn() directly on the imported mocks
  // and TestBed is providing the Firestore service with these mocks.

  beforeEach(() => {
    // Configure mock return values
    mockServerTimestamp.mockReturnValue(fixedDate);
    mockCollection.mockReturnValue({ id: 'mockCollectionRef' } as any);
    mockDoc.mockReturnValue({ id: 'mockDocRef' } as any);
    mockQuery.mockReturnValue({ id: 'mockQueryRef' } as any);
    // mockWhere typically doesn't return a value that's directly used, but rather a condition for mockQuery
    // For simplicity, we can make it return a dummy object if needed for chaining, or just check its call args.
    mockWhere.mockReturnValue({} as any); // Dummy where clause object
    mockAddDoc.mockResolvedValue({ id: 'new-doc-id' } as any);
    mockUpdateDoc.mockResolvedValue(undefined);
    // mockCollectionData will be configured per test using of(...)

    TestBed.configureTestingModule({
      providers: [
        ItemService,
        {
          provide: Firestore,
          useValue: {
            // Ensure the actual Firestore instance used by the service is this object
            // And that this object uses our mocks.
            // This aligns with the original setup where firestoreMock was passed.
            collection: mockCollection,
            addDoc: mockAddDoc,
            doc: mockDoc,
            updateDoc: mockUpdateDoc,
            collectionData: mockCollectionData,
            query: mockQuery,
            where: mockWhere,
            serverTimestamp: mockServerTimestamp,
          },
        },
      ],
    });
    service = TestBed.inject(ItemService);

    // Reset mocks before each test (jest.clearAllMocks() could also be used if all are jest.fn)
    mockCollection.mockClear();
    mockAddDoc.mockClear();
    mockDoc.mockClear();
    mockUpdateDoc.mockClear();
    mockCollectionData.mockClear();
    mockQuery.mockClear();
    mockWhere.mockClear();
    mockServerTimestamp.mockClear(); // Clears call count but not mockReturnValue

    // Re-establish mockReturnValue for serverTimestamp if cleared by a more aggressive reset
    // or if a test might change it.
    mockServerTimestamp.mockReturnValue(fixedDate);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('AddProduct', () => {
    it('should add a product to Firestore', async () => {
      const sampleProduct: Product = {
        product_no: 'P001',
        product_name: 'Test Product',
        quantity: 10,
        price: 100,
        costPrice: 80,
        color: 'Red',
        product_type: 'TestType',
        // id is usually assigned by Firestore, so not included here
      };

      await service.AddProduct(sampleProduct);

      expect(mockCollection).toHaveBeenCalledWith(service.firestore, 'products');
      expect(mockAddDoc).toHaveBeenCalledWith(
        { id: 'mockCollectionRef' }, // The object returned by mockCollection
        {
          ...sampleProduct,
          quantity: +sampleProduct.quantity,
          price: +sampleProduct.price,
          costPrice: +sampleProduct.costPrice,
          created_date: fixedDate,
        }
      );
    });
  });

  describe('getProductList', () => {
    it('should retrieve product list from Firestore', (done) => {
      const sampleProductData: Product[] = [
        { id: '1', product_no: 'P001', product_name: 'Product 1', quantity: 10, price: 100, costPrice: 80, color: 'Red', created_date: fixedDate },
        { id: '2', product_no: 'P002', product_name: 'Product 2', quantity: 5, price: 50, costPrice: 40, color: 'Blue', created_date: fixedDate },
      ];
      mockCollectionData.mockReturnValue(of(sampleProductData));

      service.getProductList().subscribe(products => {
        expect(products).toEqual(sampleProductData);
        expect(mockCollection).toHaveBeenCalledWith(service.firestore, 'products');
        // The collection ref passed to collectionData should be the one returned by mockCollection
        expect(mockCollectionData).toHaveBeenCalledWith({ id: 'mockCollectionRef' }, { idField: 'id' });
        done();
      });
    });
  });

  describe('Delete', () => {
    it('should mark a document as deleted in Firestore', async () => {
      const sampleTable = 'products';
      const sampleId = 'test-id';

      await service.Delete(sampleTable, sampleId);

      expect(mockDoc).toHaveBeenCalledWith(service.firestore, sampleTable, sampleId);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'mockDocRef' }, // The object returned by mockDoc
        { deleted: true, deleted_date: fixedDate }
      );
    });
  });

  describe('UpdateProduct', () => {
    it('should update an existing product in Firestore when product exists', async () => {
      const sampleStockUpdate = { product_no: 'P123', quantity: 10, price: 50, product_name: 'Test', color: 'Red' }; // price is new costPrice
      const existingProduct: Product = { id: 'prod-abc', product_no: 'P123', product_name: 'Old Name', quantity: 5, price: 100, costPrice: 40, color: 'Blue', created_date: fixedDate };

      mockCollectionData.mockReturnValue(of([existingProduct]));
      // The mock for query should return something that collectionData can use
      mockQuery.mockReturnValue({ id: 'mockQueryRefForUpdate' } as any);


      await service.UpdateProduct(sampleStockUpdate);

      expect(mockCollection).toHaveBeenCalledWith(service.firestore, 'products');
      expect(mockWhere).toHaveBeenCalledWith('product_no', '==', sampleStockUpdate.product_no);
      // Query is called with the collection ref and the where clause
      expect(mockQuery).toHaveBeenCalledWith({ id: 'mockCollectionRef' }, {} as any); // {} is from mockWhere
      expect(mockCollectionData).toHaveBeenCalledWith({ id: 'mockQueryRefForUpdate' }, { idField: 'id' });
      expect(mockDoc).toHaveBeenCalledWith(service.firestore, 'products', existingProduct.id);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { id: 'mockDocRef' }, // The object returned by mockDoc
        { quantity: sampleStockUpdate.quantity + existingProduct.quantity, costPrice: +sampleStockUpdate.price }
      );
    });

    it('should add a new product if it does not exist during update in Firestore', async () => {
      const sampleStockAdd = { product_no: 'P789', product_name: 'New Prod', quantity: 20, price: 75, color: 'Green', product_type: 'TypeA' }; // price is costPrice

      mockCollectionData.mockReturnValue(of([])); // No existing product
      // The mock for query should return something that collectionData can use
      mockQuery.mockReturnValue({ id: 'mockQueryRefForAdd' } as any);


      await service.UpdateProduct(sampleStockAdd);

      // Check query part
      expect(mockCollection).toHaveBeenCalledWith(service.firestore, 'products');
      expect(mockWhere).toHaveBeenCalledWith('product_no', '==', sampleStockAdd.product_no);
      expect(mockQuery).toHaveBeenCalledWith({ id: 'mockCollectionRef' }, {} as any); // {} is from mockWhere
      expect(mockCollectionData).toHaveBeenCalledWith({ id: 'mockQueryRefForAdd' }, { idField: 'id' });

      // Check addDoc part
      expect(mockAddDoc).toHaveBeenCalledWith(
        { id: 'mockCollectionRef' }, // The object returned by mockCollection
        {
          product_no: sampleStockAdd.product_no,
          product_name: sampleStockAdd.product_name,
          color: sampleStockAdd.color,
          costPrice: +sampleStockAdd.price,
          price: Math.round(+sampleStockAdd.price * 120 / 100), // Ensure this matches service logic
          quantity: +sampleStockAdd.quantity,
          created_date: fixedDate,
          product_type: sampleStockAdd.product_type || '',
        }
      );
    });
  });
});
