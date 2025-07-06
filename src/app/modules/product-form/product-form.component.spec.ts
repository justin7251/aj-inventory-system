import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ProductFormComponent } from './product-form.component';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ProductService } from '../services/product.service'; // Changed ItemService to ProductService
import { MatChipsModule } from '@angular/material/chips';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog'; // Import MatDialogModule
import { of } from 'rxjs'; // Import of

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let mockProductService: any; // Changed mockItemService to mockProductService

  beforeEach(waitForAsync(() => {
    mockProductService = jasmine.createSpyObj('ProductService', ['addProduct']); // Renamed AddProduct to addProduct

    TestBed.configureTestingModule({
      declarations: [ProductFormComponent],
      imports: [
        ReactiveFormsModule,
        MatChipsModule,
        NoopAnimationsModule,
        MatDialogModule // Add MatDialogModule here
      ],
      providers: [
        UntypedFormBuilder,
        { provide: ProductService, useValue: mockProductService } // Use ProductService
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization (ngOnInit)', () => {
    it('should initialize productForm with required controls and validators on ngOnInit', () => {
      expect(component.productForm).toBeDefined();
      const controls = ['product_no', 'product_name', 'color', 'quantity', 'price', 'costPrice', 'barcode']; // Added barcode
      controls.forEach(controlName => {
        const control = component.productForm.get(controlName);
        expect(control).toBeTruthy();
        if (controlName !== 'barcode') { // Barcode is not required
          expect(control.hasValidator(Validators.required)).toBeTrue();
        }
      });
    });
  });

  describe('addProduct Method', () => {
    const validFormData = {
      product_no: 'P001',
      product_name: 'Test Product',
      color: 'Red',
      quantity: 10,
      price: 100,
      costPrice: 50,
      barcode: 'BC123' // Added barcode
    };

    beforeEach(() => {
      component.successMessage = '';
      component.errorMessage = '';
    });

    it('should call ProductService.addProduct and reset form when productForm is valid', fakeAsync(() => {
      mockProductService.addProduct.and.returnValue(Promise.resolve({ id: 'new-id' }));
      component.productForm.setValue(validFormData);
      spyOn(component, 'resetForm').and.callThrough();

      component.addProduct();
      tick();

      expect(mockProductService.addProduct).toHaveBeenCalledWith(jasmine.objectContaining({
        product_no: validFormData.product_no,
        product_name: validFormData.product_name,
        barcode: validFormData.barcode
      }));
      expect(component.resetForm).toHaveBeenCalled();
      expect(component.successMessage).toBe('Record has been created');
      expect(component.errorMessage).toBe('');
    }));

    it('should not call ProductService.addProduct when productForm is invalid', () => {
      component.productForm.setValue({ ...validFormData, product_no: '' });
      spyOn(component, 'resetForm');

      component.addProduct();

      expect(mockProductService.addProduct).not.toHaveBeenCalled();
      expect(component.resetForm).not.toHaveBeenCalled();
    });

    it('should set errorMessage and not reset form when ProductService.addProduct fails', fakeAsync(() => {
      const errorResponse = { message: 'Test Service Error' };
      mockProductService.addProduct.and.returnValue(Promise.reject(errorResponse));
      component.productForm.setValue(validFormData);
      spyOn(component, 'resetForm');

      component.addProduct();
      tick();

      expect(mockProductService.addProduct).toHaveBeenCalledWith(jasmine.objectContaining({
         product_no: validFormData.product_no
      }));
      expect(component.errorMessage).toBe('Test Service Error');
      expect(component.successMessage).toBe('');
      expect(component.resetForm).not.toHaveBeenCalled();
    }));
  });

  describe('resetForm Method', () => {
    it('should reset the productForm, clear errors and messages', () => {
      component.productForm.get('product_no').setValue('test value');
      component.productForm.get('product_name').setErrors({ 'required': true });
      component.productForm.markAllAsTouched();
      component.successMessage = "Some success";
      component.errorMessage = "Some error";

      component.resetForm();

      expect(component.productForm.get('product_no').value).toBeNull();
      expect(component.productForm.get('product_name').errors).toBeNull();
      expect(component.productForm.get('product_name').touched).toBeFalse();
      expect(component.productForm.pristine).toBeTrue();
      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
    });
  });

  // Add tests for openBarcodeScanner
  describe('Barcode Scanning', () => {
    it('should open barcode scanner dialog', () => {
      spyOn(component.dialog, 'open').and.callThrough();
      component.openBarcodeScanner();
      expect(component.dialog.open).toHaveBeenCalled();
    });

    it('should patch barcode form control when scanner returns a result', () => {
        const mockDialogRef = jasmine.createSpyObj({ afterClosed: of('1234567890'), close: null });
        spyOn(component.dialog, 'open').and.returnValue(mockDialogRef);

        component.openBarcodeScanner();

        expect(component.productForm.get('barcode').value).toBe('1234567890');
    });
  });
});
