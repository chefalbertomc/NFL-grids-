// Authentication Module for Wings & Wins — Multi-Provider (Google, Apple, Facebook) & Mandatory Auth Gate
(function() {
  'use strict';

  window.currentUser = null;
  window.isAdmin = false;
  let authInitialized = false;

  const authCallbacks = [];
  let pendingAuthAction = null;

  window.onAuthChange = function(cb) {
    if (typeof cb === 'function') {
      authCallbacks.push(cb);
      if (authInitialized && window.currentUser !== undefined) {
        cb(window.currentUser, window.isAdmin);
      }
    }
  };

  function notifyCallbacks() {
    authCallbacks.forEach(cb => cb(window.currentUser, window.isAdmin));
  }

  function setLoginButtonLoading(btnId, isLoading, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = `<span style="font-size:16px;">⏳</span> <span>${text || 'Iniciando sesión...'}</span>`;
      btn.disabled = true;
    } else {
      if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
      btn.disabled = false;
    }
  }

  function handleAuthError(err, providerName) {
    console.error(`[auth] Error (${providerName}):`, err);
    if (err.code === 'auth/operation-not-allowed') {
      alert(`⚠️ El inicio de sesión con ${providerName} aún no está habilitado en la consola de Firebase. Por favor usa "Continuar con Google".`);
    } else if (err.code === 'auth/popup-closed-by-user') {
      // User closed popup
    } else if (err.code === 'auth/account-exists-with-different-credential') {
      alert(`Ya existe una cuenta con este correo pero con otro método de acceso. Por favor inicia sesión con Google.`);
    } else if (err.code === 'auth/cancelled-popup-request') {
      // Ignored
    } else {
      alert(`Error al iniciar sesión con ${providerName}: ` + (err.message || err.code));
    }
  }

  async function doSignIn(provider, providerName) {
    if (!window.firebase || !firebase.auth) {
      alert('Firebase aún se está inicializando. Por favor intenta de nuevo en un segundo.');
      return;
    }

    try {
      const result = await firebase.auth().signInWithPopup(provider);
      window.hideLoginModal();
      if (pendingAuthAction) {
        const action = pendingAuthAction;
        pendingAuthAction = null;
        action(result.user);
      }
      return result.user;
    } catch (err) {
      console.warn(`[auth] Popup error with ${providerName}, trying redirect:`, err);
      // Popup blocked or mobile webview fallback
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        try {
          await firebase.auth().signInWithRedirect(provider);
        } catch (redirErr) {
          handleAuthError(redirErr, providerName);
        }
      } else {
        handleAuthError(err, providerName);
      }
    }
  }

  // Multi-Provider Sign In functions
  window.loginWithGoogle = async function() {
    setLoginButtonLoading('btnModalGoogle', true, 'Conectando con Google...');
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await doSignIn(provider, 'Google');
    } catch (err) {
      handleAuthError(err, 'Google');
    } finally {
      setLoginButtonLoading('btnModalGoogle', false);
    }
  };

  window.loginWithApple = async function() {
    setLoginButtonLoading('btnModalApple', true, 'Conectando con Apple...');
    try {
      const provider = new firebase.auth.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await doSignIn(provider, 'Apple');
    } catch (err) {
      handleAuthError(err, 'Apple');
    } finally {
      setLoginButtonLoading('btnModalApple', false);
    }
  };

  window.loginWithFacebook = async function() {
    setLoginButtonLoading('btnModalFacebook', true, 'Conectando con Facebook...');
    try {
      const provider = new firebase.auth.FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');
      await doSignIn(provider, 'Facebook');
    } catch (err) {
      handleAuthError(err, 'Facebook');
    } finally {
      setLoginButtonLoading('btnModalFacebook', false);
    }
  };

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

    // Login Modal Elements
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
      modalClose.addEventListener('click', window.hideLoginModal);
    }

    const modalOverlay = document.getElementById('globalLoginModal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) window.hideLoginModal();
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

    // Check redirect result on load (for mobile logins that used redirect)
    if (firebase.auth().getRedirectResult) {
      firebase.auth().getRedirectResult().then(result => {
        if (result && result.user) {
          window.currentUser = result.user;
          window.hideLoginModal();
        }
      }).catch(err => {
        console.warn('[auth] Redirect result error:', err);
      });
    }

    // Monitor Firebase Auth State
    firebase.auth().onAuthStateChanged(async (user) => {
      authInitialized = true;
      window.currentUser = user;

      if (user) {
        window.hideLoginModal();

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

        // MANDATORY LOGIN ON INITIAL PAGE LOAD: Show login modal immediately
        window.showLoginModal('¡Inicia Sesión para Jugar!', 'Para entrar a los Grids, escoger casillas y ver tus juegos, por favor inicia sesión.');
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
