import { Component, OnInit } from '@angular/core';
import { ProductService } from '../services/product.service'; // Changed ItemService to ProductService
import { Product } from '../model/product.model';
import { MatDialog } from '@angular/material/dialog';
import { BarcodeScannerComponent } from '../../shared/components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-items',
  templateUrl: './items.component.html',
  styleUrls: ['./items.component.scss']
})
export class ItemsComponent implements OnInit {
  tableData: Product[] = [];
  filteredTableData: Product[] = [];
  displayedColumns: string[] = [
    'product_no',
    'product_name',
    'quantity',
    'color',
    'price',
    'barcode', // Added barcode column
    'add',
    'edit',
    'delete'
  ];

  constructor(private productService: ProductService, public dialog: MatDialog) { } // Changed itemService to productService

  ngOnInit() {
    // Changed itemService.getProductList to productService.getAllProducts
    this.productService.getAllProducts().subscribe(products => {
      // Adjusted mapping assuming getAllProducts returns Product[] directly
      this.tableData = products.map(product => product);
      this.filteredTableData = [...this.tableData]; // Initialize filtered data
    });
  }

  openBarcodeScanner(): void {
    const dialogRef = this.dialog.open(BarcodeScannerComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.filterProductsByBarcode(result);
      }
    });
  }

  filterProductsByBarcode(barcode: string): void {
    if (!barcode) {
      this.filteredTableData = [...this.tableData];
      return;
    }
    this.filteredTableData = this.tableData.filter(product => product.barcode === barcode);
  }
  
  clearFilter(): void {
    this.filteredTableData = [...this.tableData];
  }

  create(product: Product){ // This method seems unused, consider removing or implementing with ProductService
    // this.productService.addProduct(product); // Example if create is needed
    console.warn('ItemsComponent.create method called but not fully implemented with ProductService');
  }
  
  // update(product: Product) {
    //   this.productService.updateProduct(product.id, product); // Example
    // }
    
  deleteOrder(id: string) { // Should be deleteProduct
    this.productService.deleteProduct('products', id); // Changed itemService.Delete to productService.deleteProduct
  }
    
  columnHeader = {
    'product_no': 'Product ID',
    'product_name': 'Product Name',
    'quantity': 'Quantity',
    'color': 'Color',
    'price': 'Price',
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete'
  };
}
