const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersView.tsx', 'utf8');

// Fix 2: map due payments with discount
code = code.replace(/discount: 0,\n        cashPaid: dp.paymentMethod === 'cash' \? dp.amount : 0,/g, 
  "discount: dp.discount || 0,\n        cashPaid: dp.paymentMethod === 'cash' ? dp.amount : 0,");

// Fix 3: running balance calculation
code = code.replace(/const netBill = Math\.max\(0, item\.sale \- item\.discount\);\n      const totalPaid = item\.cashPaid \+ item\.otherPaid;\n      runningBalance = Math\.max\(0, runningBalance \+ netBill \- totalPaid\);/g, 
  "const netBill = item.type === 'invoice' ? Math.max(0, item.sale - item.discount) : 0;\n      const totalPaid = item.cashPaid + item.otherPaid;\n      const extraDiscount = item.type === 'due_payment' ? item.discount : 0;\n      runningBalance = Math.max(0, runningBalance + netBill - totalPaid - extraDiscount);");

fs.writeFileSync('src/components/CustomersView.tsx', code);
