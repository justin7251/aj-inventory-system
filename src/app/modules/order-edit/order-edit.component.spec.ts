import { waitForAsync, ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OrderEditComponent } from './order-edit.component';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { OrderService } from '../services/order.service'; // Changed ItemService to OrderService
import { Firestore } from '@angular/fire/firestore';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms'; // Import ReactiveFormsModule
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Order } from '../model/order.model';

describe('OrderEditComponent', () => {
  let component: OrderEditComponent;
  let fixture: ComponentFixture<OrderEditComponent>;
  let mockOrderService: any; // Changed mockItemService to mockOrderService
  let mockFirestore: any;
  // MatDialogRef and MAT_DIALOG_DATA are often not needed for basic component tests unless dialogs are opened from within
  // For this component, it seems to BE a dialog, so MatDialogRef is needed for closing.

  const mockOrderData: Order = {
    id: 'test-id',
    // order_no: 'ORD123', // Removed order_no
    customer_name: 'Test Customer',
    items: [{ product_no: 'P001', quantity: 2, item_cost: 50, product_name: 'Product 1' }],
    total_cost: 100,
    user_id: 'user-abc',
    delivery_address: '123 Main St',
    payment_type: 'Credit Card',
    telephone: 1234567890,
    delivery_cost: 10,
    discount: 5
    // status: 'Pending' // Removed status
  };

  beforeEach(waitForAsync(() => {
    mockOrderService = jasmine.createSpyObj('OrderService', ['getOrderById', 'updateOrder']); // Changed methods
    mockOrderService.getOrderById.and.returnValue(of(mockOrderData));
    mockOrderService.updateOrder.and.returnValue(Promise.resolve());

    mockFirestore = jasmine.createSpyObj('Firestore', ['']); // Keep if directly used, seems not

    TestBed.configureTestingModule({
      declarations: [OrderEditComponent],
      imports: [
        ReactiveFormsModule, // Needed for formGroup
        NoopAnimationsModule, // For Material animations
        MatDialogModule       // If this component uses MatDialog internally, or if it IS a dialog
      ],
      providers: [
        UntypedFormBuilder, // Add UntypedFormBuilder
        {
          provide: ActivatedRoute,
          // OrderEditComponent seems to be a dialog, ActivatedRoute might not be used directly.
          // If it is, ensure the mock provides what's needed.
          // For dialogs, data is usually passed via MAT_DIALOG_DATA.
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'test-id' }) }, queryParams: of({}) }
        },
        { provide: OrderService, useValue: mockOrderService },
        { provide: Firestore, useValue: mockFirestore }, // If needed
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: { orderId: 'test-id', ...mockOrderData } } // Provide mock data as if it's a dialog
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] // Useful for complex templates with custom elements
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderEditComponent);
    component = fixture.componentInstance;
    // Component might initialize form based on MAT_DIALOG_DATA in ngOnInit
    fixture.detectChanges(); // This calls ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load order data and initialize the form on init', () => {
    expect(mockOrderService.getOrderById).toHaveBeenCalledWith('test-id');
    expect(component.editOrderForm).toBeDefined(); // Changed orderForm to editOrderForm
    expect(component.editOrderForm.get('customer_name').value).toBe(mockOrderData.customer_name);
    expect(component.editOrderForm.get('total_cost').value).toBe(mockOrderData.total_cost);
    // Check other form fields as needed
  });

  it('should call updateOrder and close dialog on valid form submission', fakeAsync(() => {
    component.editOrderForm.setValue({ // Changed orderForm to editOrderForm
        customer_name: 'Updated Customer',
        delivery_address: mockOrderData.delivery_address,
        telephone: mockOrderData.telephone,
        payment_type: mockOrderData.payment_type,
        items: component.editOrderForm.get('items').value, // Get items from form
        delivery_cost: mockOrderData.delivery_cost,
        discount: mockOrderData.discount,
        total_cost: 120 // Example change
        // status: 'Shipped' // Removed status
    });
    component.id = 'test-id'; // Changed orderId to id

    component.onSubmit(); // Pass form value
    tick(); // Process promise

    expect(mockOrderService.updateOrder).toHaveBeenCalledWith('test-id', component.editOrderForm.value); // Pass form value
    // For dialogRef, access it through the injected service if it's not a public property
    // This depends on how MatDialogRef is provided and used.
    // If it's injected and stored as `public dialogRef`, then component.dialogRef is fine.
    // If not, you might need to get it from the TestBed injector or reconsider this part of the test
    // For this component, it's injected in the constructor and named dialogRef.
    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalled();
  }));

  it('should not call updateOrder on invalid form submission', () => {
    component.editOrderForm.get('customer_name').setValue(''); // Changed orderForm to editOrderForm
    component.onSubmit(); // Pass form value
    expect(mockOrderService.updateOrder).not.toHaveBeenCalled();
  });

});
