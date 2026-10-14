const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersView.tsx', 'utf8');

// Fix 1: Add discount to currentDue calculation
const oldCalc1 = `      const paidDue = pays.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...c,
        openingDue,
        totalPurchased: purchases,
        totalPaid: paidInvoices + paidDue,
        currentDue: openingDue + addedDue - paidDue
      };`;

const newCalc1 = `      const paidDue = pays.reduce((sum, p) => sum + Number(p.amount), 0);
      const discountDue = pays.reduce((sum, p) => sum + Number(p.discount || 0), 0);
      return {
        ...c,
        openingDue,
        totalPurchased: purchases,
        totalPaid: paidInvoices + paidDue,
        currentDue: openingDue + addedDue - paidDue - discountDue
      };`;
code = code.replace(oldCalc1, newCalc1);

// Fix 2: map due payments with discount
const oldMapDp = `    custDuePayments.forEach(dp => {
      combined.push({
        id: dp.id,
        date: dp.date,
        type: 'due_payment',
        memo: \`বাকি আদায়: \${dp.receiptNo || 'রশিদ'}\`,
        sale: 0,
        discount: 0,`;

const newMapDp = `    custDuePayments.forEach(dp => {
      combined.push({
        id: dp.id,
        date: dp.date,
        type: 'due_payment',
        memo: \`বাকি আদায়: \${dp.receiptNo || 'রশিদ'}\`,
        sale: 0,
        discount: dp.discount || 0,`;
code = code.replace(oldMapDp, newMapDp);

// Fix 3: running balance calculation
const oldRunBal = `    const computedRows = combined.map(item => {
      const netBill = Math.max(0, item.sale - item.discount);
      const totalPaid = item.cashPaid + item.otherPaid;
      runningBalance = Math.max(0, runningBalance + netBill - totalPaid);
      return {`;

const newRunBal = `    const computedRows = combined.map(item => {
      const netBill = item.type === 'invoice' ? Math.max(0, item.sale - item.discount) : 0;
      const totalPaid = item.cashPaid + item.otherPaid;
      const extraDiscount = item.type === 'due_payment' ? item.discount : 0;
      runningBalance = Math.max(0, runningBalance + netBill - totalPaid - extraDiscount);
      return {`;
code = code.replace(oldRunBal, newRunBal);

fs.writeFileSync('src/components/CustomersView.tsx', code);
