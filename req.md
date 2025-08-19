
Build a professional Telegram Mini App Bot with an integrated admin panel for monetization, referrals, withdrawals, and user management. The app must use Firebase Cloud Firestore for data storage, HTML/CSS/Bootstrap for UI, and Telegram API for user data.

---

### **Tech Stack**
- **Frontend**: HTML5, CSS3, Bootstrap 5 (for responsive UI/icons)
- **Backend**: Firebase Cloud Firestore (database), Firebase Authentication (optional)
- **APIs**: Telegram Bot API (user data/profile photos)
- **Deployment**: Firebase Hosting (frontend), Cloud Functions (backend logic)

---

### **Core Features & Implementation Details**

#### **1. Header Section**
- **Requirements**:
  - Logo on the left
  - User profile icon on the right (fetch from Telegram API)
  - Use endpoint: `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${user_id}&limit=1`
- **Implementation**:
  - Fetch user data via Telegram WebApp SDK (`Telegram.WebApp`)
  - Store `user_id` in Firestore for future API calls
  - Cache profile photos in Firestore to reduce API calls
  - Use Bootstrap’s `navbar` with custom styling

#### **2. Bottom Navigation Menu**
- **Requirements**:
  - Fixed bottom bar with icons: **Home, Earn, Withdraw, Profile**
  - Floating "Refer" button (always visible)
- **Implementation**:
  - Bootstrap’s `fixed-bottom` container
  - Icons: Bootstrap Icons or Font Awesome
  - Floating button: `position-fixed` with `bottom-4` and `end-4`
  - Active state highlighting for current page

#### **3. Monetization System (Earn Section)**
- **Requirements**:
  - Daily task limit: 15 tasks/day
  - Each task = 1 point after watching a montage ad
  - Reset counter at midnight (UTC)
- **Implementation**:
  - Firestore structure:
    ```javascript
    users: {
      user_id: {
        points: 0,
        dailyTasksCompleted: 0,
        lastTaskDate: "YYYY-MM-DD" // For reset logic
      }
    }
    ```
  - Task flow:
    1. User clicks "Start Task"
    2. Show montage ad (HTML5 video/ad library)
    3. On completion: Increment `points` and `dailyTasksCompleted`
    4. Disable tasks if `dailyTasksCompleted >= 15`
  - Ad integration: Use Google Ad Manager or custom video ads

#### **4. Referral System**
- **Requirements**:
  - Auto-generate referral link: `https://t.me/your_bot?start=${user_id}`
  - Reward: 5 points per successful referral
  - Commission: X% of referee’s earnings (configurable in admin panel)
  - Display referral count and total earnings
- **Implementation**:
  - Firestore structure:
    ```javascript
    referrals: {
      referrer_id: {
        referee_ids: [user_id1, user_id2],
        commissionRate: 0.1 // 10%
      }
    }
    ```
  - On new user signup via `start` parameter:
    1. Extract `referrer_id` from URL
    2. Add 5 points to referrer
    3. Link referee to referrer in `referrals` collection
  - Commission logic: Triggered via Cloud Functions when referee earns points

#### **5. Withdrawal System**
- **Requirements**:
  - Methods: bKash, Nagad, Binance + admin-addable methods
  - Minimum withdrawal: 1000 points
  - Form: Payment method, account details, amount
- **Implementation**:
  - Firestore structure:
    ```javascript
    withdrawals: {
      user_id: {
        method: "bKash",
        account: "017********",
        amount: 1000,
        status: "pending" // pending/completed/rejected
      }
    }
    ```
  - Admin panel: Add/remove payment methods dynamically
  - Validation: Check `points >= 1000` before submission

#### **6. Profile Section**
- **Requirements**:
  - Profile photo (from Telegram API)
  - Statistics: Total points, referrals, withdrawal history
- **Implementation**:
  - Fetch data from `users` and `referrals` collections
  - Display withdrawal history from `withdrawals` collection
  - Use Bootstrap cards for stats layout

#### **7. Admin Panel**
- **Requirements**:
  - Control all features: Task limits, points, commissions, payment methods
  - User management: View stats, block users, process withdrawals
- **Implementation**:
  - Separate web app (admin-only access via Firebase Auth)
  - Firestore structure:
    ```javascript
    adminSettings: {
      dailyTaskLimit: 15,
      pointsPerTask: 1,
      referralPoints: 5,
      commissionRate: 0.1,
      paymentMethods: ["bKash", "Nagad", "Binance"]
    }
    ```
  - Features:
    - Dashboard: User growth, withdrawal requests
    - Settings: Update global variables
    - Withdrawals: Approve/reject requests
    - Users: Search/view user data

#### **8. UI/UX Consistency**
- **Requirements**:
  - Consistent design across all pages
  - Toast notifications for all actions
- **Implementation**:
  - Bootstrap theme: Custom CSS variables for colors/spacing
  - Toasts: Bootstrap’s `toast` component with auto-hide
  - Loading spinners for async operations
  - Mobile-first responsive design

---

### **Firebase Firestore Schema**
```javascript
// Users Collection
users: {
  user_id: {
    name: "John Doe",
    profilePhoto: "URL",
    points: 150,
    dailyTasksCompleted: 3,
    lastTaskDate: "2023-10-05",
    createdAt: timestamp
  }
}

// Referrals Collection
referrals: {
  referrer_id: {
    referee_ids: ["user_id1", "user_id2"],
    commissionRate: 0.1,
    totalEarnings: 25
  }
}

// Withdrawals Collection
withdrawals: {
  withdrawal_id: {
    userId: "user_id",
    method: "bKash",
    account: "017********",
    amount: 1000,
    status: "pending",
    requestedAt: timestamp
  }
}

// Admin Settings (Single Document)
adminSettings: {
  dailyTaskLimit: 15,
  pointsPerTask: 1,
  referralPoints: 5,
  commissionRate: 0.1,
  paymentMethods: ["bKash", "Nagad", "Binance"]
}
```

---

### **Key Implementation Notes**
1. **Telegram Integration**:
   - Initialize with `Telegram.WebApp.ready()`
   - Fetch user data: `Telegram.WebApp.initDataUnsafe.user`
   - Use Cloud Functions to proxy Telegram API calls (secure bot token)

2. **Security**:
   - Firestore Rules: Restrict writes to user-owned documents
   - Validate data in Cloud Functions before writes
   - Admin panel: Firebase Auth with custom claims

3. 

4. **Referral Tracking**:
   - Deep linking: `?start=referrer_id` in bot link
   - On bot start: Check `start_param` and award referrer

5. **Withdrawal Processing**:
   - Admin panel: Update withdrawal status → notify user via bot
   - 

6. **Daily Reset**:
   - Cloud Function scheduled daily (UTC) to reset `dailyTasksCompleted`

---

### **Deliverables**
1. **Telegram Mini App**:
   - Fully functional with all features
   - Mobile-optimized UI
   - Toast notifications for all actions

2. **Admin Panel**:
   - Dashboard with analytics
   - Settings management
   - Withdrawal processing interface

3. **Documentation**:
   - Setup guide for Firebase/Telegram
   - API endpoints reference
   - User flow diagrams

---

### **Success Metrics**
- User engagement: Task completion rate
- Referral conversion: % of users with referrals
- Withdrawal volume: Processed requests/month
- Admin efficiency: Time to process withdrawals


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