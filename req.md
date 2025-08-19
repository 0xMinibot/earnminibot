
---
### Prompt:

**Build a professional Telegram Mini App bot with an Admin Panel**
**Tech Stack:**
* Frontend: HTML, CSS, Bootstrap (modern UI with icons)
* Database: Firebase Cloud Firestore
* API: Telegram API integration for user data
---
### Features Breakdown
#### **UI/UX**
* **Header:**
  * Clean design with app logo and user profile icon (fetched via Telegram API:

    `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${u.id}&limit=1`)
* **Bottom Navigation Bar:**

  * Tabs: *Home, Earn, Withdraw, Profile*
  * Floating Action Button: *Referral*
* **Consistency:**

  * Modern, responsive design with Bootstrap
  * Toast notifications for all actions (success, error, info)

---

#### **Core Features**

1. **Earning System:**

   * Users watch *monetized ads* to earn points.
   * Daily task limit: **15 ads per day**
   * Each completed ad task = **1 point**

2. **Referral System:**

   * Auto-generated referral links using Telegram User ID
   * Rewards: **+5 points per successful referral**
   * Commission: Referrers earn a percentage (%) of their invitee’s work/earnings
   * Dashboard: Shows total referrals and commission earned

3. **Withdrawal System:**

   * Minimum withdrawal threshold: **1000 points**
   * Supported methods: **bKash, Nogod, Binance**
   * Admin can add new withdrawal methods via the admin panel

4. **Profile**
showing profile statitics and data pic etc


---

#### **Admin Panel**

* Control all features from a central dashboard:

  * Manage tasks & daily limits
  * Adjust referral commissions
  * Add/remove withdrawal methods
  * Monitor users, earnings, and referrals

---

#### **Experience Enhancements**

* Consistent, modern UI design across all sections
* Smooth animations & responsive layout
* Clear feedback using toasts for every user action

---

//==========DB============
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

apply this telegram bot api : "8154822596:AAHA4jB7ZAhPb5-xB8KiMp6iNMjgC5K67B8"
user: @earnmini_bot