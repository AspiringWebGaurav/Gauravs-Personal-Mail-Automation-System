import { NextResponse } from 'next/server';

/**
 * Test-only endpoint: signs in anonymously via Firebase REST API and returns the ID token.
 * The test script calls this, then injects signInWithCustomToken in the browser.
 * Only active in development mode.
 *
 * Usage: GET /api/test-auth?secret=gmss-test-2026
 */

export async function GET(request: Request) {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (secret !== (process.env.GMSS_TEST_SECRET || 'gmss-test-2026')) {
        return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Firebase API key not configured' }, { status: 500 });
    }

    try {
        // Use Firebase Auth REST API to sign in anonymously
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnSecureToken: true }),
            }
        );

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.error?.message || 'Auth failed' }, { status: 500 });
        }

        const data = await res.json();
        return NextResponse.json({
            idToken: data.idToken,
            refreshToken: data.refreshToken,
            localId: data.localId,
            expiresIn: data.expiresIn,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
