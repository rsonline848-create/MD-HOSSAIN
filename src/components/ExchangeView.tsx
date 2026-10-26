import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, Customer, ProductCatalogItem, Invoice } from '../types';
import { 
  ArrowLeftRight, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Search, 
  Save, 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  Scale, 
  Package, 
  DollarSign, 
  Sparkles,
  CreditCard,
  UserPlus,
  RefreshCw,
  FileText
} from 'lucide-react';
import { 
  toBengaliNumber, 
  toEnglishNumber, 
  formatCurrency, 
  formatDate,
  getFormattedCurrentTime,
  normalizeNumericInput,
  normalizeInputDigits
} from '../utils/formatters';
import { ProductSearchSelect } from './ProductSearchSelect';

interface ExchangeItemRow {
  id: string;
  productId: string;
  code?: string;
  name: string;
  quantity: string; // in KG
  unitPrice: string; // ৳ per KG
  lineTotal: number;
}

export const ExchangeView: React.FC = () => {
  const { 
    selectedDate, 
    customers, 
    products, 
    addProduct, 
    updateProduct, 
    addInvoice, 
    addCustomer, 
    setInvoiceToPrint,
    invoices 
  } = useApp();

  const [invoiceDate, setInvoiceDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [memoNo, setMemoNo] = useState<string>('');
  const [memoError, setMemoError] = useState<string>('');

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInput, setCustomerInput] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const memoNoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const adjustedTotalRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const cashPaidRef = useRef<HTMLInputElement>(null);
  const onlinePaidRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Return Items (কাস্টমার থেকে ফেরত আসা পণ্য - Stock + হবে)
  const [returnItems, setReturnItems] = useState<ExchangeItemRow[]>([
    { id: 'ret_1', productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }
  ]);

  // Delivered Items (কাস্টমারকে নতুন দেওয়া পণ্য - Stock - হবে)
  const [newItems, setNewItems] = useState<ExchangeItemRow[]>([
    { id: 'new_1', productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }
  ]);

  // Financial inputs (টাকা পয়সা ও পেমেন্ট)
  const [adjustedTotal, setAdjustedTotal] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [onlinePaid, setOnlinePaid] = useState<string>('');
  const [onlineMethod, setOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bank');
  const [exchangeNotes, setExchangeNotes] = useState<string>('');

  // Notifications & last saved
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [lastSavedInvoice, setLastSavedInvoice] = useState<Invoice | null>(null);

  // Quick Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');
  const [newCustOpeningDue, setNewCustOpeningDue] = useState<string>('');
  const [newCustDiscountPerKg, setNewCustDiscountPerKg] = useState<string>('');
  const [newCustNotes, setNewCustNotes] = useState<string>('');
  const [newCustError, setNewCustError] = useState<string>('');

  // Quick Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [targetTypeForNewProd, setTargetTypeForNewProd] = useState<'return' | 'new'>('new');
  const [targetRowIdForNewProd, setTargetRowIdForNewProd] = useState<string | null>(null);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('সাধারণ মালামাল');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<string>('');
  const [newProdSalePrice, setNewProdSalePrice] = useState<string>('');
  const [newProdStock, setNewProdStock] = useState<string>('0');
  const [newProdError, setNewProdError] = useState<string>('');

  // Sync date when global date changes
  useEffect(() => {
    if (selectedDate) {
      setInvoiceDate(selectedDate);
    }
  }, [selectedDate]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered customer suggestions
  const filteredCustomers = useMemo(() => {
    const q = customerInput.toLowerCase().trim();
    if (!q) return customers.slice(0, 10);
    return customers.filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  }, [customers, customerInput]);

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerInput(cust.name + (cust.phone ? ` (${cust.phone})` : ''));
    setShowCustomerDropdown(false);
  };

  const handleCustomerInputChange = (text: string) => {
    setCustomerInput(text);
    setShowCustomerDropdown(true);
    if (selectedCustomer && !text.includes(selectedCustomer.name)) {
      setSelectedCustomer(null);
    }
  };

  // Calculations for Return Items (ফেরত পণ্য)
  const { returnTotalWeight, returnSubtotal } = useMemo(() => {
    let weight = 0;
    let total = 0;
    returnItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const p = toEnglishNumber(item.unitPrice) || 0;
      weight += q;
      total += (q * p);
    });
    return { returnTotalWeight: weight, returnSubtotal: total };
  }, [returnItems]);

  // Calculations for New Items (নতুন পণ্য)
  const { newTotalWeight, newSubtotal } = useMemo(() => {
    let weight = 0;
    let total = 0;
    newItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const p = toEnglishNumber(item.unitPrice) || 0;
      weight += q;
      total += (q * p);
    });
    return { newTotalWeight: weight, newSubtotal: total };
  }, [newItems]);

  // Price Difference: New Items Total - Returned Items Total
  const netDifference = newSubtotal - returnSubtotal;

  // Auto-fill adjusted total when items change
  useEffect(() => {
    // If netDifference > 0: customer owes netDifference
    // If netDifference <= 0: customer owes 0 (or has credit)
    if (netDifference > 0) {
      setAdjustedTotal(String(netDifference));
    } else {
      setAdjustedTotal('0');
    }
  }, [netDifference]);

  // Financial fields
  const numTotalSale = toEnglishNumber(adjustedTotal.toString()) || 0;
  const numDiscount = toEnglishNumber(discount.toString()) || 0;
  const numCashPaid = toEnglishNumber(cashPaid.toString()) || 0;
  const numOnlinePaid = toEnglishNumber(onlinePaid.toString()) || 0;

  const previousDue = selectedCustomer ? (selectedCustomer.currentDue || 0) : 0;
  const netSale = Math.max(0, numTotalSale - numDiscount);
  const totalPaid = numCashPaid + numOnlinePaid;
  const todaysDue = netSale - totalPaid;
  const overallDue = previousDue + todaysDue;

  // Customer Special Discount calculation if any
  const customerDiscountRate = selectedCustomer?.discountPerKg || 0;
  const suggestedWeightDiscount = customerDiscountRate > 0 ? Math.round(newTotalWeight * customerDiscountRate) : 0;

  // Row Manipulation for Return Items
  const handleUpdateReturnRow = (id: string, field: 'quantity' | 'unitPrice', val: string) => {
    const normVal = normalizeNumericInput(val);
    setReturnItems(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: normVal };
      const q = toEnglishNumber(updated.quantity) || 0;
      const p = toEnglishNumber(updated.unitPrice) || 0;
      updated.lineTotal = q * p;
      return updated;
    }));
  };

  const handleSelectReturnProd = (rowId: string, prod: ProductCatalogItem | null) => {
    setReturnItems(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      if (!prod) {
        return { ...row, productId: '', code: '', name: '', unitPrice: '', lineTotal: 0 };
      }
      const q = toEnglishNumber(row.quantity) || 0;
      const p = prod.salePrice || prod.purchasePrice || 0;
      return {
        ...row,
        productId: prod.id,
        code: prod.code,
        name: prod.name,
        unitPrice: p > 0 ? String(p) : row.unitPrice,
        lineTotal: q * (p > 0 ? p : (toEnglishNumber(row.unitPrice) || 0))
      };
    }));

    if (prod) {
      setTimeout(() => {
        const qtyEl = document.getElementById(`ret-qty-${rowId}`) as HTMLInputElement;
        if (qtyEl) {
          qtyEl.focus();
          qtyEl.select?.();
        }
      }, 50);
    }
  };

  const handleAddReturnRow = () => {
    setReturnItems(prev => [
      ...prev,
      { id: 'ret_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5), productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }
    ]);
  };

  const handleRemoveReturnRow = (id: string) => {
    setReturnItems(prev => {
      if (prev.length <= 1) {
        return [{ id: 'ret_' + Date.now(), productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }];
      }
      return prev.filter(r => r.id !== id);
    });
  };

  // Row Manipulation for New Items
  const handleUpdateNewRow = (id: string, field: 'quantity' | 'unitPrice', val: string) => {
    const normVal = normalizeNumericInput(val);
    setNewItems(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: normVal };
      const q = toEnglishNumber(updated.quantity) || 0;
      const p = toEnglishNumber(updated.unitPrice) || 0;
      updated.lineTotal = q * p;
      return updated;
    }));
  };

  const handleSelectNewProd = (rowId: string, prod: ProductCatalogItem | null) => {
    setNewItems(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      if (!prod) {
        return { ...row, productId: '', code: '', name: '', unitPrice: '', lineTotal: 0 };
      }
      const q = toEnglishNumber(row.quantity) || 0;
      const p = prod.salePrice || 0;
      return {
        ...row,
        productId: prod.id,
        code: prod.code,
        name: prod.name,
        unitPrice: p > 0 ? String(p) : row.unitPrice,
        lineTotal: q * (p > 0 ? p : (toEnglishNumber(row.unitPrice) || 0))
      };
    }));

    if (prod) {
      setTimeout(() => {
        const qtyEl = document.getElementById(`new-qty-${rowId}`) as HTMLInputElement;
        if (qtyEl) {
          qtyEl.focus();
          qtyEl.select?.();
        }
      }, 50);
    }
  };

  const handleAddNewRow = () => {
    setNewItems(prev => [
      ...prev,
      { id: 'new_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5), productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }
    ]);
  };

  const handleRemoveNewRow = (id: string) => {
    setNewItems(prev => {
      if (prev.length <= 1) {
        return [{ id: 'new_' + Date.now(), productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }];
      }
      return prev.filter(r => r.id !== id);
    });
  };

  // Open Quick Add Product Modal
  const handleOpenAddProductModal = (type: 'return' | 'new', presetName?: string, rowId?: string) => {
    setTargetTypeForNewProd(type);
    setTargetRowIdForNewProd(rowId || null);
    setNewProdName(presetName || '');
    setNewProdCategory('সাধারণ মালামাল');
    setNewProdPurchasePrice('');
    setNewProdSalePrice('');
    setNewProdStock('0');
    setNewProdError('');
    setShowAddProductModal(true);
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setNewProdError('');

    const nameTrimmed = newProdName.trim();
    if (!nameTrimmed) {
      setNewProdError('পণ্যের নাম দেওয়া বাধ্যতামূলক!');
      return;
    }

    const purchase = toEnglishNumber(newProdPurchasePrice.toString()) || 0;
    const sale = toEnglishNumber(newProdSalePrice.toString()) || 0;
    const stock = toEnglishNumber(newProdStock.toString()) || 0;

    const createdProd: ProductCatalogItem = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      code: `P-${String(products.length + 1).padStart(3, '0')}`,
      name: nameTrimmed,
      category: newProdCategory.trim() || 'সাধারণ মালামাল',
      purchasePrice: purchase,
      salePrice: sale > 0 ? sale : Math.round(purchase * 1.15),
      stock: stock,
      unit: 'KG',
      createdAt: new Date().toISOString()
    };

    addProduct(createdProd);

    if (targetTypeForNewProd === 'return' && targetRowIdForNewProd) {
      handleSelectReturnProd(targetRowIdForNewProd, createdProd);
    } else if (targetTypeForNewProd === 'new' && targetRowIdForNewProd) {
      handleSelectNewProd(targetRowIdForNewProd, createdProd);
    }

    setShowAddProductModal(false);
  };

  // Quick Customer Save
  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustError('');

    const nameTrimmed = newCustName.trim();
    if (!nameTrimmed) {
      setNewCustError('কাস্টমারের নাম দেওয়া বাধ্যতামূলক!');
      return;
    }

    const opDue = toEnglishNumber(newCustOpeningDue.toString()) || 0;
    const discPerKg = toEnglishNumber(newCustDiscountPerKg.toString()) || 0;

    const newCust: Customer = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: nameTrimmed,
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      openingDue: opDue,
      currentDue: opDue,
      totalPurchased: 0,
      totalPaid: 0,
      discountPerKg: discPerKg > 0 ? discPerKg : undefined,
      notes: newCustNotes.trim(),
      createdDate: invoiceDate
    };

    addCustomer(newCust);
    handleSelectCustomer(newCust);
    setShowAddCustomerModal(false);
  };

  // SAVE EXCHANGE INVOICE & AUTO UPDATE STOCKS (+ for returns, - for delivered)
  const handleSaveExchange = (e: React.FormEvent) => {
    e.preventDefault();

    if (!memoNo.trim()) {
      setMemoError('মেমো নং দেওয়া বাধ্যতামূলক!');
      memoNoInputRef.current?.focus();
      return;
    }
    setMemoError('');

    const validReturnItems = returnItems.filter(item => item.name.trim() && (toEnglishNumber(item.quantity) || 0) > 0);
    const validNewItems = newItems.filter(item => item.name.trim() && (toEnglishNumber(item.quantity) || 0) > 0);

    if (validReturnItems.length === 0 && validNewItems.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি ফেরত বা নতুন পণ্য যুক্ত করুন!');
      return;
    }

    let customerId = selectedCustomer ? selectedCustomer.id : '';
    let customerName = customerInput.trim() || 'সাধারণ ক্যাশ কাস্টমার';
    let customerPhone = selectedCustomer ? selectedCustomer.phone : '';
    let customerAddress = selectedCustomer ? selectedCustomer.address : '';

    // 1. UPDATE STOCKS:
    // (A) Returned Items: ADD to stock (+)
    validReturnItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const matchingProd = products.find(p => p.id === item.productId || p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (matchingProd) {
        const curStock = Number(matchingProd.stock) || 0;
        updateProduct(matchingProd.id, {
          stock: curStock + q
        });
      }
    });

    // (B) Delivered Items: DEDUCT from stock (-)
    validNewItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const matchingProd = products.find(p => p.id === item.productId || p.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (matchingProd) {
        const curStock = Number(matchingProd.stock) || 0;
        updateProduct(matchingProd.id, {
          stock: curStock - q
        });
      }
    });

    // 2. Format Structured Invoice Items
    const invoiceItemsFormatted: InvoiceItem[] = [];

    // Add returned items as credit / exchange items
    validReturnItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const p = toEnglishNumber(item.unitPrice) || 0;
      invoiceItemsFormatted.push({
        id: 'item_ret_' + Math.random().toString(36).substring(2, 7),
        productId: item.productId,
        name: `[ফেরত মাল] ${item.name}`,
        category: 'এক্সচেঞ্জ ফেরত',
        quantity: q,
        unit: 'কেজি',
        unitPrice: p,
        totalPrice: q * p
      });
    });

    // Add new items
    validNewItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const p = toEnglishNumber(item.unitPrice) || 0;
      invoiceItemsFormatted.push({
        id: 'item_new_' + Math.random().toString(36).substring(2, 7),
        productId: item.productId,
        name: `[নতুন মাল] ${item.name}`,
        category: 'এক্সচেঞ্জ ডেলিভারি',
        quantity: q,
        unit: 'কেজি',
        unitPrice: p,
        totalPrice: q * p
      });
    });

    // Construct Note
    const defaultNote = `পণ্য পরিবর্তন / এক্সচেঞ্জ মেমো: ফেরত ${toBengaliNumber(returnTotalWeight)} কেজি (${toBengaliNumber(returnSubtotal)} ৳), নতুন ${toBengaliNumber(newTotalWeight)} কেজি (${toBengaliNumber(newSubtotal)} ৳)।`;
    const finalNotes = exchangeNotes.trim() ? `${exchangeNotes.trim()} | ${defaultNote}` : defaultNote;

    // 3. Save Invoice via addInvoice
    const created = addInvoice({
      invoiceNo: memoNo.trim(),
      date: invoiceDate,
      time: getFormattedCurrentTime(),
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      items: invoiceItemsFormatted,
      subtotal: numTotalSale,
      discount: numDiscount,
      laborOrTransportCost: 0,
      grandTotal: netSale,
      cashPaid: numCashPaid,
      onlinePaid: numOnlinePaid,
      onlineMethod: numOnlinePaid > 0 ? onlineMethod : undefined,
      dueAmount: Math.max(0, todaysDue),
      previousDue,
      totalDue: overallDue,
      status: todaysDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due',
      notes: finalNotes
    });

    setLastSavedInvoice(created);
    setSuccessMessage(
      `এক্সচেঞ্জ মেমো #${memoNo.trim()} সফলভাবে সংরক্ষিত হয়েছে! ফেরত মালের স্টক (+) এবং নতুন মালের স্টক (-) স্বয়ংক্রিয়ভাবে আপডেট হয়েছে।`
    );

    // Reset Form
    setMemoNo('');
    setCustomerInput('');
    setSelectedCustomer(null);
    setReturnItems([{ id: 'ret_' + Date.now(), productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }]);
    setNewItems([{ id: 'new_' + Date.now(), productId: '', name: '', quantity: '', unitPrice: '', lineTotal: 0 }]);
    setAdjustedTotal('');
    setDiscount('');
    setCashPaid('');
    setOnlinePaid('');
    setOnlineMethod('bank');
    setExchangeNotes('');
  };

  // Focus next focusable input on Enter key across all form fields
  const focusNextInput = (currentElement: HTMLElement) => {
    if (!formRef.current) return;
    const focusableSelectors = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])';
    const focusableElements = Array.from(
      formRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter(el => {
      return el.offsetParent !== null && !el.classList.contains('pointer-events-none');
    });

    const currentIndex = focusableElements.indexOf(currentElement);
    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      const nextEl = focusableElements[currentIndex + 1];
      nextEl.focus();
      if ('select' in nextEl && typeof (nextEl as HTMLInputElement).select === 'function') {
        (nextEl as HTMLInputElement).select();
      }
    }
  };

  // Prevent accidental form submission on Enter key across all inputs!
  // Moves to next field on Enter, and only submits when Enter is pressed on the submit button itself
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
      const target = e.target as HTMLElement;
      // Allow submit ONLY if explicitly focused on the submit button itself
      if (target === submitButtonRef.current || (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit')) {
        return;
      }
      // If target is an input, select, or textarea, prevent form submission and advance to next field
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        e.preventDefault();
        focusNextInput(target);
      }
    }
  };

  // Recent Exchange Invoices
  const recentExchanges = useMemo(() => {
    return invoices
      .filter(inv => inv.notes?.includes('এক্সচেঞ্জ') || inv.items?.some(i => i.name?.includes('[ফেরত মাল]')))
      .slice(0, 10);
  }, [invoices]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-6">
      
      {/* Page Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </span>
            <span>পণ্য পরিবর্তন / এক্সচেঞ্জ ও মাল ফেরত</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            কাস্টমারের ফেরত দেওয়া পণ্য স্টকে প্লাস (+) এবং নতুন নেওয়া পণ্য স্টক থেকে মাইনাস (-) করে স্বয়ংক্রিয় সমন্বিত ইনভয়েস তৈরি করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAddProductModal('new')}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ নতুন প্রোডাক্ট তৈরি</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-800">{successMessage}</p>
              <p className="text-xs text-emerald-700 mt-0.5">কাস্টমারের হিসাব ও গোডাউনের স্টক রিয়েল-টাইমে ক্লাউডে আপডেট করা হয়েছে।</p>
            </div>
          </div>
          {lastSavedInvoice && (
            <button
              type="button"
              onClick={() => setInvoiceToPrint(lastSavedInvoice)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition self-start sm:self-auto cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>মেমো প্রিন্ট করুন</span>
            </button>
          )}
        </div>
      )}

      {/* Main Exchange Form */}
      <form 
        ref={formRef}
        onSubmit={handleSaveExchange} 
        onKeyDown={handleFormKeyDown}
        className="space-y-6"
      >
        
        {/* Row 1: তারিখ ও মেমো নং (বাধ্যতামূলক, নিজে টাইপ করবেন) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              তারিখ
            </label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  memoNoInputRef.current?.focus();
                  memoNoInputRef.current?.select?.();
                }
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>মেমো নং</span>
                <span className="text-rose-600 font-extrabold text-sm">*</span>
              </label>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                বাধ্যতামূলক (টাইপ করুন)
              </span>
            </div>
            <input
              ref={memoNoInputRef}
              type="text"
              required
              placeholder="মেমো নং লিখুন (যেমন: ৫১০)"
              value={memoNo}
              onChange={(e) => {
                setMemoNo(normalizeInputDigits(e.target.value));
                if (memoError) setMemoError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (customerInputRef.current) {
                    customerInputRef.current.focus();
                    customerInputRef.current.select?.();
                  }
                }
              }}
              className={`w-full bg-slate-50 border rounded-lg px-3.5 py-2 text-sm font-bold font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 shadow-2xs transition ${
                memoError 
                  ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20 ring-1 ring-rose-300' 
                  : 'border-slate-300 focus:ring-purple-500'
              }`}
            />
            {memoError && (
              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{memoError}</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 2: কাস্টমার নির্বাচন ও পূর্বের বাকি */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="md:col-span-2 relative" ref={customerDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                কাস্টমার নির্বাচন করুন <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setNewCustName(customerInput !== 'সাধারণ ক্যাশ কাস্টমার' ? customerInput : '');
                  setNewCustPhone('');
                  setNewCustAddress('');
                  setNewCustOpeningDue('');
                  setNewCustDiscountPerKg('');
                  setNewCustNotes('');
                  setNewCustError('');
                  setShowAddCustomerModal(true);
                }}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ নতুন কাস্টমার এন্ট্রি</span>
              </button>
            </div>
            
            <div className="relative">
              <input
                ref={customerInputRef}
                type="text"
                placeholder="কাস্টমারের নাম বা মোবাইল নম্বর লিখুন..."
                value={customerInput}
                onChange={(e) => handleCustomerInputChange(e.target.value)}
                onFocus={() => setShowCustomerDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCustomerDropdown(false);
                    const firstRetProd = document.getElementById(`ret-prod-${returnItems[0]?.id}`) as HTMLInputElement;
                    const firstRetQty = document.getElementById(`ret-qty-${returnItems[0]?.id}`) as HTMLInputElement;
                    if (firstRetProd) {
                      firstRetProd.focus();
                    } else if (firstRetQty) {
                      firstRetQty.focus();
                      firstRetQty.select?.();
                    } else {
                      adjustedTotalRef.current?.focus();
                      adjustedTotalRef.current?.select?.();
                    }
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                <div 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerInput('সাধারণ ক্যাশ কাস্টমার');
                    setShowCustomerDropdown(false);
                  }}
                  className="p-2.5 hover:bg-purple-50 cursor-pointer text-xs font-bold text-purple-700 flex items-center justify-between"
                >
                  <span>-- সাধারণ ক্যাশ কাস্টমার --</span>
                  <span className="text-[10px] text-slate-400 font-normal">কোনো পূর্বের বাকি নেই</span>
                </div>

                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs flex items-center justify-between transition"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.phone || 'ফোন নেই'} {c.address ? `• ${c.address}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">পূর্বের বাকি</span>
                      <span className={`font-bold ${c.currentDue > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {toBengaliNumber(c.currentDue)} ৳
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedCustomer && (
              <div className="mt-2 text-xs flex items-center gap-3 bg-purple-50/60 p-2 rounded-lg border border-purple-100">
                <span className="font-bold text-purple-900">মোবাইল: {selectedCustomer.phone || '-'}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">ঠিকানা: {selectedCustomer.address || '-'}</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              কাস্টমারের পূর্বের বাকি
            </label>
            <div className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-extrabold text-rose-600 shadow-2xs">
              {toBengaliNumber(previousDue)} ৳
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION A: কাস্টমারের ফেরত দেওয়া পণ্য (Stock + হবে) */}
        {/* ======================================================== */}
        <div className="bg-amber-50/60 border-2 border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-amber-950 flex items-center gap-2">
                  <span>১. কাস্টমারের ফেরত দেওয়া পণ্য (Return Items)</span>
                  <span className="text-[11px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold border border-amber-300">
                    স্টকে জমা (+) হবে
                  </span>
                </h3>
                <p className="text-[11px] text-amber-800/80">
                  কাস্টমার যে পণ্য ফেরত দিচ্ছেন তা সিলেক্ট করুন ও ওজন লিখুন (এটি কাস্টমারের পাওনা হিসেবে ক্রেডিট হবে)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddReturnRow}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ আরও ফেরত পণ্য যোগ করুন</span>
            </button>
          </div>

          {/* Return Rows List */}
          <div className="space-y-3">
            {returnItems.map((item, idx) => {
              const matchingProd = products.find(p => p.id === item.productId || p.name === item.name);
              return (
                <div 
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  {/* Product selector */}
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-bold text-amber-900 block mb-0.5">
                      ফেরত পণ্য #{toBengaliNumber(idx + 1)}
                    </label>
                    <ProductSearchSelect
                      products={products}
                      selectedProductId={item.productId}
                      inputId={`ret-prod-${item.id}`}
                      onSelect={(prod) => handleSelectReturnProd(item.id, prod)}
                      onAddNew={(preset) => handleOpenAddProductModal('return', preset, item.id)}
                      onPressEnterWhenClosed={() => {
                        const qty = document.getElementById(`ret-qty-${item.id}`) as HTMLInputElement;
                        qty?.focus();
                        qty?.select?.();
                      }}
                      placeholder="ফেরত দেওয়া পণ্য খুঁজুন..."
                    />
                    {matchingProd && (
                      <span className="text-[10.5px] font-semibold text-emerald-700 mt-1 block">
                        বর্তমান মজুদ: <strong>{toBengaliNumber(matchingProd.stock || 0)} KG</strong> (ফেরতের পর বাড়বে)
                      </span>
                    )}
                  </div>

                  {/* Weight in KG */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      ফেরতের ওজন (কেজি)
                    </label>
                    <div className="relative">
                      <input
                        id={`ret-qty-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="যেমন: ১০"
                        value={item.quantity}
                        onChange={(e) => handleUpdateReturnRow(item.id, 'quantity', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                            e.preventDefault();
                            e.stopPropagation();
                            const priceEl = document.getElementById(`ret-price-${item.id}`) as HTMLInputElement;
                            if (priceEl) {
                              priceEl.focus();
                              priceEl.select?.();
                            }
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      ফেরত দর (৳/কেজি)
                    </label>
                    <div className="relative">
                      <input
                        id={`ret-price-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="০"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateReturnRow(item.id, 'unitPrice', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (idx < returnItems.length - 1) {
                              const nextRetProd = document.getElementById(`ret-prod-${returnItems[idx + 1].id}`) as HTMLInputElement;
                              const nextRetQty = document.getElementById(`ret-qty-${returnItems[idx + 1].id}`) as HTMLInputElement;
                              if (nextRetProd) {
                                nextRetProd.focus();
                              } else if (nextRetQty) {
                                nextRetQty.focus();
                                nextRetQty.select?.();
                              }
                            } else {
                              const firstNewProd = document.getElementById(`new-prod-${newItems[0]?.id}`) as HTMLInputElement;
                              const firstNewQty = document.getElementById(`new-qty-${newItems[0]?.id}`) as HTMLInputElement;
                              if (firstNewProd) {
                                firstNewProd.focus();
                              } else if (firstNewQty) {
                                firstNewQty.focus();
                                firstNewQty.select?.();
                              } else {
                                adjustedTotalRef.current?.focus();
                                adjustedTotalRef.current?.select?.();
                              }
                            }
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-6 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 text-right font-mono"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-400">
                        ৳
                      </span>
                    </div>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block sm:hidden">মোট:</span>
                      <span className="text-xs font-extrabold text-amber-900">
                        {toBengaliNumber(item.lineTotal || 0)} ৳
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveReturnRow(item.id)}
                      title="মুছুন"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Return Summary Footer */}
          <div className="bg-amber-100/70 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-950 border border-amber-200">
            <div className="flex items-center gap-3">
              <span>মোট ফেরত ওজন: <strong className="text-amber-900">{toBengaliNumber(returnTotalWeight)} KG</strong></span>
              <span className="text-amber-300">|</span>
              <span>মোট ফেরত মূল্য (ক্রেডিট): <strong className="text-amber-900">{toBengaliNumber(returnSubtotal)} ৳</strong></span>
            </div>
            <span className="bg-white px-2.5 py-1 rounded-lg text-amber-800 border border-amber-300 text-[11px]">
              ✓ স্টকে +{toBengaliNumber(returnTotalWeight)} KG যোগ হবে
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION B: কাস্টমারকে নতুন দেওয়া পণ্য (Stock - হবে) */}
        {/* ======================================================== */}
        <div className="bg-indigo-50/60 border-2 border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-indigo-950 flex items-center gap-2">
                  <span>২. কাস্টমারকে নতুন দেওয়া পণ্য (Delivered / New Items)</span>
                  <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold border border-indigo-300">
                    স্টক থেকে বাদ (-) যাবে
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-800/80">
                  কাস্টমার যে নতুন পণ্য নিয়ে যাচ্ছেন তা সিলেক্ট করুন ও ওজন লিখুন (এটি কাস্টমারের ওপর চার্জ হবে)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddNewRow}
              className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ আরও নতুন পণ্য যোগ করুন</span>
            </button>
          </div>

          {/* New Rows List */}
          <div className="space-y-3">
            {newItems.map((item, idx) => {
              const matchingProd = products.find(p => p.id === item.productId || p.name === item.name);
              return (
                <div 
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  {/* Product selector */}
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-bold text-indigo-900 block mb-0.5">
                      নতুন পণ্য #{toBengaliNumber(idx + 1)}
                    </label>
                    <ProductSearchSelect
                      products={products}
                      selectedProductId={item.productId}
                      inputId={`new-prod-${item.id}`}
                      onSelect={(prod) => handleSelectNewProd(item.id, prod)}
                      onAddNew={(preset) => handleOpenAddProductModal('new', preset, item.id)}
                      onPressEnterWhenClosed={() => {
                        const qty = document.getElementById(`new-qty-${item.id}`) as HTMLInputElement;
                        qty?.focus();
                        qty?.select?.();
                      }}
                      placeholder="নতুন দেওয়া পণ্য খুঁজুন..."
                    />
                    {matchingProd && (
                      <span className="text-[10.5px] font-semibold text-slate-600 mt-1 block">
                        বর্তমান মজুদ: <strong>{toBengaliNumber(matchingProd.stock || 0)} KG</strong> (ডেলিভারির পর কমবে)
                      </span>
                    )}
                  </div>

                  {/* Weight in KG */}
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      ডেলিভারি ওজন (কেজি)
                    </label>
                    <div className="relative">
                      <input
                        id={`new-qty-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="যেমন: ১০"
                        value={item.quantity}
                        onChange={(e) => handleUpdateNewRow(item.id, 'quantity', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                            e.preventDefault();
                            e.stopPropagation();
                            const priceEl = document.getElementById(`new-price-${item.id}`) as HTMLInputElement;
                            if (priceEl) {
                              priceEl.focus();
                              priceEl.select?.();
                            }
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-400">
                        KG
                      </span>
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      বিক্রয় দর (৳/কেজি)
                    </label>
                    <div className="relative">
                      <input
                        id={`new-price-${item.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="০"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateNewRow(item.id, 'unitPrice', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (idx < newItems.length - 1) {
                              const nextNewProd = document.getElementById(`new-prod-${newItems[idx + 1].id}`) as HTMLInputElement;
                              const nextNewQty = document.getElementById(`new-qty-${newItems[idx + 1].id}`) as HTMLInputElement;
                              if (nextNewProd) {
                                nextNewProd.focus();
                              } else if (nextNewQty) {
                                nextNewQty.focus();
                                nextNewQty.select?.();
                              }
                            } else {
                              adjustedTotalRef.current?.focus();
                              adjustedTotalRef.current?.select?.();
                            }
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-6 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-right font-mono"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-400">
                        ৳
                      </span>
                    </div>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block sm:hidden">মোট:</span>
                      <span className="text-xs font-extrabold text-indigo-900">
                        {toBengaliNumber(item.lineTotal || 0)} ৳
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewRow(item.id)}
                      title="মুছুন"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* New Summary Footer */}
          <div className="bg-indigo-100/70 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-indigo-950 border border-indigo-200">
            <div className="flex items-center gap-3">
              <span>মোট নতুন ওজন: <strong className="text-indigo-900">{toBengaliNumber(newTotalWeight)} KG</strong></span>
              <span className="text-indigo-300">|</span>
              <span>মোট নতুন মালের মূল্য: <strong className="text-indigo-900">{toBengaliNumber(newSubtotal)} ৳</strong></span>
            </div>
            <span className="bg-white px-2.5 py-1 rounded-lg text-indigo-800 border border-indigo-300 text-[11px]">
              ✓ স্টক থেকে -{toBengaliNumber(newTotalWeight)} KG বাদ যাবে
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* EXCHANGE SETTLEMENT & DIFFERENCE CARD (পার্থক্য ও হিসাব) */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-purple-200 font-bold">এক্সচেঞ্জ সমন্বয় সারাংশ</span>
              <h4 className="text-lg font-black text-white">পার্থক্য ও সমন্বিত বিল</h4>
            </div>

            <div className="text-right">
              <span className="text-xs text-purple-200 block">সমন্বয়ের পর নিট পার্থক্য:</span>
              <span className="text-2xl font-black text-amber-300">
                {netDifference >= 0 ? `+${toBengaliNumber(netDifference)} ৳` : `${toBengaliNumber(netDifference)} ৳`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-white/70 block">নতুন মালের দাম:</span>
              <p className="text-base font-bold text-emerald-300">+{toBengaliNumber(newSubtotal)} ৳</p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-white/70 block">ফেরত মালের ক্রেডিট:</span>
              <p className="text-base font-bold text-amber-300">-{toBengaliNumber(returnSubtotal)} ৳</p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-white/70 block">কাস্টমার অবস্থা:</span>
              <p className="text-xs font-bold text-white mt-1">
                {netDifference > 0 ? (
                  <span className="text-rose-300 font-extrabold">কাস্টমারকে অতিরিক্ত {toBengaliNumber(netDifference)} ৳ দিতে হবে</span>
                ) : netDifference < 0 ? (
                  <span className="text-emerald-300 font-extrabold">কাস্টমার {toBengaliNumber(Math.abs(netDifference))} ৳ ফেরত পাবেন / জমা</span>
                ) : (
                  <span className="text-white">উভয় মালের দাম সমান (০ ৳ সমন্বয়)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROW 3 & 4: পেমেন্ট ও বাকি সমন্বয় (নগদ বা বাকি বিক্রয়) */}
        {/* ======================================================== */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>নগদ গ্রহণ বা বাকি বিক্রয় ও পেমেন্ট সমন্বয়</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                সমন্বয়ের পর মোট দেয় টাকা (৳)
              </label>
              <input
                ref={adjustedTotalRef}
                type="text"
                inputMode="decimal"
                value={adjustedTotal}
                onChange={(e) => setAdjustedTotal(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    discountRef.current?.focus();
                    discountRef.current?.select?.();
                  }
                }}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-purple-700 focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                বিশেষ ছাড় / ডিসকাউন্ট (৳)
              </label>
              <input
                ref={discountRef}
                type="text"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    cashPaidRef.current?.focus();
                    cashPaidRef.current?.select?.();
                  }
                }}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
              />
              {suggestedWeightDiscount > 0 && (
                <span className="text-[10px] text-pink-700 block mt-1 font-semibold">
                  কাস্টমার রেগুলার ছাড় হতে পারে: {toBengaliNumber(suggestedWeightDiscount)} ৳
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                নগদ গ্রহণ (৳)
              </label>
              <input
                ref={cashPaidRef}
                type="text"
                inputMode="decimal"
                value={cashPaid}
                onChange={(e) => setCashPaid(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    onlinePaidRef.current?.focus();
                    onlinePaidRef.current?.select?.();
                  }
                }}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ব্যাংক পেমেন্ট
              </label>
              <div className="flex gap-2">
                <select
                  value={onlineMethod}
                  onChange={(e: any) => setOnlineMethod(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-xs font-bold text-slate-700"
                >
                  <option value="bank">ব্যাংক (Bank)</option>
                </select>
                <input
                  ref={onlinePaidRef}
                  type="text"
                  inputMode="decimal"
                  value={onlinePaid}
                  onChange={(e) => setOnlinePaid(normalizeNumericInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      notesRef.current?.focus();
                      notesRef.current?.select?.();
                    }
                  }}
                  placeholder="ব্যাংক টাকার পরিমাণ"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                এক্সচেঞ্জ বিবরণ বা নোট (ঐচ্ছিক)
              </label>
              <input
                ref={notesRef}
                type="text"
                value={exchangeNotes}
                onChange={(e) => setExchangeNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    submitButtonRef.current?.focus();
                  }
                }}
                placeholder="যেমন: ৪.২ ফেরত দিয়ে ৪.৪ পরিবর্তন..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Final Due Summary */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
            <div>
              <span className="text-slate-600 block">আজকের বাকি / সমন্বিত দেনা:</span>
              <p className="text-base font-black text-rose-600">{toBengaliNumber(Math.max(0, todaysDue))} ৳</p>
            </div>
            <div>
              <span className="text-slate-600 block">কাস্টমারের মোট পূর্বের বাকি:</span>
              <p className="text-base font-black text-slate-800">{toBengaliNumber(previousDue)} ৳</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-rose-300 text-right">
              <span className="text-rose-600 block text-[11px]">সর্বমোট অবশিষ্ট বাকি:</span>
              <p className="text-lg font-black text-rose-700">{toBengaliNumber(Math.max(0, overallDue))} ৳</p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            ref={submitButtonRef}
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span>🔄 এক্সচেঞ্জ ইনভয়েস সংরক্ষণ ও স্টক সমন্বয় করুন (+ / -)</span>
          </button>
        </div>

      </form>

      {/* Recent Exchanges History */}
      {recentExchanges.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-600" />
            <span>সাম্প্রতিক এক্সচেঞ্জ ও মাল পরিবর্তন তালিকা</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-2.5">মেমো নং</th>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">কাস্টমার</th>
                  <th className="p-2.5">মালের পরিবর্তন বিবরণ</th>
                  <th className="p-2.5 text-right">মোট বিল</th>
                  <th className="p-2.5 text-right">জমা</th>
                  <th className="p-2.5 text-right">বাকি</th>
                  <th className="p-2.5 text-center">প্রিন্ট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentExchanges.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="p-2.5 font-bold font-mono text-purple-700">{inv.invoiceNo}</td>
                    <td className="p-2.5 text-slate-600">{toBengaliNumber(formatDate(inv.date))}</td>
                    <td className="p-2.5 font-semibold text-slate-800">{inv.customerName}</td>
                    <td className="p-2.5 text-slate-600 max-w-xs truncate" title={inv.notes}>
                      {inv.notes || '-'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-800">{toBengaliNumber(inv.grandTotal)} ৳</td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700">{toBengaliNumber(inv.cashPaid + inv.onlinePaid)} ৳</td>
                    <td className="p-2.5 text-right font-bold text-rose-600">{toBengaliNumber(inv.dueAmount)} ৳</td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => setInvoiceToPrint(inv)}
                        className="p-1 text-slate-400 hover:text-purple-600 rounded transition cursor-pointer"
                        title="মেমো প্রিন্ট করুন"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-purple-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-sm">নতুন প্রোডাক্ট তৈরি করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="p-5 space-y-4 text-xs">
              {newProdError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newProdError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  পণ্যের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 4.4round"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">ক্রয় দর (৳/কেজি)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="০"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(normalizeNumericInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">বিক্রয় দর (৳/কেজি)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="০"
                    value={newProdSalePrice}
                    onChange={(e) => setNewProdSalePrice(normalizeNumericInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">বর্তমান স্টক (কেজি)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(normalizeNumericInput(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  প্রোডাক্ট সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm">নতুন কাস্টমার এন্ট্রি করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-3.5 text-xs">
              {newCustError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newCustError}</span>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  কাস্টমারের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="নাম লিখুন"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    placeholder="017xxxxxxxx"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(normalizeInputDigits(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">পূর্বের বাকি (যদি থাকে)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={newCustOpeningDue}
                    onChange={(e) => setNewCustOpeningDue(normalizeNumericInput(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ঠিকানা</label>
                <input
                  type="text"
                  placeholder="ঠিকানা লিখুন"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  কাস্টমার সংরক্ষণ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
