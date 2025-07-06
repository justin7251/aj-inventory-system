import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Order, OrderItem } from '../model/order.model'; // App's internal Order model
import { environment } from '../../../environments/environment';

// --- Shopify Raw Data Interfaces (defined in previous step) ---
interface RawShopifyLineItem {
  id: number;
  variant_id: number | null;
  product_id: number | null;
  title: string; // Product title
  variant_title: string | null;
  sku: string | null;
  vendor: string | null;
  quantity: number;
  price: string; // Price of a single item in the line item
  total_discount: string;
  // Potentially more fields like grams, tax_lines etc.
}

interface RawShopifyAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string | null;
  city?: string;
  province?: string; // State/Province
  country?: string;
  zip?: string;
  phone?: string | null;
  name?: string; // Usually first_name + last_name
}

interface RawShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  // more customer fields
}

interface RawShopifyOrder {
  id: number; // Shopify Order ID
  order_number: number; // Human-readable order number
  name: string; // e.g., #1001 (often used as display ID like order_number with prefix)
  email: string | null; // Customer email
  created_at: string; // ISO 8601 date string
  updated_at: string; // ISO 8601 date string
  financial_status: string; // e.g., 'paid', 'pending', 'refunded'
  fulfillment_status: string | null; // e.g., 'fulfilled', 'unfulfilled', 'partial'

  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  shipping_lines?: Array<{ // Shopify's shipping cost representation
    price: string;
    // other shipping line fields
  }>;

  shipping_address: RawShopifyAddress | null;
  billing_address?: RawShopifyAddress | null; // Optional
  customer: RawShopifyCustomer | null;

  line_items: RawShopifyLineItem[];
  // gateway or payment_gateway_names might indicate payment type
  gateway?: string;
  payment_gateway_names?: string[];
}
// --- End Shopify Raw Data Interfaces ---

@Injectable({
  providedIn: 'root'
})
export class ShopifyService {
  private shopifyApiEndpoint = environment.shopifyApiConfig?.endpoint;
  private mockDataUrl = environment.shopifyApiConfig?.mockDataUrl;

  constructor(private http: HttpClient) {
    if (!this.shopifyApiEndpoint && !this.mockDataUrl) {
      console.warn('ShopifyService: API endpoint or mockDataUrl is not configured in environment files.');
    }
  }

  /**
   * Fetches new orders from the (mock) Shopify API.
   * Behavior:
   * 1. If `environment.shopifyApiConfig.mockDataUrl` is set, it fetches from this local JSON.
   * 2. Else if `environment.shopifyApiConfig.endpoint` is set, it logs a warning (actual API call not implemented yet)
   *    and returns hardcoded mock data.
   * 3. Otherwise, logs an error and returns hardcoded mock data as a fallback.
   * All orders are transformed into the application's `Order` model.
   * @returns An Observable stream of `Order[]`. Returns `of([])` on error.
   */
  fetchNewShopifyOrders(): Observable<Order[]> {
    if (this.mockDataUrl) {
      return this.http.get<RawShopifyOrder[]>(this.mockDataUrl).pipe(
        map(rawOrders => rawOrders.map(rawOrder => this.transformRawShopifyOrderToAppOrder(rawOrder))),
        catchError(error => {
          console.error('Error fetching mock Shopify orders:', error);
          return of([]); // Return empty array on error
        })
      );
    } else if (this.shopifyApiEndpoint) {
      console.warn('ShopifyService: Actual API endpoint call is not implemented yet. Returning mock data.');
      return of(this.getHardcodedMockShopifyOrders().map(rawOrder => this.transformRawShopifyOrderToAppOrder(rawOrder)));
      // Example for future:
      // return this.http.get<RawShopifyOrder[]>(`${this.shopifyApiEndpoint}/orders.json?status=any&financial_status=paid&fulfillment_status=unshipped`)
      //   .pipe(
      //     map((response: any) => response.orders.map((rawOrder: RawShopifyOrder) => this.transformRawShopifyOrderToAppOrder(rawOrder))),
      //     catchError(error => {
      //       console.error('Error fetching Shopify orders from API:', error);
      //       return of([]);
      //     })
      //   );
    } else {
      console.error('ShopifyService: No API endpoint or mock data URL configured. Returning empty array.');
      return of([]); // Or return hardcoded mock if preferred as absolute fallback:
      // return of(this.getHardcodedMockShopifyOrders().map(rawOrder => this.transformRawShopifyOrderToAppOrder(rawOrder)));
    }
  }

  /**
   * Transforms a raw order object from the Shopify API format to the application's Order model.
   * @param rawOrder - The raw order data from Shopify.
   * @returns An `Order` object.
   */
  private transformRawShopifyOrderToAppOrder(rawOrder: RawShopifyOrder): Order {
    const orderItems: OrderItem[] = rawOrder.line_items.map(item => ({
      product_no: item.sku || `shopify_pid_${item.product_id}_vid_${item.variant_id || item.id}`, // Fallback if SKU is missing
      product_name: item.title + (item.variant_title ? ` - ${item.variant_title}` : ''),
      quantity: item.quantity,
      // Shopify's item.price is per unit. Our OrderItem.item_cost is line item total.
      item_cost: parseFloat(item.price) * item.quantity, // Calculate line item total
      // unit_price: parseFloat(item.price), // If we need to store unit price explicitly
    }));

    let deliveryCost = 0;
    if (rawOrder.shipping_lines && rawOrder.shipping_lines.length > 0) {
      deliveryCost = parseFloat(rawOrder.shipping_lines[0].price);
    }

    let customerFullName = 'N/A';
    if (rawOrder.customer) {
        customerFullName = `${rawOrder.customer.first_name || ''} ${rawOrder.customer.last_name || ''}`.trim();
        if (!customerFullName && rawOrder.shipping_address?.name) {
            customerFullName = rawOrder.shipping_address.name;
        }
    } else if (rawOrder.shipping_address?.name) {
        customerFullName = rawOrder.shipping_address.name;
    }


    let shippingAddressString = 'N/A';
    if (rawOrder.shipping_address) {
      const sa = rawOrder.shipping_address;
      shippingAddressString = [sa.address1, sa.address2, sa.city, sa.province, sa.zip, sa.country]
        .filter(Boolean).join(', ');
    }

    return {
      id: `shopify-${rawOrder.id}`, // Prefix to ensure uniqueness across sources, use Shopify's order ID.
      // externalOrderId: String(rawOrder.id), // Store original Shopify ID - Removed as not in Order model
      user_id: 'shopify_integration', // Identifier for Shopify orders
      customer_name: customerFullName,
      telephone: Number(rawOrder.shipping_address?.phone?.replace(/\D/g, '')) || 0, // Basic phone number parsing
      delivery_address: shippingAddressString,
      payment_type: rawOrder.gateway || (rawOrder.payment_gateway_names && rawOrder.payment_gateway_names.join(', ')) || 'Shopify Payment',
      items: orderItems,
      delivery_cost: deliveryCost,
      discount: parseFloat(rawOrder.total_discounts) || 0,
      total_cost: parseFloat(rawOrder.total_price) || 0,
      created_date: new Date(rawOrder.created_at).toISOString(),
      // totalEarnings will be calculated by ItemService
      // status, etc., can be mapped if needed, or derived later.
    };
  }

  /**
   * Provides hardcoded mock Shopify orders if no mock file or real API is available.
   */
  private getHardcodedMockShopifyOrders(): RawShopifyOrder[] {
    return [
      {
        id: 1001,
        order_number: 1001,
        name: '#1001',
        email: 'jon.doe@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        financial_status: 'paid',
        fulfillment_status: null,
        total_price: "120.00",
        subtotal_price: "110.00",
        total_tax: "5.00",
        total_discounts: "0.00",
        shipping_lines: [{ price: "5.00" }],
        gateway: "shopify_payments",
        customer: {
          id: 2001,
          email: 'jon.doe@example.com',
          first_name: 'Jon',
          last_name: 'Doe',
        },
        shipping_address: {
          first_name: 'Jon',
          last_name: 'Doe',
          address1: '123 Shopify St',
          city: 'Shopville',
          province: 'CA',
          country: 'USA',
          zip: '90210',
          phone: '555-123-4567',
          name: 'Jon Doe'
        },
        line_items: [
          { id: 3001, variant_id: null, product_id: 4001, title: 'Awesome T-Shirt', variant_title: 'Large', sku: 'SKU-TSHIRT-L', vendor: 'MyBrand', quantity: 1, price: "60.00", total_discount: "0.00" },
          { id: 3002, variant_id: null, product_id: 4002, title: 'Cool Mug', variant_title: null, sku: 'SKU-MUG-STD', vendor: 'MyBrand', quantity: 1, price: "50.00", total_discount: "0.00" },
        ]
      }
      // Add more mock orders if needed
    ];
  }
}
