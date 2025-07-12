import { Injectable } from '@angular/core';
import { OrderService } from './services/order.service';
import { Order, OrderItem } from './model/order.model';
import { Product } from './model/product.model';
import { ProfitAnalyticsOrderDetail, ProfitAnalyticsItemDetail, MonthlyProfitSummary } from './model/analytics.model'; // Import new models
import { Observable, map, of, switchMap, forkJoin, from, catchError, startWith, combineLatest } from 'rxjs'; // Added combineLatest
import { Timestamp, Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import * as Highcharts from 'highcharts';

// Define an interface for orders enriched with COGS
interface OrderWithCogs extends Order {
  calculatedCogs: number;
}

// Interface for general chart data with loading and error states
export interface ChartData<T> {
  isLoading: boolean;
  data?: T;
  error?: any;
}

// Specific types for chart data
export interface SalesByProductEntry { // Renamed from SalesByProductChartData to avoid conflict with the wrapper
  name: string;
  y: number;
}

export interface HighchartsChartOptionsData extends ChartData<Highcharts.Options> {}
export interface SalesByProductData extends ChartData<SalesByProductEntry[]> {}

// Interface for OrderSummary to be used by component
export interface OrderSummaryData {
  totalLifetimeEarnings: number;
  totalOrders: number;
  averageEarningsPerOrder: number;
  isLoading: boolean;
  error?: any;
}


@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private orderService: OrderService, private firestore: Firestore) { }

  private safeGetDate(dateInput: any): Date | undefined {
    if (!dateInput) {
      return undefined;
    }
    if (dateInput instanceof Timestamp) {
      return dateInput.toDate();
    }
    if (dateInput instanceof Date) {
      return dateInput;
    }
    // Attempt to parse if it's a string or number
    const parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    return undefined;
  }

  public getOrderSummaryData(): Observable<OrderSummaryData> {
    return this.orderService.getAllOrders().pipe(
      map((orders: Order[]) => {
        let totalLifetimeEarnings = 0;
        let totalOrders = 0;

        for (const order of orders) {
          if (order.totalEarnings !== undefined && typeof order.totalEarnings === 'number' && !isNaN(order.totalEarnings)) {
            totalLifetimeEarnings += order.totalEarnings;
          }
          totalOrders++;
        }
        const averageEarningsPerOrder = totalOrders > 0 ? totalLifetimeEarnings / totalOrders : 0;

        return {
          totalLifetimeEarnings,
          totalOrders,
          averageEarningsPerOrder,
          isLoading: false
        };
      }),
      startWith({ totalLifetimeEarnings: 0, totalOrders: 0, averageEarningsPerOrder: 0, isLoading: true }),
      catchError(error => {
        console.error('Error fetching order summary data:', error);
        return of({
          totalLifetimeEarnings: 0,
          totalOrders: 0,
          averageEarningsPerOrder: 0,
          isLoading: false,
          error: true
        });
      })
    );
  }

  public getMonthlyProfitSummaryData(): Observable<ChartData<MonthlyProfitSummary[]>> {
    return this.getProfitMarginAnalyticsData().pipe(
      map(analyticsChartData => {
        if (analyticsChartData.error || !analyticsChartData.data) {
          return { isLoading: false, error: analyticsChartData.error, data: [] };
        }

        const monthlyAggregates: { [monthKey: string]: { totalRevenue: number; totalCOGS: number; totalGrossProfit: number; totalOrders: number } } = {};
        const monthYearFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }); // e.g., Jan 2023

        analyticsChartData.data.forEach(orderDetail => {
          const orderDate = this.safeGetDate(orderDetail.orderDate);
          if (orderDate) {
            const monthKey = monthYearFormat.format(orderDate);
            if (!monthlyAggregates[monthKey]) {
              monthlyAggregates[monthKey] = { totalRevenue: 0, totalCOGS: 0, totalGrossProfit: 0, totalOrders: 0 };
            }
            monthlyAggregates[monthKey].totalRevenue += orderDetail.totalRevenue;
            monthlyAggregates[monthKey].totalCOGS += orderDetail.totalCOGS;
            monthlyAggregates[monthKey].totalGrossProfit += orderDetail.totalGrossProfit;
            monthlyAggregates[monthKey].totalOrders += 1;
          }
        });

        const summary: MonthlyProfitSummary[] = Object.keys(monthlyAggregates).map(monthKey => {
          const aggregate = monthlyAggregates[monthKey];
          let overallProfitMargin = 0;
          if (aggregate.totalRevenue > 0) {
            overallProfitMargin = (aggregate.totalGrossProfit / aggregate.totalRevenue) * 100;
          } else if (aggregate.totalGrossProfit < 0) {
            overallProfitMargin = -Infinity; // Or other appropriate value for 0 revenue with loss
          }
          return {
            monthYear: monthKey,
            totalRevenue: aggregate.totalRevenue,
            totalCOGS: aggregate.totalCOGS,
            totalGrossProfit: aggregate.totalGrossProfit,
            overallProfitMargin: overallProfitMargin,
            totalOrders: aggregate.totalOrders,
          };
        });

        // Sort by date for chronological display, assuming monthKey can be parsed back to Date
        summary.sort((a, b) => new Date(a.monthYear).getTime() - new Date(b.monthYear).getTime());

        return { isLoading: false, data: summary };
      }),
      startWith({ isLoading: true, data: [] } as ChartData<MonthlyProfitSummary[]>), // Handled by getProfitMarginAnalyticsData, but good for safety
      catchError(error => { // This specific catchError might be redundant if getProfitMarginAnalyticsData handles it well
        console.error('Error processing monthly profit summary:', error);
        return of({ isLoading: false, error: true, data: [] } as ChartData<MonthlyProfitSummary[]>);
      })
    );
  }

  // --- Chart Data Methods ---
  // The following methods prepare data and Highcharts options for various dashboard charts.
  // Consideration for future refactoring:
  // If the number of charts grows significantly, or if there's a need for highly standardized
  // styling and behavior across many charts, consider creating:
  // 1. A base Highcharts options helper function that provides common configurations (e.g., styling, credits).
  // 2. More dedicated chart builder services/functions for very complex charts.
  // For the current set of charts, the direct construction of options within each method is manageable.
  // Empty/error chart states are handled by `createEmptyChartOptions` and `createEmptyCogsRevenueChartOptions`.

  public getMonthlySalesAndOrdersData(): Observable<HighchartsChartOptionsData> {
    return this.orderService.getAllOrders().pipe(
      map((orders: Order[]) => {
        const monthlyData: { [monthKey: string]: { sales: number; count: number } } = {};
        const monthYearFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setDate(1); // Start from the first day of the current month before going back
          d.setMonth(d.getMonth() - i);
          const monthKey = monthYearFormat.format(d);
          monthlyData[monthKey] = { sales: 0, count: 0 };
        }

        orders.forEach(order => {
          const orderDate = this.safeGetDate(order.created_date);

          if (orderDate) {
            const orderMonthKey = monthYearFormat.format(orderDate);
            // Ensure this month is one of the 6 months we are tracking
            if (monthlyData[orderMonthKey] && order.total_cost !== undefined && order.total_cost !== null) {
              monthlyData[orderMonthKey].sales += order.total_cost;
              monthlyData[orderMonthKey].count += 1;
            }
          }
        });

        const categories = Object.keys(monthlyData);
        const salesData = categories.map(cat => monthlyData[cat].sales);
        const ordersCountData = categories.map(cat => monthlyData[cat].count);

        return { // Highcharts.Options
          chart: { type: 'area' },
          title: { text: 'Monthly Sales and Orders (Last 6 Months)' },
          xAxis: { categories: categories, title: { text: 'Month' } },
          yAxis: [
            { title: { text: 'Total Sales' }, labels: { formatter: function() { return '$' + Highcharts.numberFormat(Number(this.value), 0, '.', ','); } } },
            { title: { text: 'Number of Orders' }, opposite: true, labels: { format: '{value}'} }
          ],
          series: [
            { name: 'Total Sales', type: 'area', data: salesData, yAxis: 0 },
            { name: 'Number of Orders', type: 'line', data: ordersCountData, yAxis: 1 }
          ],
          tooltip: { shared: true, crosshairs: true },
          credits: { enabled: false },
          exporting: { enabled: true }
        };
      }),
      map(options => ({ isLoading: false, data: options as Highcharts.Options } as HighchartsChartOptionsData)),
      startWith({ isLoading: true } as HighchartsChartOptionsData),
      catchError(error => {
        console.error('Error fetching monthly sales and orders data:', error);
        return of({ isLoading: false, error: true, data: this.createEmptyChartOptions('Monthly Sales and Orders (Error)') } as HighchartsChartOptionsData);
      })
    );
  }

  public getMonthlyCogsAndRevenue(): Observable<HighchartsChartOptionsData> {
    return this.orderService.getAllOrders().pipe(
      switchMap((orders: Order[]) => {
        if (!orders || orders.length === 0) {
          return of({ options: this.createEmptyCogsRevenueChartOptions(), productsMap: new Map<string, number>() });
        }

        // Collect all unique product numbers from all orders
        const allProductNos = new Set<string>();
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item.product_no) {
                allProductNos.add(String(item.product_no));
              }
            });
          }
        });

        if (allProductNos.size === 0) {
          // No products to fetch, so COGS will be 0 for all orders
          const ordersWithCogs = orders.map(order => ({ ...order, calculatedCogs: 0 } as OrderWithCogs));
          return of({ ordersWithCogs, productsMap: new Map<string, number>() });
        }

        // Fetch all products from Firestore.
        // This assumes the number of products is manageable.
        // For very large product catalogs, a more optimized strategy (e.g., batched 'IN' queries) would be needed.
        const productsCollection = collection(this.firestore, 'products');
        // We are fetching all products here. If specific product_no filtering is needed and efficient,
        // it would require multiple 'IN' queries due to Firestore limits (max 30 per query).
        // For now, fetching all and filtering locally is simpler than complex batching logic.
        return from(getDocs(productsCollection)).pipe(
          map(productsSnapshot => {
            const productsMap = new Map<string, number>();
            productsSnapshot.forEach(doc => {
              const product = doc.data() as Product;
              if (product.product_no) { // Ensure product_no exists
                productsMap.set(String(product.product_no), parseFloat(String(product.costPrice) || '0') || 0);
              }
            });
            return { orders, productsMap }; // Pass original orders and the created map
          }),
          catchError(err => {
            console.error("Error fetching products for COGS calculation:", err);
            // If product fetch fails, proceed with 0 COGS for all orders
            return of({ orders, productsMap: new Map<string, number>() });
          })
        );
      }),
      map(({ orders, productsMap, options }: { orders?: Order[], productsMap: Map<string, number>, options?: Highcharts.Options }) => {
        if (options) { // Came from the early exit (no orders)
            return options;
        }
        if (!orders) { // Should not happen if options is not set, but as a safeguard
             return this.createEmptyCogsRevenueChartOptions();
        }

        const ordersWithCogs: OrderWithCogs[] = orders.map(order => {
          let calculatedCogs = 0;
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const productNo = String(item.product_no);
              const quantity = parseFloat(String(item.quantity)) || 0;
              if (productNo && quantity > 0 && productsMap.has(productNo)) {
                calculatedCogs += (productsMap.get(productNo) as number) * quantity;
              }
            });
          }
          return { ...order, calculatedCogs };
        });
        // Corrected: Use the `ordersWithCogs` calculated in this scope.
        // const ordersWithCogs = ordersWithCogsOrOptions as OrderWithCogs[]; // This line was problematic
        const monthlyData: { [monthKey: string]: { revenue: number; cogs: number } } = {};
        const monthYearFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });

        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setDate(1);
          d.setMonth(d.getMonth() - i);
          const monthKey = monthYearFormat.format(d);
          monthlyData[monthKey] = { revenue: 0, cogs: 0 };
        }

        ordersWithCogs.forEach(order => {
          const orderDate = this.safeGetDate(order.created_date);

          if (orderDate) {
            const orderMonthKey = monthYearFormat.format(orderDate);
            if (monthlyData[orderMonthKey]) {
              monthlyData[orderMonthKey].revenue += order.total_cost || 0;
              monthlyData[orderMonthKey].cogs += order.calculatedCogs;
            }
          }
        });

        const categories = Object.keys(monthlyData);
        const revenueData = categories.map(cat => monthlyData[cat].revenue);
        const cogsData = categories.map(cat => monthlyData[cat].cogs);

        return { // Highcharts.Options
          chart: { type: 'column' },
          title: { text: 'Monthly Revenue vs. COGS (Last 6 Months)' },
          xAxis: { categories: categories, title: { text: 'Month' } },
          yAxis: [{ title: { text: 'Amount' }, labels: { formatter: function() { return '$' + Highcharts.numberFormat(Number(this.value), 0, '.', ','); } } }],
          series: [
            { name: 'Total Revenue', type: 'column', data: revenueData },
            { name: 'Total COGS', type: 'column', data: cogsData }
          ],
          tooltip: {
            shared: true,
            crosshairs: true,
            formatter: function() {
              let s = '<b>' + this.x + '</b>';
              (this.points || []).forEach(point => {
                s += '<br/><span style="color:' + point.color + '">\u25CF</span> ' + point.series.name + ': $' + Highcharts.numberFormat(point.y, 2, '.', ',');
              });
              return s;
            }
          },
          credits: { enabled: false },
          exporting: { enabled: true }
        };
      }),
      map(options => ({ isLoading: false, data: options as Highcharts.Options } as HighchartsChartOptionsData)),
      startWith({ isLoading: true } as HighchartsChartOptionsData),
      catchError(error => {
        console.error("Error in getMonthlyCogsAndRevenue:", error);
        return of({ isLoading: false, error: true, data: this.createEmptyCogsRevenueChartOptions("Monthly Revenue vs. COGS (Error)") } as HighchartsChartOptionsData);
      })
    );
  }

  private createEmptyCogsRevenueChartOptions(titleText?: string): Highcharts.Options {
    const categories = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      categories.push(new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(d));
    }
    return {
      chart: { type: 'column' },
      title: { text: titleText || 'Monthly Revenue vs. COGS (Last 6 Months)' },
      xAxis: { categories: categories, title: { text: 'Month' } },
      yAxis: [{ title: { text: 'Amount' }, labels: { formatter: function() { return '$' + Highcharts.numberFormat(Number(this.value), 0, '.', ','); } } }],
      series: [
        { name: 'Total Revenue', type: 'column', data: Array(6).fill(0) },
        { name: 'Total COGS', type: 'column', data: Array(6).fill(0) }
      ],
      credits: { enabled: false },
      exporting: { enabled: true },
      plotOptions: { series: { animation: false } }
    };
  }

  // Helper for empty generic chart options
  private createEmptyChartOptions(titleText: string, type: string = 'area'): Highcharts.Options {
    const categories = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      categories.push(new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(d));
    }
    return {
      chart: { type: type as any },
      title: { text: titleText },
      xAxis: { categories: categories },
      yAxis: [{ title: { text: '' } }],
      series: [{ type: type as any, name: 'No data', data: Array(6).fill(0) }],
      credits: { enabled: false },
      exporting: { enabled: true },
      plotOptions: { series: { animation: false } }
    };
  }

  public getSalesByProductData(startDate?: Date, endDate?: Date): Observable<SalesByProductData> {
    return this.orderService.getAllOrders().pipe(
      map((orders: Order[]) => {
        const productSales: { [productKey: string]: { name: string; sales: number } } = {};

        orders.forEach(order => {
          const orderDate = this.safeGetDate(order.created_date);

          if (orderDate) {
            let includeOrder = false;
            if (startDate && endDate) {
              // Adjust endDate to be inclusive (end of day)
              const adjustedEndDate = new Date(endDate);
              adjustedEndDate.setHours(23, 59, 59, 999);
              if (orderDate >= startDate && orderDate <= adjustedEndDate) {
                includeOrder = true;
              }
            } else {
              // Default to current month if no date range provided
              const targetDate = new Date();
              const targetYear = targetDate.getFullYear();
              const targetMonth = targetDate.getMonth();
              if (orderDate.getFullYear() === targetYear && orderDate.getMonth() === targetMonth) {
                includeOrder = true;
              }
            }

            if (includeOrder) {
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item: OrderItem) => {
                  const productKey = item.product_no || 'Unknown Product';
                  const itemName = item.product_name || /* item.name was never part of OrderItem */ productKey;
                  // item.name was not in OrderItem, if it was intended, OrderItem model needs update.
                  // For now, using product_name or productKey.
                  // Ensure item_cost is treated as a number
                  const itemCost = (typeof item.item_cost === 'string' ? parseFloat(item.item_cost) : Number(item.item_cost)) || 0;

                  if (productSales[productKey]) {
                    productSales[productKey].sales += itemCost;
                  } else {
                    productSales[productKey] = { name: itemName, sales: itemCost };
                  }
                });
              }
            }
          }
        });
        return Object.values(productSales).map(p => ({ name: p.name, y: p.sales } as SalesByProductEntry));
      }),
      map(data => ({ isLoading: false, data } as SalesByProductData)),
      startWith({ isLoading: true, data: [] } as SalesByProductData), // Provide empty array for data initially
      catchError(error => {
        console.error('Error fetching sales by product data:', error);
        return of({ isLoading: false, error: true, data: [] } as SalesByProductData);
      })
    );
  }

  // --- Existing methods from the original file ---
  // These methods return static/mock data and are used for generic widgets.
  // For a production application, this data would typically be fetched from a backend
  // or derived from actual application data.


  cards(): Observable<number[]> {
    return this.orderService.getAllOrders().pipe(
      map(orders => {
        const sales = orders.map(order => order.total_cost || 0);
        // Assuming "purchases" refers to the cost of goods for the orders, which can be calculated
        // if COGS data is available. For now, we'll use a placeholder for purchases.
        // This can be replaced with actual purchase data calculation.
        const purchases = orders.map(order => (order.total_cost || 0) * 0.6); // Example: 60% of sale price
        return sales;
      }),
      catchError(error => {
        console.error('Error fetching card data:', error);
        return of([0, 0, 0, 0]); // Return empty/default data on error
      })
    );
  }


  public getTopSellingProductsData(): Observable<SalesByProductData> {
    return this.orderService.getAllOrders().pipe(
      map((orders: Order[]) => {
        const productSales: { [productKey: string]: { name: string; sales: number } } = {};
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        orders.forEach(order => {
          const orderDate = this.safeGetDate(order.created_date);

          if (orderDate && orderDate >= twelveMonthsAgo) {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach((item: OrderItem) => {
                const productKey = item.product_no || 'Unknown Product';
                const itemName = item.product_name || productKey;
                const itemCost = (typeof item.item_cost === 'string' ? parseFloat(item.item_cost) : Number(item.item_cost)) || 0;

                if (productSales[productKey]) {
                  productSales[productKey].sales += itemCost;
                } else {
                  productSales[productKey] = { name: itemName, sales: itemCost };
                }
              });
            }
          }
        });

        const sortedProducts = Object.values(productSales)
          .map(p => ({ name: p.name, y: p.sales } as SalesByProductEntry))
          .sort((a, b) => b.y - a.y);

        return sortedProducts.slice(0, 5);
      }),
      map(data => ({ isLoading: false, data } as SalesByProductData)),
      startWith({ isLoading: true, data: [] } as SalesByProductData),
      catchError(error => {
        console.error('Error fetching top selling products data:', error);
        return of({ isLoading: false, error: true, data: [] } as SalesByProductData);
      })
    );
  }

  public getProfitMarginAnalyticsData(): Observable<ChartData<ProfitAnalyticsOrderDetail[]>> {
    return combineLatest([
      this.orderService.getAllOrders(),
      from(this.orderService.getProductCostMap()) // Convert Promise to Observable
    ]).pipe(
      map(([orders, productCostMap]) => {
        const analyticsDetails: ProfitAnalyticsOrderDetail[] = orders.map(order => {
          const itemsDetails: ProfitAnalyticsItemDetail[] = (order.items || []).map(item => {
            const costPricePerUnit = productCostMap.get(item.product_no) || 0;
            const sellingPricePerUnit = Number(item.item_cost) || 0; // Already per unit
            const quantity = Number(item.quantity) || 0;

            let grossProfitPerUnit = 0;
            let profitMarginPercentage = 0;

            if (sellingPricePerUnit > 0) { // Avoid division by zero for margin
              grossProfitPerUnit = sellingPricePerUnit - costPricePerUnit;
              profitMarginPercentage = (grossProfitPerUnit / sellingPricePerUnit) * 100;
            } else if (costPricePerUnit > 0) { // Negative profit if selling price is 0 but cost exists
              grossProfitPerUnit = -costPricePerUnit;
              profitMarginPercentage = -Infinity; // Or handle as per business logic for $0 selling price
            }


            return {
              SKU: item.product_no,
              productName: item.product_name,
              quantity: quantity,
              sellingPricePerUnit: sellingPricePerUnit,
              costPricePerUnit: costPricePerUnit,
              grossProfitPerUnit: grossProfitPerUnit,
              profitMarginPercentage: profitMarginPercentage,
              totalRevenueForItem: sellingPricePerUnit * quantity,
              totalCostForItem: costPricePerUnit * quantity,
              totalProfitForItem: grossProfitPerUnit * quantity,
            };
          });

          const totalRevenue = Number(order.total_cost) || 0;
          // totalEarnings is already Gross Profit (Revenue - COGS)
          const totalGrossProfit = Number(order.totalEarnings) || 0;
          const totalCOGS = totalRevenue - totalGrossProfit;

          let overallOrderProfitMargin = 0;
          if (totalRevenue > 0) { // Avoid division by zero
            overallOrderProfitMargin = (totalGrossProfit / totalRevenue) * 100;
          } else if (totalGrossProfit < 0) { // If revenue is 0 but there's a loss
            overallOrderProfitMargin = -Infinity;
          }

          return {
            orderId: order.id,
            orderDate: order.created_date,
            customerName: order.customer_name,
            totalRevenue: totalRevenue,
            totalCOGS: totalCOGS,
            totalGrossProfit: totalGrossProfit,
            overallOrderProfitMargin: overallOrderProfitMargin,
            items: itemsDetails,
          };
        });
        return { isLoading: false, data: analyticsDetails };
      }),
      startWith({ isLoading: true, data: [] } as ChartData<ProfitAnalyticsOrderDetail[]>),
      catchError(error => {
        console.error('Error fetching profit margin analytics data:', error);
        return of({ isLoading: false, error: true, data: [] } as ChartData<ProfitAnalyticsOrderDetail[]>);
      })
    );
  }
}
