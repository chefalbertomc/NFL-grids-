// Authentication Module for Drinks & Wins — Google 1-Click Login Gate (v78.0)
(function() {
  'use strict';

  window.currentUser = null;
  window.isAdmin = false;
  let authInitialized = false;

  const authCallbacks = [];
  let pendingAuthAction = null;
  let tempCroppedPhotoData = null;

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

  function getUserActivePhoto(user) {
    if (!user) return 'img/logo.jpg';
    return localStorage.getItem('user_custom_avatar') || user.photoURL || 'img/logo.jpg';
  }

  function updateHeaderUI(user) {
    const btnHeaderLogin = document.getElementById('btnHeaderLogin');
    const btnGoogle = document.getElementById('btnGoogle');
    const btnSignOut = document.getElementById('btnSignOut');
    const userBadge = document.getElementById('userBadge');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (user) {
      const activePhoto = getUserActivePhoto(user);
      if (btnHeaderLogin) btnHeaderLogin.classList.add('hidden');
      if (btnGoogle) btnGoogle.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.remove('hidden');
      if (userBadge) userBadge.classList.remove('hidden');
      if (userAvatar) userAvatar.src = activePhoto;
      if (userName) userName.textContent = user.displayName || user.email;
    } else {
      if (btnHeaderLogin) btnHeaderLogin.classList.remove('hidden');
      if (btnGoogle) btnGoogle.classList.remove('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (userBadge) userBadge.classList.add('hidden');
    }
  }

  // --- Direct User Profile & Photo Uploader Modal ---
  window.openUserProfileModal = function(e) {
    if (e) e.stopPropagation();
    if (!window.currentUser) {
      window.showLoginModal();
      return;
    }

    const modal = document.getElementById('userProfileModal');
    if (!modal) return;

    const user = window.currentUser;
    const photo = getUserActivePhoto(user);
    const name = user.displayName || 'Usuario';
    const email = user.email || '';

    const preview = document.getElementById('userModalPhotoPreview');
    const nameEl = document.getElementById('userModalDisplayName');
    const emailEl = document.getElementById('userModalEmail');

    if (preview) preview.src = photo;
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
    tempCroppedPhotoData = null;

    modal.style.display = 'flex';
  };

  window.toggleUserMenu = window.openUserProfileModal;

  window.closeUserProfileModal = function() {
    const modal = document.getElementById('userProfileModal');
    if (modal) modal.style.display = 'none';
  };

  // Image compressor & reader from Camera / Gallery
  window.handleUserPhotoSelected = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        // Resize & compress on Canvas to crisp 160x160 circle avatar
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        tempCroppedPhotoData = compressedDataUrl;
        const preview = document.getElementById('userModalPhotoPreview');
        if (preview) preview.src = compressedDataUrl;
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.saveUserPhotoModal = async function() {
    const preview = document.getElementById('userModalPhotoPreview');
    const photoToSave = tempCroppedPhotoData || (preview ? preview.src : '');

    if (!photoToSave) {
      alert('Por favor selecciona una foto de tu celular.');
      return;
    }

    const btn = document.getElementById('btnSaveUserPhoto');
    if (btn) { btn.textContent = 'Guardando...'; btn.disabled = true; }

    try {
      localStorage.setItem('user_custom_avatar', photoToSave);

      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) userAvatar.src = photoToSave;

      window.closeUserProfileModal();

      // Update in active game if currently on player-view.html
      const params = new URLSearchParams(window.location.search);
      const code = (params.get('code') || params.get('game') || '').toUpperCase();
      const user = window.currentUser;

      if (code && user && window.db) {
        try {
          await window.db.collection('games').doc(code).collection('players').doc(user.uid).update({
            userPhoto: photoToSave
          });
        } catch (err) {
          console.warn('Firestore player photo update note:', err);
        }
      }

      window.location.reload();
    } catch (err) {
      console.error('Error saving photo:', err);
      alert('Error al guardar foto: ' + err.message);
    } finally {
      if (btn) { btn.textContent = '💾 Guardar Mi Foto'; btn.disabled = false; }
    }
  };

  window.resetUserToGooglePhoto = async function() {
    const user = window.currentUser;
    const googlePhoto = user && user.photoURL ? user.photoURL : 'img/logo.jpg';
    localStorage.removeItem('user_custom_avatar');

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = googlePhoto;

    window.closeUserProfileModal();

    const params = new URLSearchParams(window.location.search);
    const code = (params.get('code') || params.get('game') || '').toUpperCase();
    if (code && user && window.db) {
      try {
        await window.db.collection('games').doc(code).collection('players').doc(user.uid).update({
          userPhoto: googlePhoto
        });
      } catch (e) {}
    }

    window.location.reload();
  };

  window.logoutFromModal = async function() {
    window.closeUserProfileModal();
    if (confirm('¿Deseas cerrar sesión de Drinks & Wins?')) {
      try {
        if (firebase.auth && firebase.auth()) {
          await firebase.auth().signOut();
        }
        localStorage.removeItem('user_custom_avatar');
        window.location.reload();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
  };

  // --- How To Play Modal Controller ---
  window.openHowToPlayModal = function() {
    const modal = document.getElementById('howToPlayModal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeHowToPlayModal = function() {
    const modal = document.getElementById('howToPlayModal');
    if (modal) modal.style.display = 'none';
  };

  window.switchHowToPlayTab = function(tabKey) {
    const btnQuick = document.getElementById('tabBtnQuickGuide');
    const btnFull = document.getElementById('tabBtnFullRules');
    const contentQuick = document.getElementById('howToPlayContentQuick');
    const contentFull = document.getElementById('howToPlayContentFull');

    if (tabKey === 'quick') {
      if (btnQuick) { btnQuick.style.background = '#ffd100'; btnQuick.style.color = '#000'; btnQuick.style.fontWeight = '900'; }
      if (btnFull) { btnFull.style.background = 'transparent'; btnFull.style.color = '#ffffff'; btnFull.style.fontWeight = '800'; }
      if (contentQuick) contentQuick.style.display = 'block';
      if (contentFull) contentFull.style.display = 'none';
    } else {
      if (btnQuick) { btnQuick.style.background = 'transparent'; btnQuick.style.color = '#ffffff'; btnQuick.style.fontWeight = '800'; }
      if (btnFull) { btnFull.style.background = '#ffd100'; btnFull.style.color = '#000'; btnFull.style.fontWeight = '900'; }
      if (contentQuick) contentQuick.style.display = 'none';
      if (contentFull) contentFull.style.display = 'block';
    }
  };

  // Global Auth Guard
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
    const btnHeaderLogin = document.getElementById('btnHeaderLogin');
    const btnGoogle = document.getElementById('btnGoogle');
    const btnSignOut = document.getElementById('btnSignOut');
    const userBadge = document.getElementById('userBadge');

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
      btnSignOut.addEventListener('click', window.logoutFromModal);
    }

    if (userBadge) {
      userBadge.addEventListener('click', window.openUserProfileModal);
    }

    // Check redirect result
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

          // Request Web Push Notification Permission so players get instant alerts
          if ('Notification' in window && Notification.permission === 'default') {
            try {
              Notification.requestPermission();
            } catch (e) {}
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
