import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Investment, BankLoan, LoanRepayment } from '../types';
import { 
  Landmark, 
  Plus, 
  Search, 
  Printer, 
  Trash2, 
  Edit, 
  Eye, 
  CheckCircle, 
  Calendar, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  Building2, 
  FileText, 
  X, 
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign
} from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatDate } from '../utils/formatters';

export const InvestmentLoansView: React.FC = () => {
  const {
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    loans,
    addLoan,
    updateLoan,
    deleteLoan,
    loanRepayments,
    addLoanRepayment,
    updateLoanRepayment,
    deleteLoanRepayment,
    canEditOrDelete,
    language,
    confirmAction
  } = useApp();

  const [activeTab, setActiveTab] = useState<'investments' | 'loans' | 'repayments'>('investments');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Modals state
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState<boolean>(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [viewingInvestment, setViewingInvestment] = useState<Investment | null>(null);

  const [showAddLoanModal, setShowAddLoanModal] = useState<boolean>(false);
  const [editingLoan, setEditingLoan] = useState<BankLoan | null>(null);
  const [viewingLoanStatement, setViewingLoanStatement] = useState<BankLoan | null>(null);

  const [showAddRepaymentModal, setShowAddRepaymentModal] = useState<boolean>(false);
  const [preselectedLoanId, setPreselectedLoanId] = useState<string>('');
  const [editingRepayment, setEditingRepayment] = useState<LoanRepayment | null>(null);
  const [viewingRepayment, setViewingRepayment] = useState<LoanRepayment | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form states - Investment
  const [invName, setInvName] = useState<string>('');
  const [invAmount, setInvAmount] = useState<string>('');
  const [invDate, setInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invMethod, setInvMethod] = useState<'cash' | 'bank' | 'online'>('cash');
  const [invRef, setInvRef] = useState<string>('');
  const [invPurpose, setInvPurpose] = useState<string>('');
  const [invNotes, setInvNotes] = useState<string>('');

  // Form states - Loan
  const [loanBankName, setLoanBankName] = useState<string>('');
  const [loanBranch, setLoanBranch] = useState<string>('');
  const [loanAccNo, setLoanAccNo] = useState<string>('');
  const [loanNo, setLoanNo] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [loanDate, setLoanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loanTerm, setLoanTerm] = useState<string>('');
  const [loanRate, setLoanRate] = useState<string>('');
  const [loanInstallment, setLoanInstallment] = useState<string>('');
  const [loanNotes, setLoanNotes] = useState<string>('');
  const [loanStatus, setLoanStatus] = useState<'active' | 'closed'>('active');

  // Form states - Repayment
  const [repLoanId, setRepLoanId] = useState<string>('');
  const [repDate, setRepDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [repAmount, setRepAmount] = useState<string>('');
  const [repMethod, setRepMethod] = useState<'cash' | 'bank' | 'online' | 'cheque'>('bank');
  const [repVoucher, setRepVoucher] = useState<string>('');
  const [repNotes, setRepNotes] = useState<string>('');

  // Computations
  const totalInvestmentAmount = useMemo(() => {
    return investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [investments]);

  const totalLoanSanctioned = useMemo(() => {
    return loans.reduce((sum, l) => sum + (l.loanAmount || 0), 0);
  }, [loans]);

  const totalLoanRepaid = useMemo(() => {
    return loanRepayments.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [loanRepayments]);

  const totalOutstandingLoanDue = Math.max(0, totalLoanSanctioned - totalLoanRepaid);

  // Per-loan repayment summary map
  const loanRepaymentMap = useMemo(() => {
    const map = new Map<string, number>();
    loanRepayments.forEach(r => {
      const current = map.get(r.loanId) || 0;
      map.set(r.loanId, current + (r.amount || 0));
    });
    return map;
  }, [loanRepayments]);

  // Filtered Investments
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      const matchSearch = !searchQuery || 
        inv.investorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.referenceNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.purpose?.toLowerCase().includes(searchQuery.toLowerCase());

      const invDateStr = (inv.date || '').substring(0, 10);
      const matchStart = !startDate || invDateStr >= startDate;
      const matchEnd = !endDate || invDateStr <= endDate;

      return matchSearch && matchStart && matchEnd;
    });
  }, [investments, searchQuery, startDate, endDate]);

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const matchSearch = !searchQuery ||
        l.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.loanNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.accountNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.branchName?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [loans, searchQuery]);

  // Filtered Repayments
  const filteredRepayments = useMemo(() => {
    return loanRepayments.filter(r => {
      const matchSearch = !searchQuery ||
        r.bankName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.voucherNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      const repDateStr = (r.repaymentDate || '').substring(0, 10);
      const matchStart = !startDate || repDateStr >= startDate;
      const matchEnd = !endDate || repDateStr <= endDate;

      return matchSearch && matchStart && matchEnd;
    });
  }, [loanRepayments, searchQuery, startDate, endDate]);

  // Helper notification
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Reset Investment Form
  const resetInvestmentForm = () => {
    setInvName('');
    setInvAmount('');
    setInvDate(new Date().toISOString().split('T')[0]);
    setInvMethod('cash');
    setInvRef('');
    setInvPurpose('');
    setInvNotes('');
    setEditingInvestment(null);
  };

  // Submit Investment
  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = toEnglishNumber(invAmount);
    if (!invName.trim() || amountNum <= 0) {
      alert('বিনিয়োগকারীর নাম এবং সঠিক পরিমাণ লিখুন');
      return;
    }

    if (editingInvestment) {
      if (!canEditOrDelete) {
        alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
        return;
      }
      updateInvestment(editingInvestment.id, {
        investorName: invName.trim(),
        amount: amountNum,
        date: invDate,
        paymentMethod: invMethod,
        referenceNo: invRef.trim(),
        purpose: invPurpose.trim(),
        notes: invNotes.trim()
      });
      triggerSuccess(`বিনিয়োগকারী "${invName}"-এর তথ্য সফলভাবে আপডেট হয়েছে!`);
    } else {
      addInvestment({
        investorName: invName.trim(),
        amount: amountNum,
        date: invDate,
        paymentMethod: invMethod,
        referenceNo: invRef.trim() || `INV-${Date.now().toString().slice(-4)}`,
        purpose: invPurpose.trim(),
        notes: invNotes.trim()
      });
      triggerSuccess(`বিনিয়োগকারী "${invName}"-এর ${toBengaliNumber(amountNum)} ৳ মূলধন সফলভাবে যুক্ত হয়েছে!`);
    }

    resetInvestmentForm();
    setShowAddInvestmentModal(false);
  };

  // Start Edit Investment
  const handleStartEditInvestment = (inv: Investment) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingInvestment(inv);
    setInvName(inv.investorName || '');
    setInvAmount(inv.amount ? inv.amount.toString() : '');
    setInvDate(inv.date || new Date().toISOString().split('T')[0]);
    setInvMethod(inv.paymentMethod || 'cash');
    setInvRef(inv.referenceNo || '');
    setInvPurpose(inv.purpose || '');
    setInvNotes(inv.notes || '');
    setShowAddInvestmentModal(true);
  };

  // Delete Investment
  const handleDeleteInvestment = (inv: Investment) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'বিনিয়োগ মুছে ফেলুন',
      message: `আপনি কি নিশ্চিত "${inv.investorName}"-এর ${toBengaliNumber(inv.amount)} ৳ বিনিয়োগ মুছে ফেলতে চান? এটি রিসাইকেল বিনে সংরক্ষিত হবে।`,
      confirmText: 'হ্যাঁ, মুছুন',
      isDestructive: true,
      onConfirm: () => {
        deleteInvestment(inv.id);
        triggerSuccess('বিনিয়োগ সফলভাবে মুছে রিসাইকেল বিনে পাঠানো হয়েছে।');
      }
    });
  };

  // Reset Loan Form
  const resetLoanForm = () => {
    setLoanBankName('');
    setLoanBranch('');
    setLoanAccNo('');
    setLoanNo('');
    setLoanAmount('');
    setLoanDate(new Date().toISOString().split('T')[0]);
    setLoanTerm('');
    setLoanRate('');
    setLoanInstallment('');
    setLoanNotes('');
    setLoanStatus('active');
    setEditingLoan(null);
  };

  // Submit Loan
  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = toEnglishNumber(loanAmount);
    if (!loanBankName.trim() || amountNum <= 0) {
      alert('ব্যাংক বা ঋণদাতার নাম এবং সঠিক ঋণের পরিমাণ লিখুন');
      return;
    }

    if (editingLoan) {
      if (!canEditOrDelete) {
        alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
        return;
      }
      updateLoan(editingLoan.id, {
        bankName: loanBankName.trim(),
        branchName: loanBranch.trim(),
        accountNo: loanAccNo.trim(),
        loanNo: loanNo.trim() || editingLoan.loanNo,
        loanAmount: amountNum,
        sanctionDate: loanDate,
        termMonths: loanTerm ? parseInt(loanTerm) : undefined,
        interestRate: loanRate ? parseFloat(loanRate) : undefined,
        monthlyInstallment: loanInstallment ? toEnglishNumber(loanInstallment) : undefined,
        notes: loanNotes.trim(),
        status: loanStatus
      });
      triggerSuccess(`ব্যাংক ঋণ "${loanBankName}" সফলভাবে আপডেট হয়েছে!`);
    } else {
      addLoan({
        bankName: loanBankName.trim(),
        branchName: loanBranch.trim(),
        accountNo: loanAccNo.trim(),
        loanNo: loanNo.trim() || `LN-${Date.now().toString().slice(-4)}`,
        loanAmount: amountNum,
        sanctionDate: loanDate,
        termMonths: loanTerm ? parseInt(loanTerm) : undefined,
        interestRate: loanRate ? parseFloat(loanRate) : undefined,
        monthlyInstallment: loanInstallment ? toEnglishNumber(loanInstallment) : undefined,
        notes: loanNotes.trim(),
        status: 'active'
      });
      triggerSuccess(`নতুন ব্যাংক লোন "${loanBankName}" (${toBengaliNumber(amountNum)} ৳) সফলভাবে যুক্ত হয়েছে!`);
    }

    resetLoanForm();
    setShowAddLoanModal(false);
  };

  // Start Edit Loan
  const handleStartEditLoan = (loan: BankLoan) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingLoan(loan);
    setLoanBankName(loan.bankName || '');
    setLoanBranch(loan.branchName || '');
    setLoanAccNo(loan.accountNo || '');
    setLoanNo(loan.loanNo || '');
    setLoanAmount(loan.loanAmount ? loan.loanAmount.toString() : '');
    setLoanDate(loan.sanctionDate || new Date().toISOString().split('T')[0]);
    setLoanTerm(loan.termMonths ? loan.termMonths.toString() : '');
    setLoanRate(loan.interestRate ? loan.interestRate.toString() : '');
    setLoanInstallment(loan.monthlyInstallment ? loan.monthlyInstallment.toString() : '');
    setLoanNotes(loan.notes || '');
    setLoanStatus(loan.status || 'active');
    setShowAddLoanModal(true);
  };

  // Delete Loan
  const handleDeleteLoan = (loan: BankLoan) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'ব্যাংক ঋণ মুছে ফেলুন',
      message: `আপনি কি নিশ্চিত "${loan.bankName}"-এর ${toBengaliNumber(loan.loanAmount)} ৳ ঋণ অ্যাকাউন্টটি মুছে ফেলতে চান? এটি রিসাইকেল বিনে সংরক্ষিত হবে।`,
      confirmText: 'হ্যাঁ, মুছুন',
      isDestructive: true,
      onConfirm: () => {
        deleteLoan(loan.id);
        triggerSuccess('ব্যাংক ঋণ হিসাবটি রিসাইকেল বিনে পাঠানো হয়েছে।');
      }
    });
  };

  // Reset Repayment Form
  const resetRepaymentForm = () => {
    setRepLoanId('');
    setRepDate(new Date().toISOString().split('T')[0]);
    setRepAmount('');
    setRepMethod('bank');
    setRepVoucher('');
    setRepNotes('');
    setEditingRepayment(null);
  };

  // Open Repayment for specific loan
  const handleOpenRepayForLoan = (loan: BankLoan) => {
    setPreselectedLoanId(loan.id);
    setRepLoanId(loan.id);
    setRepDate(new Date().toISOString().split('T')[0]);
    setRepAmount(loan.monthlyInstallment ? loan.monthlyInstallment.toString() : '');
    setRepMethod('bank');
    setRepVoucher(`RP-${Date.now().toString().slice(-4)}`);
    setRepNotes(`লোন #${loan.loanNo} বাবদ পরিশোধ`);
    setShowAddRepaymentModal(true);
  };

  // Submit Repayment
  const handleSaveRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = toEnglishNumber(repAmount);
    if (!repLoanId || amountNum <= 0) {
      alert('লোন অ্যাকাউন্ট নির্বাচন করুন এবং সঠিক পরিশোধের পরিমাণ লিখুন');
      return;
    }

    const selectedLoan = loans.find(l => l.id === repLoanId);
    const bankName = selectedLoan ? selectedLoan.bankName : 'ব্যাংক লোন';

    if (editingRepayment) {
      if (!canEditOrDelete) {
        alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
        return;
      }
      updateLoanRepayment(editingRepayment.id, {
        loanId: repLoanId,
        bankName,
        repaymentDate: repDate,
        amount: amountNum,
        paymentMethod: repMethod,
        voucherNo: repVoucher.trim(),
        notes: repNotes.trim()
      });
      triggerSuccess(`ঋণ পরিশোধ ভাউচার #${repVoucher || ''} আপডেট হয়েছে!`);
    } else {
      addLoanRepayment({
        loanId: repLoanId,
        bankName,
        repaymentDate: repDate,
        amount: amountNum,
        paymentMethod: repMethod,
        voucherNo: repVoucher.trim() || `REP-${Date.now().toString().slice(-4)}`,
        notes: repNotes.trim()
      });
      triggerSuccess(`${bankName}-এ ${toBengaliNumber(amountNum)} ৳ ঋণ পরিশোধ সফলভাবে সেভ হয়েছে!`);
    }

    resetRepaymentForm();
    setShowAddRepaymentModal(false);
  };

  // Start Edit Repayment
  const handleStartEditRepayment = (rep: LoanRepayment) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingRepayment(rep);
    setRepLoanId(rep.loanId);
    setRepDate(rep.repaymentDate || new Date().toISOString().split('T')[0]);
    setRepAmount(rep.amount ? rep.amount.toString() : '');
    setRepMethod(rep.paymentMethod || 'bank');
    setRepVoucher(rep.voucherNo || '');
    setRepNotes(rep.notes || '');
    setShowAddRepaymentModal(true);
  };

  // Delete Repayment
  const handleDeleteRepayment = (rep: LoanRepayment) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'ঋণ পরিশোধ ভাউচার মুছুন',
      message: `আপনি কি নিশ্চিত এই ${toBengaliNumber(rep.amount)} ৳ ঋণ পরিশোধ ভাউচারটি মুছে ফেলতে চান? এটি রিসাইকেল বিনে সংরক্ষিত হবে।`,
      confirmText: 'হ্যাঁ, মুছুন',
      isDestructive: true,
      onConfirm: () => {
        deleteLoanRepayment(rep.id);
        triggerSuccess('ঋণ পরিশোধ ভাউচারটি রিসাইকেল বিনে পাঠানো হয়েছে।');
      }
    });
  };

  // Print Investment Voucher
  const handlePrintInvestmentVoucher = (inv: Investment) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>বিনিয়োগ জমা ভাউচার - ${inv.referenceNo || inv.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 15px; }
          .shop-title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .sub-title { font-size: 13px; color: #475569; }
          .badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #3730a3; font-weight: bold; border-radius: 9999px; font-size: 12px; margin-top: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; font-size: 13px; }
          .info-box { padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
          .amount-box { margin: 20px 0; padding: 15px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; text-align: center; }
          .amount-val { font-size: 24px; font-weight: bold; color: #065f46; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          .sign-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-title">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</div>
          <div class="sub-title">ইলেকট্রিক ও স্যানিটারি সামগ্রী পাইকারি ও খুচরা বিক্রেতা</div>
          <div class="badge">মূলধন / ব্যবসায়িক বিনিয়োগ জমা ভাউচার</div>
        </div>
        <div class="grid">
          <div class="info-box">
            <strong>রশিদ নং:</strong> ${inv.referenceNo || 'N/A'}<br/>
            <strong>তারিখ:</strong> ${formatDate(inv.date)}<br/>
            <strong>জমার মাধ্যম:</strong> ${inv.paymentMethod === 'cash' ? 'নগদ ক্যাশ' : inv.paymentMethod === 'bank' ? 'ব্যাংক ট্রান্সফার' : 'অনলাইন / মোবাইল ব্যাংকিং'}
          </div>
          <div class="info-box">
            <strong>বিনিয়োগকারী / অংশীদার:</strong> ${inv.investorName}<br/>
            <strong>খাত / উদ্দেশ্য:</strong> ${inv.purpose || 'সাধারণ মূলধন'}<br/>
            <strong>মন্তব্য:</strong> ${inv.notes || '-'}
          </div>
        </div>
        <div class="amount-box">
          <div style="font-size: 13px; color: #047857; margin-bottom: 4px;">প্রাপ্ত বিনিয়োগের মোট পরিমাণ</div>
          <div class="amount-val">${toBengaliNumber(inv.amount)} ৳</div>
        </div>
        <div class="footer">
          <div class="sign-line">বিনিয়োগকারীর স্বাক্ষর</div>
          <div class="sign-line">কর্তৃপক্ষের স্বাক্ষর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 18px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  // Print Loan Statement / Ledger
  const handlePrintLoanStatement = (loan: BankLoan) => {
    const reps = loanRepayments.filter(r => r.loanId === loan.id);
    const repaid = reps.reduce((sum, r) => sum + (r.amount || 0), 0);
    const due = Math.max(0, loan.loanAmount - repaid);

    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    let runningBalance = loan.loanAmount;
    const rowsHtml = reps.map((r, idx) => {
      runningBalance = Math.max(0, runningBalance - r.amount);
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${toBengaliNumber(idx + 1)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${formatDate(r.repaymentDate)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${r.voucherNo || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${r.paymentMethod === 'cash' ? 'ক্যাশ' : r.paymentMethod === 'bank' ? 'ব্যাংক' : 'অনলাইন'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #059669;">${toBengaliNumber(r.amount)} ৳</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #b91c1c;">${toBengaliNumber(runningBalance)} ৳</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ব্যাংক ঋণ হিসাব ও পরিশোধ বিবরণী - ${loan.bankName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 15px; }
          .shop-title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .sub-title { font-size: 13px; color: #475569; }
          .badge { display: inline-block; padding: 4px 12px; background: #ede9fe; color: #5b21b6; font-weight: bold; border-radius: 9999px; font-size: 12px; margin-top: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
          .stat-card { padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; }
          .stat-val { font-size: 16px; font-weight: bold; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          .sign-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-title">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</div>
          <div class="sub-title">ইলেকট্রিক ও স্যানিটারি সামগ্রী পাইকারি ও খুচরা বিক্রেতা</div>
          <div class="badge">ব্যাংক ঋণ লেজার ও পরিশোধ বিবরণী</div>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
          <strong>ব্যাংক / প্রতিষ্ঠান:</strong> ${loan.bankName} ${loan.branchName ? `(${loan.branchName} শাখা)` : ''} | 
          <strong>লোন নং:</strong> ${loan.loanNo} | 
          <strong>অ্যাকাউন্ট নং:</strong> ${loan.accountNo || 'N/A'}<br/>
          <strong>ঋণ গ্রহণের তারিখ:</strong> ${formatDate(loan.sanctionDate)} | 
          <strong>মেয়াদ:</strong> ${loan.termMonths ? `${toBengaliNumber(loan.termMonths)} মাস` : '-'} | 
          <strong>সুদের হার:</strong> ${loan.interestRate ? `${toBengaliNumber(loan.interestRate)}%` : '-'}
        </div>

        <div class="summary-grid">
          <div class="stat-card">
            <div style="color: #64748b;">গৃহীত আসল ঋণ</div>
            <div class="stat-val" style="color: #1e293b;">${toBengaliNumber(loan.loanAmount)} ৳</div>
          </div>
          <div class="stat-card">
            <div style="color: #059669;">মোট পরিশোধিত</div>
            <div class="stat-val" style="color: #059669;">${toBengaliNumber(repaid)} ৳</div>
          </div>
          <div class="stat-card">
            <div style="color: #b91c1c;">বর্তমান বকেয়া ঋণ</div>
            <div class="stat-val" style="color: #b91c1c;">${toBengaliNumber(due)} ৳</div>
          </div>
          <div class="stat-card">
            <div style="color: #6366f1;">স্ট্যাটাস</div>
            <div class="stat-val" style="color: ${due === 0 ? '#059669' : '#d97706'};">
              ${due === 0 ? 'পরিশোধিত (Closed)' : 'চলমান (Active)'}
            </div>
          </div>
        </div>

        <h4 style="margin: 15px 0 5px; color: #334155;">ঋণ পরিশোধের বিস্তারিত তালিকা (${toBengaliNumber(reps.length)} টি কিস্তি)</h4>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">#</th>
              <th>পরিশোধের তারিখ</th>
              <th>ভাউচার / স্লিপ নং</th>
              <th>মাধ্যম</th>
              <th style="text-align: right;">পরিশোধ (৳)</th>
              <th style="text-align: right;">অবশিষ্ট ঋণ (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="padding: 15px; text-align: center; color: #94a3b8;">এখনো কোনো ঋণ পরিশোধ রেকর্ড নেই।</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-line">অ্যাকাউন্টেটের স্বাক্ষর</div>
          <div class="sign-line">ব্যবস্থাপকের স্বাক্ষর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 18px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  // Print Repayment Voucher
  const handlePrintRepaymentSlip = (rep: LoanRepayment) => {
    const targetLoan = loans.find(l => l.id === rep.loanId);
    const printWindow = window.open('', '_blank', 'width=750,height=550');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ঋণ পরিশোধের ভাউচার - ${rep.voucherNo || rep.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1e293b; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 15px; }
          .shop-title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
          .sub-title { font-size: 13px; color: #475569; }
          .badge { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; font-weight: bold; border-radius: 9999px; font-size: 12px; margin-top: 5px; }
          .info-box { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 15px 0; }
          .amount-box { margin: 15px 0; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; text-align: center; }
          .amount-val { font-size: 22px; font-weight: bold; color: #15803d; }
          .footer { margin-top: 45px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          .sign-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-title">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</div>
          <div class="sub-title">ইলেকট্রিক ও স্যানিটারি সামগ্রী পাইকারি ও খুচরা বিক্রেতা</div>
          <div class="badge">ব্যাংক ঋণ কিস্তি / পরিশোধের প্রমাণপত্র</div>
        </div>

        <div class="info-box">
          <strong>ভাউচার / স্লিপ নং:</strong> ${rep.voucherNo || 'N/A'}<br/>
          <strong>তারিখ:</strong> ${formatDate(rep.repaymentDate)}<br/>
          <strong>ব্যাংক বা ঋণদাতা:</strong> ${rep.bankName} ${targetLoan?.branchName ? `(${targetLoan.branchName} শাখা)` : ''}<br/>
          <strong>লোন হিসাব নং:</strong> ${targetLoan?.loanNo || targetLoan?.accountNo || 'N/A'}<br/>
          <strong>পরিশোধের মাধ্যম:</strong> ${rep.paymentMethod === 'cash' ? 'নগদ ক্যাশ' : rep.paymentMethod === 'bank' ? 'ব্যাংক ট্রান্সফার' : rep.paymentMethod === 'cheque' ? 'চেক' : 'অনলাইন'}<br/>
          <strong>বিবরণ / নোট:</strong> ${rep.notes || '-'}
        </div>

        <div class="amount-box">
          <div style="font-size: 13px; color: #166534; margin-bottom: 4px;">পরিশোধকৃত ঋণের পরিমাণ</div>
          <div class="amount-val">${toBengaliNumber(rep.amount)} ৳</div>
        </div>

        <div class="footer">
          <div class="sign-line">জমা প্রদানকারীর স্বাক্ষর</div>
          <div class="sign-line">কর্তৃপক্ষের স্বাক্ষর</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 18px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-indigo-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                <Landmark className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight">
                  {language === 'bn' ? 'ব্যবসায়ের বিনিয়োগ ও ব্যাংক ঋণ ব্যবস্থাপনা' : 'Business Investment & Bank Loans'}
                </h1>
                <p className="text-xs text-indigo-200/90 font-medium">
                  {language === 'bn' 
                    ? 'মূলধন বিনিয়োগ হিসাব, ব্যাংক ঋণ ও কিস্তি পরিশোধের সার্বিক বিবরণী' 
                    : 'Manage capital investments, bank loans, and repayment schedules'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetInvestmentForm();
                setShowAddInvestmentModal(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ নতুন বিনিয়োগ যোগ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetLoanForm();
                setShowAddLoanModal(true);
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ নতুন ব্যাংক ঋণ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetRepaymentForm();
                setShowAddRepaymentModal(true);
              }}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>+ ঋণ পরিশোধ (Return)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Investment */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500">মোট বিনিয়োগ (মূলধন)</span>
            <div className="text-base sm:text-lg font-black text-emerald-700">
              {toBengaliNumber(totalInvestmentAmount)} ৳
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {toBengaliNumber(investments.length)} টি এন্ট্রি
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Loan Taken */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500">মোট গৃহীত ব্যাংক ঋণ</span>
            <div className="text-base sm:text-lg font-black text-indigo-700">
              {toBengaliNumber(totalLoanSanctioned)} ৳
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {toBengaliNumber(loans.length)} টি অ্যাকাউন্ট
            </span>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Loan Repaid */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500">মোট ঋণ পরিশোধ</span>
            <div className="text-base sm:text-lg font-black text-blue-700">
              {toBengaliNumber(totalLoanRepaid)} ৳
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {toBengaliNumber(loanRepayments.length)} টি কিস্তি
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Outstanding Loan Due */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500">অবশিষ্ট বকেয়া ব্যাংক ঋণ</span>
            <div className="text-base sm:text-lg font-black text-rose-600">
              {toBengaliNumber(totalOutstandingLoanDue)} ৳
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              totalOutstandingLoanDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {totalOutstandingLoanDue === 0 ? 'কোনো দেনা নেই' : 'পরিশোধযোগ্য'}
            </span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('investments')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'investments' 
                  ? 'bg-white text-emerald-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>১. ব্যবসায়িক বিনিয়োগ ({toBengaliNumber(investments.length)})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('loans')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'loans' 
                  ? 'bg-white text-indigo-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>২. ব্যাংক লোন ({toBengaliNumber(loans.length)})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('repayments')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'repayments' 
                  ? 'bg-white text-blue-800 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-blue-600" />
              <span>৩. ঋণ পরিশোধের হিসাব ({toBengaliNumber(loanRepayments.length)})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder={activeTab === 'investments' ? 'বিনিয়োগকারী / ভাউচার খুঁজুন...' : 'ব্যাংক বা লোন নং খুঁজুন...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full sm:w-60 focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Tab 1: Business Investments */}
        {activeTab === 'investments' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">তারিখ ফিল্টার:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:bg-white"
                />
                <span className="text-xs text-slate-400">থেকে</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:bg-white"
                />
                {(startDate || endDate || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSearchQuery('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 transition"
                    title="রিসেট"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                মোট নির্বাচিত বিনিয়োগ: {toBengaliNumber(filteredInvestments.reduce((sum, i) => sum + (i.amount || 0), 0))} ৳
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">বিনিয়োগকারীর নাম</th>
                    <th className="p-2.5">খাত / উদ্দেশ্য</th>
                    <th className="p-2.5">মাধ্যম</th>
                    <th className="p-2.5">রেফারেন্স / রশিদ</th>
                    <th className="p-2.5 text-right">পরিমাণ (৳)</th>
                    <th className="p-2.5 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvestments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        {searchQuery || startDate ? 'খোঁজার ফলাফলে কোনো বিনিয়োগের তথ্য পাওয়া যায়নি।' : 'এখনো কোনো ব্যবসায়িক বিনিয়োগ এন্ট্রি করা হয়নি। উপরে "+ নতুন বিনিয়োগ যোগ" বাটনে ক্লিক করে যুক্ত করুন।'}
                      </td>
                    </tr>
                  ) : (
                    filteredInvestments.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 text-center text-slate-500 font-mono">{toBengaliNumber(idx + 1)}</td>
                        <td className="p-2.5 text-slate-700 whitespace-nowrap">{toBengaliNumber(formatDate(inv.date))}</td>
                        <td className="p-2.5 font-bold text-slate-900">{inv.investorName}</td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate" title={inv.purpose || '-'}>
                          {inv.purpose || '-'}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            inv.paymentMethod === 'bank' ? 'bg-indigo-100 text-indigo-800' :
                            inv.paymentMethod === 'online' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {inv.paymentMethod === 'bank' ? 'ব্যাংক' : inv.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">{inv.referenceNo || '-'}</td>
                        <td className="p-2.5 text-right font-extrabold text-emerald-700 text-sm">
                          {toBengaliNumber(inv.amount)} ৳
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingInvestment(inv)}
                              title="বিস্তারিত দেখুন"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintInvestmentVoucher(inv)}
                              title="ভাউচার প্রিন্ট করুন"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditInvestment(inv)}
                                  title="এডিট করুন"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvestment(inv)}
                                  title="মুছুন"
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
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
        )}

        {/* Tab 2: Bank Loans */}
        {activeTab === 'loans' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <span className="text-xs text-slate-500">
                ব্যাংক বা ঋণদাতার তালিকা এবং বর্তমান ঋণ স্থিতি
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">
                  মোট ঋণ: {toBengaliNumber(totalLoanSanctioned)} ৳
                </span>
                <span className="text-xs font-bold text-rose-900 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                  মোট বকেয়া: {toBengaliNumber(totalOutstandingLoanDue)} ৳
                </span>
              </div>
            </div>

            {/* Loans Cards / Table Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLoans.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                  এখনো কোনো ব্যাংক লোন অ্যাকাউন্ট যুক্ত করা হয়নি। উপরে "+ নতুন ব্যাংক ঋণ" বাটনে ক্লিক করে যুক্ত করুন।
                </div>
              ) : (
                filteredLoans.map((loan) => {
                  const repaid = loanRepaymentMap.get(loan.id) || 0;
                  const remaining = Math.max(0, loan.loanAmount - repaid);
                  const isClosed = remaining === 0 || loan.status === 'closed';

                  return (
                    <div 
                      key={loan.id}
                      className="bg-slate-50/60 rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                            <h3 className="text-sm font-bold text-slate-900">{loan.bankName}</h3>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {loan.branchName && <span>শাখা: {loan.branchName} | </span>}
                            <span>হিসাব/লোন নং: #{loan.loanNo}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isClosed 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {isClosed ? 'পরিশোধিত' : 'চলমান ঋণ'}
                        </span>
                      </div>

                      {/* Financial Numbers Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200/70 text-center">
                        <div>
                          <div className="text-[10px] text-slate-500">গৃহীত ঋণ</div>
                          <div className="text-xs sm:text-sm font-bold text-slate-800">
                            {toBengaliNumber(loan.loanAmount)} ৳
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-emerald-600 font-medium">পরিশোধিত</div>
                          <div className="text-xs sm:text-sm font-bold text-emerald-700">
                            {toBengaliNumber(repaid)} ৳
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-rose-600 font-medium">বর্তমান বকেয়া</div>
                          <div className="text-xs sm:text-sm font-extrabold text-rose-600">
                            {toBengaliNumber(remaining)} ৳
                          </div>
                        </div>
                      </div>

                      {/* Loan Terms info */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 px-1">
                        <span>তারিখ: {toBengaliNumber(formatDate(loan.sanctionDate))}</span>
                        {loan.termMonths && <span>মেয়াদ: {toBengaliNumber(loan.termMonths)} মাস</span>}
                        {loan.interestRate && <span>সুদ: {toBengaliNumber(loan.interestRate)}%</span>}
                        {loan.monthlyInstallment && (
                          <span className="font-semibold text-indigo-700">
                            কিস্তি: {toBengaliNumber(loan.monthlyInstallment)} ৳
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                        <button
                          type="button"
                          onClick={() => handleOpenRepayForLoan(loan)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ কিস্তি পরিশোধ</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingLoanStatement(loan)}
                            title="বিবরণী / লেজার দেখুন"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintLoanStatement(loan)}
                            title="স্টেটমেন্ট প্রিন্ট করুন"
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canEditOrDelete && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditLoan(loan)}
                                title="এডিট করুন"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLoan(loan)}
                                title="মুছুন"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Loan Repayments History */}
        {activeTab === 'repayments' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">তারিখ ফিল্টার:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:bg-white"
                />
                <span className="text-xs text-slate-400">থেকে</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:bg-white"
                />
              </div>

              <div className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                মোট নির্বাচিত পরিশোধ: {toBengaliNumber(filteredRepayments.reduce((sum, r) => sum + (r.amount || 0), 0))} ৳
              </div>
            </div>

            {/* Repayments Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5 text-center">#</th>
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">ভাউচার / স্লিপ নং</th>
                    <th className="p-2.5">ব্যাংক / ঋণদাতা</th>
                    <th className="p-2.5">পরিশোধ মাধ্যম</th>
                    <th className="p-2.5">মন্তব্য / বিবরণ</th>
                    <th className="p-2.5 text-right">পরিশোধের পরিমাণ</th>
                    <th className="p-2.5 text-center">একশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRepayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        এখনো কোনো ঋণ পরিশোধের তথ্য নেই।
                      </td>
                    </tr>
                  ) : (
                    filteredRepayments.map((rep, idx) => (
                      <tr key={rep.id} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 text-center text-slate-500 font-mono">{toBengaliNumber(idx + 1)}</td>
                        <td className="p-2.5 text-slate-700 whitespace-nowrap">{toBengaliNumber(formatDate(rep.repaymentDate))}</td>
                        <td className="p-2.5 font-mono text-purple-700 font-bold">{rep.voucherNo || '-'}</td>
                        <td className="p-2.5 font-bold text-slate-800">{rep.bankName}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            rep.paymentMethod === 'bank' ? 'bg-indigo-100 text-indigo-800' :
                            rep.paymentMethod === 'cheque' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {rep.paymentMethod === 'bank' ? 'ব্যাংক' : rep.paymentMethod === 'cheque' ? 'চেক' : rep.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 max-w-xs truncate" title={rep.notes || '-'}>
                          {rep.notes || '-'}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-blue-700 text-sm">
                          {toBengaliNumber(rep.amount)} ৳
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingRepayment(rep)}
                              title="বিস্তারিত দেখুন"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintRepaymentSlip(rep)}
                              title="স্লিপ প্রিন্ট করুন"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canEditOrDelete && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditRepayment(rep)}
                                  title="এডিট করুন"
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRepayment(rep)}
                                  title="মুছুন"
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
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
        )}
      </div>

      {/* ================= MODALS ================= */}

      {/* Add / Edit Investment Modal */}
      {showAddInvestmentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">
                  {editingInvestment ? 'বিনিয়োগ তথ্য সংশোধন / এডিট' : '+ নতুন মূলধন বা ব্যবসায়িক বিনিয়োগ এন্ট্রি'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInvestmentModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  বিনিয়োগকারী / অংশীদারের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: জনাব আরিফ হোসেন / মালিক"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    বিনিয়োগের পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="পরিমাণ"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    জমার তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">জমার মাধ্যম</label>
                  <select
                    value={invMethod}
                    onChange={(e: any) => setInvMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">নগদ ক্যাশ (ক্যাশ বক্সে জমা)</option>
                    <option value="bank">ব্যাংক ডিপোজিট</option>
                    <option value="online">অনলাইন / বিকাশ / নগদ</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ভাউচার / রশিদ নং</label>
                  <input
                    type="text"
                    placeholder="ঐচ্ছিক (যেমন: INV-01)"
                    value={invRef}
                    onChange={(e) => setInvRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">উদ্দেশ্য / খাত</label>
                <input
                  type="text"
                  placeholder="যেমন: নতুন পণ্য ক্রয়, দোকানের ডেকোরেশন"
                  value={invPurpose}
                  onChange={(e) => setInvPurpose(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">নোট / মন্তব্য</label>
                <textarea
                  rows={2}
                  placeholder="অতিরিক্ত কোনো শর্ত বা তথ্য..."
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddInvestmentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingInvestment ? 'আপডেট করুন' : 'বিনিয়োগ সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Loan Modal */}
      {showAddLoanModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            <div className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-200" />
                <h3 className="font-bold text-sm">
                  {editingLoan ? 'ব্যাংক লোন তথ্য সংশোধন / এডিট' : '+ নতুন ব্যাংক ঋণ / লোন একাউন্ট এন্ট্রি'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLoanModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ব্যাংক বা ঋণদাতার নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: সোনালী ব্যাংক"
                    value={loanBankName}
                    onChange={(e) => setLoanBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">শাখা (Branch)</label>
                  <input
                    type="text"
                    placeholder="যেমন: চকবাজার শাখা"
                    value={loanBranch}
                    onChange={(e) => setLoanBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ঋণের আসল পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="মোট লোন পরিমাণ"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    ঋণ গ্রহণের তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">লোন নং / রেফারেন্স নং</label>
                  <input
                    type="text"
                    placeholder="যেমন: LN-2026-01"
                    value={loanNo}
                    onChange={(e) => setLoanNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ব্যাংক অ্যাকাউন্ট নং</label>
                  <input
                    type="text"
                    placeholder="যেমন: 205012345678"
                    value={loanAccNo}
                    onChange={(e) => setLoanAccNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মেয়াদ (মাস)</label>
                  <input
                    type="number"
                    placeholder="যেমন: 24"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">সুদের হার (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="যেমন: 9.0"
                    value={loanRate}
                    onChange={(e) => setLoanRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">মাসিক কিস্তি (৳)</label>
                  <input
                    type="number"
                    placeholder="যেমন: 15000"
                    value={loanInstallment}
                    onChange={(e) => setLoanInstallment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {editingLoan && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">স্ট্যাটাস</label>
                  <select
                    value={loanStatus}
                    onChange={(e: any) => setLoanStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                  >
                    <option value="active">চলমান ঋণ (Active)</option>
                    <option value="closed">পরিশোধিত / সমাপ্ত (Closed)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">নোট / বিবরণ</label>
                <textarea
                  rows={2}
                  placeholder="ঋণের শর্তাবলী বা নোট..."
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLoanModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingLoan ? 'আপডেট করুন' : 'ঋণ একাউন্ট সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Repayment Modal */}
      {showAddRepaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-sm">
                  {editingRepayment ? 'ঋণ পরিশোধ সংশোধন / এডিট' : '+ ঋণ পরিশোধ / কিস্তি জমা ভাউচার'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRepaymentModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRepayment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ব্যাংক লোন অ্যাকাউন্ট নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={repLoanId}
                  onChange={(e) => setRepLoanId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- লোন নির্বাচন করুন --</option>
                  {loans.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.bankName} (#{l.loanNo}) - আসল: {toBengaliNumber(l.loanAmount)} ৳
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    পরিশোধের পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="পরিশোধের টাকা"
                    value={repAmount}
                    onChange={(e) => setRepAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    পরিশোধের তারিখ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={repDate}
                    onChange={(e) => setRepDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">পরিশোধের মাধ্যম</label>
                  <select
                    value={repMethod}
                    onChange={(e: any) => setRepMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank">ব্যাংক ট্রান্সফার / জমা</option>
                    <option value="cash">নগদ ক্যাশ (ক্যাশ থেকে মাইনাস)</option>
                    <option value="cheque">চেক</option>
                    <option value="online">অনলাইন / বিকাশ</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ভাউচার / স্লিপ নং</label>
                  <input
                    type="text"
                    placeholder="যেমন: SLIP-102"
                    value={repVoucher}
                    onChange={(e) => setRepVoucher(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">নোট / মন্তব্য</label>
                <textarea
                  rows={2}
                  placeholder="যেমন: ৩য় কিস্তি পরিশোধ..."
                  value={repNotes}
                  onChange={(e) => setRepNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRepaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingRepayment ? 'আপডেট করুন' : 'পরিশোধ সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Investment Modal */}
      {viewingInvestment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 text-xs">
            <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">বিনিয়োগ ভাউচার বিবরণ</h3>
              <button
                type="button"
                onClick={() => setViewingInvestment(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">বিনিয়োগকারী:</span>
                <span className="font-bold text-slate-900">{viewingInvestment.investorName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">পরিমাণ:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{toBengaliNumber(viewingInvestment.amount)} ৳</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">তারিখ:</span>
                <span>{toBengaliNumber(formatDate(viewingInvestment.date))}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">জমার মাধ্যম:</span>
                <span className="font-semibold">{viewingInvestment.paymentMethod === 'bank' ? 'ব্যাংক' : viewingInvestment.paymentMethod === 'online' ? 'অনলাইন' : 'ক্যাশ'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">রেফারেন্স / রশিদ:</span>
                <span className="font-mono">{viewingInvestment.referenceNo || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">খাত / উদ্দেশ্য:</span>
                <span>{viewingInvestment.purpose || '-'}</span>
              </div>
              {viewingInvestment.notes && (
                <div className="p-2.5 bg-slate-50 rounded border text-slate-600">
                  <strong>মন্তব্য:</strong> {viewingInvestment.notes}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => handlePrintInvestmentVoucher(viewingInvestment)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট ভাউচার</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingInvestment(null)}
                className="px-4 py-1.5 border rounded-lg text-slate-600"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Loan Statement Modal */}
      {viewingLoanStatement && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 text-xs max-h-[90vh] flex flex-col">
            <div className="bg-indigo-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">ব্যাংক ঋণ লেজার ও পরিশোধের ইতিহাস</h3>
                <span className="text-[11px] text-indigo-200">
                  {viewingLoanStatement.bankName} (#{viewingLoanStatement.loanNo})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingLoanStatement(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {/* Stat summary */}
              {(() => {
                const reps = loanRepayments.filter(r => r.loanId === viewingLoanStatement.id);
                const repaid = reps.reduce((sum, r) => sum + (r.amount || 0), 0);
                const remaining = Math.max(0, viewingLoanStatement.loanAmount - repaid);

                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border text-center">
                      <div>
                        <div className="text-slate-500 text-[10px]">গৃহীত মোট ঋণ</div>
                        <div className="text-sm font-bold text-slate-800">{toBengaliNumber(viewingLoanStatement.loanAmount)} ৳</div>
                      </div>
                      <div>
                        <div className="text-emerald-600 text-[10px]">এ পর্যন্ত পরিশোধ</div>
                        <div className="text-sm font-bold text-emerald-700">{toBengaliNumber(repaid)} ৳</div>
                      </div>
                      <div>
                        <div className="text-rose-600 text-[10px]">বর্তমান বকেয়া ঋণ</div>
                        <div className="text-sm font-black text-rose-600">{toBengaliNumber(remaining)} ৳</div>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 pt-2 border-t">পরিশোধিত কিস্তিসমূহের তালিকা:</h4>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-semibold border-b">
                          <th className="p-2 text-center">#</th>
                          <th className="p-2">তারিখ</th>
                          <th className="p-2">ভাউচার</th>
                          <th className="p-2">মাধ্যম</th>
                          <th className="p-2 text-right">পরিশোধ (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reps.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400">
                              এখনো কোনো কিস্তি পরিশোধ করা হয়নি।
                            </td>
                          </tr>
                        ) : (
                          reps.map((r, i) => (
                            <tr key={r.id}>
                              <td className="p-2 text-center font-mono">{toBengaliNumber(i + 1)}</td>
                              <td className="p-2">{toBengaliNumber(formatDate(r.repaymentDate))}</td>
                              <td className="p-2 font-mono">{r.voucherNo || '-'}</td>
                              <td className="p-2">{r.paymentMethod}</td>
                              <td className="p-2 text-right font-bold text-emerald-700">{toBengaliNumber(r.amount)} ৳</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => handlePrintLoanStatement(viewingLoanStatement)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্টেটমেন্ট প্রিন্ট</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingLoanStatement(null)}
                className="px-4 py-1.5 border rounded-lg text-slate-600"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Repayment Modal */}
      {viewingRepayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 text-xs">
            <div className="bg-blue-800 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">ঋণ পরিশোধ রসিদ বিবরণ</h3>
              <button
                type="button"
                onClick={() => setViewingRepayment(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">ব্যাংক / ঋণদাতা:</span>
                <span className="font-bold text-slate-900">{viewingRepayment.bankName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">পরিশোধের পরিমাণ:</span>
                <span className="font-extrabold text-blue-700 text-sm">{toBengaliNumber(viewingRepayment.amount)} ৳</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">তারিখ:</span>
                <span>{toBengaliNumber(formatDate(viewingRepayment.repaymentDate))}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">ভাউচার / স্লিপ নং:</span>
                <span className="font-mono">{viewingRepayment.voucherNo || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">পরিশোধের মাধ্যম:</span>
                <span>{viewingRepayment.paymentMethod}</span>
              </div>
              {viewingRepayment.notes && (
                <div className="p-2.5 bg-slate-50 rounded border text-slate-600">
                  <strong>নোট:</strong> {viewingRepayment.notes}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-5 py-3 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => handlePrintRepaymentSlip(viewingRepayment)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্লিপ প্রিন্ট</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingRepayment(null)}
                className="px-4 py-1.5 border rounded-lg text-slate-600"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
