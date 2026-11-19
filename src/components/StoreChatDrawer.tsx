import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import {
  apiRequest,
  getCustomerSessionId,
  getSavedCustomerName,
  saveCustomerName,
} from '../lib/api';
import { AuthUser, ChatMessage, StoreProfile } from '../types';
import { SafeImage } from './SafeImage';

interface StoreChatDrawerProps {
  store: StoreProfile | null;
  currentUser: AuthUser | null;
  onClose: () => void;
}

export const StoreChatDrawer: React.FC<StoreChatDrawerProps> = ({
  store,
  currentUser,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customerName, setCustomerName] = useState(
    () => currentUser?.name || getSavedCustomerName() || ''
  );
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const sessionId = currentUser?.id || getCustomerSessionId();

  useEffect(() => {
    if (currentUser?.name) {
      setCustomerName(currentUser.name);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    if (!store) return;

    let active = true;
    const loadMessages = async () => {
      try {
        const res = await apiRequest<{ messages: ChatMessage[] }>(
          `/api/conversations/${encodeURIComponent(store.id)}?customerSessionId=${encodeURIComponent(sessionId)}`
        );
        if (active) setMessages(res.messages);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'تعذر تحميل المحادثة'
          );
        }
      }
    };

    loadMessages();
    const timer = window.setInterval(loadMessages, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [store, sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!store) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [store, onClose]);

  if (!store) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    setSending(true);
    try {
      const displayName = customerName.trim() || 'زبون';
      if (customerName.trim()) {
        saveCustomerName(customerName.trim());
      }
      const res = await apiRequest<{ message: ChatMessage }>(
        `/api/conversations/${encodeURIComponent(store.id)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            customerSessionId: sessionId,
            customerName: displayName,
            text: text.trim(),
          }),
        }
      );
      setMessages((prev) => [...prev, res.message]);
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 dark:bg-black/70 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`التواصل مع ${store.name}`}
    >
      <aside
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
              <SafeImage
                src={store.logo}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {store.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                محادثة مباشرة · {store.city}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المحادثة"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[#F8F9FA] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
            اسمك الظاهر للمتجر
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="أدخل اسمك ليتمكن المتجر من الرد عليك..."
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8F9FA] dark:bg-slate-950">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 space-y-2 py-10">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ابدأ المحادثة مع {store.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                اسأل عن توفر جهاز، تفاصيل الضمان، أو استفسر عن خدمة صيانة قبل الحجز.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isCustomer = msg.senderRole === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCustomer ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                      isCustomer
                        ? 'bg-blue-700 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1 tabular-nums">
                    {isCustomer ? msg.customerName : store.name} · {msg.createdAt}
                  </span>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-50 dark:bg-red-950/60 text-xs text-red-700 dark:text-red-300 border-t border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب رسالتك للمتجر..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="إرسال الرسالة"
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </div>
  );
};
