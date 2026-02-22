import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ message: 'Dev mode only' }, { status: 403 });
    }

    try {
        const port = process.env.PORT || 3000;
        const host = req.headers.get('host') || `localhost:${port}`;
        const protocol = host.includes('localhost') ? 'http' : 'https';

        const response = await fetch(`${protocol}://${host}/api/scheduler/process`, {
            headers: {
                'x-cron-secret': process.env.CRON_SECRET || 'gmss-scheduler-v1-secret-2026'
            }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[DevWorker Proxy] Error:', error);
        return NextResponse.json({ error: 'Internal Worker Error', details: msg }, { status: 500 });
    }
}
