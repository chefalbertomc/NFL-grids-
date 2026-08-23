// Authentication Module for Wings & Wins — Google & WhatsApp / Celular Login Gate
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
    if (err.code === 'auth/popup-closed-by-user') {
      // User closed popup
    } else if (err.code === 'auth/account-exists-with-different-credential') {
      alert(`Ya existe una cuenta con este correo pero con otro método de acceso. Por favor inicia sesión con Google.`);
    } else if (err.code === 'auth/cancelled-popup-request') {
      // Ignored
    } else {
      alert(`Error al iniciar sesión con ${providerName}: ` + (err.message || err.code));
    }
  }

  // 1. Sign In With Google
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
        console.warn('[auth] Popup failed, attempting redirect:', err);
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          await firebase.auth().signInWithRedirect(provider);
        } else {
          handleAuthError(err, 'Google');
        }
      }
    } catch (err) {
      handleAuthError(err, 'Google');
    } finally {
      setLoginButtonLoading('btnModalGoogle', false);
    }
  };

  // 2. Sign In With WhatsApp / Phone (Name + 10-Digit Phone Number)
  window.loginWithWhatsApp = async function() {
    const nameInp = document.getElementById('loginWaName');
    const phoneInp = document.getElementById('loginWaPhone');
    const statusEl = document.getElementById('loginWaStatus');

    const name = (nameInp ? nameInp.value : '').trim();
    let phone = (phoneInp ? phoneInp.value : '').trim().replace(/\D/g, ''); // Digits only

    if (!name || name.length < 2) {
      if (statusEl) {
        statusEl.textContent = '❌ Por favor escribe tu nombre completo o apodo.';
        statusEl.style.color = 'var(--danger-color)';
      }
      if (nameInp) nameInp.focus();
      return;
    }

    if (!phone || phone.length < 10) {
      if (statusEl) {
        statusEl.textContent = '❌ Por favor escribe tu WhatsApp de 10 dígitos (ej: 5512345678).';
        statusEl.style.color = 'var(--danger-color)';
      }
      if (phoneInp) phoneInp.focus();
      return;
    }

    phone = phone.slice(-10); // Last 10 digits

    if (statusEl) {
      statusEl.textContent = '⏳ Verificando y conectando cuenta...';
      statusEl.style.color = 'var(--accent-color)';
    }

    try {
      const waUid = `wa_${phone}`;
      const avatarUrl = `https://ui-avatars.com/api/?background=25D366&color=fff&bold=true&name=${encodeURIComponent(name)}`;

      // Create or update user profile in Firestore
      if (window.db) {
        await window.db.collection('users').doc(waUid).set({
          uid: waUid,
          displayName: name,
          phoneNumber: phone,
          photoURL: avatarUrl,
          provider: 'whatsapp',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
        }, { merge: true });
      }

      // Store in LocalStorage for session persistence
      const sessionUser = {
        uid: waUid,
        displayName: name,
        phoneNumber: phone,
        photoURL: avatarUrl,
        email: `${phone}@whatsapp.drinksandwins.com`,
        isWhatsApp: true
      };

      localStorage.setItem('bww_wa_session', JSON.stringify(sessionUser));
      localStorage.setItem('player_nick', name.toUpperCase());
      localStorage.setItem('bww_q_name', name.toUpperCase());

      window.currentUser = sessionUser;
      window.isAdmin = false;

      // Update UI Header
      updateHeaderUI(sessionUser);

      if (statusEl) {
        statusEl.textContent = '✅ ¡Bienvenido! Redirigiendo...';
        statusEl.style.color = 'var(--success-color)';
      }

      setTimeout(() => {
        window.hideLoginModal();
        if (pendingAuthAction) {
          const action = pendingAuthAction;
          pendingAuthAction = null;
          action(sessionUser);
        }
        notifyCallbacks();
      }, 400);

    } catch (err) {
      console.error('[auth] WhatsApp login error:', err);
      if (statusEl) {
        statusEl.textContent = 'Error al entrar: ' + err.message;
        statusEl.style.color = 'var(--danger-color)';
      }
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
      if (userName) userName.textContent = user.displayName || user.phoneNumber || user.email;
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
    const btnModalWaSubmit = document.getElementById('btnModalWaSubmit');

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
    if (btnModalWaSubmit) btnModalWaSubmit.addEventListener('click', window.loginWithWhatsApp);

    if (btnSignOut) {
      btnSignOut.addEventListener('click', async () => {
        try {
          localStorage.removeItem('bww_wa_session');
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
        if (confirm(`Sesión iniciada como: ${window.currentUser?.displayName || window.currentUser?.email || window.currentUser?.phoneNumber}\n\n¿Deseas cerrar sesión?`)) {
          localStorage.removeItem('bww_wa_session');
          if (firebase.auth && firebase.auth()) {
            firebase.auth().signOut().then(() => window.location.reload());
          } else {
            window.location.reload();
          }
        }
      });
    }

    // Check saved WhatsApp session first
    const savedWaSession = localStorage.getItem('bww_wa_session');
    if (savedWaSession) {
      try {
        const waUser = JSON.parse(savedWaSession);
        if (waUser && waUser.uid) {
          window.currentUser = waUser;
          authInitialized = true;
          updateHeaderUI(waUser);
          notifyCallbacks();
          return; // WhatsApp user session active
        }
      } catch (e) {}
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
          // If no WhatsApp session either, show login gate
          if (!window.currentUser) {
            window.isAdmin = false;
            updateHeaderUI(null);
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

            // MANDATORY LOGIN ON INITIAL PAGE LOAD
            window.showLoginModal('¡Inicia Sesión para Jugar!', 'Para entrar a los Grids, escoger casillas y ver tus juegos, por favor inicia sesión.');
          }
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
