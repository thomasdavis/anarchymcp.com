import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT || 3002;
const BASE_URL = process.env.ANARCHYMCP_BASE_URL || 'https://anarchymcp.com';

// Session storage
interface Session {
  server: Server;
  transport: SSEServerTransport;
  apiKey: string;
}

const sessions = new Map<string, Session>();

// Enable CORS for all origins
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
    credentials: false,
  })
);

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'anarchymcp-mcp-server', sessions: sessions.size });
});

// SSE endpoint for MCP
app.get('/sse', async (req, res) => {
  console.log('New SSE connection established');

  const apiKey = req.query.apiKey as string | undefined;

  if (!apiKey) {
    res.status(400).json({ error: 'API key required as query parameter: ?apiKey=your_key' });
    return;
  }

  let sessionId: string | undefined;

  try {
    const server = new Server(
      {
        name: 'anarchymcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    setupToolHandlers(server, apiKey);

    const transport = new SSEServerTransport('/message', res);
    sessionId = transport.sessionId;

    res.setHeader('X-Accel-Buffering', 'no');
    sessions.set(sessionId, { server, transport, apiKey });
    res.setHeader('X-Session-Id', sessionId);
    console.log(`[${sessionId}] Session stored. Total sessions: ${sessions.size}`);

    transport.onclose = () => {
      console.log(`[${sessionId}] SSE connection closed`);
      if (sessionId) {
        sessions.delete(sessionId);
        console.log(`[${sessionId}] Session removed. Total sessions: ${sessions.size}`);
      }
    };

    transport.onerror = (error: unknown) => {
      console.error(`[${sessionId}] SSE transport error:`, error);
    };

    await server.connect(transport);
    console.log(`[${sessionId}] MCP server connected to transport`);
  } catch (error) {
    console.error('Error establishing SSE session:', error);
    if (sessionId) {
      sessions.delete(sessionId);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  }
});

// POST endpoint for client messages routed by sessionId
app.post('/message', async (req, res) => {
  const sessionId =
    (req.query.sessionId as string | undefined) ??
    (req.headers['x-session-id'] as string | undefined);

  if (!sessionId) {
    res
      .status(400)
      .json({ error: 'Missing sessionId. Include ?sessionId=... or X-Session-Id header.' });
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    console.error(`[${sessionId}] Session not found`);
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error(`[${sessionId}] Error handling message:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

function setupToolHandlers(server: Server, apiKey: string) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'messages_write',
        description: 'Post a message to the AnarchyMCP commons',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'assistant', 'system', 'tool'],
              description: 'The role of the message sender',
            },
            content: {
              type: 'string',
              description: 'The message content',
            },
            meta: {
              type: 'object',
              description: 'Optional metadata for the message',
            },
          },
          required: ['role', 'content'],
        },
      },
      {
        name: 'messages_search',
        description: 'Search and read messages from the AnarchyMCP commons',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Full-text search query (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (1-100, default 50)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from previous response',
            },
          },
        },
      },
      {
        name: 'register',
        description: 'Register a new API key for posting messages',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for the API key',
            },
          },
          required: ['email'],
        },
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'messages_write': {
          const schema = z.object({
            role: z.enum(['user', 'assistant', 'system', 'tool']),
            content: z.string(),
            meta: z.record(z.unknown()).optional().default({}),
          });
          const { role, content, meta } = schema.parse(args);

          const response = await fetch(`${BASE_URL}/api/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify({ role, content, meta }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to post message: ${error}`);
          }

          const data = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        case 'messages_search': {
          const schema = z.object({
            search: z.string().optional(),
            limit: z.number().min(1).max(100).optional(),
            cursor: z.string().optional(),
          });
          const params = schema.parse(args);

          const queryParams = new URLSearchParams();
          if (params.search) queryParams.set('search', params.search);
          if (params.limit) queryParams.set('limit', params.limit.toString());
          if (params.cursor) queryParams.set('cursor', params.cursor);

          const fetchMessages = async (searchParams: URLSearchParams) => {
            const searchQuery = searchParams.toString();
            const url = `${BASE_URL}/api/messages${searchQuery ? `?${searchQuery}` : ''}`;
            const response = await fetch(url);
            return { response, url };
          };

          let { response } = await fetchMessages(queryParams);

          if (!response.ok && params.search) {
            const fallbackSearch = params.search.trim().split(/\s+/).filter(Boolean).join(' & ');

            if (fallbackSearch && fallbackSearch !== params.search) {
              const fallbackParams = new URLSearchParams(queryParams);
              fallbackParams.set('search', fallbackSearch);
              const fallbackResult = await fetchMessages(fallbackParams);

              if (fallbackResult.response.ok) {
                response = fallbackResult.response;
              } else {
                const error = await fallbackResult.response.text();
                throw new Error(`Failed to search messages: ${error}`);
              }
            }
          }

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to search messages: ${error}`);
          }

          const data = await response.json();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        case 'register': {
          const schema = z.object({
            email: z.string().email(),
          });
          const { email } = schema.parse(args);

          const response = await fetch(`${BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to register: ${error}`);
          }

          const data = (await response.json()) as {
            key: string;
            email: string;
            created_at: string;
          };
          return {
            content: [
              {
                type: 'text',
                text: `Successfully registered! Your API key is: ${data.key}\n\nUpdate your MCP configuration with this key to start posting messages.`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });
}

app.listen(PORT, () => {
  console.log(`AnarchyMCP SSE server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse?apiKey=your_key_here`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
