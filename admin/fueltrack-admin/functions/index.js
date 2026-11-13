const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// `id` = document id in `users` (the NIC). The Auth uid is stored
// inside the document as `authUid`.
async function deleteUser(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  const id = request.data && request.data.id;
  if (!id || typeof id !== "string") {
    throw new HttpsError("invalid-argument", "User id required.");
  }

  const userRef = db.collection("users").doc(id);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "User profile not found.");
  }

  const data = snap.data();
  const authUid = data.authUid || null;

  if (authUid && authUid === request.auth.uid) {
    throw new HttpsError(
      "failed-precondition",
      "You cannot delete your own admin account.",
    );
  }

  // 1. Transactions
  if (authUid) {
    const txs = await db
      .collection("transactions")
      .where("userId", "==", authUid)
      .get();

    let batch = db.batch();
    let count = 0;
    for (const t of txs.docs) {
      batch.delete(t.ref);
      if (++count === 450) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }

  // 2. Profile + uniqueness indexes
  const batch = db.batch();
  batch.delete(userRef);
  batch.delete(db.collection("nicIndex").doc(String(data.nic || id)));
  if (data.phone)
    batch.delete(db.collection("phoneIndex").doc(String(data.phone)));
  if (data.vehicleNumber) {
    batch.delete(db.collection("vehicleIndex").doc(String(data.vehicleNumber)));
  }
  await batch.commit();

  // 3. QR images in Storage (best effort)
  try {
    await admin
      .storage()
      .bucket()
      .deleteFiles({ prefix: `qrImages/${id}/` });
  } catch (e) {
    console.error("Storage cleanup failed:", e);
  }

  // 4. Authentication account
  if (authUid) {
    try {
      await admin.auth().deleteUser(authUid);
    } catch (e) {
      if (e.code !== "auth/user-not-found") {
        console.error("Auth deletion failed:", e);
        throw new HttpsError(
          "internal",
          "Profile and data deleted, but Authentication deletion failed.",
        );
      }
    }
  }

  return { success: true };
}

exports.deleteFuelTrackUser = onCall(async (request) => {
  try {
    return await deleteUser(request);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error("deleteFuelTrackUser failed:", e);
    throw new HttpsError("internal", `Delete failed: ${e.message || e}`);
  }
});
