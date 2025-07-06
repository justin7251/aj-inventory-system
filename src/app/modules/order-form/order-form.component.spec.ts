import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { OrderFormComponent } from './order-form.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { OrderService } from '../services/order.service'; // Changed ItemService to OrderService
import { ProductService } from '../services/product.service'; // Import ProductService
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Order } from '../model/order.model';

describe('OrderFormComponent', () => {
  let component: OrderFormComponent;
  let fixture: ComponentFixture<OrderFormComponent>;
  let mockOrderService: any; // Changed
  let mockProductService: any; // Added
  let mockSnackBar: any;
  let mockDialog: any;
  let mockRouter: any; // Added
  // Firestore might not be directly used by component anymore if services handle all interactions

  beforeEach(waitForAsync(() => {
    mockOrderService = jasmine.createSpyObj('OrderService', ['createOrder', 'getOrderById', 'updateOrder']); // Changed methods
    mockOrderService.createOrder.and.returnValue(Promise.resolve({ id: 'new-order-id' }));
    mockOrderService.getOrderById.and.returnValue(of(null)); // Default for new order
    mockOrderService.updateOrder.and.returnValue(Promise.resolve());

    mockProductService = jasmine.createSpyObj('ProductService', ['getAllProducts']); // Changed getProductList to getAllProducts
    mockProductService.getAllProducts.and.returnValue(of([])); // Default mock

    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);


    TestBed.configureTestingModule({
      declarations: [OrderFormComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule, // For Material animations
        MatDialogModule     // For MatDialog
      ],
      providers: [
        UntypedFormBuilder,
        { provide: OrderService, useValue: mockOrderService },
        { provide: ProductService, useValue: mockProductService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: MatDialog, useValue: mockDialog },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: null }) },
            queryParams: of({})
          }
        },
        { provide: Firestore, useValue: jasmine.createSpyObj('Firestore', ['']) } // Basic mock for Firestore
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Calls ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form for a new order on ngOnInit', () => {
    expect(component.isEditMode).toBeFalse();
    expect(component.orderForm).toBeDefined();
    expect(component.orderForm.get('customer_name').hasValidator(Validators.required)).toBeTrue();
    // Add more checks for form controls and validators
  });

  it('should call createOrder and navigate on valid new order submission', fakeAsync(() => {
    component.isEditMode = false;
    component.orderForm.setValue({ // Set all form values
      customer_name: 'New Customer',
      delivery_address: '123 New St',
      telephone: '1234567890',
      payment_type: 'Cash',
      items: [{ product_no: 'P001', quantity: 1, item_cost: 10, product_name: 'Prod A' }], // Simplified item
      delivery_cost: 5,
      discount: 0,
      total_cost: 15,
      status: 'Pending'
    });

    component.onSubmit();
    tick(); // Process promise

    expect(mockOrderService.createOrder).toHaveBeenCalledWith(jasmine.any(Object));
    expect(mockSnackBar.open).toHaveBeenCalledWith('Order Created!', 'OK', jasmine.any(Object));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/default/orders']);
  }));

  // Add tests for edit mode: ngOnInit with an ID, onSubmit in edit mode
  // Add tests for calculateTotal, openItemDialog, removeItem
});
