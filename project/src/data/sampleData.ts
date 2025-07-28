import { DataRow } from '../types';

export const sampleData: DataRow[] = [
  {
    id: 1,
    name: 'Product Alpha',
    category: 'Electronics',
    revenue: 45000,
    customers: 320,
    orders: 450,
    rating: 4.5,
    date: '2024-01-15',
    region: 'North America',
    status: 'Active'
  },
  {
    id: 2,
    name: 'Service Beta',
    category: 'Software',
    revenue: 67000,
    customers: 150,
    orders: 180,
    rating: 4.8,
    date: '2024-01-20',
    region: 'Europe',
    status: 'Active'
  },
  {
    id: 3,
    name: 'Widget Gamma',
    category: 'Manufacturing',
    revenue: 23000,
    customers: 280,
    orders: 320,
    rating: 4.2,
    date: '2024-01-25',
    region: 'Asia',
    status: 'Inactive'
  },
  {
    id: 4,
    name: 'Tool Delta',
    category: 'Hardware',
    revenue: 89000,
    customers: 420,
    orders: 650,
    rating: 4.7,
    date: '2024-02-01',
    region: 'North America',
    status: 'Active'
  },
  {
    id: 5,
    name: 'Platform Epsilon',
    category: 'Software',
    revenue: 120000,
    customers: 890,
    orders: 1200,
    rating: 4.9,
    date: '2024-02-05',
    region: 'Global',
    status: 'Active'
  },
  {
    id: 6,
    name: 'Device Zeta',
    category: 'Electronics',
    revenue: 34000,
    customers: 210,
    orders: 280,
    rating: 4.1,
    date: '2024-02-10',
    region: 'Europe',
    status: 'Active'
  },
  {
    id: 7,
    name: 'Component Eta',
    category: 'Manufacturing',
    revenue: 56000,
    customers: 340,
    orders: 420,
    rating: 4.4,
    date: '2024-02-15',
    region: 'Asia',
    status: 'Active'
  },
  {
    id: 8,
    name: 'System Theta',
    category: 'Software',
    revenue: 78000,
    customers: 560,
    orders: 680,
    rating: 4.6,
    date: '2024-02-20',
    region: 'North America',
    status: 'Active'
  },
  {
    id: 9,
    name: 'Gadget Iota',
    category: 'Electronics',
    revenue: 41000,
    customers: 290,
    orders: 380,
    rating: 4.3,
    date: '2024-02-25',
    region: 'Europe',
    status: 'Inactive'
  },
  {
    id: 10,
    name: 'Module Kappa',
    category: 'Hardware',
    revenue: 92000,
    customers: 670,
    orders: 820,
    rating: 4.8,
    date: '2024-03-01',
    region: 'Global',
    status: 'Active'
  },
  {
    id: 11,
    name: 'Application Lambda',
    category: 'Software',
    revenue: 105000,
    customers: 780,
    orders: 950,
    rating: 4.7,
    date: '2024-03-05',
    region: 'North America',
    status: 'Active'
  },
  {
    id: 12,
    name: 'Hardware Mu',
    category: 'Hardware',
    revenue: 63000,
    customers: 440,
    orders: 520,
    rating: 4.5,
    date: '2024-03-10',
    region: 'Asia',
    status: 'Active'
  }
];

export const columns = [
  { key: 'id' as const, label: 'ID', type: 'number' as const },
  { key: 'name' as const, label: 'Name', type: 'string' as const },
  { key: 'category' as const, label: 'Category', type: 'string' as const },
  { key: 'revenue' as const, label: 'Revenue', type: 'number' as const },
  { key: 'customers' as const, label: 'Customers', type: 'number' as const },
  { key: 'orders' as const, label: 'Orders', type: 'number' as const },
  { key: 'rating' as const, label: 'Rating', type: 'number' as const },
  { key: 'date' as const, label: 'Date', type: 'date' as const },
  { key: 'region' as const, label: 'Region', type: 'string' as const },
  { key: 'status' as const, label: 'Status', type: 'string' as const }
];