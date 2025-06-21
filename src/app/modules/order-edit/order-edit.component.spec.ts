import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderEditComponent } from './order-edit.component';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ItemService } from '../services/item.service';
import { Firestore } from '@angular/fire/firestore';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { of } from 'rxjs'; // For ActivatedRoute queryParams

describe('OrderEditComponent', () => {
  let component: OrderEditComponent;
  let fixture: ComponentFixture<OrderEditComponent>;
  let mockItemService: any;
  let mockFirestore: any;
  let mockDialogRef: any;

  beforeEach(waitForAsync(() => {
    mockItemService = jasmine.createSpyObj('ItemService', ['GetOrder', 'UpdateOrder']); // Add methods used by OrderEditComponent
    mockItemService.GetOrder.and.returnValue(of({})); // Default mock response
    mockItemService.UpdateOrder.and.returnValue(Promise.resolve());

    mockFirestore = jasmine.createSpyObj('Firestore', ['']); // Empty mock, adjust if OrderEditComponent uses Firestore directly

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);


    TestBed.configureTestingModule({
      declarations: [ OrderEditComponent ], // Assuming not standalone
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'test-id' }) }, // Provide a mock 'id' or other params
            queryParams: of({})
          }
        },
        { provide: ItemService, useValue: mockItemService },
        { provide: Firestore, useValue: mockFirestore },
        { provide: MatDialogRef, useValue: mockDialogRef }, // Basic mock for MatDialogRef
        { provide: MAT_DIALOG_DATA, useValue: {} }         // Basic mock for MAT_DIALOG_DATA
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrderEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
