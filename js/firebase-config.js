// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp,
    increment
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration from requirements
const firebaseConfig = {
    apiKey: "AIzaSyCv5bpFnvxR1gUXRoh4Td434BqfE8Cnqzc",
    authDomain: "earnminibot.firebaseapp.com",
    databaseURL: "https://earnminibot-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "earnminibot",
    storageBucket: "earnminibot.firebasestorage.app",
    messagingSenderId: "693031433788",
    appId: "1:693031433788:web:04d1553a15f03df0ecf539",
    measurementId: "G-RL28PGB99W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Export Firebase services
export { 
    db, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp,
    increment 
};

// Telegram Bot Configuration
export const TELEGRAM_CONFIG = {
    BOT_TOKEN: '8154822596:AAHA4jB7ZAhPb5-xB8KiMp6iNMjgC5K67B8',
    BOT_USERNAME: 'earnmini_bot',
    API_URL: 'https://api.telegram.org/bot8154822596:AAHA4jB7ZAhPb5-xB8KiMp6iNMjgC5K67B8'
};

// App Configuration
export const APP_CONFIG = {
    DAILY_AD_LIMIT: 15,
    POINTS_PER_AD: 1,
    REFERRAL_BONUS: 5,
    MIN_WITHDRAWAL: 1000,
    REFERRAL_COMMISSION_RATE: 0.1, // 10% commission
    WITHDRAWAL_METHODS: ['bkash', 'nogod', 'binance']
};

// Database Collections
export const COLLECTIONS = {
    USERS: 'users',
    WITHDRAWALS: 'withdrawals',
    ACTIVITIES: 'activities',
    ADMIN_SETTINGS: 'admin_settings',
    ADS: 'ads',
    REFERRALS: 'referrals'
};
