import 'server-only';
import { logger } from '@/lib/logger';

export interface EmailProviderConfig {
    id: string; // "1", "2", "custom"
    name: string;
    serviceId: string;
    templateId: string;
    publicKey: string;
    privateKey: string;
    priority?: number;
}

/**
 * Dynamically loads all EmailJS providers configured in environment variables.
 * Naming Convention: EMAILJS_PROVIDER_{N}_SERVICE_ID, etc.
 */
export function getAllProviders(): EmailProviderConfig[] {
    const providers: EmailProviderConfig[] = [];
    const env = process.env;

    // 1. Scan for numbered providers (Priority)
    for (let i = 1; i <= 20; i++) {
        const serviceId = env[`EMAILJS_PROVIDER_${i}_SERVICE_ID`];
        const templateId = env[`EMAILJS_PROVIDER_${i}_TEMPLATE_ID`];
        const publicKey = env[`EMAILJS_PROVIDER_${i}_PUBLIC_KEY`];
        const privateKey = env[`EMAILJS_PROVIDER_${i}_PRIVATE_KEY`];
        const name = env[`EMAILJS_PROVIDER_${i}_NAME`] || `Provider ${i}`;

        if (serviceId && templateId && publicKey && privateKey) {
            providers.push({
                id: String(i),
                name,
                serviceId,
                templateId,
                publicKey,
                privateKey,
                priority: 10
            });
        }
    }

    // 2. Fallback to Legacy (Only if no numbered providers found)
    if (providers.length === 0) {
        console.log('[EmailProviderManager] No numbered providers found. Checking legacy...');

        // Check for standard EmailJS vars
        const legacyServiceId = env.EMAILJS_SERVICE_ID || 'service_37etxg6'; // Default from original code
        const legacyTemplateId = env.EMAILJS_TEMPLATE_ID || 'template_lh3q0q9';
        const legacyPublicKey = env.EMAILJS_PUBLIC_KEY || 'xwi6F0t3bw9NkVJHp';
        const legacyPrivateKey = env.EMAILJS_PRIVATE_KEY; // Might be undefined, but we'll allow it for now if that's how it was

        // Logic check: The original code had these defaults. 
        // We act if at least ServiceID and TemplateID are present (or defaulted).
        if (legacyServiceId && legacyTemplateId) {
            providers.push({
                id: 'legacy',
                name: 'Legacy Default',
                serviceId: legacyServiceId,
                templateId: legacyTemplateId,
                publicKey: legacyPublicKey,
                privateKey: legacyPrivateKey || '', // specific handle for missing private key
                priority: 0
            });
            console.log('[EmailProviderManager] Legacy provider added.');
        }
    } else {
        console.log(`[EmailProviderManager] Found ${providers.length} numbered system providers.`);
    }

    return providers;
}

/**
 * Returns a randomized list of providers for load balancing.
 * If config.strategy is 'sequential', returns in order.
 */
export function getActiveProviders(strategy: 'random' | 'sequential' = 'random'): EmailProviderConfig[] {
    const providers = getAllProviders();

    if (providers.length === 0) {
        logger.warn('No EmailJS providers configured in environment variables');
        return [];
    }

    if (strategy === 'random') {
        // Fisher-Yates Shuffle for true randomness
        for (let i = providers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [providers[i], providers[j]] = [providers[j], providers[i]];
        }
    }

    return providers;
}

/**
 * Safe version of providers for Client-Side consumption (No Private Keys)
 */
export function getPublicProviderConfigs() {
    return getAllProviders().map(p => ({
        id: p.id,
        name: p.name,
        serviceId: p.serviceId,
        publicKey: p.publicKey,
        // formatted for UI
        status: 'active'
    }));
}
