import { NextResponse } from 'next/server';
import { MailRunner } from '@/lib/server/mailRunner';
import { adminDb } from '@/lib/firebase/admin';

// Vercel Cron Job config (optional, run every minute)
export const maxDuration = 60; // Max execution time

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');

        // This validates if it's called by Vercel Cron or a known trigger.
        // Or check a shared secret.
        const providedSecret = req.headers.get('x-cron-secret');
        if (providedSecret !== process.env.CRON_SECRET && !authHeader) {
            return NextResponse.json({ error: 'Unauthorized route.' }, { status: 401 });
        }

        // Global System Stop verification
        const sysStateSnap = await adminDb.collection("systemSettings").doc("globalConfig").get();
        if (sysStateSnap.exists && sysStateSnap.data()?.systemSuspended === true) {
            return NextResponse.json({ message: 'System is currently suspended via STOP SERVICE.' }, { status: 200 });
        }

        // Zero-provider guard: no providers configured → no processing
        const providerSnap = await adminDb.collection('emailProviders').limit(1).get();
        if (providerSnap.empty) {
            return NextResponse.json({ code: 'NO_PROVIDER_CONFIGURED', message: 'No email providers configured. Add a provider to activate mail automation.' }, { status: 200 });
        }

        const result = await MailRunner.processQueue();

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('MailRunner Cron Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
