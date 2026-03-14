import { initializeFirebase, isFirebaseReady } from "./fcm.service";

export function initializeFireBaseServices(): void {
  console.log("[App] Initializing services...");

  const firebaseReady = initializeFirebase();
  if (firebaseReady) {
    console.log("[App] ✓ Firebase ready for push notifications");
  } else {
    console.log(
      "[App] ✗ Firebase not configured - push notifications disabled"
    );
  }

  console.log("[App] Services initialized");
}

export { initializeFirebase, isFirebaseReady };
