import { 
  Customer, 
  Supplier, 
  ProductCatalogItem, 
  Invoice, 
  DuePaymentRecord, 
  SupplierBill, 
  SupplierPaymentRecord, 
  Expense, 
  OpeningCashRecord, 
  OtherCashInRecord, 
  CashTallyRecord, 
  UserAccount, 
  AuditLog, 
  RecycleBinItem 
} from '../types';

export interface ParsedBackupResult {
  customers: Customer[];
  suppliers: Supplier[];
  products: ProductCatalogItem[];
  invoices: Invoice[];
  duePayments: DuePaymentRecord[];
  supplierBills: SupplierBill[];
  supplierPayments: SupplierPaymentRecord[];
  expenses: Expense[];
  openingCashList: OpeningCashRecord[];
  otherCashInList: OtherCashInRecord[];
  cashTallies: CashTallyRecord[];
  users: UserAccount[];
  auditLogs: AuditLog[];
  recycleBin: RecycleBinItem[];
  summary: {
    customersCount: number;
    suppliersCount: number;
    expensesCount: number;
    cashInCount: number;
    openingCashAmount: number;
    managersCount: number;
    invoicesCount: number;
    productsCount: number;
    duePaymentsCount: number;
    supplierBillsCount: number;
  };
}

// Helper to find key in object with case-insensitive, fuzzy and alias matching
const findArrayOrData = (obj: any, keys: string[]): any[] => {
  if (!obj || typeof obj !== 'object') return [];

  // Normalize target keys
  const normalizedTargetKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const objKeys = Object.keys(obj);

  // 1. Direct key match (case-insensitive & stripped)
  for (const objKey of objKeys) {
    const normKey = objKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedTargetKeys.includes(normKey)) {
      let val = obj[objKey];
      if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
        try {
          val = JSON.parse(val);
        } catch {
          // ignore
        }
      }
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object') {
        const entries = Object.entries(val);
        if (entries.length > 0) {
          return entries.map(([key, v]: any) => {
            if (v && typeof v === 'object') {
              return { name: v.name || key, ...v };
            }
            return { name: key, value: v };
          });
        }
      }
    }
  }

  // 2. Sub-string key match (e.g., "ML_ELECTRIC_CUSTOMERS" or "my_customar_list")
  for (const objKey of objKeys) {
    const normKey = objKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const target of normalizedTargetKeys) {
      if (normKey.includes(target)) {
        let val = obj[objKey];
        if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
          try {
            val = JSON.parse(val);
          } catch {
            // ignore
          }
        }
        if (Array.isArray(val)) return val;
        if (val && typeof val === 'object') {
          const entries = Object.entries(val);
          if (entries.length > 0) {
            return entries.map(([key, v]: any) => {
              if (v && typeof v === 'object') {
                return { name: v.name || key, ...v };
              }
              return { name: key, value: v };
            });
          }
        }
      }
    }
  }

  // 3. Deep search in top-level containers like `data`, `state`, `payload`, `backup`, `store`, `root`
  const subContainers = ['data', 'state', 'payload', 'backup', 'store', 'root', 'appdata', 'backupdata', 'mlelectric'];
  for (const containerKey of subContainers) {
    for (const objKey of objKeys) {
      if (objKey.toLowerCase().includes(containerKey) && obj[objKey] && typeof obj[objKey] === 'object') {
        const found = findArrayOrData(obj[objKey], keys);
        if (found.length > 0) return found;
      }
    }
  }

  return [];
};

// Date normalizer to parse ISO, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD into YYYY-MM-DD
const normalizeDateString = (dateVal: any, fallback: string): string => {
  if (!dateVal) return fallback;
  const str = String(dateVal).trim();
  if (!str) return fallback;

  if (str.includes('T')) {
    return str.split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD
  const ymdSlash = str.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymdSlash) {
    const year = ymdSlash[1];
    const month = ymdSlash[2].padStart(2, '0');
    const day = ymdSlash[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  return fallback;
};

// Universal Parser Function
export const parseAndSanitizeBackup = (rawJsonStr: string): ParsedBackupResult => {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJsonStr);
  } catch (e) {
    throw new Error('অকার্যকর JSON ফাইল! ফাইলটি নষ্ট বা সঠিক ফরম্যাটে নেই।');
  }

  if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    throw new Error('ব্যাকআপ ফাইলের গঠন সঠিক নয়।');
  }

  // If parsed is a direct array, analyze what it contains
  if (Array.isArray(parsed)) {
    const sample = parsed[0] || {};
    if ('due' in sample || 'baki' in sample || 'customerName' in sample || 'phone' in sample || 'openingDue' in sample) {
      parsed = { customers: parsed };
    } else if ('invoiceNo' in sample || 'billNo' in sample || 'grandTotal' in sample) {
      parsed = { invoices: parsed };
    } else if ('category' in sample && 'amount' in sample) {
      parsed = { expenses: parsed };
    } else if ('source' in sample && 'amount' in sample) {
      parsed = { otherCashInList: parsed };
    } else {
      parsed = { customers: parsed };
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. CUSTOMERS
  const rawCustomers = findArrayOrData(parsed, [
    'customers', 'customar', 'customars', 'customer', 'customerlist', 'clients', 'clientlist', 
    'khatas', 'customeraccounts', 'customer_accounts', 'customerdata', 'allcustomers', 'parties', 
    'mlelectriccustomers', 'ml_electric_customers', 'client'
  ]);

  const cleanCustomers: Customer[] = rawCustomers
    .filter((c: any) => c && typeof c === 'object')
    .map((c: any, index: number) => {
      const name = String(c.name || c.customerName || c.customer_name || c.clientName || c.title || `কাস্টমার ${index + 1}`).trim();
      const phone = String(c.phone || c.mobile || c.contact || c.customerPhone || c.phoneNumber || c.tel || '').trim();
      const address = String(c.address || c.location || c.customerAddress || c.area || '').trim();
      
      const currentDue = Number(c.currentDue ?? c.due ?? c.dueAmount ?? c.balance ?? c.baki ?? c.previousDue ?? c.openingDue ?? 0) || 0;
      const openingDue = Number(c.openingDue ?? (c.currentDue !== undefined ? 0 : currentDue)) || 0;
      const totalPurchased = Number(c.totalPurchased ?? c.totalSales ?? c.totalAmount ?? 0) || 0;
      const totalPaid = Number(c.totalPaid ?? c.paidAmount ?? c.paid ?? 0) || 0;

      const id = String(c.id || 'cust_' + (c.phone ? c.phone.replace(/[^0-9]/g, '') : '') + '_' + index);
      const notes = c.notes || c.note || c.remark || c.remarks || c.description;
      const createdDate = normalizeDateString(c.createdDate || c.date || c.createdAt || c.created_at, todayStr);

      return {
        id,
        name,
        phone,
        address,
        openingDue,
        totalPurchased,
        totalPaid,
        currentDue,
        createdDate,
        notes: notes ? String(notes) : undefined
      };
    });

  // 2. SUPPLIERS
  const rawSuppliers = findArrayOrData(parsed, [
    'suppliers', 'supplier', 'supplierlist', 'vendors', 'vendorlist', 'parties', 'partylist',
    'suppliersdata', 'mlelectricsuppliers', 'ml_electric_suppliers', 'vendor'
  ]);

  const cleanSuppliers: Supplier[] = rawSuppliers
    .filter((s: any) => s && typeof s === 'object')
    .map((s: any, index: number) => {
      const name = String(s.name || s.supplierName || s.companyName || s.company || `সাপ্লায়ার ${index + 1}`).trim();
      const companyName = String(s.companyName || s.company || name);
      const phone = String(s.phone || s.mobile || s.contact || '').trim();
      const address = String(s.address || s.location || '').trim();
      const currentPayable = Number(s.currentPayable ?? s.previousDue ?? s.due ?? s.dueAmount ?? s.balance ?? s.openingPayable ?? 0) || 0;
      const openingPayable = Number(s.openingPayable ?? (s.currentPayable !== undefined ? 0 : currentPayable)) || 0;
      const totalPurchased = Number(s.totalPurchased ?? s.totalAmount ?? 0) || 0;
      const totalPaid = Number(s.totalPaid ?? s.paidAmount ?? 0) || 0;
      const createdDate = normalizeDateString(s.createdDate || s.date || s.createdAt, todayStr);

      return {
        id: String(s.id || 'sup_' + index),
        name,
        companyName,
        phone,
        address,
        openingPayable,
        totalPurchased,
        totalPaid,
        currentPayable,
        createdDate
      };
    });

  // 3. PRODUCTS
  const rawProducts = findArrayOrData(parsed, [
    'products', 'product', 'productlist', 'items', 'itemlist', 'catalog', 'productcatalog',
    'mlelectricproducts', 'ml_electric_products', 'inventory'
  ]);

  const cleanProducts: ProductCatalogItem[] = rawProducts
    .filter((p: any) => p && typeof p === 'object')
    .map((p: any, index: number) => {
      const salePrice = Number(p.salePrice || p.defaultPrice || p.price || p.rate || 0);
      const purchasePrice = Number(p.purchasePrice || p.costPrice || p.buyPrice || 0);
      const stock = Number(p.stock ?? p.quantity ?? 0);
      return {
        id: String(p.id || 'prod_' + index),
        name: String(p.name || p.productName || p.title || 'পণ্য').trim(),
        category: String(p.category || p.group || 'অন্যান্য'),
        unit: String(p.unit || 'পিস'),
        salePrice,
        purchasePrice,
        stock,
        barcode: p.barcode ? String(p.barcode) : undefined
      };
    });

  // 4. INVOICES
  const rawInvoices = findArrayOrData(parsed, [
    'invoices', 'invoice', 'invoicelist', 'sales', 'saleslist', 'orders', 'orderlist', 'bills',
    'mlelectricinvoices', 'ml_electric_invoices', 'saleshistory'
  ]);

  const cleanInvoices: Invoice[] = rawInvoices
    .filter((inv: any) => inv && typeof inv === 'object')
    .map((inv: any, index: number) => {
      const rawItems = Array.isArray(inv.items) ? inv.items : (Array.isArray(inv.products) ? inv.products : []);
      const items = rawItems.map((it: any, itIdx: number) => {
        const qty = Number(it.quantity || it.qty || 1);
        const unitPrice = Number(it.unitPrice || it.price || it.rate || 0);
        const totalPrice = Number(it.totalPrice || it.total || (qty * unitPrice));
        return {
          id: String(it.id || 'it_' + itIdx),
          name: String(it.name || it.productName || it.title || 'পণ্য'),
          category: it.category ? String(it.category) : undefined,
          quantity: qty,
          unit: String(it.unit || 'পিস'),
          unitPrice,
          totalPrice,
          costPrice: it.costPrice !== undefined ? Number(it.costPrice) : undefined
        };
      });

      const subtotal = Number(inv.subtotal || inv.subTotal || inv.total || 0);
      const discount = Number(inv.discount || 0);
      const laborOrTransportCost = Number(inv.laborOrTransportCost || inv.transport || 0);
      const grandTotal = Number(inv.grandTotal || inv.netTotal || (subtotal - discount + laborOrTransportCost) || 0);
      const cashPaid = Number(inv.cashPaid || (inv.paymentMethod === 'cash' ? (inv.paidAmount || inv.paid) : 0) || (inv.paidAmount || 0));
      const onlinePaid = Number(inv.onlinePaid || (inv.paymentMethod === 'online' ? (inv.paidAmount || inv.paid) : 0) || 0);
      const dueAmount = Number(inv.dueAmount ?? inv.due ?? (grandTotal - cashPaid - onlinePaid) ?? 0);
      const status = dueAmount <= 0 ? 'paid' : (cashPaid + onlinePaid > 0 ? 'partial' : 'due');

      return {
        id: String(inv.id || 'inv_' + index),
        invoiceNo: String(inv.invoiceNo || inv.billNo || `INV-${index + 1}`),
        date: normalizeDateString(inv.date || inv.invoiceDate, todayStr),
        time: String(inv.time || '12:00 PM'),
        customerId: String(inv.customerId || ''),
        customerName: String(inv.customerName || inv.clientName || 'সাধারণ কাস্টমার'),
        customerPhone: String(inv.customerPhone || inv.phone || ''),
        customerAddress: inv.customerAddress ? String(inv.customerAddress) : undefined,
        items,
        subtotal,
        discount,
        laborOrTransportCost,
        grandTotal,
        cashPaid,
        onlinePaid,
        onlineMethod: inv.onlineMethod,
        onlineTrxId: inv.onlineTrxId,
        dueAmount,
        status,
        notes: inv.notes ? String(inv.notes) : undefined,
        createdBy: String(inv.createdBy || 'Admin'),
        createdAt: String(inv.createdAt || new Date().toISOString()),
        updatedAt: inv.updatedAt ? String(inv.updatedAt) : undefined
      };
    });

  // 5. DUE PAYMENTS
  const rawDuePayments = findArrayOrData(parsed, [
    'duepayments', 'due_payments', 'duecollections', 'duecollection', 'customerpayments', 
    'duepaymentlist', 'mlelectricduepayments', 'ml_electric_due_payments'
  ]);

  const cleanDuePayments: DuePaymentRecord[] = rawDuePayments
    .filter((dp: any) => dp && typeof dp === 'object')
    .map((dp: any, index: number) => ({
      id: String(dp.id || 'dp_' + index),
      receiptNo: String(dp.receiptNo || dp.voucherNo || `REC-${index + 1}`),
      customerId: String(dp.customerId || ''),
      customerName: String(dp.customerName || 'কাস্টমার'),
      customerPhone: String(dp.customerPhone || dp.phone || ''),
      date: normalizeDateString(dp.date, todayStr),
      amount: Number(dp.amount || dp.paidAmount || dp.taka || 0),
      paymentMethod: dp.paymentMethod === 'online' ? 'online' : 'cash',
      onlineMethod: dp.onlineMethod,
      trxId: dp.trxId,
      notes: dp.notes || dp.note ? String(dp.notes || dp.note) : undefined,
      previousDue: Number(dp.previousDue || 0),
      remainingDue: Number(dp.remainingDue || 0),
      collectedBy: String(dp.collectedBy || dp.receivedBy || 'Admin'),
      createdAt: String(dp.createdAt || new Date().toISOString())
    }));

  // 6. SUPPLIER BILLS
  const rawSupplierBills = findArrayOrData(parsed, [
    'supplierbills', 'supplier_bills', 'purchases', 'purchaselist', 'purchasebills', 
    'mlelectricsupplierbills', 'ml_electric_supplier_bills'
  ]);

  const cleanSupplierBills: SupplierBill[] = rawSupplierBills
    .filter((sb: any) => sb && typeof sb === 'object')
    .map((sb: any, index: number) => {
      const totalAmount = Number(sb.totalAmount || sb.amount || 0);
      const cashPaid = Number(sb.cashPaid || sb.paidAmount || 0);
      const onlinePaid = Number(sb.onlinePaid || 0);
      const dueAmount = Number(sb.dueAmount ?? (totalAmount - cashPaid - onlinePaid));
      return {
        id: String(sb.id || 'sb_' + index),
        billNo: String(sb.billNo || sb.voucherNo || `SB-${index + 1}`),
        supplierId: String(sb.supplierId || ''),
        supplierName: String(sb.supplierName || 'সাপ্লায়ার'),
        companyName: String(sb.companyName || sb.supplierName || 'কোম্পানি'),
        date: normalizeDateString(sb.date, todayStr),
        itemsDescription: String(sb.itemsDescription || sb.description || 'পণ্য ক্রয়'),
        totalAmount,
        cashPaid,
        onlinePaid,
        dueAmount,
        notes: sb.notes ? String(sb.notes) : undefined,
        createdAt: String(sb.createdAt || new Date().toISOString()),
        createdBy: String(sb.createdBy || 'Admin')
      };
    });

  // 7. SUPPLIER PAYMENTS
  const rawSupplierPayments = findArrayOrData(parsed, [
    'supplierpayments', 'supplier_payments', 'supplierpaid', 'supplierpaymentlist',
    'mlelectricsupplierpayments', 'ml_electric_supplier_payments'
  ]);

  const cleanSupplierPayments: SupplierPaymentRecord[] = rawSupplierPayments
    .filter((sp: any) => sp && typeof sp === 'object')
    .map((sp: any, index: number) => ({
      id: String(sp.id || 'sp_' + index),
      receiptNo: sp.receiptNo ? String(sp.receiptNo) : undefined,
      supplierId: String(sp.supplierId || ''),
      supplierName: String(sp.supplierName || 'সাপ্লায়ার'),
      date: normalizeDateString(sp.date, todayStr),
      amount: Number(sp.amount || sp.paidAmount || 0),
      paymentMethod: sp.paymentMethod === 'online' ? 'online' : 'cash',
      notes: sp.notes || sp.note ? String(sp.notes || sp.note) : undefined,
      paidBy: String(sp.paidBy || sp.receivedBy || 'Admin'),
      createdAt: String(sp.createdAt || new Date().toISOString())
    }));

  // 8. EXPENSES
  const rawExpenses = findArrayOrData(parsed, [
    'expenses', 'expense', 'daily_expenses', 'expenselist', 'expanses', 'costs', 'costlist',
    'mlelectricexpenses', 'ml_electric_expenses', 'dailyexpenses'
  ]);

  const cleanExpenses: Expense[] = rawExpenses
    .filter((e: any) => e && typeof e === 'object')
    .map((e: any, index: number) => {
      const descStr = e.desc || e.description || e.category || e.title || 'সাধারণ খরচ';
      return {
        id: String(e.id || 'exp_' + index),
        date: normalizeDateString(e.date, todayStr),
        category: String(e.category || descStr).trim(),
        title: e.title || e.desc ? String(e.title || e.desc) : undefined,
        description: e.description || e.desc ? String(e.description || e.desc) : undefined,
        amount: Number(e.amount || e.cost || e.taka || 0),
        paymentMethod: e.paymentMethod === 'online' ? 'online' : 'cash',
        notes: e.notes || e.note || e.remark ? String(e.notes || e.note || e.remark) : undefined,
        createdBy: String(e.createdBy || e.recordedBy || 'Admin'),
        recordedBy: String(e.recordedBy || e.createdBy || 'Admin'),
        createdAt: String(e.createdAt || new Date().toISOString())
      };
    });

  // 9. OPENING CASH
  const rawOpeningCash = findArrayOrData(parsed, [
    'openingcashlist', 'openingcash', 'opening_cash', 'opening_cash_list', 'openingbalance',
    'dailyopeningcash', 'mlelectricopeningcash', 'ml_electric_opening_cash'
  ]);

  let cleanOpeningCash: OpeningCashRecord[] = [];
  if (Array.isArray(rawOpeningCash) && rawOpeningCash.length > 0) {
    cleanOpeningCash = rawOpeningCash
      .filter((oc: any) => oc && typeof oc === 'object')
      .map((oc: any, index: number) => ({
        id: String(oc.id || 'oc_' + index),
        date: normalizeDateString(oc.date, todayStr),
        amount: Number(oc.amount || oc.openingBalance || 0),
        note: oc.note ? String(oc.note) : undefined,
        setBy: String(oc.setBy || 'Admin'),
        createdAt: String(oc.createdAt || new Date().toISOString())
      }));
  } else if (typeof parsed.openingCash === 'number' || typeof parsed.openingBalance === 'number') {
    cleanOpeningCash = [{
      id: 'oc_1',
      date: todayStr,
      amount: Number(parsed.openingCash || parsed.openingBalance),
      setBy: 'Admin',
      createdAt: new Date().toISOString()
    }];
  }

  // 10. OTHER CASH IN (CASHIN)
  const rawOtherCash = findArrayOrData(parsed, [
    'othercashinlist', 'othercashin', 'other_cash_in', 'cashin', 'cashins', 'cashinlist', 
    'cash_in', 'cash_ins', 'cashinrecords', 'othercash', 'mlelectricothercashin', 'ml_electric_other_cash_in',
    'otherincomes', 'income'
  ]);

  const cleanOtherCash: OtherCashInRecord[] = rawOtherCash
    .filter((oci: any) => oci && typeof oci === 'object')
    .map((oci: any, index: number) => ({
      id: String(oci.id || 'oci_' + index),
      date: normalizeDateString(oci.date, todayStr),
      source: String(oci.source || oci.sourceName || oci.name || oci.title || oci.from || oci.category || 'অন্যান্য ক্যাশ ইন').trim(),
      amount: Number(oci.amount || oci.taka || oci.total || 0),
      paymentMethod: oci.paymentMethod === 'online' ? 'online' : 'cash',
      note: oci.note || oci.notes || oci.remark ? String(oci.note || oci.notes || oci.remark) : undefined,
      receivedBy: String(oci.receivedBy || 'Admin'),
      createdAt: String(oci.createdAt || new Date().toISOString())
    }));

  // 11. USERS
  const rawUsers = findArrayOrData(parsed, ['users', 'userlist', 'accounts', 'useraccounts']);
  let cleanUsers: UserAccount[] = rawUsers
    .filter((u: any) => u && typeof u === 'object')
    .map((u: any, index: number) => ({
      id: String(u.id || 'u_' + index),
      username: String(u.username || u.name || `user_${index + 1}`),
      name: String(u.name || 'ব্যবহারকারী'),
      role: u.role === 'manager' ? 'manager' : 'admin',
      pinOrPassword: String(u.pinOrPassword || u.password || '1234'),
      phone: String(u.phone || ''),
      isActive: u.isActive !== undefined ? Boolean(u.isActive) : true,
      createdAt: String(u.createdAt || new Date().toISOString())
    }));

  // If managers object or adminPass provided directly
  if (cleanUsers.length === 0) {
    const adminPass = String(parsed.adminPass || parsed.adminPassword || '102267');
    cleanUsers.push({
      id: 'admin_1',
      username: 'admin',
      name: 'Admin (অ্যাডমিন)',
      role: 'admin',
      pinOrPassword: adminPass,
      phone: '',
      isActive: true,
      createdAt: new Date().toISOString()
    });

    if (parsed.managers && typeof parsed.managers === 'object' && !Array.isArray(parsed.managers)) {
      Object.entries(parsed.managers).forEach(([mgrName, pin], mIdx) => {
        cleanUsers.push({
          id: 'mgr_' + mIdx,
          username: mgrName,
          name: mgrName,
          role: 'manager',
          pinOrPassword: String(pin || '1234'),
          phone: '',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      });
    }
  }

  // 11.5 If invoices and duePayments are not in top-level array, extract them from customer histories!
  let finalInvoices = cleanInvoices;
  let finalDuePayments = cleanDuePayments;

  if (finalInvoices.length === 0 && finalDuePayments.length === 0) {
    const extractedInvoices: Invoice[] = [];
    const extractedDuePayments: DuePaymentRecord[] = [];
    let invCounter = 1;
    let dpCounter = 1;

    cleanCustomers.forEach(cust => {
      const origCust = rawCustomers.find((rc: any) => rc && (rc.name === cust.name || rc.id === cust.id));
      const history = (origCust && Array.isArray(origCust.history)) ? origCust.history : [];

      history.forEach((h: any) => {
        if (!h || typeof h !== 'object') return;
        const hDate = normalizeDateString(h.date, todayStr);
        const memo = String(h.memo || h.billNo || h.voucherNo || `M-${invCounter}`);
        const sale = Number(h.sale || h.totalSale || h.amount || 0);
        const netSale = Number(h.netSale !== undefined ? h.netSale : sale);
        const discount = Number(h.discount || 0);
        const cash = Number(h.cash || h.cashPaid || 0);
        const online = Number(h.online || h.onlinePaid || 0);
        const rawOnlineMethod = h.onlineMethod ? String(h.onlineMethod).toLowerCase() : undefined;
        let onlineMethod: 'bkash' | 'nagad' | 'rocket' | 'bank' | undefined = undefined;
        if (rawOnlineMethod?.includes('bkash') || rawOnlineMethod?.includes('বিকাশ')) onlineMethod = 'bkash';
        else if (rawOnlineMethod?.includes('nagad') || rawOnlineMethod?.includes('নগদ')) onlineMethod = 'nagad';
        else if (rawOnlineMethod?.includes('rocket') || rawOnlineMethod?.includes('রকেট')) onlineMethod = 'rocket';
        else if (rawOnlineMethod?.includes('bank') || rawOnlineMethod?.includes('ব্যাংক')) onlineMethod = 'bank';
        else if (rawOnlineMethod) onlineMethod = 'bkash';
        const due = Number(h.due ?? 0);

        const isDuePayment = 
          h.onlineMethod === 'বাকি আদায় (পেমেন্ট)' ||
          h.type === 'due_payment' ||
          (sale === 0 && (cash > 0 || online > 0) && netSale <= 0);

        if (isDuePayment) {
          const amount = cash + online || Number(h.amount || 0);
          if (amount > 0) {
            extractedDuePayments.push({
              id: `dp_ext_${dpCounter++}`,
              receiptNo: memo,
              customerId: cust.id,
              customerName: cust.name,
              customerPhone: cust.phone || '',
              date: hDate,
              amount,
              paymentMethod: online > 0 ? 'online' : 'cash',
              onlineMethod,
              notes: 'ব্যাকআপ থেকে রিস্টোরকৃত বাকি আদায়',
              previousDue: 0,
              remainingDue: due,
              collectedBy: 'Admin',
              createdAt: new Date().toISOString()
            });
          }
        } else if (sale > 0 || netSale > 0 || memo) {
          const grandTotal = sale > 0 ? sale : netSale;
          const dueAmount = due > 0 ? due : Math.max(0, grandTotal - discount - cash - online);
          extractedInvoices.push({
            id: `inv_ext_${invCounter++}`,
            invoiceNo: memo,
            date: hDate,
            time: '12:00 PM',
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone || '',
            customerAddress: cust.address,
            items: [
              {
                id: `it_${invCounter}`,
                name: 'পণ্য বিক্রয়',
                quantity: 1,
                unit: 'পিস',
                unitPrice: grandTotal,
                totalPrice: grandTotal
              }
            ],
            subtotal: grandTotal,
            discount,
            laborOrTransportCost: 0,
            grandTotal: Math.max(0, grandTotal - discount),
            cashPaid: cash,
            onlinePaid: online,
            onlineMethod,
            dueAmount,
            status: dueAmount <= 0 ? 'paid' : (cash + online > 0 ? 'partial' : 'due'),
            createdBy: 'Admin',
            createdAt: new Date().toISOString()
          });
        }
      });
    });

    if (extractedInvoices.length > 0) {
      finalInvoices = extractedInvoices;
    }
    if (extractedDuePayments.length > 0) {
      finalDuePayments = extractedDuePayments;
    }
  }

  // 12. AUDIT LOGS & RECYCLE BIN
  const rawAuditLogs = findArrayOrData(parsed, ['auditlogs', 'audit_logs', 'logs', 'systemlogs']);
  const cleanAuditLogs: AuditLog[] = rawAuditLogs
    .filter((l: any) => l && typeof l === 'object')
    .map((l: any, index: number) => ({
      id: String(l.id || 'log_' + index),
      category: l.category || 'সিস্টেম',
      action: String(l.action || 'রেকর্ড'),
      description: String(l.description || l.details || ''),
      performedBy: String(l.performedBy || 'Admin'),
      timestamp: String(l.timestamp || new Date().toISOString()),
      details: l.details && typeof l.details === 'object' ? l.details : undefined
    }));

  const rawCashTallies = findArrayOrData(parsed, ['cashtallies', 'cash_tallies', 'tallies']);
  const cleanCashTallies: CashTallyRecord[] = rawCashTallies
    .filter((t: any) => t && typeof t === 'object')
    .map((t: any, index: number) => ({
      id: String(t.id || 'tally_' + index),
      date: String(t.date || todayStr).split('T')[0],
      openingCash: Number(t.openingCash || 0),
      otherCashIn: Number(t.otherCashIn || 0),
      cashSales: Number(t.cashSales || 0),
      cashDueCollected: Number(t.cashDueCollected || 0),
      todaysCashDeposit: Number(t.todaysCashDeposit || 0),
      cashExpenses: Number(t.cashExpenses || 0),
      totalSupplierPaid: Number(t.totalSupplierPaid || 0),
      expectedCash: Number(t.expectedCash || t.systemCash || 0),
      actualCash: Number(t.actualCash || 0),
      difference: Number(t.difference || t.discrepancy || 0),
      notes: t.notes || t.note ? String(t.notes || t.note) : undefined,
      denominations: t.denominations && typeof t.denominations === 'object' ? t.denominations : undefined,
      savedBy: String(t.savedBy || 'Admin'),
      savedAt: String(t.savedAt || t.countedAt || new Date().toISOString())
    }));

  const rawRecycleBin = findArrayOrData(parsed, ['recyclebin', 'recycle_bin', 'trash']);
  const cleanRecycleBin: RecycleBinItem[] = rawRecycleBin
    .filter((r: any) => r && typeof r === 'object')
    .map((r: any, index: number) => ({
      id: String(r.id || 'rec_' + index),
      type: r.type || 'invoice',
      name: String(r.name || 'মুছে ফেলা ডাটা'),
      amount: r.amount !== undefined ? Number(r.amount) : undefined,
      date: String(r.date || todayStr).split('T')[0],
      deletedAt: String(r.deletedAt || new Date().toISOString()),
      deletedBy: String(r.deletedBy || 'Admin'),
      originalData: r.originalData || {}
    }));

  // Calculate opening cash display amount
  let openingAmount = 0;
  if (cleanOpeningCash.length > 0) {
    openingAmount = cleanOpeningCash[cleanOpeningCash.length - 1].amount || 0;
  }

  const managersCount = cleanUsers.filter(u => u.role === 'manager').length || (cleanUsers.length > 1 ? cleanUsers.length - 1 : 0);

  return {
    customers: cleanCustomers,
    suppliers: cleanSuppliers,
    products: cleanProducts,
    invoices: finalInvoices,
    duePayments: finalDuePayments,
    supplierBills: cleanSupplierBills,
    supplierPayments: cleanSupplierPayments,
    expenses: cleanExpenses,
    openingCashList: cleanOpeningCash,
    otherCashInList: cleanOtherCash,
    cashTallies: cleanCashTallies,
    users: cleanUsers,
    auditLogs: cleanAuditLogs,
    recycleBin: cleanRecycleBin,
    summary: {
      customersCount: cleanCustomers.length,
      suppliersCount: cleanSuppliers.length,
      expensesCount: cleanExpenses.length,
      cashInCount: cleanOtherCash.length,
      openingCashAmount: openingAmount,
      managersCount: managersCount,
      invoicesCount: finalInvoices.length,
      productsCount: cleanProducts.length,
      duePaymentsCount: finalDuePayments.length,
      supplierBillsCount: cleanSupplierBills.length
    }
  };
};
