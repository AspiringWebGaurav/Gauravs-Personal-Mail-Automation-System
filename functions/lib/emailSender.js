"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const https_1 = __importDefault(require("https"));
const SEND_TIMEOUT_MS = 15000; // 15s timeout for EmailJS API call
async function sendEmail(provider, params) {
    // Validate required params
    if (!params.to_email) {
        throw new Error("Missing recipient email (to_email)");
    }
    if (!provider.serviceId || !provider.publicKey) {
        throw new Error("Invalid provider config: missing serviceId or publicKey");
    }
    const messageContent = params.htmlContent
        || `Your event "${params.event_title}" is coming up! Event ID: ${params.event_id}`;
    const emailSubject = params.subject || `Reminder: ${params.event_title}`;
    const emailTitle = params.customTitle || emailSubject;
    const payload = JSON.stringify({
        service_id: provider.serviceId,
        template_id: provider.templateId,
        user_id: provider.publicKey,
        accessToken: provider.privateKey,
        template_params: {
            to_email: params.to_email,
            from_name: params.from_name || "GMSS Reminder System",
            reply_to: params.reply_to_email || "no-reply@gmss.app",
            subject: emailSubject,
            title: emailTitle,
            name: params.from_name || "GMSS Reminder System",
            time: params.scheduled_time,
            message: messageContent,
            email: params.to_email,
        },
    });
    return new Promise((resolve, reject) => {
        // Timeout protection — reject if no response within SEND_TIMEOUT_MS
        const timeout = setTimeout(() => {
            req.destroy();
            reject(new Error(`EmailJS request timed out after ${SEND_TIMEOUT_MS}ms`));
        }, SEND_TIMEOUT_MS);
        const options = {
            hostname: "api.emailjs.com",
            port: 443,
            path: "/api/v1.0/email/send",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
            },
        };
        const req = https_1.default.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                clearTimeout(timeout);
                if (res.statusCode === 200) {
                    resolve();
                }
                else {
                    reject(new Error(`EmailJS API error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on("error", (err) => {
            clearTimeout(timeout);
            reject(new Error(`EmailJS request failed: ${err.message}`));
        });
        req.write(payload);
        req.end();
    });
}
//# sourceMappingURL=emailSender.js.map