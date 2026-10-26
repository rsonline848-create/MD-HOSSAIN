import re

with open('src/components/ProductsView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update thead
old_thead = '''                                          <th className="py-2 px-3 text-center w-12">{language === 'bn' ? 'নং' : '#'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'পণ্যের নাম' : 'Product Name'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'কোড' : 'Code'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                                          <th className="py-2 px-3 text-right text-emerald-700">{language === 'bn' ? 'ক্রয় (+কেজি)' : 'Purchase (+KG)'}</th>
                                          <th className="py-2 px-3 text-right text-rose-700">{language === 'bn' ? 'বিক্রয় (-কেজি)' : 'Sale (-KG)'}</th>
                                          <th className="py-2 px-3 text-right">{language === 'bn' ? 'নিট পরিবর্তন' : 'Net Change'}</th>
                                          <th className="py-2 px-3 text-right bg-indigo-100/70 text-indigo-950 font-black border-l border-indigo-200">
                                            {language === 'bn' ? 'দিনের শেষ স্টক (KG)' : 'Day Last Stock (KG)'}
                                          </th>
                                          <th className="py-2 px-3 text-right text-slate-500 font-semibold">
                                            {language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}
                                          </th>'''

new_thead = '''                                          <th className="py-2 px-3 text-center w-12">{language === 'bn' ? 'নং' : '#'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'পণ্যের নাম' : 'Product Name'}</th>
                                          <th className="py-2 px-3">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                                          <th className="py-2 px-3 text-right text-emerald-700">{language === 'bn' ? 'ক্রয় (+কেজি)' : 'Purchase (+KG)'}</th>
                                          <th className="py-2 px-3 text-right text-rose-700">{language === 'bn' ? 'বিক্রয় (-কেজি)' : 'Sale (-KG)'}</th>
                                          <th className="py-2 px-3 text-right">{language === 'bn' ? 'নিট পরিবর্তন' : 'Net Change'}</th>
                                          <th className="py-2 px-3 text-right bg-indigo-100/70 text-indigo-950 font-black border-l border-indigo-200">
                                            {language === 'bn' ? 'দিনের শেষ স্টক (KG)' : 'Day Last Stock (KG)'}
                                          </th>
                                          <th className="py-2 px-3 text-right bg-emerald-100/80 text-emerald-950 font-black border-l border-emerald-200">
                                            {language === 'bn' ? 'দিনের শেষ স্টক পণ্যের ভ্যালু (৳)' : 'Closing Stock Value (৳)'}
                                          </th>
                                          <th className="py-2 px-3 text-right text-slate-500 font-semibold">
                                            {language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}
                                          </th>'''

assert old_thead in content, 'old_thead not found'
content = content.replace(old_thead, new_thead, 1)

# 2. Update tbody
old_row = '''                                                <td className="py-2 px-3 text-center font-bold text-slate-400">
                                                  {toBengaliNumber(pIdx + 1)}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                    {p.productName}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-3 text-slate-500 font-medium text-[11px]">
                                                  {p.productCode || '-'}
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 text-[11px]">
                                                  {p.category || '-'}
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-emerald-700">
                                                  {p.purchaseKg > 0 ? `+${toBengaliNumber(p.purchaseKg)}` : '০'} <span className="text-[10px] text-emerald-600 font-semibold">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-rose-700">
                                                  {p.saleKg > 0 ? `-${toBengaliNumber(p.saleKg)}` : '০'} <span className="text-[10px] text-rose-600 font-semibold">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold">
                                                  <span className={p.netChangeKg > 0 ? 'text-emerald-700 font-black' : p.netChangeKg < 0 ? 'text-rose-700 font-black' : 'text-slate-400'}>
                                                    {p.netChangeKg > 0 ? `+${toBengaliNumber(p.netChangeKg)}` : toBengaliNumber(p.netChangeKg)} <span className="text-[10px] font-normal">KG</span>
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-right bg-indigo-50/60 font-black text-indigo-950 border-l border-indigo-100">
                                                  <span className="text-xs sm:text-sm">{toBengaliNumber(p.lastStockKg)}</span> <span className="text-[10px] font-bold text-indigo-700">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right text-slate-600 font-semibold">
                                                  <span>{toBengaliNumber(p.currentStockKg)}</span> <span className="text-[10px] text-slate-400 font-normal">KG</span>
                                                </td>'''

new_row = '''                                                <td className="py-2 px-3 text-center font-bold text-slate-400">
                                                  {toBengaliNumber(pIdx + 1)}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                                    {p.productName}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-3 text-slate-600 text-[11px]">
                                                  {p.category || '-'}
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-emerald-700">
                                                  {p.purchaseKg > 0 ? `+${toBengaliNumber(p.purchaseKg)}` : '০'} <span className="text-[10px] text-emerald-600 font-semibold">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-rose-700">
                                                  {p.saleKg > 0 ? `-${toBengaliNumber(p.saleKg)}` : '০'} <span className="text-[10px] text-rose-600 font-semibold">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-bold">
                                                  <span className={p.netChangeKg > 0 ? 'text-emerald-700 font-black' : p.netChangeKg < 0 ? 'text-rose-700 font-black' : 'text-slate-400'}>
                                                    {p.netChangeKg > 0 ? `+${toBengaliNumber(p.netChangeKg)}` : toBengaliNumber(p.netChangeKg)} <span className="text-[10px] font-normal">KG</span>
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3 text-right bg-indigo-50/60 font-black text-indigo-950 border-l border-indigo-100">
                                                  <span className="text-xs sm:text-sm">{toBengaliNumber(p.lastStockKg)}</span> <span className="text-[10px] font-bold text-indigo-700">KG</span>
                                                </td>
                                                <td className="py-2 px-3 text-right bg-emerald-50/60 font-black text-emerald-900 border-l border-emerald-100">
                                                  <div className="text-xs sm:text-sm font-black text-emerald-800">
                                                    {toBengaliNumber(p.lastStockValue)} ৳
                                                  </div>
                                                  {p.rate > 0 && (
                                                    <div className="text-[10px] text-slate-400 font-semibold">
                                                      @{toBengaliNumber(p.rate)} ৳
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-right text-slate-600 font-semibold">
                                                  <span>{toBengaliNumber(p.currentStockKg)}</span> <span className="text-[10px] text-slate-400 font-normal">KG</span>
                                                </td>'''

assert old_row in content, 'old_row not found'
content = content.replace(old_row, new_row, 1)

# 3. Update tfoot
old_tfoot = '''                                        <tr>
                                          <td colSpan={4} className="py-2.5 px-3 text-right">
                                            <span>{language === 'bn' ? `সর্বমোট (${toBengaliNumber(filteredBreakdown.length)}টি পণ্য):` : `Total (${filteredBreakdown.length} items):`}</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-emerald-800">
                                            +{toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.purchaseKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-rose-800">
                                            -{toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.saleKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {(() => {
                                              const netSum = filteredBreakdown.reduce((sum, p) => sum + p.netChangeKg, 0);
                                              return (
                                                <span className={netSum >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                                                  {netSum >= 0 ? `+${toBengaliNumber(netSum)}` : toBengaliNumber(netSum)} <span className="text-[10px]">KG</span>
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-indigo-950 bg-indigo-100/80 border-l border-indigo-200 text-sm">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.lastStockKg, 0))} <span className="text-[10px] font-bold">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-700">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.currentStockKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                        </tr>'''

new_tfoot = '''                                        <tr>
                                          <td colSpan={3} className="py-2.5 px-3 text-right">
                                            <span>{language === 'bn' ? `সর্বমোট (${toBengaliNumber(filteredBreakdown.length)}টি পণ্য):` : `Total (${filteredBreakdown.length} items):`}</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-emerald-800">
                                            +{toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.purchaseKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-rose-800">
                                            -{toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.saleKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            {(() => {
                                              const netSum = filteredBreakdown.reduce((sum, p) => sum + p.netChangeKg, 0);
                                              return (
                                                <span className={netSum >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                                                  {netSum >= 0 ? `+${toBengaliNumber(netSum)}` : toBengaliNumber(netSum)} <span className="text-[10px]">KG</span>
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-indigo-950 bg-indigo-100/80 border-l border-indigo-200 text-sm">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.lastStockKg, 0))} <span className="text-[10px] font-bold">KG</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-emerald-950 bg-emerald-100/90 border-l border-emerald-200 text-sm font-black">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + (p.lastStockValue || 0), 0))} <span className="text-[10px] font-bold">৳</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-slate-700">
                                            {toBengaliNumber(filteredBreakdown.reduce((sum, p) => sum + p.currentStockKg, 0))} <span className="text-[10px]">KG</span>
                                          </td>
                                        </tr>'''

assert old_tfoot in content, 'old_tfoot not found'
content = content.replace(old_tfoot, new_tfoot, 1)

with open('src/components/ProductsView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESSFULLY UPDATED ProductsView.tsx')
