import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const base =
      process.env.NEXT_PUBLIC_CIP_FLIGHT_SEARCH_BASE_URL ||
      process.env.CIP_FLIGHT_SEARCH_BASE_URL ||
      'http://185.140.242.45';

    const target = `${base}/api/order/passenger/create`;

    const contentType = req.headers.get('content-type') || '';
    let body: string;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      body = await req.text();
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const params = new URLSearchParams();
      for (const [k, v] of form.entries()) {
        if (typeof v === 'string') params.append(k, v);
      }
      body = params.toString();
    } else {
      try {
        const json = await req.json();
        const params = new URLSearchParams();
        Object.entries(json).forEach(([k, v]) => {
          if (v !== undefined && v !== null) params.append(k, String(v));
        });
        body = params.toString();
      } catch {
        body = await req.text();
      }
    }

    const token = process.env.CIP_TOKEN;

    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: 'no-store',
    });

    const text = await res.text();
    // Try to normalize to { status, message, data: { passenger_id } }
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const status = (json.status as boolean | undefined) ?? (json.success as boolean | undefined) ?? res.ok;
      const message = (json.message as string | undefined) || (json.error as string | undefined) || '';
      const dataObj = (json.data && typeof json.data === 'object') ? (json.data as Record<string, unknown>) : undefined;
      const passengerId = (dataObj?.passenger_id ?? json.id ?? json.passenger_id) as string | number | undefined;
      const normalized = {
        status: Boolean(status),
        message,
        data: passengerId !== undefined ? { passenger_id: passengerId } : undefined,
      };
      return NextResponse.json(normalized, { status: res.status });
    } catch {
      // If upstream wasn't JSON, pass-through
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
      });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Proxy error' }, { status: 500 });
  }
}


