import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const base =
      process.env.NEXT_PUBLIC_CIP_FLIGHT_SEARCH_BASE_URL ||
      process.env.CIP_FLIGHT_SEARCH_BASE_URL ||
      'http://185.140.242.45';

    const target = `${base}/api/order/create`;

    // Read body as form data or text (supports URLSearchParams)
    const contentType = req.headers.get('content-type') || '';
    let body: string | null = null;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      body = text;
    } else if (contentType.includes('multipart/form-data')) {
      // If ever sent as multipart, convert to urlencoded expected by target
      const form = await req.formData();
      const params = new URLSearchParams();
      for (const [key, value] of form.entries()) {
        if (typeof value === 'string') {
          params.append(key, value);
        }
      }
      body = params.toString();
    } else {
      // Fallback: try to parse JSON and convert to urlencoded
      try {
        const json = await req.json();
        const params = new URLSearchParams();
        Object.entries(json).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.append(k, String(v));
        });
        body = params.toString();
      } catch {
        const text = await req.text();
        body = text;
      }
    }

    const token = process.env.CIP_TOKEN;

    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
        // Some backends (Laravel) check for AJAX header and may skip CSRF for API
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Do NOT forward Origin/Referer to avoid 419 strict-origin CSRF checks
      },
      body,
      // Ensure server-side fetch, no browser CORS/CSRF involved
      cache: 'no-store',
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('Error proxying order create:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}


