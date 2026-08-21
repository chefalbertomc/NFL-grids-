// Authentication Logic for Wings & Wins
(function() {
  'use strict';

  window.currentUser = null;
  window.isAdmin = false;

  const authCallbacks = [];

  window.onAuthChange = function(cb) {
    if (typeof cb === 'function') {
      authCallbacks.push(cb);
      // Immediately call with current state if initialized
      if (window.currentUser !== undefined) {
        cb(window.currentUser, window.isAdmin);
      }
    }
  };

  window.ensurePlayerAuth = async function() {
    if (firebase.auth().currentUser) {
      return firebase.auth().currentUser;
    }
    const email = 'player.guest@wingsandwins.com';
    const pass = 'wings123456password';
    try {
      const res = await firebase.auth().signInWithEmailAndPassword(email, pass);
      return res.user;
    } catch (err) {
      try {
        const res = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        return res.user;
      } catch (e) {
        console.error('[auth] Background player account error:', e);
      }
    }
    return null;
  };

  function notifyCallbacks() {
    authCallbacks.forEach(cb => cb(window.currentUser, window.isAdmin));
  }

  // Bind UI Elements
  function initAuthUI() {
    const btnGoogle = document.getElementById('btnGoogle');
    const btnSignOut = document.getElementById('btnSignOut');
    const userBadge = document.getElementById('userBadge');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        try {
          btnGoogle.disabled = true;
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await firebase.auth().signInWithPopup(provider);
        } catch (e) {
          console.warn('[auth] Popup login error, attempting redirect:', e);
          try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await firebase.auth().signInWithRedirect(provider);
          } catch (e2) {
            console.error('[auth] Redirect login error:', e2);
            alert('Error al iniciar sesión con Google: ' + e2.message);
            btnGoogle.disabled = false;
          }
        }
      });
    }

    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        try {
          await firebase.auth().signOut();
          window.location.reload();
        } catch (e) {
          console.error('[auth] Logout error:', e);
        }
      });
    }

    if (userBadge) {
      userBadge.addEventListener('click', () => {
        if (confirm('¿Deseas cerrar sesión?')) {
          firebase.auth().signOut().then(() => window.location.reload());
        }
      });
    }

    // Monitor Auth State
    firebase.auth().onAuthStateChanged(async (user) => {
      window.currentUser = user;
      
      if (user) {
        // Check if Admin
        try {
          const adminDoc = await window.db.doc('admins/' + user.uid).get();
          window.isAdmin = adminDoc.exists;
        } catch (err) {
          console.error('[auth] Error checking admin status:', err);
          window.isAdmin = false;
        }

        // Update UI for logged-in user
        if (btnGoogle) btnGoogle.classList.add('hidden');
        if (btnSignOut) btnSignOut.classList.remove('hidden');
        if (userBadge) userBadge.classList.remove('hidden');
        if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
        if (userName) userName.textContent = user.displayName || user.email;

        // Show Admin Nav items if applicable
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        document.querySelectorAll('.admin-only').forEach(el => {
          el.classList.toggle('hidden', !(window.isAdmin || isLocal));
        });
      } else {
        window.isAdmin = false;
        // Update UI for logged-out user
        if (btnGoogle) {
          btnGoogle.classList.remove('hidden');
          btnGoogle.disabled = false;
        }
        if (btnSignOut) btnSignOut.classList.add('hidden');
        if (userBadge) userBadge.classList.add('hidden');
        
        // Hide Admin Nav items
        document.querySelectorAll('.admin-only').forEach(el => {
          el.classList.add('hidden');
        });
      }

      notifyCallbacks();
    });
  }

  // Wait for Firebase to be ready before initializing auth listeners
  function checkFirebase() {
    if (window.firebase && window.db) {
      initAuthUI();
    } else {
      setTimeout(checkFirebase, 100);
    }
  }

  checkFirebase();
})();
