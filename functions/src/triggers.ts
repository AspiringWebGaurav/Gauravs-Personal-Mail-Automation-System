import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();
const MAX_BATCH_SIZE = 450; // Firestore limit is 500, leave margin

export const cleanupEventData = onDocumentDeleted("events/{eventId}", async (event) => {
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
    } else {
        console.log("Cleanup complete: No related documents found.");
    }
});
