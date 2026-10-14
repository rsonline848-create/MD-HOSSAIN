const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersView.tsx', 'utf8');

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

fs.writeFileSync('src/components/CustomersView.tsx', code);
