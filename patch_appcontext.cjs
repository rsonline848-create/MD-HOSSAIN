const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const oldUpdateCust = `    const nextCustomers = customersRef.current.map(c => {
      if (c.id === paymentData.customerId) {
        return {
          ...c,
          totalPaid: (c.totalPaid || 0) + paymentData.amount,
          currentDue: (c.currentDue || 0) - paymentData.amount
        };
      }
      return c;
    });`;

const newUpdateCust = `    const nextCustomers = customersRef.current.map(c => {
      if (c.id === paymentData.customerId) {
        return {
          ...c,
          totalPaid: (c.totalPaid || 0) + paymentData.amount,
          currentDue: (c.currentDue || 0) - paymentData.amount - (paymentData.discount || 0)
        };
      }
      return c;
    });`;
code = code.replace(oldUpdateCust, newUpdateCust);

fs.writeFileSync('src/context/AppContext.tsx', code);
