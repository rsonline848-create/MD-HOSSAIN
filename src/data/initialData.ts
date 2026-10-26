import { Customer, Supplier, ProductCatalogItem, UserAccount } from '../types';

export const DEFAULT_DEMO_PRODUCT_IDS = [
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 
  'p7', 'p8', 'p9', 'p10', 'p11', 'p12'
];

export const INITIAL_PRODUCTS: ProductCatalogItem[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u1',
    name: 'অ্যাডমিন (Admin)',
    username: 'admin',
    role: 'admin',
    pinOrPassword: '102267',
    phone: '01700000000',
    isActive: true,
    createdAt: '2026-01-01'
  }
];
