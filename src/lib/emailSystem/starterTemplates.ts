import { EmailTemplate } from '@/types';
import { Timestamp } from 'firebase/firestore';

/**
 * Immutable production-ready system templates for Gaurav's Personal Mail Automation System.
 * These act as the default baseline and can be used immediately across the app.
 * All dynamic data injection relies on {{variables}}, which are mapped to UI labels
 * via \`src/utils/templateUtils.ts\`
 */

const baseTimestamp = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp;

export const starterTemplates: EmailTemplate[] = [
    {
        id: 'sys-recruiter-followup',
        name: 'Recruiter Follow-up',
        subjectFormat: 'Following up regarding {{role_name}} at {{company_name}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'role_name', 'company_name', 'custom_message'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Career',
        messageBody: `Hi {{recipient_name}},

Thank you for your time earlier. I am writing to follow up on the {{role_name}} position at {{company_name}}.

{{custom_message}}

I am very interested in the opportunity and believe my background in high-performance automation aligns well with your team's objectives. Please let me know if there's any additional information I can provide.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-portfolio-share',
        name: 'Portfolio Share',
        subjectFormat: 'Gaurav Patil - Portfolio & Recent Work',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'custom_note', 'portfolio_url'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Networking',
        messageBody: `Hello {{recipient_name}},

{{custom_note}}

As requested, I am sharing a link to my engineering portfolio where you can review my recent projects, including my work on highly specialized automation systems and scalable architectures.

View Portfolio: <a href="{{portfolio_url}}" style="color: #6c5ce7; font-weight: 500;">{{portfolio_url}}</a>

I look forward to discussing this in more detail.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-meeting-reminder',
        name: 'Meeting Reminder',
        subjectFormat: 'Reminder: Upcoming sync regarding {{event_title}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'event_title', 'event_time', 'meeting_link'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Scheduling',
        messageBody: `Hi {{recipient_name}},

This is a professional reminder for our upcoming meeting regarding **{{event_title}}**.

We are scheduled to sync at **{{event_time}}**.

You can join the meeting using the link below:
<a href="{{meeting_link}}" style="color: #6c5ce7; font-weight: 500;">{{meeting_link}}</a>

Looking forward to our conversation.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-availability-conf',
        name: 'Availability Confirmation',
        subjectFormat: 'Availability Confirmed: {{event_title}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'event_title', 'event_date', 'custom_message'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Scheduling',
        messageBody: `Hi {{recipient_name}},

I am writing to confirm my availability for **{{event_title}}** on **{{event_date}}**.

{{custom_message}}

Please let me know if you need anything else from my end prior to our connection.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-intro-mail',
        name: 'Introduction Mail',
        subjectFormat: 'Introduction - Gaurav Patil',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'company_name', 'custom_message'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Networking',
        messageBody: `Hello {{recipient_name}},

I'm Gaurav Patil. I've been following the work you are doing at {{company_name}} and wanted to reach out.

{{custom_message}}

I focus heavily on building automated, high-performance web systems and would love to connect and share insights.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-project-showcase',
        name: 'Project Showcase',
        subjectFormat: 'Recent Project Deployment: {{event_title}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'event_title', 'custom_note', 'action_url'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Career',
        messageBody: `Hi {{recipient_name}},

I recently completed a major deployment for **{{event_title}}** and wanted to share the results with you.

{{custom_note}}

You can view the live project or detailed breakdown here:
<a href="{{action_url}}" style="color: #6c5ce7; font-weight: 500;">{{action_url}}</a>

I'd appreciate any feedback you might have.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-event-invite',
        name: 'Event / Hub Invite',
        subjectFormat: 'Invitation: {{event_title}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'event_title', 'event_time', 'action_url'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Scheduling',
        messageBody: `Hi {{recipient_name}},

You are formally invited to **{{event_title}}**.

The event is scheduled for **{{event_time}}**.

Please confirm your attendance or access the event hub utilizing the secure link below:
<a href="{{action_url}}" style="display: inline-block; padding: 10px 20px; background-color: #6c5ce7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 10px;">Access Event Hub</a>

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-casual-followup',
        name: 'Casual Follow-up',
        subjectFormat: 'Checking in regarding {{event_title}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'event_title', 'custom_message'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Networking',
        messageBody: `Hi {{recipient_name}},

I hope you're having a great week. I just wanted to touch base regarding **{{event_title}}**.

{{custom_message}}

Let me know your thoughts whenever you have a moment.

Best,
Gaurav`
    },
    {
        id: 'sys-professional-reminder',
        name: 'Professional Reminder',
        subjectFormat: 'Action Required: {{event_title}}',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'event_title', 'custom_note', 'action_url'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Administrative',
        messageBody: `Dear {{recipient_name}},

This is a courtesy reminder regarding **{{event_title}}**.

{{custom_note}}

If action is required, please proceed via the following secure link:
<a href="{{action_url}}" style="color: #6c5ce7; font-weight: 500;">{{action_url}}</a>

Thank you for your prompt attention to this matter.

Best regards,
Gaurav Patil`
    },
    {
        id: 'sys-quick-connect',
        name: 'Quick Connect Mail',
        subjectFormat: 'Opportunity to Connect - Gaurav Patil',
        layoutType: 'dynamic',
        variables: ['recipient_name', 'company_name', 'meeting_link'],
        isSystem: true,
        createdBy: 'system',
        createdAt: baseTimestamp,
        category: 'Networking',
        messageBody: `Hello {{recipient_name}},

I am reaching out to see if you might be open to a brief chat. I admire the trajectory of {{company_name}} and would value the opportunity to introduce myself and learn more about your team.

If you are open to it, you can select a time that works best for you here:
<a href="{{meeting_link}}" style="color: #6c5ce7; font-weight: 500;">Schedule a Sync</a>

Thank you for your time.

Best regards,
Gaurav Patil`
    }
];

// Fallback template used precisely when no template is selected but a send is explicitly triggered
export const systemDefaultTemplate: EmailTemplate = {
    id: 'sys-fallback-default',
    name: 'GPMAS Default Standard',
    subjectFormat: 'Update regarding {{event_title}}',
    layoutType: 'dynamic',
    variables: ['recipient_name', 'event_title', 'custom_message'],
    isSystem: true,
    createdBy: 'system',
    createdAt: baseTimestamp,
    category: 'System',
    messageBody: `Hello {{recipient_name}},

This is an automated communication regarding **{{event_title}}**.

{{custom_message}}

Best regards,
Gaurav's Personal Mail Automation System`
};
