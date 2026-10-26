import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Printer, 
  Download, 
  Eye, 
  Trash2, 
  Edit, 
  X, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
  Receipt,
  Package,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, normalizeDate, isSameDate, formatDate, isDateInRange } from '../utils/formatters';
import { Invoice, DuePaymentRecord } from '../types';

export const DateSalesView: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    invoices, 
    duePayments,
    setInvoiceToPrint,
    setDuePaymentToPrint,
    moveToRecycleBin,
    deleteInvoice,
    setInvoices,
    setDuePayments,
    canEditOrDelete,
    isManager,
    currentUser,
    customers,
    setCustomers,
    expenses,
    products,
    language,
    t,
    setCurrentTab,
    setInvoiceToEdit,
    confirmAction
  } = useApp();

  const isUserManager = Boolean(isManager || currentUser?.role === 'manager');

  const [startDateInput, setStartDateInput] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [endDateInput, setEndDateInput] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [activeQueryStartDate, setActiveQueryStartDate] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [activeQueryEndDate, setActiveQueryEndDate] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);

  // Edit Customer Info (for both Invoice & Due Payment)
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [editCustomerAddress, setEditCustomerAddress] = useState<string>('');
  const [editCustomerOpeningDue, setEditCustomerOpeningDue] = useState<string>('');

  // Edit Invoice States
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editInvoiceNo, setEditInvoiceNo] = useState<string>('');
  const [editSalesAmount, setEditSalesAmount] = useState<string>("");
  const [editDiscount, setEditDiscount] = useState<string>("");
  const [editCashPaid, setEditCashPaid] = useState<string>("");
  const [editOnlinePaid, setEditOnlinePaid] = useState<string>("");

  // Edit Due Collection States
  const [editingDuePayment, setEditingDuePayment] = useState<DuePaymentRecord | null>(null);
  const [editDueAmount, setEditDueAmount] = useState<string>("");
  const [editDueOnlineMethod, setEditDueOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bank');

  const handleOpenEditInvoice = (inv: Invoice) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো ইনভয়েস এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingInvoice(inv);
    const customer = customers.find(c => c.id === inv.customerId);
    setEditCustomerName(inv.customerName || customer?.name || '');
    setEditCustomerPhone(inv.customerPhone || customer?.phone || '');
    setEditCustomerAddress(inv.customerAddress || customer?.address || '');
    setEditCustomerOpeningDue(String(customer?.openingDue || 0));
    setEditDate(inv.date || '');
    setEditInvoiceNo(inv.invoiceNo || '');
    setEditSalesAmount(String(inv.subtotal || ""));
    setEditDiscount(String(inv.discount || ""));
    setEditCashPaid(String(inv.cashPaid || ""));
    setEditOnlinePaid(String(inv.onlinePaid || ""));
  };

  const handleOpenEditDuePayment = (dp: DuePaymentRecord) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে বাকি আদায় এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingDuePayment(dp);
    const customer = customers.find(c => c.id === dp.customerId);
    setEditCustomerName(dp.customerName || customer?.name || '');
    setEditCustomerPhone(dp.customerPhone || customer?.phone || '');
    setEditCustomerAddress(customer?.address || '');
    setEditCustomerOpeningDue(String(customer?.openingDue || 0));
    setEditCashPaid(String(dp.cashPaid ?? (dp.paymentMethod === 'cash' ? dp.amount : "")));
    setEditOnlinePaid(String(dp.onlinePaid ?? (dp.paymentMethod !== 'cash' ? dp.amount : "")));
    setEditDiscount(String(dp.discount || ""));
    setEditDueOnlineMethod(dp.onlineMethod || 'bank');
    setEditDate(dp.date || '');
    setEditInvoiceNo(dp.receiptNo || '');
  };

  const handleSaveInvoiceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const newGrandTotal = toEnglishNumber(editSalesAmount.toString()) + (editingInvoice.laborOrTransportCost || 0) - toEnglishNumber(editDiscount.toString());
    const newDueAmount = newGrandTotal - toEnglishNumber(editCashPaid.toString()) - toEnglishNumber(editOnlinePaid.toString());

    const diffPurchased = newGrandTotal - editingInvoice.grandTotal;
    const diffPaid = (toEnglishNumber(editCashPaid.toString()) + toEnglishNumber(editOnlinePaid.toString())) - (editingInvoice.cashPaid + editingInvoice.onlinePaid);
    const diffDue = newDueAmount - editingInvoice.dueAmount;

    // Update invoices
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === editingInvoice.id) {
        return {
          ...inv,
          customerName: editCustomerName.trim() || inv.customerName,
          customerPhone: editCustomerPhone.trim() || inv.customerPhone,
          customerAddress: editCustomerAddress.trim() || inv.customerAddress,
          date: editDate,
          invoiceNo: editInvoiceNo,
          subtotal: toEnglishNumber(editSalesAmount.toString()),
          discount: toEnglishNumber(editDiscount.toString()),
          cashPaid: toEnglishNumber(editCashPaid.toString()),
          onlinePaid: toEnglishNumber(editOnlinePaid.toString()),
          grandTotal: newGrandTotal,
          dueAmount: newDueAmount,
          status: newDueAmount <= 0 ? 'paid' : (toEnglishNumber(editCashPaid.toString()) + toEnglishNumber(editOnlinePaid.toString()) > 0 ? 'partial' : 'due')
        };
      }
      return inv;
    });
    setInvoices(updatedInvoices as any); // using as any in case status string unions mismatch slightly

    // Update Customer
    const updatedCustomers = customers.map(c => {
      if (c.id === editingInvoice.customerId) {
        const diffOpeningDue = toEnglishNumber(editCustomerOpeningDue.toString()) - (c.openingDue || 0);
        return {
          ...c,
          name: editCustomerName.trim() || c.name,
          phone: editCustomerPhone.trim() || c.phone,
          address: editCustomerAddress.trim() || c.address,
          openingDue: toEnglishNumber(editCustomerOpeningDue.toString()),
          totalPurchased: (c.totalPurchased || 0) + diffPurchased,
          totalPaid: (c.totalPaid || 0) + diffPaid,
          currentDue: (c.currentDue || 0) + diffDue + diffOpeningDue
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    setEditingInvoice(null);
  };

  const handleSaveDuePaymentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDuePayment) return;

    const cashPaid = toEnglishNumber(editCashPaid.toString());
    const onlinePaid = toEnglishNumber(editOnlinePaid.toString());
    const discount = toEnglishNumber(editDiscount.toString());
    const newAmount = cashPaid + onlinePaid;

    const diffPaid = newAmount - editingDuePayment.amount;
    const diffDiscount = discount - (editingDuePayment.discount || 0);

    // Update Due Payments
    const updatedDuePayments = duePayments.map(dp => {
      if (dp.id === editingDuePayment.id) {
        return {
          ...dp,
          customerName: editCustomerName.trim() || dp.customerName,
          customerPhone: editCustomerPhone.trim() || dp.customerPhone,
          amount: newAmount,
          cashPaid,
          onlinePaid,
          discount,
          paymentMethod: onlinePaid > 0 && cashPaid === 0 ? 'online' : (cashPaid > 0 && onlinePaid === 0 ? 'cash' : dp.paymentMethod),
          onlineMethod: editDueOnlineMethod,
          remainingDue: dp.previousDue - newAmount - discount,
          date: editDate,
          receiptNo: editInvoiceNo
        };
      }
      return dp;
    });
    setDuePayments(updatedDuePayments as any);

    // Update Customer
    const updatedCustomers = customers.map(c => {
      if (c.id === editingDuePayment.customerId) {
        const diffOpeningDue = toEnglishNumber(editCustomerOpeningDue.toString()) - (c.openingDue || 0);
        return {
          ...c,
          name: editCustomerName.trim() || c.name,
          phone: editCustomerPhone.trim() || c.phone,
          address: editCustomerAddress.trim() || c.address,
          openingDue: toEnglishNumber(editCustomerOpeningDue.toString()),
          totalPaid: (c.totalPaid || 0) + diffPaid,
          currentDue: (c.currentDue || 0) - diffPaid - diffDiscount + diffOpeningDue
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    setEditingDuePayment(null);
  };

  // Sync with global selectedDate
  useEffect(() => {
    if (selectedDate) {
      const norm = normalizeDate(selectedDate);
      setStartDateInput(norm);
      setEndDateInput(norm);
      setActiveQueryStartDate(norm);
      setActiveQueryEndDate(norm);
    }
  }, [selectedDate]);

  // Handle "হিসাব দেখুন" button click
  const handleQueryDate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sNorm = normalizeDate(startDateInput);
    const eNorm = normalizeDate(endDateInput);
    setActiveQueryStartDate(sNorm);
    setActiveQueryEndDate(eNorm);
    setSelectedDate(sNorm);
  };

  // Filter invoices for active queried date range
  const filteredInvoices = invoices.filter(inv => isDateInRange(inv.date, activeQueryStartDate, activeQueryEndDate));

  // Filter due collections for active queried date range
  const filteredDuePayments = duePayments.filter(dp => isDateInRange(dp.date, activeQueryStartDate, activeQueryEndDate));

  // Combine rows: invoice sales + separate due collections if any
  interface CombinedRow {
    id: string;
    type: 'sale' | 'due_collection';
    memo: string;
    customer: string;
    totalKg: number;
    sale: number;
    discount: number;
    cash: number;
    other: number;
    due: number;
    originalData: any;
  }

  const tableRows: CombinedRow[] = [
    ...filteredInvoices.map(inv => {
      const invKg = Array.isArray(inv.items)
        ? inv.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0)
        : 0;
      return {
        id: inv.id,
        type: 'sale' as const,
        memo: inv.invoiceNo,
        customer: inv.customerName,
        totalKg: invKg,
        sale: (inv.subtotal || inv.grandTotal || 0),
        discount: inv.discount || 0,
        cash: inv.cashPaid || 0,
        other: inv.onlinePaid || 0,
        due: inv.dueAmount || 0,
        originalData: inv
      };
    }),
    ...filteredDuePayments.map(dp => ({
      id: dp.id,
      type: 'due_collection' as const,
      memo: dp.receiptNo || 'রশিদ',
      customer: dp.customerName + ' (বাকি আদায়)',
      totalKg: 0,
      sale: 0,
      discount: 0,
      cash: dp.cashPaid ?? (dp.paymentMethod === 'cash' ? dp.amount : 0),
      other: dp.onlinePaid ?? (dp.paymentMethod !== 'cash' ? dp.amount : 0),
      due: 0,
      originalData: dp
    }))
  ].sort((a, b) => {
    const numA = toEnglishNumber(a.memo) || 0;
    const numB = toEnglishNumber(b.memo) || 0;
    return numA - numB;
  });

  // Calculations for total summary
  const totalWeightInTable = tableRows.reduce((sum, r) => sum + r.totalKg, 0);
  const totalSale = tableRows.reduce((sum, r) => sum + r.sale, 0);
  const totalDiscount = tableRows.reduce((sum, r) => sum + r.discount, 0);
  const totalCash = tableRows.reduce((sum, r) => sum + r.cash, 0);
  const totalOther = tableRows.reduce((sum, r) => sum + r.other, 0);
  const totalDue = tableRows.reduce((sum, r) => sum + r.due, 0);

  // Profit & Loss State (Hidden by default, click button to reveal; completely hidden for manager role)
  const [showProfitLoss, setShowProfitLoss] = useState<boolean>(false);

  // Quick Preset Handlers
  const handleSetQuickPreset = (type: 'today' | 'yesterday' | '7days' | 'this_month') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (type === 'today') {
      setStartDateInput(todayStr);
      setEndDateInput(todayStr);
      setActiveQueryStartDate(todayStr);
      setActiveQueryEndDate(todayStr);
      setSelectedDate(todayStr);
    } else if (type === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDateInput(yStr);
      setEndDateInput(yStr);
      setActiveQueryStartDate(yStr);
      setActiveQueryEndDate(yStr);
      setSelectedDate(yStr);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      const pastStr = past.toISOString().split('T')[0];
      setStartDateInput(pastStr);
      setEndDateInput(todayStr);
      setActiveQueryStartDate(pastStr);
      setActiveQueryEndDate(todayStr);
    } else if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDateInput(firstDay);
      setEndDateInput(todayStr);
      setActiveQueryStartDate(firstDay);
      setActiveQueryEndDate(todayStr);
    }
  };

  // Calculations for Profit & Loss (লাভ-ক্ষতি ও মুনাফা বিশ্লেষণ)
  const { 
    totalSoldWeight, 
    totalCostOfGoods, 
    grossProfit, 
    totalPeriodExpenses, 
    netProfit, 
    totalSalesRevenue,
    profitMarginPercent 
  } = useMemo(() => {
    let soldWeight = 0;
    let costOfGoods = 0;

    filteredInvoices.forEach(inv => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach(item => {
          const qty = Number(item.quantity) || 0;
          soldWeight += qty;

          let costRate = Number(item.costPrice) || 0;
          if (costRate <= 0) {
            const matchedProd = products.find(p => 
              p.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
              (item.name && item.name.toLowerCase().includes(p.name.toLowerCase()))
            );
            costRate = matchedProd?.purchasePrice ? Number(matchedProd.purchasePrice) : 0;
          }
          costOfGoods += (qty * costRate);
        });
      }
    });

    const totalRev = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const gross = totalRev - costOfGoods;

    const rangeExpenses = expenses
      .filter(exp => isDateInRange(exp.date, activeQueryStartDate, activeQueryEndDate))
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    const net = gross - rangeExpenses;
    const margin = totalRev > 0 ? Math.round((net / totalRev) * 100) : 0;

    return {
      totalSoldWeight: soldWeight,
      totalCostOfGoods: costOfGoods,
      grossProfit: gross,
      totalPeriodExpenses: rangeExpenses,
      netProfit: net,
      totalSalesRevenue: totalRev,
      profitMarginPercent: margin
    };
  }, [filteredInvoices, expenses, products, activeQueryStartDate, activeQueryEndDate]);

  const handleDeleteItem = (row: CombinedRow) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো রেকর্ড ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    if (row.type === 'sale') {
      confirmAction({
        title: 'মেমো মুছে ফেলা',
        message: `আপনি কি নিশ্চিত মেমো #${row.memo} রিসাইকেল বিনে পাঠাতে চান? এতে বিক্রি বাতিল হবে এবং বিক্রিত সকল পণ্যের স্টক স্বয়ংক্রিয়ভাবে আবার স্টকে ফেরত যোগ হবে।`,
        confirmLabel: 'হ্যাঁ, মেমো মুছুন',
        onConfirm: () => deleteInvoice(row.id)
      });
    } else if (row.type === 'due_collection') {
      confirmAction({
        title: 'আদায় রেকর্ড মুছে ফেলা',
        message: `আপনি কি নিশ্চিত এই আদায়টি (${toBengaliNumber(row.originalData?.amount || (row.cash + row.other))} ৳) মুছতে চান? কাস্টমারের বকেয়া আবার সমন্বয় হয়ে যাবে।`,
        confirmLabel: 'হ্যাঁ, মুছুন',
        onConfirm: () => {
          const customer = customers.find(c => c.id === row.originalData.customerId);
          if (customer) {
            const updatedCustomer = {
              ...customer,
              totalPaid: (customer.totalPaid || 0) - (row.originalData.amount || 0),
              currentDue: (customer.currentDue || 0) + (row.originalData.amount || 0),
              updatedAt: new Date().toISOString(),
            };
            setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
          }
          
          moveToRecycleBin('due_payment', `বাকি আদায় (${row.customer})`, row.originalData, row.originalData.amount);
          setDuePayments(prev => prev.filter(p => p.id !== row.id));
        }
      });
    }
  };

  // Print Profit & Loss Statement ONLY (শুধুমাত্র লাভ-ক্ষতি বিবরণী প্রিন্ট)
  const handlePrintProfitLoss = () => {
    if (isUserManager) {
      alert('ম্যানেজার একাউন্ট থেকে লাভ-ক্ষতি বিবরণী দেখার বা প্রিন্ট করার অনুমতি নেই।');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const isSingleDay = activeQueryStartDate === activeQueryEndDate;
    const periodText = isSingleDay
      ? `${formatDate(activeQueryStartDate)}`
      : `${formatDate(activeQueryStartDate)} হতে ${formatDate(activeQueryEndDate)}`;
    const printDate = formatDate(new Date());

    const isProfit = netProfit >= 0;
    const netStatusText = isProfit ? 'নিট লাভ (Net Profit)' : 'নিট লোকসান (Net Loss)';
    const netFormatted = isProfit 
      ? `+${toBengaliNumber(netProfit)} ৳` 
      : `-${toBengaliNumber(Math.abs(netProfit))} ৳`;

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>লাভ-ক্ষতি ও মুনাফা বিবরণী</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { 
            font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; 
            margin: 0; 
            padding: 15px; 
            color: #0f172a; 
            background: #fff; 
            font-size: 12px; 
          }
          .header { text-align: center; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin-bottom: 12px; }
          .shop-name { font-size: 22px; font-weight: 900; color: #3730a3; margin: 0; }
          .shop-sub { font-size: 11px; color: #475569; margin: 3px 0 0 0; }
          .doc-title { 
            font-size: 15px; 
            font-weight: 800; 
            color: #1e1b4b; 
            margin-top: 6px; 
            letter-spacing: 0.5px;
            background: #eef2ff;
            display: inline-block;
            padding: 4px 16px;
            border-radius: 6px;
            border: 1px solid #c7d2fe;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 7px 12px;
            margin-bottom: 12px;
            font-size: 11.5px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .stat-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
            background: #fafafa;
            text-align: center;
          }
          .stat-label {
            font-size: 10.5px;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 3px;
          }
          .stat-value {
            font-size: 15px;
            font-weight: 900;
            color: #1e293b;
          }
          .stat-card.net-box {
            grid-column: span 3;
            background: ${isProfit ? '#ecfdf5' : '#fff1f2'};
            border: 2px solid ${isProfit ? '#10b981' : '#f43f5e'};
            padding: 10px;
          }
          .stat-card.net-box .stat-label {
            color: ${isProfit ? '#047857' : '#be123c'};
            font-size: 11.5px;
          }
          .stat-card.net-box .stat-value {
            font-size: 20px;
            color: ${isProfit ? '#065f46' : '#9f1239'};
          }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
          th { 
            background-color: #e0e7ff; 
            color: #312e81; 
            font-weight: 800; 
            border: 1px solid #c7d2fe; 
            padding: 7px 9px; 
            text-align: left; 
          }
          td { border: 1px solid #e2e8f0; padding: 6px 9px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .highlight-row { background-color: #f1f5f9; font-weight: 700; }
          .final-row { 
            background-color: ${isProfit ? '#f0fdf4' : '#fff1f2'}; 
            font-weight: 900; 
            font-size: 12.5px;
            border-top: 2px solid ${isProfit ? '#16a34a' : '#e11d48'};
            border-bottom: 2px solid ${isProfit ? '#16a34a' : '#e11d48'};
          }
          .formula-box {
            margin-top: 12px;
            padding: 7px 10px;
            background: #f8fafc;
            border-left: 4px solid #6366f1;
            font-size: 10.5px;
            color: #334155;
            border-radius: 4px;
          }
          .footer { 
            margin-top: 40px; 
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
            background: #4338ca;
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
            th { background-color: #e0e7ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .stat-card.net-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .final-row { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
          <div class="doc-title">লাভ-ক্ষতি ও মুনাফা বিবরণী (Profit & Loss Statement)</div>
        </div>

        <div class="meta-bar">
          <div><strong>সময়সীমা / তারিখ:</strong> ${periodText}</div>
          <div><strong>প্রিন্টের তারিখ:</strong> ${printDate}</div>
        </div>

        <div class="summary-grid">
          <div class="stat-card">
            <div class="stat-label">মোট বিক্রিত মাল (ওজন)</div>
            <div class="stat-value" style="color: #7c3aed;">${toBengaliNumber(totalSoldWeight)} কেজি</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">মোট বিক্রয়মূল্য (Sales)</div>
            <div class="stat-value" style="color: #1e293b;">${toBengaliNumber(totalSalesRevenue)} ৳</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">মালের ক্রয়মূল্য (COGS)</div>
            <div class="stat-value" style="color: #d97706;">${toBengaliNumber(totalCostOfGoods)} ৳</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">গ্রস মুনাফা (বিক্রি - ক্রয়)</div>
            <div class="stat-value" style="color: #0d9488;">${grossProfit >= 0 ? '+' : ''}${toBengaliNumber(grossProfit)} ৳</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">দোকানের পরিচালনা খরচ</div>
            <div class="stat-value" style="color: #e11d48;">${toBengaliNumber(totalPeriodExpenses)} ৳</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">মুনাফার হার (Margin)</div>
            <div class="stat-value" style="color: #4338ca;">${toBengaliNumber(profitMarginPercent)}%</div>
          </div>

          <div class="stat-card net-box">
            <div class="stat-label">সর্বমোট নিট ফলাফল (${netStatusText})</div>
            <div class="stat-value">${netFormatted}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 8%;" class="text-center">নং</th>
              <th style="width: 46%;">বিবরণ (Particulars)</th>
              <th style="width: 26%;" class="text-center">পরিমাণ / মন্তব্য</th>
              <th style="width: 20%;" class="text-right">টাকা (৳)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-center">১</td>
              <td><strong>মোট বিক্রয় আয় (Total Sales Revenue)</strong></td>
              <td class="text-center">${toBengaliNumber(totalSoldWeight)} কেজি বিক্রিত মাল</td>
              <td class="text-right"><strong>${toBengaliNumber(totalSalesRevenue)} ৳</strong></td>
            </tr>
            <tr>
              <td class="text-center">২</td>
              <td>বাদ: বিক্রিত মালের আসল ক্রয়মূল্য (Cost of Goods Sold - COGS)</td>
              <td class="text-center">আসল কেনা দর বাবদ</td>
              <td class="text-right" style="color: #d97706;">(-) ${toBengaliNumber(totalCostOfGoods)} ৳</td>
            </tr>
            <tr class="highlight-row">
              <td class="text-center">=</td>
              <td><strong>মোট গ্রস মুনাফা / লাভ (Gross Profit)</strong></td>
              <td class="text-center">বিক্রয়মূল্য - ক্রয়মূল্য</td>
              <td class="text-right" style="color: #0d9488;"><strong>${grossProfit >= 0 ? '+' : ''}${toBengaliNumber(grossProfit)} ৳</strong></td>
            </tr>
            <tr>
              <td class="text-center">৩</td>
              <td>বাদ: দোকানের মোট পরিচালনা ও দৈনিক খরচ (Shop Expenses)</td>
              <td class="text-center">দৈনিক ও অন্যান্য খরচ</td>
              <td class="text-right" style="color: #e11d48;">(-) ${toBengaliNumber(totalPeriodExpenses)} ৳</td>
            </tr>
            <tr class="final-row">
              <td class="text-center">★</td>
              <td><strong>সর্বমোট নিট লাভ / লোকসান (Net Profit / Loss)</strong></td>
              <td class="text-center">গ্রস লাভ - দোকান খরচ</td>
              <td class="text-right" style="color: ${isProfit ? '#15803d' : '#b91c1c'}; font-size: 13px;">
                <strong>${netFormatted}</strong>
              </td>
            </tr>
            <tr>
              <td class="text-center">%</td>
              <td>নিট মুনাফার হার (Net Profit Margin)</td>
              <td class="text-center">নিট লাভ ÷ মোট বিক্রয় × ১০০</td>
              <td class="text-right"><strong>${toBengaliNumber(profitMarginPercent)}%</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="formula-box">
          <strong>💡 হিসাব পদ্ধতি:</strong> নিট লাভ = (মোট বিক্রয়মূল্য - বিক্রিত মালের ক্রয়মূল্য) - দোকানের মোট খরচ
        </div>

        <div class="footer">
          <div class="sig-line">হিসাবরক্ষক / প্রস্তুতকারী</div>
          <div class="sig-line">ম্যানেজার / ক্যাশিয়ার</div>
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

  // Print summary or table
  const handlePrint = () => {
    window.print();
  };

  // Export as CSV/PDF
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
      
      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-5">
        
        {/* Top Header: Title & Action Buttons (প্রিন্ট ও পিডিএফ ডাউনলোড) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>তারিখ অনুযায়ী ইনভয়েস ও আদায়</span>
            <span className="bg-indigo-100 text-indigo-700 text-sm px-2.5 py-0.5 rounded-full border border-indigo-200">
              {toBengaliNumber(tableRows.length)} টি এন্ট্রি
            </span>
          </h2>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#4338ca] hover:bg-[#3730a3] text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="bg-[#059669] hover:bg-[#047857] text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>পিডিএফ ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Filter and Mini Summary Box */}
        <div className="border border-slate-300 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-xs">
          
          {/* Left: Date selector & হিসাব দেখুন button */}
          <form onSubmit={handleQueryDate} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-700 whitespace-nowrap">
                {language === 'bn' ? 'শুরু:' : 'Start:'}
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="bg-white border border-indigo-400 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-[130px] sm:w-[140px]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-700 whitespace-nowrap">
                {language === 'bn' ? 'শেষ:' : 'End:'}
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="bg-white border border-indigo-400 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-[130px] sm:w-[140px]"
              />
            </div>

            <button
              type="submit"
              className="bg-[#4338ca] hover:bg-[#3730a3] text-white px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              {language === 'bn' ? 'খুঁজুন' : 'Search'}
            </button>
          </form>

          {/* Right: Inline stats banner */}
          <div className="bg-[#f8fafc] border border-slate-200 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex flex-wrap items-center gap-2 sm:gap-4 text-slate-700">
            <span>
              {language === 'bn' ? 'মোট বিক্রি: ' : 'Total Sales: '}<strong className="text-indigo-700">{toBengaliNumber(totalSale)} ৳</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {language === 'bn' ? 'নগদ: ' : 'Cash: '}<strong className="text-emerald-600">{toBengaliNumber(totalCash)} ৳</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {language === 'bn' ? 'বাকি: ' : 'Due: '}<strong className="text-amber-600">{toBengaliNumber(totalDue)} ৳</strong>
            </span>
          </div>
        </div>

        {/* Quick Date Presets Bar & Profit-Loss Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{language === 'bn' ? 'সহজ ফিল্টার:' : 'Quick Filters:'}</span>
            </span>
            <button
              type="button"
              onClick={() => handleSetQuickPreset('today')}
              className={`px-3 py-1 rounded-lg border transition cursor-pointer ${
                startDateInput === new Date().toISOString().split('T')[0] && endDateInput === new Date().toISOString().split('T')[0]
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-indigo-50'
              }`}
            >
              {language === 'bn' ? 'আজকে' : 'Today'}
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickPreset('yesterday')}
              className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-indigo-50 text-slate-700 transition cursor-pointer"
            >
              {language === 'bn' ? 'গতকাল' : 'Yesterday'}
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickPreset('7days')}
              className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-indigo-50 text-slate-700 transition cursor-pointer"
            >
              {language === 'bn' ? 'গত ৭ দিন' : 'Last 7 Days'}
            </button>
            <button
              type="button"
              onClick={() => handleSetQuickPreset('this_month')}
              className="px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-indigo-50 text-slate-700 transition cursor-pointer"
            >
              {language === 'bn' ? 'চলতি মাস' : 'This Month'}
            </button>
          </div>

          {/* Toggle Profit Loss Section (Hidden for Managers) */}
          {!isUserManager && (
            <button
              type="button"
              onClick={() => setShowProfitLoss(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs hover:shadow transition cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>
                {showProfitLoss 
                  ? (language === 'bn' ? 'লাভ-ক্ষতি সামারি লুকান' : 'Hide P&L Summary') 
                  : (language === 'bn' ? `📊 লাভ-ক্ষতি ও মুনাফা সামারি দেখুন (${toBengaliNumber(totalSoldWeight)} কেজি বিক্রি)` : `📊 View Profit & Loss Summary (${toBengaliNumber(totalSoldWeight)} KG)`)}
              </span>
              {showProfitLoss ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* PROFIT & LOSS SUMMARY CARD (তারিখ অনুযায়ী লাভ-ক্ষতি) */}
        {/* ======================================================== */}
        {!isUserManager && showProfitLoss && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-indigo-900/60 space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {language === 'bn' ? 'লাভ-ক্ষতি ও মুনাফা বিবরণী (Profit & Loss Statement)' : 'Profit & Loss Statement'}
                  </span>
                </span>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  {language === 'bn' ? (
                    activeQueryStartDate === activeQueryEndDate
                      ? `তারিখ: ${formatDate(activeQueryStartDate)}`
                      : `তারিখ: ${formatDate(activeQueryStartDate)} থেকে ${formatDate(activeQueryEndDate)}`
                  ) : (
                    activeQueryStartDate === activeQueryEndDate
                      ? `Date: ${formatDate(activeQueryStartDate)}`
                      : `Period: ${formatDate(activeQueryStartDate)} to ${formatDate(activeQueryEndDate)}`
                  )}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Print Statement Button */}
                <button
                  type="button"
                  onClick={handlePrintProfitLoss}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/70 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold border border-indigo-400/40 shadow transition active:scale-95 cursor-pointer"
                  title={language === 'bn' ? 'লাভ-ক্ষতি বিবরণী প্রিন্ট করুন' : 'Print Profit & Loss Statement'}
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>{language === 'bn' ? 'বিবরণী প্রিন্ট' : 'Print Statement'}</span>
                </button>

                {/* Total Sold KG Badge */}
                <div className="bg-purple-500/20 border border-purple-400/40 text-purple-200 px-3.5 py-2 rounded-xl text-right">
                  <span className="text-[10.5px] uppercase font-bold block text-white/70">
                    {language === 'bn' ? 'মোট বিক্রিত মাল' : 'Total Sold Weight'}
                  </span>
                  <p className="text-lg sm:text-xl font-black text-purple-300">
                    {toBengaliNumber(totalSoldWeight)} <span className="text-xs font-bold text-white/80">{language === 'bn' ? 'কেজি' : 'KG'}</span>
                  </p>
                </div>

                {/* Net Profit / Loss Badge */}
                <div className={`px-4 py-2 rounded-xl text-right border ${
                  netProfit >= 0 
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' 
                    : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                }`}>
                  <span className="text-[10.5px] uppercase font-bold block text-white/70">
                    {netProfit >= 0 
                      ? (language === 'bn' ? 'সর্বমোট নিট লাভ (Net Profit)' : 'Total Net Profit') 
                      : (language === 'bn' ? 'সর্বমোট নিট লোকসান (Net Loss)' : 'Total Net Loss')}
                  </span>
                  <p className="text-xl sm:text-2xl font-black">
                    {netProfit >= 0 ? `+${toBengaliNumber(netProfit)} ৳` : `-${toBengaliNumber(Math.abs(netProfit))} ৳`}
                  </p>
                </div>
              </div>
            </div>

            {/* Metric Cards Grid - 5 Cards including Sold KG */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              
              {/* Card 1: মোট বিক্রিত মাল (ওজন) */}
              <div className="bg-purple-950/40 p-3 sm:p-3.5 rounded-xl border border-purple-400/30 space-y-1">
                <span className="text-purple-200 text-[11px] font-semibold flex items-center justify-between">
                  <span>{language === 'bn' ? 'মোট বিক্রিত মাল (ওজন)' : 'Total Sold (KG)'}</span>
                  <Scale className="w-3.5 h-3.5 text-purple-300" />
                </span>
                <p className="text-base sm:text-lg font-black text-purple-300">
                  {toBengaliNumber(totalSoldWeight)} <span className="text-xs font-bold text-purple-200">{language === 'bn' ? 'কেজি' : 'KG'}</span>
                </p>
                <p className="text-[10px] text-white/60">
                  {language === 'bn' ? 'নির্বাচিত সময়ের মোট বিক্রয়' : 'Total sales volume'}
                </p>
              </div>

              {/* Card 2: মোট বিক্রয়মূল্য */}
              <div className="bg-white/10 p-3 sm:p-3.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-indigo-200 text-[11px] font-semibold flex items-center justify-between">
                  <span>{language === 'bn' ? 'মোট বিক্রয়মূল্য' : 'Total Sales Revenue'}</span>
                  <DollarSign className="w-3.5 h-3.5 text-indigo-300" />
                </span>
                <p className="text-base sm:text-lg font-bold text-white">
                  {toBengaliNumber(totalSalesRevenue)} ৳
                </p>
                <p className="text-[10px] text-white/60">
                  {language === 'bn' ? 'মোট ইনভয়েস বিল' : 'Gross invoice total'}
                </p>
              </div>

              {/* Card 3: মালের ক্রয়মূল্য */}
              <div className="bg-white/10 p-3 sm:p-3.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-amber-200 text-[11px] font-semibold flex items-center justify-between">
                  <span>{language === 'bn' ? 'মালের ক্রয়মূল্য (COGS)' : 'Cost of Goods (COGS)'}</span>
                  <Package className="w-3.5 h-3.5 text-amber-300" />
                </span>
                <p className="text-base sm:text-lg font-bold text-amber-200">
                  {toBengaliNumber(totalCostOfGoods)} ৳
                </p>
                <p className="text-[10px] text-white/60">
                  {language === 'bn' ? 'বিক্রিত মালের আসল দর' : 'Original purchase cost'}
                </p>
              </div>

              {/* Card 4: গ্রস লাভ (বিক্রয় - ক্রয়) */}
              <div className="bg-white/10 p-3 sm:p-3.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-teal-200 text-[11px] font-semibold flex items-center justify-between">
                  <span>{language === 'bn' ? 'গ্রস লাভ (বিক্রি - ক্রয়)' : 'Gross Profit (Sales - Cost)'}</span>
                  <TrendingUp className="w-3.5 h-3.5 text-teal-300" />
                </span>
                <p className={`text-base sm:text-lg font-bold ${grossProfit >= 0 ? 'text-teal-300' : 'text-rose-300'}`}>
                  {grossProfit >= 0 ? '+' : ''}{toBengaliNumber(grossProfit)} ৳
                </p>
                <p className="text-[10px] text-white/60">
                  {language === 'bn' ? 'দোকান খরচ বাদ দেওয়ার পূর্বে' : 'Before shop expenses'}
                </p>
              </div>

              {/* Card 5: দোকানের মোট খরচ */}
              <div className="bg-white/10 p-3 sm:p-3.5 rounded-xl border border-white/10 space-y-1">
                <span className="text-rose-200 text-[11px] font-semibold flex items-center justify-between">
                  <span>{language === 'bn' ? 'দোকানের মোট খরচ' : 'Shop Expenses'}</span>
                  <Receipt className="w-3.5 h-3.5 text-rose-300" />
                </span>
                <p className="text-base sm:text-lg font-bold text-rose-300">
                  {toBengaliNumber(totalPeriodExpenses)} ৳
                </p>
                <p className="text-[10px] text-white/60">
                  {language === 'bn' ? 'দৈনিক ও পরিচালনা খরচ' : 'Daily overhead expenses'}
                </p>
              </div>

            </div>

            {/* Note & Formula */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-indigo-200/80 pt-1 border-t border-white/10">
              <span>
                💡 {language === 'bn' 
                  ? <>হিসাব সূত্র: <strong className="text-white">নিট লাভ = (মোট বিক্রয় - মালের ক্রয়মূল্য) - দোকানের খরচ</strong></> 
                  : <>Formula: <strong className="text-white">Net Profit = (Total Sales - COGS) - Shop Expenses</strong></>}
              </span>
              {totalSalesRevenue > 0 && (
                <span className="bg-white/10 px-2 py-0.5 rounded text-white font-semibold self-start sm:self-auto">
                  {language === 'bn' ? 'লাভের অনুপাত (Profit Margin): ' : 'Profit Margin: '}{toBengaliNumber(profitMarginPercent)}%
                </span>
              )}
            </div>

          </div>
        )}

        {/* Table View matching screenshot */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300">
                <th className="py-3 px-3">{language === 'bn' ? 'মেমো' : 'Memo'}</th>
                <th className="py-3 px-3">{language === 'bn' ? 'কাস্টমার' : 'Customer'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'পরিমাণ (কেজি)' : 'Qty (KG)'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'বিক্রি' : 'Sale'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'ডিসকাউন্ট' : 'Discount'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'নগদ' : 'Cash'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'অন্যান্য মাধ্যম' : 'Other Pay'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'বাকি' : 'Due'}</th>
                <th className="py-3 px-3 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    {language === 'bn' ? 'নির্বাচিত তারিখে কোনো লেনদেন নেই' : 'No transactions found for selected dates'}
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition text-slate-800">
                    <td className="py-3 px-3 font-semibold text-indigo-700">
                      {row.memo}
                      {row.type === 'due_collection' && (row.originalData as any).billDate && (
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">বিল: {formatDate((row.originalData as any).billDate)}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {row.customer}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-700 whitespace-nowrap">
                      {row.totalKg > 0 ? `${toBengaliNumber(row.totalKg)} কেজি` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {toBengaliNumber(row.sale)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-pink-600">
                      {toBengaliNumber(row.discount)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {toBengaliNumber(row.cash)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-600">
                      {toBengaliNumber(row.other)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">
                      {toBengaliNumber(row.due)} ৳
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {row.type === 'sale' && (
                          <>
                            <button
                              onClick={() => setInvoiceToPrint(row.originalData)}
                              title="মেমো দেখুন (ইনভয়েস প্রিভিউ)"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>মেমো দেখুন</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditInvoice(row.originalData)}
                              title="মেমো এডিট করুন"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Edit className="w-3.5 h-3.5 text-emerald-600" />
                              <span>এডিট</span>
                            </button>
                            <button
                              onClick={() => setInvoiceToPrint(row.originalData)}
                              title="মেমো প্রিন্ট করুন"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <button
                                onClick={() => handleDeleteItem(row)}
                                title="ডিলিট করুন"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {row.type === 'due_collection' && (
                          <>
                            <button
                              onClick={() => setDuePaymentToPrint(row.originalData)}
                              title="রশিদ দেখুন (মানি রিসিট প্রিভিউ)"
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>রশিদ দেখুন</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditDuePayment(row.originalData)}
                              title="রশিদ এডিট করুন"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Edit className="w-3.5 h-3.5 text-emerald-600" />
                              <span>এডিট</span>
                            </button>
                            <button
                              onClick={() => setDuePaymentToPrint(row.originalData)}
                              title="রশিদ প্রিন্ট করুন"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <button
                                onClick={() => handleDeleteItem(row)}
                                title="ডিলিট করুন"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            
            {/* Footer Summary Row (সর্বমোট যোগফল) */}
            <tfoot>
              <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-300 text-slate-800">
                <td colSpan={2} className="py-3.5 px-3 text-left">
                  সর্বমোট যোগফল:
                </td>
                <td className="py-3.5 px-3 text-center font-extrabold text-purple-700 whitespace-nowrap">
                  {totalWeightInTable > 0 ? `${toBengaliNumber(totalWeightInTable)} কেজি` : '-'}
                </td>
                <td className="py-3.5 px-3 text-center text-slate-900">
                  {toBengaliNumber(totalSale)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-pink-600">
                  {toBengaliNumber(totalDiscount)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-600">
                  {toBengaliNumber(totalCash)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-indigo-600">
                  {toBengaliNumber(totalOther)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-amber-600">
                  {toBengaliNumber(totalDue)} ৳
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* Invoice Edit Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">ইনভয়েস তথ্য সংশোধন করুন ({editingInvoice.invoiceNo})</h3>
              <button onClick={() => setEditingInvoice(null)} className="text-slate-400 hover:text-rose-500 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveInvoiceEdit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Load Into Main Form Button */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="text-xs text-indigo-950">
                  <span className="font-bold block">মালামাল ও পণ্য পরিবর্তন করতে চান?</span>
                  <span className="text-[11px] text-indigo-700">বিক্রিত পণ্যের বিবরণ (Products / Items) সহ মূল ফর্মে এডিট করুন।</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceToEdit(editingInvoice);
                    setCurrentTab('new_invoice');
                    setEditingInvoice(null);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                >
                  ফর্মে লোড করুন
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 border-b pb-4 mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">কাস্টমার তথ্য সংশোধন (ঐচ্ছিক)</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">নাম</label>
                      <input 
                        type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল</label>
                      <input 
                        type="text" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                      <input 
                        type="text" value={editCustomerAddress} onChange={(e) => setEditCustomerAddress(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্বের বাকি</label>
                      <input 
                        type="text" inputMode="numeric" value={editCustomerOpeningDue} onChange={(e) => setEditCustomerOpeningDue(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">মেমো নাম্বার</label>
                  <input 
                    type="text" 
                    value={editInvoiceNo} 
                    onChange={(e) => setEditInvoiceNo(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">বিক্রির টাকা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editSalesAmount || ''} 
                    onChange={(e) => setEditSalesAmount(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ডিসকাউন্ট(লেছ)</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editDiscount || ''} 
                    onChange={(e) => setEditDiscount(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">নগদ জমা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editCashPaid || ''} 
                    onChange={(e) => setEditCashPaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">অনলাইন/ অন্যান্য জমা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editOnlinePaid || ''} 
                    onChange={(e) => setEditOnlinePaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">নতুন মোট বিল:</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(toEnglishNumber(editSalesAmount.toString()) + (editingInvoice.laborOrTransportCost || 0) - toEnglishNumber(editDiscount.toString()))} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">নতুন বাকি:</span>
                  <span className="font-bold text-amber-600">{toBengaliNumber(toEnglishNumber(editSalesAmount.toString()) + (editingInvoice.laborOrTransportCost || 0) - toEnglishNumber(editDiscount.toString()) - toEnglishNumber(editCashPaid.toString()) - toEnglishNumber(editOnlinePaid.toString()))} ৳</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition">
                  বাতিল
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Due Payment Edit Modal */}
      {editingDuePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">বাকি আদায় এডিট ({editingDuePayment.receiptNo})</h3>
              <button onClick={() => setEditingDuePayment(null)} className="text-slate-400 hover:text-rose-500 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDuePaymentEdit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 border-b pb-4 mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">কাস্টমার তথ্য সংশোধন (ঐচ্ছিক)</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">নাম</label>
                      <input 
                        type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল</label>
                      <input 
                        type="text" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                      <input 
                        type="text" value={editCustomerAddress} onChange={(e) => setEditCustomerAddress(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্বের বাকি</label>
                      <input 
                        type="text" inputMode="numeric" value={editCustomerOpeningDue} onChange={(e) => setEditCustomerOpeningDue(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">রশিদ নাম্বার</label>
                  <input 
                    type="text" 
                    value={editInvoiceNo} 
                    onChange={(e) => setEditInvoiceNo(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">লেস / ডিসকাউন্ট</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editDiscount || ''} 
                    onChange={(e) => setEditDiscount(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">নগদ আদায়</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editCashPaid || ''} 
                    onChange={(e) => setEditCashPaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">অনলাইন পেমেন্ট মাধ্যম</label>
                  <select
                    value={editDueOnlineMethod}
                    onChange={(e: any) => setEditDueOnlineMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="bank">ব্যাংক (Bank)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">অনলাইন পেমেন্টের টাকা (ব্যাংক)</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editOnlinePaid || ''} 
                    onChange={(e) => setEditOnlinePaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">মোট আদায়:</span>
                  <span className="font-bold text-emerald-600">{toBengaliNumber(toEnglishNumber(editCashPaid.toString()) + toEnglishNumber(editOnlinePaid.toString()))} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">নতুন অবশিষ্ট বাকি:</span>
                  <span className="font-bold text-amber-600">{toBengaliNumber(editingDuePayment.previousDue - toEnglishNumber(editCashPaid.toString()) - toEnglishNumber(editOnlinePaid.toString()) - toEnglishNumber(editDiscount.toString()))} ৳</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingDuePayment(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition">
                  বাতিল
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
