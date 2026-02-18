import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../../../model/product.model';
import { ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-low-stock-products',
  standalone: false,
  templateUrl: './low-stock-products.component.html',
  styleUrls: ['./low-stock-products.component.scss']
})
export class LowStockProductsComponent implements OnInit {
  lowStockProducts$: Observable<Product[]>;
  threshold = 10; // Default threshold

  constructor(private productService: ProductService) { }

  ngOnInit(): void {
    this.lowStockProducts$ = this.productService.getLowStockProducts(this.threshold);
  }
}
