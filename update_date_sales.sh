#!/bin/bash
sed -i 's/const newGrandTotal = editSalesAmount/const enSales = toEnglishNumber(editSalesAmount.toString()); const enDisc = toEnglishNumber(editDiscount.toString()); const enCash = toEnglishNumber(editCashPaid.toString()); const enOnline = toEnglishNumber(editOnlinePaid.toString()); const newGrandTotal = enSales/g' src/components/DateSalesView.tsx
sed -i 's/editSalesAmount +/enSales +/g' src/components/DateSalesView.tsx
sed -i 's/- editDiscount/- enDisc/g' src/components/DateSalesView.tsx
sed -i 's/- editCashPaid/- enCash/g' src/components/DateSalesView.tsx
sed -i 's/- editOnlinePaid/- enOnline/g' src/components/DateSalesView.tsx
sed -i 's/(editCashPaid + editOnlinePaid)/(enCash + enOnline)/g' src/components/DateSalesView.tsx
sed -i 's/subtotal: editSalesAmount/subtotal: enSales/g' src/components/DateSalesView.tsx
sed -i 's/discount: editDiscount/discount: enDisc/g' src/components/DateSalesView.tsx
sed -i 's/cashPaid: editCashPaid/cashPaid: enCash/g' src/components/DateSalesView.tsx
sed -i 's/onlinePaid: editOnlinePaid/onlinePaid: enOnline/g' src/components/DateSalesView.tsx
