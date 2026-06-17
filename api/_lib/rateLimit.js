import admin from "firebase-admin";

function getFirestore() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin.firestore();
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Per-IP, per-day rate limiter backed by Firestore.
 * @param {string} ip
 * @param {{ collection: string, limit: number }} options
 */
async function checkAndIncrementRateLimit(ip, { collection, limit }) {
  const db = getFirestore();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const docId = `${ip}_${today}`;
  const ref = db.collection(collection).doc(docId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const currentCount = snap.exists ? snap.data().count || 0 : 0;

    if (currentCount >= limit) {
      return { allowed: false, count: currentCount };
    }

    tx.set(
      ref,
      {
        count: currentCount + 1,
        ip,
        date: today,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { allowed: true, count: currentCount + 1 };
  });
}

export { getFirestore, getClientIp, checkAndIncrementRateLimit };
