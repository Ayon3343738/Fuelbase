# FuelTrack Admin Web

Separate React + TypeScript + Vite administrator website connected to the same Firebase project as the FuelTrack app.

## Run
1. Copy `.env.example` to `.env`.
2. Fill in the same Firebase Web App configuration used by the mobile app.
3. Run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the localhost URL shown by Vite.

Enable Email/Password sign-in in Firebase Authentication.

## Admin access (required)
This frontend checks the Firebase ID token for the custom claim `admin: true`. A normal signed-in user is not an admin automatically. Set the claim using Firebase Admin SDK in a trusted server/local admin environment, never in browser code:

```js
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
initializeApp({ credential: applicationDefault(), projectId: "YOUR_PROJECT_ID" });
await getAuth().setCustomUserClaims("ADMIN_AUTH_UID", { admin: true });
```
Replace project ID and UID. Sign out and back in after assigning the claim.

## Firestore security
Do not rely only on the frontend role check. Merge equivalent rules into your existing rules and test both apps:

```js
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}
match /transactions/{transactionId} {
  allow read: if isAdmin() || (request.auth != null && resource.data.userId == request.auth.uid);
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAdmin();
}
match /users/{userId} {
  allow read: if isAdmin() || (request.auth != null && request.auth.uid == userId);
}
```

Do not replace your whole rules file blindly.

## Expected transaction fields
`transactions` documents: `userId`, `date` (YYYY-MM-DD), `location`, `litres`, `amount`, and optional `latitude`, `longitude`, `createdAt`.

The Users page reads an optional `users` collection with `email` and `displayName`. Firebase Auth accounts are not directly listable from a browser; if your app does not create user profile documents, this page may be empty. Dashboard unique users are calculated from transaction owners.

No hardcoded sample metrics are shown. Dashboard data is read live from Firestore. This starter intentionally avoids destructive user/transaction actions until a trusted backend and audit logging are added.
