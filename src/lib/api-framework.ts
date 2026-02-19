import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { BurnEngine } from '@/lib/burn-engine';

export type ApiError = {
    code: string;
    message: string;
    status: number;
    details?: unknown;
};

export type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: ApiError;
    traceId: string;
};

export class AppError extends Error {
    public readonly code: string;
    public readonly status: number;
    public readonly details?: unknown;

    constructor(code: string, message: string, status: number = 500, details?: unknown) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export async function apiWrapper<T>(
    handler: () => Promise<T>
): Promise<NextResponse<ApiResponse<T>>> {
    const traceId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const start = Date.now();

    try {
        const result = await handler();
        // Track API Call Cost (Base Read)
        // We track 'READ_DOC' as a baseline for very API call overhead (auth check etc.)
        const trackPromise = BurnEngine.track('system', 'READ_DOC');

        // Failsafe Circuit Breaker: Check if we are in CRITICAL state
        // We perform this check asynchronously to not block the request flow, 
        // but we await it briefly to inject the header if possible.
        const burnStatus = await BurnEngine.checkFreeTierStatus('system');

        trackPromise.catch(e => logger.warn('Burn track failed', { error: e }));

        return NextResponse.json({
            success: true,
            data: result,
            traceId,
        }, {
            headers: {
                'X-Burn-Trace': traceId,
                'X-Burn-Status': burnStatus
            }
        });
    } catch (err) {
        logger.error(`API Error`, { traceId, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });

        let status = 500;
        let code = 'INTERNAL_ERROR';
        let message = 'Internal Server Error';
        let details: unknown = undefined;

        if (err instanceof AppError) {
            status = err.status;
            code = err.code;
            message = err.message;
            details = err.details;
        } else if (err instanceof z.ZodError) {
            status = 400;
            code = 'VALIDATION_ERROR';
            message = 'Invalid input data';
            details = err.format();
        } else if (err instanceof Error) {
            message = err.message;
        }

        return NextResponse.json(
            {
                success: false,
                error: { code, message, status, details },
                traceId,
            },
            { status }
        );
    }
}
