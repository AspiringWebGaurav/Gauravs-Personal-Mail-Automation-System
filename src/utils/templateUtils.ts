/**
 * templateUtils.ts
 * Core UI Abstraction Layer for the Template Engine.
 *
 * This file translates internal variable strings (e.g., 'recipient_name')
 * into human-readable labels (e.g., 'Recipient Name') for the UI, ensuring
 * that end users never interact directly with the underlying variable syntax.
 */

const VARIABLE_MAP: Record<string, string> = {
    'recipient_name': 'Recipient Name',
    'event_title': 'Event Title',
    'event_time': 'Event Time',
    'event_date': 'Event Date',
    'sender_name': 'Your Name',
    'custom_message': 'Your Message',
    'meeting_link': 'Meeting Link',
    'portfolio_url': 'Portfolio URL',
    'company_name': 'Company Name',
    'role_name': 'Role/Position',
    'action_url': 'Action Link',
    'custom_note': 'Custom Note',
};

// Internal keys that we typically expect to auto-resolve from context and not ask the user for manually
// if they are sending within an "Event" context. But for "Quick Send", all must be user-provided.
export const CONTEXT_VARIABLES = ['event_title', 'event_time', 'event_date', 'sender_name'];

/**
 * Returns a human-friendly label for a given internal template variable.
 * Fallback is to title-case the internal key.
 */
export function getVariableUILabel(internalKey: string): string {
    if (VARIABLE_MAP[internalKey]) {
        return VARIABLE_MAP[internalKey];
    }

    // Fallback: convert 'some_custom_var' to 'Some Custom Var'
    return internalKey
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Parses raw template text (subject or body) and extracts all dynamic {{variables}}.
 * Avoids duplicates.
 */
export function extractTemplateVariables(text: string): string[] {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];

    const rawVars = matches.map(m => m.replace(/[{}]/g, '').trim());
    return Array.from(new Set(rawVars));
}
