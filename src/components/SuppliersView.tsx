import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { ArrowLeft, Truck, Search, Plus, Phone, MapPin, Edit, Trash2, History, Printer, Calendar, Filter, RotateCcw, Eye } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatCurrency, formatDate, extractSupplierBillItems } from '../utils/formatters';

export const SuppliersView: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, setSuppliers, supplierBills, supplierPayments, moveToRecycleBin, canEditOrDelete, confirmAction } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewSupplierLedger, setViewSupplierLedger] = useState<Supplier | null>(null);

  // Date filter state for Supplier Ledger statement
  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = `${todayStr.substring(0, 7)}-01`;
  const [statementStartDate, setStatementStartDate] = useState<string>(firstDayOfMonth);
  const [statementEndDate, setStatementEndDate] = useState<string>(todayStr);
  const [filterApplied, setFilterApplied] = useState<boolean>(false);

  // Form inputs
  const [name, setName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [openingPayable, setOpeningPayable] = useState<string>("");

  // Form refs for Enter navigation
  const supCompanyRef = useRef<HTMLInputElement>(null);
  const supNameRef = useRef<HTMLInputElement>(null);
  const supPhoneRef = useRef<HTMLInputElement>(null);
  const supAddressRef = useRef<HTMLInputElement>(null);
  const supOpeningPayableRef = useRef<HTMLInputElement>(null);
  const supSubmitRef = useRef<HTMLButtonElement>(null);

  // Map suppliers dynamically with full transaction history and opening payable
  const mappedSuppliers = useMemo(() => {
    return suppliers.map(s => {
      const opening = toEnglishNumber((s.openingPayable ?? s.openingBalance ?? s.previousDue ?? 0).toString()) || 0;
      const sBills = supplierBills.filter(b => b.supplierId === s.id);
      const sPayments = supplierPayments.filter(p => p.supplierId === s.id);

      const totalPurchased = sBills.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
      const totalKg = sBills.reduce((sum, b) => {
        const items = extractSupplierBillItems(b);
        return sum + items.reduce((isum, it) => isum + (Number(it.quantity) || 0), 0);
      }, 0);
      const billsPaid = sBills.reduce((sum, b) => sum + ((Number(b.cashPaid) || 0) + (Number(b.onlinePaid) || 0)), 0);
      const directPayments = sPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalPaid = billsPaid + directPayments;

      const calculatedPayable = Math.max(0, opening + totalPurchased - totalPaid);

      return {
        ...s,
        openingPayable: opening,
        openingBalance: opening,
        previousDue: opening,
        totalPurchased: totalPurchased,
        totalKg: totalKg,
        totalPaid: totalPaid,
        currentPayable: calculatedPayable
      };
    });
  }, [suppliers, supplierBills, supplierPayments]);

  const filteredSuppliers = mappedSuppliers.filter(s =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery) ||
    (s.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSupplierPayableAll = mappedSuppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyName.trim()) return;

    const cleanOpening = toEnglishNumber(openingPayable ? openingPayable.toString() : '0');

    if (editingSupplier) {
      const oldOpening = toEnglishNumber((editingSupplier.openingPayable ?? editingSupplier.openingBalance ?? editingSupplier.previousDue ?? 0).toString());
      const diff = cleanOpening - oldOpening;
      const updatedSup: Supplier = {
        ...editingSupplier,
        name: name.trim(),
        companyName: companyName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingPayable: cleanOpening,
        openingBalance: cleanOpening,
        previousDue: cleanOpening,
        currentPayable: Math.max(0, (Number(editingSupplier.currentPayable) || 0) + diff)
      };
      updateSupplier(editingSupplier.id, updatedSup);
    } else {
      const newSup: Supplier = {
        id: 's_' + Date.now(),
        name: name.trim(),
        companyName: companyName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingPayable: cleanOpening,
        openingBalance: cleanOpening,
        previousDue: cleanOpening,
        totalPurchased: 0,
        totalPaid: 0,
        currentPayable: cleanOpening,
        createdDate: new Date().toISOString().split('T')[0]
      };
      addSupplier(newSup);
    }

    setShowAddModal(false);
    setEditingSupplier(null);
    setName('');
    setCompanyName('');
    setPhone('');
    setAddress('');
    setOpeningPayable("");
  };

  const handleOpenEdit = (sup: Supplier) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো সাপ্লায়ার এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingSupplier(sup);
    setName(sup.name);
    setCompanyName(sup.companyName);
    setPhone(sup.phone);
    setAddress(sup.address);
    setOpeningPayable(String(sup.openingPayable ?? sup.openingBalance ?? sup.previousDue ?? ""));
    setShowAddModal(true);
  };

  const handleDelete = (sup: Supplier) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো সাপ্লায়ার ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'সাপ্লায়ার মুছে ফেলুন',
      message: `আপনি কি সাপ্লায়ার ${sup.companyName}-কে রিসাইকেল বিনে পাঠাতে চান?`,
      confirmText: 'হ্যাঁ, মুছুন',
      isDestructive: true,
      onConfirm: () => {
        moveToRecycleBin('supplier', `সাপ্লায়ার: ${sup.companyName} (${sup.name})`, sup, sup.currentPayable);
        setSuppliers(prev => prev.filter(s => s.id !== sup.id));
      }
    });
  };

  const [activeLedgerTab, setActiveLedgerTab] = useState<'ledger' | 'bills' | 'payments'>('ledger');

  const activeSup = viewSupplierLedger
    ? (suppliers.find(s => s.id === viewSupplierLedger.id) || viewSupplierLedger)
    : null;

  const handleOpenLedgerPage = (sup: Supplier) => {
    setViewSupplierLedger(sup);
    setStatementStartDate(firstDayOfMonth);
    setStatementEndDate(todayStr);
    setFilterApplied(false);
    setActiveLedgerTab('ledger');
  };

  const handleQuickDateFilter = (preset: 'today' | '7days' | 'this_month' | 'last_month' | 'all') => {
    if (preset === 'today') {
      setStatementStartDate(todayStr);
      setStatementEndDate(todayStr);
      setFilterApplied(true);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStatementStartDate(d.toISOString().split('T')[0]);
      setStatementEndDate(todayStr);
      setFilterApplied(true);
    } else if (preset === 'this_month') {
      setStatementStartDate(firstDayOfMonth);
      setStatementEndDate(todayStr);
      setFilterApplied(true);
    } else if (preset === 'last_month') {
      const now = new Date();
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStatementStartDate(firstDayLastMonth);
      setStatementEndDate(lastDayLastMonth);
      setFilterApplied(true);
    } else {
      setFilterApplied(false);
      setStatementStartDate(firstDayOfMonth);
      setStatementEndDate(todayStr);
    }
  };

  interface CombinedItem {
    id: string;
    date: string;
    rawDate: string;
    type: 'bill' | 'payment';
    refNo: string;
    description: string;
    method: string;
    totalKg: number;
    billAmount: number;
    paidAmount: number;
    runningBalance?: number;
  }

  // Compute ledger entries dynamically based on selected date filter
  const ledgerComputation = useMemo(() => {
    if (!activeSup) {
      return {
        rows: [] as CombinedItem[],
        periodOpeningPayable: 0,
        periodPurchased: 0,
        periodKg: 0,
        periodPaid: 0,
        periodEndBalance: 0,
        allBills: [] as typeof supplierBills,
        allPayments: [] as typeof supplierPayments
      };
    }

    const bills = supplierBills.filter(b => b.supplierId === activeSup.id);
    const payments = supplierPayments.filter(p => p.supplierId === activeSup.id);

    const allItems: CombinedItem[] = [];

    bills.forEach(b => {
      const bItems = extractSupplierBillItems(b);
      const bKg = bItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      allItems.push({
        id: b.id,
        date: formatDate(b.date),
        rawDate: b.date || '',
        type: 'bill',
        refNo: b.billNo || '-',
        description: b.itemsDescription ? `মাল ক্রয়: ${b.itemsDescription}` : 'মাল ক্রয় (বিল)',
        method: (Number(b.cashPaid || 0) > 0 && Number(b.onlinePaid || 0) > 0)
          ? 'ক্যাশ + অনলাইন'
          : (Number(b.onlinePaid || 0) > 0 ? 'অনলাইন' : (Number(b.cashPaid || 0) > 0 ? 'ক্যাশ' : 'বাকি')),
        totalKg: bKg,
        billAmount: Number(b.totalAmount) || 0,
        paidAmount: (Number(b.cashPaid) || 0) + (Number(b.onlinePaid) || 0)
      });
    });

    payments.forEach(p => {
      allItems.push({
        id: p.id,
        date: formatDate(p.date),
        rawDate: p.date || '',
        type: 'payment',
        refNo: p.receiptNo || 'রশিদ',
        description: p.notes ? `বকেয়া পরিশোধ (${p.notes})` : 'বকেয়া পরিশোধ',
        method: p.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ',
        totalKg: 0,
        billAmount: 0,
        paidAmount: Number(p.amount) || 0
      });
    });

    allItems.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    const initialOpening = Number(activeSup.openingPayable ?? activeSup.openingBalance ?? activeSup.previousDue ?? 0) || 0;

    let periodOpeningPayable = initialOpening;
    let targetItems = allItems;

    if (filterApplied && statementStartDate && statementEndDate) {
      // Calculate opening payable before statementStartDate
      const beforeStartItems = allItems.filter(item => (item.rawDate || '').substring(0, 10) < statementStartDate);
      const netBefore = beforeStartItems.reduce((sum, item) => sum + item.billAmount - item.paidAmount, 0);
      periodOpeningPayable = initialOpening + netBefore;

      targetItems = allItems.filter(item => {
        const d = (item.rawDate || '').substring(0, 10);
        return d >= statementStartDate && d <= statementEndDate;
      });
    }

    // Calculate running balance for the target period
    let currentBalance = periodOpeningPayable;
    const rows = targetItems.map(item => {
      currentBalance = currentBalance + item.billAmount - item.paidAmount;
      return {
        ...item,
        runningBalance: currentBalance
      };
    });

    const periodPurchased = targetItems.reduce((sum, item) => sum + item.billAmount, 0);
    const periodKg = targetItems.reduce((sum, item) => sum + (item.totalKg || 0), 0);
    const periodPaid = targetItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const periodEndBalance = currentBalance;

    return {
      rows,
      periodOpeningPayable,
      periodPurchased,
      periodKg,
      periodPaid,
      periodEndBalance,
      allBills: filterApplied && statementStartDate && statementEndDate 
        ? bills.filter(b => {
            const d = (b.date || '').substring(0, 10);
            return d >= statementStartDate && d <= statementEndDate;
          }) 
        : bills,
      allPayments: filterApplied && statementStartDate && statementEndDate 
        ? payments.filter(p => {
            const d = (p.date || '').substring(0, 10);
            return d >= statementStartDate && d <= statementEndDate;
          }) 
        : payments
    };
  }, [activeSup, supplierBills, supplierPayments, filterApplied, statementStartDate, statementEndDate]);

  // Print Supplier Ledger Statement (with optional date range filter)
  const handlePrintSupplierLedger = (
    sup: Supplier, 
    dateFilter?: { startDate: string; endDate: string }
  ) => {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    // Bills & Payments
    const bills = supplierBills.filter(b => b.supplierId === sup.id);
    const payments = supplierPayments.filter(p => p.supplierId === sup.id);

    interface LedgerItem {
      date: string;
      rawDate: string;
      refNo: string;
      description: string;
      method: string;
      totalKg: number;
      billAmount: number;
      paidAmount: number;
    }

    const allItems: LedgerItem[] = [];

    // Add Bills
    bills.forEach(b => {
      const bItems = extractSupplierBillItems(b);
      const bKg = bItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      allItems.push({
        date: formatDate(b.date),
        rawDate: b.date || '',
        refNo: b.billNo || '-',
        description: b.itemsDescription ? `মাল ক্রয়: ${b.itemsDescription}` : 'মাল ক্রয় (বিল)',
        method: (Number(b.cashPaid || 0) > 0 && Number(b.onlinePaid || 0) > 0)
          ? 'ক্যাশ + অনলাইন'
          : (Number(b.onlinePaid || 0) > 0 ? 'অনলাইন' : (Number(b.cashPaid || 0) > 0 ? 'ক্যাশ' : 'বাকি')),
        totalKg: bKg,
        billAmount: Number(b.totalAmount) || 0,
        paidAmount: (Number(b.cashPaid) || 0) + (Number(b.onlinePaid) || 0)
      });
    });

    // Add Payments
    payments.forEach(p => {
      allItems.push({
        date: formatDate(p.date),
        rawDate: p.date || '',
        refNo: p.receiptNo || 'রশিদ',
        description: p.notes ? `বকেয়া পরিশোধ (${p.notes})` : 'বকেয়া পরিশোধ',
        method: p.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ',
        totalKg: 0,
        billAmount: 0,
        paidAmount: Number(p.amount) || 0
      });
    });

    // Sort ascending by rawDate
    allItems.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    const initialOpening = Number(sup.openingPayable ?? sup.openingBalance ?? sup.previousDue ?? 0) || 0;
    let periodOpening = initialOpening;
    let targetItems = allItems;

    if (dateFilter && dateFilter.startDate && dateFilter.endDate) {
      const beforeItems = allItems.filter(item => (item.rawDate || '').substring(0, 10) < dateFilter.startDate);
      const netBefore = beforeItems.reduce((sum, item) => sum + item.billAmount - item.paidAmount, 0);
      periodOpening = initialOpening + netBefore;
      targetItems = allItems.filter(item => {
        const d = (item.rawDate || '').substring(0, 10);
        return d >= dateFilter.startDate && d <= dateFilter.endDate;
      });
    }

    // Calculate running balance
    let runningBalance = periodOpening;
    const ledgerRows = targetItems.map(item => {
      runningBalance = runningBalance + item.billAmount - item.paidAmount;
      return {
        ...item,
        runningBalance
      };
    });

    const totalPurchased = targetItems.reduce((sum, item) => sum + item.billAmount, 0);
    const totalKg = targetItems.reduce((sum, item) => sum + (item.totalKg || 0), 0);
    const totalPaid = targetItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const finalBalance = runningBalance;

    const currentDate = formatDate(new Date());
    const dateRangeText = (dateFilter && dateFilter.startDate && dateFilter.endDate)
      ? `${formatDate(dateFilter.startDate)} হতে ${formatDate(dateFilter.endDate)}`
      : 'সর্বমোট হিসাব (All Time)';

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title></title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          body { 
            font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; 
            margin: 0; 
            padding: 15px; 
            color: #0f172a; 
            background: #fff; 
            font-size: 11.5px; 
          }
          .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 6px; margin-bottom: 12px; }
          .shop-name { font-size: 22px; font-weight: 900; color: #6d28d9; margin: 0; }
          .shop-sub { font-size: 11px; color: #475569; margin: 3px 0 0 0; }
          .doc-title { 
            font-size: 15px; 
            font-weight: 800; 
            color: #1e1b4b; 
            margin-top: 6px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sup-info-box { 
            background: #faf5ff; 
            border: 1px solid #e9d5ff; 
            border-radius: 8px; 
            padding: 8px 12px; 
            margin-bottom: 12px; 
            display: flex; 
            justify-content: space-between; 
            font-size: 11.5px; 
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin-bottom: 12px;
          }
          .stat-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 10px;
            background: #f8fafc;
            text-align: center;
          }
          .stat-label {
            font-size: 10.5px;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .stat-value {
            font-size: 14px;
            font-weight: 800;
            color: #1e293b;
          }
          .stat-value.highlight {
            color: #7c3aed;
          }
          .stat-value.paid {
            color: #059669;
          }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { 
            background-color: #f3e8ff; 
            color: #581c87; 
            font-weight: 700; 
            border: 1px solid #d8b4fe; 
            padding: 6px 6px; 
            text-align: left; 
          }
          td { border: 1px solid #e2e8f0; padding: 5px 6px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bill-col { color: #1e293b; font-weight: 600; }
          .paid-col { color: #059669; font-weight: 700; }
          .balance-col { color: #7c3aed; font-weight: 800; }
          .total-row { background-color: #f5f3ff; font-weight: 800; border-top: 2px solid #7c3aed; }
          .opening-row { background-color: #faf5ff; font-style: italic; color: #475569; }
          .footer { 
            margin-top: 35px; 
            display: flex; 
            justify-content: space-between; 
            padding-top: 15px; 
          }
          .sig-line { 
            border-top: 1px dashed #94a3b8; 
            width: 170px; 
            text-align: center; 
            font-size: 10.5px; 
            color: #475569; 
            padding-top: 4px; 
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
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            th { background-color: #f3e8ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .total-row { background-color: #f5f3ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        </div>

        <div class="sup-info-box">
          <div>
            <strong>প্রতিষ্ঠানের নাম:</strong> ${sup.companyName}<br>
            <strong>প্রতিনিধি / মালিক:</strong> ${sup.name || 'দেওয়া নেই'}<br>
            <strong>মোবাইল:</strong> ${sup.phone || 'দেওয়া নেই'} | <strong>ঠিকানা:</strong> ${sup.address || 'দেওয়া নেই'}
          </div>
          <div style="text-align: right;">
            <strong>স্টেটমেন্ট তারিখ:</strong> ${currentDate}<br>
            <strong>সময়সীমা:</strong> ${dateRangeText}<br>
            <strong>বর্তমান নিট প্রদেয় (Payable):</strong> <span style="color: #7c3aed; font-weight: 900; font-size: 14px;">${toBengaliNumber(finalBalance)} ৳</span>
          </div>
        </div>

        <div class="summary-grid">
          <div class="stat-card">
            <div class="stat-label">পূর্বের দেনা (Opening)</div>
            <div class="stat-value">${toBengaliNumber(periodOpening)} ৳</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">মাল ক্রয় (Purchased)</div>
            <div class="stat-value">${toBengaliNumber(totalPurchased)} ৳</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">মাল ক্রয় (ওজন/কেজি)</div>
            <div class="stat-value" style="color: #6d28d9;">${toBengaliNumber(totalKg)} কেজি</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">মোট পরিশোধ (Total Paid)</div>
            <div class="stat-value paid">${toBengaliNumber(totalPaid)} ৳</div>
          </div>
          <div class="stat-card" style="background: #faf5ff; border-color: #d8b4fe;">
            <div class="stat-label" style="color: #6b21a8;">সমাপনী দেনা (Net Due)</div>
            <div class="stat-value highlight">${toBengaliNumber(finalBalance)} ৳</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px;" class="text-center">নং</th>
              <th style="width: 75px;">তারিখ</th>
              <th style="width: 80px;">বিল/রশিদ নং</th>
              <th style="width: 75px;" class="text-center">পরিমাণ (কেজি)</th>
              <th style="width: 75px;">মাধ্যম</th>
              <th style="width: 90px;" class="text-right">ক্রয় / বিল (+)</th>
              <th style="width: 90px;" class="text-right">পরিশোধ (-)</th>
              <th style="width: 100px;" class="text-right">অবশিষ্ট দেনা</th>
            </tr>
          </thead>
          <tbody>
            <tr class="opening-row">
              <td class="text-center">-</td>
              <td>${dateFilter ? toBengaliNumber(formatDate(dateFilter.startDate)) + ' পূর্বের' : 'প্রারম্ভিক'}</td>
              <td>-</td>
              <td class="text-center">-</td>
              <td>-</td>
              <td class="text-right">-</td>
              <td class="text-right">-</td>
              <td class="text-right balance-col">${toBengaliNumber(periodOpening)} ৳</td>
            </tr>
            ${ledgerRows.length === 0 ? `
              <tr>
                <td colspan="8" class="text-center" style="padding: 15px; color: #94a3b8;">
                  নির্বাচিত সময়ে কোনো লেনদেনের রেকর্ড নেই
                </td>
              </tr>
            ` : ledgerRows.map((r, idx) => `
              <tr>
                <td class="text-center">${toBengaliNumber(idx + 1)}</td>
                <td class="text-center" style="font-family: monospace;">${formatDate(r.date)}</td>
                <td style="font-weight: 700; color: #6d28d9;">${r.refNo}</td>
                <td class="text-center" style="font-weight: 700; color: #6d28d9;">${r.totalKg > 0 ? `${toBengaliNumber(r.totalKg)} কেজি` : '-'}</td>
                <td>${r.method}</td>
                <td class="text-right bill-col">${r.billAmount > 0 ? toBengaliNumber(r.billAmount) + ' ৳' : '-'}</td>
                <td class="text-right paid-col">${r.paidAmount > 0 ? toBengaliNumber(r.paidAmount) + ' ৳' : '-'}</td>
                <td class="text-right balance-col">${toBengaliNumber(r.runningBalance)} ৳</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" class="text-right"><strong>সর্বমোট হিসাব:</strong></td>
              <td class="text-center" style="font-weight: 800; color: #6d28d9;"><strong>${toBengaliNumber(totalKg)} কেজি</strong></td>
              <td></td>
              <td class="text-right bill-col"><strong>${toBengaliNumber(totalPurchased)} ৳</strong></td>
              <td class="text-right paid-col"><strong>${toBengaliNumber(totalPaid)} ৳</strong></td>
              <td class="text-right balance-col"><strong>${toBengaliNumber(finalBalance)} ৳</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div class="sig-line">হিসাবরক্ষক / প্রস্তুতকারক</div>
          <div class="sig-line">মহাজন / সাপ্লায়ার স্বাক্ষর</div>
          <div class="sig-line">স্বত্বাধিকারী / কর্তৃপক্ষ</div>
        </div>

        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 25px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
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

  // Dedicated Page View for Supplier Ledger when a supplier is selected
  if (activeSup) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Top Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewSupplierLedger(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-purple-700" />
              <span>সকল সাপ্লায়ার তালিকায় ফিরুন</span>
            </button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-purple-950">
                  {activeSup.companyName}
                </h2>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  সাপ্লায়ার লেজার পেজ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>মালিক / প্রতিনিধি: <strong className="text-slate-700 font-semibold">{activeSup.name}</strong></span>
                {activeSup.phone && <span>মোবাইল: <strong className="text-slate-700 font-mono">{activeSup.phone}</strong></span>}
                {activeSup.address && <span>ঠিকানা: <strong className="text-slate-700">{activeSup.address}</strong></span>}
                <span>মূল প্রারম্ভিক দেনা: <strong className="text-slate-700">{toBengaliNumber(activeSup.openingPayable || 0)} ৳</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handlePrintSupplierLedger(
                activeSup,
                filterApplied && statementStartDate && statementEndDate ? { startDate: statementStartDate, endDate: statementEndDate } : undefined
              )}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{filterApplied ? 'নির্বাচিত স্টেটমেন্ট প্রিন্ট' : 'লেজার স্টেটমেন্ট প্রিন্ট'}</span>
            </button>
          </div>
        </div>

        {/* Date Filter & Control Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>স্টেটমেন্ট সময়সীমা ফিল্টার (তারিখ অনুযায়ী স্টেটমেন্ট চেক):</span>
            </div>

            {/* Quick Filter Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1">কুইক ফিল্টার:</span>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('today')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  filterApplied && statementStartDate === todayStr && statementEndDate === todayStr
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('7days')}
                className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                গত ৭ দিন
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('this_month')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  filterApplied && statementStartDate === firstDayOfMonth && statementEndDate === todayStr
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                চলতি মাস
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('last_month')}
                className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                গত মাস
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  !filterApplied
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                সকল রেকর্ড (রিসেট)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">শুরুর তারিখ:</label>
              <input
                type="date"
                value={statementStartDate}
                onChange={(e) => setStatementStartDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">শেষের তারিখ:</label>
              <input
                type="date"
                value={statementEndDate}
                onChange={(e) => setStatementEndDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (!statementStartDate || !statementEndDate) return;
                setFilterApplied(true);
              }}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>ফিল্টার প্রয়োগ করুন</span>
            </button>

            {filterApplied && (
              <button
                type="button"
                onClick={() => handleQuickDateFilter('all')}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ফিল্টার রিসেট</span>
              </button>
            )}

            <div className="ml-auto">
              <button
                type="button"
                onClick={() => handlePrintSupplierLedger(
                  activeSup,
                  filterApplied && statementStartDate && statementEndDate ? { startDate: statementStartDate, endDate: statementEndDate } : undefined
                )}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্টেটমেন্ট প্রিন্ট (Print)</span>
              </button>
            </div>
          </div>

          {filterApplied && statementStartDate && statementEndDate && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-900 flex flex-wrap items-center justify-between gap-2">
              <span>
                📌 ফিল্টার কার্যকর: <strong className="font-bold">{formatDate(statementStartDate)} হতে {formatDate(statementEndDate)}</strong> পর্যন্ত হিসাব স্টেটমেন্ট প্রদর্শিত হচ্ছে।
              </span>
              <span className="text-[11px] text-purple-700 font-semibold">
                (নির্বাচিত সময়ে মোট লেনদেন: {toBengaliNumber(ledgerComputation.rows.length)} টি)
              </span>
            </div>
          )}
        </div>

        {/* 5 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              {filterApplied ? `${formatDate(statementStartDate)} এর পূর্বের দেনা` : 'প্রারম্ভিক পাওনা (Opening Due)'}
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-800">
              {toBengaliNumber(ledgerComputation.periodOpeningPayable)} ৳
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              {filterApplied ? 'নির্বাচিত সময়ে মাল ক্রয় (+)' : 'মোট মাল ক্রয় (+)'}
            </div>
            <div className="text-base sm:text-lg font-bold text-indigo-700">
              {toBengaliNumber(ledgerComputation.periodPurchased)} ৳
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              মোট বিল: {toBengaliNumber(ledgerComputation.allBills.length)} টি
            </div>
          </div>

          <div className="bg-purple-50/60 rounded-xl p-3.5 border border-purple-200 shadow-xs">
            <div className="text-[11px] font-bold text-purple-900 mb-1">
              {filterApplied ? 'নির্বাচিত মাল ক্রয় (ওজন)' : 'মোট মাল ক্রয় (ওজন/কেজি)'}
            </div>
            <div className="text-base sm:text-lg font-extrabold text-purple-800">
              {toBengaliNumber(ledgerComputation.periodKg)} কেজি
            </div>
            <div className="text-[10px] text-purple-600 mt-0.5 font-medium">
              মোট ওজন: {toBengaliNumber(ledgerComputation.periodKg)} কেজি
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              {filterApplied ? 'নির্বাচিত সময়ে পরিশোধ (-)' : 'মোট পরিশোধ (-)'}
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-700">
              {toBengaliNumber(ledgerComputation.periodPaid)} ৳
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              মোট পরিশোধ: {toBengaliNumber(ledgerComputation.allPayments.length)} টি
            </div>
          </div>

          <div className="bg-purple-50/80 rounded-xl p-3.5 border border-purple-200 shadow-xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-purple-800 mb-1">
              {filterApplied ? 'সমাপনী দেনা (Closing Payable)' : 'বর্তমান প্রদেয় দেনা (Net Payable)'}
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-purple-700">
              {toBengaliNumber(ledgerComputation.periodEndBalance)} ৳
            </div>
            <div className="text-[10px] text-purple-600 mt-0.5 font-medium">
              মহাজন / সাপ্লায়ার পাবে
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveLedgerTab('ledger')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeLedgerTab === 'ledger'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            সম্মিলিত লেজার খতিয়ান ({toBengaliNumber(ledgerComputation.rows.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveLedgerTab('bills')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeLedgerTab === 'bills'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ক্রয় বিলের তালিকা ({toBengaliNumber(ledgerComputation.allBills.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveLedgerTab('payments')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeLedgerTab === 'payments'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            পরিশোধের রসিদসমূহ ({toBengaliNumber(ledgerComputation.allPayments.length)})
          </button>
        </div>

        {/* Tab 1: Combined Ledger Table */}
        {activeLedgerTab === 'ledger' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 text-center">নং</th>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">বিল / রশিদ নং</th>
                    <th className="p-3">বিবরণের ধরণ</th>
                    <th className="p-3 text-center">পরিমাণ (কেজি)</th>
                    <th className="p-3">মাধ্যম</th>
                    <th className="p-3 text-right">মাল ক্রয় / বিল (+)</th>
                    <th className="p-3 text-right">পরিশোধ (-)</th>
                    <th className="p-3 text-right">অবশিষ্ট দেনা (জের)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-purple-50/40 font-semibold text-slate-700">
                    <td className="p-3 text-center text-slate-400">-</td>
                    <td className="p-3 font-mono text-purple-900">
                      {filterApplied ? `${formatDate(statementStartDate)} পূর্বের` : 'প্রারম্ভিক'}
                    </td>
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3 text-purple-800 font-bold">পূর্বের বকেয়া জের</td>
                    <td className="p-3 text-center text-slate-400">-</td>
                    <td className="p-3 text-slate-400">-</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right font-bold text-purple-700">
                      {toBengaliNumber(ledgerComputation.periodOpeningPayable)} ৳
                    </td>
                  </tr>

                  {ledgerComputation.rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                        নির্বাচিত সময়ে কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    ledgerComputation.rows.map((row, idx) => (
                      <tr key={row.id + idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                        <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="p-3 font-bold text-purple-900 font-mono">{row.refNo}</td>
                        <td className="p-3">
                          {row.type === 'bill' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                              মাল ক্রয় (বিল)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              পরিশোধ রসিদ
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {row.totalKg > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-100 whitespace-nowrap">
                              {toBengaliNumber(row.totalKg)} কেজি
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{row.method}</td>
                        <td className="p-3 text-right font-bold text-indigo-700">
                          {row.billAmount > 0 ? `${toBengaliNumber(row.billAmount)} ৳` : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {row.paidAmount > 0 ? `${toBengaliNumber(row.paidAmount)} ৳` : '-'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-purple-800 text-sm">
                          {toBengaliNumber(row.runningBalance)} ৳
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">সর্বমোট হিসাব (Total Summary):</td>
                    <td className="p-3 text-center text-purple-800 font-extrabold">
                      {ledgerComputation.periodKg > 0 ? `${toBengaliNumber(ledgerComputation.periodKg)} কেজি` : '-'}
                    </td>
                    <td></td>
                    <td className="p-3 text-right text-indigo-700 font-extrabold">
                      {toBengaliNumber(ledgerComputation.periodPurchased)} ৳
                    </td>
                    <td className="p-3 text-right text-emerald-700 font-extrabold">
                      {toBengaliNumber(ledgerComputation.periodPaid)} ৳
                    </td>
                    <td className="p-3 text-right text-purple-700 font-extrabold text-sm">
                      {toBengaliNumber(ledgerComputation.periodEndBalance)} ৳
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Supplier Bills */}
        {activeLedgerTab === 'bills' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 text-center">নং</th>
                    <th className="p-3">বিল নং</th>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">মালের বিবরণ</th>
                    <th className="p-3 text-center">পরিমাণ (কেজি)</th>
                    <th className="p-3 text-right">ক্যাশ পরিশোধ</th>
                    <th className="p-3 text-right">অনলাইন পরিশোধ</th>
                    <th className="p-3 text-right">বকেয়া</th>
                    <th className="p-3 text-right">মোট বিলের টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ledgerComputation.allBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                        নির্বাচিত সময়ে কোনো ক্রয় বিল পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    ledgerComputation.allBills.map((bill, idx) => {
                      const bKg = extractSupplierBillItems(bill).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                          <td className="p-3 font-bold text-indigo-900 font-mono">{bill.billNo}</td>
                          <td className="p-3 font-mono text-slate-600">{formatDate(bill.date)}</td>
                          <td className="p-3 text-slate-800">{bill.itemsDescription || '-'}</td>
                          <td className="p-3 text-center font-bold text-purple-800">
                            {bKg > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
                                {toBengaliNumber(bKg)} কেজি
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">{toBengaliNumber(bill.cashPaid || 0)} ৳</td>
                          <td className="p-3 text-right font-medium text-slate-700">{toBengaliNumber(bill.onlinePaid || 0)} ৳</td>
                          <td className="p-3 text-right font-bold text-rose-600">{toBengaliNumber(bill.dueAmount || 0)} ৳</td>
                          <td className="p-3 text-right font-extrabold text-indigo-700">{toBengaliNumber(bill.totalAmount || 0)} ৳</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">সর্বমোট ক্রয় হিসাব:</td>
                    <td className="p-3 text-center text-purple-800 font-extrabold">
                      {toBengaliNumber(ledgerComputation.allBills.reduce((sum: number, b) => sum + extractSupplierBillItems(b).reduce((isum: number, it) => isum + (Number(it.quantity) || 0), 0), 0))} কেজি
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      {toBengaliNumber(ledgerComputation.allBills.reduce((s: number, b) => s + (Number(b.cashPaid) || 0), 0))} ৳
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      {toBengaliNumber(ledgerComputation.allBills.reduce((s: number, b) => s + (Number(b.onlinePaid) || 0), 0))} ৳
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600">
                      {toBengaliNumber(ledgerComputation.allBills.reduce((s: number, b) => s + (Number(b.dueAmount) || 0), 0))} ৳
                    </td>
                    <td className="p-3 text-right font-extrabold text-indigo-700">
                      {toBengaliNumber(ledgerComputation.allBills.reduce((s: number, b) => s + (Number(b.totalAmount) || 0), 0))} ৳
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Supplier Payments */}
        {activeLedgerTab === 'payments' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 text-center">নং</th>
                    <th className="p-3">রশিদ নং</th>
                    <th className="p-3">তারিখ</th>
                    <th className="p-3">মাধ্যম</th>
                    <th className="p-3">নোট / বিবরণ</th>
                    <th className="p-3">পরিশোধকারী</th>
                    <th className="p-3 text-right">পরিশোধিত টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ledgerComputation.allPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        নির্বাচিত সময়ে কোনো পরিশোধের রসিদ পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    ledgerComputation.allPayments.map((pay, idx) => (
                      <tr key={pay.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-center text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                        <td className="p-3 font-bold text-emerald-900 font-mono">{pay.receiptNo || 'রশিদ'}</td>
                        <td className="p-3 font-mono text-slate-600">{formatDate(pay.date)}</td>
                        <td className="p-3 text-slate-700">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            pay.paymentMethod === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {pay.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-800">{pay.notes || '-'}</td>
                        <td className="p-3 text-slate-600">{pay.paidBy || '-'}</td>
                        <td className="p-3 text-right font-extrabold text-emerald-700">{toBengaliNumber(pay.amount || 0)} ৳</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setViewSupplierLedger(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-purple-700" />
            <span>সকল সাপ্লায়ার তালিকায় ফিরে যান</span>
          </button>

          <button
            onClick={() => handlePrintSupplierLedger(
              activeSup,
              filterApplied && statementStartDate && statementEndDate ? { startDate: statementStartDate, endDate: statementEndDate } : undefined
            )}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md transition active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Printer className="w-4 h-4" />
            <span>{filterApplied ? 'নির্বাচিত স্টেটমেন্ট প্রিন্ট করুন' : 'লেজার স্টেটমেন্ট প্রিন্ট করুন (Print)'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-600" />
            <span>সাপ্লায়ার ও মহাজন লেজার (Supplier Accounts)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
            <span>মোট প্রদেয় বকেয়া (মহাজন পাবে): <strong className="font-extrabold text-purple-700 text-sm">{toBengaliNumber(totalSupplierPayableAll)} ৳</strong></span>
            <span className="text-slate-300">|</span>
            <span>সর্বমোট মাল ক্রয়: <strong className="font-extrabold text-indigo-700 text-sm">{toBengaliNumber(mappedSuppliers.reduce((sum, s) => sum + (s.totalKg || 0), 0))} কেজি</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="কোম্পানি / সাপ্লায়ার খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full sm:w-60 focus:ring-2 focus:ring-purple-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={() => {
              setEditingSupplier(null);
              setName('');
              setCompanyName('');
              setPhone('');
              setAddress('');
              setOpeningPayable("");
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন সাপ্লায়ার</span>
          </button>
        </div>
      </div>

      {/* Supplier Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">নং</th>
                <th className="p-3">কোম্পানি / প্রতিষ্ঠানের নাম</th>
                <th className="p-3">প্রতিনিধি / মালিক</th>
                <th className="p-3">মোবাইল</th>
                <th className="p-3">ঠিকানা</th>
                <th className="p-3 text-right">পূর্বের বকেয়া</th>
                <th className="p-3 text-center">মোট মাল (কেজি)</th>
                <th className="p-3 text-right">মোট মাল ক্রয় (৳)</th>
                <th className="p-3 text-right">মোট পরিশোধ</th>
                <th className="p-3 text-right">বর্তমান পাবে (Payable)</th>
                <th className="p-3 text-center">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    কোনো সাপ্লায়ার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup, idx) => (
                  <tr key={sup.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                    <td className="p-3 font-bold text-purple-900">
                      <button onClick={() => handleOpenLedgerPage(sup)} className="hover:underline text-left cursor-pointer" title="লেজার খতিয়ান পেজ ভিউ দেখুন">
                        {sup.companyName}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{sup.name}</td>
                    <td className="p-3 text-slate-600 font-mono">{sup.phone || '-'}</td>
                    <td className="p-3 text-slate-600">{sup.address || '-'}</td>
                    <td className="p-3 text-right text-slate-600">{toBengaliNumber(sup.openingPayable || 0)} ৳</td>
                    <td className="p-3 text-center font-bold">
                      {(sup.totalKg && sup.totalKg > 0) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs whitespace-nowrap">
                          {toBengaliNumber(sup.totalKg)} কেজি
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-800">{toBengaliNumber(sup.totalPurchased || 0)} ৳</td>
                    <td className="p-3 text-right font-semibold text-emerald-700">{toBengaliNumber(sup.totalPaid || 0)} ৳</td>
                    <td className="p-3 text-right font-extrabold text-sm text-purple-700">
                      {toBengaliNumber(sup.currentPayable || 0)} ৳
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenLedgerPage(sup)}
                          title="লেজার খতিয়ান পেজ ভিউ দেখুন (ভিউ)"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-900 border border-purple-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-600" />
                          <span>ভিউ</span>
                        </button>
                        <button
                          onClick={() => handlePrintSupplierLedger(sup)}
                          title="লেজার স্টেটমেন্ট প্রিন্ট করুন"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canEditOrDelete && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(sup)}
                              title="এডিট করুন"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition active:scale-95 cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sup)}
                              title="মুছুন"
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
      </div>

      {/* Add / Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
              {editingSupplier ? 'সাপ্লায়ার তথ্য সংশোধন' : 'নতুন সাপ্লায়ার / মহাজন এন্ট্রি'}
            </h3>

            <form onSubmit={handleSaveSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">প্রতিষ্ঠানের নাম *</label>
                <input
                  ref={supCompanyRef}
                  type="text"
                  required
                  placeholder="যেমন: মেসার্স রহিম ইলেকট্রিক"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      supNameRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">মালিক / প্রতিনিধির নাম *</label>
                <input
                  ref={supNameRef}
                  type="text"
                  required
                  placeholder="যেমন: মো: রহিম মিয়া"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      supPhoneRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                <input
                  ref={supPhoneRef}
                  type="text"
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      supAddressRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">ঠিকানা / গোডাউন</label>
                <input
                  ref={supAddressRef}
                  type="text"
                  placeholder="নবাবপুর / চকবাজার / ঢাকা"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      supOpeningPayableRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  পূর্বের বকেয়া / পাওনা (Opening Balance) ৳
                </label>
                <input
                  ref={supOpeningPayableRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={openingPayable || ''}
                  onChange={(e) => setOpeningPayable(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      supSubmitRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-purple-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                  সাপ্লায়ারের পূর্বের কোনো বকেয়া বা পাওনা থাকলে তা এখানে লিখুন
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  ref={supSubmitRef}
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                >
                  সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
