# Earn Mini Bot – Telegram Mini App + Admin

This project implements the requirements in `req.md`:

- Telegram Mini App UI with bottom navigation, floating Refer button, profile, Earn, Withdraw, and Home pages in `public/`.
- Firebase Firestore integration for users, admin settings, and withdrawals.
- Admin Panel in `admin/` to manage global settings and process withdrawals.

Important: Some backend responsibilities (secure Telegram API proxy, referral commission triggers, scheduled daily reset) should be implemented with Firebase Cloud Functions before production.

## Structure

- `public/` – Mini App frontend
  - `index.html` – main app
  - `assets/js/app.js` – logic, Firestore ops, Telegram WebApp integration
  - `assets/css/styles.css` – theme
- `admin/` – Admin console
  - `index.html`
  - `admin.js` – Firebase Auth + Firestore
- `req.md` – requirements

## Prerequisites

- Firebase project with Firestore enabled
- Optional: Firebase Authentication (Email/Password) for admin
- Telegram Bot created; bot username: `@earnmini_bot`

Firebase config is embedded (from `req.md`). Update if needed in:
- `public/assets/js/app.js`
- `admin/admin.js`

## Firestore Collections (as used in this scaffold)

- `users/{user_id}`: name, profilePhoto, points, dailyTasksCompleted, lastTaskDate, createdAt
- `adminSettings/global`: dailyTaskLimit, pointsPerTask, referralPoints, commissionRate, paymentMethods[]
- `withdrawals/{autoId}`: userId, method, account, amount, status, requestedAt
- `referrals/{referrer_id}`: referee_ids[], commissionRate (referenced for counts; commission logic not yet implemented)

## Run Locally (static preview)

You can use any static HTTP server. Examples:

- Node (if installed):
  - Mini App: `npx serve public`
  - Admin: `npx serve admin`
- Python 3:
  - Mini App: `python -m http.server 5500 -d public`
  - Admin: `python -m http.server 5501 -d admin`

Without Telegram context, the app falls back to a demo user so you can test UI.

## Telegram Mini App Setup

1. Host the `public/` folder (Firebase Hosting recommended).
2. In BotFather, set the Web App URL for menu/button to your hosted `public/` URL.
3. The app uses `Telegram.WebApp` to read user info. For profile photos and other Bot API calls, create a Cloud Function proxy to keep the bot token secret.

## Admin Panel Setup

1. Host `admin/` (Firebase Hosting or any static hosting).
2. Enable Firebase Authentication (Email/Password), create an admin user.
3. Optionally use custom claims to protect write operations.

## Minimal Firestore Rules (adjust before production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true; // relax for demo
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /withdrawals/{id} {
      allow read: if true;
      allow create: if true; // demo
      allow update, delete: if request.auth.token.admin == true; // admin only
    }
    match /referrals/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /adminSettings/{doc} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

## TODO (for production readiness)

- Cloud Function proxy for Telegram Bot API to fetch profile photos securely.
- Cloud Function to award referral points on signup and commission on earnings.
- Scheduled Function (UTC midnight) to reset `dailyTasksCompleted`.
- Validate withdrawal requests (min points, sanitization) server-side.
- Add ReCAPTCHA/anti-abuse if needed.
- Harden security rules and add admin custom claims.

## Notes

- The Earn flow currently simulates a 5-second "ad" timer, then writes points to Firestore. Replace with real ad SDK/flow.
- Referral link uses `https://t.me/earnmini_bot?start=<user_id>`. Handle `start_param` in your bot and first app open to credit referrer.
