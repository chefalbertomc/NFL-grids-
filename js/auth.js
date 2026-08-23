// Authentication Module for Wings & Wins — Google 1-Click Login Gate (v73.0)
(function() {
  'use strict';

  window.currentUser = null;
  window.isAdmin = false;
  let authInitialized = false;

  const authCallbacks = [];
  let pendingAuthAction = null;

  const AVATAR_PRESETS = [
    { name: '🏈 Balón', url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=150&auto=format&fit=crop&q=80' },
    { name: '🏆 Trofeo', url: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=150&auto=format&fit=crop&q=80' },
    { name: '🍺 Cerveza', url: 'https://images.unsplash.com/photo-1608270199182-3d75fb513a96?w=150&auto=format&fit=crop&q=80' },
    { name: '🍗 Alitas', url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=150&auto=format&fit=crop&q=80' },
    { name: '🛡️ Casco', url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=150&auto=format&fit=crop&q=80' },
    { name: '🔥 Fuego', url: 'https://images.unsplash.com/photo-1520110120835-c965c4731b84?w=150&auto=format&fit=crop&q=80' },
    { name: '👑 Corona', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80' },
    { name: '🍻 Drinks', url: 'img/logo.jpg' }
  ];

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
      const customPhoto = localStorage.getItem('user_custom_avatar') || user.photoURL || 'img/logo.jpg';
      if (btnHeaderLogin) btnHeaderLogin.classList.add('hidden');
      if (btnGoogle) btnGoogle.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.remove('hidden');
      if (userBadge) userBadge.classList.remove('hidden');
      if (userAvatar) userAvatar.src = customPhoto;
      if (userName) userName.textContent = user.displayName || user.email;
    } else {
      if (btnHeaderLogin) btnHeaderLogin.classList.remove('hidden');
      if (btnGoogle) btnGoogle.classList.remove('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (userBadge) userBadge.classList.add('hidden');
    }
  }

  // --- Rich User Profile Menu Dropdown ---
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
    const currentPhoto = localStorage.getItem('user_custom_avatar') || user.photoURL || 'img/logo.jpg';
    const name = user.displayName || 'Usuario';
    const email = user.email || '';

    menu = document.createElement('div');
    menu.id = 'userProfileMenuDropdown';
    menu.className = 'user-profile-menu-dropdown';
    menu.innerHTML = `
      <div class="user-profile-menu-header">
        <img src="${currentPhoto}" class="user-profile-menu-avatar" alt="Avatar" onerror="this.onerror=null;this.src='img/logo.jpg'" />
        <div style="flex:1; min-width:0;">
          <div style="font-weight:900; font-size:13px; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
          <div style="font-size:11px; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${email}</div>
        </div>
      </div>
      <button type="button" class="user-profile-menu-item" onclick="window.openAvatarPickerModal(event)">
        📷 Cambiar Foto / Avatar
      </button>
      <button type="button" class="user-profile-menu-item danger" onclick="window.logoutUser(event)">
        🚪 Cerrar Sesión
      </button>
    `;

    // Anchor to target or body
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

  // --- Global Avatar Picker Modal ---
  window.openAvatarPickerModal = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('userProfileMenuDropdown');
    if (menu) menu.remove();

    let modal = document.getElementById('avatarPickerModalGlobal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'avatarPickerModalGlobal';
      modal.className = 'login-modal-overlay';
      modal.innerHTML = `
        <div class="login-modal-card" style="max-width: 420px; text-align: left;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:16px; font-weight:900; color:#ffd100;">📷 Elige tu Foto / Avatar</h3>
            <button type="button" class="login-modal-close" onclick="document.getElementById('avatarPickerModalGlobal').style.display='none'">✕</button>
          </div>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">Esta imagen aparecerá en tu perfil y dentro de tus casillas en el tablero.</p>

          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; padding:10px; background:rgba(255,255,255,0.04); border-radius:12px; border:1px solid rgba(255,255,255,0.1);">
            <img id="avatarGlobalCurrentPreview" src="img/logo.jpg" alt="Preview" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #ffd100;" />
            <div>
              <div style="font-size:13px; font-weight:800; color:#ffffff;" id="avatarGlobalPreviewNick">Mi Avatar</div>
              <div style="font-size:11px; color:var(--text-muted);">Foto activa en tu cuenta</div>
            </div>
          </div>

          <div style="font-size:11px; font-weight:800; color:#ffd100; text-transform:uppercase; margin-bottom:8px;">Avatars Disponibles:</div>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:16px;" id="avatarGlobalPresetsGrid"></div>

          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-size:11px; font-weight:700; color:var(--text-muted);">O pega un enlace de imagen (URL):</label>
            <input type="url" id="inpGlobalCustomAvatarUrl" placeholder="https://ejemplo.com/mifoto.jpg" style="font-size:12px; padding:8px 10px; border-radius:8px;" />
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-primary" onclick="window.saveGlobalCustomAvatar()" style="flex:1; padding:10px; font-size:13px; font-weight:900; border-radius:10px;">
              💾 Guardar Avatar
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.resetGlobalToGoogleAvatar()" style="width:auto; padding:10px 12px; font-size:12px; font-weight:800; border-radius:10px;" title="Restaurar foto original de Google">
              Google
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const user = window.currentUser;
    const currentPhoto = localStorage.getItem('user_custom_avatar') || (user && user.photoURL) || 'img/logo.jpg';
    const previewImg = document.getElementById('avatarGlobalCurrentPreview');
    const previewNick = document.getElementById('avatarGlobalPreviewNick');
    const presetsGrid = document.getElementById('avatarGlobalPresetsGrid');
    const inpUrl = document.getElementById('inpGlobalCustomAvatarUrl');

    if (previewImg) previewImg.src = currentPhoto;
    if (previewNick) previewNick.textContent = (user && user.displayName) || 'Mi Avatar';
    if (inpUrl) inpUrl.value = '';

    if (presetsGrid) {
      presetsGrid.innerHTML = '';
      AVATAR_PRESETS.forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'text-align:center; cursor:pointer; padding:6px; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid rgba(255,255,255,0.08); transition:all 0.2s;';
        item.innerHTML = `
          <img src="${p.url}" alt="${p.name}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(255,255,255,0.2);" />
          <div style="font-size:9.5px; color:var(--text-muted); margin-top:4px; font-weight:700;">${p.name}</div>
        `;
        item.addEventListener('click', () => {
          if (previewImg) previewImg.src = p.url;
          if (inpUrl) inpUrl.value = p.url;
        });
        presetsGrid.appendChild(item);
      });
    }

    modal.style.display = 'flex';
  };

  window.saveGlobalCustomAvatar = async function() {
    const previewImg = document.getElementById('avatarGlobalCurrentPreview');
    const inpUrl = document.getElementById('inpGlobalCustomAvatarUrl');
    const chosenUrl = (inpUrl && inpUrl.value.trim()) || (previewImg ? previewImg.src : '');

    if (!chosenUrl) return;

    localStorage.setItem('user_custom_avatar', chosenUrl);

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = chosenUrl;

    const modal = document.getElementById('avatarPickerModalGlobal');
    if (modal) modal.style.display = 'none';

    // If on player-view.html, update in Firestore
    const params = new URLSearchParams(window.location.search);
    const code = (params.get('code') || params.get('game') || '').toUpperCase();
    const user = window.currentUser;
    if (code && user && window.db) {
      try {
        await window.db.collection('games').doc(code).collection('players').doc(user.uid).update({
          userPhoto: chosenUrl
        });
      } catch (e) {}
    }

    window.location.reload();
  };

  window.resetGlobalToGoogleAvatar = async function() {
    const user = window.currentUser;
    const googlePhoto = user && user.photoURL ? user.photoURL : 'img/logo.jpg';
    localStorage.removeItem('user_custom_avatar');

    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = googlePhoto;

    const modal = document.getElementById('avatarPickerModalGlobal');
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
