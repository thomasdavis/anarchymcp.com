import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'MCP endpoint is alive',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    status: 'ok',
    message: 'MCP POST received',
    received: body,
    timestamp: new Date().toISOString(),
  });
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'MCP DELETE received',
    timestamp: new Date().toISOString(),
  });
}
