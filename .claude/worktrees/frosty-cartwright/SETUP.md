# Design Problem Bank — Firebase Setup Guide

This page works in **demo mode** right out of the box (data stored in your browser), but to make it work for real with multiple users, you'll need to connect it to Firebase. This takes about 10 minutes.

## Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it something like `design-problem-bank`
4. You can disable Google Analytics (not needed)
5. Click **Create**

## Step 2: Enable Firestore Database

1. In your Firebase project, click **"Build" → "Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Pick a region close to you
5. Click **Enable**

## Step 3: Enable Storage (for photo uploads)

1. Click **"Build" → "Storage"** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Click **Done**

## Step 4: Get Your Config

1. Click the **gear icon** next to "Project Overview" → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click the **web icon** (`</>`) to add a web app
4. Name it `problem-bank` and click **Register app**
5. You'll see a config object that looks like this:

```js
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "design-problem-bank.firebaseapp.com",
    projectId: "design-problem-bank",
    storageBucket: "design-problem-bank.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

## Step 5: Paste Config into index.html

1. Open `index.html` in a text editor
2. Find the section near the top of the `<script>` that says:

```js
const FIREBASE_CONFIG = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
```

3. Replace those empty strings with the values from your Firebase config
4. Save the file

## Step 6: Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Push `index.html` to the repo
3. Go to **Settings → Pages**
4. Under "Source", select **main branch**
5. Your site will be live at `https://yourusername.github.io/repo-name/`

## Security (Do Later)

The "test mode" rules expire after 30 days. Before that, update your Firestore rules to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /problems/{problem} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if false;
    }
  }
}
```

And Storage rules to:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{photo} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

This allows anyone to read and submit, but no one can delete problems, and photos are limited to 5MB images.

## That's It!

Once the config is pasted in and deployed, the orange setup banner will disappear and submissions will persist across all users.
