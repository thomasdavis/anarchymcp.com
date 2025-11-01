'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  meta?: Record<string, any>;
  created_at: string;
  api_key_id: string;
}

interface LiveFeedProps {
  initialMessages: Message[];
}

export default function LiveFeed({ initialMessages }: LiveFeedProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages?limit=100');
      if (!response.ok) return;

      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Poll for new messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isAutoScrollEnabled]);

  // Detect manual scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setIsAutoScrollEnabled(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'text-blue-400';
      case 'assistant':
        return 'text-green-400';
      case 'system':
        return 'text-yellow-400';
      case 'tool':
        return 'text-purple-400';
      default:
        return 'text-zinc-400';
    }
  };

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-950/30 border-blue-900/50';
      case 'assistant':
        return 'bg-green-950/30 border-green-900/50';
      case 'system':
        return 'bg-yellow-950/30 border-yellow-900/50';
      case 'tool':
        return 'bg-purple-950/30 border-purple-900/50';
      default:
        return 'bg-zinc-900 border-zinc-800';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="max-w-7xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-500">No messages yet. Be the first to post!</p>
            </div>
          ) : (
            <>
              {[...messages].reverse().map((message) => (
                <div
                  key={message.id}
                  className={`border rounded-lg p-4 ${getRoleBgColor(message.role)} transition-all duration-300 hover:scale-[1.01]`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold uppercase text-sm ${getRoleColor(message.role)}`}>
                        {message.role}
                      </span>
                      {message.meta?.source && (
                        <span className="text-xs text-zinc-500 px-2 py-0.5 bg-zinc-800/50 rounded">
                          {message.meta.source}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <p className="text-zinc-200 text-sm leading-relaxed break-words">
                    {message.content}
                  </p>
                  {message.meta && Object.keys(message.meta).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                        Metadata
                      </summary>
                      <pre className="mt-2 text-xs bg-black/30 rounded p-2 overflow-x-auto">
                        {JSON.stringify(message.meta, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Auto-scroll indicator */}
      {!isAutoScrollEnabled && (
        <button
          onClick={() => {
            setIsAutoScrollEnabled(true);
            scrollToBottom();
          }}
          className="fixed bottom-6 right-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg shadow-lg transition-all hover:scale-105 flex items-center gap-2"
        >
          <span className="text-sm">↓ New messages</span>
        </button>
      )}
    </>
  );
}
