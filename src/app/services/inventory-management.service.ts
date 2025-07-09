import { Injectable } from '@angular/core';
import {
  Product,
  SalesOrder,
  SupplierProductInfo,
  PurchaseOrder,
  HistoricalSale,
  ReorderAdvice,
  Warehouse,
  Supplier,
  PurchaseOrderItem
} from '../models/inventory.models';
import { BehaviorSubject, Observable, of, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InventoryManagementService {

  // --- Mock Data Store ---
  // In a real app, these would come from a backend API / database (e.g., Firestore)
  private warehouses = new BehaviorSubject<Warehouse[]>([
    { warehouseId: 'WHS-A', locationName: 'Main Warehouse', address: '123 Main St' },
    { warehouseId: 'WHS-B', locationName: 'Secondary Warehouse', address: '456 Secondary Ave' },
    { warehouseId: 'WHS-C', locationName: 'East Coast Hub', address: '789 East Coast Rd' },
  ]);
  private products = new BehaviorSubject<Product[]>([
    // Sample Product
    { SKU: 'TSHIRT-BLK-M', name: 'Black T-Shirt, Medium', currentStock: { 'WHS-A': 50, 'WHS-B': 30 }, safetyStockQuantity: 10, preferredSupplierId: 'SUPPLIER-001' },
    { SKU: 'MUG-COFFEE-XL', name: 'XL Coffee Mug', currentStock: { 'WHS-A': 100, 'WHS-C': 75 }, safetyStockQuantity: 20, preferredSupplierId: 'SUPPLIER-002' },
    { SKU: 'STICKER-LOGO', name: 'Logo Sticker Pack', currentStock: { 'WHS-A': 200, 'WHS-B': 150, 'WHS-C': 100 }, safetyStockQuantity: 50, preferredSupplierId: 'SUPPLIER-001' },
  ]);
  private salesOrders = new BehaviorSubject<SalesOrder[]>([
    // Sample Sales Data (ensure dates are useful for velocity calculation)
    { orderId: 'SO-001', orderDate: new Date(new Date().setDate(new Date().getDate() - 5)), items: [{ SKU: 'TSHIRT-BLK-M', quantity: 2 }] },
    { orderId: 'SO-002', orderDate: new Date(new Date().setDate(new Date().getDate() - 10)), items: [{ SKU: 'TSHIRT-BLK-M', quantity: 3 }] },
    { orderId: 'SO-003', orderDate: new Date(new Date().setDate(new Date().getDate() - 15)), items: [{ SKU: 'MUG-COFFEE-XL', quantity: 10 }] },
    { orderId: 'SO-004', orderDate: new Date(new Date().setDate(new Date().getDate() - 2)), items: [{ SKU: 'MUG-COFFEE-XL', quantity: 5 }, { SKU: 'TSHIRT-BLK-M', quantity: 1 }] },
  ]);
  private supplierProductInfos = new BehaviorSubject<SupplierProductInfo[]>([
    { supplierProductInfoId: 'SPI-001', supplierId: 'SUPPLIER-001', SKU: 'TSHIRT-BLK-M', leadTimeDays: 14, unitCost: 5.50, minimumOrderQuantity: 50 },
    { supplierProductInfoId: 'SPI-002', supplierId: 'SUPPLIER-002', SKU: 'MUG-COFFEE-XL', leadTimeDays: 20, unitCost: 2.75, minimumOrderQuantity: 100 },
  ]);
  private suppliers = new BehaviorSubject<Supplier[]>([
    { supplierId: 'SUPPLIER-001', name: 'T-Shirt Kings Inc.'},
    { supplierId: 'SUPPLIER-002', name: 'Mugs R Us Co.'}
  ]);
  private purchaseOrders = new BehaviorSubject<PurchaseOrder[]>([]);

  // --- Observables for components to consume data ---
  products$: Observable<Product[]> = this.products.asObservable();
  salesOrders$: Observable<SalesOrder[]> = this.salesOrders.asObservable();
  supplierProductInfos$: Observable<SupplierProductInfo[]> = this.supplierProductInfos.asObservable();
  suppliers$: Observable<Supplier[]> = this.suppliers.asObservable();
  purchaseOrders$: Observable<PurchaseOrder[]> = this.purchaseOrders.asObservable();
  warehouses$: Observable<Warehouse[]> = this.warehouses.asObservable(); // New Observable for warehouses

  constructor() { }

  // --- Core Logic Functions ---

  /**
   * Retrieves a product by its SKU.
   */
  getProductBySKU(sku: string, productsData?: Product[]): Observable<Product | undefined> {
    return (productsData ? of(productsData) : this.products$).pipe(
      map(products => products.find(p => p.SKU === sku))
    );
  }

  /**
   * Retrieves the current stock levels for a given SKU across all warehouses.
   * Returns an empty object if the product or stock info is not found.
   */
  getProductStockByWarehouse(sku: string, productsData?: Product[]): Observable<{ [warehouseId: string]: number }> {
    return this.getProductBySKU(sku, productsData).pipe(
      map(product => product ? product.currentStock : {})
    );
  }

  /**
   * Retrieves a warehouse by its ID.
   */
  getWarehouseById(warehouseId: string, warehousesData?: Warehouse[]): Observable<Warehouse | undefined> {
    return (warehousesData ? of(warehousesData) : this.warehouses$).pipe(
      map(warehouses => warehouses.find(w => w.warehouseId === warehouseId))
    );
  }

  /**
   * Calculates average daily sales velocity for a given SKU.
   * @param sku The product SKU.
   * @param lookbackDays Number of past days to consider for sales data.
   * @param salesData Optional: provide sales data directly, otherwise uses service's salesOrders.
   */
  calculateSalesVelocity(sku: string, lookbackDays: number = 30, salesData?: SalesOrder[]): Observable<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - lookbackDays);

    return (salesData ? of(salesData) : this.salesOrders$).pipe(
      map(orders => {
        const relevantSales = orders.filter(order => order.orderDate >= startDate && order.orderDate <= endDate);
        let totalSold = 0;
        relevantSales.forEach(order => {
          order.items.forEach(item => {
            if (item.SKU === sku) {
              totalSold += item.quantity;
            }
          });
        });
        return totalSold / lookbackDays;
      })
    );
  }

  /**
   * Gets the total stock for an SKU across all warehouses.
   */
  getTotalStock(sku: string, productsData?: Product[]): Observable<number> {
    return (productsData ? of(productsData) : this.products$).pipe(
      map(products => {
        const product = products.find(p => p.SKU === sku);
        if (!product) return 0;
        return Object.values(product.currentStock).reduce((acc, val) => acc + val, 0);
      })
    );
  }

  /**
   * Retrieves supplier lead time for a specific SKU and supplier.
   */
  getSupplierLeadTime(sku: string, supplierId: string, supplierInfos?: SupplierProductInfo[]): Observable<number> {
    return (supplierInfos ? of(supplierInfos) : this.supplierProductInfos$).pipe(
      map(infos => {
        const info = infos.find(i => i.SKU === sku && i.supplierId === supplierId);
        return info ? info.leadTimeDays : Infinity; // Default to infinity if not found
      })
    );
  }

  /**
   * Retrieves minimum order quantity for a specific SKU and supplier.
   */
  getMinimumOrderQuantity(sku: string, supplierId: string, supplierInfos?: SupplierProductInfo[]): Observable<number> {
    return (supplierInfos ? of(supplierInfos) : this.supplierProductInfos$).pipe(
      map(infos => {
        const info = infos.find(i => i.SKU === sku && i.supplierId === supplierId);
        return info ? info.minimumOrderQuantity : 0; // Default to 0 if not found
      })
    );
  }

  /**
   * Retrieves unit cost for a specific SKU and supplier.
   */
  getUnitCost(sku: string, supplierId: string, supplierInfos?: SupplierProductInfo[]): Observable<number> {
    return (supplierInfos ? of(supplierInfos) : this.supplierProductInfos$).pipe(
      map(infos => {
        const info = infos.find(i => i.SKU === sku && i.supplierId === supplierId);
        return info ? info.unitCost : Infinity; // Default to infinity if not found
      })
    );
  }

  /**
   * Predicts the number of days until stock runs out, considering safety stock.
   */
  predictDaysUntilStockout(
    sku: string,
    currentStock: number,
    safetyStockQuantity: number,
    salesVelocity: number
  ): number {
    if (salesVelocity <= 0) return Infinity; // Or a very large number
    const availableStock = currentStock - safetyStockQuantity;
    return availableStock > 0 ? availableStock / salesVelocity : 0;
  }

  /**
   * Determines if a product SKU should be reordered.
   */
  async shouldReorder(
    sku: string,
    product: Product,
    currentStock: number,
    salesVelocity: number,
    leadTime: number
  ): Promise<boolean> {
    if (!product) return false;

    const daysToStockout = this.predictDaysUntilStockout(
      sku,
      currentStock,
      product.safetyStockQuantity,
      salesVelocity
    );
    return daysToStockout <= leadTime;
  }

  /**
   * Determines the quantity to reorder for an SKU.
   * @param demandForecastPeriodDays How many days of demand to cover with the reorder.
   */
  determineReorderQuantity(
    currentStock: number,
    safetyStockQuantity: number,
    salesVelocity: number,
    demandForecastPeriodDays: number = 30
  ): number {
    const targetStock = (salesVelocity * demandForecastPeriodDays) + safetyStockQuantity;
    const reorderQty = targetStock - currentStock;
    return Math.max(0, reorderQty); // Ensure it's not negative
  }

  /**
   * Generates reorder advice for a single SKU.
   * This is the core of the auto-reorder logic for one item.
   */
  async getReorderAdviceForSKU(sku: string, demandForecastPeriodDays: number = 30): Promise<ReorderAdvice | null> {
    const products = this.products.getValue();
    const product = products.find(p => p.SKU === sku);

    if (!product) {
      console.warn(`Product with SKU ${sku} not found for reorder advice.`);
      return null;
    }

    const currentStock = await firstValueFrom(this.getTotalStock(sku, products)) ?? 0;
    const salesVelocity = await firstValueFrom(this.calculateSalesVelocity(sku, 30, this.salesOrders.getValue())) ?? 0;

    if (!product.preferredSupplierId) {
        console.warn(`Product with SKU ${sku} has no preferred supplier defined.`);
        return {
            SKU: sku,
            shouldReorder: false,
            currentStock: currentStock,
            safetyStock: product.safetyStockQuantity,
            salesVelocityPerDay: salesVelocity,
            daysUntilStockout: this.predictDaysUntilStockout(sku, currentStock, product.safetyStockQuantity, salesVelocity),
            leadTimeDays: Infinity,
            reorderQuantity: 0,
            preferredSupplierId: undefined,
            minimumOrderQuantity: 0,
            finalOrderQuantity: 0,
            estimatedCost: 0,
        };
    }

    const leadTime = await firstValueFrom(this.getSupplierLeadTime(sku, product.preferredSupplierId, this.supplierProductInfos.getValue())) ?? Infinity;
    const minOrderQty = await firstValueFrom(this.getMinimumOrderQuantity(sku, product.preferredSupplierId, this.supplierProductInfos.getValue())) ?? 0;
    const unitCost = await firstValueFrom(this.getUnitCost(sku, product.preferredSupplierId, this.supplierProductInfos.getValue())) ?? Infinity;

    // Handle case where unitCost is Infinity (supplier/product info missing)
    if (unitCost === Infinity && salesVelocity > 0) { // only warn if there's demand
        console.warn(`Unit cost for SKU ${sku} from supplier ${product.preferredSupplierId} is Infinity. Check SupplierProductInfo. PO generation might be problematic.`);
    }

    const needsReorder = await this.shouldReorder(sku, product, currentStock, salesVelocity, leadTime);
    let finalOrderQuantity = 0;
    let reorderQuantity = 0;
    let estimatedCost = 0;

    if (needsReorder) {
      reorderQuantity = this.determineReorderQuantity(
        currentStock,
        product.safetyStockQuantity,
        salesVelocity,
        demandForecastPeriodDays
      );

      if (reorderQuantity > 0) { // Only proceed if calculated need is positive
        finalOrderQuantity = Math.max(reorderQuantity, minOrderQty);
        if (unitCost !== Infinity) {
            estimatedCost = finalOrderQuantity * unitCost;
        } else {
            estimatedCost = Infinity; // Can't calculate cost if unit cost is unknown
            console.warn(`Cannot calculate estimated cost for SKU ${sku} due to missing unit cost.`);
        }
      } else { // Calculated need is zero or negative, no reorder needed based on demand vs stock
        finalOrderQuantity = 0;
        reorderQuantity = 0; // ensure this is also zero
        estimatedCost = 0;
      }

      // If, after all calculations, finalOrderQuantity is 0 (e.g. reorderQuantity was 0, or minOrderQty made it effectively 0 and reorderQuantity was already low)
      // then it shouldn't be a reorder.
      if (finalOrderQuantity <= 0) {
        return {
            SKU: sku,
            shouldReorder: false, // Overriding 'needsReorder' if final quantity is 0
            currentStock: currentStock,
            safetyStock: product.safetyStockQuantity,
            salesVelocityPerDay: salesVelocity,
            daysUntilStockout: this.predictDaysUntilStockout(sku, currentStock, product.safetyStockQuantity, salesVelocity),
            leadTimeDays: leadTime,
            reorderQuantity: 0,
            preferredSupplierId: product.preferredSupplierId,
            minimumOrderQuantity: minOrderQty,
            finalOrderQuantity: 0,
            estimatedCost: 0,
        };
      }
    }

    return {
      SKU: sku,
      shouldReorder: needsReorder && finalOrderQuantity > 0,
      currentStock,
      safetyStock: product.safetyStockQuantity,
      salesVelocityPerDay: salesVelocity,
      daysUntilStockout: this.predictDaysUntilStockout(sku, currentStock, product.safetyStockQuantity, salesVelocity),
      leadTimeDays: leadTime,
      reorderQuantity: needsReorder ? reorderQuantity : 0,
      preferredSupplierId: product.preferredSupplierId,
      minimumOrderQuantity: minOrderQty,
      finalOrderQuantity: needsReorder ? finalOrderQuantity : 0,
      estimatedCost: needsReorder ? estimatedCost : 0,
    };
  }

  /**
   * Generates a Purchase Order based on reorder advice.
   */
  async createPurchaseOrderFromAdvice(advice: ReorderAdvice): Promise<PurchaseOrder | null> {
    if (!advice.shouldReorder || !advice.finalOrderQuantity || advice.finalOrderQuantity <= 0 || !advice.preferredSupplierId || advice.estimatedCost === Infinity) {
      if(advice.estimatedCost === Infinity) {
        console.warn(`Cannot create PO for SKU ${advice.SKU} because its estimated cost is Infinity (likely missing unit cost data).`);
      }
      return null;
    }

    // Unit cost should have been part of the advice or re-fetched if necessary,
    // but for safety, let's assume advice.estimatedCost / advice.finalOrderQuantity gives us the unit cost used.
    // Or better, fetch it again to ensure accuracy if not passed in advice.
    // For now, we'll trust the advice.estimatedCost.
    const unitCostForPO = advice.estimatedCost && advice.finalOrderQuantity ? advice.estimatedCost / advice.finalOrderQuantity : 0;
    if (unitCostForPO === 0 && advice.estimatedCost && advice.estimatedCost > 0) {
        // This case implies something is wrong, like finalOrderQuantity being zero when it shouldn't be.
        // However, the initial guard clause should catch finalOrderQuantity <= 0.
        // If estimatedCost > 0 but unitCostForPO is 0, it implies issues.
        // For safety, let's re-fetch.
         const fetchedUnitCost = await firstValueFrom(this.getUnitCost(advice.SKU, advice.preferredSupplierId, this.supplierProductInfos.getValue())) ?? Infinity;
         if (fetchedUnitCost === Infinity) {
            console.error(`Failed to retrieve unit cost for PO generation for SKU ${advice.SKU}. PO will not be created.`);
            return null;
         }
         // poItem.unitCost will use this fetchedUnitCost
    }


    const poItem: PurchaseOrderItem = {
      SKU: advice.SKU,
      quantity: advice.finalOrderQuantity,
      // Use the unitCost that was used to calculate the estimatedCost in advice, or re-fetch if there are concerns.
      // Let's assume the estimatedCost in advice is reliable and derive unit cost, or use a freshly fetched one.
      unitCost: (advice.estimatedCost && advice.finalOrderQuantity) ? (advice.estimatedCost / advice.finalOrderQuantity) : await firstValueFrom(this.getUnitCost(advice.SKU, advice.preferredSupplierId, this.supplierProductInfos.getValue())) ?? 0
    };

    // Check if unitCost became NaN or Infinity after calculation
    if (isNaN(poItem.unitCost) || !isFinite(poItem.unitCost)) {
        console.error(`Invalid unit cost (${poItem.unitCost}) for SKU ${advice.SKU}. PO will not be created.`);
        return null;
    }


    const newPO: PurchaseOrder = {
      poId: `PO-${Date.now()}-${Math.random().toString(16).slice(2)}`, // Simple unique PO ID
      creationDate: new Date(),
      supplierId: advice.preferredSupplierId,
      items: [poItem],
      expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + (advice.leadTimeDays !== Infinity ? advice.leadTimeDays : 999))), // use a large default if leadTime is Infinity
      status: 'pending'
    };

    const currentPOs = this.purchaseOrders.getValue();
    this.purchaseOrders.next([...currentPOs, newPO]);
    console.log('Generated Purchase Order:', newPO);
    return newPO;
  }

  /**
   * Automated Reordering Process simulation for all products.
   * In a real app, this might be triggered by a cron job or a backend process.
   */
  async runAutomatedReorderingProcess(demandForecastPeriodDays: number = 30): Promise<PurchaseOrder[]> {
    const products = this.products.getValue();
    const generatedPOs: PurchaseOrder[] = [];

    for (const product of products) {
      const advice = await this.getReorderAdviceForSKU(product.SKU, demandForecastPeriodDays);
      if (advice && advice.shouldReorder && advice.finalOrderQuantity && advice.finalOrderQuantity > 0) {
        const po = await this.createPurchaseOrderFromAdvice(advice);
        if (po) {
          generatedPOs.push(po);
        }
      }
    }
    if (generatedPOs.length > 0) {
        console.log(`${generatedPOs.length} purchase order(s) generated.`);
    } else {
        console.log("No purchase orders needed at this time based on current stock and sales velocity.");
    }
    return generatedPOs;
  }

  // --- Utility / CRUD like methods for managing mock data (examples) ---

  addProduct(product: Product): void {
    const current = this.products.getValue();
    this.products.next([...current, product]);
  }

  addSalesOrder(order: SalesOrder): void {
    const current = this.salesOrders.getValue();
    this.salesOrders.next([...current, order]);
    // Potentially update stock levels here if this service was also managing real-time stock
  }

  // Example of how stock might be updated after a sale or PO receipt
  // This is simplified; a real system would need more robust inventory transaction logging.
  updateStock(sku: string, warehouseId: string, quantityChange: number): void {
    const currentProducts = this.products.getValue();
    const productIndex = currentProducts.findIndex(p => p.SKU === sku);
    if (productIndex > -1) {
      const product = { ...currentProducts[productIndex] };
      product.currentStock = { ...product.currentStock }; // Ensure immutability for change detection
      if (product.currentStock[warehouseId] !== undefined) {
        product.currentStock[warehouseId] += quantityChange;
      } else {
        // This case should ideally not happen if warehouses are well-defined for products
        console.warn(`Warehouse ${warehouseId} not found for SKU ${sku}. Stock not updated for this warehouse.`);
        // OR: product.currentStock[warehouseId] = quantityChange; // If you want to allow adding stock to a new warehouse entry dynamically
      }
      currentProducts[productIndex] = product;
      this.products.next([...currentProducts]);
    }
  }
}
