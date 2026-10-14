import { Customer, Supplier, ProductCatalogItem, UserAccount } from '../types';

export const INITIAL_PRODUCTS: ProductCatalogItem[] = [
  { id: 'p1', name: 'BRB 1.5 RM তার (কয়েল)', category: 'তার ও কেবলস', unit: 'কয়েল', salePrice: 3200, purchasePrice: 2850, stock: 45 },
  { id: 'p2', name: 'BRB 2.5 RM তার (কয়েল)', category: 'তার ও কেবলস', unit: 'কয়েল', salePrice: 5100, purchasePrice: 4600, stock: 32 },
  { id: 'p3', name: 'BBS 1.0 RM তার (কয়েল)', category: 'তার ও কেবলস', unit: 'কয়েল', salePrice: 2350, purchasePrice: 2100, stock: 28 },
  { id: 'p4', name: 'Super Star 18W LED বাল্ব (White)', category: 'এলইডি লাইট', unit: 'পিস', salePrice: 320, purchasePrice: 240, stock: 150 },
  { id: 'p5', name: 'Super Star 12W LED বাল্ব (Warm/Cool)', category: 'এলইডি লাইট', unit: 'পিস', salePrice: 240, purchasePrice: 180, stock: 200 },
  { id: 'p6', name: 'Click 1 Gang Switch (Piano/Modular)', category: 'সুইচ ও সকেট', unit: 'পিস', salePrice: 95, purchasePrice: 65, stock: 300 },
  { id: 'p7', name: 'Click Multi Socket with Switch', category: 'সুইচ ও সকেট', unit: 'পিস', salePrice: 280, purchasePrice: 210, stock: 85 },
  { id: 'p8', name: 'Havells 32A Double Pole MCB (সার্কিট ব্রেকার)', category: 'সার্কিট ব্রেকার', unit: 'পিস', salePrice: 650, purchasePrice: 520, stock: 40 },
  { id: 'p9', name: 'Gazi 56 ইঞ্চি সিলিং ফ্যান (White)', category: 'ফ্যান', unit: 'পিস', salePrice: 3450, purchasePrice: 3000, stock: 18 },
  { id: 'p10', name: 'BRB 3/4" ইঞ্চি PVC কনসিল পাইপ', category: 'পাইপ ও ফিটিংস', unit: 'পিস', salePrice: 120, purchasePrice: 90, stock: 220 },
  { id: 'p11', name: 'Royal 16A কম্বাইন্ড প্লাগ ও সকেট', category: 'প্লাগ ও সকেট', unit: 'সেট', salePrice: 220, purchasePrice: 160, stock: 90 },
  { id: 'p12', name: 'ইলেকট্রিক ব্ল্যাক টেপ (১ রোল)', category: 'অন্যান্য এক্সেসরিজ', unit: 'পিস', salePrice: 35, purchasePrice: 22, stock: 180 },
];

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
