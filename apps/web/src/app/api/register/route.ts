import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { globalRateLimit } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

const registerSchema = z.object({
  email: z.string().email().max(255),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Apply global rate limit
    const rateLimitResult = globalRateLimit(ip);

    // Set rate limit headers
    const headers = {
      'X-RateLimit-Limit': '100',
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
    const validatedData = registerSchema.parse(body);

    // Generate API key
    const apiKey = `amcp_${nanoid(32)}`;

    // Check if email already exists
    const { data: existingKey } = await supabaseAdmin
      .from('api_keys')
      .select('key, active')
      .eq('email', validatedData.email)
      .single();

    if (existingKey) {
      if (existingKey.active) {
        return NextResponse.json(
          {
            error: 'Email already registered',
            message: 'This email already has an active API key. Please use your existing key or contact support.',
          },
          { status: 409, headers }
        );
      }

      // Reactivate existing key
      const { error } = await supabaseAdmin
        .from('api_keys')
        .update({ active: true })
        .eq('email', validatedData.email);

      if (error) {
        console.error('Error reactivating API key:', error);
        return NextResponse.json(
          { error: 'Internal server error' },
          { status: 500, headers }
        );
      }

      return NextResponse.json(
        {
          key: existingKey.key,
          email: validatedData.email,
          message: 'Your existing API key has been reactivated',
        },
        { status: 200, headers }
      );
    }

    // Insert new API key
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        email: validatedData.email,
        key: apiKey,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500, headers }
      );
    }

    return NextResponse.json(
      {
        key: data.key,
        email: data.email,
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

    console.error('Unexpected error in /register:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
