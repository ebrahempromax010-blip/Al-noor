import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATtGEGdRrCz0ElJHOrAwOxEE5QXyWGUjY",
  authDomain: "ashraf-gold.firebaseapp.com",
  projectId: "ashraf-gold",
  storageBucket: "ashraf-gold.firebasestorage.app",
  messagingSenderId: "953211886019",
  appId: "1:953211886019:web:82e8e11a7e3b48b9214576",
  measurementId: "G-LBH9N2WX4D"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
