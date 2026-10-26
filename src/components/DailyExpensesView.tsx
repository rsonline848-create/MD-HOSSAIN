import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { Receipt, Plus, Trash2, Calendar, Tag, Search, Edit } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatCurrency, formatDate, normalizeDate } from '../utils/formatters';

export const DailyExpensesView: React.FC = () => {
  const { 
    selectedDate, 
    expenses, 
    addExpense, 
    moveToRecycleBin,
    canEditOrDelete,
    setExpenses,
    confirmAction
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedStartDate, setAppliedStartDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [appliedEndDate, setAppliedEndDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);

  // Input Refs for Enter Navigation
  const categoryRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const paymentMethodRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!category.trim()) {
        alert('খরচের খাত (ক্যাটাগরি) লিখুন!');
        return;
      }
      if (!amount || toEnglishNumber(amount.toString()) <= 0) {
        alert('সঠিক খরচের পরিমাণ লিখুন!');
        return;
      }

      if (editingId) {
        if (!canEditOrDelete) {
          alert('ম্যানেজার একাউন্ট থেকে কোনো খরচ এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
          return;
        }
        // Also persist editing!
        const updatedExpenses = expenses.map(exp => {
          if (exp.id === editingId) {
            return {
              ...exp,
              category: category.trim(),
              description: description.trim() || category.trim(),
              amount: toEnglishNumber(amount.toString()),
              paymentMethod
            };
          }
          return exp;
        });
        setExpenses(updatedExpenses);
        setEditingId(null);
      } else {
        addExpense({
          date: normalizeDate(selectedDate) || new Date().toISOString().split('T')[0],
          category: category.trim(),
          description: description.trim() || category.trim(),
          amount: toEnglishNumber(amount.toString()),
          paymentMethod
        });
      }

      setCategory('');
      setDescription('');
      setAmount("");
      setPaymentMethod('cash');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (exp: Expense) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো খরচ এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingId(exp.id);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setPaymentMethod(exp.paymentMethod);
    setDescription(exp.description || '');
    categoryRef.current?.focus();
    categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCategory('');
    setDescription('');
    setAmount("");
    setPaymentMethod('cash');
  };

  const handleDelete = (exp: Expense) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো খরচ ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'খরচ মুছে ফেলুন',
      message: `আপনি কি এই খরচের এন্ট্রি (${exp.category} - ${toBengaliNumber(exp.amount)} ৳) রিসাইকেল বিনে পাঠাতে চান?`,
      confirmText: 'হ্যাঁ, মুছুন',
      isDestructive: true,
      onConfirm: () => {
        moveToRecycleBin('expense', `খরচ: ${exp.category} (${exp.description})`, exp, exp.amount);
        setExpenses(prev => prev.filter(e => e.id !== exp.id));
      }
    });
  };

  const handleDownloadPDF = () => {
    const dateText = `${formatDate(appliedStartDate)} থেকে ${formatDate(appliedEndDate)}`;
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="text-align: center; margin-bottom: 5px;">খরচের তালিকা</h2>
        <p style="text-align: center; margin-top: 0; color: #666; margin-bottom: 20px;">তারিখ: ${dateText}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;">তারিখ</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;">খরচের খাত</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;">বিবরণ</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;">মাধ্যম</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f4f4f4;">পরিমাণ (৳)</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f4f4f4;">ইউজার</th>
            </tr>
          </thead>
          <tbody>
            ${filteredExpenses.map(exp => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${toBengaliNumber(formatDate(exp.date))}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${exp.category}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${exp.description || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${exp.paymentMethod === 'cash' ? 'নগদ' : 'অনলাইন'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${toBengaliNumber(exp.amount)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${exp.createdBy || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f4f4f4;">মোট খরচ:</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; background-color: #f4f4f4;">${toBengaliNumber(totalFilteredExpense)}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;"></th>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>PDF Download</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          </head>
          <body>
            <div id="pdf-content">
              ${htmlContent}
            </div>
            <p style="text-align: center; margin-top: 20px; color: #666; font-family: sans-serif;">Preparing PDF... Please wait.</p>
            <script>
              window.onload = function() {
                const opt = {
                  margin: 0.5,
                  filename: 'Expense_Statement_${appliedStartDate}_to_${appliedEndDate}.pdf',
                  image: { type: 'jpeg', quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                };
                html2pdf().set(opt).from(document.getElementById('pdf-content')).save().then(() => {
                  window.close();
                });
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const dateText = `${toBengaliNumber(appliedStartDate)} থেকে ${toBengaliNumber(appliedEndDate)}`;
      printWindow.document.write(`
        <html>
          <head>
            <title>দৈনিক খরচের তালিকা - ${dateText}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              h2 { text-align: center; margin-bottom: 5px; }
              .date-subtitle { text-align: center; margin-top: 0; color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            <h2>খরচের তালিকা</h2>
            <p class="date-subtitle">তারিখ: ${dateText}</p>
            <table>
              <thead>
                <tr>
                  <th>তারিখ</th>
                  <th>খরচের খাত</th>
                  <th>বিবরণ</th>
                  <th>মাধ্যম</th>
                  <th class="text-right">পরিমাণ (৳)</th>
                  <th class="text-center">ইউজার</th>
                </tr>
              </thead>
              <tbody>
                ${filteredExpenses.map(exp => `
                  <tr>
                    <td>${toBengaliNumber(formatDate(exp.date))}</td>
                    <td>${exp.category}</td>
                    <td>${exp.description || '-'}</td>
                    <td>${exp.paymentMethod === 'cash' ? 'নগদ' : 'অনলাইন'}</td>
                    <td class="text-right">${toBengaliNumber(exp.amount)}</td>
                    <td class="text-center">${exp.createdBy || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="4" class="text-right">মোট খরচ:</th>
                  <th class="text-right">${toBengaliNumber(totalFilteredExpense)}</th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
            <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 25px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
              App Developer: RS ONLINE - 01611814813
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchDate = e.date >= appliedStartDate && e.date <= appliedEndDate;
    const cat = (e.category || '').toLowerCase();
    const desc = (e.description || e.title || '').toLowerCase();
    const search = searchQuery.toLowerCase();
    const matchSearch = cat.includes(search) || desc.includes(search);
    return matchDate && (searchQuery ? matchSearch : true);
  });

  const totalFilteredExpense = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>দৈনিক খরচ ও স্টেটমেন্ট</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-[#5d46e2] hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect width="12" height="8" x="6" y="14"/></svg>
            প্রিন্ট
          </button>
          
          {/* PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 bg-[#059669] hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            পিডিএফ
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-5 shadow-sm">
         <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">শুরুর তারিখ:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-700 focus:outline-none focus:border-indigo-500" 
            />
         </div>
         <div className="flex items-center gap-2">
            <span className="font-bold text-white bg-[#0070f3] px-2 py-0.5 rounded text-sm">শেষ তারিখ:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 text-sm font-semibold text-indigo-700 focus:outline-none focus:border-indigo-500" 
            />
         </div>
         <button 
           onClick={() => {
             setAppliedStartDate(startDate);
             setAppliedEndDate(endDate);
           }} 
           className="bg-[#5d46e2] text-white font-bold px-6 py-2 rounded-lg text-sm hover:bg-indigo-700 transition shadow-sm"
         >
           হিসাব দেখুন
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Add Expense Form */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {editingId ? <Edit className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-rose-600" />}
              <span>{editingId ? 'খরচ আপডেট করুন' : 'নতুন খরচ যোগ করুন'}</span>
            </h3>
            {editingId && (
              <button onClick={handleCancelEdit} type="button" className="text-xs font-bold text-slate-500 hover:text-rose-600">
                বাতিল করুন
              </button>
            )}
          </div>

          <form onSubmit={handleAdd} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">খরচের খাত (ক্যাটাগরি) *</label>
              <input
                ref={categoryRef}
                type="text"
                placeholder="খরচের খাত লিখুন (যেমন: দোকান ভাড়া, নাস্তা, বিদ্যুৎ বিল...)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    amountRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['কর্মচারী বেতন', 'দোকান ভাড়া', 'বিদ্যুৎ বিল', 'নাস্তা / খাবার', 'পরিবহন', 'চা / আপ্যায়ন'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">টাকার পরিমাণ (৳) *</label>
              <input
                ref={amountRef}
                type="text" inputMode="numeric"
                placeholder="0"
                value={amount || ''}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    paymentMethodRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-rose-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">পরিশোধের মাধ্যম</label>
              <select
                ref={paymentMethodRef}
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    descriptionRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <option value="cash">নগদ ক্যাশ (হাত ক্যাশ থেকে বিয়োগ হবে)</option>
                <option value="online">অনলাইন / ব্যাংক পেমেন্ট</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">খরচের বিস্তারিত বিবরণ (ঐচ্ছিক)</label>
              <textarea
                ref={descriptionRef}
                rows={2}
                placeholder="যেমন: দুপুরের খাবার, বৈদ্যুতিক তারের ক্লিপ মেরামত..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitButtonRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs"
              />
            </div>

            <button
              ref={submitButtonRef}
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow transition active:scale-98"
            >
              খরচ যোগ করুন
            </button>
          </form>
        </div>

        {/* Right 2 Cols: Expenses List */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">খরচের তালিকা</h3>
              <p className="text-xs text-rose-600 font-bold">
                মোট খরচ: {toBengaliNumber(totalFilteredExpense)} ৳
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="খাত বা বিবরণ খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full sm:w-52"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">খরচের খাত</th>
                  <th className="p-2.5">বিবরণ</th>
                  <th className="p-2.5">মাধ্যম</th>
                  <th className="p-2.5 text-right">পরিমাণ</th>
                  <th className="p-2.5 text-center">ইউজার</th>
                  <th className="p-2.5 text-center">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      কোনো খরচের রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-600">{toBengaliNumber(formatDate(exp.date))}</td>
                      <td className="p-2.5 font-bold text-slate-800">{exp.category}</td>
                      <td className="p-2.5 text-slate-600">{exp.description}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          exp.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {exp.paymentMethod === 'cash' ? '💵 ক্যাশ' : '📱 অনলাইন'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-rose-600">{toBengaliNumber(exp.amount)} ৳</td>
                      <td className="p-2.5 text-center text-slate-500 font-medium">{exp.recordedBy || exp.createdBy || 'Admin'}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEditOrDelete ? (
                            <>
                              <button
                                onClick={() => handleEdit(exp)}
                                className="p-1 text-indigo-500 hover:bg-indigo-50 rounded transition cursor-pointer active:scale-95"
                                title="এডিট করুন"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(exp)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer active:scale-95"
                                title="মুছুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                              🔒 সুরক্ষিত
                            </span>
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

    </div>
  );
};
