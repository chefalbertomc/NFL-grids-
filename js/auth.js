// Authentication Module for Wings & Wins — Google 1-Click Login Gate
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
      btn.innerHTML = `<span style="font-size:18px;">⏳</span> <span style="font-weight:900;">${text || 'Conectando con Google...'}</span>`;
      btn.disabled = true;
    } else {
      if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
      btn.disabled = false;
    }
  }

  function handleAuthError(err) {
    console.error('[auth] Google sign-in error:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      // User closed popup
    } else if (err.code === 'auth/cancelled-popup-request') {
      // User triggered multiple
    } else {
      alert('Error al iniciar sesión con Google: ' + (err.message || err.code));
    }
  }

  // 1-Click Google Sign In
  window.loginWithGoogle = async function() {
    setLoginButtonLoading('btnModalGoogle', true, 'Conectando con Google...');
    try {
      if (!window.firebase || !firebase.auth) {
        alert('Firebase aún se está inicializando. Por favor intenta de nuevo en un segundo.');
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      try {
        const result = await firebase.auth().signInWithPopup(provider);
        window.hideLoginModal();
        if (pendingAuthAction) {
          const action = pendingAuthAction;
          pendingAuthAction = null;
          action(result.user);
        }
      } catch (err) {
        console.warn('[auth] Popup failed or blocked, attempting redirect:', err);
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          await firebase.auth().signInWithRedirect(provider);
        } else {
          handleAuthError(err);
        }
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoginButtonLoading('btnModalGoogle', false);
    }
  };

  function updateHeaderUI(user) {
    const btnHeaderLogin = document.getElementById('btnHeaderLogin');
    const btnGoogle = document.getElementById('btnGoogle');
    const btnSignOut = document.getElementById('btnSignOut');
    const userBadge = document.getElementById('userBadge');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (user) {
      if (btnHeaderLogin) btnHeaderLogin.classList.add('hidden');
      if (btnGoogle) btnGoogle.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.remove('hidden');
      if (userBadge) userBadge.classList.remove('hidden');
      if (userAvatar) userAvatar.src = user.photoURL || 'img/logo.jpg';
      if (userName) userName.textContent = user.displayName || user.email;
    } else {
      if (btnHeaderLogin) btnHeaderLogin.classList.remove('hidden');
      if (btnGoogle) btnGoogle.classList.remove('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (userBadge) userBadge.classList.add('hidden');
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

    // Login Modal Elements
    const modalClose = document.getElementById('loginModalClose');
    const btnModalGoogle = document.getElementById('btnModalGoogle');

    if (btnHeaderLogin) {
      btnHeaderLogin.addEventListener('click', () => {
        window.showLoginModal('Iniciar Sesión con Google', 'Accede con tu cuenta de Google para entrar a tus Grids y Quinielas.');
      });
    }

    if (btnGoogle) {
      btnGoogle.addEventListener('click', () => {
        window.showLoginModal('Iniciar Sesión con Google', 'Accede con tu cuenta de Google para guardar tus jugadas.');
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

    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        try {
          if (firebase.auth && firebase.auth()) {
            await firebase.auth().signOut();
          }
          window.location.reload();
        } catch (e) {
          console.error('[auth] Logout error:', e);
        }
      });
    }

    if (userBadge) {
      userBadge.addEventListener('click', () => {
        if (confirm(`Sesión iniciada como: ${window.currentUser?.displayName || window.currentUser?.email}\n\n¿Deseas cerrar sesión?`)) {
          if (firebase.auth && firebase.auth()) {
            firebase.auth().signOut().then(() => window.location.reload());
          } else {
            window.location.reload();
          }
        }
      });
    }

    // Check redirect result on load (for mobile logins that used redirect)
    if (firebase.auth && firebase.auth().getRedirectResult) {
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
    if (firebase.auth && firebase.auth()) {
      firebase.auth().onAuthStateChanged(async (user) => {
        authInitialized = true;

        if (user) {
          window.currentUser = user;
          window.hideLoginModal();

          // Check if Admin
          try {
            const adminDoc = await window.db.doc('admins/' + user.uid).get();
            window.isAdmin = adminDoc.exists;
          } catch (err) {
            console.error('[auth] Error checking admin status:', err);
            window.isAdmin = false;
          }

          if (user.displayName) {
            localStorage.setItem('player_nick', user.displayName.toUpperCase());
            localStorage.setItem('bww_q_name', user.displayName.toUpperCase());
          }

          updateHeaderUI(user);

          // Show Admin Nav items if applicable
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', !(window.isAdmin || isLocal));
          });
        } else {
          window.currentUser = null;
          window.isAdmin = false;
          updateHeaderUI(null);
          document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

          // MANDATORY LOGIN ON INITIAL PAGE LOAD
          window.showLoginModal('¡Inicia Sesión para Jugar!', 'Para entrar a los Grids, escoger casillas y ver tus juegos, por favor inicia sesión con Google.');
        }

        notifyCallbacks();
      });
    }
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
