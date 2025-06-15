import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, combineLatest, Subscription } from 'rxjs';
import { switchMap, map, catchError, startWith, tap, finalize } from 'rxjs/operators';
import { ItemService } from '../../../services/item.service';
import { Product } from '../../../model/product.model';
import * as Highcharts from 'highcharts';

@Component({
  selector: 'app-stock-prediction-graph',
  templateUrl: './stock-prediction-graph.component.html',
  styleUrls: ['./stock-prediction-graph.component.scss']
})
export class StockPredictionGraphComponent implements OnInit, OnDestroy {
  products$: Observable<Product[]>;
  selectedProductNoSubject = new BehaviorSubject<string | null>(null);
  selectedProductNo$ = this.selectedProductNoSubject.asObservable();

  predictionData$: Observable<Highcharts.Options | null>;

  isLoading = false;
  error: string | null = null;

  private productsCache: Product[] = [];
  private subscriptions = new Subscription();

  constructor(private itemService: ItemService) {}

  ngOnInit(): void {
    this.products$ = this.itemService.getProductList().pipe(
      tap(products => {
        this.productsCache = products; // Cache for easy lookup
        if (products && products.length > 0) {
          // Optionally, auto-select the first product
          // this.selectedProductNoSubject.next(products[0].product_no);
        }
      }),
      catchError(err => {
        this.error = 'Failed to load products.';
        console.error(err);
        return of([]);
      })
    );

    this.predictionData$ = this.selectedProductNo$.pipe(
      switchMap(productNo => {
        if (!productNo) {
          return of(this.getInitialChartOptions()); // Return initial empty chart
        }

        const selectedProduct = this.productsCache.find(p => p.product_no === productNo);
        if (!selectedProduct) {
          this.error = 'Selected product not found in cache.';
          return of(this.getInitialChartOptions('Product data not available'));
        }
        // Type assertion for quantity if it can be string from model
        const currentStock = typeof selectedProduct.quantity === 'string' ? parseFloat(selectedProduct.quantity) : selectedProduct.quantity;

        if (isNaN(currentStock)) {
            console.error('Current stock is NaN for product:', selectedProduct.product_name);
            this.error = `Invalid current stock for ${selectedProduct.product_name}.`;
            return of(this.getInitialChartOptions(this.error));
        }


        this.isLoading = true;
        this.error = null;

        return this.itemService.predictStock(productNo, currentStock).pipe(
          map(predictions => {
            if (!predictions || predictions.length === 0) {
              return this.getInitialChartOptions(`No prediction data available for ${selectedProduct.product_name || 'selected product'}.`);
            }
            const seriesData = predictions.map(p => p.predictedStock);
            const categories = predictions.map(p => {
              const date = new Date(p.date);
              return `${date.getMonth() + 1}/${date.getDate()}`; // Format as MM/DD
            });

            return {
              chart: { type: 'line' },
              title: { text: `Stock Prediction for ${selectedProduct.product_name || productNo}` },
              subtitle: { text: `Next 7 Days (Current Stock: ${currentStock})` },
              xAxis: { categories },
              yAxis: {
                title: { text: 'Predicted Stock Quantity' },
                min: 0 // Ensure Y-axis starts at 0
              },
              series: [{
                name: 'Predicted Stock',
                type: 'line',
                data: seriesData,
              }],
              plotOptions: {
                line: {
                    dataLabels: {
                        enabled: true
                    },
                    enableMouseTracking: true
                }
              },
            } as Highcharts.Options;
          }),
          catchError(err => {
            console.error('Error predicting stock:', err);
            this.error = `Failed to predict stock for ${selectedProduct.product_name || productNo}.`;
            return of(this.getInitialChartOptions(this.error)); // Return empty chart on error
          }),
          finalize(() => {
            this.isLoading = false;
          })
        );
      }),
      startWith(this.getInitialChartOptions()) // Initial empty chart before selection
    );
  }

  onProductSelected(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const productNo = selectElement.value;
    this.selectedProductNoSubject.next(productNo || null);
  }

  private getInitialChartOptions(message: string = 'Select a product to see its stock prediction.'): Highcharts.Options {
    return {
      chart: { type: 'line' },
      title: { text: 'Stock Prediction' },
      subtitle: { text: message },
      xAxis: { categories: [] },
      yAxis: { title: { text: 'Predicted Stock Quantity' }, min: 0 },
      series: [{ name: 'Predicted Stock', type: 'line', data: [] }],
       plotOptions: {
          line: {
              dataLabels: { enabled: false },
              enableMouseTracking: false
          }
      },
    };
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.selectedProductNoSubject.complete();
  }
}
