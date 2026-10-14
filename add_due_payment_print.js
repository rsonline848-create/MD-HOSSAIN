const fs = require('fs');
let appCtx = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

appCtx = appCtx.replace(
  "invoiceToPrint: Invoice | null;",
  "invoiceToPrint: Invoice | null;\n  duePaymentToPrint: DuePaymentRecord | null;\n  setDuePaymentToPrint: (dp: DuePaymentRecord | null) => void;"
);
appCtx = appCtx.replace(
  "const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);",
  "const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);\n  const [duePaymentToPrint, setDuePaymentToPrint] = useState<DuePaymentRecord | null>(null);"
);
appCtx = appCtx.replace(
  "invoiceToPrint,",
  "invoiceToPrint,\n        duePaymentToPrint,\n        setDuePaymentToPrint,"
);
fs.writeFileSync('src/context/AppContext.tsx', appCtx);
