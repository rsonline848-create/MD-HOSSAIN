const fs = require('fs');
let code = fs.readFileSync('src/components/DueCollectionView.tsx', 'utf8');

// 1. Add state
const stateRegex = /const \[otherCollected, setOtherCollected\] = useState<string>\(\"\"\);/;
code = code.replace(stateRegex, "const [otherCollected, setOtherCollected] = useState<string>(\"\");\n  const [onlineMethod, setOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bkash');");

// 2. Change addDuePayment online
const addOtherOld = `    if (numOther > 0) {
      addDuePayment({
        receiptNo: numCash > 0 ? \\\`\\\${receiptNumber}-ONL\\\` : receiptNumber,
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        date: paymentDate,
        billDate: billDate || undefined,
        amount: numOther,
        discount: numCash === 0 && numDiscount > 0 ? numDiscount : undefined,
        paymentMethod: 'online',
        notes: 'অন্যান্য মাধ্যমে আদায়',
        previousDue: currentDue,
        remainingDue: nextDue
      });
    }`;
const addOtherNew = `    if (numOther > 0) {
      addDuePayment({
        receiptNo: numCash > 0 ? \`\${receiptNumber}-ONL\` : receiptNumber,
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        date: paymentDate,
        billDate: billDate || undefined,
        amount: numOther,
        discount: numCash === 0 && numDiscount > 0 ? numDiscount : undefined,
        paymentMethod: 'online',
        onlineMethod: onlineMethod,
        notes: 'অন্যান্য মাধ্যমে আদায়',
        previousDue: currentDue,
        remainingDue: nextDue
      });
    }`;
code = code.replace(addOtherOld, addOtherNew);

// 3. UI Update
const gridOld = `          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                নগদ আদায়
              </label>
              <input
                ref={cashCollectedRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="0"
                value={cashCollected || ''}
                onChange={(e) => setCashCollected(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    otherCollectedRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#15803d] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#4338ca] block mb-1.5">
                অন্যান্য মাধ্যম (চেক/বিকাশ ইত্যাদি)
              </label>`;
const gridNew = `          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                নগদ আদায়
              </label>
              <input
                ref={cashCollectedRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="0"
                value={cashCollected || ''}
                onChange={(e) => setCashCollected(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    otherCollectedRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#15803d] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                পেমেন্ট মাধ্যম
              </label>
              <select
                value={onlineMethod}
                onChange={(e: any) => setOnlineMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="bank">ব্যাংক (Bank)</option>
                <option value="cheque">চেক (Cheque)</option>
                <option value="goods">মাল বাবদ পেমেন্ট (Goods)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#4338ca] block mb-1.5">
                পেমেন্টের টাকা
              </label>`;
code = code.replace(gridOld, gridNew);

fs.writeFileSync('src/components/DueCollectionView.tsx', code);
