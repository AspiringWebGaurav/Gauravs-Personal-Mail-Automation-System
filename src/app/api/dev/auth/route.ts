import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

const ALLOWED_EMAIL = 'gauravpatil9262@gmail.com';

export async function POST() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Only allowed in development' }, { status: 403 });
    }

    try {
        const customToken = await adminAuth.createCustomToken(ALLOWED_EMAIL);
        return NextResponse.json({ token: customToken });
    } catch (error) {
        console.error('Error creating custom token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
