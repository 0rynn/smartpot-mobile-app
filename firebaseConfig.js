import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCNgw9zQ3kwU5kEh8dK3tUTU08sNvPhOwk",
  authDomain: "smartpot-dd482.firebaseapp.com",
  databaseURL: "https://smartpot-dd482-default-rtdb.firebaseio.com",
  projectId: "smartpot-dd482",
  storageBucket: "smartpot-dd482.firebasestorage.app",
  messagingSenderId: "217322161963",
  appId: "1:217322161963:web:c9c0f2a1d8b25992d8276e",
  measurementId: "G-2EVVZPYN8G"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { database }