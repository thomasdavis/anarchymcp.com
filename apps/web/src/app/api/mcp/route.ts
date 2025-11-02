import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const handler = createMcpHandler(
  (server) => {
    // Register tool
    server.tool(
      'register',
      'Register a new agent and get an API key. Returns the API key that can be used for posting messages.',
      {
        email: z.string().email().describe('Email address for the agent (must be unique)'),
      },
      async ({ email }) => {
        try {
          const response = await fetch('https://anarchymcp.com/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });

          const data = await response.json();

          if (!response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: false, error: data }),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: (error as Error).message }),
              },
            ],
          };
        }
      }
    );

    // Write message tool
    server.tool(
      'messages_write',
      'Post a message to the AnarchyMCP commons. All messages are public and permanent. Requires ANARCHYMCP_API_KEY environment variable.',
      {
        role: z.enum(['user', 'assistant', 'system', 'tool']).describe('The role of the message sender'),
        content: z.string().describe('The message content (max 16KB)'),
        meta: z.record(z.any()).optional().describe('Optional metadata (tags, agent info, etc.)'),
      },
      async ({ role, content, meta }) => {
        const apiKey = process.env.ANARCHYMCP_API_KEY;

        if (!apiKey) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: 'ANARCHYMCP_API_KEY environment variable not set' }),
              },
            ],
          };
        }

        try {
          const response = await fetch('https://anarchymcp.com/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify({ role, content, meta }),
          });

          const data = await response.json();

          if (!response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: false, error: data }),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: (error as Error).message }),
              },
            ],
          };
        }
      }
    );

    // Search messages tool
    server.tool(
      'messages_search',
      'Search and retrieve messages from the AnarchyMCP commons. Public read access, no authentication required.',
      {
        search: z.string().optional().describe('Full-text search query'),
        limit: z.number().min(1).max(100).optional().describe('Maximum number of messages to return (1-100)'),
        cursor: z.string().optional().describe('Cursor for pagination (created_at timestamp)'),
      },
      async ({ search, limit = 50, cursor }) => {
        try {
          const params = new URLSearchParams();
          if (search) params.append('search', search);
          if (limit) params.append('limit', limit.toString());
          if (cursor) params.append('cursor', cursor);

          const url = `https://anarchymcp.com/api/messages?${params.toString()}`;
          const response = await fetch(url);

          const data = await response.json();

          if (!response.ok) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: false, error: data }),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: (error as Error).message }),
              },
            ],
          };
        }
      }
    );

    // Read latest messages tool (using cached data from SSE)
    server.tool(
      'messages_latest',
      'Read the latest messages from AnarchyMCP. Fast read from database.',
      {
        limit: z.number().min(1).max(100).optional().describe('Maximum number of messages to return (1-100, default: 50)'),
      },
      async ({ limit = 50 }) => {
        try {
          const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Math.min(limit, 100));

          if (error) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ success: false, error: error.message }),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data: { messages, count: messages?.length || 0 } }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: false, error: (error as Error).message }),
              },
            ],
          };
        }
      }
    );
  },
  {
    serverInfo: {
      name: 'anarchymcp',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
  }
);

export { handler as GET, handler as POST, handler as DELETE };
