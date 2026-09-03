# ChurchOS — Deployment Guide

> Complete these steps in order. Don't skip step 1 — skipping it is the #1 cause of "Registration failed" errors on the live site.

---

## Step 1: Create & Configure Firebase Project

If you already have a Firebase project, skip to **1c**.

### 1a. Create the project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it (e.g. `churchos-prod`) → create.

### 1b. Enable services
1. **Authentication**: Go to **Build → Authentication → Get Started**. Enable the **Email/Password** provider.
2. **Firestore**: Go to **Build → Firestore Database → Create Database**. Choose your region (e.g. `europe-west1` for proximity to users). Start in **Production mode** (we'll deploy our own rules).

### 1c. Get your web app config
1. Go to **Project Settings** (⚙️ gear icon) → **General** → scroll to "Your apps" → click **Web** (</>) → **Register app** (name it `churchos-web`).
2. Copy the `firebaseConfig` object. It looks like:
   ```js
   const firebaseConfig = {
     apiKey:            "AIzaSy...",
     authDomain:        "churchos-prod.firebaseapp.com",
     projectId:         "churchos-prod",
     storageBucket:     "churchos-prod.appspot.com",
     messagingSenderId: "123456789",
     appId:             "1:123456789:web:abc123",
   };
   ```
3. Open `js/firebase-config.js` and replace the placeholder values with your real config.

### 1d. Deploy Firestore Security Rules
Install Firebase CLI and deploy the rules file:
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # Select your project, accept firestore.rules as the rules file
firebase deploy --only firestore:rules
```
Or paste the contents of `firestore.rules` directly in **Firebase Console → Firestore → Rules**.

---

## Step 2: Initialize Git

```bash
cd "CHURCH MGT SYSTEM"
git init
git add .
git commit -m "ChurchOS: Firebase migration complete, ready for Vercel deploy"
```

Then push to GitHub:
```bash
# Create a repo on GitHub first (e.g. github.com/youruser/churchos)
git remote add origin https://github.com/youruser/churchos.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### Option A: GitHub integration (recommended)
1. Go to [vercel.com](https://vercel.com) → **New Project** → **Import Git Repository** → select your `churchos` repo.
2. **Framework Preset**: select **Other** (this is a static site, no build step).
3. **Build Command**: leave empty.
4. **Output Directory**: leave as `.` (root).
5. Click **Deploy**.

### Option B: Vercel CLI
```bash
npm i -g vercel
cd "CHURCH MGT SYSTEM"
vercel --prod
```

---

## Step 4: Add Vercel Domain to Firebase ⚠️ CRITICAL

> **This is the single most likely cause of auth failures on the live site.** Don't skip it.

1. After deploying, note your Vercel domain (e.g. `churchos-abc123.vercel.app`).
2. Go to **Firebase Console → Authentication → Settings → Authorized domains**.
3. Click **Add domain** and add:
   - `churchos-abc123.vercel.app` (your Vercel auto-assigned domain)
   - Your custom domain too, if you've connected one (e.g. `churchos.com`)
4. `localhost` should already be listed (for local dev).

Without this step, signup and login will fail with `auth/unauthorized-domain`.

---

## Step 5: Post-Deploy Verification Checklist

On the **live Vercel URL** (not localhost):

- [ ] Open browser console (F12) — no Firebase config errors?
- [ ] Sign up as **Admin** → lands on `dashboard-admin.html`?
- [ ] Sign up as **Pastor** → lands on `dashboard-pastor.html`?
- [ ] Sign up as **Leader** → lands on `dashboard-leader.html`?
- [ ] Sign up as **Finance** → lands on `dashboard-finance.html`?
- [ ] Sign up as **Member** → lands on `dashboard-member.html`?
- [ ] Log out → log back in as each user → correct dashboard?
- [ ] Refresh page on dashboard → still logged in? Data still shows?
- [ ] Open in **incognito/private window** → login works?
- [ ] Open on a **different device** → login works?
- [ ] Console shows no errors on any of these steps?
- [ ] **Leader**: record attendance → entry persists after refresh?
- [ ] **Finance**: record a transaction → entry persists?
- [ ] Check **Firestore Console → Data** → documents are being created?

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `auth/unauthorized-domain` | Vercel domain not in Firebase Authorized Domains | Step 4 above |
| `auth/operation-not-allowed` | Email/Password provider not enabled | Firebase Console → Auth → Providers |
| `permission-denied` | Firestore rules blocking the operation | Check `firestore.rules` and re-deploy them |
| `auth/configuration-not-found` | Firebase config values are still placeholders | Replace in `js/firebase-config.js` |
| Red banner "Firebase is not configured" | Same as above | Same as above |
| `auth/email-already-in-use` | Phone number already registered | Try logging in instead of signing up |
| Dashboard redirects to login immediately | No cached session + Firebase auth not initialized | Check Firebase config is correct |
