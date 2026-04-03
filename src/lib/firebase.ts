import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
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
