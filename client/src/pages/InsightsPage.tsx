import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lightbulb, Send } from 'lucide-react';
import * as api from '@/services/api';
import type { Insight } from '@/types';
import PageHeader from '@/components/PageHeader';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getInsights().then(setInsights).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const insight = await api.sendInsightChat(userMsg.text);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: insight.text },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Insights"
        subtitle="AI-generated observations about your spending"
      />

      <div className="px-8 py-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Insight cards */}
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Suggested insights
          </h3>
          {loading ? (
            <p className="text-gray-500">Loading insights…</p>
          ) : (
            <div className="space-y-3">
              {insights.map((i) => (
                <div
                  key={i.id}
                  className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4"
                >
                  {i.type === 'warning' ? (
                    <AlertTriangle
                      size={18}
                      className="shrink-0 text-amber-500 mt-0.5"
                    />
                  ) : (
                    <Lightbulb
                      size={18}
                      className="shrink-0 text-emerald-500 mt-0.5"
                    />
                  )}
                  <p className="text-sm">{i.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Chat panel */}
        <section className="flex flex-col rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium">Ask about your spending</h3>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]"
          >
            {messages.length === 0 && (
              <p className="text-sm text-gray-400">
                Ask a question like "How much did I spend on food this month?"
                to see an AI insight. (Placeholder responses for now.)
              </p>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <p className="text-xs text-gray-400">Assistant is typing…</p>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-gray-200 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center gap-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
