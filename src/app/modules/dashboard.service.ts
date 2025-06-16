import { Injectable } from '@angular/core';
import { ItemService } from '../services/item.service';
import { Order } from '../model/order.model';
// Product model might be needed if we enhance salesByProduct to use product names from product list
// import { Product } from '../model/product.model';
import { Observable, map, of } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import * as Highcharts from 'highcharts'; // Import Highcharts

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private itemService: ItemService) { }

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
            { title: { text: 'Total Sales' }, labels: { formatter: function() { return '$' + Highcharts.numberFormat(this.value, 0, '.', ','); } } },
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

  public getSalesByProductData(month?: Date): Observable<{ name: string; y: number }[]> {
    const targetDate = month || new Date();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();

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

                if (orderDate && orderDate.getFullYear() === targetYear && orderDate.getMonth() === targetMonth) {
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach((item: any) => {
                            const productKey = item.product_no || 'Unknown Product';
                            const itemName = item.product_name || item.name || productKey;
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
