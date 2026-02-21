/**
 * Pre-built message templates for email reminders.
 * Placeholders: {{eventTitle}}, {{eventTime}}, {{location}}, {{recipientName}}
 */

export interface MessagePreset {
    id: string;
    name: string;
    emoji: string;
    description: string;
    body: string;
}

export const MESSAGE_PRESETS: MessagePreset[] = [
    {
        id: 'professional',
        name: 'Professional',
        emoji: '💼',
        description: 'Formal business tone',
        body: `Dear {{recipientName}},

This is a reminder that "{{eventTitle}}" is scheduled for {{eventTime}}.

Please ensure you are prepared and available at the designated time. If you have any questions or need to reschedule, please reach out at your earliest convenience.

Best regards,
GPMAS Reminder System`,
    },
    {
        id: 'friendly',
        name: 'Friendly',
        emoji: '😊',
        description: 'Casual & warm',
        body: `Hey {{recipientName}}! 👋

Just a friendly heads-up — "{{eventTitle}}" is coming up at {{eventTime}}!

Don't forget to mark your calendar. See you there! 🎉`,
    },
    {
        id: 'urgent',
        name: 'Urgent',
        emoji: '🚨',
        description: 'High-priority alert',
        body: `⚠️ URGENT REMINDER

{{recipientName}}, your event "{{eventTitle}}" is starting at {{eventTime}}.

This is a time-sensitive reminder. Please take immediate action to ensure your attendance.

Do not miss this event.`,
    },
    {
        id: 'brief',
        name: 'Brief',
        emoji: '⚡',
        description: 'Short & direct',
        body: `Reminder: "{{eventTitle}}" at {{eventTime}}. Be there!`,
    },
    {
        id: 'detailed',
        name: 'Detailed',
        emoji: '📋',
        description: 'Full info with location',
        body: `Hello {{recipientName}},

Here are the details for your upcoming event:

📅 Event: {{eventTitle}}
🕐 Time: {{eventTime}}
📍 Location: {{location}}

Please arrive a few minutes early. If you need directions or have any questions, feel free to reach out.

Looking forward to seeing you!
GPMAS Reminder System`,
    },
    {
        id: 'motivational',
        name: 'Motivational',
        emoji: '🌟',
        description: 'Positive & energizing',
        body: `Hey {{recipientName}}! 🌟

Great things await! "{{eventTitle}}" is happening at {{eventTime}}.

This is your moment — show up, shine bright, and make it count! 💪

You've got this! 🚀`,
    },
];

export function resolveMessagePlaceholders(
    body: string,
    data: {
        eventTitle?: string;
        eventTime?: string;
        location?: string;
        recipientName?: string;
    }
): string {
    return body
        .replace(/\{\{eventTitle\}\}/g, data.eventTitle || 'Your Event')
        .replace(/\{\{eventTime\}\}/g, data.eventTime || 'TBD')
        .replace(/\{\{location\}\}/g, data.location || 'TBD')
        .replace(/\{\{recipientName\}\}/g, data.recipientName || 'there');
}
