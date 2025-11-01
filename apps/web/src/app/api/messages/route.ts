import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, supabasePublic } from '@/lib/supabase';
import { globalRateLimit, apiKeyRateLimit } from '@/lib/rate-limit';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1).max(16384), // 16KB limit
  meta: z.record(z.any()).optional(),
});

// GET /api/messages - Public read access
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor'); // created_at timestamp

    let query = supabasePublic
      .from('messages')
      .select('id, role, content, meta, created_at, api_key_id')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Search functionality
    if (search) {
      query = query.textSearch('content', search);
    }

    const { data, error } = await query as {
      data: Array<{
        id: string;
        role: string;
        content: string;
        meta: any;
        created_at: string;
        api_key_id: string;
      }> | null;
      error: any;
    };

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        messages: [],
        cursor: null,
        hasMore: false,
      });
    }

    // Get next cursor
    const nextCursor = data.length === limit ? data[data.length - 1]?.created_at : null;

    return NextResponse.json({
      messages: data,
      cursor: nextCursor,
      hasMore: data.length === limit,
    });
  } catch (error) {
    console.error('Unexpected error in GET /messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/messages - Requires API key
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing x-api-key header' },
        { status: 401 }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('amcp_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      );
    }

    // Verify API key exists and is active
    const { data: apiKeyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, active, email')
      .eq('key', apiKey)
      .single() as {
        data: { id: string; active: boolean; email: string } | null;
        error: any;
      };

    if (keyError || !apiKeyData) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (!apiKeyData.active) {
      return NextResponse.json(
        { error: 'API key is inactive' },
        { status: 403 }
      );
    }

    // Apply rate limits
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const globalLimit = globalRateLimit(ip);
    const keyLimit = apiKeyRateLimit(apiKey);

    const rateLimitResult = globalLimit.success ? keyLimit : globalLimit;

    const headers = {
      'X-RateLimit-Limit': '1000',
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      'Content-Type': 'application/json',
    };

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': rateLimitResult.retryAfter!.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = messageSchema.parse(body);

    // Insert message
    // @ts-ignore - Supabase type inference issue
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        api_key_id: apiKeyData.id,
        role: validatedData.role,
        content: validatedData.content,
        meta: validatedData.meta || {},
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500, headers }
      );
    }

    return NextResponse.json(
      {
        id: data.id,
        created_at: data.created_at,
      },
      { status: 201, headers }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Unexpected error in POST /messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
