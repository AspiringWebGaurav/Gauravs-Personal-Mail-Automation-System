import * as admin from 'firebase-admin';

const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
}
const db = admin.firestore();

async function wipeCol(name: string) {
    const snap = await db.collection(name).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`✅ Emptied ${name}: ${snap.docs.length} docs`);
}

async function main() {
    console.log('Wiping operations...');
    await wipeCol('operations');
    console.log('Complete. Checking 0-state...');
}

main().catch(console.error);
