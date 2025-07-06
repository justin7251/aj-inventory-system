import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ItemsComponent } from './items.component';
import { ProductService } from '../services/product.service'; // Changed ItemService to ProductService
import { MatDialogModule } from '@angular/material/dialog'; // Import MatDialogModule

// Import other necessary modules like MatTableModule if needed for app-widget-table or other template features
// import { MatTableModule } from '@angular/material/table';

describe('ItemsComponent', () => {
  let component: ItemsComponent;
  let fixture: ComponentFixture<ItemsComponent>;
  let mockProductService: any; // Changed mockItemService to mockProductService

  beforeEach(waitForAsync(() => {
    // Create a spy object for ProductService
    mockProductService = jasmine.createSpyObj('ProductService', ['getAllProducts', 'deleteProduct']); // Assuming deleteProduct is the method

    TestBed.configureTestingModule({
      declarations: [ItemsComponent],
      imports: [MatDialogModule], // Add MatDialogModule here
      providers: [
        { provide: ProductService, useValue: mockProductService } // Use ProductService
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should fetch products on init and populate tableData and filteredTableData', () => {
      const mockProductsPayload = [
        { payload: { doc: { id: '1', data: () => ({ product_no: 'P001', product_name: 'Product 1', color: 'Red', price: 100, quantity: 10, barcode: 'BC001' }) } } },
        { payload: { doc: { id: '2', data: () => ({ product_no: 'P002', product_name: 'Product 2', color: 'Blue', price: 200, quantity: 5, barcode: 'BC002' }) } } }
      ];
      // Adjust mock to reflect getAllProducts if its return type is different (e.g., directly Product[])
      // For now, assuming it returns a similar structure for mapping
      mockProductService.getAllProducts.and.returnValue(of(mockProductsPayload));

      component.ngOnInit();

      expect(mockProductService.getAllProducts).toHaveBeenCalled();
      expect(component.tableData.length).toBe(2);
      expect(component.filteredTableData.length).toBe(2);

      expect(component.tableData[0]).toEqual(jasmine.objectContaining({
        id: '1', // Changed from $key
        product_no: 'P001',
        product_name: 'Product 1',
        barcode: 'BC001'
      }));
      expect(component.filteredTableData[0]).toEqual(jasmine.objectContaining({
        id: '1',
        product_no: 'P001',
      }));
    });
  });

  describe('deleteOrder', () => { // Renaming to deleteProduct would be more accurate
    it('should call ProductService.deleteProduct with correct parameters', async () => {
      const sampleProductId = 'test-prod-id';
      mockProductService.deleteProduct.and.returnValue(Promise.resolve()); // Assuming deleteProduct

      // The component's method is still named deleteOrder, which might be a misnomer
      await component.deleteOrder(sampleProductId);

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith('products', sampleProductId); // 'products' might be implicit now
    });
  });

  // Add tests for openBarcodeScanner, filterProductsByBarcode, clearFilter
  describe('Barcode Scanning', () => {
    it('should open barcode scanner dialog', () => {
      spyOn(component.dialog, 'open').and.callThrough();
      component.openBarcodeScanner();
      expect(component.dialog.open).toHaveBeenCalled();
    });

    it('should filter products by barcode when scanner returns a result', () => {
      component.tableData = [
        { id: '1', product_no: 'P001', product_name: 'Product A', barcode: '123', quantity: 1, color: 'red', price: 10, product_type: 'typeA' },
        { id: '2', product_no: 'P002', product_name: 'Product B', barcode: '456', quantity: 1, color: 'blue', price: 20, product_type: 'typeB' }
      ];
      component.filterProductsByBarcode('123');
      expect(component.filteredTableData.length).toBe(1);
      expect(component.filteredTableData[0].barcode).toBe('123');
    });

    it('should clear barcode filter', () => {
      component.tableData = [
        { id: '1', product_no: 'P001', product_name: 'Product A', barcode: '123', quantity: 1, color: 'red', price: 10, product_type: 'typeA' },
        { id: '2', product_no: 'P002', product_name: 'Product B', barcode: '456', quantity: 1, color: 'blue', price: 20, product_type: 'typeB' }
      ];
      component.filteredTableData = [component.tableData[0]]; // Simulate a filter being active
      component.clearFilter();
      expect(component.filteredTableData.length).toBe(2);
    });
  });

});
