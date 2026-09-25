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

    // COMPATIBILIDAD CON DATOS CELULARES
    // Muchas operadoras (Telcel, Movistar, AT&T Mexico) bloquean WebSockets
    // (protocolo que usa Firestore por defecto para tiempo real).
    // experimentalForceLongPolling usa HTTP largo en su lugar -> funciona en CUALQUIER red.
    window.db = firebase.firestore();
    window.db.settings({
      experimentalForceLongPolling: true,
      merge: true
    });

    // PERSISTENCIA OFFLINE
    // Permite que la app cargue aunque la red sea lenta o intermitente.
    // Los datos ya vistos se guardan en IndexedDB del celular.
    window.db.enablePersistence({ synchronizeTabs: false })
      .then(function() {
        console.log("[firebase-config.js] Offline persistence enabled");
      })
      .catch(function(err) {
        if (err.code === 'failed-precondition') {
          console.warn("[firebase-config.js] Persistence skipped (multiple tabs)");
        } else if (err.code === 'unimplemented') {
          console.warn("[firebase-config.js] Persistence not supported in this browser");
        }
      });

    window._bwwFirebaseReady = true;
    console.log("[firebase-config.js] Firebase initialized successfully (LongPolling mode)");
  } catch (e) {
    console.error("[firebase-config.js] Error initializing Firebase:", e);
  }
})();
