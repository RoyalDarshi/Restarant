export interface DataRow {
  id: number;
  name: string;
  category: string;
  revenue: number;
  customers: number;
  orders: number;
  rating: number;
  date: string;
  region: string;
  status: string;
}

export interface Column {
  key: keyof DataRow;
  label: string;
  type: 'string' | 'number' | 'date';
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  xAxis?: Column;
  yAxis?: Column[];
  groupBy?: Column;
  title: string;
  data: any[];
}

export interface DragItem {
  type: string;
  column: Column;
}

export interface MultiColumnChart {
  xAxis: Column | null;
  yAxes: Column[];
  groupBy: Column | null;
  chartType: 'bar' | 'line' | 'pie' | 'area';
}