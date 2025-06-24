import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Order, OrderItem } from '../model/order.model';
import { environment } from '../../../environments/environment';

// Interface for the raw order data structure from the mock eBay API
interface RawEbayOrder {
  ebayOrderId: string;
  buyerUsername: string;
  buyerShippingAddress: string;
  paymentMethod: string;
  shippingCost: number;
  orderDiscount: number;
  orderTotal: number;
  items: Array<{
    sku: string;
    productTitle: string;
    quantitySold: number;
    unitPrice: number;
    lineItemTotal: number;
  }>;
  orderDate: string; // ISO date string
}

@Injectable({
  providedIn: 'root'
})
export class EbayService {
  private ebayApiEndpoint = environment.ebayApiConfig?.endpoint;
  private mockDataUrl = environment.ebayApiConfig?.mockDataUrl; // For local mock data

  constructor(private http: HttpClient) {
    if (!this.ebayApiEndpoint && !this.mockDataUrl) {
      console.warn('EbayService: API endpoint or mockDataUrl is not configured in environment files.');
    }
  }

  /**
   * Fetches new orders from an external source, simulating an eBay API.
   *
   * Behavior:
   * 1. If `environment.ebayApiConfig.mockDataUrl` is set, it attempts to fetch and parse orders from this local JSON file.
   * 2. Else if `environment.ebayApiConfig.endpoint` is set, it currently logs a warning (as actual API call isn't implemented)
   *    and returns hardcoded mock data. (This part would be replaced with a real HTTP call in a production scenario).
   * 3. Otherwise (neither mock URL nor endpoint configured), it logs an error and returns hardcoded mock data as a final fallback.
   *
   * All fetched orders are transformed into the application's `Order` model.
   * @returns An Observable stream of `Order[]`, representing the fetched and transformed orders.
   *          Returns an empty array `of([])` if an error occurs during fetching or if no orders are found.
   */
  fetchNewEbayOrders(): Observable<Order[]> {
    if (this.mockDataUrl) {
      return this.http.get<RawEbayOrder[]>(this.mockDataUrl).pipe(
        map(rawOrders => rawOrders.map(rawOrder => this.transformRawOrderToAppOrder(rawOrder))),
        catchError(error => {
          console.error('Error fetching mock eBay orders:', error);
          return of([]); // Return empty array on error
        })
      );
    } else if (this.ebayApiEndpoint) {
      // Placeholder for actual API call
      console.warn('EbayService: Actual API endpoint call is not implemented yet. Returning mock data.');
      return of(this.getHardcodedMockOrders().map(rawOrder => this.transformRawOrderToAppOrder(rawOrder)));
      // Example: return this.http.get<RawEbayOrder[]>(`${this.ebayApiEndpoint}/new-orders`)
      //   .pipe(
      //     map(rawOrders => rawOrders.map(rawOrder => this.transformRawOrderToAppOrder(rawOrder))),
      //     catchError(error => {
      //       console.error('Error fetching eBay orders from API:', error);
      //       return of([]);
      //     })
      //   );
    } else {
      console.error('EbayService: No API endpoint or mock data URL configured. Returning empty array.');
      return of([]);
    }
  }

  /**
   * Transforms a raw order object from the eBay API format to the application's Order model.
   * @param rawOrder The raw order data from eBay.
   * @returns An Order object.
   */
  private transformRawOrderToAppOrder(rawOrder: RawEbayOrder): Order {
    const orderItems: OrderItem[] = rawOrder.items.map(item => ({
      product_no: item.sku, // Maps eBay SKU to our product_no
      product_name: item.productTitle,
      quantity: item.quantitySold,
      item_cost: item.lineItemTotal, // This is the total for the line item (quantity * unitPrice)
      // unit_price: item.unitPrice, // If you need to store unit price separately on OrderItem
    }));

    return {
      id: rawOrder.ebayOrderId, // Use eBay's order ID as the external ID
      user_id: 'ebay_integration', // Or some other identifier for eBay orders
      customer_name: rawOrder.buyerUsername,
      // Telephone might not be directly available or might need parsing
      telephone: 0, // Placeholder - adjust if available from eBay API
      delivery_address: rawOrder.buyerShippingAddress,
      payment_type: rawOrder.paymentMethod,
      items: orderItems,
      delivery_cost: rawOrder.shippingCost,
      discount: rawOrder.orderDiscount,
      total_cost: rawOrder.orderTotal,
      created_date: new Date(rawOrder.orderDate).toISOString(), // Convert to ISO string or Timestamp
      // Other fields like totalEarnings will be calculated by ItemService
    };
  }

  /**
   * Provides hardcoded mock orders if no mock file is available.
   */
  private getHardcodedMockOrders(): RawEbayOrder[] {
    return [
      {
        ebayOrderId: 'EBAY-ORDER-001',
        buyerUsername: 'ebay_user_alpha',
        buyerShippingAddress: '123 Mockingbird Lane, Testville, TS 12345',
        paymentMethod: 'PayPal',
        shippingCost: 5.99,
        orderDiscount: 2.00,
        orderTotal: 53.98,
        items: [
          { sku: 'SKU001', productTitle: 'Fancy Gadget Model X', quantitySold: 1, unitPrice: 49.99, lineItemTotal: 49.99 },
        ],
        orderDate: new Date().toISOString()
      },
      {
        ebayOrderId: 'EBAY-ORDER-002',
        buyerUsername: 'ebay_user_beta',
        buyerShippingAddress: '456 Old Street, Anytown, AT 67890',
        paymentMethod: 'CreditCard',
        shippingCost: 0.00,
        orderDiscount: 0.00,
        orderTotal: 19.98,
        items: [
          { sku: 'SKU004', productTitle: 'Basic Widget Pack of 2', quantitySold: 2, unitPrice: 9.99, lineItemTotal: 19.98 },
        ],
        orderDate: new Date(Date.now() - 86400000).toISOString() // Yesterday
      }
    ];
  }
}
