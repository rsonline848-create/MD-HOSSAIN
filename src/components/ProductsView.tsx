import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCatalogItem } from '../types';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Printer, 
  TrendingUp, 
  Boxes, 
  DollarSign, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Sparkles, 
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  toBengaliNumber, 
  toEnglishNumber, 
  formatCurrency, 
  formatDate,
  normalizeDate,
  isSameDate,
  compareProductNames,
  extractSupplierBillItems 
} from '../utils/formatters';

export const ProductsView: React.FC = () => {
  const { 
    products, 
    invoices,
    supplierBills,
    cashTallies,
    selectedDate,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    canEditOrDelete, 
    isManager,
    currentUser, 
    language, 
    t,
    confirmAction
  } = useApp();

  const isUserManager = Boolean(isManager || currentUser?.role === 'manager');

  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Sorting states: default natural sort by product name ascending (1.1 on top, 10.10 at bottom)
  const [sortField, setSortField] = useState<'name' | 'stock' | 'salePrice' | 'purchasePrice' | 'totalValue'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductCatalogItem | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<ProductCatalogItem | null>(null);

  // Form states
  const [productName, setProductName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [currentStock, setCurrentStock] = useState<string>('');
  const [unit, setUnit] = useState<string>('KG');
  const [formError, setFormError] = useState('');

  // Quick stock adjust form state
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');

  // Input refs for Enter key navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const purchaseRef = useRef<HTMLInputElement>(null);
  const saleRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProductName('');
    setPurchasePrice('');
    setSalePrice('');
    setCurrentStock('0');
    setUnit('KG');
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (p: ProductCatalogItem) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো প্রোডাক্ট এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingProduct(p);
    setProductName(p.name);
    setPurchasePrice(String(p.purchasePrice || ''));
    setSalePrice(String(p.salePrice || ''));
    setCurrentStock(String(p.stock || '0'));
    setUnit(p.unit || 'KG');
    setFormError('');
    setShowAddModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (editingProduct && !canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো প্রোডাক্ট এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }

    const nameTrimmed = productName.trim();
    if (!nameTrimmed) {
      setFormError('পণ্যের নাম দেওয়া বাধ্যতামূলক!');
      return;
    }

    const numPurchase = toEnglishNumber(purchasePrice.toString()) || 0;
    const numSale = toEnglishNumber(salePrice.toString()) || 0;
    const numStock = toEnglishNumber(currentStock.toString()) || 0;

    if (numPurchase < 0 || numSale < 0) {
      setFormError('ক্রয় বা বিক্রয় মূল্য ঋণাত্মক হতে পারে না!');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: nameTrimmed,
        purchasePrice: numPurchase,
        salePrice: numSale,
        stock: numStock,
        unit: unit.trim() || 'KG',
      });
    } else {
      const newProd: ProductCatalogItem = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: nameTrimmed,
        purchasePrice: numPurchase,
        salePrice: numSale,
        stock: numStock,
        unit: unit.trim() || 'KG',
        createdAt: new Date().toISOString()
      };
      addProduct(newProd);
    }

    setShowAddModal(false);
  };

  // Handle Quick Stock Adjust
  const handleApplyStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে স্টক সমন্বয় করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    if (!stockAdjustProduct) return;
    const num = toEnglishNumber(adjustAmount.toString()) || 0;
    if (num <= 0) {
      alert('সঠিক পরিমাণ লিখুন!');
      return;
    }

    const current = Number(stockAdjustProduct.stock || 0);
    const newStock = adjustType === 'add' ? current + num : current - num;

    updateProduct(stockAdjustProduct.id, {
      stock: newStock
    });

    setStockAdjustProduct(null);
    setAdjustAmount('');
  };

  // Handle column header sort toggle
  const handleToggleSort = (field: 'name' | 'stock' | 'salePrice' | 'purchasePrice' | 'totalValue') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered & Naturally Sorted products list (e.g. 1.1, 4.2round, 5.5squre, 6round, 10.10)
  const filteredProducts = useMemo(() => {
    const list = products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || p.name.toLowerCase().includes(q);
      const matchLowStock = !showLowStockOnly || (p.stock <= 5);

      return matchSearch && matchLowStock;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = compareProductNames(a.name, b.name);
      } else if (sortField === 'stock') {
        cmp = (Number(a.stock) || 0) - (Number(b.stock) || 0);
      } else if (sortField === 'salePrice') {
        cmp = (Number(a.salePrice) || 0) - (Number(b.salePrice) || 0);
      } else if (sortField === 'purchasePrice') {
        cmp = (Number(a.purchasePrice) || 0) - (Number(b.purchasePrice) || 0);
      } else if (sortField === 'totalValue') {
        const valA = (Number(a.stock) || 0) * (Number(a.purchasePrice) || 0);
        const valB = (Number(b.stock) || 0) * (Number(b.purchasePrice) || 0);
        cmp = valA - valB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [products, searchQuery, showLowStockOnly, sortField, sortOrder]);

  // Overall Statistics
  const totalStockKg = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  }, [products]);

  const totalPurchaseValue = useMemo(() => {
    return products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.purchasePrice) || 0)), 0);
  }, [products]);

  const totalSaleValue = useMemo(() => {
    return products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.salePrice) || 0)), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => (Number(p.stock) || 0) <= 5).length;
  }, [products]);

  // Working date for "আজকের" calculations
  const targetTodayDate = normalizeDate(selectedDate) || new Date().toISOString().split('T')[0];
  const todayCalendarStr = new Date().toISOString().split('T')[0];

  // Helper: Total Purchased KG on a given date string
  const getPurchasedKgForDate = (dateStr: string) => {
    const bills = supplierBills.filter(sb => isSameDate(sb.date, dateStr));
    return bills.reduce((sum, sb) => {
      const items = extractSupplierBillItems(sb);
      return sum + items.reduce((iSum, it) => iSum + (Number(it.quantity) || 0), 0);
    }, 0);
  };

  // Helper: Total Sold KG on a given date string (from invoices)
  const getSoldKgForDate = (dateStr: string) => {
    const invs = invoices.filter(inv => isSameDate(inv.date, dateStr));
    return invs.reduce((sum, inv) => {
      if (!Array.isArray(inv.items)) return sum;
      return sum + inv.items.reduce((iSum, it) => {
        if (it.name?.includes('[ফেরত মাল]')) return iSum;
        return iSum + (Number(it.quantity) || 0);
      }, 0);
    }, 0);
  };

  // Helper: Exchange returned KG on a given date string (adds back to stock)
  const getReturnedKgForDate = (dateStr: string) => {
    const invs = invoices.filter(inv => isSameDate(inv.date, dateStr));
    return invs.reduce((sum, inv) => {
      if (!Array.isArray(inv.items)) return sum;
      return sum + inv.items.reduce((iSum, it) => {
        if (it.name?.includes('[ফেরত মাল]')) {
          return iSum + (Number(it.quantity) || 0);
        }
        return iSum;
      }, 0);
    }, 0);
  };

  // Today's Total Purchase KG & Total Sale KG (আজকের মোট কেনা ও বিক্রয় কেজি)
  const todaysPurchasedKg = useMemo(() => {
    return getPurchasedKgForDate(targetTodayDate);
  }, [supplierBills, targetTodayDate]);

  const todaysSoldKg = useMemo(() => {
    return getSoldKgForDate(targetTodayDate);
  }, [invoices, targetTodayDate]);

  // Date Range Filter States for Daily Last Stock - No default date (empty by default as requested)
  const [stockStartDate, setStockStartDate] = useState<string>('');
  const [stockEndDate, setStockEndDate] = useState<string>('');
  const [expandedTallyDate, setExpandedTallyDate] = useState<string | null>(null);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState<string>('');
  const [drawerFilter, setDrawerFilter] = useState<'all' | 'transactions' | 'in_stock'>('all');

  // Comprehensive Daily Closing Stock Calculation with Item-wise Breakdown ("কোনটা কত কেজি ছিল"):
  // "last stock er calculation hobe proti din ক্যাশ মিলানো sesh hole j stock thakbe seta last stock"
  const dailyStockRecords = useMemo(() => {
    // 0. Gather all historical dates that contain activity (cash tally, bills, invoices) + today
    const allActivityDates = new Set<string>();
    allActivityDates.add(todayCalendarStr);
    cashTallies.forEach(t => {
      const norm = normalizeDate(t.date);
      if (norm) allActivityDates.add(norm);
    });
    invoices.forEach(inv => {
      const norm = normalizeDate(inv.date);
      if (norm) allActivityDates.add(norm);
    });
    supplierBills.forEach(sb => {
      const norm = normalizeDate(sb.date);
      if (norm) allActivityDates.add(norm);
    });

    const sortedActivityDates = Array.from(allActivityDates).sort();
    const earliestActivityDate = sortedActivityDates[0] || todayCalendarStr;
    const latestActivityDate = sortedActivityDates[sortedActivityDates.length - 1] || todayCalendarStr;

    const startNorm = stockStartDate ? (normalizeDate(stockStartDate) || stockStartDate) : '';
    const endNorm = stockEndDate ? (normalizeDate(stockEndDate) || stockEndDate) : '';
    const hasUserFilter = Boolean(startNorm || endNorm);

    // If user has not provided start date or end date (no search/filter applied), keep report completely OFF
    if (!hasUserFilter) {
      return [];
    }

    let filterStart = startNorm || earliestActivityDate;
    let filterEnd = endNorm || (latestActivityDate > todayCalendarStr ? latestActivityDate : todayCalendarStr);
    if (filterStart > filterEnd) {
      const temp = filterStart;
      filterStart = filterEnd;
      filterEnd = temp;
    }

    // Sorted catalog products (alphanumeric order: 1.1, 4.2 Round, 4.2 Square, etc.)
    const sortedCatalog = [...products].sort((a, b) => compareProductNames(a.name, b.name));

    // Matcher helper: links an invoice or supplier bill item to a catalog product
    const matchProductItem = (item: { productId?: string; name?: string; code?: string }, p: ProductCatalogItem) => {
      if (item.productId && item.productId === p.id) return true;
      const cleanItem = (item.name || '').replace(/\[ফেরত মাল\]/g, '').trim().toLowerCase();
      const cleanProd = (p.name || '').trim().toLowerCase();
      if (cleanItem && cleanProd && cleanItem === cleanProd) return true;
      if (cleanItem && cleanProd && cleanItem.replace(/\s+/g, '') === cleanProd.replace(/\s+/g, '')) return true;
      if (item.code && p.code && item.code.trim().toLowerCase() === p.code.trim().toLowerCase()) return true;
      return false;
    };

    // 1. Generate full date array from earliest date to max(filterEnd, todayCalendarStr) so backward chaining traces from current stock
    const chainStartStr = filterStart < earliestActivityDate ? filterStart : earliestActivityDate;
    const maxDateStr = todayCalendarStr > filterEnd ? todayCalendarStr : filterEnd;
    const chainStart = new Date(chainStartStr);
    const chainEnd = new Date(maxDateStr);
    const allDaysChain: string[] = [];

    const cur = new Date(chainStart);
    while (cur <= chainEnd) {
      allDaysChain.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    // 2. Map metrics for each day (both store aggregate and product-by-product)
    const dayMetrics: Record<string, {
      purchase: number;
      sale: number;
      ret: number;
      net: number;
      tally?: any;
      dayPurchasesByProd: Record<string, number>;
      daySalesByProd: Record<string, number>;
      dayReturnsByProd: Record<string, number>;
      dayNetByProd: Record<string, number>;
    }> = {};

    allDaysChain.forEach(d => {
      const bills = supplierBills.filter(sb => isSameDate(sb.date, d));
      const invs = invoices.filter(inv => isSameDate(inv.date, d));

      const dayPurchasesByProd: Record<string, number> = {};
      const daySalesByProd: Record<string, number> = {};
      const dayReturnsByProd: Record<string, number> = {};
      const dayNetByProd: Record<string, number> = {};

      let totalP = 0;
      let totalS = 0;
      let totalR = 0;

      // Extract purchases from supplier bills
      bills.forEach(sb => {
        const items = extractSupplierBillItems(sb);
        items.forEach(it => {
          const qty = Number(it.quantity) || 0;
          totalP += qty;
          const matched = sortedCatalog.find(p => matchProductItem(it, p));
          if (matched) {
            dayPurchasesByProd[matched.id] = (dayPurchasesByProd[matched.id] || 0) + qty;
          }
        });
      });

      // Extract sales and returns from customer invoices
      invs.forEach(inv => {
        if (!Array.isArray(inv.items)) return;
        inv.items.forEach(it => {
          const qty = Number(it.quantity) || 0;
          const isReturn = it.name?.includes('[ফেরত মাল]');
          if (isReturn) {
            totalR += qty;
            const matched = sortedCatalog.find(p => matchProductItem(it, p));
            if (matched) {
              dayReturnsByProd[matched.id] = (dayReturnsByProd[matched.id] || 0) + qty;
            }
          } else {
            totalS += qty;
            const matched = sortedCatalog.find(p => matchProductItem(it, p));
            if (matched) {
              daySalesByProd[matched.id] = (daySalesByProd[matched.id] || 0) + qty;
            }
          }
        });
      });

      sortedCatalog.forEach(p => {
        const pP = dayPurchasesByProd[p.id] || 0;
        const pR = dayReturnsByProd[p.id] || 0;
        const pS = daySalesByProd[p.id] || 0;
        dayNetByProd[p.id] = pP + pR - pS;
      });

      const tally = cashTallies.find(t => isSameDate(t.date, d));
      dayMetrics[d] = {
        purchase: totalP,
        sale: totalS,
        ret: totalR,
        net: totalP + totalR - totalS,
        tally,
        dayPurchasesByProd,
        daySalesByProd,
        dayReturnsByProd,
        dayNetByProd
      };
    });

    // 3. Compute closing last stock for each day working backwards from current stock or nearest tally
    const stockMap: Record<string, { lastStock: number; isConfirmedTally: boolean }> = {};
    const dayProductStockMap: Record<string, Record<string, number>> = {};
    const reversed = [...allDaysChain].reverse();

    // Start anchor at today
    const todayTally = dayMetrics[todayCalendarStr]?.tally;
    let runningTotalStock = (todayTally && typeof todayTally.lastStockKg === 'number') 
      ? todayTally.lastStockKg 
      : totalStockKg;

    const runningProductStock: Record<string, number> = {};
    sortedCatalog.forEach(p => {
      let initPStock = Number(p.stock) || 0;
      if (todayTally?.stockSnapshot) {
        if (typeof todayTally.stockSnapshot[p.id] === 'number') {
          initPStock = todayTally.stockSnapshot[p.id];
        } else if (typeof todayTally.stockSnapshot[p.name] === 'number') {
          initPStock = todayTally.stockSnapshot[p.name];
        }
      }
      runningProductStock[p.id] = initPStock;
    });

    reversed.forEach(d => {
      const metric = dayMetrics[d];
      dayProductStockMap[d] = {};

      if (metric?.tally && typeof metric.tally.lastStockKg === 'number') {
        // Cash tally was saved! That explicitly locks the day's last stock
        runningTotalStock = metric.tally.lastStockKg;
        stockMap[d] = { lastStock: runningTotalStock, isConfirmedTally: true };
      } else {
        // Tally not explicitly stamped, use computed stock at end of day d
        stockMap[d] = { lastStock: runningTotalStock, isConfirmedTally: false };
      }

      sortedCatalog.forEach(p => {
        if (metric?.tally?.stockSnapshot) {
          if (typeof metric.tally.stockSnapshot[p.id] === 'number') {
            runningProductStock[p.id] = metric.tally.stockSnapshot[p.id];
          } else if (typeof metric.tally.stockSnapshot[p.name] === 'number') {
            runningProductStock[p.id] = metric.tally.stockSnapshot[p.name];
          }
        }
        dayProductStockMap[d][p.id] = Math.max(0, Math.round(runningProductStock[p.id] * 100) / 100);

        // Step backwards to the beginning of day d
        const netChangeP = metric ? (metric.dayNetByProd[p.id] || 0) : 0;
        runningProductStock[p.id] = runningProductStock[p.id] - netChangeP;
      });

      // Step backwards to beginning of day d
      const netChangeThisDay = metric ? metric.net : 0;
      runningTotalStock = runningTotalStock - netChangeThisDay;
    });

    // 4. Filter only the dates in the user's selected range [filterStart, filterEnd]
    const userRangeDates: string[] = [];
    const uCur = new Date(filterStart);
    const uEnd = new Date(filterEnd);
    while (uCur <= uEnd) {
      userRangeDates.push(uCur.toISOString().split('T')[0]);
      uCur.setDate(uCur.getDate() + 1);
    }

    const records = userRangeDates.map(d => {
      const m = dayMetrics[d] || { 
        purchase: 0, 
        sale: 0, 
        ret: 0, 
        net: 0, 
        dayPurchasesByProd: {}, 
        daySalesByProd: {}, 
        dayReturnsByProd: {}, 
        dayNetByProd: {} 
      };
      const sInfo = stockMap[d] || { lastStock: totalStockKg, isConfirmedTally: false };

      const productBreakdown = sortedCatalog.map(p => {
        const purchaseKg = m.dayPurchasesByProd[p.id] || 0;
        const saleKg = m.daySalesByProd[p.id] || 0;
        const returnKg = m.dayReturnsByProd[p.id] || 0;
        const netChangeKg = m.dayNetByProd[p.id] || 0;
        const lastStockKg = dayProductStockMap[d]?.[p.id] ?? (Number(p.stock) || 0);

        const purchasePrice = Number(p.purchasePrice) || 0;
        const salePrice = Number(p.salePrice) || 0;
        const rate = purchasePrice > 0 ? purchasePrice : salePrice;
        const lastStockValue = Math.round(lastStockKg * rate * 100) / 100;

        return {
          productId: p.id,
          productCode: p.code || '',
          productName: p.name,
          category: p.category || '',
          unit: p.unit || 'KG',
          purchasePrice,
          salePrice,
          rate,
          purchaseKg,
          saleKg,
          returnKg,
          netChangeKg,
          lastStockKg,
          lastStockValue,
          currentStockKg: Number(p.stock) || 0
        };
      });

      const dayTotalStockValue = productBreakdown.reduce((sum, item) => sum + (item.lastStockValue || 0), 0);

      return {
        date: d,
        isToday: isSameDate(d, todayCalendarStr),
        hasCashTally: Boolean(m.tally),
        isConfirmedTally: sInfo.isConfirmedTally,
        tallyNotes: m.tally?.notes || '',
        tallySavedBy: m.tally?.savedBy || '',
        tallySavedAt: m.tally?.savedAt || '',
        tallyActualCash: m.tally?.actualCash,
        purchaseKg: m.purchase,
        saleKg: m.sale,
        returnKg: m.ret,
        netChangeKg: m.net,
        lastStockKg: sInfo.lastStock,
        lastStockValue: dayTotalStockValue,
        productBreakdown
      };
    });

    // Sort descending (newest date first)
    return records.reverse();
  }, [stockStartDate, stockEndDate, supplierBills, invoices, cashTallies, todayCalendarStr, totalStockKg, products]);

  // Aggregate totals for the selected date range
  const rangeTotals = useMemo(() => {
    if (!stockStartDate && !stockEndDate) {
      return {
        totalPurchase: 0,
        totalSale: 0,
        totalNet: 0,
        latestStock: totalStockKg,
        openingStock: totalStockKg
      };
    }
    const totalPurchase = dailyStockRecords.reduce((sum, r) => sum + r.purchaseKg, 0);
    const totalSale = dailyStockRecords.reduce((sum, r) => sum + r.saleKg, 0);
    const totalNet = totalPurchase - totalSale;
    const latestStock = dailyStockRecords.length > 0 ? dailyStockRecords[0].lastStockKg : totalStockKg;
    const oldestRecord = dailyStockRecords.length > 0 ? dailyStockRecords[dailyStockRecords.length - 1] : null;
    const openingStock = oldestRecord ? (oldestRecord.lastStockKg - oldestRecord.netChangeKg) : totalStockKg;

    return {
      totalPurchase,
      totalSale,
      totalNet,
      latestStock,
      openingStock
    };
  }, [dailyStockRecords, totalStockKg, stockStartDate, stockEndDate]);

  // Print Single Day Product Breakdown ("কোনটা কত কেজি ছিল")
  const handlePrintSingleDayProductReport = (r: (typeof dailyStockRecords)[0]) => {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>পণ্যভিত্তিক লাস্ট স্টক রিপোর্ট (${formatDate(r.date)}) - Bismillah Traders</title>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; padding: 20px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
          .shop-name { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
          .shop-sub { font-size: 12px; color: #475569; margin: 3px 0 0 0; }
          .doc-title { font-size: 16px; font-weight: bold; color: #4338ca; margin-top: 6px; text-transform: uppercase; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-weight: 600; flex-wrap: wrap; gap: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th { background: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px 9px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .total-row { background: #e0e7ff; font-weight: bold; border-top: 2px solid #4338ca; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
          .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
          .footer { margin-top: 45px; display: flex; justify-content: space-between; padding-top: 15px; font-size: 12px; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 180px; text-align: center; padding-top: 5px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">Bismillah Traders (বিসমিল্লাহ ট্রেডার্স)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483</p>
          <div class="doc-title">দৈনিক পণ্যভিত্তিক সমাপনী লাস্ট স্টক ও ক্রয়-বিক্রয় রিপোর্ট</div>
        </div>
        <div class="meta-bar">
          <span>তারিখ: <strong>${formatDate(r.date)}</strong> ${r.isToday ? '<span style="color:#2563eb;">(আজ)</span>' : ''}</span>
          <span>ক্যাশ মিলানো: ${r.hasCashTally ? '<span class="badge badge-success">✓ সম্পন্ন</span>' : '<span class="badge badge-pending">অপেক্ষমান</span>'}</span>
          <span>মোট কেনা: <strong>+${toBengaliNumber(r.purchaseKg)} KG</strong></span>
          <span>মোট বিক্রয়: <strong>-${toBengaliNumber(r.saleKg)} KG</strong></span>
          <span>দিনের সমাপনী মোট লাস্ট স্টক: <strong style="color: #312e81; font-size: 13px;">${toBengaliNumber(r.lastStockKg)} KG</strong></span>
          <span>মোট স্টক মূল্য: <strong style="color: #166534; font-size: 13px;">${toBengaliNumber(r.lastStockValue || 0)} ৳</strong></span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 38px;">নং</th>
              <th>পণ্যের নাম</th>
              <th>ক্যাটাগরি</th>
              <th class="text-right">ক্রয় (+KG)</th>
              <th class="text-right">বিক্রয় (-KG)</th>
              <th class="text-right">নিট পরিবর্তন (KG)</th>
              <th class="text-right" style="background: #e0e7ff;">দিনের শেষ স্টক (KG)</th>
              <th class="text-right" style="background: #dcfce7; color: #14532d;">দিনের শেষ স্টক পণ্যের ভ্যালু (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${r.productBreakdown.map((p, idx) => `
              <tr style="${p.lastStockKg <= 0 ? 'background: #fff1f2;' : (p.purchaseKg > 0 || p.saleKg > 0) ? 'background: #f0fdf4;' : ''}">
                <td class="text-center">${toBengaliNumber(idx + 1)}</td>
                <td><strong>${p.productName}</strong></td>
                <td><span style="color:#475569; font-size:11px;">${p.category || '-'}</span></td>
                <td class="text-right" style="color: #15803d; font-weight: 600;">${p.purchaseKg > 0 ? `+${toBengaliNumber(p.purchaseKg)}` : '০'}</td>
                <td class="text-right" style="color: #b91c1c; font-weight: 600;">${p.saleKg > 0 ? `-${toBengaliNumber(p.saleKg)}` : '০'}</td>
                <td class="text-right" style="font-weight: 600; color: ${p.netChangeKg > 0 ? '#15803d' : p.netChangeKg < 0 ? '#b91c1c' : '#64748b'};">
                  ${p.netChangeKg > 0 ? '+' : ''}${toBengaliNumber(p.netChangeKg)}
                </td>
                <td class="text-right" style="font-weight: 900; font-size: 13px; color: #1e1b4b; background: #f5f3ff;">
                  ${toBengaliNumber(p.lastStockKg)} KG
                </td>
                <td class="text-right" style="font-weight: 900; font-size: 13px; color: #166534; background: #f0fdf4;">
                  ${toBengaliNumber(p.lastStockValue || 0)} ৳
                </td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right"><strong>সর্বমোট (${toBengaliNumber(r.productBreakdown.length)}টি পণ্য):</strong></td>
              <td class="text-right"><strong>+${toBengaliNumber(r.purchaseKg)} KG</strong></td>
              <td class="text-right"><strong>-${toBengaliNumber(r.saleKg)} KG</strong></td>
              <td class="text-right"><strong>${r.netChangeKg > 0 ? '+' : ''}${toBengaliNumber(r.netChangeKg)} KG</strong></td>
              <td class="text-right" style="font-size: 14px;"><strong>${toBengaliNumber(r.lastStockKg)} KG</strong></td>
              <td class="text-right" style="font-size: 14px; color: #166534;"><strong>${toBengaliNumber(r.lastStockValue || 0)} ৳</strong></td>
            </tr>
          </tbody>
        </table>
        <p style="font-size: 11px; color: #64748b; margin-top: 8px;">
          * নিয়মানুযায়ী প্রতিদিন ক্যাশ মিলানো সম্পন্ন হওয়ার সময়ের সংরক্ষিত হিসাবই ঐ দিনের প্রামাণিক সমাপনী লাস্ট স্টক।
        </p>
        <div class="footer">
          <div class="sig-line">স্টক ইনচার্জ</div>
          <div class="sig-line">ম্যানেজার / প্রোপ্রাইটর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 20px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print Daily Last Stock Sheet (Overall Range & Item-wise Breakdown)
  const handlePrintDailyStockReport = () => {
    if (!stockStartDate && !stockEndDate) {
      alert('রিপোর্ট প্রিন্ট করার জন্য অনুগ্রহ করে প্রথমে শুরুর তারিখ ও শেষ তারিখ নির্বাচন করুন।');
      return;
    }
    if (dailyStockRecords.length === 0) {
      alert('নির্বাচিত সময়কালে কোনো লাস্ট স্টক রেকর্ড পাওয়া যায়নি।');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const latestDayRecord = dailyStockRecords.length > 0 ? dailyStockRecords[0] : null;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>দৈনিক সমাপনী লাস্ট স্টক রিপোর্ট - Bismillah Traders</title>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .shop-name { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
          .shop-sub { font-size: 12px; color: #475569; margin: 3px 0 0 0; }
          .doc-title { font-size: 16px; font-weight: bold; color: #4338ca; margin-top: 6px; text-transform: uppercase; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-weight: 600; flex-wrap: wrap; gap: 6px; }
          .section-title { font-size: 14px; font-weight: bold; color: #1e1b4b; margin: 20px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; margin-bottom: 14px; }
          th { background: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px 9px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .total-row { background: #e0e7ff; font-weight: bold; border-top: 2px solid #4338ca; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
          .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
          .footer { margin-top: 45px; display: flex; justify-content: space-between; padding-top: 15px; font-size: 12px; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 180px; text-align: center; padding-top: 5px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">Bismillah Traders (বিসমিল্লাহ ট্রেডার্স)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483</p>
          <div class="doc-title">দৈনিক সমাপনী লাস্ট স্টক ও ক্রয়-বিক্রয় বিবরণী</div>
        </div>
        <div class="meta-bar">
          <span>সময়কাল: ${
            stockStartDate && stockEndDate 
              ? `${formatDate(stockStartDate)} থেকে ${formatDate(stockEndDate)}` 
              : stockStartDate 
                ? `${formatDate(stockStartDate)} থেকে বর্তমান` 
                : stockEndDate 
                  ? `${formatDate(stockEndDate)} পর্যন্ত` 
                  : 'সকল রেকর্ড'
          }</span>
          <span>মোট দিন: ${toBengaliNumber(dailyStockRecords.length)} দিন</span>
          <span>মোট ক্রয়: +${toBengaliNumber(rangeTotals.totalPurchase)} KG</span>
          <span>মোট বিক্রয়: -${toBengaliNumber(rangeTotals.totalSale)} KG</span>
          <span>বর্তমান মোট স্টক: ${toBengaliNumber(totalStockKg)} KG</span>
        </div>

        <div class="section-title">
          <span>১. তারিখওয়ারী দৈনিক স্টক ও ক্যাশ মিলানো বিবরণী</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">নং</th>
              <th>তারিখ</th>
              <th class="text-center">ক্যাশ মিলানো অবস্থা</th>
              <th class="text-right">ক্রয় (KG)</th>
              <th class="text-right">বিক্রয় (KG)</th>
              <th class="text-right">নেট পরিবর্তন (KG)</th>
              <th class="text-right" style="background: #e0e7ff;">দিনের শেষ স্টক (KG)</th>
            </tr>
          </thead>
          <tbody>
            ${dailyStockRecords.map((r, idx) => `
              <tr>
                <td class="text-center">${toBengaliNumber(idx + 1)}</td>
                <td><strong>${formatDate(r.date)}</strong> ${r.isToday ? '<span style="color:#2563eb; font-weight:bold;">(আজ)</span>' : ''}</td>
                <td class="text-center">
                  ${r.hasCashTally ? '<span class="badge badge-success">✓ ক্যাশ মিলানো সম্পন্ন</span>' : '<span class="badge badge-pending">অপেক্ষমান</span>'}
                </td>
                <td class="text-right" style="color: #15803d; font-weight: 600;">+${toBengaliNumber(r.purchaseKg)}</td>
                <td class="text-right" style="color: #b91c1c; font-weight: 600;">-${toBengaliNumber(r.saleKg)}</td>
                <td class="text-right" style="font-weight: 600; color: ${r.netChangeKg >= 0 ? '#15803d' : '#b91c1c'};">
                  ${r.netChangeKg >= 0 ? '+' : ''}${toBengaliNumber(r.netChangeKg)}
                </td>
                <td class="text-right" style="font-weight: 900; font-size: 13px; color: #1e1b4b; background: #f5f3ff;">
                  ${toBengaliNumber(r.lastStockKg)} KG
                </td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right"><strong>সর্বমোট:</strong></td>
              <td class="text-right"><strong>+${toBengaliNumber(rangeTotals.totalPurchase)} KG</strong></td>
              <td class="text-right"><strong>-${toBengaliNumber(rangeTotals.totalSale)} KG</strong></td>
              <td class="text-right"><strong>${rangeTotals.totalNet >= 0 ? '+' : ''}${toBengaliNumber(rangeTotals.totalNet)} KG</strong></td>
              <td class="text-right" style="font-size: 14px;"><strong>${toBengaliNumber(rangeTotals.latestStock)} KG</strong></td>
            </tr>
          </tbody>
        </table>

        ${latestDayRecord ? `
          <div class="section-title">
            <span>২. সর্বশেষ সমাপনী দিনের আইটেমভিত্তিক লাস্ট স্টক (${formatDate(latestDayRecord.date)} - কোনটা কত কেজি ছিল)</span>
            <span style="font-size: 12px; color: #4338ca;">মোট ${toBengaliNumber(latestDayRecord.productBreakdown.length)}টি পণ্য</span>
          </div>
          <table>
            <thead>
              <tr>
                <th class="text-center" style="width: 38px;">নং</th>
                <th>পণ্যের নাম</th>
                <th>ক্যাটাগরি</th>
                <th class="text-right">ক্রয় (+KG)</th>
                <th class="text-right">বিক্রয় (-KG)</th>
                <th class="text-right">নিট পরিবর্তন</th>
                <th class="text-right" style="background: #e0e7ff;">সমাপনী লাস্ট স্টক (KG)</th>
                <th class="text-right" style="background: #dcfce7; color: #14532d;">লাস্ট স্টক পণ্যের ভ্যালু (৳)</th>
              </tr>
            </thead>
            <tbody>
              ${latestDayRecord.productBreakdown.map((p, idx) => `
                <tr style="${p.lastStockKg <= 0 ? 'background: #fff1f2;' : (p.purchaseKg > 0 || p.saleKg > 0) ? 'background: #f0fdf4;' : ''}">
                  <td class="text-center">${toBengaliNumber(idx + 1)}</td>
                  <td><strong>${p.productName}</strong></td>
                  <td><span style="color:#475569; font-size:11px;">${p.category || '-'}</span></td>
                  <td class="text-right" style="color: #15803d; font-weight: 600;">${p.purchaseKg > 0 ? `+${toBengaliNumber(p.purchaseKg)}` : '০'}</td>
                  <td class="text-right" style="color: #b91c1c; font-weight: 600;">${p.saleKg > 0 ? `-${toBengaliNumber(p.saleKg)}` : '০'}</td>
                  <td class="text-right" style="font-weight: 600; color: ${p.netChangeKg > 0 ? '#15803d' : p.netChangeKg < 0 ? '#b91c1c' : '#64748b'};">
                    ${p.netChangeKg > 0 ? '+' : ''}${toBengaliNumber(p.netChangeKg)}
                  </td>
                  <td class="text-right" style="font-weight: 900; font-size: 13px; color: #1e1b4b; background: #f5f3ff;">
                    ${toBengaliNumber(p.lastStockKg)} KG
                  </td>
                  <td class="text-right" style="font-weight: 900; font-size: 13px; color: #166534; background: #f0fdf4;">
                    ${toBengaliNumber(p.lastStockValue || 0)} ৳
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" class="text-right"><strong>সর্বমোট:</strong></td>
                <td class="text-right"><strong>+${toBengaliNumber(latestDayRecord.purchaseKg)} KG</strong></td>
                <td class="text-right"><strong>-${toBengaliNumber(latestDayRecord.saleKg)} KG</strong></td>
                <td class="text-right"><strong>${latestDayRecord.netChangeKg > 0 ? '+' : ''}${toBengaliNumber(latestDayRecord.netChangeKg)} KG</strong></td>
                <td class="text-right" style="font-size: 14px;"><strong>${toBengaliNumber(latestDayRecord.lastStockKg)} KG</strong></td>
                <td class="text-right" style="font-size: 14px; color: #166534;"><strong>${toBengaliNumber(latestDayRecord.productBreakdown.reduce((sum, p) => sum + (p.lastStockValue || 0), 0))} ৳</strong></td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <p style="font-size: 11px; color: #64748b; margin-top: 8px;">
          * নিয়ম অনুযায়ী প্রতিদিন ক্যাশ মিলানো সম্পন্ন হওয়ার মুহূর্তের মোট মজুদই ঐ দিনের প্রামাণিক সমাপনী লাস্ট স্টক।
        </p>
        <div class="footer">
          <div class="sig-line">স্টক ইনচার্জ</div>
          <div class="sig-line">ম্যানেজার / প্রোপ্রাইটর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 20px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Print Stock Sheet
  const handlePrintStockReport = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const currentDate = formatDate(new Date());
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>স্টক রিপোর্ট - Bismillah Traders</title>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; padding: 20px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .shop-name { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
          .shop-sub { font-size: 12px; color: #475569; margin: 3px 0 0 0; }
          .doc-title { font-size: 15px; font-weight: bold; color: #2563eb; margin-top: 6px; text-transform: uppercase; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f1f5f9; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 5px 8px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .total-row { background: #f1f5f9; font-weight: bold; border-top: 2px solid #475569; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; font-size: 12px; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; padding-top: 4px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">Bismillah Traders (বিসমিল্লাহ ট্রেডার্স)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483, 01720640137</p>
          <div class="doc-title">পণ্যের বর্তমান স্টক ও ইনভেন্টরি তালিকা</div>
        </div>
        <div class="meta-bar">
          <span>তারিখ: ${currentDate}</span>
          <span>মোট আইটেম: ${toBengaliNumber(filteredProducts.length)} টি</span>
          <span>মোট স্টক ওজন: ${toBengaliNumber(totalStockKg)} KG</span>
          <span>মোট ইনভেন্টরি মূল্য (ক্রয়মূল্য): ${toBengaliNumber(totalPurchaseValue)} ৳</span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">নং</th>
              <th>পণ্যের নাম</th>
              <th class="text-right">ক্রয় মূল্য (৳)</th>
              <th class="text-right">বিক্রয় মূল্য (৳)</th>
              <th class="text-center">বর্তমান স্টক (KG)</th>
              <th class="text-right">মোট ক্রয় ভ্যালু (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map((p, idx) => {
              const rowTotal = (p.stock || 0) * (p.purchasePrice || 0);
              return `
                <tr>
                  <td class="text-center">${toBengaliNumber(idx + 1)}</td>
                  <td><strong>${p.name}</strong></td>
                  <td class="text-right">${toBengaliNumber(p.purchasePrice)} ৳</td>
                  <td class="text-right">${toBengaliNumber(p.salePrice)} ৳</td>
                  <td class="text-center" style="font-weight: bold; color: ${p.stock <= 5 ? '#dc2626' : '#15803d'};">
                    ${toBengaliNumber(p.stock)} ${p.unit || 'KG'}
                  </td>
                  <td class="text-right"><strong>${toBengaliNumber(rowTotal)} ৳</strong></td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right"><strong>সর্বমোট:</strong></td>
              <td class="text-center"><strong>${toBengaliNumber(totalStockKg)} KG</strong></td>
              <td class="text-right"><strong>${toBengaliNumber(totalPurchaseValue)} ৳</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <div class="sig-line">স্টক ইনচার্জ</div>
          <div class="sig-line">ম্যানেজার / প্রোপ্রাইটর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 20px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span>{language === 'bn' ? 'প্রোডাক্ট ও স্টক ব্যবস্থাপনা' : 'Products & Stock Management'}</span>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                {toBengaliNumber(products.length)} {language === 'bn' ? 'টি পণ্য' : 'items'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {language === 'bn' 
                ? 'পণ্যের নাম, ক্রয় ও বিক্রয় মূল্য এবং বর্তমান স্টক (KG) হিসাব' 
                : 'Product names, purchase & sale prices, and stock inventory'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          <button
            type="button"
            onClick={handlePrintStockReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-300"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>{language === 'bn' ? 'স্টক প্রিন্ট' : 'Print Stock'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'Add New Product (নতুন পণ্য)' : 'Add New Product'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Products & Today's Purchase/Sale KG */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold">{language === 'bn' ? 'মোট আইটেম' : 'Total Items'}</span>
              <Boxes className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800">
              {toBengaliNumber(products.length)} <span className="text-xs font-semibold text-slate-500">{language === 'bn' ? 'টি' : 'items'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {language === 'bn' ? 'নিবন্ধিত ক্যাটালগ' : 'Registered catalog'}
            </div>
          </div>

          {/* Today's Total Purchase & Sale KG Metrics */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-200/70 flex flex-col">
              <span className="text-emerald-700 font-bold text-[10px] leading-tight flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3 text-emerald-600 inline shrink-0" />
                <span>{language === 'bn' ? 'আজকের কেনা' : "Today's Buy"}</span>
              </span>
              <span className="font-black text-emerald-900 text-xs sm:text-sm mt-0.5">
                +{toBengaliNumber(todaysPurchasedKg)} <span className="text-[10px] font-semibold text-emerald-700">KG</span>
              </span>
            </div>

            <div className="bg-rose-50 rounded-lg p-1.5 border border-rose-200/70 flex flex-col">
              <span className="text-rose-700 font-bold text-[10px] leading-tight flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3 text-rose-600 inline shrink-0" />
                <span>{language === 'bn' ? 'আজকের বিক্রয়' : "Today's Sale"}</span>
              </span>
              <span className="font-black text-rose-900 text-xs sm:text-sm mt-0.5">
                -{toBengaliNumber(todaysSoldKg)} <span className="text-[10px] font-semibold text-rose-700">KG</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Current Stock (KG) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">{language === 'bn' ? 'বর্তমান মোট স্টক' : 'Total Current Stock'}</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700">
            {toBengaliNumber(totalStockKg)} <span className="text-xs font-bold text-emerald-600">KG</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
            {language === 'bn' ? 'গুদামে উপলব্ধ স্টক' : 'Available stock'}
          </div>
        </div>

        {/* Card 3: Stock Value (Purchase Cost) */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">{language === 'bn' ? 'মোট ইনভেন্টরি মূল্য' : 'Total Inventory Value'}</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-700">
            {toBengaliNumber(totalPurchaseValue)} <span className="text-xs font-bold">৳</span>
          </div>
          <div className="text-[11px] text-purple-600 mt-0.5 font-medium">
            {language === 'bn' ? 'ক্রয়মূল্য অনুযায়ী বিনিয়োগ' : 'At purchase cost'}
          </div>
        </div>

        {/* Card 4: Potential Sale Value & Low Stock */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">{language === 'bn' ? 'সম্ভাব্য বিক্রয় মূল্য' : 'Potential Sale Value'}</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-700">
            {toBengaliNumber(totalSaleValue)} <span className="text-xs font-bold">৳</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between font-medium">
            {!isUserManager ? (
              <span>{language === 'bn' ? 'সম্ভাব্য লাভ: +' : 'Potential Profit: +'}{toBengaliNumber(Math.max(0, totalSaleValue - totalPurchaseValue))} ৳</span>
            ) : (
              <span>{language === 'bn' ? 'মোট বিক্রয়যোগ্য পণ্য' : 'Total Saleable Items'}</span>
            )}
            {lowStockCount > 0 && (
              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                {toBengaliNumber(lowStockCount)} {language === 'bn' ? 'টি কম স্টক' : 'low stock'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Date Range Filter & Daily Closing Last Stock Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-800">
                  {language === 'bn' ? 'প্রতি দিনের লাস্ট স্টক ও ক্রয়-বিক্রয় রিপোর্ট' : 'Daily Last Stock & Closing Report'}
                </h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  stockStartDate || stockEndDate 
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {stockStartDate || stockEndDate
                    ? `${toBengaliNumber(dailyStockRecords.length)} ${language === 'bn' ? 'দিন ফিল্টারকৃত' : 'days filtered'}`
                    : (language === 'bn' ? 'সার্চ ফিল্টার বন্ধ' : 'No search applied')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {language === 'bn' 
                  ? 'প্রতিদিন ক্যাশ মিলানো (Cash Tally) সম্পন্ন করার মুহূর্তের সংরক্ষিত চূড়ান্ত স্টক হিসাব' 
                  : 'Closing stock locked upon daily cash tally completion'}
              </p>
            </div>
          </div>

          {/* Quick Date Presets & Print */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setStockStartDate(targetTodayDate);
                  setStockEndDate(targetTodayDate);
                }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  stockStartDate === targetTodayDate && stockEndDate === targetTodayDate
                    ? 'bg-white text-indigo-600 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900'
                }`}
              >
                {language === 'bn' ? 'আজ' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(targetTodayDate);
                  d.setDate(d.getDate() - 6);
                  setStockStartDate(d.toISOString().split('T')[0]);
                  setStockEndDate(targetTodayDate);
                }}
                className="px-2.5 py-1 rounded-md transition hover:text-slate-900 cursor-pointer"
              >
                {language === 'bn' ? 'গত ৭ দিন' : 'Last 7 Days'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(targetTodayDate);
                  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
                  setStockStartDate(firstDay);
                  setStockEndDate(targetTodayDate);
                }}
                className="px-2.5 py-1 rounded-md transition hover:text-slate-900 cursor-pointer"
              >
                {language === 'bn' ? 'চলতি মাস' : 'This Month'}
              </button>
              {(stockStartDate || stockEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStockStartDate('');
                    setStockEndDate('');
                  }}
                  className="px-2 py-1 rounded-md transition text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer flex items-center gap-1 font-bold"
                  title={language === 'bn' ? 'তারিখ ফিল্টার মুছুন' : 'Clear filter'}
                >
                  <X className="w-3 h-3" />
                  <span>{language === 'bn' ? 'মুছুন' : 'Clear'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrintDailyStockReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
              title={language === 'bn' ? 'দৈনিক লাস্ট স্টক রিপোর্ট প্রিন্ট করুন' : 'Print daily stock report'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'রিপোর্ট প্রিন্ট' : 'Print Report'}</span>
            </button>
          </div>
        </div>

        {/* Date Filter Inputs & Summary Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
          {/* Inputs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
              <span className="font-bold text-slate-500 whitespace-nowrap">
                {language === 'bn' ? 'শুরুর তারিখ (Start Date):' : 'Start Date:'}
              </span>
              <input
                type="date"
                value={stockStartDate}
                onChange={(e) => setStockStartDate(e.target.value)}
                className="font-bold text-slate-800 outline-none text-xs cursor-pointer bg-transparent"
              />
              {stockStartDate && (
                <button
                  type="button"
                  onClick={() => setStockStartDate('')}
                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  title={language === 'bn' ? 'শুরুর তারিখ মুছুন' : 'Clear start date'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-slate-400 font-bold hidden sm:inline">➔</span>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
              <span className="font-bold text-slate-500 whitespace-nowrap">
                {language === 'bn' ? 'শেষ তারিখ (End Date):' : 'End Date:'}
              </span>
              <input
                type="date"
                value={stockEndDate}
                onChange={(e) => setStockEndDate(e.target.value)}
                className="font-bold text-slate-800 outline-none text-xs cursor-pointer bg-transparent"
              />
              {stockEndDate && (
                <button
                  type="button"
                  onClick={() => setStockEndDate('')}
                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                  title={language === 'bn' ? 'শেষ তারিখ মুছুন' : 'Clear end date'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {(stockStartDate || stockEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setStockStartDate('');
                  setStockEndDate('');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition cursor-pointer"
                title={language === 'bn' ? 'তারিখ ফিল্টার রিসেট করুন' : 'Reset date filter'}
              >
                <RefreshCw className="w-3 h-3" />
                <span>{language === 'bn' ? 'ফিল্টার রিসেট' : 'Reset Filter'}</span>
              </button>
            )}
          </div>

          {/* Quick Stats for this Filtered Range */}
          {(stockStartDate || stockEndDate) && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="bg-emerald-100/90 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                <span>{language === 'bn' ? 'মোট কেনা:' : 'Buy:'}</span>
                <span className="font-black">+{toBengaliNumber(rangeTotals.totalPurchase)} KG</span>
              </span>

              <span className="bg-rose-100/90 text-rose-800 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-600" />
                <span>{language === 'bn' ? 'মোট বিক্রয়:' : 'Sale:'}</span>
                <span className="font-black">-{toBengaliNumber(rangeTotals.totalSale)} KG</span>
              </span>

              <span className="bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-md border border-indigo-200 flex items-center gap-1">
                <Scale className="w-3 h-3 text-indigo-600" />
                <span>{language === 'bn' ? 'রেঞ্জ সমাপনী স্টক:' : 'Closing Stock:'}</span>
                <span className="font-black">{toBengaliNumber(rangeTotals.latestStock)} KG</span>
              </span>
            </div>
          )}
        </div>

        {/* Daily Last Stock Records Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">{language === 'bn' ? 'নং' : '#'}</th>
                <th className="py-2.5 px-3">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                <th className="py-2.5 px-3 text-center">{language === 'bn' ? 'ক্যাশ মিলানো অবস্থা' : 'Cash Tally Status'}</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">{language === 'bn' ? 'কেনা (+KG)' : 'Purchase (KG)'}</th>
                <th className="py-2.5 px-3 text-right text-rose-700">{language === 'bn' ? 'বিক্রয় (-KG)' : 'Sale (KG)'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'bn' ? 'নেট পরিবর্তন' : 'Net Change'}</th>
                <th className="py-2.5 px-3 text-right bg-indigo-50/80 text-indigo-950 font-black border-l border-indigo-100">
                  {language === 'bn' ? 'দিনের শেষ স্টক (লাস্ট স্টক)' : 'Daily Last Stock (KG)'}
                </th>
                <th className="py-2.5 px-3 text-center w-24">{language === 'bn' ? 'বিস্তারিত' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(!stockStartDate && !stockEndDate) ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-black text-slate-800">
                        {language === 'bn' 
                          ? 'দৈনিক লাস্ট স্টক রিপোর্ট দেখতে তারিখ নির্বাচন করুন' 
                          : 'Select a date range to view Daily Last Stock report'}
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {language === 'bn'
                          ? 'সার্চ ছাড়া কোনো স্বয়ংক্রিয় রিপোর্ট প্রদর্শিত হবে না। নির্দিষ্ট দিনের হিসাব দেখতে উপরে "শুরুর তারিখ" ও "শেষ তারিখ" নির্ধারণ করুন অথবা কুইক ফিল্টার বোতাম ("আজ", "গত ৭ দিন", "চলতি মাস") চাপুন।'
                          : 'No report is shown without search. Please set Start and End dates above or click quick preset buttons.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : dailyStockRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    {language === 'bn' ? 'নির্বাচিত সময়কালে কোনো তথ্য পাওয়া যায়নি।' : 'No records found for the selected date range.'}
                  </td>
                </tr>
              ) : (
                dailyStockRecords.map((r, idx) => {
                  const isExpanded = expandedTallyDate === r.date;
                  return (
                    <React.Fragment key={r.date}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${r.isToday ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {toBengaliNumber(idx + 1)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800">
                              {toBengaliNumber(formatDate(r.date))}
                            </span>
                            {r.isToday && (
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-blue-200">
                                {language === 'bn' ? 'আজ' : 'Today'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r.hasCashTally ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{language === 'bn' ? 'ক্যাশ মিলানো সম্পন্ন' : 'Tally Done'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{language === 'bn' ? 'ক্যাশ মিলানো বাকি' : 'Tally Pending'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                          {r.purchaseKg > 0 ? `+${toBengaliNumber(r.purchaseKg)}` : '০'} <span className="text-[10px] text-emerald-600 font-semibold">KG</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-rose-700">
                          {r.saleKg > 0 ? `-${toBengaliNumber(r.saleKg)}` : '০'} <span className="text-[10px] text-rose-600 font-semibold">KG</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={r.netChangeKg > 0 ? 'text-emerald-700' : r.netChangeKg < 0 ? 'text-rose-700' : 'text-slate-500'}>
                            {r.netChangeKg > 0 ? `+${toBengaliNumber(r.netChangeKg)}` : toBengaliNumber(r.netChangeKg)} <span className="text-[10px] font-normal">KG</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right bg-indigo-50/50 border-l border-indigo-100">
                          <div className="flex flex-col items-end">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <span className="text-sm sm:text-base font-black text-indigo-950">
                                {toBengaliNumber(r.lastStockKg)}
                              </span>
                              <span className="text-[11px] font-bold text-indigo-700">KG</span>
                              {r.isConfirmedTally && (
                                <span 
                                  title={language === 'bn' ? 'ক্যাশ মিলানো সম্পন্ন করে সংরক্ষিত চূড়ান্ত লাস্ট স্টক' : 'Closing stock locked via cash tally'} 
                                  className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 inline-block shrink-0" 
                                />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedTallyDate(isExpanded ? null : r.date)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-900 transition flex items-center gap-0.5 mt-0.5 cursor-pointer"
                            >
                              <span>{toBengaliNumber(r.productBreakdown.length)} {language === 'bn' ? 'পণ্যের কেজি দেখুন' : 'items KG'}</span>
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedTallyDate(isExpanded ? null : r.date)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
                          >
                            <span>{isExpanded ? (language === 'bn' ? 'সংক্ষেপ' : 'Close') : (language === 'bn' ? 'বিস্তারিত' : 'Details')}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Drawer */}
                      {isExpanded && (() => {
                        const q = drawerSearchQuery.toLowerCase().trim();
                        const filteredBreakdown = r.productBreakdown.filter(p => {
                          const matchSearch = !q || 
                            p.productName.toLowerCase().includes(q) ||
                            (p.productCode && p.productCode.toLowerCase().includes(q)) ||
                            (p.category && p.category.toLowerCase().includes(q));
                          if (!matchSearch) return false;

                          if (drawerFilter === 'transactions') {
                            return p.purchaseKg > 0 || p.saleKg > 0;
                          }
                          if (drawerFilter === 'in_stock') {
                            return p.lastStockKg > 0;
                          }
                          return true;
                        });

                        const movedCount = r.productBreakdown.filter(p => p.purchaseKg > 0 || p.saleKg > 0).length;
                        const inStockCount = r.productBreakdown.filter(p => p.lastStockKg > 0).length;

                        return (
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <td colSpan={8} className="p-3 sm:p-5 text-xs">
                              <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                  <div className="font-black text-slate-800 flex items-center gap-1.5 text-sm">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    <span>{toBengaliNumber(formatDate(r.date))} - {language === 'bn' ? 'দিনের স্টক ও ক্যাশ মিলানোর বিস্তারিত বিবরণ' : 'Daily Stock & Cash Tally Summary'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {r.hasCashTally ? (
                                      <span className="bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                                        ✓ {language === 'bn' ? 'ক্যাশ মিলানো সম্পন্ন' : 'Cash Tally Completed'}
                                      </span>
                                    ) : (
                                      <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                                        ⏳ {language === 'bn' ? 'ক্যাশ মিলানো বাকি' : 'Cash Tally Not Yet Saved'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div className="text-[11px] text-slate-500 font-semibold">{language === 'bn' ? 'মোট মাল ক্রয়' : 'Total Purchase'}</div>
                                    <div className="text-sm font-black text-emerald-700 mt-0.5">+{toBengaliNumber(r.purchaseKg)} KG</div>
                                  </div>

                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div className="text-[11px] text-slate-500 font-semibold">{language === 'bn' ? 'মোট মাল বিক্রয়' : 'Total Sale'}</div>
                                    <div className="text-sm font-black text-rose-700 mt-0.5">-{toBengaliNumber(r.saleKg)} KG</div>
                                  </div>

                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    <div className="text-[11px] text-slate-500 font-semibold">{language === 'bn' ? 'দিনের নিট পরিবর্তন' : 'Net Weight Change'}</div>
                                    <div className="text-sm font-black text-slate-800 mt-0.5">
                                      {r.netChangeKg >= 0 ? `+${toBengaliNumber(r.netChangeKg)}` : toBengaliNumber(r.netChangeKg)} KG
                                    </div>
                                  </div>

                                  <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                                    <div className="text-[11px] text-indigo-700 font-bold">{language === 'bn' ? 'দিনের সমাপনী লাস্ট স্টক' : 'Final Closing Stock'}</div>
                                    <div className="text-base font-black text-indigo-950 mt-0.5">{toBengaliNumber(r.lastStockKg)} KG</div>
                                  </div>
                                </div>

                                {r.hasCashTally && (
                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-slate-600 text-[11px]">
                                    {r.tallySavedAt && (
                                      <div>
                                        <span className="font-semibold text-slate-400">{language === 'bn' ? 'সংরক্ষণের সময়:' : 'Saved at:'} </span>
                                        <span className="font-bold text-slate-700">{formatDate(r.tallySavedAt)}</span>
                                      </div>
                                    )}
                                    {typeof r.tallyActualCash === 'number' && (
                                      <div>
                                        <span className="font-semibold text-slate-400">{language === 'bn' ? 'ক্যাশ ড্রয়ারে উপস্থিত টাকা:' : 'Actual Cash:'} </span>
                                        <span className="font-black text-emerald-800">{toBengaliNumber(r.tallyActualCash)} ৳</span>
                                      </div>
                                    )}
                                    {r.tallySavedBy && (
                                      <div>
                                        <span className="font-semibold text-slate-400">{language === 'bn' ? 'হিসাবকারী:' : 'Saved by:'} </span>
                                        <span className="font-bold text-slate-700">{r.tallySavedBy}</span>
                                      </div>
                                    )}
                                    {r.tallyNotes && (
                                      <div className="w-full text-slate-600 bg-amber-50/50 p-2 rounded border border-amber-200/60">
                                        <span className="font-bold text-amber-800">{language === 'bn' ? 'মন্তব্য:' : 'Note:'} </span>
                                        <span>{r.tallyNotes}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {!r.hasCashTally && (
                                  <div className="text-slate-500 text-[11px] bg-slate-50 p-2 rounded border border-slate-200 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>
                                      {language === 'bn'
                                        ? 'এই দিনের ক্যাশ মিলানো এখনও সংরক্ষিত হয়নি। ক্যাশ মিলানো ট্যাবে গিয়ে "ক্যাশ মিলানো সংরক্ষণ করুন" বাটনে ক্লিক করলে সেই মুহূর্তের প্রতিটি পণ্যের মজুদ ওজন চিরতরে লক হয়ে যাবে।'
                                        : 'Cash tally has not been saved for this date yet. Saving cash tally will snapshot and lock individual product stock.'}
                                    </span>
                                  </div>
                                )}

                                {/* Dedicated Item-wise Stock Section: "কোনটা কত কেজি ছিল" */}
                                <div className="pt-3 border-t border-slate-200 space-y-3">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                        <Boxes className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                          <span>{language === 'bn' ? 'কোন পণ্যের কত কেজি ছিল (আইটেমওয়ারী লাস্ট স্টক)' : 'Item-wise Closing Stock & Movement'}</span>
                                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                                            {toBengaliNumber(r.productBreakdown.length)} {language === 'bn' ? 'টি পণ্য' : 'products'}
                                          </span>
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                          {language === 'bn' 
                                            ? 'এই নির্দিষ্ট দিনে প্রতিটি পণ্যের ক্রয়, বিক্রয় ও সমাপনী লাস্ট স্টক (কেজি)' 
                                            : 'Product-by-product breakdown of purchases, sales, and closing stock in KG'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Bar: Search, Quick Filters & Print */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="relative">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                          type="text"
                                          value={drawerSearchQuery}
                                          onChange={(e) => setDrawerSearchQuery(e.target.value)}
                                          placeholder={language === 'bn' ? 'পণ্য খুঁজুন (যেমন: 4.2 Round)...' : 'Search product...'}
                                          className="pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white w-44 sm:w-52"
                                        />
                                        {drawerSearchQuery && (
                                          <button 
                                            type="button" 
                                            onClick={() => setDrawerSearchQuery('')} 
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
                                        <button
                                          type="button"
                                          onClick={() => setDrawerFilter('all')}
                                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${drawerFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                          {language === 'bn' ? `সকল (${toBengaliNumber(r.productBreakdown.length)})` : `All (${r.productBreakdown.length})`}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDrawerFilter('transactions')}
                                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${drawerFilter === 'transactions' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                          {language === 'bn' ? `লেনদেন হওয়া (${toBengaliNumber(movedCount)})` : `Moved (${movedCount})`}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDrawerFilter('in_stock')}
                                          className={`px-2 py-0.5 rounded-md transition cursor-pointer ${drawerFilter === 'in_stock' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                          {language === 'bn' ? `স্টক আছে (${toBengaliNumber(inStockCount)})` : `In Stock (${inStockCount})`}
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handlePrintSingleDayProductReport(r)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                                        title={language === 'bn' ? 'এই দিনের পণ্যভিত্তিক লাস্ট স্টক চালান/রিপোর্ট প্রিন্ট করুন' : 'Print this day product stock'}
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>{language === 'bn' ? 'এই দিনের রিপোর্ট প্রিন্ট' : 'Print Day Report'}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Item-wise Table */}
                                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                                        <tr>
                                          <th className="py-2 px-3 text-center w-12">{language === 'bn' ? 'নং' : '#'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'পণ্যের নাম' : 'Product Name'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                                          <th className="py-2 px-3 text-right text-emerald-700">{language === 'bn' ? 'ক্রয় (+কেজি)' : 'Purchase (+KG)'}</th>
                                          <th className="py-2 px-3 text-right text-rose-700">{language === 'bn' ? 'বিক্রয় (-কেজি)' : 'Sale (-KG)'}</th>
                                          <th className="py-2 px-3 text-right">{language === 'bn' ? 'নিট পরিবর্তন' : 'Net Change'}</th>
                                          <th className="py-2 px-3 text-right bg-indigo-100/70 text-indigo-950 font-black border-l border-indigo-200">
                                            {language === 'bn' ? 'দিনের শেষ স্টক (KG)' : 'Day Last Stock (KG)'}
                                          </th>
                                          <th className="py-2 px-3 text-right bg-emerald-100/80 text-emerald-950 font-black border-l border-emerald-200">
                                            {language === 'bn' ? 'দিনের শেষ স্টক পণ্যের ভ্যালু (৳)' : 'Closing Stock Value (৳)'}
                                          </th>
                                          <th className="py-2 px-3 text-right text-slate-500 font-semibold">
                                            {language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredBreakdown.length === 0 ? (
                                          <tr>
                                            <td colSpan={9} className="py-6 text-center text-slate-400 font-medium">
                                              {language === 'bn' ? 'কোনো পণ্য খুঁজে পাওয়া যায়নি।' : 'No products match the filter.'}
                                            </td>
                                          </tr>
                                        ) : (
                                          filteredBreakdown.map((p, pIdx) => {
                                            const hasMoved = p.purchaseKg > 0 || p.saleKg > 0;
                                            const isZeroStock = p.lastStockKg <= 0;
                                            return (
                                              <tr 
                                                key={p.productId} 
                                                className={`hover:bg-slate-50/90 transition-colors ${
                                                  hasMoved ? 'bg-emerald-50/30' : isZeroStock ? 'bg-rose-50/20' : ''
                                                }`}
                                              >
                                                <td className="py-2 px-3 text-center font-bold text-slate-400">
                                                  {toBengaliNumber(pIdx + 1)}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                    {p.productName}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 text-[11px]">
                                                  {p.category || '-'}
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-emerald-700">
                                                  {p.purchaseKg > 0 ? `+${toBengaliNumber(p.purchaseKg)}` : '০'} <span className="text-[10px] text-emerald-600 font-semibold">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-rose-700">
                                                  {p.saleKg > 0 ? `-${toBengaliNumber(p.saleKg)}` : '০'} <span className="text-[10px] text-rose-600 font-semibold">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold">
                                                  <span className={p.netChangeKg > 0 ? 'text-emerald-700 font-black' : p.netChangeKg < 0 ? 'text-rose-700 font-black' : 'text-slate-400'}>
                                                    {p.netChangeKg > 0 ? `+${toBengaliNumber(p.netChangeKg)}` : toBengaliNumber(p.netChangeKg)} <span className="text-[10px] font-normal">KG</span>
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-right bg-indigo-50/60 font-black text-indigo-950 border-l border-indigo-100">
                                                  <span className="text-xs sm:text-sm">{toBengaliNumber(p.lastStockKg)}</span> <span className="text-[10px] font-bold text-indigo-700">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right bg-emerald-50/60 font-black text-emerald-900 border-l border-emerald-100">
                                                  <div className="text-xs sm:text-sm font-black text-emerald-800">
                                                    {toBengaliNumber(p.lastStockValue)} ৳
                                                  </div>
                                                  {p.rate > 0 && (
                                                    <div className="text-[10px] text-slate-400 font-semibold">
                                                      @{toBengaliNumber(p.rate)} ৳
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-right text-slate-600 font-semibold">
                                                  <span>{toBengaliNumber(p.currentStockKg)}</span> <span className="text-[10px] text-slate-400 font-normal">KG</span>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}
                                      </tbody>
                                      <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-indigo-200">
                                        <tr>
                                          <td colSpan={3} className="py-2.5 px-3 text-right">
                                            <span>{language === 'bn' ? `সর্বমোট (${toBengaliNumber(filteredBreakdown.length)}টি পণ্য):` : `Total (${filteredBreakdown.length} items):`}</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-emerald-800">
                                            +{toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.purchaseKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-rose-800">
                                            -{toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.saleKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {(() => {
                                              const netSum = filteredBreakdown.reduce((sum, p) => sum + p.netChangeKg, 0);
                                              return (
                                                <span className={netSum >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                                                  {netSum >= 0 ? `+${toBengaliNumber(netSum)}` : toBengaliNumber(netSum)} <span className="text-[10px]">KG</span>
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-indigo-950 bg-indigo-100/80 border-l border-indigo-200 text-sm">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.lastStockKg, 0))} <span className="text-[10px] font-bold">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-emerald-950 bg-emerald-100/90 border-l border-emerald-200 text-sm font-black">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + (p.lastStockValue || 0), 0))} <span className="text-[10px] font-bold">৳</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-700">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.currentStockKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {dailyStockRecords.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right">
                    {language === 'bn' ? 'নির্বাচিত সময়কালের সর্বমোট:' : 'Range Totals:'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-800 font-black">
                    +{toBengaliNumber(rangeTotals.totalPurchase)} KG
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-800 font-black">
                    -{toBengaliNumber(rangeTotals.totalSale)} KG
                  </td>
                  <td className="py-2.5 px-3 text-right font-black">
                    {rangeTotals.totalNet >= 0 ? `+${toBengaliNumber(rangeTotals.totalNet)}` : toBengaliNumber(rangeTotals.totalNet)} KG
                  </td>
                  <td className="py-2.5 px-3 text-right bg-indigo-100/80 text-indigo-950 font-black text-sm">
                    {toBengaliNumber(rangeTotals.latestStock)} KG
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Informative Guidance Banner */}
        <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2">
          <span className="text-blue-600 text-sm font-bold shrink-0">📌</span>
          <p className="leading-relaxed">
            <strong className="font-bold">{language === 'bn' ? 'লাস্ট স্টক গণনার নিয়ম:' : 'Last Stock Rule:'}</strong>{' '}
            {language === 'bn' 
              ? 'প্রতিদিন দোকান বন্ধের পূর্বে "ক্যাশ মিলানো" সম্পন্ন করার সাথে সাথে সেই মুহূর্তের মোট গোডাউন/দোকানের ওজনই ঐ দিনের অফিসিয়াল লাস্ট স্টক হিসেবে সেভ হয়। উপরোক্ত ফিল্টারে যেকোনো তারিখ রেঞ্জ (Start Date ও End Date) নির্বাচন করে প্রতিটি দিনের সমাপনী লাস্ট স্টক দেখতে ও প্রিন্ট করতে পারবেন।'
              : 'The stock snapshot when daily cash tally is saved serves as that day\'s official closing last stock. Filter any date range to review and print closing stock.'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পণ্যের নাম দিয়ে দ্রুত খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              showLowStockOnly 
                ? 'bg-rose-50 border-rose-300 text-rose-700' 
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${showLowStockOnly ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>কম স্টক (≤ ৫ কেজি)</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5 w-12 text-center">নং</th>
                <th 
                  className="py-3 px-3.5 min-w-[200px] cursor-pointer hover:bg-slate-100 transition select-none"
                  onClick={() => handleToggleSort('name')}
                  title="পণ্যের নাম অনুযায়ী ক্রমানুসারে সাজান (ছোট সংখ্যা উপরে, বড় সংখ্যা নিচে)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>পণ্যের নাম</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                          ১.১ → ১০.১০ <ArrowUp className="w-3 h-3 text-emerald-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          ১০.১০ → ১.১ <ArrowDown className="w-3 h-3 text-amber-600" />
                        </span>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-3 px-3.5 text-right w-28 cursor-pointer hover:bg-slate-100 transition select-none"
                  onClick={() => handleToggleSort('purchasePrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'bn' ? 'ক্রয়মূল্য' : 'Cost Price'}</span>
                    {sortField === 'purchasePrice' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-3 px-3.5 text-right w-28 cursor-pointer hover:bg-slate-100 transition select-none"
                  onClick={() => handleToggleSort('salePrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'bn' ? 'বিক্রয়মূল্য' : 'Sale Price'}</span>
                    {sortField === 'salePrice' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                {!isUserManager && (
                  <th className="py-3 px-3.5 text-right w-24">
                    {language === 'bn' ? 'লাভ (প্রতি কেজি)' : 'Profit / KG'}
                  </th>
                )}
                <th 
                  className="py-3 px-3.5 text-center w-36 cursor-pointer hover:bg-slate-100 transition select-none"
                  onClick={() => handleToggleSort('stock')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{language === 'bn' ? 'মজুদ স্টক (কেজি)' : 'Current Stock (KG)'}</span>
                    {sortField === 'stock' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th 
                  className="py-3 px-3.5 text-right w-32 cursor-pointer hover:bg-slate-100 transition select-none"
                  onClick={() => handleToggleSort('totalValue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'bn' ? 'মোট ইনভেন্টরি ভ্যালু' : 'Total Inventory Value'}</span>
                    {sortField === 'totalValue' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center w-28">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={!isUserManager ? 8 : 7} className="py-12 text-center text-slate-400 space-y-2">
                    <Package className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-semibold">কোনো পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400">নতুন পণ্য যোগ করতে উপরের "Add New Product" বাটনে ক্লিক করুন</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const purchase = Number(p.purchasePrice) || 0;
                  const sale = Number(p.salePrice) || 0;
                  const stock = Number(p.stock) || 0;
                  const profitPerUnit = sale - purchase;
                  const totalRowValue = stock * purchase;
                  const unitLabel = p.unit || 'KG';

                  const isNegative = stock < 0;
                  const isZero = stock === 0;
                  const isLow = stock > 0 && stock <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition text-slate-800">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-medium">
                        {toBengaliNumber(idx + 1)}
                      </td>

                      {/* Product Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 leading-tight">{p.name}</div>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-700">
                        {toBengaliNumber(purchase)} ৳
                      </td>

                      {/* Sale Price */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-indigo-700">
                        {toBengaliNumber(sale)} ৳
                      </td>

                      {/* Profit per KG (Hidden for managers) */}
                      {!isUserManager && (
                        <td className="py-3 px-3.5 text-right font-mono text-xs">
                          <span className={profitPerUnit >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                            {profitPerUnit >= 0 ? '+' : ''}{toBengaliNumber(profitPerUnit)} ৳
                          </span>
                        </td>
                      )}

                      {/* Current Stock (KG) */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!canEditOrDelete}
                            onClick={() => {
                              if (!canEditOrDelete) {
                                alert('ম্যানেজার একাউন্ট থেকে স্টক সমন্বয় করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
                                return;
                              }
                              setStockAdjustProduct(p);
                              setAdjustAmount('5');
                              setAdjustType('add');
                            }}
                            title={!canEditOrDelete ? "স্টক সমন্বয় লক করা (শুধুমাত্র অ্যাডমিন)" : isNegative ? "মজুদ ঘাটতি / অগ্রিম বিক্রি। মহাজন থেকে কিনলে স্বয়ংক্রিয়ভাবে ব্যালেন্স হবে।" : "দ্রুত স্টক যোগ / হ্রাস করুন"}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition flex items-center gap-1 ${
                              !canEditOrDelete ? 'cursor-default opacity-90' : 'cursor-pointer'
                            } ${
                              isNegative
                                ? 'bg-rose-600 border-rose-700 text-white shadow-xs hover:bg-rose-700'
                                : isZero 
                                ? 'bg-rose-100 border-rose-300 text-rose-800' 
                                : isLow 
                                ? 'bg-amber-100 border-amber-300 text-amber-800' 
                                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            <span>
                              {isNegative ? `-${toBengaliNumber(Math.abs(stock))} ${unitLabel} (ঘাটতি)` : `${toBengaliNumber(stock)} ${unitLabel}`}
                            </span>
                            {canEditOrDelete && <ArrowUpDown className="w-3 h-3 opacity-60" />}
                          </button>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                        {toBengaliNumber(totalRowValue)} ৳
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEditOrDelete ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(p)}
                                title="এডিট করুন"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  confirmAction({
                                    title: 'প্রোডাক্ট মুছে ফেলা',
                                    message: `আপনি কি নিশ্চিত "${p.name}" প্রোডাক্টটি তালিকা থেকে মুছতে চান?`,
                                    confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
                                    onConfirm: () => deleteProduct(p.id)
                                  });
                                }}
                                title="মুছে ফেলুন"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                              🔒 সুরক্ষিত
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Product */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  {editingProduct ? 'প্রোডাক্টের তথ্য আপডেট করুন' : 'নতুন প্রোডাক্ট যুক্ত করুন (Add New Product)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              
              {/* Row 1: Product Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  পণ্যের নাম (Product Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  required
                  autoFocus
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="যেমন: BRB কপার ওয়্যার / বিএসআরএম রড..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Row 2: Unit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  স্টক পরিমাপক একক (Unit)
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="KG">কেজি (KG)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">স্টকের পরিমাপ শুধুমাত্র কেজি (KG)</span>
              </div>

              {/* Row 4: Purchase Price (৳) & Sale Price (৳) */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Purchase Price (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={purchaseRef}
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">ক্রয় মূল্য (প্রতি {unit})</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-700 block mb-1">
                    Sale Price (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={saleRef}
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0"
                    className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-indigo-600 mt-0.5 block">বিক্রয় মূল্য (প্রতি {unit})</span>
                </div>
              </div>

              {/* Row 5: Current Stock (KG) */}
              <div>
                <label className="text-xs font-bold text-emerald-800 block mb-1">
                  Current Stock ({unit}) <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={stockRef}
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  placeholder="0"
                  className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  দোকান বা গুদামে বর্তমান মোট মজুদ পরিমাণ
                </span>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingProduct ? 'আপডেট করুন' : 'প্রোডাক্ট সেভ করুন'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Stock Adjust */}
      {stockAdjustProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                <span>স্টক সমন্বয় (Stock Adjustment)</span>
              </h3>
              <button
                type="button"
                onClick={() => setStockAdjustProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800 text-sm">{stockAdjustProduct.name}</div>
              <div className="text-slate-600 flex justify-between items-center pt-1">
                <span>বর্তমান স্টক:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {toBengaliNumber(stockAdjustProduct.stock)} {stockAdjustProduct.unit || 'KG'}
                </span>
              </div>
            </div>

            <form onSubmit={handleApplyStockAdjustment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  অ্যাকশন নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      adjustType === 'add'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + স্টক যোগ করুন
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      adjustType === 'subtract'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    - স্টক কমান
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  পরিমাণ ({stockAdjustProduct.unit || 'KG'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="যেমন: ১০"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setStockAdjustProduct(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
                >
                  স্টক আপডেট নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
