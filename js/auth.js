// Authentication Module for Wings & Wins — Multi-Provider (Google, Apple, Facebook) & Mandatory Auth Gate
(function() {
  'use strict';

  window.currentUser = null;
  window.isAdmin = false;

  const authCallbacks = [];
  let pendingAuthAction = null;

  window.onAuthChange = function(cb) {
    if (typeof cb === 'function') {
      authCallbacks.push(cb);
      if (window.currentUser !== undefined) {
        cb(window.currentUser, window.isAdmin);
      }
    }
  };

  function notifyCallbacks() {
    authCallbacks.forEach(cb => cb(window.currentUser, window.isAdmin));
  }

  // Multi-Provider Sign In functions
  window.loginWithGoogle = async function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return doSignIn(provider, 'Google');
  };

  window.loginWithApple = async function() {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return doSignIn(provider, 'Apple');
  };

  window.loginWithFacebook = async function() {
    const provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    return doSignIn(provider, 'Facebook');
  };

  async function doSignIn(provider, providerName) {
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      hideLoginModal();
      if (pendingAuthAction) {
        const action = pendingAuthAction;
        pendingAuthAction = null;
        action(result.user);
      }
      return result.user;
    } catch (err) {
      console.warn(`[auth] Popup error with ${providerName}, trying redirect:`, err);
      // Popup blocked or mobile browser fallback
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try {
          await firebase.auth().signInWithRedirect(provider);
        } catch (redirErr) {
          alert(`Error al iniciar sesión con ${providerName}: ` + redirErr.message);
        }
      } else {
        alert(`Error al iniciar sesión con ${providerName}: ` + err.message);
      }
    }
  }

  // Global Auth Guard: Requires user to be logged in before taking action
  window.requireUserAuth = function(actionCallback, customTitle, customSubtitle) {
    if (window.currentUser) {
      if (typeof actionCallback === 'function') actionCallback(window.currentUser);
      return true;
    }
    pendingAuthAction = actionCallback;
    window.showLoginModal(customTitle, customSubtitle);
    return false;
  };

  window.showLoginModal = function(customTitle, customSubtitle) {
    const modal = document.getElementById('globalLoginModal');
    const titleEl = document.getElementById('loginModalTitle');
    const subEl = document.getElementById('loginModalSubtitle');

    if (titleEl && customTitle) titleEl.textContent = customTitle;
    if (subEl && customSubtitle) subEl.textContent = customSubtitle;

    if (modal) modal.classList.add('active');
  };

  window.hideLoginModal = function() {
    const modal = document.getElementById('globalLoginModal');
    if (modal) modal.classList.remove('active');
    pendingAuthAction = null;
  };

  function initAuthUI() {
    // Header Elements
    const btnHeaderLogin = document.getElementById('btnHeaderLogin');
    const btnGoogle = document.getElementById('btnGoogle');
    const btnSignOut = document.getElementById('btnSignOut');
    const userBadge = document.getElementById('userBadge');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    // Login Modal Buttons
    const modalClose = document.getElementById('loginModalClose');
    const btnModalGoogle = document.getElementById('btnModalGoogle');
    const btnModalApple = document.getElementById('btnModalApple');
    const btnModalFacebook = document.getElementById('btnModalFacebook');

    if (btnHeaderLogin) {
      btnHeaderLogin.addEventListener('click', () => {
        window.showLoginModal('Iniciar Sesión', 'Elige tu cuenta para entrar a tus Grids y Quinielas.');
      });
    }

    if (btnGoogle) {
      btnGoogle.addEventListener('click', () => {
        window.showLoginModal('Iniciar Sesión', 'Accede con tu cuenta favorita para guardar tus jugadas.');
      });
    }

    if (modalClose) {
      modalClose.addEventListener('click', hideLoginModal);
    }

    const modalOverlay = document.getElementById('globalLoginModal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideLoginModal();
      });
    }

    if (btnModalGoogle) btnModalGoogle.addEventListener('click', window.loginWithGoogle);
    if (btnModalApple) btnModalApple.addEventListener('click', window.loginWithApple);
    if (btnModalFacebook) btnModalFacebook.addEventListener('click', window.loginWithFacebook);

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
        if (confirm(`Sesión iniciada como: ${window.currentUser?.displayName || window.currentUser?.email}\n\n¿Deseas cerrar sesión?`)) {
          firebase.auth().signOut().then(() => window.location.reload());
        }
      });
    }

    // Monitor Firebase Auth State
    firebase.auth().onAuthStateChanged(async (user) => {
      window.currentUser = user;

      if (user) {
        hideLoginModal();

        // Check if Admin
        try {
          const adminDoc = await window.db.doc('admins/' + user.uid).get();
          window.isAdmin = adminDoc.exists;
        } catch (err) {
          console.error('[auth] Error checking admin status:', err);
          window.isAdmin = false;
        }

        // Store user display name into localStorage for player nickname convenience
        if (user.displayName) {
          if (!localStorage.getItem('player_nick')) {
            localStorage.setItem('player_nick', user.displayName.toUpperCase());
          }
          if (!localStorage.getItem('bww_q_name')) {
            localStorage.setItem('bww_q_name', user.displayName.toUpperCase());
          }
        }

        // Update UI
        if (btnHeaderLogin) btnHeaderLogin.classList.add('hidden');
        if (btnGoogle) btnGoogle.classList.add('hidden');
        if (btnSignOut) btnSignOut.classList.remove('hidden');
        if (userBadge) userBadge.classList.remove('hidden');
        if (userAvatar) userAvatar.src = user.photoURL || 'img/logo.jpg';
        if (userName) userName.textContent = user.displayName || user.email;

        // Show Admin Nav items if applicable
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        document.querySelectorAll('.admin-only').forEach(el => {
          el.classList.toggle('hidden', !(window.isAdmin || isLocal));
        });
      } else {
        window.isAdmin = false;
        if (btnHeaderLogin) btnHeaderLogin.classList.remove('hidden');
        if (btnGoogle) btnGoogle.classList.remove('hidden');
        if (btnSignOut) btnSignOut.classList.add('hidden');
        if (userBadge) userBadge.classList.add('hidden');

        document.querySelectorAll('.admin-only').forEach(el => {
          el.classList.add('hidden');
        });
      }

      notifyCallbacks();
    });
  }

  function checkFirebase() {
    if (window.firebase && window.db) {
      initAuthUI();
    } else {
      setTimeout(checkFirebase, 100);
    }
  }

  checkFirebase();
})();
