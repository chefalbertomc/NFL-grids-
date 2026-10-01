// Firebase Initialization (v8 compatibility mode via CDN)
(function () {
  'use strict';

  if (!window.firebase) {
    console.error("[firebase-config.js] Firebase CDN missing. Ensure firebase-app.js, firebase-auth.js, and firebase-firestore.js are loaded before this file.");
    return;
  }

  try {
    const firebaseConfig = {
      apiKey: "AIzaSyBU3-czKOPbTvvsAe-EVsPwDQHxJ9fXf0I",
      authDomain: "wings-win-grid-a6616.firebaseapp.com",
      projectId: "wings-win-grid-a6616",
      storageBucket: "wings-win-grid-a6616.firebasestorage.app",
      messagingSenderId: "8009305729",
      appId: "1:8009305729:web:9e1f41804c14ffbec9c780"
    };

    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    window.db = firebase.firestore();
    window._bwwFirebaseReady = true;
    console.log("[firebase-config.js] Firebase initialized successfully");
  } catch (e) {
    console.error("[firebase-config.js] Error initializing Firebase:", e);
  }
})();
