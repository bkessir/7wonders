import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  document.body.innerHTML = `
    <div style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto;color:#c00">
      <h2>Firebase not configured</h2>
      <p>Missing environment variables. If you're running locally, create a <code>.env</code> file from <code>.env.example</code>.</p>
      <p>If deployed on Netlify, add the <code>VITE_FIREBASE_*</code> variables in <strong>Site → Environment variables</strong>, then redeploy.</p>
    </div>`;
  throw new Error('Firebase environment variables are not set.');
}

const firebaseConfig = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
