"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupEventData = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const MAX_BATCH_SIZE = 450; // Firestore limit is 500, leave margin
exports.cleanupEventData = (0, firestore_1.onDocumentDeleted)("events/{eventId}", async (event) => {
    const eventId = event.params.eventId;
    console.log(`Event ${eventId} deleted. Cleaning up related data...`);
    let totalDeleted = 0;
    // 1. Delete associated scheduled reminders (may exceed 500)
    const remindersQuery = db.collection("scheduledReminders").where("eventId", "==", eventId);
    const remindersSnap = await remindersQuery.get();
    // Process in safe batches to avoid exceeding Firestore 500-write limit
    const allDocs = [
        ...remindersSnap.docs,
    ];
    // 2. Get participants subcollection
    const participantsSnap = await db.collection(`events/${eventId}/participants`).get();
    allDocs.push(...participantsSnap.docs);
    // Batch delete in chunks of MAX_BATCH_SIZE
    for (let i = 0; i < allDocs.length; i += MAX_BATCH_SIZE) {
        const chunk = allDocs.slice(i, i + MAX_BATCH_SIZE);
        const batch = db.batch();
        chunk.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += chunk.length;
    }
    if (totalDeleted > 0) {
        console.log(`Cleanup complete: Deleted ${totalDeleted} related documents for event ${eventId}`);
    }
    else {
        console.log("Cleanup complete: No related documents found.");
    }
});
//# sourceMappingURL=triggers.js.map