import { TestBed } from '@angular/core/testing';
import { InventoryManagementService } from './inventory-management.service';
import { Product, SalesOrder, SupplierProductInfo } from '../models/inventory.models';
import { firstValueFrom, of } from 'rxjs';

describe('InventoryManagementService', () => {
  let service: InventoryManagementService;

  // Mock data for testing
  const mockProducts: Product[] = [
    { SKU: 'TEST001', name: 'Test Product 1', currentStock: { 'WHS-A': 100 }, safetyStockQuantity: 10, preferredSupplierId: 'SUP001' },
    { SKU: 'TEST002', name: 'Test Product 2', currentStock: { 'WHS-A': 50 }, safetyStockQuantity: 5, preferredSupplierId: 'SUP002' },
    { SKU: 'TEST003', name: 'Test Product 3 No Stock', currentStock: { 'WHS-A': 0 }, safetyStockQuantity: 5, preferredSupplierId: 'SUP001' },
    { SKU: 'TEST004', name: 'Test Product 4 High Safety', currentStock: { 'WHS-A': 20 }, safetyStockQuantity: 15, preferredSupplierId: 'SUP001' },
  ];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const mockSalesOrders: SalesOrder[] = [
    { orderId: 'S001', orderDate: fiveDaysAgo, items: [{ SKU: 'TEST001', quantity: 5 }] }, // 5 units sold 5 days ago
    { orderId: 'S002', orderDate: fifteenDaysAgo, items: [{ SKU: 'TEST001', quantity: 10 }] }, // 10 units sold 15 days ago
    { orderId: 'S003', orderDate: fiveDaysAgo, items: [{ SKU: 'TEST002', quantity: 1 }] }, // 1 unit sold 5 days ago
    // Total for TEST001 in last 30 days = 15
    // Total for TEST002 in last 30 days = 1
  ];

  const mockSalesOrdersHighVolume: SalesOrder[] = [
    { orderId: 'S004', orderDate: fiveDaysAgo, items: [{ SKU: 'TEST001', quantity: 60 }] }, // 60 units sold 5 days ago (2/day over 30 days)
  ];


  const mockSupplierProductInfos: SupplierProductInfo[] = [
    { supplierProductInfoId: 'SPI001', SKU: 'TEST001', supplierId: 'SUP001', leadTimeDays: 10, unitCost: 5, minimumOrderQuantity: 20 },
    { supplierProductInfoId: 'SPI002', SKU: 'TEST002', supplierId: 'SUP002', leadTimeDays: 7, unitCost: 10, minimumOrderQuantity: 10 },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InventoryManagementService);

    // Initialize service with mock data for each test
    // @ts-ignore access private member for test setup
    service.products.next([...mockProducts]);
    // @ts-ignore
    service.salesOrders.next([...mockSalesOrders]);
    // @ts-ignore
    service.supplierProductInfos.next([...mockSupplierProductInfos]);
    // @ts-ignore
    service.purchaseOrders.next([]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateSalesVelocity', () => {
    it('should calculate average daily sales for a SKU over 30 days', async () => {
      const velocity = await firstValueFrom(service.calculateSalesVelocity('TEST001', 30));
      expect(velocity).toBe(15 / 30); // 15 units / 30 days
    });

    it('should return 0 if no sales for the SKU in the period', async () => {
      const velocity = await firstValueFrom(service.calculateSalesVelocity('SKU_NO_SALES', 30));
      expect(velocity).toBe(0);
    });

    it('should use provided sales data if available', async () => {
        const customSales: SalesOrder[] = [{ orderId: 'CS001', orderDate: new Date(), items: [{SKU: 'TEST001', quantity: 30}] }];
        // velocity with custom sales (30 sold today) over 30 days lookback = 30/30 = 1
        const velocity = await firstValueFrom(service.calculateSalesVelocity('TEST001', 30, customSales));
        expect(velocity).toBe(1);
    });
  });

  describe('getTotalStock', () => {
    it('should return total stock for a SKU', async () => {
      const stock = await firstValueFrom(service.getTotalStock('TEST001'));
      expect(stock).toBe(100);
    });

    it('should return 0 if SKU does not exist', async () => {
      const stock = await firstValueFrom(service.getTotalStock('SKU_NOT_EXIST'));
      expect(stock).toBe(0);
    });
  });

  describe('predictDaysUntilStockout', () => {
    it('should predict days until stockout correctly', () => {
      // currentStock = 100, safetyStock = 10, available = 90. Sales velocity = 0.5/day. 90 / 0.5 = 180 days
      const days = service.predictDaysUntilStockout('TEST001', 100, 10, 0.5);
      expect(days).toBe(180);
    });

    it('should return Infinity if sales velocity is 0', () => {
      const days = service.predictDaysUntilStockout('TEST001', 100, 10, 0);
      expect(days).toBe(Infinity);
    });

    it('should return 0 if available stock (current - safety) is 0 or less', () => {
      const days = service.predictDaysUntilStockout('TEST004', 20, 15, 1); // available = 5, velocity = 1 -> 5 days
      expect(days).toBe(5);
      const days2 = service.predictDaysUntilStockout('TEST004', 15, 15, 1); // available = 0
      expect(days2).toBe(0);
      const days3 = service.predictDaysUntilStockout('TEST004', 10, 15, 1); // available = -5 -> 0
      expect(days3).toBe(0);
    });
  });

  describe('determineReorderQuantity', () => {
    // currentStock, safetyStock, salesVelocity, demandForecastPeriodDays = 30
    it('should calculate reorder quantity correctly', () => {
      // Target stock = (0.5 * 30) + 10 = 15 + 10 = 25. Current stock = 100. Reorder = 25 - 100 = -75. Max(0, -75) = 0.
      let qty = service.determineReorderQuantity(100, 10, 0.5, 30);
      expect(qty).toBe(0);

      // Target stock = (2 * 30) + 10 = 60 + 10 = 70. Current stock = 20. Reorder = 70 - 20 = 50.
      qty = service.determineReorderQuantity(20, 10, 2, 30);
      expect(qty).toBe(50);
    });

    it('should return 0 if current stock is sufficient', () => {
      const qty = service.determineReorderQuantity(100, 10, 0.1, 30); // Target: (0.1*30)+10 = 13. Current 100.
      expect(qty).toBe(0);
    });
  });

  describe('getReorderAdviceForSKU', () => {
    it('should advise reorder if stock is low and will deplete before lead time', async () => {
      // TEST001: stock=100, safety=10, salesVel=0.5/day. DaysToStockout = (100-10)/0.5 = 180 days. Lead time=10 days.
      // 180 > 10, so no reorder.
      let advice = await service.getReorderAdviceForSKU('TEST001');
      expect(advice?.shouldReorder).toBe(false);

      // Modify TEST001 to have low stock for reorder scenario
      const products = service.products.getValue();
      const test001Index = products.findIndex(p => p.SKU === 'TEST001');
      products[test001Index].currentStock = {'WHS-A': 12}; // Stock = 12, Safety = 10. Available = 2. Velocity = 0.5. DaysOut = 2/0.5 = 4 days. LeadTime = 10.
      // @ts-ignore
      service.products.next(products); // update service's internal data

      advice = await service.getReorderAdviceForSKU('TEST001');
      expect(advice?.shouldReorder).toBe(true);
      expect(advice?.SKU).toBe('TEST001');
      expect(advice?.leadTimeDays).toBe(10);
      // Reorder Qty: Target = (0.5 * 30) + 10 = 25. Current Stock = 12. Need = 25 - 12 = 13.
      // Min Order Qty for TEST001 is 20. So final order qty should be 20.
      expect(advice?.reorderQuantity).toBe(13);
      expect(advice?.minimumOrderQuantity).toBe(20);
      expect(advice?.finalOrderQuantity).toBe(20);
      expect(advice?.estimatedCost).toBe(20 * 5); // 20 units * $5/unit
    });

    it('should not reorder if sales velocity is zero', async () => {
      // @ts-ignore
      service.salesOrders.next([]); // No sales
      const advice = await service.getReorderAdviceForSKU('TEST001'); // TEST001 has stock=100
      expect(advice?.shouldReorder).toBe(false);
      expect(advice?.salesVelocityPerDay).toBe(0);
      expect(advice?.daysUntilStockout).toBe(Infinity);
    });

    it('should return null for a non-existent SKU', async () => {
        const advice = await service.getReorderAdviceForSKU('NON_EXISTENT_SKU');
        expect(advice).toBeNull();
    });

    it('should handle product without preferred supplier', async () => {
        const noSupplierProduct: Product = { SKU: 'NO_SUP', name: 'No Supplier Product', currentStock: { 'WHS-A': 10 }, safetyStockQuantity: 2, preferredSupplierId: '' };
        // @ts-ignore
        service.products.next([...service.products.getValue(), noSupplierProduct]);
        const advice = await service.getReorderAdviceForSKU('NO_SUP');
        expect(advice?.shouldReorder).toBe(false);
        expect(advice?.leadTimeDays).toBe(Infinity);
        expect(advice?.preferredSupplierId).toBeUndefined();
    });
  });

  describe('runAutomatedReorderingProcess', () => {
    it('should generate POs only for items that need reordering', async () => {
      // Setup: Make TEST001 need reordering, TEST002 not need reordering.
      // TEST001: CurrentStock = 12, Safety=10, Available=2. Velocity=0.5. DaysOut=4. LeadTime=10. Needs reorder.
      // Final Qty = 20 (due to MOQ).
      const products = service.products.getValue();
      const test001Index = products.findIndex(p => p.SKU === 'TEST001');
      products[test001Index].currentStock = {'WHS-A': 12};
      // @ts-ignore
      service.products.next(products);

      // TEST002: Stock=50, Safety=5, Available=45. Velocity for TEST002 (1 sale/30 days) = 0.0333/day.
      // DaysOut for TEST002 = 45 / (1/30) = 1350 days. Lead Time = 7 days. No reorder.
      const generatedPOs = await service.runAutomatedReorderingProcess();

      expect(generatedPOs.length).toBe(1);
      expect(generatedPOs[0].items[0].SKU).toBe('TEST001');
      expect(generatedPOs[0].items[0].quantity).toBe(20); // MOQ is 20

      const purchaseOrders = await firstValueFrom(service.purchaseOrders$);
      expect(purchaseOrders.length).toBe(1);
      expect(purchaseOrders[0].items[0].SKU).toBe('TEST001');
    });

    it('should generate no POs if no items need reordering', async () => {
       // Reset TEST001 to not need reordering (its default state)
       // @ts-ignore
       service.products.next([...mockProducts]); // TEST001 stock is 100, won't need reorder. TEST002 also won't.

       const generatedPOs = await service.runAutomatedReorderingProcess();
       expect(generatedPOs.length).toBe(0);
       const purchaseOrders = await firstValueFrom(service.purchaseOrders$);
       expect(purchaseOrders.length).toBe(0);
    });
  });

});
