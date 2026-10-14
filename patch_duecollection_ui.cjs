const fs = require('fs');
let code = fs.readFileSync('src/components/DueCollectionView.tsx', 'utf8');

const regexOldGrid = /<div className="bg-\[#f0fdf4\] border border-\[#bbf7d0\] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">([\s\S]*?)<label className="text-xs font-bold text-\[#4338ca\] block mb-1\.5">\s*অন্যান্য মাধ্যম \(চেক\/বিকাশ ইত্যাদি\)\s*<\/label>/;

const replacementGrid = `<div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">$1<label className="text-xs font-bold text-slate-700 block mb-1.5">
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

code = code.replace(regexOldGrid, replacementGrid);
fs.writeFileSync('src/components/DueCollectionView.tsx', code);
