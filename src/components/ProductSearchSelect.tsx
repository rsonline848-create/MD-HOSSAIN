import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ChevronDown, Sparkles, Plus } from 'lucide-react';
import { ProductCatalogItem } from '../types';
import { toBengaliNumber, compareProductNames } from '../utils/formatters';

export interface ProductSearchSelectProps {
  products: ProductCatalogItem[];
  selectedProductId?: string;
  onSelect: (product: ProductCatalogItem | null) => void;
  onAddNew: (presetName?: string) => void;
  placeholder?: string;
  priceType?: 'sale' | 'purchase';
  inputId?: string;
  onPressEnterWhenClosed?: () => void;
}

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  selectedProductId,
  onSelect,
  onAddNew,
  placeholder = 'ক্যাটালগ থেকে পণ্য খুঁজুন বা বাছাই করুন...',
  priceType = 'sale',
  inputId,
  onPressEnterWhenClosed
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Sync display with selected product when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedProduct ? selectedProduct.name : '');
    }
  }, [selectedProduct, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered and naturally sorted products list (1.1, 4.2round, 5.5squre, 6round, 10.10)
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...products].sort((a, b) => compareProductNames(a.name, b.name));
    }
    return products
      .filter(p => {
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => compareProductNames(a.name, b.name));
  }, [products, query]);

  // Windowed display for 60fps rendering even with thousands of items
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, 50);
  }, [filteredProducts]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightIndex(0);
      } else {
        setHighlightIndex(prev => Math.min(prev + 1, displayedProducts.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen) {
        if (highlightIndex === displayedProducts.length) {
          onAddNew(query.trim());
          setIsOpen(false);
        } else if (displayedProducts[highlightIndex]) {
          const chosen = displayedProducts[highlightIndex];
          onSelect(chosen);
          setQuery(chosen.name);
          setIsOpen(false);
        }
      } else {
        if (onPressEnterWhenClosed) {
          onPressEnterWhenClosed();
        } else {
          setIsOpen(true);
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
    inputRef.current?.focus();
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-30' : 'z-10'}`}>
      <div 
        className="relative flex items-center"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(0);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-16 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {selectedProduct && (
            <button
              type="button"
              onClick={handleClear}
              title="মুছে ফেলুন"
              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center space-y-2">
              <p className="text-xs text-slate-500">
                "{query}" নামের কোনো পণ্য পাওয়া যায়নি
              </p>
              <button
                type="button"
                onClick={() => {
                  onAddNew(query.trim());
                  setIsOpen(false);
                }}
                className="w-full py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>+ "{query}" নামে নতুন প্রোডাক্ট যুক্ত করুন</span>
              </button>
            </div>
          ) : (
            <>
              {displayedProducts.map((p, idx) => {
                const isHighlighted = idx === highlightIndex;
                const isSelected = p.id === selectedProductId;
                const displayPrice = priceType === 'purchase' ? (p.purchasePrice || 0) : (p.salePrice || 0);
                const priceLabel = priceType === 'purchase' ? 'ক্রয় দর' : 'বিক্রয় দর';

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelect(p);
                      setQuery(p.name);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`p-2.5 cursor-pointer text-xs flex items-center justify-between transition ${
                      isHighlighted ? 'bg-purple-50' : 'hover:bg-slate-50'
                    } ${isSelected ? 'bg-purple-50/70 border-l-2 border-purple-600' : ''}`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold ${isSelected ? 'text-purple-700' : 'text-slate-800'}`}>
                          {p.name}
                        </span>
                        {p.code && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                            {p.code}
                          </span>
                        )}
                        {p.category && (
                          <span className="text-[10px] text-slate-400">
                            • {p.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-bold text-purple-700 block">
                        {priceLabel}: {toBengaliNumber(displayPrice)} ৳
                      </span>
                      <span className={`text-[10px] font-semibold ${
                        (Number(p.stock) || 0) < 0 
                          ? 'text-rose-600 font-bold' 
                          : (Number(p.stock) || 0) === 0 
                          ? 'text-amber-600' 
                          : 'text-emerald-700'
                      }`}>
                        {(Number(p.stock) || 0) < 0 
                          ? `ঘাটতি: ${toBengaliNumber(p.stock)} ${p.unit || 'KG'}`
                          : `বর্তমান স্টক: ${toBengaliNumber(p.stock || 0)} ${p.unit || 'KG'}`
                        }
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length > displayedProducts.length && (
                <div className="py-2 px-3 text-center text-[11px] font-medium text-slate-500 bg-slate-50 border-t border-slate-100">
                  আরও {toBengaliNumber(filteredProducts.length - displayedProducts.length)} টি পণ্য রয়েছে (খুঁজতে আরও সুনির্দিষ্ট নাম লিখুন)
                </div>
              )}

              {/* Bottom Quick Add Option */}
              <div
                onClick={() => {
                  onAddNew(query.trim());
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightIndex(displayedProducts.length)}
                className={`p-2.5 cursor-pointer text-xs font-bold text-purple-700 flex items-center gap-1.5 border-t border-slate-100 transition ${
                  highlightIndex === displayedProducts.length ? 'bg-purple-100/70' : 'bg-slate-50 hover:bg-purple-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ক্যাটালগে নতুন প্রোডাক্ট যুক্ত করুন...</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
