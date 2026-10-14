import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { Truck, Search, Plus, Phone, MapPin, Edit, Trash2, History } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatCurrency, formatDate } from '../utils/formatters';

export const SuppliersView: React.FC = () => {
  const { suppliers, setSuppliers, supplierBills, supplierPayments, moveToRecycleBin } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewSupplierLedger, setViewSupplierLedger] = useState<Supplier | null>(null);

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

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery) ||
    (s.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSupplierPayableAll = suppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyName.trim()) return;

    if (editingSupplier) {
      setSuppliers(prev => prev.map(s => {
        if (s.id === editingSupplier.id) {
          const diff = (Number(openingPayable) || 0) - (editingSupplier.openingPayable || 0);
          return {
            ...s,
            name: name.trim(),
            companyName: companyName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            openingPayable: Number(openingPayable) || 0,
            currentPayable: Math.max(0, (s.currentPayable || 0) + diff)
          };
        }
        return s;
      }));
    } else {
      const newSup: Supplier = {
        id: 's_' + Date.now(),
        name: name.trim(),
        companyName: companyName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingPayable: Number(openingPayable) || 0,
        totalPurchased: 0,
        totalPaid: 0,
        currentPayable: Number(openingPayable) || 0,
        createdDate: new Date().toISOString().split('T')[0]
      };
      setSuppliers(prev => [newSup, ...prev]);
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
    setEditingSupplier(sup);
    setName(sup.name);
    setCompanyName(sup.companyName);
    setPhone(sup.phone);
    setAddress(sup.address);
    setOpeningPayable(String(sup.openingPayable || ""));
    setShowAddModal(true);
  };

  const handleDelete = (sup: Supplier) => {
    if (confirm(`আপনি কি সাপ্লায়ার ${sup.companyName}-কে রিসাইকেল বিনে পাঠাতে চান?`)) {
      moveToRecycleBin('supplier', `সাপ্লায়ার: ${sup.companyName} (${sup.name})`, sup, sup.currentPayable);
      setSuppliers(prev => prev.filter(s => s.id !== sup.id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-purple-600" />
            <span>সাপ্লায়ার ও মহাজন লেজার (Supplier Accounts)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            মোট প্রদেয় বকেয়া (মহাজন পাবে): <span className="font-extrabold text-purple-700 text-sm">{toBengaliNumber(totalSupplierPayableAll)} ৳</span>
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
                <th className="p-3 text-right">মোট মাল ক্রয়</th>
                <th className="p-3 text-right">মোট পরিশোধ</th>
                <th className="p-3 text-right">বর্তমান পাবে (Payable)</th>
                <th className="p-3 text-center">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    কোনো সাপ্লায়ার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup, idx) => (
                  <tr key={sup.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                    <td className="p-3 font-bold text-purple-900">
                      <button onClick={() => setViewSupplierLedger(sup)} className="hover:underline text-left">
                        {sup.companyName}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{sup.name}</td>
                    <td className="p-3 text-slate-600 font-mono">{sup.phone || '-'}</td>
                    <td className="p-3 text-slate-600">{sup.address || '-'}</td>
                    <td className="p-3 text-right text-slate-600">{toBengaliNumber(sup.openingPayable || 0)} ৳</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{toBengaliNumber(sup.totalPurchased || 0)} ৳</td>
                    <td className="p-3 text-right font-semibold text-emerald-700">{toBengaliNumber(sup.totalPaid || 0)} ৳</td>
                    <td className="p-3 text-right font-extrabold text-sm text-purple-700">
                      {toBengaliNumber(sup.currentPayable || 0)} ৳
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewSupplierLedger(sup)}
                          title="ক্রয় বিবরণী"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          title="এডিট করুন"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sup)}
                          title="মুছুন"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">পূর্বের পাওনা (Opening Payable) ৳</label>
                <input
                  ref={supOpeningPayableRef}
                  type="text" inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={openingPayable || ''}
                  onChange={(e) => setOpeningPayable(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      supSubmitRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
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

      {/* Supplier Ledger Details Modal */}
      {viewSupplierLedger && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {viewSupplierLedger.companyName} - ক্রয় ও দেনা বিবরণী
                </h3>
                <p className="text-xs text-slate-500">প্রতিনিধি: {viewSupplierLedger.name} | ফোন: {viewSupplierLedger.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">মোট প্রদেয় বকেয়া</span>
                <span className="text-lg font-extrabold text-purple-700">{toBengaliNumber(viewSupplierLedger.currentPayable)} ৳</span>
              </div>
            </div>

            {/* Supplier Bills */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">মাল ক্রয়ের বিলসমূহ:</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2">বিল নং</th>
                      <th className="p-2">তারিখ</th>
                      <th className="p-2">বিবরণ</th>
                      <th className="p-2 text-right">মোট বিল</th>
                      <th className="p-2 text-right">পরিশোধ</th>
                      <th className="p-2 text-right">বাকি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {supplierBills.filter(b => b.supplierId === viewSupplierLedger.id).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-slate-400">কোনো ক্রয়ের বিল নেই</td>
                      </tr>
                    ) : (
                      supplierBills.filter(b => b.supplierId === viewSupplierLedger.id).map(sb => (
                        <tr key={sb.id}>
                          <td className="p-2 font-bold text-purple-700">{sb.billNo}</td>
                          <td className="p-2">{toBengaliNumber(formatDate(sb.date))}</td>
                          <td className="p-2 text-slate-600">{sb.itemsDescription}</td>
                          <td className="p-2 text-right font-bold">{toBengaliNumber(sb.totalAmount)} ৳</td>
                          <td className="p-2 text-right text-emerald-700">{toBengaliNumber(sb.cashPaid + sb.onlinePaid)} ৳</td>
                          <td className="p-2 text-right text-purple-700 font-bold">{toBengaliNumber(sb.dueAmount)} ৳</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Supplier Direct Payments */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">পরিশোধের রেকর্ড:</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2">তারিখ</th>
                      <th className="p-2">মাধ্যম</th>
                      <th className="p-2">বিবরণ / নোট</th>
                      <th className="p-2 text-right">পরিশোধিত টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {supplierPayments.filter(p => p.supplierId === viewSupplierLedger.id).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400">কোনো আলাদা পেমেন্ট হিস্ট্রি নেই</td>
                      </tr>
                    ) : (
                      supplierPayments.filter(p => p.supplierId === viewSupplierLedger.id).map(sp => (
                        <tr key={sp.id}>
                          <td className="p-2">{toBengaliNumber(formatDate(sp.date))}</td>
                          <td className="p-2">{sp.paymentMethod === 'cash' ? '💵 ক্যাশ' : '📱 অনলাইন'}</td>
                          <td className="p-2 text-slate-500">{sp.notes || '-'}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">{toBengaliNumber(sp.amount)} ৳</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewSupplierLedger(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
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
