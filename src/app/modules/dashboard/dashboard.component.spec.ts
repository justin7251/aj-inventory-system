import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../dashboard.service';
import { ItemService } from '../services/item.service';
import { Firestore } from '@angular/fire/firestore';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core'; // Import CUSTOM_ELEMENTS_SCHEMA
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockDashboardService: any;
  let mockItemService: any;
  let mockFirestore: any;

  beforeEach(waitForAsync(() => {
    mockDashboardService = jasmine.createSpyObj('DashboardService', ['getMonthlySalesAndOrdersData', 'getMonthlyCogsAndRevenue', 'getSalesByProductData', 'cards']);
    // Setup default return values for DashboardService methods
    mockDashboardService.getMonthlySalesAndOrdersData.and.returnValue(of({}));
    mockDashboardService.getMonthlyCogsAndRevenue.and.returnValue(of({}));
    mockDashboardService.getSalesByProductData.and.returnValue(of([]));
    mockDashboardService.cards.and.returnValue(of([]));


    mockItemService = jasmine.createSpyObj('ItemService', ['GetOrdersList']);
    mockItemService.GetOrdersList.and.returnValue(of([])); // Default empty array

    mockFirestore = jasmine.createSpyObj('Firestore', ['collection', 'doc', 'addDoc', 'updateDoc', 'deleteDoc', 'collectionData', 'docData', 'query', 'where', 'orderBy', 'runTransaction', 'serverTimestamp']);


    TestBed.configureTestingModule({
      declarations: [ DashboardComponent ], // Assuming DashboardComponent is NOT standalone based on .ts file
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: ItemService, useValue: mockItemService },
        { provide: Firestore, useValue: mockFirestore }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] // To handle unknown elements in template like highcharts-chart if HighchartsChartModule is not imported
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
