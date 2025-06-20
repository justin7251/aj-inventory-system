import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ItemsComponent } from './items.component';
import { ItemService } from '../services/item.service';
// Import RouterTestingModule if navigation is tested, not strictly needed for these method tests
// import { RouterTestingModule } from '@angular/router/testing';
// Import MatTableModule if MatTableDataSource or other Material table features are directly used and cause errors
// import { MatTableModule } from '@angular/material/table';

describe('ItemsComponent', () => {
  let component: ItemsComponent;
  let fixture: ComponentFixture<ItemsComponent>;
  let mockItemService: any; // Using any for spy object simplicity

  beforeEach(async(() => {
    // Create a spy object for ItemService
    mockItemService = jasmine.createSpyObj('ItemService', ['getProductList', 'Delete']);

    TestBed.configureTestingModule({
      declarations: [ItemsComponent],
      // imports: [RouterTestingModule, MatTableModule], // Add if needed
      providers: [
        { provide: ItemService, useValue: mockItemService }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemsComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // ngOnInit is called here.
    // We will call ngOnInit explicitly in its test after setting up mocks for it.
    // For deleteOrder, detectChanges isn't strictly necessary unless it triggers UI updates we want to verify.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should fetch products on init and populate tableData', () => {
      const mockProductsPayload = [
        { payload: { doc: { id: '1', data: () => ({ product_no: 'P001', product_name: 'Product 1', color: 'Red', price: 100, quantity: 10 }) } } },
        { payload: { doc: { id: '2', data: () => ({ product_no: 'P002', product_name: 'Product 2', color: 'Blue', price: 200, quantity: 5 }) } } }
      ];
      mockItemService.getProductList.and.returnValue(of(mockProductsPayload));

      component.ngOnInit(); // Call ngOnInit directly to test its logic
      // fixture.detectChanges(); // Call if template updates based on ngOnInit need to be checked

      expect(mockItemService.getProductList).toHaveBeenCalled();
      expect(component.tableData.length).toBe(2);
      expect(component.tableData[0]).toEqual(jasmine.objectContaining({
        $key: '1',
        product_no: 'P001',
        product_name: 'Product 1',
        color: 'Red',
        price: 100,
        quantity: 10,
        from: 'products',
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete'
      }));
      expect(component.tableData[1]).toEqual(jasmine.objectContaining({
        $key: '2',
        product_no: 'P002',
        product_name: 'Product 2',
        color: 'Blue',
        price: 200,
        quantity: 5,
        from: 'products',
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete'
      }));
      // Also check component.ProductData as it's populated too
      expect(component.ProductData.length).toBe(2);
      expect(component.ProductData[0]).toEqual(jasmine.objectContaining({
        $key: '1',
        product_no: 'P001',
        product_name: 'Product 1',
      }));
    });
  });

  describe('deleteOrder', () => {
    it('should call ItemService.Delete with correct parameters when deleteOrder is called', async () => {
      const sampleProductId = 'test-prod-id';
      mockItemService.Delete.and.returnValue(Promise.resolve());

      await component.deleteOrder(sampleProductId);

      expect(mockItemService.Delete).toHaveBeenCalledWith('products', sampleProductId);
    });
  });

});
