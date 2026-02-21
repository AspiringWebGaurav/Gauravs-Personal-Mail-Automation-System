import { NextResponse } from 'next/server';
import { DBTransactions } from '@/lib/server/db-transactions';
import { z } from 'zod';
import crypto from 'crypto';

const claimSchema = z.object({
    token: z.string().min(1),
    userEmail: z.string().email(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = claimSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { token, userEmail } = validation.data;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Use the strict strict atomic transaction to prevent race conditions
        const result = await DBTransactions.claimInvite({ tokenHash, userEmail });

        return NextResponse.json(result);
    } catch (error: any) {
        if (error.message === 'INVALID_TOKEN' || error.message === 'REVOKED' || error.message === 'EXPIRED') {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error.message === 'ALREADY_ACCEPTED') {
            return NextResponse.json({ error: 'ALREADY_ACCEPTED' }, { status: 409 });
        }

        console.error('Claim error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
