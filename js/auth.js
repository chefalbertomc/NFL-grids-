// Authentication Module for Drinks & Wins — Google 1-Click Login Gate (v77.0)
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

  // --- Clean User Profile Menu Dropdown ---
  window.toggleUserMenu = function(e) {
    if (e) e.stopPropagation();
    let menu = document.getElementById('userProfileMenuDropdown');
    if (menu) {
      menu.remove();
      return;
    }
    if (!window.currentUser) {
      window.showLoginModal();
      return;
    }

    const user = window.currentUser;
    const userPhoto = getUserActivePhoto(user);
    const name = user.displayName || 'Usuario';
    const email = user.email || '';

    menu = document.createElement('div');
    menu.id = 'userProfileMenuDropdown';
    menu.className = 'user-profile-menu-dropdown';
    menu.innerHTML = `
      <div class="user-profile-menu-header">
        <img src="${userPhoto}" class="user-profile-menu-avatar" alt="Avatar" onerror="this.onerror=null;this.src='img/logo.jpg'" />
        <div style="flex:1; min-width:0;">
          <div style="font-weight:900; font-size:13px; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
          <div style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${email}</div>
        </div>
      </div>
      <button type="button" class="user-profile-menu-item" onclick="window.openPhotoUploaderModal(event)">
        📷 Cambiar Foto de Perfil
      </button>
      <button type="button" class="user-profile-menu-item danger" onclick="window.logoutUser(event)">
        🚪 Cerrar Sesión
      </button>
    `;

    const target = (e && e.currentTarget) ? e.currentTarget : (document.getElementById('userBadge') || document.body);
    if (target && target.style) {
      target.style.position = 'relative';
      target.appendChild(menu);
    } else {
      document.body.appendChild(menu);
    }

    setTimeout(() => {
      window.addEventListener('click', closeUserMenuOnClickOutside);
    }, 10);
  };

  function closeUserMenuOnClickOutside(e) {
    const menu = document.getElementById('userProfileMenuDropdown');
    if (menu && !menu.contains(e.target)) {
      menu.remove();
      window.removeEventListener('click', closeUserMenuOnClickOutside);
    }
  }

  window.logoutUser = async function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('userProfileMenuDropdown');
    if (menu) menu.remove();

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

  // --- Real Photo Uploader / Camera & Gallery Picker Modal ---
  let tempCroppedPhotoData = null;

  window.openPhotoUploaderModal = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('userProfileMenuDropdown');
    if (menu) menu.remove();

    let modal = document.getElementById('photoUploaderModalGlobal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'photoUploaderModalGlobal';
      modal.className = 'login-modal-overlay';
      modal.innerHTML = `
        <div class="login-modal-card" style="max-width: 400px; text-align: center;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:16px; font-weight:900; color:#ffd100;">📷 Cambiar Foto de Perfil</h3>
            <button type="button" class="login-modal-close" onclick="document.getElementById('photoUploaderModalGlobal').style.display='none'">✕</button>
          </div>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Sube cualquier foto desde tu galería o cámara para tus casillas.</p>

          <!-- Photo Circular Preview Frame -->
          <div style="position:relative; width:90px; height:90px; margin:0 auto 16px auto;">
            <img id="photoUploadPreviewImg" src="img/logo.jpg" alt="Preview" style="width:90px; height:90px; border-radius:50%; object-fit:cover; border:3px solid #ffd100; box-shadow:0 0 16px rgba(255,209,0,0.4);" />
          </div>

          <!-- Hidden File Input -->
          <input type="file" id="inpPhotoFileInput" accept="image/*" style="display:none;" onchange="window.handlePhotoFileSelected(event)" />

          <!-- Action Button: Choose Photo from Gallery / Camera -->
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('inpPhotoFileInput').click()" style="width:100%; padding:12px; font-size:13px; font-weight:900; border-radius:12px; background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.25); color:#ffffff; display:inline-flex; align-items:center; justify-content:center; gap:8px; margin-bottom:14px;">
            📁 Elegir Foto de mi Celular o Cámara
          </button>

          <!-- Save and Restore Buttons -->
          <div style="display:flex; gap:8px;">
            <button type="button" id="btnSaveUploadedPhoto" class="btn btn-primary" onclick="window.saveUploadedPhoto()" style="flex:1; padding:11px; font-size:13px; font-weight:900; border-radius:10px;">
              💾 Guardar Mi Foto
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.resetToGooglePhoto()" style="width:auto; padding:11px 14px; font-size:12px; font-weight:800; border-radius:10px;" title="Restaurar foto original de Google">
              Google
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const user = window.currentUser;
    const currentPhoto = getUserActivePhoto(user);
    const previewImg = document.getElementById('photoUploadPreviewImg');
    if (previewImg) previewImg.src = currentPhoto;
    tempCroppedPhotoData = null;

    modal.style.display = 'flex';
  };

  // Image compressor & reader
  window.handlePhotoFileSelected = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        // Resize & compress on Canvas to max 160x160
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
        const previewImg = document.getElementById('photoUploadPreviewImg');
        if (previewImg) previewImg.src = compressedDataUrl;
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  };

  window.saveUploadedPhoto = async function() {
    const previewImg = document.getElementById('photoUploadPreviewImg');
    const photoToSave = tempCroppedPhotoData || (previewImg ? previewImg.src : '');

    if (!photoToSave) {
      alert('Por favor selecciona una foto de tu celular.');
      return;
    }

    const btn = document.getElementById('btnSaveUploadedPhoto');
    if (btn) { btn.textContent = 'Guardando...'; btn.disabled = true; }

    try {
      localStorage.setItem('user_custom_avatar', photoToSave);

      const userAvatar = document.getElementById('userAvatar');
      if (userAvatar) userAvatar.src = photoToSave;

      const modal = document.getElementById('photoUploaderModalGlobal');
      if (modal) modal.style.display = 'none';

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

  window.resetToGooglePhoto = async function() {
    const user = window.currentUser;
    const googlePhoto = user && user.photoURL ? user.photoURL : 'img/logo.jpg';
    localStorage.removeItem('user_custom_avatar');

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = googlePhoto;

    const modal = document.getElementById('photoUploaderModalGlobal');
    if (modal) modal.style.display = 'none';

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
      btnSignOut.addEventListener('click', window.logoutUser);
    }

    if (userBadge) {
      userBadge.addEventListener('click', window.toggleUserMenu);
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
