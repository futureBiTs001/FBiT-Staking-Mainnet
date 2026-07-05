'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the FBiT Staking assistant. Ask me about APY, supported chains, referrals, or how staking works.",
};

export default function SupportChat() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter(m => m !== GREETING) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I ran into an issue. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="glass-card w-[min(360px,calc(100vw-2.5rem))] h-[480px] mb-3 flex flex-col p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div>
              <p className="font-display font-semibold text-sm">FBiT Support</p>
              <p className="text-text-muted text-[11px]">AI assistant &middot; usually instant</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none px-1"
            >
              &times;
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-brand-500/20 text-text-primary border border-brand-500/20'
                      : 'bg-surface-800/60 text-text-secondary border border-white/5'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-800/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-text-muted">
                  Typing&hellip;
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 p-3 border-t border-white/5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about staking, APY, referrals..."
              maxLength={800}
              disabled={loading}
              className="input-field flex-1 text-xs py-2"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className="w-14 h-14 rounded-full flex items-center justify-center btn-primary shadow-lg animate-glow"
      >
        {open ? (
          <span className="text-xl leading-none">&times;</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 4h16v11H7l-3 3V4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
