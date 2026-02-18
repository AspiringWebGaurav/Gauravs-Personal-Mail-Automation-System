import type { EmailTemplate } from '../../types';
import { Timestamp } from 'firebase-admin/firestore';

// Helper to create system template
const createSysTemplate = (
    id: string,
    name: string,
    subjectFormat: string,
    messageBody: string,
    layoutType: EmailTemplate['layoutType'],
    category: string,
    tags: string[]
): EmailTemplate & { category: string; tags: string[] } => ({
    id: `sys_template_${id}`,
    name,
    subjectFormat,
    messageBody,
    layoutType,
    category,
    tags,
    createdBy: 'system',
    createdAt: Timestamp.now(),
});

export const systemTemplates = [
    // ── Professional ────────────────────────────────────────────────
    createSysTemplate(
        'prof_reminder',
        'Professional Reminder',
        'Reminder: {{eventTitle}} at {{eventTime}}',
        'Dear {{recipientName}},\n\nThis is a formal reminder for your upcoming event "{{eventTitle}}".\n\nDate: {{eventTime}}\nLocation: {{location}}\n\nPlease ensure you are prepared. We look forward to your attendance.\n\nBest regards,\nAutomated System',
        'card',
        'Professional',
        ['business', 'formal']
    ),
    createSysTemplate(
        'prof_meeting',
        'Meeting Agenda',
        'Meeting: {{eventTitle}}',
        'Hi {{recipientName}},\n\nHere is the agenda for our meeting "{{eventTitle}}".\n\nWhen: {{eventTime}}\nWhere: {{location}}\n\nPlease review any attached materials beforehand.\n\nSee you there.',
        'minimal',
        'Professional',
        ['meeting', 'work']
    ),
    createSysTemplate(
        'prof_followup',
        'Post-Event Follow Up',
        'Follow up: {{eventTitle}}',
        'Hello {{recipientName}},\n\nThank you for attending "{{eventTitle}}". We hope you found it valuable.\n\nWe would appreciate any feedback you may have.\n\nRegards,',
        'elegant',
        'Professional',
        ['followup', 'feedback']
    ),

    // ── Casual ──────────────────────────────────────────────────────
    createSysTemplate(
        'casual_hangout',
        'Casual Hangout',
        'Don\'t forget: {{eventTitle}}! 🎉',
        'Hey {{recipientName}}!\n\nCan\'t wait to see you at "{{eventTitle}}".\n\nIt\'s happening at {{eventTime}}.\nLocation: {{location}}\n\nSee ya!',
        'banner',
        'Casual',
        ['fun', 'friends']
    ),
    createSysTemplate(
        'casual_coffee',
        'Coffee Chat',
        'Coffee time: {{eventTitle}} ☕',
        'Hi {{recipientName}},\n\nLooking forward to grabbing coffee for "{{eventTitle}}".\n\nI\'ll be at {{location}} around {{eventTime}}.\n\nCheers!',
        'minimal',
        'Casual',
        ['coffee', 'social']
    ),

    // ── Urgent ──────────────────────────────────────────────────────
    createSysTemplate(
        'urgent_alert',
        'URGENT: {{eventTitle}} Starting Soon',
        '🔴 URGENT: {{eventTitle}}',
        'Attention {{recipientName}},\n\nThis is an urgent reminder that "{{eventTitle}}" is starting very soon at {{eventTime}}.\n\nPlease join immediately at {{location}}.',
        'card',
        'Urgent',
        ['alert', 'important']
    ),
    createSysTemplate(
        'urgent_changes',
        'Important Changes to {{eventTitle}}',
        '⚠️ Update: {{eventTitle}}',
        'Hi {{recipientName}},\n\nThere has been a change regarding "{{eventTitle}}".\n\nPlease note the new details:\nTime: {{eventTime}}\nLocation: {{location}}\n\nThanks for your flexibility.',
        'banner',
        'Urgent',
        ['update', 'change']
    ),

    // ── Holidays & Special ──────────────────────────────────────────
    createSysTemplate(
        'holiday_party',
        'Holiday Party Invitation 🎄',
        'You\'re invited! {{eventTitle}}',
        'Happy Holidays {{recipientName}}!\n\nJoin us for "{{eventTitle}}" to celebrate the season.\n\nWhen: {{eventTime}}\nWhere: {{location}}\n\nBring your festive spirit! ✨',
        'elegant',
        'Holiday',
        ['party', 'celebration']
    ),
    createSysTemplate(
        'birthday_bash',
        'Birthday Bash 🎂',
        'It\'s Party Time: {{eventTitle}}',
        'Hey {{recipientName}}!\n\nCome celebrate at "{{eventTitle}}".\n\nThere will be cake!\n\nSee you at {{eventTime}} @ {{location}}.',
        'banner',
        'Holiday',
        ['birthday', 'fun']
    ),
];
