import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, Customer, ProductCatalogItem } from '../types';
import { 
  Save, 
  Printer, 
  CheckCircle, 
  Search,
  Plus,
  Trash2,
  Package,
  Sparkles,
  Scale,
  X,
  AlertCircle,
  ChevronDown,
  Eye,
  FileText,
  Edit
} from 'lucide-react';
import { 
  toBengaliNumber, 
  toEnglishNumber, 
  getFormattedCurrentTime, 
  compareProductNames,
  normalizeNumericInput,
  normalizeInputDigits,
  formatDate
} from '../utils/formatters';

interface InvoiceLineItem {
  id: string;
  productId?: string;
  code?: string;
  name: string;
  quantity: string; // string for input (in KG)
  unit: string; // 'কেজি' or 'KG'
  unitPrice: string; // string for input (৳ per KG)
}

import { ProductSearchSelect } from './ProductSearchSelect';

export const NewInvoiceView: React.FC = () => {
  const { 
    selectedDate, 
    customers, 
    setCustomers,
    products,
    addProduct,
    updateProduct,
    addInvoice, 
    updateInvoice,
    deleteInvoice,
    invoices,
    setInvoices,
    canEditOrDelete,
    addCustomer,
    setInvoiceToPrint,
    invoiceToEdit,
    setInvoiceToEdit,
    confirmAction
  } = useApp();

  const [invoiceDate, setInvoiceDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [memoNo, setMemoNo] = useState<string>('');
  const [memoError, setMemoError] = useState<string>('');
  
  // Element Refs for smooth Enter navigation
  const memoNoInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const totalSaleRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const manualWeightRef = useRef<HTMLInputElement>(null);
  const cashPaidRef = useRef<HTMLInputElement>(null);
  const onlinePaidRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Manual weight state (when invoice items are not listed separately)
  const [manualWeight, setManualWeight] = useState<string>('');

  // Customer input & selection
  const [customerInput, setCustomerInput] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Products in Invoice State - default 1 row ready for input
  const [invoiceItems, setInvoiceItems] = useState<InvoiceLineItem[]>([
    {
      id: 'row_' + Date.now() + '_init',
      productId: '',
      code: '',
      name: '',
      quantity: '',
      unit: 'কেজি',
      unitPrice: ''
    }
  ]);

  // Add New Product Modal State
  const [showNewProductModal, setShowNewProductModal] = useState<boolean>(false);
  const [newProdCode, setNewProdCode] = useState<string>('');
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('সাধারণ মালামাল');
  const [newProdPurchasePrice, setNewProdPurchasePrice] = useState<string>('');
  const [newProdSalePrice, setNewProdSalePrice] = useState<string>('');
  const [newProdStock, setNewProdStock] = useState<string>('0');
  const [newProdError, setNewProdError] = useState<string>('');

  // Quick Customer Add Modal State (with per-kg discount)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');
  const [newCustOpeningDue, setNewCustOpeningDue] = useState<string>('');
  const [newCustDiscountPerKg, setNewCustDiscountPerKg] = useState<string>('');
  const [newCustNotes, setNewCustNotes] = useState<string>('');
  const [newCustError, setNewCustError] = useState<string>('');

  // Financial inputs
  const [totalSaleAmount, setTotalSaleAmount] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [cashPaid, setCashPaid] = useState<string>("");
  const [onlineMethod, setOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bank');
  const [onlinePaid, setOnlinePaid] = useState<string>("");

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [lastSavedInvoice, setLastSavedInvoice] = useState<any>(null);

  // Recent invoices of the selected date
  const [recentSearch, setRecentSearch] = useState<string>('');

  // Active Invoice Edit Mode State & Handlers (Full items & products loaded into main form)
  const [activeEditingInvoice, setActiveEditingInvoice] = useState<any>(null);

  const handleLoadInvoiceForEditing = (inv: any) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো ইনভয়েস এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setActiveEditingInvoice(inv);
    setInvoiceDate(inv.date || new Date().toISOString().split('T')[0]);
    setMemoNo(inv.invoiceNo || '');
    
    // Set customer
    const foundCust = customers.find(c => c.id === inv.customerId);
    if (foundCust) {
      setSelectedCustomer(foundCust);
      setCustomerInput(foundCust.name + (foundCust.phone ? ` (${foundCust.phone})` : ''));
    } else {
      setSelectedCustomer(null);
      setCustomerInput(inv.customerName || '');
    }

    // Set items directly into "বিক্রিত পণ্যের বিবরণ (Products / Items)" table
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      setInvoiceItems(inv.items.map((it: any, idx: number) => ({
        id: 'edit_row_' + Date.now() + '_' + idx,
        productId: it.productId || '',
        code: it.code || '',
        name: it.name || '',
        quantity: String(it.quantity || ''),
        unit: it.unit || 'কেজি',
        unitPrice: String(it.unitPrice || '')
      })));
    } else {
      setInvoiceItems([{
        id: 'edit_row_' + Date.now() + '_init',
        productId: '',
        code: '',
        name: 'মালামাল বিক্রয়',
        quantity: '1',
        unit: 'কেজি',
        unitPrice: String(inv.subtotal || inv.grandTotal || '')
      }]);
    }

    setTotalSaleAmount(String(inv.subtotal || inv.grandTotal || ''));
    setDiscount(String(inv.discount || ''));
    setCashPaid(String(inv.cashPaid || ''));
    setOnlinePaid(String(inv.onlinePaid || ''));
    setOnlineMethod(inv.onlineMethod || 'bank');
    setManualWeight('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSuccessMessage(`ইনভয়েস #${inv.invoiceNo}-এর সমস্ত তথ্য ও পণ্যের বিবরণ (Products / Items) ফর্মে লোড হয়েছে!`);
    setTimeout(() => setSuccessMessage(''), 4500);
  };

  // Listen to external invoiceToEdit (e.g. sent from DateSalesView)
  useEffect(() => {
    if (invoiceToEdit) {
      handleLoadInvoiceForEditing(invoiceToEdit);
      if (setInvoiceToEdit) {
        setInvoiceToEdit(null);
      }
    }
  }, [invoiceToEdit]);

  const handleCancelEdit = () => {
    setActiveEditingInvoice(null);
    setMemoNo('');
    setCustomerInput('');
    setSelectedCustomer(null);
    setInvoiceItems([{
      id: 'row_' + Date.now() + '_init',
      productId: '',
      code: '',
      name: '',
      quantity: '',
      unit: 'কেজি',
      unitPrice: ''
    }]);
    setManualWeight('');
    setTotalSaleAmount('');
    setDiscount('');
    setCashPaid('');
    setOnlinePaid('');
    setSuccessMessage('ইনভয়েস এডিট মোড বাতিল করা হয়েছে। নতুন ইনভয়েস ফর্ম প্রস্তুত।');
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  const todaysInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        const matchesDate = inv.date === invoiceDate || inv.date === selectedDate;
        if (!matchesDate) return false;
        if (!recentSearch.trim()) return true;
        const q = recentSearch.toLowerCase();
        return (
          inv.invoiceNo?.toLowerCase().includes(q) ||
          inv.customerName?.toLowerCase().includes(q) ||
          inv.customerPhone?.includes(q)
        );
      })
      .slice(0, 30);
  }, [invoices, invoiceDate, selectedDate, recentSearch]);

  // Sync date when selectedDate in global context changes
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
  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(customerInput.toLowerCase()) ||
    (c.phone || '').includes(customerInput)
  );

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

  // Open Quick Customer Modal
  const handleOpenAddCustomerModal = (presetName?: string) => {
    setNewCustName(presetName || (customerInput !== 'সাধারণ ক্যাশ কাস্টমার' ? customerInput : ''));
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustOpeningDue('');
    setNewCustDiscountPerKg('');
    setNewCustNotes('');
    setNewCustError('');
    setShowAddCustomerModal(true);
  };

  // Save Quick Customer to Customers and select immediately
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustError('');

    const nameTrimmed = newCustName.trim();
    if (!nameTrimmed) {
      setNewCustError('কাস্টমারের নাম দেওয়া বাধ্যতামূলক!');
      return;
    }

    const dPerKg = toEnglishNumber(newCustDiscountPerKg.toString()) || 0;
    const opDue = toEnglishNumber(newCustOpeningDue.toString()) || 0;

    const createdCust: Customer = {
      id: 'c_' + Date.now(),
      name: nameTrimmed,
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      openingDue: opDue,
      discountPerKg: dPerKg,
      totalPurchased: 0,
      totalPaid: 0,
      currentDue: opDue,
      createdDate: invoiceDate || new Date().toISOString().split('T')[0],
      notes: newCustNotes.trim()
    };

    addCustomer(createdCust);
    setSelectedCustomer(createdCust);
    setCustomerInput(createdCust.name + (createdCust.phone ? ` (${createdCust.phone})` : ''));
    setShowCustomerDropdown(false);
    setShowAddCustomerModal(false);

    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustOpeningDue('');
    setNewCustDiscountPerKg('');
    setNewCustNotes('');
    setNewCustError('');
  };

  // Helper to generate suggested product code
  const generateSuggestedProductCode = () => {
    const count = products.length + 1;
    return `P-${String(count).padStart(3, '0')}`;
  };

  // Open Add Product Modal
  const handleOpenAddProductModal = (presetName?: string) => {
    setNewProdCode(generateSuggestedProductCode());
    setNewProdName(presetName || '');
    setNewProdCategory('সাধারণ মালামাল');
    setNewProdPurchasePrice('');
    setNewProdSalePrice('');
    setNewProdStock('0');
    setNewProdError('');
    setShowNewProductModal(true);
  };

  // Save New Product to catalog and add to current invoice
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
      code: newProdCode.trim() || generateSuggestedProductCode(),
      name: nameTrimmed,
      category: newProdCategory.trim() || 'সাধারণ মালামাল',
      purchasePrice: purchase,
      salePrice: sale,
      stock: stock,
      unit: 'KG',
      createdAt: new Date().toISOString()
    };

    addProduct(createdProd);

    // Auto-insert this newly created product as a row in the invoice
    const newRow: InvoiceLineItem = {
      id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      productId: createdProd.id,
      code: createdProd.code,
      name: createdProd.name,
      quantity: '',
      unit: 'কেজি',
      unitPrice: String(createdProd.salePrice || 0)
    };

    setInvoiceItems(prev => [...prev, newRow]);
    setShowNewProductModal(false);
  };

  // Add Item Row in Invoice
  const handleAddItemRow = (selectedProd?: ProductCatalogItem) => {
    if (selectedProd) {
      const newRow: InvoiceLineItem = {
        id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: selectedProd.id,
        code: selectedProd.code,
        name: selectedProd.name,
        quantity: '',
        unit: 'কেজি',
        unitPrice: String(selectedProd.salePrice || 0)
      };
      setInvoiceItems(prev => [...prev, newRow]);
    } else {
      const newRow: InvoiceLineItem = {
        id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        productId: '',
        code: '',
        name: '',
        quantity: '',
        unit: 'কেজি',
        unitPrice: ''
      };
      setInvoiceItems(prev => [...prev, newRow]);
    }
  };

  // Product Selection in row
  const handleSelectProductForRow = (rowId: string, prodId: string) => {
    if (prodId === '__new__') {
      handleOpenAddProductModal();
      return;
    }

    const found = products.find(p => p.id === prodId);
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === rowId) {
        if (found) {
          return {
            ...item,
            productId: found.id,
            code: found.code,
            name: found.name,
            unit: 'কেজি',
            unitPrice: String(found.salePrice || 0),
            quantity: item.quantity || ''
          };
        } else {
          return {
            ...item,
            productId: '',
            code: '',
            name: '',
            unit: 'কেজি',
            unitPrice: ''
          };
        }
      }
      return item;
    }));
  };

  // Update item field (name, quantity, unitPrice)
  const handleUpdateItemField = (rowId: string, field: 'name' | 'quantity' | 'unitPrice', val: string) => {
    const finalVal = field === 'quantity' || field === 'unitPrice' ? normalizeNumericInput(val) : val;
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === rowId) {
        return { ...item, [field]: finalVal };
      }
      return item;
    }));
  };

  // Remove row
  const handleRemoveItemRow = (rowId: string) => {
    setInvoiceItems(prev => {
      const remaining = prev.filter(item => item.id !== rowId);
      if (remaining.length === 0) {
        return [{
          id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          productId: '',
          code: '',
          name: '',
          quantity: '',
          unit: 'কেজি',
          unitPrice: ''
        }];
      }
      return remaining;
    });
  };

  // Calculate items summary
  const itemsSubtotal = invoiceItems.reduce((sum, item) => {
    const q = toEnglishNumber(item.quantity) || 0;
    const p = toEnglishNumber(item.unitPrice) || 0;
    return sum + (q * p);
  }, 0);

  const itemsTotalWeight = invoiceItems.reduce((sum, item) => {
    const isFilled = item.name.trim() !== '' || (toEnglishNumber(item.unitPrice) || 0) > 0;
    if (!isFilled) return sum;
    const q = toEnglishNumber(item.quantity) || 0;
    return sum + q;
  }, 0);

  const effectiveTotalWeight = itemsTotalWeight > 0 ? itemsTotalWeight : (toEnglishNumber(manualWeight.toString()) || 0);

  // Automatically calculate discount based on customer's discountPerKg and total kg
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.discountPerKg && selectedCustomer.discountPerKg > 0) {
      const perKg = Number(selectedCustomer.discountPerKg) || 0;
      const calculatedDiscount = Math.round((effectiveTotalWeight * perKg) * 100) / 100;
      setDiscount(calculatedDiscount > 0 ? String(calculatedDiscount) : '0');
    }
  }, [selectedCustomer, effectiveTotalWeight]);

  // Automatically sync items subtotal with totalSaleAmount when items exist
  useEffect(() => {
    if (invoiceItems.length > 0) {
      setTotalSaleAmount(itemsSubtotal > 0 ? String(itemsSubtotal) : '');
    }
  }, [itemsSubtotal, invoiceItems.length]);

  // Financial Calculations
  const numTotalSale = toEnglishNumber(totalSaleAmount.toString()) || 0;
  const numDiscount = toEnglishNumber(discount.toString()) || 0;
  const numCashPaid = toEnglishNumber(cashPaid.toString()) || 0;
  const numOnlinePaid = toEnglishNumber(onlinePaid.toString()) || 0;

  const previousDue = selectedCustomer ? (selectedCustomer.currentDue || 0) : 0;
  const netSale = numTotalSale - numDiscount;
  const totalPaid = numCashPaid + numOnlinePaid;
  const todaysDue = netSale - totalPaid;
  const overallDue = previousDue + netSale - totalPaid;

  // Submit Handler
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    if (!memoNo.trim()) {
      setMemoError('মেমো নং দেওয়া বাধ্যতামূলক!');
      memoNoInputRef.current?.focus();
      return;
    }
    setMemoError('');

    if (numTotalSale < 0) {
      alert('বিক্রির টাকা ঋণাত্মক (negative) হতে পারে না!');
      return;
    }

    let customerId = selectedCustomer ? selectedCustomer.id : '';
    let customerName = customerInput.trim() || 'সাধারণ ক্যাশ কাস্টমার';
    let customerPhone = '';
    let customerAddress = '';

    if (selectedCustomer) {
      customerName = selectedCustomer.name;
      customerPhone = selectedCustomer.phone;
      customerAddress = selectedCustomer.address;
    } else if (customerInput.trim() && customerInput.trim() !== 'সাধারণ ক্যাশ কাস্টমার') {
      // Create new customer if typed
      const newCust: Customer = {
        id: 'c_' + Date.now(),
        name: customerInput.trim(),
        phone: '',
        address: '',
        openingDue: 0,
        totalPurchased: 0,
        totalPaid: 0,
        currentDue: 0,
        createdDate: invoiceDate,
        notes: ''
      };
      addCustomer(newCust);
      customerId = newCust.id;
    }

    // Build line items
    const validItems: InvoiceItem[] = [];

    if (invoiceItems.length > 0) {
      invoiceItems.forEach((row, idx) => {
        const q = toEnglishNumber(row.quantity) || 0;
        const p = toEnglishNumber(row.unitPrice) || 0;
        const itemName = row.name.trim();

        if (itemName || q > 0 || p > 0) {
          const matchingCatalogProd = products.find(prod => prod.id === row.productId || prod.name === row.name);
          
          validItems.push({
            id: row.id || `it_${Date.now()}_${idx}`,
            productId: matchingCatalogProd?.id || row.productId,
            code: matchingCatalogProd?.code || row.code,
            name: itemName || (matchingCatalogProd ? matchingCatalogProd.name : `পণ্য-${idx + 1}`),
            quantity: q,
            unit: 'কেজি',
            unitPrice: p,
            totalPrice: q * p,
            costPrice: matchingCatalogProd?.purchasePrice
          });

          // Stock deduction if connected to catalog (allows negative stock for pending/advance deliveries)
          if (!activeEditingInvoice && matchingCatalogProd && q > 0) {
            const curStock = Number(matchingCatalogProd.stock) || 0;
            updateProduct(matchingCatalogProd.id, {
              stock: curStock - q
            });
          }
        }
      });
    }

    // Fallback if no specific products were entered
    if (validItems.length === 0) {
      validItems.push({
        id: 'it_main',
        name: 'মালামাল বিক্রয়',
        quantity: effectiveTotalWeight > 0 ? effectiveTotalWeight : 1,
        unit: 'কেজি',
        unitPrice: numTotalSale,
        totalPrice: numTotalSale
      });
    }

    // If in Invoice Edit Mode: update the existing invoice
    if (activeEditingInvoice) {
      const updated = updateInvoice(activeEditingInvoice.id, {
        invoiceNo: memoNo.trim(),
        date: invoiceDate,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        items: validItems,
        subtotal: numTotalSale,
        discount: numDiscount,
        laborOrTransportCost: activeEditingInvoice.laborOrTransportCost || 0,
        grandTotal: netSale,
        cashPaid: numCashPaid,
        onlinePaid: numOnlinePaid,
        onlineMethod,
        dueAmount: todaysDue,
        previousDue: previousDue,
        totalDue: overallDue,
        status: todaysDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due',
        notes: activeEditingInvoice.notes || ''
      }, validItems);

      setLastSavedInvoice(updated || activeEditingInvoice);
      setSuccessMessage(`ইনভয়েস #${memoNo} সফলভাবে আপডেট ও ক্লাউডে সংরক্ষণ করা হয়েছে!`);
      setActiveEditingInvoice(null);
      if (setInvoiceToEdit) setInvoiceToEdit(null);

      // Reset Form
      setMemoNo('');
      setCustomerInput('');
      setSelectedCustomer(null);
      setInvoiceItems([{
        id: 'row_' + Date.now() + '_init',
        productId: '',
        code: '',
        name: '',
        quantity: '',
        unit: 'কেজি',
        unitPrice: ''
      }]);
      setManualWeight('');
      setTotalSaleAmount('');
      setDiscount('');
      setCashPaid('');
      setOnlinePaid('');
      return;
    }

    const created = addInvoice({
      invoiceNo: memoNo.trim(),
      date: invoiceDate,
      time: getFormattedCurrentTime(),
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      items: validItems,
      subtotal: numTotalSale,
      discount: numDiscount,
      laborOrTransportCost: 0,
      grandTotal: netSale,
      cashPaid: numCashPaid,
      onlinePaid: numOnlinePaid,
      onlineMethod,
      dueAmount: todaysDue,
      previousDue: previousDue,
      totalDue: overallDue,
      status: todaysDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due',
      notes: ''
    });

    setLastSavedInvoice(created);
    setSuccessMessage(`ইনভয়েস ${memoNo} সফলভাবে ক্লাউডে সেভ হয়েছে!`);

    // Reset Form
    setMemoNo('');
    setCustomerInput('');
    setSelectedCustomer(null);
    setInvoiceItems([{
      id: 'row_' + Date.now() + '_init',
      productId: '',
      code: '',
      name: '',
      quantity: '',
      unit: 'কেজি',
      unitPrice: ''
    }]);
    setManualWeight('');
    setTotalSaleAmount('');
    setDiscount('');
    setCashPaid('');
    setOnlinePaid('');
  };

  // Prevent accidental form submission on Enter key across all input fields!
  // In POS / Accounting software, Enter key moves to next field, and form only submits when explicitly clicking Save button or pressing Enter on the submit button itself.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
      const target = e.target as HTMLElement;
      // Allow submit ONLY if explicitly focused on the submit button itself
      if (target === submitButtonRef.current || (target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit')) {
        return;
      }
      // If target is an input, select, or textarea, prevent form submission
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        e.preventDefault();
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      
      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold">{successMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedInvoice && (
              <>
                <button
                  type="button"
                  onClick={() => setInvoiceToPrint(lastSavedInvoice)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                  title="মেমো প্রিন্ট করুন"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>মেমো প্রিন্ট করুন</span>
                </button>
                {canEditOrDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      confirmAction({
                        title: 'ইনভয়েস বাতিল ও মুছে ফেলা',
                        message: `আপনি কি নিশ্চিত মেমো #${lastSavedInvoice.invoiceNo} মুছে ফেলতে চান? এতে বিক্রি বাতিল হবে এবং বিক্রিত সমস্ত মালামাল স্বয়ংক্রিয়ভাবে আবার স্টকে ফেরত যোগ হবে।`,
                        confirmLabel: 'হ্যাঁ, ইনভয়েস বাতিল করুন',
                        onConfirm: () => {
                          deleteInvoice(lastSavedInvoice.id);
                          setLastSavedInvoice(null);
                          setSuccessMessage(`ইনভয়েস #${lastSavedInvoice.invoiceNo} মুছে ফেলা হয়েছে এবং মালামাল স্টকে ফেরত যোগ হয়েছে!`);
                        }
                      });
                    }}
                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="ভুল হলে ইনভয়েস বাতিল করুন (মালামাল আবার স্টকে ফেরত চলে যাবে)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ইনভয়েস বাতিল (স্টকে ফেরত)</span>
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setSuccessMessage('')}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode Alert Banner */}
      {activeEditingInvoice && (
        <div className="mb-5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-400 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-950 text-sm sm:text-base">
                  ইনভয়েস এডিট মোড সক্রিয়
                </span>
                <span className="bg-amber-200 text-amber-900 text-xs px-2.5 py-0.5 rounded-md font-bold font-mono">
                  #{activeEditingInvoice.invoiceNo}
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                কাস্টমার: <strong>{activeEditingInvoice.customerName || 'সাধারণ ক্যাশ কাস্টমার'}</strong> | আপনি নিচের 'বিক্রিত পণ্যের বিবরণ' থেকে পণ্য যোগ, বাদ ও পরিমাণ সংশোধন করতে পারছেন।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 text-amber-700" />
            <span>এডিট বাতিল করুন</span>
          </button>
        </div>
      )}

      {/* Main Invoice Card */}
      <div className={`bg-white rounded-2xl border ${activeEditingInvoice ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-300'} p-5 sm:p-7 shadow-sm space-y-6 transition-all`}>
        
        {/* Title Header with Quick Action */}
        <div className="border-b border-slate-200 pb-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                {activeEditingInvoice ? `ইনভয়েস ও পণ্যের বিবরণ সংশোধন (#${activeEditingInvoice.invoiceNo})` : 'নতুন বিক্রয় / জমা ইনভয়েস'}
              </h2>
              {activeEditingInvoice && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-300">
                  সংশোধন মোড
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeEditingInvoice
                ? 'পণ্য তালিকা, কেজি, দর ও জমা তথ্য সংশোধন শেষে নিচে আপডেট বাটনে ক্লিক করুন'
                : 'কাস্টমার নির্বাচন করুন, পণ্য যুক্ত করুন এবং নগদ বা বাকি বিক্রয় সম্পন্ন করুন'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddProductModal()}
            className="self-start sm:self-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>+ নতুন প্রোডাক্ট যুক্ত করুন</span>
          </button>
        </div>

        <form onSubmit={handleSaveInvoice} onKeyDown={handleFormKeyDown} className="space-y-6">
          
          {/* Row 1: তারিখ ও মেমো নম্বর */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>মেমো নং</span>
                  <span className="text-rose-600 font-extrabold text-sm">*</span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    বাধ্যতামূলক
                  </span>
                </label>
              </div>
              <input
                ref={memoNoInputRef}
                type="text"
                required
                placeholder="মেমো নং লিখুন (যেমন: ১০১)"
                value={memoNo}
                onChange={(e) => {
                  setMemoNo(normalizeInputDigits(e.target.value));
                  if (memoError) setMemoError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Next Tab navigation: move focus to customer selection input
                    if (customerInputRef.current) {
                      customerInputRef.current.focus();
                      customerInputRef.current.select?.();
                    }
                  }
                }}
                className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 shadow-sm font-mono transition ${
                  memoError 
                    ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20 ring-1 ring-rose-300' 
                    : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                }`}
              />
              {memoError && (
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{memoError}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 2: কাস্টমারের নাম ও পূর্বের বাকি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative" ref={customerDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  কাস্টমারের নাম
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenAddCustomerModal()}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ নতুন কাস্টমার এন্ট্রি (ছাড় সহ)</span>
                </button>
              </div>
              <div className="relative">
                <input
                  ref={customerInputRef}
                  type="text"
                  placeholder="কাস্টমারের নাম বা ফোন লিখুন..."
                  value={customerInput}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCustomerDropdown(false);
                      // Move to the next input field (Total Sale Amount / First product item)
                      totalSaleRef.current?.focus();
                      totalSaleRef.current?.select?.();
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Customer Autocomplete Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div 
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerInput('সাধারণ ক্যাশ কাস্টমার');
                      setShowCustomerDropdown(false);
                    }}
                    className="p-2.5 hover:bg-indigo-50 cursor-pointer text-xs font-bold text-indigo-700 flex items-center justify-between"
                  >
                    <span>-- সাধারণ ক্যাশ কাস্টমার --</span>
                    <span className="text-[10px] text-slate-400 font-normal">কোনো পূর্বের বাকি নেই</span>
                  </div>

                  {filteredCustomers.length > 0 ? (
                    <>
                      {filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs flex items-center justify-between transition"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-800">{c.name}</p>
                              {c.discountPerKg && c.discountPerKg > 0 ? (
                                <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-1.5 py-0.2 rounded border border-pink-200">
                                  ছাড়: {toBengaliNumber(c.discountPerKg)} ৳/কেজি
                                </span>
                              ) : null}
                            </div>
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
                      <div
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          handleOpenAddCustomerModal(customerInput);
                        }}
                        className="p-2.5 bg-indigo-50/50 hover:bg-indigo-100/60 cursor-pointer text-xs font-bold text-indigo-700 flex items-center gap-1.5 border-t border-slate-100 transition"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" />
                        <span>+ নতুন কাস্টমার এন্ট্রি করুন (ছাড় ও তথ্য সহ)</span>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        {customerInput.trim() ? `"${customerInput}" নামে কোনো কাস্টমার নেই` : 'কোনো কাস্টমার পাওয়া যায়নি'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          handleOpenAddCustomerModal(customerInput);
                        }}
                        className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-200 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ {customerInput.trim() ? `"${customerInput}" নামে নতুন কাস্টমার এন্ট্রি` : 'নতুন কাস্টমার এন্ট্রি (ছাড় সহ)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Customer Discount Alert */}
              {selectedCustomer && selectedCustomer.discountPerKg !== undefined && selectedCustomer.discountPerKg > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-lg shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <span>🏷️ বিশেষ কাস্টমার ছাড়:</span>
                    <span className="bg-pink-600 text-white px-1.5 py-0.5 rounded text-[11px]">
                      প্রতি কেজিতে {toBengaliNumber(selectedCustomer.discountPerKg)} ৳
                    </span>
                  </div>
                  <span className="text-[11px] text-pink-800">
                    মোট {toBengaliNumber(effectiveTotalWeight)} কেজি × {toBengaliNumber(selectedCustomer.discountPerKg)} ৳ = {toBengaliNumber(Math.round(effectiveTotalWeight * selectedCustomer.discountPerKg * 100) / 100)} ৳ ছাড়
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                পূর্বের বাকি
              </label>
              <input
                type="text"
                readOnly
                value={previousDue}
                className="w-full bg-white border border-red-500 rounded-lg px-3.5 py-2 text-sm font-bold text-red-600 shadow-sm select-none"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* PRODUCT ADDING & ITEM LIST SECTION (নতুন প্রোডাক্ট অপশন) */}
          {/* ======================================================== */}
          <div className="bg-slate-50/70 border border-indigo-200/80 rounded-xl p-4 sm:p-5 space-y-4">
            
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                    <span>বিক্রিত পণ্যের বিবরণ (Products / Items)</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                      কেজি (KG) ভিত্তিক
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ক্যাটালগ থেকে মাল নির্বাচন করুন অথবা সরাসরি নতুন পণ্য যুক্ত করুন
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddItemRow()}
                  className="bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ পণ্য সারি যোগ করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddProductModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>+ নতুন প্রোডাক্ট তৈরি করুন</span>
                </button>
              </div>
            </div>

            {/* Item Rows List (সরাসরি পণ্য তালিকা ও আইটেম প্রদর্শন) */}
            <div className="space-y-2.5">
                
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-600 px-2 py-1 bg-indigo-100/50 rounded-lg">
                  <div className="col-span-5">পণ্যের নাম / ক্যাটালগ নির্বাচন</div>
                  <div className="col-span-2 text-center">পরিমাণ (কেজি)</div>
                  <div className="col-span-2 text-right">দর / রেট (৳)</div>
                  <div className="col-span-2 text-right">মোট টাকা (৳)</div>
                  <div className="col-span-1 text-center">অ্যাকশন</div>
                </div>

                {/* Rows */}
                {invoiceItems.map((item, index) => {
                  const lineTotal = (toEnglishNumber(item.quantity) || 0) * (toEnglishNumber(item.unitPrice) || 0);
                  const selectedProd = products.find(p => p.id === item.productId);

                  return (
                    <div 
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 sm:p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center shadow-2xs hover:border-indigo-300 transition"
                    >
                      {/* Product Selector / Name (5 cols on sm) */}
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 sm:hidden">
                          পণ্য নির্বাচন
                        </label>
                        <div className="flex items-center gap-1.5">
                          <ProductSearchSelect
                            products={products}
                            selectedProductId={item.productId}
                            onSelect={(prod) => {
                              if (prod) {
                                setInvoiceItems(prev => prev.map(row => row.id === item.id ? {
                                  ...row,
                                  productId: prod.id,
                                  code: prod.code,
                                  name: prod.name,
                                  unit: 'কেজি',
                                  unitPrice: String(prod.salePrice || 0),
                                  quantity: row.quantity || ''
                                } : row));
                              } else {
                                setInvoiceItems(prev => prev.map(row => row.id === item.id ? {
                                  ...row,
                                  productId: '',
                                  code: '',
                                  name: '',
                                  unit: 'কেজি',
                                  unitPrice: ''
                                } : row));
                              }
                            }}
                            onAddNew={(presetName) => handleOpenAddProductModal(presetName)}
                            placeholder="ক্যাটালগ থেকে পণ্য খুঁজুন বা বাছাই করুন..."
                          />
                        </div>

                        {/* Stock badge when product is selected */}
                        {selectedProd && (
                          <div className="flex items-center gap-1.5 text-[11px] px-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              (Number(selectedProd.stock) || 0) < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : (Number(selectedProd.stock) || 0) === 0
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {(Number(selectedProd.stock) || 0) < 0
                                ? `মজুদ ঘাটতি: ${toBengaliNumber(selectedProd.stock)} কেজি (অ্যাডভান্স ডেলিভারি)`
                                : `বর্তমান মজুদ: ${toBengaliNumber(selectedProd.stock || 0)} কেজি`
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quantity in KG (2 cols on sm) */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 sm:hidden block mb-1">
                          পরিমাণ (কেজি)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="০"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemField(item.id, 'quantity', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                                e.preventDefault();
                                e.stopPropagation();
                                const container = e.currentTarget.closest('.grid');
                                const priceInput = container?.querySelector('.item-price-input') as HTMLInputElement;
                                if (priceInput) {
                                  priceInput.focus();
                                  priceInput.select?.();
                                } else {
                                  totalSaleRef.current?.focus();
                                }
                              }
                            }}
                            className="item-qty-input w-full bg-white border border-slate-300 rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-mono font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                            কেজি
                          </span>
                        </div>
                      </div>

                      {/* Unit Price (৳ per KG) (2 cols on sm) */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-600 sm:hidden block mb-1">
                          দর / রেট (৳ / কেজি)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="০"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemField(item.id, 'unitPrice', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                                e.preventDefault();
                                e.stopPropagation();
                                totalSaleRef.current?.focus();
                                totalSaleRef.current?.select?.();
                              }
                            }}
                            className="item-price-input w-full bg-white border border-slate-300 rounded-lg pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-indigo-700 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                            ৳
                          </span>
                        </div>
                      </div>

                      {/* Line Total (2 cols on sm) */}
                      <div className="sm:col-span-2 text-right">
                        <label className="text-[10px] font-bold text-slate-600 sm:hidden block mb-1">
                          মোট টাকা
                        </label>
                        <span className="text-sm font-mono font-bold text-slate-800 block py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-right">
                          {toBengaliNumber(lineTotal)} ৳
                        </span>
                      </div>

                      {/* Action (1 col on sm) */}
                      <div className="sm:col-span-1 text-center flex sm:justify-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          title="এই আইটেম মুছে ফেলুন"
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}

                {/* Items Summary & Add Row Strip */}
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-slate-700">
                      মোট আইটেম: <strong className="text-indigo-800">{toBengaliNumber(invoiceItems.length)} টি</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-indigo-600" />
                      মোট ওজন: <strong className="text-indigo-800">{toBengaliNumber(itemsTotalWeight)} কেজি</strong>
                    </span>
                    {selectedCustomer && selectedCustomer.discountPerKg !== undefined && selectedCustomer.discountPerKg > 0 && (
                      <>
                        <span className="text-slate-300">|</span>
                        <span className="font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded border border-pink-200">
                          কাস্টমার ছাড় ({toBengaliNumber(selectedCustomer.discountPerKg)} ৳/কেজি): -{toBengaliNumber(Math.round(itemsTotalWeight * selectedCustomer.discountPerKg * 100) / 100)} ৳
                        </span>
                      </>
                    )}
                    <span className="text-slate-300">|</span>
                    <span className="font-bold text-indigo-900 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs">
                      আইটেম সর্বমোট: {toBengaliNumber(itemsSubtotal)} ৳
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddItemRow()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>আরও পণ্য যোগ করুন</span>
                    </button>
                  </div>
                </div>

              </div>

          </div>

          {/* Row 3: মোট বিক্রির টাকা ও লেস / ডিসকাউন্ট (টাকা) */}
          <div className={`grid grid-cols-1 ${selectedCustomer?.discountPerKg && selectedCustomer.discountPerKg > 0 && itemsTotalWeight === 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 sm:gap-6`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  মোট বিক্রির টাকা
                </label>
                {itemsSubtotal > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ পণ্যের তালিকা থেকে হিসাবকৃত
                  </span>
                )}
              </div>
              <input
                ref={totalSaleRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={totalSaleAmount || ''}
                onChange={(e) => setTotalSaleAmount(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (selectedCustomer?.discountPerKg && selectedCustomer.discountPerKg > 0 && itemsTotalWeight === 0) {
                      manualWeightRef.current?.focus();
                      manualWeightRef.current?.select?.();
                    } else {
                      discountRef.current?.focus();
                      discountRef.current?.select?.();
                    }
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-mono"
              />
            </div>

            {selectedCustomer?.discountPerKg && selectedCustomer.discountPerKg > 0 && itemsTotalWeight === 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-pink-700 block">
                    মোট বিক্রিত ওজন (কেজি)
                  </label>
                  <span className="text-[10px] text-pink-600 font-semibold bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                    {toBengaliNumber(selectedCustomer.discountPerKg)} ৳/কেজি ছাড়
                  </span>
                </div>
                <input
                  ref={manualWeightRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="কত কেজি মাল নিয়েছেন লিখুন..."
                  value={manualWeight || ''}
                  onChange={(e) => setManualWeight(normalizeNumericInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                      e.preventDefault();
                      e.stopPropagation();
                      discountRef.current?.focus();
                      discountRef.current?.select?.();
                    }
                  }}
                  className="w-full bg-pink-50/50 border border-pink-300 rounded-lg px-3.5 py-2 text-sm font-bold text-pink-700 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 shadow-sm font-mono"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs font-bold text-pink-600 block">
                  লেস / ডিসকাউন্ট (টাকা)
                </label>
                {selectedCustomer?.discountPerKg && selectedCustomer.discountPerKg > 0 ? (
                  <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-1.5 py-0.5 rounded border border-pink-300">
                    ✓ {toBengaliNumber(selectedCustomer.discountPerKg)} ৳/কেজি × {toBengaliNumber(effectiveTotalWeight)} কেজি = {toBengaliNumber(Math.round(effectiveTotalWeight * selectedCustomer.discountPerKg * 100) / 100)} ৳
                  </span>
                ) : null}
              </div>
              <input
                ref={discountRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={discount || ''}
                onChange={(e) => setDiscount(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    cashPaidRef.current?.focus();
                    cashPaidRef.current?.select?.();
                  }
                }}
                className="w-full bg-white border border-pink-500 rounded-lg px-3.5 py-2 text-sm font-semibold text-pink-600 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 shadow-sm font-mono"
              />
            </div>
          </div>

          {/* Row 4: ডিসকাউন্ট বাদে নীট বিক্রি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                ডিসকাউন্ট বাদে নীট বিক্রি
              </label>
              <input
                type="text"
                readOnly
                value={netSale}
                className="w-full bg-indigo-50/20 border border-indigo-400 rounded-lg px-3.5 py-2 text-sm font-bold text-indigo-900 shadow-sm select-none"
              />
            </div>
            <div>{/* Empty column matching layout */}</div>
          </div>

          {/* Row 5: Payment Container (নগদ জমা, পেমেন্ট মাধ্যম, পেমেন্টের টাকা) */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                নগদ জমা
              </label>
              <input
                ref={cashPaidRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={cashPaid || ''}
                onChange={(e) => setCashPaid(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    onlinePaidRef.current?.focus();
                    onlinePaidRef.current?.select?.();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#15803d] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                পেমেন্ট মাধ্যম
              </label>
              <select
                value={onlineMethod}
                onChange={(e: any) => setOnlineMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="bank">ব্যাংক (Bank)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#4338ca] block mb-1.5">
                পেমেন্টের টাকা
              </label>
              <input
                ref={onlinePaidRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={onlinePaid || ''}
                onChange={(e) => setOnlinePaid(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    submitButtonRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#4338ca] placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-mono"
              />
            </div>
          </div>

          {/* Row 6: মোট জমা, আজকের বাকি ও কাস্টমারের মোট বাকি */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                মোট জমা
              </label>
              <input
                type="text"
                readOnly
                value={totalPaid}
                className="w-full bg-white border border-emerald-500 rounded-lg px-3.5 py-2 text-sm font-bold text-emerald-700 shadow-sm select-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-rose-600 block mb-1.5">
                আজকের বিলের বাকি
              </label>
              <input
                type="text"
                readOnly
                value={todaysDue > 0 ? todaysDue : 0}
                className="w-full bg-white border border-rose-400 rounded-lg px-3.5 py-2 text-sm font-bold text-rose-600 shadow-sm select-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#b45309] block mb-1.5">
                কাস্টমারের মোট বকেয়া (পূর্বের + আজকের)
              </label>
              <input
                type="text"
                readOnly
                value={overallDue}
                className="w-full bg-white border border-amber-500 rounded-lg px-3.5 py-2 text-sm font-bold text-amber-700 shadow-sm select-none"
              />
            </div>
          </div>

          {/* Row 7: ক্লাউডে ইনভয়েস সেভ করুন / ইনভয়েস আপডেট করুন Button */}
          <div className="pt-2">
            <button
              ref={submitButtonRef}
              type="submit"
              className={`w-full py-3 sm:py-3.5 rounded-xl text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer ${
                activeEditingInvoice
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white ring-2 ring-emerald-300'
                  : 'bg-[#4338ca] hover:bg-[#3730a3] text-white'
              }`}
            >
              {activeEditingInvoice ? (
                <>
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
                  <span>ইনভয়েস আপডেট ও সংরক্ষণ করুন (#{activeEditingInvoice.invoiceNo})</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>ক্লাউডে ইনভয়েস সেভ করুন</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* ======================================================== */}
      {/* আজকের সাম্প্রতিক বিক্রয় ইনভয়েস তালিকা (Recent Invoices Table) */}
      {/* ======================================================== */}
      <div className="mt-8 bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800">
                  আজকের সাম্প্রতিক বিক্রয় ইনভয়েস
                </h3>
                <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {toBengaliNumber(todaysInvoices.length)} টি
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                তারিখ: <span className="font-semibold text-slate-700">{toBengaliNumber(invoiceDate)}</span>
              </p>
            </div>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="মেমো বা কাস্টমার খুঁজুন..."
              value={recentSearch}
              onChange={(e) => setRecentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Informational Stock Auto-Return Callout */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <span className="text-sm">💡</span>
          <span className="font-medium">
            <strong>অটো স্টক রিটার্ন সুবিধা:</strong> ভুলবশত কোনো বিক্রয় ইনভয়েস ডিলিট করলে এর বিক্রিকৃত প্রতিটি পণ্যের ওজন/পরিমাণ স্বয়ংক্রিয়ভাবে আবার ক্যাটালগ স্টকে ফেরত যোগ হয়ে যাবে।
          </span>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">মেমো নং</th>
                <th className="py-2.5 px-3">সময়</th>
                <th className="py-2.5 px-3">কাস্টমার</th>
                <th className="py-2.5 px-3">বিক্রিকৃত মালামাল</th>
                <th className="py-2.5 px-3 text-right">মোট বিল</th>
                <th className="py-2.5 px-3 text-right">জমা</th>
                <th className="py-2.5 px-3 text-right">বাকি</th>
                <th className="py-2.5 px-3 text-center">অবস্থা</th>
                <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todaysInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    {recentSearch ? 'কোনো ইনভয়েস খুঁজে পাওয়া যায়নি।' : 'আজকের তারিখে এখনো কোনো ইনভয়েস তৈরি করা হয়নি। উপরে ফর্ম পূরণ করে ইনভয়েস সেভ করুন।'}
                  </td>
                </tr>
              ) : (
                todaysInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-extrabold text-indigo-700 whitespace-nowrap">
                      #{inv.invoiceNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {inv.time || toBengaliNumber(inv.createdAt?.split('T')[1]?.slice(0, 5) || '')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <div>{inv.customerName || 'সাধারণ ক্যাশ কাস্টমার'}</div>
                      {inv.customerPhone && (
                        <div className="text-[10px] text-slate-400">{inv.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[240px]">
                      {Array.isArray(inv.items) && inv.items.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {inv.items.map((it, idx) => (
                            <span 
                              key={idx}
                              className="inline-block bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            >
                              {it.name} ({toBengaliNumber(it.quantity)} {it.unit || 'কেজি'})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">মালামাল বিক্রয়</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {toBengaliNumber(inv.grandTotal)} ৳
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {toBengaliNumber((inv.cashPaid || 0) + (inv.onlinePaid || 0))} ৳
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 whitespace-nowrap">
                      {toBengaliNumber(inv.dueAmount || 0)} ৳
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {inv.status === 'paid' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          পরিশোধিত
                        </span>
                      ) : inv.status === 'partial' ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          আংশিক
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                          বাকি
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadInvoiceForEditing(inv)}
                          title="ইনভয়েস ও বিক্রিত পণ্যের বিবরণ ফর্মে এডিট করুন"
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0 ${
                            activeEditingInvoice?.id === inv.id
                              ? 'bg-amber-500 text-white border border-amber-600 ring-2 ring-amber-300'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{activeEditingInvoice?.id === inv.id ? 'এডিটিং...' : 'এডিট'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceToPrint(inv)}
                          title="ইনভয়েস প্রিন্ট করুন"
                          className="p-1.5 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {canEditOrDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              confirmAction({
                                title: 'ইনভয়েস মুছে ফেলা',
                                message: `আপনি কি নিশ্চিত মেমো #${inv.invoiceNo} (${inv.customerName}) মুছে ফেলতে চান?\n\nএটি মুছে ফেললে এই মেমোতে বিক্রিত সমস্ত মালামাল স্বয়ংক্রিয়ভাবে আবার স্টকে ফেরত যোগ হয়ে যাবে।`,
                                confirmLabel: 'হ্যাঁ, মেমো মুছুন',
                                onConfirm: () => {
                                  deleteInvoice(inv.id);
                                  if (lastSavedInvoice?.id === inv.id) {
                                    setLastSavedInvoice(null);
                                  }
                                  setSuccessMessage(`ইনভয়েস #${inv.invoiceNo} মুছে ফেলা হয়েছে এবং মালামাল স্বয়ংক্রিয়ভাবে স্টকে ফেরত যোগ হয়েছে!`);
                                  setTimeout(() => setSuccessMessage(''), 4500);
                                }
                              });
                            }}
                            title="ইনভয়েস মুছুন (মালামাল স্টকে ফেরত যাবে)"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-md transition shadow-2xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ======================================================== */}
      {/* ADD NEW PRODUCT MODAL (ক্যাটালগে নতুন প্রোডাক্ট যুক্ত করুন) */}
      {/* ======================================================== */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold">নতুন প্রোডাক্ট যুক্ত করুন</h3>
                  <p className="text-[11px] text-indigo-200">
                    ক্যাটালগে সেভ হবে এবং ইনভয়েসে স্বয়ংক্রিয়ভাবে বসে যাবে
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProductModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNewProduct} className="p-5 space-y-4">
              
              {newProdError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{newProdError}</span>
                </div>
              )}

              {/* Product Name */}
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
                  placeholder="যেমন: BRB কপার ওয়্যার / বিএসআরএম রড"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Purchase Price & Sale Price */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Purchase Price (৳/কেজি)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newProdPurchasePrice}
                    onChange={(e) => setNewProdPurchasePrice(normalizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">ক্রয় মূল্য প্রতি কেজি</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-700 block mb-1">
                    Sale Price (৳/কেজি) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={newProdSalePrice}
                    onChange={(e) => setNewProdSalePrice(normalizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-white border border-indigo-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-indigo-600 mt-0.5 block">বিক্রয় মূল্য প্রতি কেজি</span>
                </div>
              </div>

              {/* Current Stock (KG) & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-emerald-800 block mb-1">
                    প্রারম্ভিক মজুদ (Stock) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(normalizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">বর্তমানে গুদামে কত কেজি আছে</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    পরিমাপক একক (Unit)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="KG (কেজি)"
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">একক সর্বদা কেজি (KG)</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ক্যাটালগে সেভ ও ইনভয়েসে যুক্ত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>👤 নতুন কাস্টমার এন্ট্রি</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {newCustError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{newCustError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  কাস্টমারের নাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  placeholder="01xxxxxxxxx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(normalizeInputDigits(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ঠিকানা
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চকবাজার, ঢাকা"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  পূর্বের বাকি (Opening Due) ৳
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={newCustOpeningDue}
                  onChange={(e) => setNewCustOpeningDue(normalizeNumericInput(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Discount Per KG */}
              <div className="bg-pink-50/60 p-3 rounded-xl border border-pink-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-pink-700">
                    🏷️ ডিসকাউন্ট / ছাড় (প্রতি কেজি ৳)
                  </label>
                  <span className="text-[10px] text-pink-600 font-semibold bg-pink-100 px-1.5 py-0.5 rounded border border-pink-200">
                    প্রতি কেজিতে ছাড়
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="যেমন: ২ (প্রতি কেজিতে যত টাকা ছাড় পাবে)"
                  value={newCustDiscountPerKg}
                  onChange={(e) => setNewCustDiscountPerKg(normalizeNumericInput(e.target.value))}
                  className="w-full bg-white border border-pink-300 rounded-lg px-3 py-2 text-xs font-bold text-pink-700 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                />
                <p className="text-[10.5px] text-slate-500 mt-1.5">
                  💡 এই কাস্টমার যত কেজি কেনাকাটা করবে, প্রতি কেজিতে স্বয়ংক্রিয়ভাবে এই পরিমাণ টাকা ছাড় পাবে।
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  নোট / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="যেমন: নিয়মিত গ্রাহক..."
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>কাস্টমার সেভ ও ইনভয়েসে নির্বাচন করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End of Modals */}

    </div>
  );
};
