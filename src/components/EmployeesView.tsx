import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Employee, EmployeePayment } from '../types';
import { 
  Users, 
  UserCheck, 
  Plus, 
  DollarSign, 
  CreditCard, 
  Search, 
  Calendar, 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Phone, 
  Briefcase, 
  X, 
  Printer, 
  TrendingUp, 
  ArrowUpRight, 
  History,
  ShieldAlert
} from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatCurrency, formatDate, normalizeDate, isSameDate } from '../utils/formatters';

export const EmployeesView: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    employeePayments, 
    addEmployeePayment, 
    updateEmployeePayment, 
    deleteEmployeePayment,
    canEditOrDelete,
    currentUser,
    selectedDate,
    confirmAction
  } = useApp();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // Modal States
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<Employee | null>(null);

  const [statementEmployee, setStatementEmployee] = useState<Employee | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDesignation, setEmpDesignation] = useState('সেলসম্যান');
  const [empSalary, setEmpSalary] = useState('');
  const [empJoinDate, setEmpJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [empStatus, setEmpStatus] = useState<'active' | 'inactive'>('active');
  const [empAddress, setEmpAddress] = useState('');
  const [empNotes, setEmpNotes] = useState('');

  // Payment Form State
  const [payEmpId, setPayEmpId] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMonth, setPayMonth] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState<'salary' | 'advance' | 'bonus' | 'other'>('salary');
  const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
  const [payOnlineMethod, setPayOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque'>('bkash');
  const [payNotes, setPayNotes] = useState('');

  // Default month options
  const monthOptions = useMemo(() => {
    const list: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
      list.push(mStr);
    }
    return list;
  }, []);

  // Set default month for payments
  const currentMonthBengali = useMemo(() => {
    return new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
  }, []);

  // Compute stats
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter(e => e.status === 'active').length;
  const totalMonthlyPayroll = employees
    .filter(e => e.status === 'active')
    .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

  // Current month's total disbursed payments
  const currentMonthPayments = useMemo(() => {
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return employeePayments.filter(p => {
      const pDate = p.date ? p.date.substring(0, 7) : '';
      return pDate === curYearMonth || p.month === currentMonthBengali;
    });
  }, [employeePayments, currentMonthBengali]);

  const totalPaidThisMonth = currentMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Per-employee calculation helper
  const getEmployeeStats = (emp: Employee) => {
    // All payments for this employee
    const allEmpPayments = employeePayments.filter(p => p.employeeId === emp.id);
    const totalPaidAllTime = allEmpPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Payments in current month
    const curMonthPayments = allEmpPayments.filter(p => {
      const now = new Date();
      const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const pDate = p.date ? p.date.substring(0, 7) : '';
      return pDate === curYearMonth || p.month === currentMonthBengali;
    });
    const paidThisMonth = curMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Monthly Salary
    const salary = Number(emp.salary) || 0;
    
    // Remaining due for this month
    const remainingDueThisMonth = Math.max(0, salary - paidThisMonth);
    const advanceTakenThisMonth = Math.max(0, paidThisMonth - salary);

    return {
      totalPaidAllTime,
      paidThisMonth,
      salary,
      remainingDueThisMonth,
      advanceTakenThisMonth,
      paymentsCount: allEmpPayments.length
    };
  };

  // Open Add Employee Modal
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpPhone('');
    setEmpDesignation('সেলসম্যান');
    setEmpSalary('');
    setEmpJoinDate(new Date().toISOString().split('T')[0]);
    setEmpStatus('active');
    setEmpAddress('');
    setEmpNotes('');
    setIsEmployeeModalOpen(true);
  };

  // Open Edit Employee Modal
  const handleOpenEditEmployee = (emp: Employee) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কর্মচারী তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpPhone(emp.phone);
    setEmpDesignation(emp.designation);
    setEmpSalary(String(emp.salary));
    setEmpJoinDate(emp.joinDate || new Date().toISOString().split('T')[0]);
    setEmpStatus(emp.status);
    setEmpAddress(emp.address || '');
    setEmpNotes(emp.notes || '');
    setIsEmployeeModalOpen(true);
  };

  // Save Employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      alert('কর্মচারীর নাম অবশ্যই লিখতে হবে!');
      return;
    }
    const sal = toEnglishNumber(empSalary);
    if (sal < 0) {
      alert('সঠিক বেতন লিখুন!');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, {
        name: empName.trim(),
        phone: empPhone.trim(),
        designation: empDesignation.trim(),
        salary: sal,
        joinDate: empJoinDate,
        status: empStatus,
        address: empAddress.trim(),
        notes: empNotes.trim()
      });
    } else {
      addEmployee({
        name: empName.trim(),
        phone: empPhone.trim(),
        designation: empDesignation.trim(),
        salary: sal,
        joinDate: empJoinDate,
        status: empStatus,
        address: empAddress.trim(),
        notes: empNotes.trim()
      });
    }

    setIsEmployeeModalOpen(false);
  };

  // Open Disburse Payment Modal
  const handleOpenPayment = (emp?: Employee) => {
    if (emp) {
      setPayEmpId(emp.id);
      setSelectedEmployeeForPayment(emp);
    } else if (employees.length > 0) {
      setPayEmpId(employees[0].id);
      setSelectedEmployeeForPayment(employees[0]);
    } else {
      alert('আগে অন্তত একজন কর্মচারী যুক্ত করুন!');
      return;
    }
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMonth(currentMonthBengali);
    setPayAmount('');
    setPayType('salary');
    setPayMethod('cash');
    setPayOnlineMethod('bkash');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  // Save Payment (Auto Adds to Daily Expenses!)
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employees.find(emp => emp.id === payEmpId);
    if (!targetEmp) {
      alert('কর্মচারী সিলেক্ট করুন!');
      return;
    }
    const amt = toEnglishNumber(payAmount);
    if (!amt || amt <= 0) {
      alert('প্রদেয় টাকার পরিমাণ সঠিকভাবে লিখুন!');
      return;
    }

    addEmployeePayment({
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      date: payDate,
      month: payMonth || currentMonthBengali,
      amount: amt,
      paymentType: payType,
      paymentMethod: payMethod,
      onlineMethod: payMethod === 'online' ? payOnlineMethod : undefined,
      notes: payNotes.trim()
    });

    setIsPaymentModalOpen(false);
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone.includes(searchTerm) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [employees, searchTerm]);

  // Total pending due calculation across all active employees
  const totalDueToEmployeesThisMonth = useMemo(() => {
    return employees
      .filter(e => e.status === 'active')
      .reduce((sum, e) => {
        const stats = getEmployeeStats(e);
        return sum + stats.remainingDueThisMonth;
      }, 0);
  }, [employees, employeePayments, currentMonthBengali]);

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-5">
      {/* Page Header & Stats */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2.5">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </span>
              <span>কর্মচারী ও বেতন ব্যবস্থাপনা (Employees & Payroll)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              কর্মচারীর তথ্য, নির্ধারিত বেতন, প্রদত্ত টাকা, বকেয়া হিসাব এবং দৈনিক খরচে স্বয়ংক্রিয় এন্ট্রি
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenPayment()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>বেতন / অগ্রিম প্রদান</span>
            </button>
            <button
              onClick={handleOpenAddEmployee}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন কর্মচারী যোগ</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold mb-1">
              <span>মোট কর্মচারী</span>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950">
              {toBengaliNumber(totalEmployeesCount)} জন
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
              কর্মরত: {toBengaliNumber(activeEmployeesCount)} জন
            </div>
          </div>

          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-purple-700 text-xs font-semibold mb-1">
              <span>মাসিক নির্ধারিত পে-রোল</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-950">
              {toBengaliNumber(totalMonthlyPayroll)} ৳
            </div>
            <div className="text-[11px] text-purple-600 font-medium mt-0.5">
              সক্রিয় কর্মচারীদের মোট বেতন
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
              <span>চলতি মাসে দেওয়া হয়েছে</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950">
              {toBengaliNumber(totalPaidThisMonth)} ৳
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {currentMonthBengali} (খরচে যুক্ত)
            </div>
          </div>

          <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
              <span>কর্মচারী পাবে (চলতি মাস)</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-950">
              {toBengaliNumber(totalDueToEmployeesThisMonth)} ৳
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              চলতি মাসের অবশিষ্ট বকেয়া
            </div>
          </div>
        </div>
      </div>

      {/* Auto Expense Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-950">স্বয়ংক্রিয় হিসাব সমন্বয় সুবিধা:</span> কর্মচারীকে যেকোনো সময় মাসিক বেতন বা অগ্রিম টাকা প্রদান করলে তা স্বয়ংক্রিয়ভাবে <span className="font-bold underline">‘দৈনিক খরচ’</span> এবং <span className="font-bold underline">‘ক্যাশ মিলানো (Cash Tally)’</span>-তে যুক্ত হয়ে যায়। আপনাকে আলাদা করে খরচ এন্ট্রি দিতে হবে না।
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="নাম, পদবী বা মোবাইল দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-semibold w-full sm:w-auto text-right">
          মোট কর্মচারী: <span className="font-bold text-slate-800">{toBengaliNumber(filteredEmployees.length)}</span> জন
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto stroke-[1.2] mb-3 text-slate-300" />
            <p className="text-base font-bold text-slate-700">কোনো কর্মচারী পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-1">নতুন কর্মচারী যোগ করতে ওপরের 'নতুন কর্মচারী যোগ' বাটনে ক্লিক করুন।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3 text-center w-10">নং</th>
                  <th className="p-3">কর্মচারীর নাম ও পদবী</th>
                  <th className="p-3">মোবাইল</th>
                  <th className="p-3 text-right">নির্ধারিত বেতন</th>
                  <th className="p-3 text-right">চলতি মাসে নিয়েছে</th>
                  <th className="p-3 text-right">অবশিষ্ট পাবে / অগ্রিম</th>
                  <th className="p-3 text-center">স্ট্যাটাস</th>
                  <th className="p-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp, idx) => {
                  const stats = getEmployeeStats(emp);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-bold text-slate-400">
                        {toBengaliNumber(idx + 1)}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{emp.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-indigo-100">
                            {emp.designation}
                          </span>
                          {emp.joinDate && (
                            <span className="text-[11px] text-slate-400">
                              যোগদান: {toBengaliNumber(formatDate(emp.joinDate))}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-700">
                        {emp.phone || '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        {toBengaliNumber(emp.salary)} ৳
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700">
                        {toBengaliNumber(stats.paidThisMonth)} ৳
                      </td>
                      <td className="p-3 text-right">
                        {stats.remainingDueThisMonth > 0 ? (
                          <div className="inline-block bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-extrabold text-xs">
                            {toBengaliNumber(stats.remainingDueThisMonth)} ৳ পাবে
                          </div>
                        ) : stats.advanceTakenThisMonth > 0 ? (
                          <div className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-extrabold text-xs">
                            {toBengaliNumber(stats.advanceTakenThisMonth)} ৳ অগ্রিম
                          </div>
                        ) : (
                          <div className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold text-xs">
                            পরিশোধিত (০ ৳)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          emp.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {emp.status === 'active' ? 'কর্মরত' : 'অব্যাহতি'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPayment(emp)}
                            title="বেতন / অগ্রিম প্রদান"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>টাকা দিন</span>
                          </button>
                          <button
                            onClick={() => setStatementEmployee(emp)}
                            title="স্টেটমেন্ট ও লেনদেন ইতিহাস"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditEmployee(emp)}
                            title="এডিট"
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!canEditOrDelete) {
                                alert('ম্যানেজার একাউন্ট থেকে কোনো কর্মচারী ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
                                return;
                              }
                              confirmAction({
                                title: 'কর্মচারী মুছে ফেলুন',
                                message: `আপনি কি সত্যিই কর্মচারী '${emp.name}'-কে মুছে ফেলতে চান? সংশ্লিষ্ট সকল রেকর্ড সুরক্ষিত থাকবে।`,
                                confirmText: 'হ্যাঁ, মুছুন',
                                isDestructive: true,
                                onConfirm: () => {
                                  deleteEmployee(emp.id);
                                }
                              });
                            }}
                            title="মুছে ফেলুন"
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== MODAL 1: ADD / EDIT EMPLOYEE ===================== */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>{editingEmployee ? 'কর্মচারীর তথ্য সম্পাদনা (Edit)' : 'নতুন কর্মচারী যুক্ত করুন (Add Staff)'}</span>
              </h3>
              <button 
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  কর্মচারীর নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    placeholder="017xxxxxxxx"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পদবী / দায়িত্ব</label>
                  <input
                    type="text"
                    placeholder="যেমন: সেলসম্যান, ম্যানেজার, হেল্পার"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    নির্ধারিত মাসিক বেতন (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="যেমন: 15000"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-indigo-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">যোগদানের তারিখ</label>
                  <input
                    type="date"
                    value={empJoinDate}
                    onChange={(e) => setEmpJoinDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">কর্মসংস্থান অবস্থা</label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">কর্মরত (Active)</option>
                    <option value="inactive">অব্যাহতিপ্রাপ্ত (Inactive)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ঠিকানা / পরিচিতি</label>
                  <input
                    type="text"
                    placeholder="ঠিকানা..."
                    value={empAddress}
                    onChange={(e) => setEmpAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">মন্তব্য (Notes)</label>
                <textarea
                  rows={2}
                  placeholder="অতিরিক্ত কোনো তথ্য থাকলে লিখুন..."
                  value={empNotes}
                  onChange={(e) => setEmpNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition"
                >
                  {editingEmployee ? 'তথ্য আপডেট করুন' : 'কর্মচারী সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: DISBURSE SALARY / ADVANCE ===================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>কর্মচারীকে বেতন / অগ্রিম প্রদান</span>
              </h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Context Card */}
            {selectedEmployeeForPayment && (() => {
              const stats = getEmployeeStats(selectedEmployeeForPayment);
              return (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>{selectedEmployeeForPayment.name} ({selectedEmployeeForPayment.designation})</span>
                    <span>মাসিক বেতন: {toBengaliNumber(stats.salary)} ৳</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>চলতি মাসে পরিশোধিত: {toBengaliNumber(stats.paidThisMonth)} ৳</span>
                    <span className={stats.remainingDueThisMonth > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                      {stats.remainingDueThisMonth > 0 ? `বাকি পাবে: ${toBengaliNumber(stats.remainingDueThisMonth)} ৳` : 'বাকি নেই'}
                    </span>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  কর্মচারী নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  value={payEmpId}
                  onChange={(e) => {
                    setPayEmpId(e.target.value);
                    const emp = employees.find(em => em.id === e.target.value);
                    setSelectedEmployeeForPayment(emp || null);
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.designation} (বেতন: {emp.salary} ৳)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">প্রদানের তারিখ</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">যে মাসের বেতন</label>
                  <input
                    type="text"
                    placeholder="যেমন: অক্টোবর ২০২৬"
                    value={payMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পেমেন্ট ধরন</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="salary">মাসিক বেতন (Salary)</option>
                    <option value="advance">অগ্রিম বেতন (Advance)</option>
                    <option value="bonus">ঈদ / বিশেষ বোনাস (Bonus)</option>
                    <option value="other">অন্যান্য (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    প্রদেয় টাকার পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="টাকার পরিমাণ..."
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-black text-emerald-700 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">পরিশোধ মাধ্যম</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as 'cash' | 'online')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">নগদ ক্যাশ (Cash)</option>
                    <option value="online">অনলাইন / ব্যাংক (Online)</option>
                  </select>
                </div>
                {payMethod === 'online' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">অনলাইন মাধ্যম</label>
                    <select
                      value={payOnlineMethod}
                      onChange={(e) => setPayOnlineMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="bkash">বিকাশ (bKash)</option>
                      <option value="nagad">নগদ (Nagad)</option>
                      <option value="rocket">রকেট (Rocket)</option>
                      <option value="bank">ব্যাংক ট্রান্সফার (Bank)</option>
                      <option value="cheque">চেক (Cheque)</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">নোট / বিবরণ</label>
                <input
                  type="text"
                  placeholder="যেমন: চলতি মাসের আংশিক বেতন বা জরুরি অগ্রিম"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Informational badge */}
              <div className="p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-lg text-indigo-900 text-[11px] leading-relaxed">
                ℹ️ <strong>স্বয়ংক্রিয় এন্ট্রি:</strong> এই টাকা প্রদানের সাথে সাথেই 'দৈনিক খরচ'-এ <span className="font-bold">কর্মচারী বেতন</span> খাতে খরচ হিসেবে অন্তর্ভুক্ত হবে এবং ক্যাশ মিলানোর সাথে সমন্বয় হবে।
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition"
                >
                  টাকা প্রদান ও খরচে যোগ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: EMPLOYEE STATEMENT & HISTORY ===================== */}
      {statementEmployee && (() => {
        const stats = getEmployeeStats(statementEmployee);
        const empHistory = employeePayments.filter(p => p.employeeId === statementEmployee.id);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl my-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <span>কর্মচারী বেতন স্টেটমেন্ট ও হিসাব খতিয়ান</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {statementEmployee.name} ({statementEmployee.designation}) | মোবাইল: {statementEmployee.phone || '-'}
                  </p>
                </div>
                <button 
                  onClick={() => setStatementEmployee(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-slate-500">নির্ধারিত মাসিক বেতন</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">{toBengaliNumber(stats.salary)} ৳</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  <div className="text-emerald-700">মোট উত্তোলন / গৃহীত</div>
                  <div className="text-base font-bold text-emerald-900 mt-0.5">{toBengaliNumber(stats.totalPaidAllTime)} ৳</div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
                  <div className="text-indigo-700">চলতি মাসে নিয়েছে</div>
                  <div className="text-base font-bold text-indigo-900 mt-0.5">{toBengaliNumber(stats.paidThisMonth)} ৳</div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2 text-center w-8">নং</th>
                      <th className="p-2">তারিখ</th>
                      <th className="p-2">মাস</th>
                      <th className="p-2">ধরন</th>
                      <th className="p-2">মাধ্যম</th>
                      <th className="p-2 text-right">টাকা</th>
                      <th className="p-2">বিবরণ</th>
                      <th className="p-2 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          এখনো কোনো বেতন বা অগ্রিম পেমেন্ট রেকর্ড নেই
                        </td>
                      </tr>
                    ) : (
                      empHistory.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-bold text-slate-400">{toBengaliNumber(idx + 1)}</td>
                          <td className="p-2 font-mono">{toBengaliNumber(formatDate(p.date))}</td>
                          <td className="p-2 font-medium text-slate-700">{p.month}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.paymentType === 'advance' 
                                ? 'bg-amber-100 text-amber-800' 
                                : (p.paymentType === 'bonus' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800')
                            }`}>
                              {p.paymentType === 'advance' ? 'অগ্রিম' : (p.paymentType === 'bonus' ? 'বোনাস' : 'বেতন')}
                            </span>
                          </td>
                          <td className="p-2 font-medium">
                            {p.paymentMethod === 'cash' ? 'নগদ ক্যাশ' : `অনলাইন (${p.onlineMethod || 'ব্যাংক'})`}
                          </td>
                          <td className="p-2 text-right font-black text-emerald-700 text-xs sm:text-sm">
                            {toBengaliNumber(p.amount)} ৳
                          </td>
                          <td className="p-2 text-slate-500 max-w-[140px] truncate" title={p.notes || ''}>
                            {p.notes || '-'}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => {
                                if (!canEditOrDelete) {
                                  alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
                                  return;
                                }
                                confirmAction({
                                  title: 'বেতন পেমেন্ট মুছুন',
                                  message: `এই পেমেন্টটি (${toBengaliNumber(p.amount)} ৳) মুছে ফেলতে চান? এটি মুছে দিলে দৈনিক খরচ থেকেও এই এন্ট্রি স্বয়ংক্রিয়ভাবে মুছে যাবে।`,
                                  confirmText: 'হ্যাঁ, মুছুন',
                                  isDestructive: true,
                                  onConfirm: () => {
                                    deleteEmployeePayment(p.id);
                                  }
                                });
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                              title="পেমেন্ট ও সংশ্লিষ্ট খরচ মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-[11px] text-slate-500 font-medium">
                  * প্রতিটি পেমেন্ট স্বয়ংক্রিয়ভাবে দৈনিক খরচ স্টেটমেন্টে সংরক্ষিত।
                </span>
                <button
                  onClick={() => setStatementEmployee(null)}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
