import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDqQ3rbjWSaROg4oxXRtqcWXcA8XZcict0",
  authDomain: "dawson-problem-bank-24a9c.firebaseapp.com",
  projectId: "dawson-problem-bank-24a9c",
  storageBucket: "dawson-problem-bank-24a9c.firebasestorage.app",
  messagingSenderId: "376204026497",
  appId: "1:376204026497:web:de7a281c56ef3a60f46380",
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// Local testing against the Firestore emulator (`npm run dev:emulator`). Auth
// still uses real Google sign-in; the emulator accepts the real ID token and
// evaluates firestore.rules against its claims, so the whole teacher/student
// flow can be exercised on seeded data without touching production.
// Guarded by DEV so a production bundle can never pick this up.
if (import.meta.env.DEV && import.meta.env.VITE_FIRESTORE_EMULATOR === '1') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
