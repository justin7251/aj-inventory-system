import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { OrderFormComponent } from './order-form.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ItemService } from '../services/item.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';

describe('OrderFormComponent', () => {
  let component: OrderFormComponent;
  let fixture: ComponentFixture<OrderFormComponent>;
  let mockItemService: any;
  let mockSnackBar: any;
  let mockDialog: any;
  let mockFirestore: any;

  beforeEach(waitForAsync(() => {
    mockItemService = jasmine.createSpyObj('ItemService', ['getProductList', 'AddOrder', 'GetOrder']); // Added GetOrder
    mockItemService.getProductList.and.returnValue(of([])); // Default mock
    mockItemService.AddOrder.and.returnValue(Promise.resolve({ id: 'new-order-id'}));
    mockItemService.GetOrder.and.returnValue(of(null)); // For edit mode, default to no order found

    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockFirestore = jasmine.createSpyObj('Firestore', ['']); // Empty mock

    TestBed.configureTestingModule({
      declarations: [ OrderFormComponent ], // Assuming not standalone
      imports: [ ReactiveFormsModule ],
      providers: [
        UntypedFormBuilder,
        { provide: ItemService, useValue: mockItemService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: MatDialog, useValue: mockDialog },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: null }) }, // No 'id' for new order form by default
            queryParams: of({})
          }
        },
        { provide: Firestore, useValue: mockFirestore }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
