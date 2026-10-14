const fs = require('fs');

const code = `import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'হ্যালো! আমি আপনার ML Electric অ্যাপের AI অ্যাসিস্ট্যান্ট। আমি আপনাকে অ্যাপ চালানোর নিয়মাবলি এবং আপনার দোকানের হিসাব (যেমন: আজকের বিক্রি, কার কত বাকি) জানাতে পারি। আপনি কী জানতে চান?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    invoices, customers, products, duePayments, dailyExpenses, 
    suppliers, supplierBills, supplierPayments, cashInHands, bankBalances 
  } = useAppContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const contextData = {
        totalCustomers: customers.length,
        customers: customers.map(c => ({ name: c.name, phone: c.phone, currentDue: c.currentDue })),
        recentInvoices: invoices.slice(0, 50).map(i => ({ no: i.invoiceNo, date: i.date, customer: i.customerName, total: i.grandTotal, due: i.dueAmount })),
        products: products.map(p => ({ name: p.name, price: p.price, stock: p.stock })),
        dailyExpenses: dailyExpenses.slice(0, 30),
        suppliers: suppliers.map(s => ({ name: s.name, payable: s.currentPayable })),
        todaysDate: new Date().toISOString().split('T')[0]
      };

      const chatHistory = messages.map(m => ({ role: m.role, text: m.text })).concat({ role: 'user', text: userText });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          contextData
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'bot', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: 'দুঃখিত, সার্ভারে একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: 'দুঃখিত, কানেকশন এরর। আবার চেষ্টা করুন।' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[500px] flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI অ্যাসিস্ট্যান্ট</h3>
                <p className="text-[10px] text-indigo-100 opacity-90">Powered by Google Gemini</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={"flex " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={"flex gap-2 max-w-[85%] " + (msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={"w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 " + (msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600')}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={"p-3 rounded-2xl text-sm whitespace-pre-wrap " + (msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm')}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[85%] flex-row">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-slate-100">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="প্রশ্ন লিখুন..."
                className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500 rounded-xl px-4 py-2 text-sm outline-none"
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-xl transition flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/Chatbot.tsx', code);
