import * as admin from 'firebase-admin';

console.log("=========================================");
console.log("ADMIN.TS IS EXECUTING: VERSION 2");
console.log("=========================================");

if (!admin.apps.length) {
    let credential;
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            credential = admin.credential.cert(serviceAccount);
        } else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
            credential = admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                // Replace literal \n in string if it exists from .env file
                privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
            });
        } else {
            console.warn('Firebase Admin credentials not fully set. Using application default credentials.');
            credential = admin.credential.applicationDefault();
        }
    } catch (error) {
        console.error('Error initializing Firebase Admin credentials:', error);
        credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
        credential,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
    });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, admin };
