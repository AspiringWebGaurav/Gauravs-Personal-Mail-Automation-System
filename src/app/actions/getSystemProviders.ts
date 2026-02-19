'use server';

import { getAllProviders } from '@/lib/server/emailProviderManager';
import { EmailProvider } from '@/types';

// Return a plain object that allows the client to rehydrate it
export async function getSystemProviders(): Promise<any[]> {
    console.log('[getSystemProviders] Fetching system providers...');
    const configs = getAllProviders();
    console.log(`[getSystemProviders] Found ${configs.length} providers from Manager.`);
    const now = new Date();
    const seconds = Math.floor(now.getTime() / 1000);
    const nanoseconds = (now.getTime() % 1000) * 1000000;

    return configs.map(config => ({
        id: `env-${config.id}`,
        name: config.name || `System Provider ${config.id}`,
        serviceId: config.serviceId,
        templateId: config.templateId,
        publicKey: 'HIDDEN',
        privateKey: 'HIDDEN',
        status: 'active',
        dailyQuota: 200,
        priority: config.priority || 10,
        isDefault: true,
        createdBy: 'system',
        // Serialize as simple primitives
        createdAt: { seconds, nanoseconds },
        updatedAt: { seconds, nanoseconds }
    }));
}
