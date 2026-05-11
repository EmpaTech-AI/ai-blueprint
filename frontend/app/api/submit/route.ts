import { NextRequest, NextResponse } from 'next/server';

// This route proxies the form submission to the backend
// It exists to allow the frontend to POST without CORS issues during development
export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:3001';

  try {
    const formData = await request.formData();
    const response = await fetch(`${apiUrl}/api/intake`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Proxy error' },
      { status: 500 }
    );
  }
}
