import { Injectable } from '@angular/core';
import { ItemService } from './services/item.service';
import { Order } from './model/order.model'; // Adjusted path if necessary based on actual location
import { Product } from './model/product.model'; // Adjusted path if necessary
import { Observable, map, of, switchMap, forkJoin, from, catchError } from 'rxjs';
import { Timestamp, Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import * as Highcharts from 'highcharts';

// Define an interface for orders enriched with COGS
interface OrderWithCogs extends Order {
  calculatedCogs: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  // Making firestore directly accessible if itemService already has it public
  // Or pass it to the constructor if needed. For this example, assume itemService.firestore is accessible.
  constructor(private itemService: ItemService, private firestore: Firestore) { }


  public getMonthlySalesAndOrdersData(): Observable<Highcharts.Options> {
    return this.itemService.GetOrdersList().pipe(
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
          let orderDate: Date | undefined;
          if (order.created_date) {
            if (order.created_date instanceof Timestamp) {
                orderDate = order.created_date.toDate();
            } else if (order.created_date instanceof Date) {
                orderDate = order.created_date;
            } else {
                const parsedDate = new Date(order.created_date as any);
                if (!isNaN(parsedDate.getTime())) {
                    orderDate = parsedDate;
                }
            }
          }

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

        return {
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
        } as Highcharts.Options;
      })
    );
  }

  public getMonthlyCogsAndRevenue(): Observable<Highcharts.Options> {
    return this.itemService.GetOrdersList().pipe(
      switchMap((orders: Order[]) => {
        if (!orders || orders.length === 0) {
          // Return empty chart options if there are no orders
          return of(this.createEmptyCogsRevenueChartOptions());
        }

        const orderCogsObservables: Observable<OrderWithCogs>[] = orders.map(order => {
          if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
            return of({ ...order, calculatedCogs: 0 } as OrderWithCogs);
          }

          const itemCostObservables: Observable<number>[] = order.items.map((item: any) => {
            const productNo = String(item.product_no); // Ensure product_no is a string
            const quantity = parseFloat(String(item.quantity)) || 0;

            if (!productNo || quantity === 0) {
              return of(0); // No product number or zero quantity
            }

            const productQuery = query(collection(this.firestore, 'products'), where('product_no', '==', productNo));
            return from(getDocs(productQuery)).pipe(
              map(querySnapshot => {
                if (!querySnapshot.empty) {
                  const productData = querySnapshot.docs[0].data() as Product;
                  const costPrice = parseFloat(String(productData.costPrice) || '0') || 0;
                  return quantity * costPrice;
                }
                return 0; // Product not found
              }),
              catchError(() => of(0)) // Error during product fetch
            );
          });

          // If itemCostObservables is empty, forkJoin would error. Return 0 COGS for the order.
          if (itemCostObservables.length === 0) {
             return of({ ...order, calculatedCogs: 0 } as OrderWithCogs);
          }

          return forkJoin(itemCostObservables).pipe(
            map(costs => {
              const totalOrderCogs = costs.reduce((acc, cost) => acc + cost, 0);
              return { ...order, calculatedCogs: totalOrderCogs } as OrderWithCogs;
            }),
            catchError(() => of({ ...order, calculatedCogs: 0 } as OrderWithCogs)) // Error in forkJoin
          );
        });

        return forkJoin(orderCogsObservables);
      }),
      map((ordersWithCogs: OrderWithCogs[]) => {
        // This part is similar to the original logic but uses ordersWithCogs
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
          let orderDate: Date | undefined;
          if (order.created_date) {
            if (order.created_date instanceof Timestamp) {
              orderDate = order.created_date.toDate();
            } else if (order.created_date instanceof Date) {
              orderDate = order.created_date;
            } else {
              const parsedDate = new Date(order.created_date as any);
              if (!isNaN(parsedDate.getTime())) { orderDate = parsedDate; }
            }
          }

          if (orderDate) {
            const orderMonthKey = monthYearFormat.format(orderDate);
            if (monthlyData[orderMonthKey]) {
              monthlyData[orderMonthKey].revenue += order.total_cost || 0;
              monthlyData[orderMonthKey].cogs += order.calculatedCogs; // Use pre-calculated COGS
            }
          }
        });

        const categories = Object.keys(monthlyData);
        const revenueData = categories.map(cat => monthlyData[cat].revenue);
        const cogsData = categories.map(cat => monthlyData[cat].cogs);

        return {
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
        } as Highcharts.Options;
      }),
      catchError(error => {
        console.error("Error in getMonthlyCogsAndRevenue:", error);
        return of(this.createEmptyCogsRevenueChartOptions()); // Return empty chart on error
      })
    );
  }

  private createEmptyCogsRevenueChartOptions(): Highcharts.Options {
    const categories = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      categories.push(new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(d));
    }
    return {
      chart: { type: 'column' },
      title: { text: 'Monthly Revenue vs. COGS (Last 6 Months)' },
      xAxis: { categories: categories, title: { text: 'Month' } },
      yAxis: [{ title: { text: 'Amount' }, labels: { formatter: function() { return '$' + Highcharts.numberFormat(Number(this.value), 0, '.', ','); } } }],
      series: [
        { name: 'Total Revenue', type: 'column', data: Array(6).fill(0) },
        { name: 'Total COGS', type: 'column', data: Array(6).fill(0) }
      ],
      credits: { enabled: false },
      exporting: { enabled: true },
      plotOptions: { series: { animation: false } } // Disable animation for empty/error state
    };
  }

  public getSalesByProductData(startDate?: Date, endDate?: Date): Observable<{ name: string; y: number }[]> {
    return this.itemService.GetOrdersList().pipe(
      map((orders: Order[]) => {
        const productSales: { [productKey: string]: { name: string; sales: number } } = {};

        orders.forEach(order => {
          let orderDate: Date | undefined;
          if (order.created_date) {
            if (order.created_date instanceof Timestamp) {
              orderDate = order.created_date.toDate();
            } else if (order.created_date instanceof Date) {
              orderDate = order.created_date;
            } else {
              const parsedDate = new Date(order.created_date as any);
              if (!isNaN(parsedDate.getTime())) {
                orderDate = parsedDate;
              }
            }
          }

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
                order.items.forEach((item: any) => {
                  const productKey = item.product_no || 'Unknown Product';
                  const itemName = item.product_name || item.name || productKey;
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
        return Object.values(productSales).map(p => ({ name: p.name, y: p.sales }));
      })
    );
  }

  // --- Existing methods from the original file ---
  bigChart() {
    return [{
        name: 'Asia',
        data: [502, 635, 809, 947, 1402, 3634, 5268]
    }, {
        name: 'Africa',
        data: [106, 107, 111, 133, 221, 767, 1766]
    }, {
        name: 'Europe',
        data: [163, 203, 276, 408, 547, 729, 628]
    }, {
        name: 'America',
        data: [18, 31, 54, 156, 339, 818, 1201]
    }, {
        name: 'Oceania',
        data: [2, 2, 2, 6, 13, 30, 46]
    }];
  }

  cards() {
    return [71, 78, 39, 66];
  }

  pieChart() { // This is the original generic pie chart data
    return [{
        name: 'Chrome',
        y: 61.41,
        sliced: true,
        selected: true
    }, {
        name: 'Internet Explorer',
        y: 11.84
    }, {
        name: 'Firefox',
        y: 10.85
    }, {
        name: 'Edge',
        y: 4.67
    }, {
        name: 'Safari',
        y: 4.18
    }, {
        name: 'Sogou Explorer',
        y: 1.64
    }, {
        name: 'Opera',
        y: 1.6
    }, {
        name: 'QQ',
        y: 1.2
    }, {
        name: 'Other',
        y: 2.61
    }];
  }
}
