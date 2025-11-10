// src/components/utils/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCBqK72dqC9lJLh7FPWze5NHA8dmm5NtXg",
    authDomain: "savoir-faire-cef81.firebaseapp.com",
    projectId: "savoir-faire-cef81",
    storageBucket: "savoir-faire-cef81.appspot.com",
    messagingSenderId: "255896250643",
    appId: "1:255896250643:web:65a2a4bf8331acdc5952e6",
    measurementId: "G-TQMB8WDQQR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export default db;
