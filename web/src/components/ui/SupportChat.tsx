'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; }

const WELCOME = 'Namaste! 👋 Main FutureBit ka AI Support Assistant hun.\n\nAap mujhse puch sakte hain:\n• Staking kaise karein\n• APY kaise calculate hoti hai\n• Referral system kaise kaam karta hai\n• Token contracts\n• Koi bhi platform related sawaal\n\nKya help chahiye?';

export default function SupportChat() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch('/api/support-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages(m => [...m, {
        role:    'assistant',
        content: data.reply ?? data.error ?? 'Sorry, kuch problem aayi. Please dobara try karein.',
      }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-400 text-surface-900 shadow-2xl shadow-brand-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="AI Support Chat"
        aria-label="Open support chat"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
        )}
        {/* Notification dot */}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-rose border-2 border-surface-900 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-10rem)] flex flex-col rounded-2xl bg-surface-800 border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-700/80 border-b border-white/5 shrink-0">
            <div className="relative w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <span className="text-lg">🤖</span>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-surface-700"/>
            </div>
            <div>
              <p className="font-display font-bold text-sm text-white">FutureBit AI Support</p>
              <p className="text-[10px] text-brand-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-brand-400 inline-block animate-pulse"/>
                Online • Powered by Claude AI
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs mr-2 mt-1 shrink-0">🤖</div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-brand-500 text-surface-900 font-medium rounded-br-sm'
                      : 'bg-surface-700/80 text-text-primary rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs shrink-0">🤖</div>
                <div className="bg-surface-700/80 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick questions */}
          <div className="px-3 pb-2 shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['APY kya hai?','Kaise stake karein?','Referral kaise kaam karta hai?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-display whitespace-nowrap hover:bg-brand-500/20 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 pb-4 shrink-0">
            <div className="flex gap-2 items-center bg-surface-900/80 rounded-xl border border-white/10 focus-within:border-brand-500/40 transition-all pr-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Apna sawaal likhein…"
                disabled={loading}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-text-muted outline-none"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-surface-900 flex items-center justify-center transition-all shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
