const fs = require('fs');
let code = fs.readFileSync('src/components/NewInvoiceView.tsx', 'utf8');

// Replace Calculations
const oldCalc = `  // Calculations
  const previousDue = selectedCustomer ? (selectedCustomer.currentDue || 0) : 0;
  const netSale = Math.max(0, (toEnglishNumber(totalSaleAmount.toString()) || 0) - (toEnglishNumber(discount.toString()) || 0));
  const totalPaid = (toEnglishNumber(cashPaid.toString()) || 0) + (toEnglishNumber(onlinePaid.toString()) || 0);
  const todaysDue = netSale - totalPaid;
  const overallDue = previousDue + netSale - totalPaid;`;

const newCalc = `  // Calculations
  const numTotalSale = toEnglishNumber(totalSaleAmount.toString()) || 0;
  const numDiscount = toEnglishNumber(discount.toString()) || 0;
  const numCashPaid = toEnglishNumber(cashPaid.toString()) || 0;
  const numOnlinePaid = toEnglishNumber(onlinePaid.toString()) || 0;

  const previousDue = selectedCustomer ? (selectedCustomer.currentDue || 0) : 0;
  const netSale = numTotalSale - numDiscount;
  const totalPaid = numCashPaid + numOnlinePaid;
  const todaysDue = netSale - totalPaid;
  const overallDue = previousDue + netSale - totalPaid;`;

code = code.replace(oldCalc, newCalc);

// Replace validItems
const oldItems = `    const validItems: InvoiceItem[] = [
      {
        id: 'it_main',
        name: 'মালামাল বিক্রয়',
        quantity: 1,
        unit: 'আইটেম',
        unitPrice: netSale,
        totalPrice: netSale
      }
    ];`;

const newItems = `    const validItems: InvoiceItem[] = [
      {
        id: 'it_main',
        name: 'মালামাল বিক্রয়',
        quantity: 1,
        unit: 'আইটেম',
        unitPrice: numTotalSale,
        totalPrice: numTotalSale
      }
    ];`;

code = code.replace(oldItems, newItems);

// Also need to fix subtotal, discount, cashPaid in the addInvoice call to use the parsed numbers
const oldAddInvoice = `      subtotal: toEnglishNumber(totalSaleAmount.toString()) || 0,
      discount: toEnglishNumber(discount.toString()) || 0,
      laborOrTransportCost: 0,
      grandTotal: netSale,
      cashPaid: toEnglishNumber(cashPaid.toString()) || 0,
      onlinePaid: toEnglishNumber(onlinePaid.toString()) || 0,`;

const newAddInvoice = `      subtotal: numTotalSale,
      discount: numDiscount,
      laborOrTransportCost: 0,
      grandTotal: netSale,
      cashPaid: numCashPaid,
      onlinePaid: numOnlinePaid,`;

code = code.replace(oldAddInvoice, newAddInvoice);

fs.writeFileSync('src/components/NewInvoiceView.tsx', code);
