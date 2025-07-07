import { TestBed } from '@angular/core/testing';
import { DashboardService, ChartData } from './dashboard.service';
import { OrderService } from './services/order.service';
import { Order, OrderItem } from './model/order.model';
import { ProfitAnalyticsOrderDetail, MonthlyProfitSummary, ProfitAnalyticsItemDetail } from './model/analytics.model';
import { of, from } from 'rxjs';
import { Timestamp, Firestore } from '@angular/fire/firestore';

// Helper to create a Firestore Timestamp
const createTimestamp = (date: Date): Timestamp => Timestamp.fromDate(date);

describe('DashboardService', () => {
  let service: DashboardService;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  const mockOrders: Order[] = [
    {
      id: 'order1',
      user_id: 'user1',
      customer_name: 'Customer A',
      telephone: 1234567890,
      delivery_address: '123 Main St',
      payment_type: 'card',
      items: [
        { product_no: 'P001', product_name: 'Product 1', quantity: 2, item_cost: 10 }, // Revenue: 20
        { product_no: 'P002', product_name: 'Product 2', quantity: 1, item_cost: 25 }, // Revenue: 25
      ],
      delivery_cost: 5,
      discount: 2,
      total_cost: 48, // (20+25) + 5 - 2 = 48 (Total Revenue for order)
      totalEarnings: 18, // Assume pre-calculated: Revenue (45) - COGS (27) = 18
      created_date: createTimestamp(new Date('2023-01-15T10:00:00Z')),
    },
    {
      id: 'order2',
      user_id: 'user2',
      customer_name: 'Customer B',
      telephone: 9876543210,
      delivery_address: '456 Oak St',
      payment_type: 'cash',
      items: [
        { product_no: 'P001', product_name: 'Product 1', quantity: 3, item_cost: 10 }, // Revenue: 30
      ],
      delivery_cost: 0,
      discount: 0,
      total_cost: 30,
      totalEarnings: 12, // Assume pre-calculated: Revenue (30) - COGS (18) = 12
      created_date: createTimestamp(new Date('2023-02-10T14:30:00Z')),
    },
    {
      id: 'order3', // Order with zero selling price item for margin test
      user_id: 'user3',
      customer_name: 'Customer C',
      items: [
        { product_no: 'P003', product_name: 'Product 3 Free', quantity: 1, item_cost: 0 },
      ],
      total_cost: 0,
      totalEarnings: -5, // Revenue (0) - COGS (5) = -5
      created_date: createTimestamp(new Date('2023-01-20T12:00:00Z')),
    }
  ];

  const mockProductCostMap = new Map<string, number>([
    ['P001', 6],  // Cost for Product 1
    ['P002', 7],  // Cost for Product 2
    ['P003', 5],  // Cost for Product 3 (free item)
  ]);

  beforeEach(() => {
    const spy = jasmine.createSpyObj('OrderService', ['getAllOrders', 'getProductCostMap']);

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: OrderService, useValue: spy },
        { provide: Firestore, useValue: {} } // Basic mock for Firestore
      ]
    });
    service = TestBed.inject(DashboardService);
    orderServiceSpy = TestBed.inject(OrderService) as jasmine.SpyObj<OrderService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProfitMarginAnalyticsData', () => {
    beforeEach(() => {
      orderServiceSpy.getAllOrders.and.returnValue(of(mockOrders));
      orderServiceSpy.getProductCostMap.and.returnValue(Promise.resolve(mockProductCostMap));
    });

    it('should fetch orders and product costs and calculate profit details', (done: DoneFn) => {
      service.getProfitMarginAnalyticsData().subscribe(result => {
        expect(result.isLoading).toBe(false);
        expect(result.error).toBeUndefined();
        expect(result.data.length).toBe(3);

        // Order 1 checks
        const order1Analytics = result.data.find(o => o.orderId === 'order1');
        expect(order1Analytics).toBeTruthy();
        expect(order1Analytics.totalRevenue).toBe(48); // total_cost from mock
        expect(order1Analytics.totalGrossProfit).toBe(18); // totalEarnings from mock
        expect(order1Analytics.totalCOGS).toBe(48 - 18); // 30
        expect(order1Analytics.overallOrderProfitMargin).toBeCloseTo((18 / 48) * 100, 2);

        expect(order1Analytics.items.length).toBe(2);
        // Item 1 in Order 1 (P001)
        const item1Order1 = order1Analytics.items.find(i => i.SKU === 'P001');
        expect(item1Order1).toBeTruthy();
        expect(item1Order1.sellingPricePerUnit).toBe(10);
        expect(item1Order1.costPricePerUnit).toBe(6);
        expect(item1Order1.quantity).toBe(2);
        expect(item1Order1.grossProfitPerUnit).toBe(10 - 6); // 4
        expect(item1Order1.profitMarginPercentage).toBeCloseTo((4 / 10) * 100, 2); // 40%
        expect(item1Order1.totalRevenueForItem).toBe(20);
        expect(item1Order1.totalCostForItem).toBe(12);
        expect(item1Order1.totalProfitForItem).toBe(8);

        // Item 2 in Order 1 (P002)
        const item2Order1 = order1Analytics.items.find(i => i.SKU === 'P002');
        expect(item2Order1).toBeTruthy();
        expect(item2Order1.sellingPricePerUnit).toBe(25);
        expect(item2Order1.costPricePerUnit).toBe(7);
        expect(item2Order1.quantity).toBe(1);
        expect(item2Order1.grossProfitPerUnit).toBe(25 - 7); // 18
        expect(item2Order1.profitMarginPercentage).toBeCloseTo((18 / 25) * 100, 2); // 72%
        expect(item2Order1.totalRevenueForItem).toBe(25);
        expect(item2Order1.totalCostForItem).toBe(7);
        expect(item2Order1.totalProfitForItem).toBe(18);

        // Order 3, Item 1 (P003) - test zero selling price
        const order3Analytics = result.data.find(o => o.orderId === 'order3');
        expect(order3Analytics).toBeTruthy();
        const item1Order3 = order3Analytics.items.find(i => i.SKU === 'P003');
        expect(item1Order3.sellingPricePerUnit).toBe(0);
        expect(item1Order3.costPricePerUnit).toBe(5);
        expect(item1Order3.grossProfitPerUnit).toBe(-5); // 0 - 5
        expect(item1Order3.profitMarginPercentage).toBe(-Infinity); // Or specific handling if defined
        expect(order3Analytics.overallOrderProfitMargin).toBe(-Infinity);


        done();
      });
    });

    it('should return ChartData with isLoading true initially', (done: DoneFn) => {
      orderServiceSpy.getAllOrders.and.returnValue(of(mockOrders)); // Will be used by combineLatest
      orderServiceSpy.getProductCostMap.and.returnValue(new Promise(() => {})); // Simulate pending promise

      let emissionCount = 0;
      service.getProfitMarginAnalyticsData().subscribe(result => {
        emissionCount++;
        if (emissionCount === 1) { // First emission due to startWith
          expect(result.isLoading).toBe(true);
          expect(result.data).toEqual([]);
        }
        // Test won't complete if promise doesn't resolve, which is fine for this check
      });
      // Give a bit of time for async operations if needed, though startWith is synchronous
      setTimeout(() => {
        expect(emissionCount).toBe(1); // Ensure it only emitted startWith
        done();
      }, 0);
    });

    it('should handle errors from OrderService', (done: DoneFn) => {
      orderServiceSpy.getAllOrders.and.returnValue(from(Promise.reject('Order fetch error')));
      orderServiceSpy.getProductCostMap.and.returnValue(Promise.resolve(mockProductCostMap));

      service.getProfitMarginAnalyticsData().subscribe(result => {
        if (!result.isLoading) { // Wait for the actual result after startWith
          expect(result.error).toBeTruthy();
          expect(result.data).toEqual([]);
          done();
        }
      });
    });
  });

  describe('getMonthlyProfitSummaryData', () => {
    beforeEach(() => {
      // getMonthlyProfitSummaryData calls getProfitMarginAnalyticsData internally.
      // So we mock what getProfitMarginAnalyticsData depends on.
      orderServiceSpy.getAllOrders.and.returnValue(of(mockOrders));
      orderServiceSpy.getProductCostMap.and.returnValue(Promise.resolve(mockProductCostMap));
    });

    it('should aggregate profit data monthly and sort chronologically', (done: DoneFn) => {
      service.getMonthlyProfitSummaryData().subscribe(result => {
        expect(result.isLoading).toBe(false);
        expect(result.error).toBeUndefined();
        expect(result.data.length).toBe(2); // Jan 2023 and Feb 2023

        // Jan 2023: order1 and order3
        const janSummary = result.data.find(s => s.monthYear === 'Jan 2023');
        expect(janSummary).toBeTruthy();
        const order1Revenue = 48; const order1Profit = 18; const order1COGS = 30;
        const order3Revenue = 0;  const order3Profit = -5; const order3COGS = 5;
        expect(janSummary.totalRevenue).toBe(order1Revenue + order3Revenue); // 48
        expect(janSummary.totalCOGS).toBe(order1COGS + order3COGS);     // 30 + 5 = 35
        expect(janSummary.totalGrossProfit).toBe(order1Profit + order3Profit); // 18 - 5 = 13
        expect(janSummary.totalOrders).toBe(2);
        expect(janSummary.overallProfitMargin).toBeCloseTo((13 / 48) * 100, 2);

        // Feb 2023: order2
        const febSummary = result.data.find(s => s.monthYear === 'Feb 2023');
        expect(febSummary).toBeTruthy();
        expect(febSummary.totalRevenue).toBe(30); // from order2
        expect(febSummary.totalCOGS).toBe(30 - 12); // 18
        expect(febSummary.totalGrossProfit).toBe(12); // from order2
        expect(febSummary.totalOrders).toBe(1);
        expect(febSummary.overallProfitMargin).toBeCloseTo((12 / 30) * 100, 2);

        // Check chronological order
        expect(result.data[0].monthYear).toBe('Jan 2023');
        expect(result.data[1].monthYear).toBe('Feb 2023');

        done();
      });
    });
  });
});
