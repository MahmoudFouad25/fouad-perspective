// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBAcPzPzIDYHvezf5klAwFzU0gmoo_AsCo",
  authDomain: "fouad-academy.firebaseapp.com",
  projectId: "fouad-academy",
  storageBucket: "fouad-academy.firebasestorage.app",
  messagingSenderId: "553738647199",
  appId: "1:553738647199:web:4e73c59b115da5be15d4aa",
  measurementId: "G-M0VML1SRZ4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize storage only if available
let storage;
try {
  storage = firebase.storage();
} catch (error) {
  console.warn('Firebase Storage not initialized:', error);
}
