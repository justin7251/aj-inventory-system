import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Product } from '../../../model/product.model';
import { ItemService } from '../../../services/item.service';

@Component({
  selector: 'app-low-stock-products',
  templateUrl: './low-stock-products.component.html',
  styleUrls: ['./low-stock-products.component.scss']
})
export class LowStockProductsComponent implements OnInit {
  lowStockProducts$: Observable<Product[]>;
  threshold = 10; // Default threshold

  constructor(private itemService: ItemService) { }

  ngOnInit(): void {
    this.lowStockProducts$ = this.itemService.getLowStockProducts(this.threshold);
  }
}
