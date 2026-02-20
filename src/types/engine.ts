export interface EmailProvider {
    id: string;
    name: string;
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    monthlyQuota: number;
    priority: number;
    status: 'active' | 'disabled';
    fromName?: string;
    createdBy: string;
}

export interface ProviderHealth {
    providerId: string;
    successCount: number;
    failureCount: number;
    lastFailureAt: number | null;
    status: 'healthy' | 'degraded' | 'suspended';
    updatedAt: number;
}

export interface SendEmailParams {
    toEmail: string;
    toName?: string;
    subject?: string;
    message?: string;
    templateParams?: Record<string, unknown>;
    eventReference?: {
        id: string;
        name: string;
    }
}

export interface SentLog {
    id?: string;
    status: 'success' | 'failed' | 'switched' | 'retried' | 'blocked';
    mode: 'sandbox' | 'live';
    providerId?: string; // The provider that attempted/succeeded the send
    providerName?: string;
    recipient: {
        email: string;
        name?: string;
    };
    eventReference?: {
        id: string;
        name: string;
    };
    dispatchLatencyMs?: number;
    errorPayload?: string;
    timestamp: number;
}
