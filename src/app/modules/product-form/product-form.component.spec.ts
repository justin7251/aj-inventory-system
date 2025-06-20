import { async, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ProductFormComponent } from './product-form.component';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { ItemService } from '../services/item.service';
import { MatChipsModule } from '@angular/material/chips';
import { NoopAnimationsModule } from '@angular/platform-browser/animations'; // Or BrowserAnimationsModule

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let fb: UntypedFormBuilder; // Keep if you need to manually create forms in tests
  let mockItemService: any;

  beforeEach(async(() => {
    mockItemService = jasmine.createSpyObj('ItemService', ['AddProduct']);

    TestBed.configureTestingModule({
      declarations: [ProductFormComponent],
      imports: [
        ReactiveFormsModule,
        MatChipsModule,
        NoopAnimationsModule // Use NoopAnimationsModule to avoid animation issues in tests
      ],
      providers: [
        UntypedFormBuilder,
        { provide: ItemService, useValue: mockItemService }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fb = TestBed.inject(UntypedFormBuilder); // Inject if needed for direct use
    // component.ngOnInit(); // Call ngOnInit explicitly if fixture.detectChanges() is not used or to ensure order
    fixture.detectChanges(); // This calls ngOnInit() which calls submitProductForm()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization (ngOnInit)', () => {
    it('should initialize productForm with required controls and validators on ngOnInit', () => {
      expect(component.productForm).toBeDefined();
      const controls = ['product_no', 'product_name', 'color', 'quantity', 'price', 'costPrice'];
      controls.forEach(controlName => {
        const control = component.productForm.get(controlName);
        expect(control).toBeTruthy();
        expect(control.hasValidator(Validators.required)).toBeTrue();
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
      fruits: [] // Assuming fruits is part of the form due to MatChips, though not explicitly listed for validation
    };

    beforeEach(() => {
      // Reset messages before each addProduct test
      component.successMessage = '';
      component.errorMessage = '';
    });

    it('should call ItemService.AddProduct and reset form when productForm is valid', fakeAsync(() => {
      mockItemService.AddProduct.and.returnValue(Promise.resolve({ id: 'new-id' })); // Simulate successful add
      component.productForm.setValue(validFormData);
      spyOn(component, 'resetForm').and.callThrough(); // Spy on resetForm

      component.addProduct();
      tick(); // Process microtasks like Promise.resolve()

      expect(mockItemService.AddProduct).toHaveBeenCalledWith(jasmine.objectContaining({
        product_no: validFormData.product_no,
        product_name: validFormData.product_name,
        color: validFormData.color,
        quantity: validFormData.quantity,
        price: validFormData.price,
        costPrice: validFormData.costPrice
        // fruits are not part of the data passed to AddProduct in component logic
      }));
      expect(component.resetForm).toHaveBeenCalled();
      expect(component.successMessage).toBe('Record has been created');
      expect(component.errorMessage).toBe('');
    }));

    it('should not call ItemService.AddProduct when productForm is invalid', () => {
      component.productForm.setValue({ ...validFormData, product_no: '' }); // Make form invalid
      spyOn(component, 'resetForm');

      component.addProduct();

      expect(mockItemService.AddProduct).not.toHaveBeenCalled();
      expect(component.resetForm).not.toHaveBeenCalled();
      // Expect some indication of validation error, though component doesn't set a specific message for this
    });

    it('should set errorMessage and not reset form when ItemService.AddProduct fails', fakeAsync(() => {
      const errorResponse = { message: 'Test Service Error' };
      mockItemService.AddProduct.and.returnValue(Promise.reject(errorResponse));
      component.productForm.setValue(validFormData);
      spyOn(component, 'resetForm');

      component.addProduct();
      tick(); // Process microtasks like Promise.reject()

      expect(mockItemService.AddProduct).toHaveBeenCalledWith(jasmine.objectContaining({
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
      component.productForm.get('product_name').setValue('another value');
      component.productForm.get('product_name').setErrors({ 'required': true });
      component.productForm.markAllAsTouched();
      component.successMessage = "Some success";
      component.errorMessage = "Some error";

      component.resetForm();

      expect(component.productForm.get('product_no').value).toBeNull();
      expect(component.productForm.get('product_name').value).toBeNull();
      expect(component.productForm.get('product_name').errors).toBeNull();
      expect(component.productForm.get('product_name').touched).toBeFalse();
      expect(component.productForm.pristine).toBeTrue();
      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
    });
  });

});
