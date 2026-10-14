const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

const newCustomerLogic = `
  const targetDateNum = new Date(targetDate).getTime();
  
  let openingDueUpToDate = 0;
  let invoicesDueUpToDate = 0;
  let paymentsUpToDate = 0;

  customers.forEach(c => {
    openingDueUpToDate += (c.openingDue || 0);
    
    const invs = invoices.filter(inv => inv.customerId === c.id && new Date(inv.date).getTime() <= targetDateNum);
    invoicesDueUpToDate += invs.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
    
    const pays = duePayments.filter(p => p.customerId === c.id && new Date(p.date).getTime() <= targetDateNum);
    paymentsUpToDate += pays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  });
  
  const totalCustomerDueUpToDate = openingDueUpToDate + invoicesDueUpToDate - paymentsUpToDate;
`;

code = code.replace(
  /const targetDateNum = new Date\(targetDate\)\.getTime\(\);\s*const openingDueUpToDate = customers\.reduce\([\s\S]*?const totalCustomerDueUpToDate = openingDueUpToDate \+ invoicesDueUpToDate - paymentsUpToDate;/m,
  newCustomerLogic
);

const newSupplierLogic = `
  let openingSupplierUpToDate = 0;
  let supplierBillsUpToDate = 0;
  let supplierPaymentsUpToDate = 0;

  suppliers.forEach(s => {
    openingSupplierUpToDate += (s.openingBalance || 0);
    
    const bills = supplierBills.filter(b => b.supplierId === s.id && new Date(b.date).getTime() <= targetDateNum);
    supplierBillsUpToDate += bills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
    
    const pays = supplierPayments.filter(p => p.supplierId === s.id && new Date(p.date).getTime() <= targetDateNum);
    supplierPaymentsUpToDate += pays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  });
  
  const totalSupplierPayableUpToDate = openingSupplierUpToDate + supplierBillsUpToDate - supplierPaymentsUpToDate;
`;

code = code.replace(
  /const openingSupplierUpToDate = suppliers\.reduce\([\s\S]*?const totalSupplierPayableUpToDate = openingSupplierUpToDate \+ supplierBillsUpToDate - supplierPaymentsUpToDate;/m,
  newSupplierLogic
);

fs.writeFileSync('src/components/DashboardView.tsx', code);
