import {Component, OnInit, ViewChild, Input} from '@angular/core';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatSortModule} from '@angular/material/sort'



@Component({
  selector: 'app-widget-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
  @Input() tableData;
  @Input() columnHeader;
  objectKeys = Object.keys;
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatSortModule,{static:true}) sort: MatSortModule;
  @ViewChild(MatPaginatorModule, { static: true }) paginator: MatPaginatorModule;

  // @ViewChild(MatSort,{static:true}) sort: MatSort;
  // @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

      
  ngOnInit() {
  }

  ngAfterViewInit() {
    // this.dataSource.paginator = this.paginator;
    // this.dataSource.sort = this.sort;
    setTimeout(() => {
      this.dataSource.data = this.tableData;
    }, 500);
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

}
