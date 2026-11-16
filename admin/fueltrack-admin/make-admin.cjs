const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

async function makeAdmin() {
  const uid = "8nR7UKxdp2Ngk1N460ODAuD86C83";

  await getAuth().setCustomUserClaims(uid, {
    admin: true,
  });

  console.log("Admin access granted successfully!");
}

makeAdmin().catch((error) => {
  console.error("Failed to grant admin access:", error);
  process.exitCode = 1;
});
