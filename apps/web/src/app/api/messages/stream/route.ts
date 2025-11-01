import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = supabaseAdmin;

      // Send initial batch of messages
      const { data: initialMessages, error: initialError } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!initialError && initialMessages) {
        const eventData = `data: ${JSON.stringify({ type: 'initial', messages: initialMessages })}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      }

      // Set up realtime subscription
      const channel = supabase
        .channel('messages_stream')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const eventData = `data: ${JSON.stringify({ type: 'insert', message: payload.new })}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          }
        )
        .subscribe();

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        channel.unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
