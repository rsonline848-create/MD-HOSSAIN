import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShoppingCart, 
  Truck, 
  CheckCircle, 
  Search, 
  Plus, 
  CreditCard,
  Trash2,
  Package,
  Sparkles,
  Scale,
  AlertCircle,
  X,
  Boxes,
  FileText,
  DollarSign,
  Eye,
  Edit,
  Printer,
  Calendar,
  RotateCcw,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import { 
  toBengaliNumber, 
  toEnglishNumber, 
  formatCurrency, 
  formatDate, 
  numberToBengaliWords, 
  extractSupplierBillItems,
  normalizeNumericInput,
  normalizeInputDigits
} from '../utils/formatters';
import { ProductSearchSelect } from './ProductSearchSelect';
import { ProductCatalogItem, SupplierBill, SupplierPaymentRecord, SupplierBillItem } from '../types';

interface PurchaseItemRow {
  id: string;
  productId?: string;
  name: string;
  quantity: string; // in KG
  unitPrice: string; // ৳ per KG
  lineTotal: number;
}

interface ParsedBillItem {
  id: number;
  name: string;
  quantityStr: string;
  rateStr: string;
  totalStr: string;
}

const parseBillItems = (desc: string, totalBill: number): { items: ParsedBillItem[]; note: string } => {
  if (!desc || !desc.trim()) {
    return {
      items: [{
        id: 1,
        name: 'ক্রয়কৃত মালামাল',
        quantityStr: '-',
        rateStr: '-',
        totalStr: `${toBengaliNumber(totalBill)} ৳`
      }],
      note: ''
    };
  }

  let raw = desc.trim();
  let note = '';

  // Extract [নোট: ...] if present
  const noteMatch = raw.match(/\[নোট:\s*([^\]]+)\]/);
  if (noteMatch) {
    note = noteMatch[1].trim();
    raw = raw.replace(/\[নোট:\s*[^\]]+\]/, '').trim();
    raw = raw.replace(/,\s*$/, '').trim();
  }

  // Split by newlines, semicolons, or comma separating products
  const parts = raw.split(/\n|(?<=\))\s*,\s*|;\s*/).map(p => p.trim()).filter(Boolean);

  const items: ParsedBillItem[] = [];

  parts.forEach((part, idx) => {
    // Check if matches pattern: Name (Qty @ Rate)
    // e.g. "সিলভার তার (৫০ KG @ ৪৫০ ৳)"
    const match = part.match(/^(.*?)\s*\((.*?)\s*@\s*(.*?)\)$/);
    if (match) {
      const name = match[1].trim();
      const qtyStr = match[2].trim();
      let rateStr = match[3].trim();
      if (!rateStr.includes('৳')) {
        rateStr = `${rateStr} ৳`;
      }
      
      const qtyNum = toEnglishNumber(qtyStr.replace(/[^০-৯0-9.]/g, ''));
      const rateNum = toEnglishNumber(rateStr.replace(/[^০-৯0-9.]/g, ''));
      let itemTotal = '-';
      if (qtyNum > 0 && rateNum > 0) {
        itemTotal = `${toBengaliNumber(Math.round(qtyNum * rateNum))} ৳`;
      }

      items.push({
        id: idx + 1,
        name: name || 'পণ্য',
        quantityStr: qtyStr,
        rateStr: rateStr,
        totalStr: itemTotal
      });
    } else {
      items.push({
        id: idx + 1,
        name: part,
        quantityStr: '-',
        rateStr: '-',
        totalStr: parts.length === 1 ? `${toBengaliNumber(totalBill)} ৳` : '-'
      });
    }
  });

  if (items.length === 0) {
    items.push({
      id: 1,
      name: raw || 'ক্রয়কৃত মালামাল',
      quantityStr: '-',
      rateStr: '-',
      totalStr: `${toBengaliNumber(totalBill)} ৳`
    });
  }

  return { items, note };
};

export const getBillItems = (
  bill: SupplierBill, 
  productsList?: ProductCatalogItem[]
): SupplierBillItem[] => {
  const items = extractSupplierBillItems(bill);
  if (productsList && productsList.length > 0) {
    return items.map(it => {
      if (it.productId) return it;
      const matched = productsList.find(p => p.name.trim().toLowerCase() === (it.name || '').trim().toLowerCase());
      return {
        ...it,
        productId: matched?.id
      };
    });
  }
  return items;
};

export const SupplierBillView: React.FC = () => {
  const { 
    selectedDate, 
    suppliers, 
    supplierBills, 
    setSupplierBills,
    addSupplierBill, 
    deleteSupplierBill,
    updateSupplierBill,
    addSupplierPayment,
    supplierPayments,
    setSupplierPayments,
    setSuppliers,
    products,
    setProducts,
    addProduct,
    updateProduct,
    moveToRecycleBin,
    canEditOrDelete,
    confirmAction
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'bill_entry' | 'payment_entry' | 'history'>('bill_entry');

  // Purchase Bill State
  const [memoNo, setMemoNo] = useState<string>('');
  const [memoError, setMemoError] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [cashPaid, setCashPaid] = useState<string>('');
  const [onlinePaid, setOnlinePaid] = useState<string>('');
  const [billNotes, setBillNotes] = useState<string>('');
  const [itemsExtraNote, setItemsExtraNote] = useState<string>('');
  const [showExtraNoteInput, setShowExtraNoteInput] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Structured Items for Purchase
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItemRow[]>([
    { id: 'pitem_1', name: '', quantity: '', unitPrice: '', lineTotal: 0 }
  ]);

  // Quick Add Product Modal State
  const [showNewProdModal, setShowNewProdModal] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('সাধারণ মালামাল');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<string>('');
  const [newProdSalePrice, setNewProdSalePrice] = useState<string>('');
  const [newProdStock, setNewProdStock] = useState<string>('0');
  const [newProdError, setNewProdError] = useState<string>('');
  const [targetRowIdForNewProd, setTargetRowIdForNewProd] = useState<string | null>(null);

  // Bill Refs
  const billMemoRef = useRef<HTMLInputElement>(null);
  const billSupplierSelectRef = useRef<HTMLSelectElement>(null);
  const billTotalAmountRef = useRef<HTMLInputElement>(null);
  const billCashPaidRef = useRef<HTMLInputElement>(null);
  const billOnlinePaidRef = useRef<HTMLInputElement>(null);
  const billNotesRef = useRef<HTMLInputElement>(null);
  const billSubmitButtonRef = useRef<HTMLButtonElement>(null);

  // Direct Supplier Payment State (মহাজন দেনা পরিশোধ)
  const [paySupplierId, setPaySupplierId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
  const [payNotes, setPayNotes] = useState<string>('');

  // Pay Refs
  const paySupplierSelectRef = useRef<HTMLSelectElement>(null);
  const payAmountRef = useRef<HTMLInputElement>(null);
  const payMethodRef = useRef<HTMLSelectElement>(null);
  const payNotesRef = useRef<HTMLInputElement>(null);
  const paySubmitButtonRef = useRef<HTMLButtonElement>(null);

  const mappedSuppliers = useMemo(() => {
    return suppliers.map(s => {
      const opening = Number(s.openingPayable ?? s.openingBalance ?? s.previousDue ?? 0) || 0;
      const sBills = supplierBills.filter(b => b.supplierId === s.id);
      const sPayments = supplierPayments.filter(p => p.supplierId === s.id);
      const totalPurchased = sBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const billsPaid = sBills.reduce((sum, b) => sum + ((Number(b.cashPaid) || 0) + (Number(b.onlinePaid) || 0)), 0);
      const directPayments = sPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalPaid = billsPaid + directPayments;
      const calculatedPayable = Math.max(0, opening + totalPurchased - totalPaid);
      return {
        ...s,
        openingPayable: opening,
        openingBalance: opening,
        previousDue: opening,
        totalPurchased,
        totalPaid,
        currentPayable: calculatedPayable
      };
    });
  }, [suppliers, supplierBills, supplierPayments]);

  const selectedSupplier = mappedSuppliers.find(s => s.id === selectedSupplierId);
  const selectedPaySupplier = mappedSuppliers.find(s => s.id === paySupplierId);

  // Action Modals State
  const [viewingBill, setViewingBill] = useState<SupplierBill | null>(null);
  const [editingBill, setEditingBill] = useState<SupplierBill | null>(null);
  const [viewingPayment, setViewingPayment] = useState<SupplierPaymentRecord | null>(null);
  const [editingPayment, setEditingPayment] = useState<SupplierPaymentRecord | null>(null);

  // Edit Bill Form State
  const [editMemoNo, setEditMemoNo] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editSupplierId, setEditSupplierId] = useState<string>('');
  const [editItemsDescription, setEditItemsDescription] = useState<string>('');
  const [editTotalAmount, setEditTotalAmount] = useState<string>('');
  const [editCashPaid, setEditCashPaid] = useState<string>('');
  const [editOnlinePaid, setEditOnlinePaid] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editPurchaseItems, setEditPurchaseItems] = useState<PurchaseItemRow[]>([]);

  // Handlers for Edit Items
  const handleEditItemChange = (id: string, field: 'name' | 'quantity' | 'unitPrice', val: string) => {
    const cleanVal = (field === 'quantity' || field === 'unitPrice') ? normalizeNumericInput(val) : val;
    setEditPurchaseItems(prev => {
      const next = prev.map(row => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: cleanVal };
        const q = toEnglishNumber(updated.quantity) || 0;
        const p = toEnglishNumber(updated.unitPrice) || 0;
        updated.lineTotal = Math.round(q * p);
        return updated;
      });
      const sum = next.reduce((acc, r) => acc + (r.lineTotal || 0), 0);
      if (sum > 0) {
        setEditTotalAmount(String(sum));
      }
      return next;
    });
  };

  const handleEditSelectProductForRow = (rowId: string, prod: ProductCatalogItem) => {
    setEditPurchaseItems(prev => {
      const next = prev.map(row => {
        if (row.id !== rowId) return row;
        const q = toEnglishNumber(row.quantity) || 0;
        const p = Number(prod.purchasePrice) || 0;
        return {
          ...row,
          productId: prod.id,
          name: prod.name,
          unitPrice: p > 0 ? String(p) : row.unitPrice,
          lineTotal: Math.round(q * (p > 0 ? p : (toEnglishNumber(row.unitPrice) || 0)))
        };
      });
      const sum = next.reduce((acc, r) => acc + (r.lineTotal || 0), 0);
      if (sum > 0) {
        setEditTotalAmount(String(sum));
      }
      return next;
    });
  };

  const handleEditAddItemRow = (selectedProd?: ProductCatalogItem) => {
    const newRow: PurchaseItemRow = {
      id: 'edit_pitem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      productId: selectedProd?.id,
      name: selectedProd?.name || '',
      quantity: '',
      unitPrice: selectedProd?.purchasePrice ? String(selectedProd.purchasePrice) : '',
      lineTotal: 0
    };
    setEditPurchaseItems(prev => [...prev, newRow]);
  };

  const handleEditRemoveItemRow = (id: string) => {
    setEditPurchaseItems(prev => {
      const next = prev.length <= 1 
        ? [{ id: 'edit_pitem_' + Date.now(), name: '', quantity: '', unitPrice: '', lineTotal: 0 }] 
        : prev.filter(r => r.id !== id);
      const sum = next.reduce((acc, r) => acc + (r.lineTotal || 0), 0);
      if (sum > 0) {
        setEditTotalAmount(String(sum));
      }
      return next;
    });
  };

  // Edit Payment Form State
  const [editPaySupplierId, setEditPaySupplierId] = useState<string>('');
  const [editPayDate, setEditPayDate] = useState<string>('');
  const [editPayAmount, setEditPayAmount] = useState<string>('');
  const [editPayMethod, setEditPayMethod] = useState<'cash' | 'online'>('cash');
  const [editPayNotes, setEditPayNotes] = useState<string>('');

  // Search & Type in History tab
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyType, setHistoryType] = useState<'bills' | 'payments'>('bills');

  // Totals of items
  const { totalItemsWeight, totalItemsAmount, validItemsCount } = useMemo(() => {
    let weight = 0;
    let amount = 0;
    let count = 0;
    purchaseItems.forEach(item => {
      const q = toEnglishNumber(item.quantity) || 0;
      const p = toEnglishNumber(item.unitPrice) || 0;
      const isFilled = item.name.trim() !== '' || q > 0 || p > 0;
      if (isFilled) {
        count++;
        weight += q;
        amount += (q * p);
      }
    });
    return { totalItemsWeight: weight, totalItemsAmount: amount, validItemsCount: count };
  }, [purchaseItems]);

  // Auto-sync total bill amount when items are added/modified
  useEffect(() => {
    if (totalItemsAmount > 0) {
      setTotalAmount(String(totalItemsAmount));
    }
  }, [totalItemsAmount]);

  // Close viewing or edit modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingBill) setEditingBill(null);
        if (viewingBill) setViewingBill(null);
        if (viewingPayment) setViewingPayment(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingBill, viewingBill, viewingPayment]);

  const effectiveTotalAmount = toEnglishNumber(totalAmount.toString()) || 0;
  const billDue = Math.max(
    0, 
    effectiveTotalAmount - ((toEnglishNumber(cashPaid.toString()) || 0) + (toEnglishNumber(onlinePaid.toString()) || 0))
  );

  // Handle item row changes
  const handleItemChange = (id: string, field: 'name' | 'quantity' | 'unitPrice', val: string) => {
    const cleanVal = (field === 'quantity' || field === 'unitPrice') ? normalizeNumericInput(val) : val;
    setPurchaseItems(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: cleanVal };
      const q = toEnglishNumber(updated.quantity) || 0;
      const p = toEnglishNumber(updated.unitPrice) || 0;
      updated.lineTotal = Math.round(q * p);
      return updated;
    }));
  };

  // Prevent accidental submit on Enter in forms, navigating to next fields instead
  const handleBillFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
      const target = e.target as HTMLElement;
      if (target === billSubmitButtonRef.current || (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit')) {
        return;
      }
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        e.preventDefault();
      }
    }
  };

  const handlePaymentFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
      const target = e.target as HTMLElement;
      if (target === paySubmitButtonRef.current || (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit')) {
        return;
      }
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        e.preventDefault();
      }
    }
  };

  const handleSelectProductForRow = (rowId: string, product: ProductCatalogItem | null) => {
    setPurchaseItems(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      if (!product) {
        return { ...row, productId: undefined, name: '', unitPrice: '', lineTotal: 0 };
      }
      const q = toEnglishNumber(row.quantity) || 0;
      const p = product.purchasePrice || 0;
      return {
        ...row,
        productId: product.id,
        name: product.name,
        unitPrice: p > 0 ? String(p) : row.unitPrice,
        lineTotal: q * (p > 0 ? p : (toEnglishNumber(row.unitPrice) || 0))
      };
    }));
  };

  const handleAddItemRow = (selectedProd?: ProductCatalogItem) => {
    const newRow: PurchaseItemRow = {
      id: 'pitem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      productId: selectedProd?.id,
      name: selectedProd?.name || '',
      quantity: '',
      unitPrice: selectedProd?.purchasePrice ? String(selectedProd.purchasePrice) : '',
      lineTotal: 0
    };
    setPurchaseItems(prev => [...prev, newRow]);
  };

  const handleRemoveItemRow = (id: string) => {
    setPurchaseItems(prev => {
      if (prev.length <= 1) {
        return [{ id: 'pitem_' + Date.now(), name: '', quantity: '', unitPrice: '', lineTotal: 0 }];
      }
      return prev.filter(r => r.id !== id);
    });
  };

  // Quick Add Product Modal Handlers
  const handleOpenAddProductModal = (presetName?: string, rowId?: string) => {
    setNewProdName(presetName || '');
    setNewProdCategory('সাধারণ মালামাল');
    setNewProdPurchasePrice('');
    setNewProdSalePrice('');
    setNewProdStock('0');
    setNewProdError('');
    setTargetRowIdForNewProd(rowId || null);
    setShowNewProdModal(true);
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

    if (purchase < 0 || sale < 0 || stock < 0) {
      setNewProdError('মূল্য বা স্টক ঋণাত্মক হতে পারে না!');
      return;
    }

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

    // If there is a target row, select this product into it
    if (targetRowIdForNewProd) {
      handleSelectProductForRow(targetRowIdForNewProd, createdProd);
    } else {
      handleAddItemRow(createdProd);
    }

    setShowNewProdModal(false);
  };

  // Save Supplier Bill and automatically update stock in "প্রোডাক্ট ও স্টক ব্যবস্থাপনা"
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();

    if (!memoNo.trim()) {
      setMemoError('মেমো নং দেওয়া বাধ্যতামূলক!');
      billMemoRef.current?.focus();
      return;
    }
    setMemoError('');

    if (!selectedSupplier) {
      alert('সাপ্লায়ার সিলেক্ট করুন!');
      return;
    }

    const finalBillAmount = effectiveTotalAmount > 0 ? effectiveTotalAmount : totalItemsAmount;
    if (finalBillAmount <= 0) {
      alert('মালের পরিমাণ ও টাকার পরিমাণ লিখুন!');
      return;
    }

    // 1. Process items & automatically update stock in "প্রোডাক্ট ও স্টক ব্যবস্থাপনা"
    const itemSummaries: string[] = [];
    const billItems: SupplierBillItem[] = [];
    let updatedProductsCount = 0;
    let totalPurchasedKg = 0;

    purchaseItems.forEach(item => {
      const nameTrimmed = item.name.trim();
      const qty = toEnglishNumber(item.quantity) || 0;
      const rate = toEnglishNumber(item.unitPrice) || 0;

      if (nameTrimmed || qty > 0) {
        totalPurchasedKg += qty;

        // Check if product exists in catalog
        const existing = products.find(p => 
          (item.productId && p.id === item.productId) || 
          p.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
        );

        let finalProductId = existing?.id;

        if (existing) {
          const curStock = Number(existing.stock) || 0;
          const newStock = curStock + qty;
          updateProduct(existing.id, {
            stock: newStock,
            purchasePrice: rate > 0 ? rate : existing.purchasePrice
          });
          updatedProductsCount++;
        } else if (nameTrimmed) {
          // Product not in catalog yet - auto save to catalog & stock management!
          finalProductId = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const newProd: ProductCatalogItem = {
            id: finalProductId,
            code: `P-${String(products.length + 1).padStart(3, '0')}`,
            name: nameTrimmed,
            category: 'সাধারণ মালামাল',
            purchasePrice: rate,
            salePrice: rate > 0 ? Math.round(rate * 1.15) : 0,
            stock: qty,
            unit: 'KG',
            createdAt: new Date().toISOString()
          };
          addProduct(newProd);
          updatedProductsCount++;
        }

        billItems.push({
          id: item.id,
          productId: finalProductId,
          name: nameTrimmed,
          quantity: qty,
          unitPrice: rate,
          lineTotal: Math.round(qty * rate)
        });

        if (nameTrimmed) {
          itemSummaries.push(`${nameTrimmed} (${toBengaliNumber(qty)} KG @ ${toBengaliNumber(rate)} ৳)`);
        }
      }
    });

    const finalDescription = itemSummaries.length > 0 
      ? itemSummaries.join(', ') + (itemsExtraNote.trim() ? ` [নোট: ${itemsExtraNote.trim()}]` : '')
      : (itemsExtraNote.trim() || 'ইলেকট্রিক মালামাল ক্রয়');

    const billNo = memoNo.trim();

    addSupplierBill({
      billNo,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      companyName: selectedSupplier.companyName,
      date: selectedDate,
      itemsDescription: finalDescription,
      items: billItems,
      totalAmount: finalBillAmount,
      cashPaid: toEnglishNumber(cashPaid.toString()) || 0,
      onlinePaid: toEnglishNumber(onlinePaid.toString()) || 0,
      dueAmount: Math.max(0, finalBillAmount - ((toEnglishNumber(cashPaid.toString()) || 0) + (toEnglishNumber(onlinePaid.toString()) || 0))),
      notes: billNotes
    });

    setSuccessMsg(
      `সাপ্লায়ার ${selectedSupplier.companyName} এর মেমো #${billNo} সফলভাবে সেভ হয়েছে এবং প্রোডাক্ট ও স্টক ব্যবস্থাপনায় ${toBengaliNumber(totalPurchasedKg)} কেজি স্টক স্বয়ংক্রিয়ভাবে যোগ করা হয়েছে!`
    );
    setTimeout(() => setSuccessMsg(''), 6000);

    // Reset Form
    setMemoNo('');
    setMemoError('');
    setSelectedSupplierId('');
    setPurchaseItems([{ id: 'pitem_' + Date.now(), name: '', quantity: '', unitPrice: '', lineTotal: 0 }]);
    setItemsExtraNote('');
    setShowExtraNoteInput(false);
    setTotalAmount('');
    setCashPaid('');
    setOnlinePaid('');
    setBillNotes('');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaySupplier) {
      alert('সাপ্লায়ার সিলেক্ট করুন!');
      return;
    }
    if (!payAmount || toEnglishNumber(payAmount.toString()) <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন!');
      return;
    }

    addSupplierPayment({
      supplierId: selectedPaySupplier.id,
      supplierName: `${selectedPaySupplier.name} (${selectedPaySupplier.companyName})`,
      date: selectedDate,
      amount: toEnglishNumber(payAmount.toString()),
      paymentMethod: payMethod,
      notes: payNotes
    });

    setSuccessMsg(`মহাজন ${selectedPaySupplier.name}-কে ${payAmount} ৳ পরিশোধ রেকর্ড করা হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 5000);

    setPaySupplierId('');
    setPayAmount('');
    setPayNotes('');
  };

  // Filtered Bills and Payments for History tab
  const filteredBills = useMemo(() => {
    return supplierBills.filter(b => {
      const q = historySearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (b.billNo || '').toLowerCase().includes(q) ||
        (b.companyName || '').toLowerCase().includes(q) ||
        (b.supplierName || '').toLowerCase().includes(q) ||
        (b.itemsDescription || '').toLowerCase().includes(q) ||
        (b.date || '').includes(q)
      );
    });
  }, [supplierBills, historySearchQuery]);

  const filteredPayments = useMemo(() => {
    return supplierPayments.filter(p => {
      const q = historySearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (p.receiptNo || '').toLowerCase().includes(q) ||
        (p.supplierName || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.date || '').includes(q)
      );
    });
  }, [supplierPayments, historySearchQuery]);

  // Print Supplier Purchase Bill
  const handlePrintSupplierBill = (bill: SupplierBill) => {
    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const sup = suppliers.find(s => s.id === bill.supplierId);
    const companyName = bill.companyName || (sup ? sup.companyName : 'সাপ্লায়ার');
    const ownerName = bill.supplierName || (sup ? sup.name : '-');
    const phone = (sup && sup.phone) ? sup.phone : '-';
    const address = (sup && sup.address) ? sup.address : '-';
    const currentPayable = sup ? sup.currentPayable : 0;
    const billItems = extractSupplierBillItems(bill);
    const totalBillKg = billItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>মাল ক্রয় চালান - মেমো #${bill.billNo} - ${companyName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { 
            font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; 
            margin: 0; 
            padding: 15px; 
            color: #1e293b; 
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            margin-bottom: 12px;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
          }
          .btn-print {
            background: #7c3aed;
            color: #fff;
            border: none;
            padding: 7px 14px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
          }
          .btn-close {
            background: #64748b;
            color: #fff;
            border: none;
            padding: 7px 14px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
          }
          .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; margin-bottom: 12px; }
          .shop-name { font-size: 22px; font-weight: 900; color: #581c87; margin: 0; }
          .shop-sub { font-size: 11.5px; color: #475569; margin: 2px 0; }
          .doc-title { 
            display: inline-block; 
            background: #7c3aed; 
            color: #fff; 
            padding: 3px 14px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 700; 
            margin-top: 4px; 
          }
          .info-box {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
            font-size: 12px;
            line-height: 1.5;
          }
          .table-title { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
          th { background: #f3e8ff; color: #4c1d95; padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; }
          td { padding: 7px 8px; border: 1px solid #cbd5e1; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .calc-table { width: 60%; margin-left: auto; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          .calc-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
          .calc-label { background: #f8fafc; font-weight: 600; width: 60%; }
          .calc-val { text-align: right; font-weight: 700; }
          .due-highlight { color: #dc2626; font-weight: 800; font-size: 13px; background: #fef2f2; }
          .footer { margin-top: 45px; display: flex; justify-content: space-between; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 170px; text-align: center; font-size: 10.5px; color: #475569; padding-top: 4px; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ প্রিন্ট করুন (Print)</button>
          <button class="btn-close" onclick="window.close()">✕ বন্ধ করুন</button>
        </div>

        <div class="header">
          <h1 class="shop-name">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483, 01720640137</p>
          <div class="doc-title">মাল ক্রয় ভাউচার / বিল চালান (Supplier Purchase Invoice)</div>
        </div>

        <div class="info-box">
          <div>
            <strong>প্রতিষ্ঠানের নাম:</strong> ${companyName}<br>
            <strong>মালিক / প্রতিনিধি:</strong> ${ownerName}<br>
            <strong>মোবাইল:</strong> ${phone} | <strong>ঠিকানা:</strong> ${address}
          </div>
          <div style="text-align: right;">
            <strong>মেমো নং:</strong> <span style="font-size: 13px; font-weight: 800; color: #6d28d9;">#${bill.billNo}</span><br>
            <strong>ক্রয়ের তারিখ:</strong> ${toBengaliNumber(formatDate(bill.date))}<br>
            <strong>প্রস্তুতকারক:</strong> ${bill.createdBy || 'অ্যাডমিন'}
          </div>
        </div>

        <div class="table-title">ক্রয়কৃত মালামাল ও ওজনের বিবরণ:</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">নং</th>
              <th>পণ্য / মালামালের বিবরণ</th>
              <th style="width: 100px;" class="text-center">পরিমাণ (ওজন)</th>
              <th style="width: 100px;" class="text-right">দর (৳)</th>
              <th style="width: 120px;" class="text-right">মোট টাকা</th>
            </tr>
          </thead>
          <tbody>
            ${billItems.length === 0 ? `
              <tr>
                <td class="text-center">১</td>
                <td>${bill.itemsDescription || 'ইলেকট্রিক মালামাল ক্রয়'}</td>
                <td class="text-center">-</td>
                <td class="text-right">-</td>
                <td class="text-right" style="font-weight: 700;">${toBengaliNumber(bill.totalAmount)} ৳</td>
              </tr>
            ` : billItems.map((it, idx) => `
              <tr>
                <td class="text-center">${toBengaliNumber(idx + 1)}</td>
                <td style="font-weight: 600;">${it.name || 'পণ্য'}</td>
                <td class="text-center" style="font-weight: 700; color: #6d28d9;">${Number(it.quantity) > 0 ? `${toBengaliNumber(it.quantity)} কেজি` : '-'}</td>
                <td class="text-right">${Number(it.unitPrice) > 0 ? `${toBengaliNumber(it.unitPrice)} ৳` : '-'}</td>
                <td class="text-right" style="font-weight: 700;">${Number(it.lineTotal) > 0 ? `${toBengaliNumber(it.lineTotal)} ৳` : '-'}</td>
              </tr>
            `).join('')}
            <tr style="background: #faf5ff; font-weight: 800; border-top: 2px solid #7c3aed;">
              <td colspan="2" class="text-right"><strong>মোট ক্রয়কৃত ওজন / পরিমাণ:</strong></td>
              <td class="text-center" style="color: #6d28d9; font-size: 13px;"><strong>${totalBillKg > 0 ? `${toBengaliNumber(totalBillKg)} কেজি` : '-'}</strong></td>
              <td class="text-right"><strong>মোট বিল:</strong></td>
              <td class="text-right" style="color: #581c87; font-size: 13px;"><strong>${toBengaliNumber(bill.totalAmount)} ৳</strong></td>
            </tr>
          </tbody>
        </table>

        ${bill.notes ? `
          <div style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 6px; padding: 7px 10px; margin-bottom: 12px; font-size: 11.5px;">
            <strong>নোট / বিশেষ বিবরণ:</strong> ${bill.notes}
          </div>
        ` : ''}

        <table class="calc-table">
          <tbody>
            <tr>
              <td class="calc-label">মোট বিলের টাকা (Total Bill)</td>
              <td class="calc-val">${toBengaliNumber(bill.totalAmount)} ৳</td>
            </tr>
            <tr style="background: #faf5ff;">
              <td class="calc-label" style="font-weight: 700; color: #6d28d9;">মোট মালের ওজন (কেজি)</td>
              <td class="calc-val" style="color: #6d28d9; font-weight: 800;">${totalBillKg > 0 ? `${toBengaliNumber(totalBillKg)} কেজি` : '-'}</td>
            </tr>
            <tr>
              <td class="calc-label">নগদ পরিশোধ (Cash Paid)</td>
              <td class="calc-val" style="color: #047857;">${toBengaliNumber(bill.cashPaid || 0)} ৳</td>
            </tr>
            <tr>
              <td class="calc-label">অনলাইন / ব্যাংক পরিশোধ (Online Paid)</td>
              <td class="calc-val" style="color: #0284c7;">${toBengaliNumber(bill.onlinePaid || 0)} ৳</td>
            </tr>
            <tr style="background: #f5f3ff;">
              <td class="calc-label" style="font-weight: 700; color: #4338ca;">সর্বমোট পরিশোধ (Total Paid)</td>
              <td class="calc-val" style="color: #4338ca;">${toBengaliNumber((bill.cashPaid || 0) + (bill.onlinePaid || 0))} ৳</td>
            </tr>
            <tr class="due-highlight">
              <td class="calc-label" style="color: #b91c1c; font-weight: 800;">এই বিলে অবশিষ্ট বকেয়া (Due Amount)</td>
              <td class="calc-val">${toBengaliNumber(bill.dueAmount || 0)} ৳</td>
            </tr>
            ${sup ? `
              <tr>
                <td class="calc-label">মহাজনের বর্তমান সর্বমোট পাওনা</td>
                <td class="calc-val" style="font-weight: 800; color: #6d28d9;">${toBengaliNumber(currentPayable)} ৳</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-line">হিসাবরক্ষক / প্রস্তুতকারক</div>
          <div class="sig-line">সাপ্লায়ার / মহাজন স্বাক্ষর</div>
          <div class="sig-line">স্বত্বাধিকারী / কর্তৃপক্ষ</div>
        </div>

        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 20px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Start Edit Bill
  const handleStartEditBill = (bill: SupplierBill) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো বিল এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingBill(bill);
    setEditMemoNo(bill.billNo);
    setEditDate(bill.date);
    setEditSupplierId(bill.supplierId);
    setEditItemsDescription(bill.itemsDescription || '');
    setEditTotalAmount(String(bill.totalAmount));
    setEditCashPaid(String(bill.cashPaid || ''));
    setEditOnlinePaid(String(bill.onlinePaid || ''));
    setEditNotes(bill.notes || '');

    const currentItems = getBillItems(bill, products);
    setEditPurchaseItems(
      currentItems.length > 0 
        ? currentItems.map((it, idx) => ({
            id: it.id || ('edit_pitem_' + idx + '_' + Date.now()),
            productId: it.productId,
            name: it.name,
            quantity: it.quantity > 0 ? String(it.quantity) : '',
            unitPrice: it.unitPrice > 0 ? String(it.unitPrice) : '',
            lineTotal: it.lineTotal || Math.round(it.quantity * it.unitPrice)
          }))
        : [{ id: 'edit_pitem_' + Date.now(), name: '', quantity: '', unitPrice: '', lineTotal: 0 }]
    );

    if (viewingBill) setViewingBill(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Edit Bill with automatic stock +/- adjustment
  const handleSaveEditBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;

    const newTotal = toEnglishNumber(editTotalAmount);
    const newCash = toEnglishNumber(editCashPaid);
    const newOnline = toEnglishNumber(editOnlinePaid);
    const newDue = Math.max(0, newTotal - (newCash + newOnline));

    if (!editMemoNo.trim()) {
      alert('মেমো নং লিখুন!');
      return;
    }
    if (!editSupplierId) {
      alert('সাপ্লায়ার নির্বাচন করুন!');
      return;
    }
    if (newTotal <= 0) {
      alert('সঠিক মোট বিলের টাকা লিখুন!');
      return;
    }

    const newSup = suppliers.find(s => s.id === editSupplierId);
    if (!newSup) return;

    const finalBillItems: SupplierBillItem[] = [];
    const itemSummaries: string[] = [];

    editPurchaseItems.forEach(it => {
      const nameTrimmed = it.name.trim();
      const qty = toEnglishNumber(it.quantity) || 0;
      const rate = toEnglishNumber(it.unitPrice) || 0;

      if (nameTrimmed || qty > 0) {
        finalBillItems.push({
          id: it.id,
          productId: it.productId,
          name: nameTrimmed,
          quantity: qty,
          unitPrice: rate,
          lineTotal: Math.round(qty * rate)
        });

        if (nameTrimmed) {
          itemSummaries.push(`${nameTrimmed} (${toBengaliNumber(qty)} KG @ ${toBengaliNumber(rate)} ৳)`);
        }
      }
    });

    const finalDescription = itemSummaries.length > 0 
      ? itemSummaries.join(', ') + (editNotes.trim() ? ` [নোট: ${editNotes.trim()}]` : '')
      : (editItemsDescription.trim() || 'ইলেকট্রিক মালামাল ক্রয়');

    updateSupplierBill(
      editingBill.id,
      {
        billNo: editMemoNo.trim(),
        date: editDate || editingBill.date,
        supplierId: newSup.id,
        supplierName: newSup.name,
        companyName: newSup.companyName,
        itemsDescription: finalDescription,
        items: finalBillItems,
        totalAmount: newTotal,
        cashPaid: newCash,
        onlinePaid: newOnline,
        dueAmount: newDue,
        notes: editNotes.trim()
      },
      finalBillItems
    );

    setEditingBill(null);
    setSuccessMsg(`বিল #${editMemoNo} সফলভাবে আপডেট হয়েছে এবং স্টকে স্বয়ংক্রিয়ভাবে (+/-) সমন্বয় করা হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Delete Bill with automatic stock deduction (-)
  const handleDeleteBill = (bill: SupplierBill) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো বিল ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const billItems = getBillItems(bill, products);
    const totalDeductedKg = billItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

    confirmAction({
      title: 'মাল ক্রয় বিল মুছে ফেলা',
      message: `আপনি কি নিশ্চিত মেমো নং #${bill.billNo} (${bill.companyName || bill.supplierName}) মুছে ফেলতে চান? এটি রিসাইকেল বিনে চলে যাবে এবং ক্রয়কৃত মালামাল (${totalDeductedKg > 0 ? toBengaliNumber(totalDeductedKg) + ' কেজি ' : ''})স্টক থেকে স্বয়ংক্রিয়ভাবে মাইনাস (-) হয়ে যাবে।`,
      confirmLabel: 'হ্যাঁ, বিল মুছুন',
      onConfirm: () => {
        deleteSupplierBill(bill);

        if (viewingBill && viewingBill.id === bill.id) {
          setViewingBill(null);
        }
        setSuccessMsg(
          totalDeductedKg > 0 
            ? `বিল নং #${bill.billNo} মুছে ফেলা হয়েছে এবং স্টক থেকে ${toBengaliNumber(totalDeductedKg)} কেজি পণ্য মাইনাস (-) করা হয়েছে!`
            : `বিল নং #${bill.billNo} রিসাইকেল বিনে পাঠানো হয়েছে ও স্টক সমন্বয় করা হয়েছে!`
        );
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    });
  };

  // Print Supplier Payment Voucher
  const handlePrintSupplierPayment = (pay: SupplierPaymentRecord) => {
    const printWindow = window.open('', '_blank', 'width=750,height=600');
    if (!printWindow) {
      window.print();
      return;
    }
    const sup = suppliers.find(s => s.id === pay.supplierId);
    const company = sup ? sup.companyName : pay.supplierName;
    const name = sup ? sup.name : '-';
    const phone = sup ? sup.phone : '-';

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>মহাজন পরিশোধ রসিদ - ${company}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A5 landscape; margin: 10mm; }
          body { 
            font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; 
            margin: 0; padding: 15px; color: #1e293b; background: #fff;
          }
          .no-print { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 10px; }
          .btn-print { background: #7c3aed; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
          .btn-close { background: #64748b; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; cursor: pointer; }
          .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 6px; margin-bottom: 10px; }
          .shop-name { font-size: 20px; font-weight: 900; color: #581c87; margin: 0; }
          .shop-sub { font-size: 11px; color: #475569; margin: 2px 0; }
          .doc-title { display: inline-block; background: #059669; color: #fff; padding: 2px 12px; border-radius: 15px; font-size: 11px; font-weight: 700; margin-top: 4px; }
          .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; line-height: 1.6; }
          .amount-box { background: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 14px; }
          .amount-val { font-size: 22px; font-weight: 900; color: #065f46; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 140px; text-align: center; font-size: 10px; color: #475569; padding-top: 4px; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ প্রিন্ট করুন</button>
          <button class="btn-close" onclick="window.close()">✕ বন্ধ করুন</button>
        </div>
        <div class="header">
          <h1 class="shop-name">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</h1>
          <p class="shop-sub">১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483</p>
          <div class="doc-title">মহাজন দেনা পরিশোধ ভাউচার (Payment Voucher)</div>
        </div>
        <div class="box">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <strong>সাপ্লায়ার / প্রতিষ্ঠান:</strong> ${company}<br>
              <strong>মালিক / প্রতিনিধি:</strong> ${name}<br>
              <strong>মোবাইল:</strong> ${phone}
            </div>
            <div style="text-align: right;">
              <strong>ভাউচার নং:</strong> ${pay.receiptNo || 'রশিদ'}<br>
              <strong>তারিখ:</strong> ${toBengaliNumber(formatDate(pay.date))}<br>
              <strong>মাধ্যম:</strong> ${pay.paymentMethod === 'online' ? 'অনলাইন / ব্যাংক ট্রান্সফার' : 'নগদ ক্যাশ'}
            </div>
          </div>
        </div>
        <div class="amount-box">
          <span style="font-size: 11.5px; font-weight: 700; color: #047857; display: block;">পরিশোধিত টাকার পরিমাণ:</span>
          <span class="amount-val">${toBengaliNumber(pay.amount)} ৳</span>
        </div>
        ${pay.notes ? `<div style="font-size: 11.5px; margin-bottom: 10px;"><strong>নোট:</strong> ${pay.notes}</div>` : ''}
        ${sup ? `<div style="font-size: 11.5px; color: #64748b; text-align: right;">পরিশোধের পর মহাজনের অবশিষ্ট পাওনা: <strong>${toBengaliNumber(sup.currentPayable)} ৳</strong></div>` : ''}
        <div class="footer">
          <div class="sig-line">আদায়কারী / হিসাবরক্ষক</div>
          <div class="sig-line">মহাজন / প্রাপকের স্বাক্ষর</div>
          <div class="sig-line">কর্তৃপক্ষ স্বাক্ষর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 18px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Start Edit Payment
  const handleStartEditPayment = (pay: SupplierPaymentRecord) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো রসিদ এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingPayment(pay);
    setEditPaySupplierId(pay.supplierId);
    setEditPayDate(pay.date);
    setEditPayAmount(String(pay.amount));
    setEditPayMethod(pay.paymentMethod);
    setEditPayNotes(pay.notes || '');
    if (viewingPayment) setViewingPayment(null);
  };

  // Save Edit Payment
  const handleSaveEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const newAmount = toEnglishNumber(editPayAmount);
    if (newAmount <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন!');
      return;
    }
    const sup = suppliers.find(s => s.id === editPaySupplierId);
    if (!sup) return;

    setSuppliers(prev => prev.map(s => {
      if (s.id === editingPayment.supplierId && editingPayment.supplierId === editPaySupplierId) {
        const diffAmount = newAmount - editingPayment.amount;
        return {
          ...s,
          totalPaid: Math.max(0, (s.totalPaid || 0) + diffAmount),
          currentPayable: Math.max(0, (s.currentPayable || 0) - diffAmount)
        };
      }
      if (s.id === editingPayment.supplierId && editingPayment.supplierId !== editPaySupplierId) {
        return {
          ...s,
          totalPaid: Math.max(0, (s.totalPaid || 0) - editingPayment.amount),
          currentPayable: (s.currentPayable || 0) + editingPayment.amount
        };
      }
      if (s.id === editPaySupplierId && editingPayment.supplierId !== editPaySupplierId) {
        return {
          ...s,
          totalPaid: (s.totalPaid || 0) + newAmount,
          currentPayable: Math.max(0, (s.currentPayable || 0) - newAmount)
        };
      }
      return s;
    }));

    const updatedPayment: SupplierPaymentRecord = {
      ...editingPayment,
      supplierId: sup.id,
      supplierName: `${sup.name} (${sup.companyName})`,
      date: editPayDate || editingPayment.date,
      amount: newAmount,
      paymentMethod: editPayMethod,
      notes: editPayNotes.trim()
    };

    setSupplierPayments(prev => prev.map(p => p.id === editingPayment.id ? updatedPayment : p));
    setEditingPayment(null);
    setSuccessMsg(`পরিশোধ রসিদ সফলভাবে আপডেট করা হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Delete Payment
  const handleDeletePayment = (pay: SupplierPaymentRecord) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো পরিশোধ রসিদ ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'পরিশোধ রসিদ মুছে ফেলা',
      message: `আপনি কি নিশ্চিত এই পরিশোধ রসিদটি (${toBengaliNumber(pay.amount)} ৳) মুছে ফেলতে চান? এটি রিসাইকেল বিনে চলে যাবে এবং মহাজনের বকেয়া আবার যোগ হবে।`,
      confirmLabel: 'হ্যাঁ, মুছুন',
      onConfirm: () => {
        moveToRecycleBin('due_payment', `সাপ্লায়ার দেনা পরিশোধ (${pay.supplierName})`, pay, pay.amount);

        setSuppliers(prev => prev.map(s => {
          if (s.id === pay.supplierId) {
            return {
              ...s,
              totalPaid: Math.max(0, (s.totalPaid || 0) - pay.amount),
              currentPayable: (s.currentPayable || 0) + pay.amount
            };
          }
          return s;
        }));

        setSupplierPayments(prev => prev.filter(p => p.id !== pay.id));
        if (viewingPayment && viewingPayment.id === pay.id) {
          setViewingPayment(null);
        }
        setSuccessMsg(`পরিশোধ রসিদটি মুছে ফেলা হয়েছে!`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-purple-600" />
            <span>মাল ক্রয় ও মহাজন বিল (Supplier Purchase & Payment)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            তারিখ: <span className="font-bold text-indigo-700">{toBengaliNumber(formatDate(selectedDate))}</span>
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-bold items-center gap-1 flex-wrap">
          {editingBill ? (
            <>
              <span className="px-3 py-1.5 rounded-md bg-amber-500 text-white shadow-xs flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5" />
                <span>ক্রয় বিল এডিট পেজ (মেমো #{editingBill.billNo})</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="px-3 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-300 transition cursor-pointer flex items-center gap-1"
                title="এডিট বাতিল করে ফিরে যান"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>বাতিল করে ফিরে যান</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveSubTab('bill_entry')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeSubTab === 'bill_entry' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + নতুন মাল ক্রয় বিল
              </button>
              <button
                onClick={() => setActiveSubTab('payment_entry')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeSubTab === 'payment_entry' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + মহাজন দেনা পরিশোধ
              </button>
              <button
                onClick={() => setActiveSubTab('history')}
                className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeSubTab === 'history' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ক্রয় ও পেমেন্ট হিস্ট্রি
              </button>
            </>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Edit Purchase Bill Page View (When an admin edits a bill) */}
      {editingBill ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in space-y-0">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-purple-700 to-indigo-800 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
                <Edit className="w-6 h-6 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold">ক্রয় বিল তথ্য সংশোধন ও এডিট পেজ</h3>
                  <span className="bg-amber-400 text-slate-900 text-xs font-extrabold px-2.5 py-0.5 rounded font-mono shadow-xs">
                    মেমো #{editingBill.billNo}
                  </span>
                </div>
                <p className="text-xs text-purple-100 mt-0.5">
                  সাপ্লায়ার: <strong className="text-white">{editingBill.companyName || editingBill.supplierName}</strong> | ক্রয়ের তারিখ: {toBengaliNumber(formatDate(editingBill.date))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ফিরে যান / বাতিল</span>
              </button>
            </div>
          </div>

          {/* Stock auto-sync notice */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>স্টক অটো-সমন্বয়:</strong> মালামালের পরিমাণ বাড়ালে বা কমালে প্রোডাক্ট ক্যাটালগ ও স্টকে স্বয়ংক্রিয়ভাবে (+ / -) সমন্বয় হবে।
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] bg-amber-200/70 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
              অ্যাডমিন মোড
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveEditBill} onKeyDown={handleBillFormKeyDown} className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2 Cols): Meta & Items */}
              <div className="lg:col-span-2 space-y-5">
                {/* Meta Inputs: Memo, Date, Supplier */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      মেমো নং <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editMemoNo}
                      onChange={(e) => setEditMemoNo(normalizeInputDigits(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold font-mono focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ক্রয়ের তারিখ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      সাপ্লায়ার / মহাজন <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editSupplierId}
                      onChange={(e) => setEditSupplierId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      {mappedSuppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.companyName} - {s.name} (বর্তমান দেনা: {toBengaliNumber(s.currentPayable)} ৳)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items & Stock Section */}
                <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <span>ক্রয়কৃত মালামাল ও স্টক বিবরণী</span>
                    </label>
                    <span className="text-[11px] text-purple-700 bg-purple-100 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                      মোট আইটেম: {toBengaliNumber(editPurchaseItems.length)} টি
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {editPurchaseItems.map((item, idx) => {
                      const matchingProd = products.find(p => 
                        (item.productId && p.id === item.productId) || 
                        p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                      );
                      return (
                        <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            <div className="sm:col-span-5">
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                পণ্য #{toBengaliNumber(idx + 1)}
                              </label>
                              <ProductSearchSelect
                                products={products}
                                selectedProductId={item.productId}
                                priceType="purchase"
                                placeholder="পণ্য সিলেক্ট বা লিখুন..."
                                onSelect={(prod) => handleEditSelectProductForRow(item.id, prod)}
                                onAddNew={(presetName) => {
                                  handleEditItemChange(item.id, 'name', presetName || '');
                                }}
                              />
                              {matchingProd && (
                                <div className="text-[10.5px] text-emerald-700 font-medium mt-1">
                                  বর্তমান ক্যাটালগ স্টক: <strong>{toBengaliNumber(matchingProd.stock)} {matchingProd.unit || 'KG'}</strong>
                                </div>
                              )}
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                পরিমাণ (কেজি / ওজন)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) => handleEditItemChange(item.id, 'quantity', e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                দর / রেট (৳)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.unitPrice}
                                onChange={(e) => handleEditItemChange(item.id, 'unitPrice', e.target.value)}
                                placeholder="0"
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div className="sm:col-span-1 flex items-center justify-end pt-2 sm:pt-4">
                              <button
                                type="button"
                                onClick={() => handleEditRemoveItemRow(item.id)}
                                title="আইটেম মুছুন"
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 text-slate-600">
                            <span>আইটেম মোট মূল্য:</span>
                            <span className="font-extrabold text-sm text-purple-900">
                              {toBengaliNumber(item.lineTotal || 0)} ৳
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditAddItemRow()}
                    className="w-full py-2.5 border-2 border-dashed border-purple-300 text-purple-700 bg-white hover:bg-purple-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>আরেকটি পণ্য যোগ করুন</span>
                  </button>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">অতিরিক্ত নোট / বিবরণ</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="বিল সংক্রান্ত কোনো মন্তব্য থাকলে লিখুন..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Right Column (1 Col): Financial Breakdown & Action Buttons */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-purple-600" />
                    <span>হিসাব ও পরিশোধের বিবরণ</span>
                  </h4>

                  {/* Total Bill Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      মোট বিলের টাকা (৳) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={editTotalAmount}
                      onChange={(e) => setEditTotalAmount(normalizeNumericInput(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      আইটেম যোগ/পরিবর্তন করলে অটো আপডেট হয়
                    </span>
                  </div>

                  {/* Cash Paid */}
                  <div>
                    <label className="text-xs font-bold text-emerald-700 block mb-1">নগদ ক্যাশ পরিশোধ (৳)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editCashPaid}
                      onChange={(e) => setEditCashPaid(normalizeNumericInput(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Online Paid */}
                  <div>
                    <label className="text-xs font-bold text-blue-700 block mb-1">অনলাইন / ব্যাংক পরিশোধ (৳)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editOnlinePaid}
                      onChange={(e) => setEditOnlinePaid(normalizeNumericInput(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs font-bold text-blue-800 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Total Paid Display */}
                  <div className="flex justify-between items-center text-xs py-2 border-t border-slate-200 text-slate-600">
                    <span className="font-semibold">সর্বমোট পরিশোধ:</span>
                    <span className="font-bold text-slate-900">
                      {toBengaliNumber((toEnglishNumber(editCashPaid) || 0) + (toEnglishNumber(editOnlinePaid) || 0))} ৳
                    </span>
                  </div>

                  {/* Due Amount Highlight */}
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-rose-800 block">সংশোধিত বকেয়া (Due):</span>
                      <span className="text-[10px] text-rose-500">এই বিলে অবশিষ্ট পাওনা</span>
                    </div>
                    <span className="font-black text-base text-rose-700">
                      {toBengaliNumber(Math.max(0, (toEnglishNumber(editTotalAmount) || 0) - ((toEnglishNumber(editCashPaid) || 0) + (toEnglishNumber(editOnlinePaid) || 0))))} ৳
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>বিল আপডেট ও স্টক সমন্বয় সংরক্ষণ করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingBill(null)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      বাতিল করে ফিরে যান
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Tab 1: New Purchase Bill */}
          {activeSubTab === 'bill_entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-2">
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-600" />
                <span>সাপ্লায়ার বিল ভাউচার ও স্টক এন্ট্রি</span>
              </h3>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                ক্রয়কৃত পণ্য স্বয়ংক্রিয়ভাবে স্টকে জমা হবে
              </span>
            </div>

            <form onSubmit={handleSaveBill} onKeyDown={handleBillFormKeyDown} className="space-y-5">
              {/* Row 1: Memo No, Supplier selection & Total Bill Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>মেমো নং</span>
                      <span className="text-rose-500 font-extrabold text-sm">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      বাধ্যতামূলক
                    </span>
                  </div>
                  <input
                    ref={billMemoRef}
                    type="text"
                    required
                    placeholder="মেমো নং লিখুন (যেমন: ৫৪২০)"
                    value={memoNo}
                    onChange={(e) => {
                      setMemoNo(normalizeInputDigits(e.target.value));
                      if (memoError) setMemoError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billSupplierSelectRef.current?.focus();
                      }
                    }}
                    className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-bold font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 shadow-2xs transition ${
                      memoError 
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30 ring-1 ring-rose-300' 
                        : 'border-slate-300 focus:ring-purple-500'
                    }`}
                  />
                  {memoError && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{memoError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    সাপ্লায়ার / মহাজন সিলেক্ট করুন <span className="text-rose-500">*</span>
                  </label>
                  <select
                    ref={billSupplierSelectRef}
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billTotalAmountRef.current?.focus();
                        billTotalAmountRef.current?.select?.();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    required
                  >
                    <option value="">-- সাপ্লায়ার নির্বাচন করুন --</option>
                    {mappedSuppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} - {s.name} (পূর্বের দেনা: {toBengaliNumber(s.currentPayable)} ৳)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      মোট বিলের পরিমাণ (৳) <span className="text-rose-500">*</span>
                    </label>
                    {totalItemsAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setTotalAmount(String(totalItemsAmount))}
                        className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                      >
                        আইটেম দর সিঙ্ক করুন ({toBengaliNumber(totalItemsAmount)} ৳)
                      </button>
                    )}
                  </div>
                  <input
                    ref={billTotalAmountRef}
                    type="text" 
                    inputMode="decimal"
                    min="1"
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(normalizeNumericInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const firstQty = document.getElementById('purchase_qty_0');
                        if (firstQty) {
                          firstQty.focus();
                        } else {
                          billCashPaidRef.current?.focus();
                        }
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-purple-700 focus:bg-white focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Structured Purchase Items Table (মালের বিবরণ / আইটেম সমূহ) */}
              <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/30 border border-purple-200 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-purple-600" />
                      <span>মালের বিবরণ / আইটেম সমূহ (ওজন ও দর এন্ট্রি)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      পণ্য সার্চ করে বাছাই করুন এবং কত কেজি ক্রয় করেছেন তা লিখুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenAddProductModal()}
                    className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ নতুন পণ্য যুক্ত করুন</span>
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-2.5">
                  {purchaseItems.map((item, idx) => {
                    const matchingProd = products.find(p => p.id === item.productId || p.name === item.name);
                    return (
                      <div 
                        key={item.id} 
                        className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-2.5 hover:border-purple-300 transition"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                          
                          {/* Col 1: Product Selector */}
                          <div className="md:col-span-5">
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                              পণ্য #{toBengaliNumber(idx + 1)}
                            </label>
                            <ProductSearchSelect
                              products={products}
                              selectedProductId={item.productId}
                              priceType="purchase"
                              placeholder="পণ্য সার্চ করুন বা বাছাই করুন..."
                              onSelect={(prod) => handleSelectProductForRow(item.id, prod)}
                              onAddNew={(presetName) => handleOpenAddProductModal(presetName, item.id)}
                            />
                            {matchingProd && (
                              <div className="flex items-center gap-2 mt-1 text-[10.5px]">
                                <span className="text-emerald-700 font-semibold">
                                  বর্তমান মজুদ: <strong>{toBengaliNumber(matchingProd.stock || 0)} KG</strong>
                                </span>
                                {matchingProd.purchasePrice && (
                                  <span className="text-slate-500">
                                    • পূর্বের ক্রয় দর: {toBengaliNumber(matchingProd.purchasePrice)} ৳
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Col 2: Quantity in KG */}
                          <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              ক্রয়কৃত ওজন (KG) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                id={`purchase_qty_${idx}`}
                                type="text"
                                inputMode="decimal"
                                placeholder="যেমন: ৫০"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.getElementById(`purchase_rate_${idx}`)?.focus();
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-9 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 shadow-2xs"
                              />
                              <span className="absolute right-2.5 top-1.5 text-[11px] font-bold text-slate-400">
                                KG
                              </span>
                            </div>
                          </div>

                          {/* Col 3: Unit Purchase Rate (৳/KG) */}
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              দর (৳/কেজি)
                            </label>
                            <div className="relative">
                              <input
                                id={`purchase_rate_${idx}`}
                                type="text"
                                inputMode="decimal"
                                placeholder="০"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const nextQty = document.getElementById(`purchase_qty_${idx + 1}`);
                                    if (nextQty) {
                                      nextQty.focus();
                                    } else {
                                      billCashPaidRef.current?.focus();
                                    }
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-6 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 shadow-2xs"
                              />
                              <span className="absolute right-2.5 top-1.5 text-[11px] font-bold text-slate-400">
                                ৳
                              </span>
                            </div>
                          </div>

                          {/* Col 4: Line Total & Delete */}
                          <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2 pt-1 md:pt-4">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block md:hidden">মোট:</span>
                              <span className="text-xs font-extrabold text-purple-700">
                                {toBengaliNumber(item.lineTotal || 0)} ৳
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(item.id)}
                              title="আইটেম বাদ দিন"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Items Footer: Add row button & Total summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddItemRow()}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ আরও পণ্য যোগ করুন</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="bg-white border border-purple-200 text-purple-900 px-2.5 py-1 rounded-lg">
                      মোট আইটেম: {toBengaliNumber(validItemsCount)} টি
                    </span>
                    <span className="bg-white border border-purple-200 text-purple-900 px-2.5 py-1 rounded-lg">
                      মোট ওজন: <strong className="text-purple-700">{toBengaliNumber(totalItemsWeight)} KG</strong>
                    </span>
                    <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-300">
                      আইটেম মোট: <strong className="text-purple-800">{toBengaliNumber(totalItemsAmount)} ৳</strong>
                    </span>
                  </div>
                </div>

                {/* Optional extra text notes toggle */}
                <div className="pt-2 border-t border-purple-100/70">
                  {!showExtraNoteInput ? (
                    <button
                      type="button"
                      onClick={() => setShowExtraNoteInput(true)}
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>+ অতিরিক্ত কোনো চালান বা মালের সাধারণ বিবরণ লিখতে চান?</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700">
                          অতিরিক্ত মালের বিবরণ বা নোট (ঐচ্ছিক)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowExtraNoteInput(false);
                            setItemsExtraNote('');
                          }}
                          className="text-[10px] text-slate-400 hover:text-rose-600"
                        >
                          বন্ধ করুন
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={itemsExtraNote}
                        onChange={(e) => setItemsExtraNote(e.target.value)}
                        placeholder="যেমন: ট্রাক নং বা কোনো বিশেষ সাইজের অতিরিক্ত নোট..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Cash & Online Payments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    নগদ প্রদান (ক্যাশ আউট) ৳:
                  </label>
                  <input
                    ref={billCashPaidRef}
                    type="text" 
                    inputMode="decimal"
                    min="0"
                    value={cashPaid || ''}
                    onChange={(e) => setCashPaid(normalizeNumericInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billOnlinePaidRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    অনলাইন / ব্যাংক পেমেন্ট ৳:
                  </label>
                  <input
                    ref={billOnlinePaidRef}
                    type="text" 
                    inputMode="decimal"
                    min="0"
                    value={onlinePaid || ''}
                    onChange={(e) => setOnlinePaid(normalizeNumericInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billNotesRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 4: Bill Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  ভাউচার নোট / মন্তব্য
                </label>
                <input
                  ref={billNotesRef}
                  type="text"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      billSubmitButtonRef.current?.focus();
                    }
                  }}
                  placeholder="ভাউচার নম্বর বা অন্যান্য তথ্য..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Due Summary Card */}
              <div className="bg-slate-100 p-3 rounded-xl flex justify-between items-center text-xs font-bold border border-slate-200">
                <span className="text-slate-700">সাপ্লায়ার বাকি থাকবে (মহাজন পাবে):</span>
                <span className="text-base font-extrabold text-rose-600">
                  {toBengaliNumber(billDue)} ৳
                </span>
              </div>

              <button
                ref={billSubmitButtonRef}
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Boxes className="w-4 h-4" />
                <span>ক্রয় বিল সংরক্ষণ ও স্টকে স্বয়ংক্রিয় যোগ করুন</span>
              </button>
            </form>
          </div>

          {/* Supplier Info sidebar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600" />
              <span>সাপ্লায়ার বর্তমান অবস্থা</span>
            </h3>
            {selectedSupplier ? (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-extrabold text-purple-950 text-base">{selectedSupplier.companyName}</p>
                  <p className="text-slate-600 font-medium">প্রতিনিধি / মালিক: {selectedSupplier.name}</p>
                </div>

                <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">মোবাইল:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedSupplier.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">ঠিকানা:</span>
                    <span className="font-medium text-slate-800">{selectedSupplier.address || '-'}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                  <span className="text-xs text-rose-700 font-bold block">বর্তমান পূর্বের দেনা (বাকি):</span>
                  <p className="text-lg font-black text-rose-700">
                    {toBengaliNumber(selectedSupplier.currentPayable)} ৳
                  </p>
                </div>

                {billDue > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
                    <span className="font-bold block">এই বিল সেভ করার পর মোট বাকি হবে:</span>
                    <p className="font-extrabold text-sm text-amber-900">
                      {toBengaliNumber(selectedSupplier.currentPayable + billDue)} ৳
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <Truck className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                <p className="text-xs">বাম পাশের ড্রপডাউন থেকে সাপ্লায়ার নির্বাচন করুন</p>
              </div>
            )}
          </div>

          {/* Recent Bills Table under bill_entry */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-600" />
                <span>সর্বশেষ এন্ট্রি করা ক্রয় বিলসমূহ</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className="text-xs text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
              >
                সকল বিল ও হিস্ট্রি দেখুন →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5">মেমো নং</th>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">সাপ্লায়ার / কোম্পানি</th>
                    <th className="p-2.5 text-right">মোট ওজন</th>
                    <th className="p-2.5 text-right">মোট বিল</th>
                    <th className="p-2.5 text-right">জমা (ক্যাশ+অনলাইন)</th>
                    <th className="p-2.5 text-right">বাকি</th>
                    <th className="p-2.5 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">
                        এখনো কোনো ক্রয়ের বিল এন্ট্রি করা হয়নি।
                      </td>
                    </tr>
                  ) : (
                    supplierBills.slice(0, 10).map((b) => {
                      const billItems = extractSupplierBillItems(b);
                      const totalKg = billItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 font-bold text-purple-700 font-mono">#{b.billNo}</td>
                          <td className="p-2.5 text-slate-600 whitespace-nowrap">{toBengaliNumber(formatDate(b.date))}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{b.companyName}</td>
                          <td className="p-2.5 text-right font-black text-slate-800 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-xs font-bold">
                              <Scale className="w-3 h-3 text-purple-600" />
                              {toBengaliNumber(totalKg)} KG
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-extrabold text-slate-800">{toBengaliNumber(b.totalAmount)} ৳</td>
                        <td className="p-2.5 text-right font-semibold text-emerald-700">{toBengaliNumber((b.cashPaid || 0) + (b.onlinePaid || 0))} ৳</td>
                        <td className="p-2.5 text-right font-bold text-rose-600">{toBengaliNumber(b.dueAmount || 0)} ৳</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingBill(b)}
                              title="বিল বিস্তারিত দেখুন (View)"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                onClick={() => handleStartEditBill(b)}
                                title="বিল এডিট করুন (Edit)"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition active:scale-95 cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePrintSupplierBill(b)}
                              title="চালান ভাউচার প্রিন্ট করুন (Print)"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBill(b)}
                                title="বিল মুছুন (Delete)"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition active:scale-95 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        </div>
      )}

      {/* Tab 2: Direct Supplier Payment */}
      {activeSubTab === 'payment_entry' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>মহাজন / সাপ্লায়ার দেনা পরিশোধ (Payment Voucher)</span>
          </h3>

          <form onSubmit={handleSavePayment} onKeyDown={handlePaymentFormKeyDown} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                সাপ্লায়ার / মহাজন সিলেক্ট করুন <span className="text-rose-500">*</span>
              </label>
              <select
                ref={paySupplierSelectRef}
                value={paySupplierId}
                onChange={(e) => setPaySupplierId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    payAmountRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">-- সাপ্লায়ার নির্বাচন করুন --</option>
                {mappedSuppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} - {s.name} (বর্তমান দেনা: {toBengaliNumber(s.currentPayable)} ৳)
                  </option>
                ))}
              </select>
            </div>

            {selectedPaySupplier && (
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 text-xs flex justify-between items-center">
                <span className="font-bold text-slate-700">{selectedPaySupplier.companyName} পাবে:</span>
                <span className="font-extrabold text-sm text-rose-600">
                  {toBengaliNumber(selectedPaySupplier.currentPayable)} ৳
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                পরিশোধের পরিমাণ (৳) <span className="text-rose-500">*</span>
              </label>
              <input
                ref={payAmountRef}
                type="text" 
                inputMode="decimal"
                min="1"
                value={payAmount || ''}
                onChange={(e) => setPayAmount(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    payMethodRef.current?.focus();
                  }
                }}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-purple-700 focus:bg-white focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের মাধ্যম</label>
              <select
                ref={payMethodRef}
                value={payMethod}
                onChange={(e: any) => setPayMethod(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    payNotesRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-500"
              >
                <option value="cash">নগদ ক্যাশ (হাত ক্যাশ থেকে বিয়োগ হবে)</option>
                <option value="online">অনলাইন / ব্যাংক ট্রান্সফার</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">নোট / ভাউচার বিবরণ</label>
              <input
                ref={payNotesRef}
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    paySubmitButtonRef.current?.focus();
                  }
                }}
                placeholder="যেমন: চেক নং বা স্লিপ নং..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              ref={paySubmitButtonRef}
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-98 cursor-pointer"
            >
              পেমেন্ট কনফার্ম করুন
            </button>
          </form>

          {/* Recent Payments Table in Tab 2 with View, Edit, Print, Delete */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>সর্বশেষ পরিশোধিত রসিদসমূহ (Recent Payment Vouchers)</span>
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5">রশিদ নং</th>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">সাপ্লায়ার / মহাজন</th>
                    <th className="p-2.5">মাধ্যম</th>
                    <th className="p-2.5">নোট</th>
                    <th className="p-2.5 text-right">পরিশোধের পরিমাণ</th>
                    <th className="p-2.5 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                        এখনো কোনো দেনা পরিশোধের রসিদ পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    supplierPayments.slice(0, 10).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-bold text-emerald-800 font-mono">{p.receiptNo || 'রশিদ'}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{toBengaliNumber(formatDate(p.date))}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{p.supplierName}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.paymentMethod === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate" title={p.notes || '-'}>
                          {p.notes || '-'}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700">{toBengaliNumber(p.amount)} ৳</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingPayment(p)}
                              title="রসিদ বিস্তারিত দেখুন (View)"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                onClick={() => handleStartEditPayment(p)}
                                title="রসিদ এডিট করুন (Edit)"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition active:scale-95 cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePrintSupplierPayment(p)}
                              title="রসিদ প্রিন্ট করুন (Print)"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p)}
                                title="রসিদ মুছুন (Delete)"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition active:scale-95 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: History */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>ক্রয় ও পেমেন্ট হিস্ট্রি রেকর্ড</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                সকল ক্রয় ভাউচার ও মহাজন দেনা পরিশোধের বিবরণী
              </p>
            </div>

            {/* Sub filter tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="মেমো নং / সাপ্লায়ার খুঁজুন..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full sm:w-56 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setHistoryType('bills')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    historyType === 'bills' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ক্রয় বিলসমূহ ({toBengaliNumber(filteredBills.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryType('payments')}
                  className={`px-3 py-1 rounded-md transition cursor-pointer ${
                    historyType === 'payments' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  পরিশোধ রসিদ ({toBengaliNumber(filteredPayments.length)})
                </button>
              </div>
            </div>
          </div>

          {/* Table for Bills */}
          {historyType === 'bills' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5">মেমো নং / বিল নং</th>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">সাপ্লায়ার / কোম্পানি</th>
                    <th className="p-2.5">মালের বিবরণ ও ওজন</th>
                    <th className="p-2.5 text-right">মোট বিল</th>
                    <th className="p-2.5 text-right">জমা (ক্যাশ+অনলাইন)</th>
                    <th className="p-2.5 text-right">বাকি</th>
                    <th className="p-2.5 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        {historySearchQuery ? 'খোঁজার ফলাফলে কোনো ক্রয় বিল পাওয়া যায়নি।' : 'এখনো কোনো ক্রয়ের বিল এন্ট্রি করা হয়নি।'}
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-bold text-purple-700 font-mono">#{b.billNo}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{toBengaliNumber(formatDate(b.date))}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{b.companyName}</td>
                        <td className="p-2.5 text-slate-600 max-w-sm">
                          <span className="line-clamp-2">{b.itemsDescription}</span>
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-slate-800">{toBengaliNumber(b.totalAmount)} ৳</td>
                        <td className="p-2.5 text-right font-semibold text-emerald-700">{toBengaliNumber((b.cashPaid || 0) + (b.onlinePaid || 0))} ৳</td>
                        <td className="p-2.5 text-right font-bold text-rose-600">{toBengaliNumber(b.dueAmount || 0)} ৳</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingBill(b)}
                              title="বিল বিস্তারিত দেখুন (View)"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintSupplierBill(b)}
                              title="চালান ভাউচার প্রিন্ট করুন (Print)"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditBill(b)}
                                  title="বিল এডিট করুন (Edit)"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition active:scale-95 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBill(b)}
                                  title="বিল মুছুন (Delete)"
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition active:scale-95 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Table for Payments */}
          {historyType === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5">রশিদ নং</th>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">সাপ্লায়ার / মহাজন</th>
                    <th className="p-2.5">মাধ্যম</th>
                    <th className="p-2.5">নোট / বিবরণ</th>
                    <th className="p-2.5 text-right">পরিশোধের পরিমাণ</th>
                    <th className="p-2.5 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        {historySearchQuery ? 'খোঁজার ফলাফলে কোনো পরিশোধ রসিদ পাওয়া যায়নি।' : 'এখনো কোনো পরিশোধ রসিদ পাওয়া যায়নি।'}
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 font-bold text-emerald-800 font-mono">{p.receiptNo || 'রশিদ'}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{toBengaliNumber(formatDate(p.date))}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{p.supplierName}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.paymentMethod === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {p.paymentMethod === 'online' ? 'অনলাইন / ব্যাংক' : 'ক্যাশ'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-sm truncate" title={p.notes || '-'}>
                          {p.notes || '-'}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700">{toBengaliNumber(p.amount)} ৳</td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingPayment(p)}
                              title="রসিদ দেখুন (View)"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintSupplierPayment(p)}
                              title="রসিদ প্রিন্ট করুন (Print)"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPayment(p)}
                                  title="রসিদ এডিট করুন (Edit)"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition active:scale-95 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p)}
                                  title="রসিদ মুছুন (Delete)"
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition active:scale-95 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showNewProdModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-purple-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-sm">ক্যাটালগে নতুন প্রোডাক্ট যোগ করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProdModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewProduct} className="p-5 space-y-4">
              {newProdError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{newProdError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  পণ্যের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="যেমন: 4.2round, 5.5squre, রড..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                <div>
                  <label className="text-xs font-bold text-purple-900 block mb-1">
                    ক্রয় মূল্য (৳/কেজি)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(normalizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-bold text-purple-950 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    বিক্রয় মূল্য (৳/কেজি)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newProdSalePrice}
                    onChange={(e) => setNewProdSalePrice(normalizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  প্রারম্ভিক মজুদ (Stock KG)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(normalizeNumericInput(e.target.value))}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  ভাউচার সেভ করার সময় ক্রয়কৃত কেজি স্বয়ংক্রিয়ভাবে যোগ হবে।
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProdModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>প্রোডাক্ট যোগ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* View Bill Modal (Styled identical to Sell Invoice Slip) */}
      {viewingBill && (() => {
        const billSup = suppliers.find(s => s.id === viewingBill.supplierId);
        const parsedBill = parseBillItems(viewingBill.itemsDescription, viewingBill.totalAmount);
        const billKg = extractSupplierBillItems(viewingBill).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
        const timeFormatted = viewingBill.createdAt 
          ? new Date(viewingBill.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
          : '-';

        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingBill(null);
            }}
            className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static animate-in fade-in"
          >
            <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl print:shadow-none print:max-w-none print:w-full print:rounded-none my-auto max-h-[95vh] overflow-y-auto">
              
              {/* Header actions (Hidden when printing) */}
              <div className="flex items-center justify-between border-b pb-3 print:hidden">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-purple-600" />
                  <span>মাল ক্রয় মেমো / ইনভয়েস ভাউচার প্রিভিউ</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintSupplierBill(viewingBill)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setViewingBill(null)} 
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
                    title="বন্ধ করুন (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Print Slip Layout */}
              <div className="border border-slate-300 rounded-xl p-4 sm:p-6 space-y-4 bg-white text-slate-800 print:border-none print:p-0">
                {/* Shop Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wide">Bismillah Traders</h2>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">(বিসমিল্লাহ ট্রেডার্স)</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">পাইকারী ও খুচরা বিক্রেতা</p>
                  <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mt-1">
                    ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-700 font-semibold font-mono">
                    মোবাইল: 01885926704, 01718042483, 01720640137
                  </p>
                </div>

                {/* Title Badge */}
                <div className="bg-slate-100 border border-slate-300 rounded py-1 px-3 text-center">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800">
                    মাল ক্রয় মেমো / ইনভয়েস ভাউচার
                  </span>
                </div>

                {/* Invoice & Supplier Meta */}
                <div className="grid grid-cols-2 text-xs border-b border-slate-200 pb-2.5 gap-2">
                  <div className="space-y-1">
                    <p><span className="font-bold text-slate-700">সাপ্লায়ার / প্রতিষ্ঠান:</span> <span className="font-bold text-slate-900">{billSup?.companyName || viewingBill.companyName}</span></p>
                    <p><span className="font-bold text-slate-700">স্বত্বাধিকারী / প্রতিনিধি:</span> {billSup?.name || viewingBill.supplierName}</p>
                    <p><span className="font-bold text-slate-700">মোবাইল নম্বর:</span> {billSup?.phone || '-'}</p>
                    <p><span className="font-bold text-slate-700">ঠিকানা:</span> {billSup?.address || '-'}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p><span className="font-bold text-slate-700">চালান / মেমো নং:</span> <span className="font-mono font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">#{viewingBill.billNo}</span></p>
                    <p><span className="font-bold text-slate-700">তারিখ:</span> {toBengaliNumber(formatDate(viewingBill.date))}</p>
                    <p><span className="font-bold text-slate-700">সময়:</span> {timeFormatted}</p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 font-bold bg-slate-50 text-slate-800">
                      <th className="p-1.5 w-8 text-center border-b border-slate-300">নং</th>
                      <th className="p-1.5 border-b border-slate-300">পণ্যের বিবরণ</th>
                      <th className="p-1.5 w-24 text-center border-b border-slate-300">পরিমাণ / ওজন</th>
                      <th className="p-1.5 w-20 text-right border-b border-slate-300">দর (৳)</th>
                      <th className="p-1.5 w-24 text-right border-b border-slate-300">মোট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedBill.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-1.5 text-center text-slate-500">{toBengaliNumber(item.id)}</td>
                        <td className="p-1.5 font-medium text-slate-900">{item.name}</td>
                        <td className="p-1.5 text-center font-bold text-slate-700">{item.quantityStr}</td>
                        <td className="p-1.5 text-right text-slate-700">{item.rateStr}</td>
                        <td className="p-1.5 text-right font-bold text-slate-900">{item.totalStr}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-800 font-bold bg-slate-50 text-slate-900">
                      <td colSpan={2} className="p-1.5 text-right font-bold">মোট পরিমাণ (ওজন):</td>
                      <td className="p-1.5 text-center font-extrabold text-purple-900 bg-purple-100/60 border border-purple-200">
                        {billKg > 0 ? `${toBengaliNumber(billKg)} কেজি` : '-'}
                      </td>
                      <td colSpan={2} className="p-1.5 text-right font-extrabold text-purple-900">
                        {toBengaliNumber(viewingBill.totalAmount)} ৳
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Summary Totals */}
                <div className="border-t border-slate-300 pt-2 flex justify-end">
                  <div className="w-64 sm:w-72 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">মোট মালের বিল:</span>
                      <span className="font-bold">{toBengaliNumber(viewingBill.totalAmount)} ৳</span>
                    </div>

                    <div className="flex justify-between text-sm font-extrabold border-t border-b border-slate-800 py-1">
                      <span>সর্বমোট ক্রয় বিল:</span>
                      <span className="text-purple-800">{toBengaliNumber(viewingBill.totalAmount)} ৳</span>
                    </div>

                    {/* মোট ক্রয়কৃত ওজন / পরিমাণ */}
                    <div className="flex justify-between text-purple-950 font-bold bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 my-1">
                      <span className="text-slate-700">মোট মাল ক্রয় (ওজন):</span>
                      <span className="font-extrabold text-xs sm:text-sm text-purple-800">
                        {billKg > 0 ? `${toBengaliNumber(billKg)} কেজি` : '-'}
                      </span>
                    </div>

                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>নগদ পরিশোধ (ক্যাশ):</span>
                      <span>{toBengaliNumber(viewingBill.cashPaid || 0)} ৳</span>
                    </div>

                    {(viewingBill.onlinePaid || 0) > 0 && (
                      <div className="flex justify-between text-sky-700 font-semibold">
                        <span>অন্যান্য / অনলাইন (ব্যাংক):</span>
                        <span>{toBengaliNumber(viewingBill.onlinePaid || 0)} ৳</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs font-bold text-purple-900 border-t border-slate-200 pt-1">
                      <span>সর্বমোট জমা / পরিশোধ:</span>
                      <span className="font-extrabold">{toBengaliNumber((viewingBill.cashPaid || 0) + (viewingBill.onlinePaid || 0))} ৳</span>
                    </div>

                    {/* আজকের চালানের বাকি */}
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">আজকের চালানের বাকি:</span>
                      <span className={`font-bold ${viewingBill.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {viewingBill.dueAmount > 0 ? `${toBengaliNumber(viewingBill.dueAmount)} ৳` : 'পরিশোধিত (০ ৳)'}
                      </span>
                    </div>

                    {/* মহাজনের বর্তমান মোট পাওনা */}
                    {billSup && (
                      <div className={`flex justify-between font-black text-xs sm:text-sm pt-1.5 pb-1 border-t-2 ${
                        (billSup.currentPayable || 0) > 0 
                          ? 'border-rose-400 text-rose-700 bg-rose-50/80 -mx-1 px-1 rounded' 
                          : 'border-emerald-300 text-emerald-700'
                      }`}>
                        <span>মহাজনের বর্তমান মোট দেনা:</span>
                        <span>{(billSup.currentPayable || 0) > 0 ? `${toBengaliNumber(billSup.currentPayable)} ৳` : 'পরিশোধিত (০ ৳)'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount in words */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
                  <span className="font-bold text-slate-800">সর্বমোট বিল কথায়:</span> {numberToBengaliWords(viewingBill.totalAmount)}
                </div>

                {/* Notes */}
                {(viewingBill.notes || parsedBill.note) && (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold">নোট / মন্তব্য:</span> {[viewingBill.notes, parsedBill.note].filter(Boolean).join(' | ')}
                  </div>
                )}

                {/* Footer signatures */}
                <div className="pt-8 grid grid-cols-2 text-center text-xs font-semibold">
                  <div>
                    <div className="border-t border-slate-400 w-36 mx-auto pt-1">মহাজন / সাপ্লায়ারের স্বাক্ষর</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-36 mx-auto pt-1">ক্রেতা / কর্তৃপক্ষের স্বাক্ষর</div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
                  * মাল ক্রয়ের মেমো ও চালান ভাউচার। আমাদের সাথে লেনদেনের জন্য ধন্যবাদ।*
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 print:hidden pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  {canEditOrDelete && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeleteBill(viewingBill)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>মুছুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditBill(viewingBill)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>এডিট</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingBill(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintSupplierBill(viewingBill)}
                    className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* View Payment Modal (Styled identical to Sell Due Collection Money Receipt) */}
      {viewingPayment && (() => {
        const paySup = suppliers.find(s => s.id === viewingPayment.supplierId);
        return (
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingPayment(null);
            }}
            className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static animate-in fade-in"
          >
            <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl print:shadow-none print:max-w-none print:w-full print:rounded-none my-auto max-h-[92vh] overflow-y-auto">
              
              {/* Header actions (Hidden when printing) */}
              <div className="flex items-center justify-between border-b pb-3 print:hidden">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>মহাজন দেনা পরিশোধ রসিদ প্রিভিউ</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintSupplierPayment(viewingPayment)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setViewingPayment(null)} 
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
                    title="বন্ধ করুন (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Receipt Layout */}
              <div className="border border-slate-300 rounded-xl p-4 sm:p-6 space-y-4 bg-white text-slate-800 print:border-none print:p-0">
                {/* Shop Header */}
                <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wide">Bismillah Traders</h2>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">(বিসমিল্লাহ ট্রেডার্স)</h3>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">পাইকারী ও খুচরা বিক্রেতা</p>
                  <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mt-1">
                    ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-700 font-semibold font-mono">
                    মোবাইল: 01885926704, 01718042483, 01720640137
                  </p>
                </div>

                {/* Title Badge */}
                <div className="bg-emerald-50 border border-emerald-300 rounded py-1 px-3 text-center">
                  <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-800">
                    মহাজন দেনা পরিশোধ রসিদ / ভাউচার
                  </span>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 text-xs border-b border-slate-200 pb-2.5 gap-2">
                  <div className="space-y-1">
                    <p><span className="font-bold text-slate-700">সাপ্লায়ার / প্রতিষ্ঠান:</span> <span className="font-bold text-slate-900">{paySup?.companyName || viewingPayment.supplierName}</span></p>
                    <p><span className="font-bold text-slate-700">স্বত্বাধিকারী / প্রতিনিধি:</span> {paySup?.name || '-'}</p>
                    <p><span className="font-bold text-slate-700">মোবাইল নম্বর:</span> {paySup?.phone || '-'}</p>
                    <p><span className="font-bold text-slate-700">ঠিকানা:</span> {paySup?.address || '-'}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p><span className="font-bold text-slate-700">রশিদ নং:</span> <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">{viewingPayment.receiptNo || 'রশিদ'}</span></p>
                    <p><span className="font-bold text-slate-700">পরিশোধের তারিখ:</span> {toBengaliNumber(formatDate(viewingPayment.date))}</p>
                    <p><span className="font-bold text-slate-700">বিবরণ:</span> মহাজন দেনা পরিশোধ</p>
                  </div>
                </div>

                {/* Table Breakdown */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-emerald-50/80">
                        <td className="p-2.5 text-slate-900 font-bold">
                          <div>পরিশোধকৃত পরিমাণ</div>
                          <div className="text-[11px] text-emerald-800 font-normal mt-0.5">
                            মাধ্যম: {viewingPayment.paymentMethod === 'online' ? 'অনলাইন / ব্যাংক ট্রান্সফার' : 'নগদ ক্যাশ'}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-700 text-base sm:text-lg">
                          {toBengaliNumber(viewingPayment.amount)} ৳
                        </td>
                      </tr>
                      {paySup && (
                        <tr className="bg-slate-50/40">
                          <td className="p-2.5 text-slate-800 font-bold">পরিশোধের পর বর্তমান দেনা / বাকি</td>
                          <td className={`p-2.5 text-right font-black text-base ${(paySup.currentPayable || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {(paySup.currentPayable || 0) > 0 ? `${toBengaliNumber(paySup.currentPayable)} ৳` : '০ ৳ (পরিশোধিত)'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Amount in words */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700">
                  <span className="font-bold text-slate-800">পরিশোধকৃত টাকা কথায়:</span> {numberToBengaliWords(viewingPayment.amount)}
                </div>

                {viewingPayment.notes && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700">মন্তব্য:</span> {viewingPayment.notes}
                  </div>
                )}

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 text-center text-xs font-semibold">
                  <div>
                    <div className="border-t border-slate-400 w-36 mx-auto pt-1">মহাজন / প্রাপকের স্বাক্ষর</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-36 mx-auto pt-1">কর্তৃপক্ষ / ক্রেতার স্বাক্ষর</div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5">
                  <p className="text-slate-500">* লেনদেনের জন্য ধন্যবাদ। এই রশিদটি যত্নসহকারে সংরক্ষণ করুন।</p>
                </div>
              </div>

              {/* Bottom modal buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 print:hidden pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  {canEditOrDelete && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(viewingPayment)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>মুছুন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditPayment(viewingPayment)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>এডিট</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingPayment(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintSupplierPayment(viewingPayment)}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>প্রিন্ট করুন</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            <div className="bg-gradient-to-r from-amber-600 to-emerald-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-200" />
                <h3 className="font-bold text-sm">পরিশোধ রসিদ এডিট</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">সাপ্লায়ার / মহাজন *</label>
                <select
                  value={editPaySupplierId}
                  onChange={(e) => setEditPaySupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                  required
                >
                  {mappedSuppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের তারিখ *</label>
                <input
                  type="date"
                  required
                  value={editPayDate}
                  onChange={(e) => setEditPayDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">টাকার পরিমাণ (৳) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={editPayAmount}
                  onChange={(e) => setEditPayAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-emerald-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের মাধ্যম</label>
                <select
                  value={editPayMethod}
                  onChange={(e: any) => setEditPayMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="cash">নগদ ক্যাশ (Cash)</option>
                  <option value="online">অনলাইন / ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">নোট / বিবরণ</label>
                <input
                  type="text"
                  value={editPayNotes}
                  onChange={(e) => setEditPayNotes(e.target.value)}
                  placeholder="চেক নং বা স্লিপ নং..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  আপডেট সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
