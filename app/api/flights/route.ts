import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_CIP_FLIGHT_SEARCH_BASE_URL ||
      process.env.CIP_FLIGHT_SEARCH_BASE_URL ||
      'http://185.140.242.45';

    // Keep original query params
    const search = req.nextUrl.search || '';
    const target = `${baseUrl}/api/flights${search}`;

    const res = await fetch(target, {
      method: 'GET',
      // Pass-through minimal headers
      headers: {
        Accept: 'application/json',
        ...(process.env.CIP_TOKEN ? { Authorization: `Bearer ${process.env.CIP_TOKEN}` } : {}),
      },
      // Ensure server-side fetch
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Proxy error' }, { status: 500 });
  }
}


