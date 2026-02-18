import {Component, OnInit, ViewChild, Input} from '@angular/core';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import { MatSort} from '@angular/material/sort';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-widget-table',
  standalone: false,
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {
  @Input() tableData: any[] = [];
  @Input() columnHeader: Record<string, string> = {};
  dataSource = new MatTableDataSource<any>();
  // loading$: Observable<any[]>;

  @ViewChild(MatPaginator,{static:false}) paginator: MatPaginator;
  @ViewChild(MatSort, {}) sort: MatSort;

  ngOnInit() {
    setTimeout(() => {
      this.dataSource.data = this.tableData || [];
    }, 1000);
  }

  get columnKeys(): string[] {
    return Object.keys(this.columnHeader || {});
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // delete(id: string) {
  //   console.log('delete');
  // }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

}
