import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Order, OrderItem } from '../model/order.model'; // Assuming a shared Order model
import { environment } from '../../../environments/environment';

// Placeholder for Amazon's raw order structure. This will need to be defined based on MWS API response.
interface RawAmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string; // ISO 8601 format
  LastUpdateDate: string; // ISO 8601 format
  OrderStatus: string; // e.g., Shipped, Pending, Canceled
  SalesChannel: string; // e.g., Amazon.com
  ShipmentServiceLevelCategory?: string; // e.g., Standard, Expedited
  OrderTotal?: {
    CurrencyCode: string; // e.g., USD
    Amount: string; // e.g., "19.99"
  };
  ShippingAddress?: {
    Name: string;
    AddressLine1?: string;
    AddressLine2?: string;
    City: string;
    StateOrRegion?: string;
    PostalCode?: string;
    CountryCode: string;
    Phone?: string;
  };
  BuyerEmail?: string;
  BuyerName?: string;
  // This is highly simplified. MWS ListOrderItems is a separate call.
  // For simplicity here, we might assume items are part of a mock order object.
  OrderItems?: RawAmazonOrderItem[];
}

interface RawAmazonOrderItem {
  OrderItemId: string;
  ASIN: string;
  SKU?: string;
  Title?: string;
  QuantityOrdered: number;
  ItemPrice?: { // Price of a single unit
    CurrencyCode: string;
    Amount: string;
  };
  PromotionDiscount?: {
    CurrencyCode: string;
    Amount: string;
  };
  // ... and other fields like ShippingPrice, GiftWrapPrice etc.
}


@Injectable({
  providedIn: 'root'
})
export class AmazonService {
  private amazonApiEndpoint = environment.amazonMwsApiConfig?.endpoint; // Example path
  private mockDataUrl = environment.amazonMwsApiConfig?.mockDataUrl; // Example path for mock data

  constructor(private http: HttpClient) {
    if (!this.amazonApiEndpoint && !this.mockDataUrl) {
      console.warn('AmazonService: API endpoint or mockDataUrl is not configured in environment files.');
    }
  }

  /**
   * Fetches new orders from Amazon MWS (mock implementation).
   * @returns An Observable stream of `Order[]`.
   */
  fetchNewAmazonOrders(): Observable<Order[]> {
    if (this.mockDataUrl) {
      return this.http.get<RawAmazonOrder[]>(this.mockDataUrl).pipe(
        map(rawOrders => rawOrders.map(rawOrder => this.transformRawAmazonOrderToAppOrder(rawOrder))),
        catchError(error => {
          console.error('Error fetching mock Amazon orders:', error);
          return of([]);
        })
      );
    } else if (this.amazonApiEndpoint) {
      console.warn('AmazonService: Actual Amazon MWS API endpoint call for orders is not implemented yet. Returning mock data.');
      // TODO: Implement actual API call to this.amazonApiEndpoint
      return of(this.getHardcodedMockAmazonOrders().map(rawOrder => this.transformRawAmazonOrderToAppOrder(rawOrder)));
    } else {
      console.error('AmazonService: No API endpoint or mock data URL configured for orders. Returning mock data.');
      return of(this.getHardcodedMockAmazonOrders().map(rawOrder => this.transformRawAmazonOrderToAppOrder(rawOrder)));
    }
  }

  /**
   * Placeholder for syncing product listings with Amazon.
   * @param products - The products to sync.
   * @returns An Observable indicating success or failure.
   */
  syncProductListings(products: any[]): Observable<boolean> {
    console.warn('AmazonService: syncProductListings is not implemented yet.');
    // TODO: Implement actual API call
    return of(true); // Placeholder
  }

  /**
   * Placeholder for updating inventory levels on Amazon.
   * @param inventoryUpdates - The inventory updates.
   * @returns An Observable indicating success or failure.
   */
  updateInventory(inventoryUpdates: any[]): Observable<boolean> {
    console.warn('AmazonService: updateInventory is not implemented yet.');
    // TODO: Implement actual API call
    return of(true); // Placeholder
  }

  private transformRawAmazonOrderToAppOrder(rawOrder: RawAmazonOrder): Order {
    const orderItems: OrderItem[] = (rawOrder.OrderItems || []).map(item => ({
      product_no: item.SKU || item.ASIN, // Prefer SKU, fallback to ASIN
      product_name: item.Title || 'N/A',
      quantity: item.QuantityOrdered,
      item_cost: parseFloat(item.ItemPrice?.Amount || '0') * item.QuantityOrdered, // Line item total
      // unit_price: parseFloat(item.ItemPrice?.Amount || '0'), // If needed
    }));

    let deliveryCost = 0; // MWS often has shipping per item or order promotion
    // This needs to be derived carefully from MWS data (e.g. sum of item shipping or order level shipping charges)

    let customerFullName = rawOrder.BuyerName || rawOrder.ShippingAddress?.Name || 'N/A';

    let shippingAddressString = 'N/A';
    if (rawOrder.ShippingAddress) {
      const sa = rawOrder.ShippingAddress;
      shippingAddressString = [sa.AddressLine1, sa.AddressLine2, sa.City, sa.StateOrRegion, sa.PostalCode, sa.CountryCode]
        .filter(Boolean).join(', ');
    }

    return {
      id: `amazon-${rawOrder.AmazonOrderId}`,
      user_id: 'amazon_integration',
      customer_name: customerFullName,
      telephone: Number(rawOrder.ShippingAddress?.Phone?.replace(/\D/g, '')) || 0,
      delivery_address: shippingAddressString,
      payment_type: 'Amazon Pay', // General placeholder
      items: orderItems,
      delivery_cost: deliveryCost,
      discount: (rawOrder.OrderItems || []).reduce((acc, item) => acc + parseFloat(item.PromotionDiscount?.Amount || '0'), 0),
      total_cost: parseFloat(rawOrder.OrderTotal?.Amount || '0'),
      created_date: new Date(rawOrder.PurchaseDate).toISOString(),
      // status: rawOrder.OrderStatus, // If your Order model has a status field
    };
  }

  private getHardcodedMockAmazonOrders(): RawAmazonOrder[] {
    // Basic mock structure. This needs to be more detailed based on actual MWS responses.
    // Notably, MWS ListOrderItems is a separate call per order.
    // This mock data assumes items are pre-fetched and embedded for simplicity.
    return [
      {
        AmazonOrderId: '123-1234567-1234567',
        PurchaseDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        LastUpdateDate: new Date().toISOString(),
        OrderStatus: 'Shipped',
        SalesChannel: 'Amazon.com',
        OrderTotal: { CurrencyCode: 'USD', Amount: '49.98' },
        ShippingAddress: {
          Name: 'Jane Doe',
          AddressLine1: '456 Amazon Ave',
          City: 'Seattle',
          StateOrRegion: 'WA',
          PostalCode: '98109',
          CountryCode: 'US',
          Phone: '206-555-0100'
        },
        BuyerEmail: 'jane.doe@example.com',
        BuyerName: 'Jane Doe',
        OrderItems: [
          {
            OrderItemId: 'oi-1',
            ASIN: 'B0EXAMPLEASIN1',
            SKU: 'SKU-AMZN-BOOK-01',
            Title: 'The Everything Book',
            QuantityOrdered: 1,
            ItemPrice: { CurrencyCode: 'USD', Amount: '29.99' },
            PromotionDiscount: { CurrencyCode: 'USD', Amount: '0.00' }
          },
          {
            OrderItemId: 'oi-2',
            ASIN: 'B0EXAMPLEASIN2',
            SKU: 'SKU-AMZN-GADGET-02',
            Title: 'Useful Gadget',
            QuantityOrdered: 1,
            ItemPrice: { CurrencyCode: 'USD', Amount: '19.99' },
          }
        ]
      },
      // Add another mock order if desired
    ];
  }
}
