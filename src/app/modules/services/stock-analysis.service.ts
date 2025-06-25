import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, Timestamp } from '@angular/fire/firestore';
import { Order, OrderItem } from '../model/order.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// OrderForSalesHistory interface removed, will use Order model directly.

@Injectable({
  providedIn: 'root'
})
export class StockAnalysisService {
  constructor(public firestore: Firestore) {}

  /**
   * Retrieves the sales history for a specific product.
   * @param productNo The product number (SKU or identifier) to find sales for.
   * @returns Observable of an array, where each element is { date: Timestamp, quantity: number }
   */
  getProductSalesHistory(productNo: string): Observable<{ date: Timestamp, quantity: number }[]> {
    const ordersCollectionRef = collection(this.firestore, 'orders');
    // Use the main Order model for type consistency
    return collectionData<Order>(ordersCollectionRef, { idField: 'id' }).pipe(
      map(orders => {
        const salesHistory: { date: Timestamp, quantity: number }[] = [];
        orders.forEach(order => {
          let validatedTimestamp: Timestamp | null = null;
          if (order.created_date) {
            if (order.created_date instanceof Timestamp) {
              validatedTimestamp = order.created_date;
            } else if (order.created_date instanceof Date) {
              validatedTimestamp = Timestamp.fromDate(order.created_date);
            } else if (typeof order.created_date === 'string') {
              // Attempt to parse if string, though this can be error-prone
              // and ideally Firestore returns Timestamps or they are converted upon fetch.
              const parsed = new Date(order.created_date);
              if (!isNaN(parsed.getTime())) {
                validatedTimestamp = Timestamp.fromDate(parsed);
              }
            }
          }

          if (order.items && Array.isArray(order.items) && validatedTimestamp) {
            // Type items as OrderItem
            order.items.forEach((item: OrderItem) => {
              if (item.product_no === productNo && typeof item.quantity === 'number') {
                salesHistory.push({
                  date: validatedTimestamp as Timestamp, // validatedTimestamp is already a Timestamp or null
                  quantity: +item.quantity // Ensure quantity is a number
                });
              }
            });
          }
        });
        return salesHistory.sort((a, b) => a.date.toMillis() - b.date.toMillis());
      })
    );
  }

  /**
   * Predicts stock levels for the next 7 days based on sales history.
   * @param productNo The product number (SKU or identifier).
   * @param currentStock The current available stock quantity.
   * @returns Observable of an array of { date: Date, predictedStock: number } for the next 7 days.
   */
  predictFutureStock(productNo: string, currentStock: number): Observable<{ date: Date, predictedStock: number }[]> {
    return this.getProductSalesHistory(productNo).pipe(
      map(salesHistory => {
        let averageDailySales = 0;
        const N_DAYS_FOR_AVERAGE = 30; // Use a 30-day window for averaging

        if (salesHistory && salesHistory.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Normalize to start of today

          const startDateForAvg = new Date(today);
          startDateForAvg.setDate(today.getDate() - N_DAYS_FOR_AVERAGE);

          // Filter sales within the last N_DAYS_FOR_AVERAGE period (from startDateForAvg up to, but not including, today)
          const salesInPeriod = salesHistory.filter(sale => {
            const saleDate = sale.date.toDate(); // Convert Firestore Timestamp to JS Date
            // It's important to normalize saleDate if we want to compare dates only,
            // but getProductSalesHistory already returns sorted sales, so we mainly care about the range.
            // For this filter, exact time of saleDate matters if startDateForAvg has a time component.
            // Let's ensure comparison is consistent.
            return saleDate >= startDateForAvg && saleDate < today;
          });

          if (salesInPeriod.length > 0) {
            const totalQuantitySoldInPeriod = salesInPeriod.reduce((sum, sale) => sum + sale.quantity, 0);
            averageDailySales = totalQuantitySoldInPeriod / N_DAYS_FOR_AVERAGE;
          }
          // If no sales in the period, averageDailySales remains 0.
        }

        const predictions: { date: Date, predictedStock: number }[] = [];
        let currentPredictedStock = currentStock;

        for (let i = 0; i < 7; i++) { // Predict for today + next 6 days
          const futureDate = new Date();
          futureDate.setHours(0, 0, 0, 0); // Normalize date
          futureDate.setDate(futureDate.getDate() + i);

          if (i > 0) { // For days after today, deduct the average daily sales from the previous day's prediction
            currentPredictedStock -= averageDailySales;
          }
          // For i=0 (today), the prediction is the currentStock before any further sales today.

          predictions.push({
            date: futureDate,
            predictedStock: Math.max(0, Math.round(currentPredictedStock)) // Ensure stock doesn't go below zero and round it
          });
        }
        return predictions;
      })
    );
  }
}
