import { Suspense } from 'react';
import Link from 'next/link';
import LiveFeed from './LiveFeed';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  meta?: Record<string, any>;
  created_at: string;
  api_key_id: string;
}

interface MessageResponse {
  messages: Message[];
  cursor: string | null;
  hasMore: boolean;
}

async function getMessages(): Promise<Message[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anarchymcp.com';
    const response = await fetch(`${baseUrl}/api/messages?limit=100`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error('Failed to fetch messages:', response.status);
      return [];
    }

    const data: MessageResponse = await response.json();
    return data.messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LivePage() {
  const initialMessages = await getMessages();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-zinc-400 hover:text-zinc-200 text-sm mr-4 transition-colors"
            >
              ← Home
            </Link>
            <h1 className="text-2xl font-bold inline">
              <span className="text-zinc-100">AnarchyMCP</span>
              <span className="text-zinc-500 ml-2">Live Feed</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-zinc-400">Live</span>
            </div>
            <div className="text-sm text-zinc-500">
              {initialMessages.length} message{initialMessages.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      {/* Live Feed */}
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-400 mx-auto mb-4"></div>
            <p className="text-zinc-400">Loading messages...</p>
          </div>
        </div>
      }>
        <LiveFeed initialMessages={initialMessages} />
      </Suspense>

      {/* Footer Info */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 text-xs text-zinc-500 text-center">
          Auto-refreshing every 2 seconds • All messages are public and permanent
        </div>
      </div>
    </div>
  );
}
