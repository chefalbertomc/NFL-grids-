// Authentication Module for Drinks & Wins — Google 1-Click Login Gate (v200.0)
(function() {
  'use strict';
  console.log('%c🚀 DRINKS & WINS v200.0 CARGADO EXITOSAMENTE', 'background: #ffd100; color: #000; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 4px;');

  window.currentUser = null;
  window.isAdmin = false;
  let authInitialized = false;
  let isAuthInProgress = false;
  let isGoogleAuthInProgress = false;

  // Immediate hydration from localStorage for instant PWA launch without waiting for network
  try {
    const cachedUserStr = localStorage.getItem('bww_last_auth_user');
    if (cachedUserStr) {
      window.currentUser = JSON.parse(cachedUserStr);
    } else {
      const savedNick = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name');
      let savedId = localStorage.getItem('bww_player_id');
      if (savedNick) {
        if (!savedId) {
          savedId = 'user_' + Math.random().toString(36).substring(2, 11);
          localStorage.setItem('bww_player_id', savedId);
        }
        window.currentUser = {
          uid: savedId,
          displayName: savedNick,
          email: '',
          photoURL: localStorage.getItem('user_custom_avatar') || 'img/logo.jpg'
        };
      }
    }
  } catch (e) {}

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
    authCallbacks.forEach(cb => {
      try {
        cb(window.currentUser, window.isAdmin);
      } catch (e) {
        console.warn('[auth] Callback error:', e);
      }
    });
  }
  window.notifyAuthCallbacks = notifyCallbacks;

  function setLoginButtonLoading(btnId, isLoading, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = `<span style="font-size:18px;">⏳</span> <span style="font-weight:900;">${text || 'Conectando con Google...'}</span>`;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.7';
    } else {
      if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    }
  }

  function handleAuthError(err) {
    if (!err) return;
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      return; // Clean silent return on user dismissing popup
    }
    console.error('[auth] Google sign-in error:', err);
    if (err.code === 'auth/unauthorized-domain') {
      alert('⚠️ Error de Dominio: El dominio actual (' + window.location.hostname + ') no está en la lista de dominios autorizados de Firebase Console (Authentication > Settings > Authorized domains).');
      return;
    }
    if (err.code === 'auth/operation-not-supported-in-this-environment' || (err.message && err.message.includes('disallowed_useragent'))) {
      alert('📱 Aviso: El navegador interno de esta app (ej. WhatsApp/Instagram) bloquea el acceso con Google.\n\n👉 Abre este enlace en Safari o Chrome (tres puntos ⋮ arriba a la derecha) para iniciar sesión con Google.');
      return;
    }
    alert('Error al iniciar sesión: ' + (err.message || err.code));
  }

  // 1-Click Google Sign In
  window.loginWithGoogle = async function(isSwitchAccount = false) {
    if (isGoogleAuthInProgress) return;
    isGoogleAuthInProgress = true;
    console.log('[auth] loginWithGoogle triggered, isSwitchAccount:', isSwitchAccount);
    try {
      if (!window.firebase || !firebase.auth) {
        alert('Firebase aún se está inicializando. Por favor intenta de nuevo en un segundo.');
        return;
      }
      const auth = firebase.auth();
      const provider = new firebase.auth.GoogleAuthProvider();
      if (isSwitchAccount) {
        provider.setCustomParameters({ prompt: 'select_account' });
      }

      setLoginButtonLoading('btnModalGoogle', true, 'Conectando con Google...');

      try {
        const result = await auth.signInWithPopup(provider);
        if (result && result.user) {
          window.currentUser = result.user;
          const userPayload = {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL || 'img/logo.jpg'
          };
          localStorage.setItem('bww_last_auth_user', JSON.stringify(userPayload));
          localStorage.setItem('player_nick', result.user.displayName || '');
          localStorage.setItem('bww_q_name', result.user.displayName || '');
          window.hideLoginModal();
          updateHeaderUI(result.user);
          notifyCallbacks();
          if (pendingAuthAction) {
            const action = pendingAuthAction;
            pendingAuthAction = null;
            action(result.user);
          }
          return;
        }
      } catch (err) {
        if (err.code === 'auth/popup-blocked' || (err.message && err.message.includes('opener'))) {
          alert('📱 Aviso: Tu navegador bloqueó la ventana emergente de Google.\n\n👉 Permite ventanas emergentes en Safari/Chrome o abre el enlace en tu navegador principal.');
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          handleAuthError(err);
        }
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      isGoogleAuthInProgress = false;
      setLoginButtonLoading('btnModalGoogle', false);
    }
  };

  // Switch Account: Signs out and immediately opens Google account chooser
  window.switchGoogleAccount = async function() {
    try {
      if (window.firebase && firebase.auth && firebase.auth()) {
        await firebase.auth().signOut();
      }
    } catch (e) {
      console.warn('[auth] SignOut note:', e);
    }
    window.currentUser = null;
    localStorage.removeItem('bww_last_auth_user');
    window.loginWithGoogle(true);
  };

  // Quick Nickname / Guest Login (100% reliable on WhatsApp, In-App WebViews, and all devices)
  window.loginAsGuest = async function(nickName) {
    if (isAuthInProgress) return;
    isAuthInProgress = true;

    const inp = document.getElementById('inpGuestNick');
    const nick = (nickName || (inp ? inp.value : '')).trim().toUpperCase();

    if (!nick) {
      alert('Por favor escribe tu apodo para continuar.');
      if (inp) inp.focus();
      isAuthInProgress = false;
      return;
    }

    const btn = document.getElementById('btnGuestLogin');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Entrando...'; }

    try {
      if (!window.firebase || !firebase.auth) {
        alert('Firebase aún se está inicializando. Por favor intenta de nuevo.');
        return;
      }

      let user = null;
      try {
        const res = await firebase.auth().signInAnonymously();
        user = res.user;
      } catch (anonErr) {
        console.warn('[auth] signInAnonymously note:', anonErr);
      }

      localStorage.setItem('player_nick', nick);
      localStorage.setItem('bww_q_name', nick);

      if (user) {
        try {
          await user.updateProfile({ displayName: nick });
        } catch (e) {}
        window.currentUser = user;
      } else {
        // Fallback local user representation
        let savedId = localStorage.getItem('bww_player_id');
        if (!savedId) {
          savedId = 'guest_' + Math.random().toString(36).substring(2, 10);
          localStorage.setItem('bww_player_id', savedId);
        }
        window.currentUser = {
          uid: savedId,
          displayName: nick,
          email: '',
          photoURL: 'img/logo.jpg',
          isAnonymous: true
        };
      }

      localStorage.setItem('bww_last_auth_user', JSON.stringify({
        uid: window.currentUser.uid,
        displayName: nick,
        email: window.currentUser.email || '',
        photoURL: window.currentUser.photoURL || 'img/logo.jpg'
      }));

      window.hideLoginModal();
      updateHeaderUI(window.currentUser);

      if (pendingAuthAction) {
        const action = pendingAuthAction;
        pendingAuthAction = null;
        action(window.currentUser);
      }

      notifyCallbacks();
    } catch (err) {
      console.error('[auth] Guest login error:', err);
      alert('Error al acceder: ' + (err.message || err));
    } finally {
      isAuthInProgress = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar ▶'; }
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
    const drawerLoginItem = document.getElementById('drawerLoginItem');
    const drawerLogoutItem = document.getElementById('drawerLogoutItem');

    if (user) {
      const activePhoto = getUserActivePhoto(user);
      if (btnHeaderLogin) btnHeaderLogin.classList.add('hidden');
      if (btnGoogle) btnGoogle.classList.add('hidden');
      if (btnSignOut) btnSignOut.classList.remove('hidden');
      if (userBadge) userBadge.classList.remove('hidden');
      if (userAvatar) userAvatar.src = activePhoto;
      if (userName) userName.textContent = localStorage.getItem('player_nick') || user.displayName || user.email;
      if (drawerLoginItem) drawerLoginItem.classList.add('hidden');
      if (drawerLogoutItem) drawerLogoutItem.classList.remove('hidden');
    } else {
      if (btnHeaderLogin) btnHeaderLogin.classList.remove('hidden');
      if (btnGoogle) btnGoogle.classList.remove('hidden');
      if (btnSignOut) btnSignOut.classList.add('hidden');
      if (userBadge) userBadge.classList.add('hidden');
      if (drawerLoginItem) drawerLoginItem.classList.remove('hidden');
      if (drawerLogoutItem) drawerLogoutItem.classList.add('hidden');
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
    modal.classList.add('active');
  };

  window.toggleUserMenu = window.openUserProfileModal;

  window.closeUserProfileModal = function() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
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
        window._explicitSignOut = true;
        localStorage.removeItem('bww_last_auth_user');
        localStorage.removeItem('user_custom_avatar');
        localStorage.removeItem('player_nick');
        localStorage.removeItem('bww_q_name');
        localStorage.removeItem('bww_player_id');
        window.currentUser = null;
        if (firebase.auth && firebase.auth()) {
          await firebase.auth().signOut();
        }
        window.location.reload();
      } catch (err) {
        console.error('Logout error:', err);
        window.location.reload();
      }
    }
  };
  window.logoutUser = window.logoutFromModal;

  // Force App Update & Cache Purge for PWA / Mobile
  window.forceAppUpdate = async function() {
    if (confirm('¿Deseas forzar la actualización de la App y descargar la última versión?')) {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (e) {
        console.warn('Error purging cache:', e);
      }
      window.location.href = window.location.pathname + '?v=' + Date.now();
    }
  };

  // --- Animated Tutorial Reel Modal Controller (9:16 Format) ---
  const reelSlides = [
    {
      badge: 'Paso 1 de 4',
      title: 'Elige tus <span>Casillas</span>',
      desc: 'El tablero tiene 100 cuadros. Toca las casillas que quieras para apartarlas con tu nombre o foto.',
      render: () => `
        <div class="mini-grid">
          <div class="mini-cell corner">A\\L</div>
          <div class="mini-cell header-top">?</div>
          <div class="mini-cell header-top">?</div>
          <div class="mini-cell header-top">?</div>
          <div class="mini-cell header-top">?</div>
          <div class="mini-cell header-top">?</div>

          <div class="mini-cell header-left">?</div>
          <div class="mini-cell"></div>
          <div class="mini-cell winner" style="font-size:11px !important;">👤</div>
          <div class="mini-cell"></div>
          <div class="mini-cell winner" style="font-size:11px !important;">👤</div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left">?</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left">?</div>
          <div class="mini-cell winner" style="font-size:11px !important;">👤</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left">?</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell winner" style="font-size:11px !important;">👤</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left">?</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
        </div>
        <div style="font-size:11.5px; color:#ffd100; font-weight:800;">🔒 Al inicio los números son secretos (?)</div>
      `
    },
    {
      badge: 'Paso 2 de 4',
      title: 'Sorteo de <span>Números</span>',
      desc: 'Antes del partido, el sistema sortea al azar los números del 0 al 9 en las filas y columnas.',
      render: () => `
        <div class="mini-grid">
          <div class="mini-cell corner">DAL\\ARI</div>
          <div class="mini-cell header-top">8</div>
          <div class="mini-cell header-top highlight-x">3</div>
          <div class="mini-cell header-top">0</div>
          <div class="mini-cell header-top">7</div>
          <div class="mini-cell header-top">4</div>

          <div class="mini-cell header-left">1</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left highlight-y">7</div>
          <div class="mini-cell highlight-y"></div>
          <div class="mini-cell winner" style="font-size:12px !important;">⭐</div>
          <div class="mini-cell highlight-y"></div>
          <div class="mini-cell highlight-y"></div>
          <div class="mini-cell highlight-y"></div>

          <div class="mini-cell header-left">5</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left">2</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left">9</div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
          <div class="mini-cell"></div>
        </div>
        <div style="font-size:11.5px; color:#00e676; font-weight:800;">✨ Cada casilla tiene 2 números asignados</div>
      `
    },
    {
      badge: 'Paso 3 de 4',
      title: 'Regla del <span>Último Dígito</span>',
      desc: 'Solo cuenta el último número del marcador acumulado al final de cada cuarto.',
      render: () => `
        <div class="score-badge">
          <div class="score-team" style="color:#00e676;">
            DAL <span class="score-val" style="background:rgba(0,230,118,0.25); border:1px solid #00e676;">1<strong style="font-size:18px; color:#00e676;">7</strong></span>
          </div>
          <span style="color:var(--text-muted); align-self:center; font-size:11px;">vs</span>
          <div class="score-team" style="color:#ffd100;">
            ARI <span class="score-val" style="background:rgba(255,209,0,0.25); border:1px solid #ffd100;">2<strong style="font-size:18px; color:#ffd100;">3</strong></span>
          </div>
        </div>

        <div style="font-size:12px; color:#ffffff; margin-bottom:10px; line-height:1.3;">
          Tomamos el <strong style="color:#00e676;">7</strong> de Dallas y el <strong style="color:#ffd100;">3</strong> de Arizona.
        </div>

        <div class="mini-grid" style="width:190px; height:190px;">
          <div class="mini-cell corner">DAL\\ARI</div>
          <div class="mini-cell header-top">8</div>
          <div class="mini-cell header-top highlight-x">3</div>
          <div class="mini-cell header-top">0</div>

          <div class="mini-cell header-left">1</div>
          <div class="mini-cell"></div>
          <div class="mini-cell highlight-x"></div>
          <div class="mini-cell"></div>

          <div class="mini-cell header-left highlight-y">7</div>
          <div class="mini-cell highlight-y"></div>
          <div class="mini-cell winner">🏆</div>
          <div class="mini-cell highlight-y"></div>

          <div class="mini-cell header-left">5</div>
          <div class="mini-cell"></div>
          <div class="mini-cell highlight-x"></div>
          <div class="mini-cell"></div>
        </div>
      `
    },
    {
      badge: 'Paso 4 de 4',
      title: '¡4 Premios en <span>Cada Juego</span>!',
      desc: 'Ganas premio en 1Q, Medio Tiempo, 3Q y Final del Partido. ¡Alitas, cerveza y premios!',
      render: () => `
        <div style="display:flex; flex-direction:column; gap:6px; width:100%; max-width:270px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.06); padding:6px 10px; border-radius:8px; border:1px solid rgba(255,209,0,0.3);">
            <span style="font-size:11.5px; font-weight:800;">⏱️ 1er Cuarto (1Q)</span>
            <span style="font-size:11px; font-weight:900; color:#ffd100;">🍺 Premio Q1</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.06); padding:6px 10px; border-radius:8px; border:1px solid rgba(255,209,0,0.3);">
            <span style="font-size:11.5px; font-weight:800;">🍔 Medio Tiempo (Halftime)</span>
            <span style="font-size:11px; font-weight:900; color:#ffd100;">🍗 Premio Q2</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.06); padding:6px 10px; border-radius:8px; border:1px solid rgba(255,209,0,0.3);">
            <span style="font-size:11.5px; font-weight:800;">⏱️ 3er Cuarto (3Q)</span>
            <span style="font-size:11px; font-weight:900; color:#ffd100;">🍹 Premio Q3</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,209,0,0.15); padding:8px 10px; border-radius:8px; border:1.5px solid #ffd100;">
            <span style="font-size:12px; font-weight:900; color:#ffd100;">🏆 Final del Partido</span>
            <span style="font-size:11.5px; font-weight:900; color:#00e676;">💰 PREMIO MAYOR</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary" onclick="window.closeHowToPlayModal()" style="padding:10px; font-size:13px; font-weight:900; border-radius:10px; width:100%; max-width:270px;">
          ¡Entendido! Vamos a Jugar 🏈
        </button>
      `
    }
  ];

  let currentReelIdx = 0;
  let reelProgressInterval = null;
  let reelProgressVal = 0;
  let isReelPlaying = true;
  const REEL_SLIDE_DURATION = 6000;

  function renderReelSlide(idx) {
    const s = reelSlides[idx];
    const stage = document.getElementById('reelModalSlideStage');
    if (!stage) return;

    stage.innerHTML = `
      <div class="reel-badge">${s.badge}</div>
      <h2 class="reel-title">${s.title}</h2>
      <p class="reel-desc">${s.desc}</p>
      ${s.render()}
    `;

    for (let i = 0; i < 4; i++) {
      const fill = document.getElementById(`reelModalFill${i}`);
      if (!fill) continue;
      if (i < idx) fill.style.width = '100%';
      else if (i > idx) fill.style.width = '0%';
      else fill.style.width = `${reelProgressVal}%`;
    }
  }

  function startReelProgressTimer() {
    clearInterval(reelProgressInterval);
    reelProgressVal = 0;
    const stepTime = 50;
    const increment = (stepTime / REEL_SLIDE_DURATION) * 100;

    reelProgressInterval = setInterval(() => {
      if (!isReelPlaying) return;
      reelProgressVal += increment;
      const fill = document.getElementById(`reelModalFill${currentReelIdx}`);
      if (fill) fill.style.width = `${Math.min(reelProgressVal, 100)}%`;

      if (reelProgressVal >= 100) {
        window.nextReelSlide();
      }
    }, stepTime);
  }

  window.nextReelSlide = function() {
    if (currentReelIdx < reelSlides.length - 1) {
      currentReelIdx++;
    } else {
      currentReelIdx = 0;
    }
    reelProgressVal = 0;
    renderReelSlide(currentReelIdx);
    startReelProgressTimer();
  };

  window.prevReelSlide = function() {
    if (currentReelIdx > 0) {
      currentReelIdx--;
    }
    reelProgressVal = 0;
    renderReelSlide(currentReelIdx);
    startReelProgressTimer();
  };

  window.toggleReelPlayPause = function() {
    isReelPlaying = !isReelPlaying;
    const btn = document.getElementById('btnReelModalPlayPause');
    if (btn) btn.textContent = isReelPlaying ? '⏸️' : '▶️';
  };

  window.openHowToPlayModal = function() {
    const modal = document.getElementById('howToPlayModal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
      currentReelIdx = 0;
      isReelPlaying = true;
      renderReelSlide(0);
      startReelProgressTimer();
    }
  };

  window.closeHowToPlayModal = function() {
    const modal = document.getElementById('howToPlayModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      clearInterval(reelProgressInterval);
      localStorage.setItem('has_seen_grid_tutorial', 'true');
    }
  };

  // Global Auth Guard (Never interrupts or forces modal on game actions)
  window.requireUserAuth = function(actionCallback, customTitle, customSubtitle) {
    let active = window.currentUser || (window.firebase && firebase.auth && firebase.auth() ? firebase.auth().currentUser : null);
    if (!active) {
      try {
        const cached = localStorage.getItem('bww_last_auth_user');
        if (cached) active = JSON.parse(cached);
      } catch (e) {}
    }
    if (!active) {
      const savedNick = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name') || 'Socio';
      let savedId = localStorage.getItem('bww_player_id');
      if (!savedId) {
        savedId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('bww_player_id', savedId);
      }
      active = {
        uid: savedId,
        displayName: savedNick,
        email: '',
        photoURL: localStorage.getItem('user_custom_avatar') || 'img/logo.jpg'
      };
      localStorage.setItem('bww_last_auth_user', JSON.stringify(active));
    }

    window.currentUser = active;
    if (typeof actionCallback === 'function') actionCallback(active);
    return true;
  };

  function isInAppBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1) || (ua.indexOf('Instagram') > -1) || (ua.indexOf('WhatsApp') > -1) || (ua.indexOf('Line') > -1) || (ua.indexOf('TikTok') > -1);
  }

  window.showLoginModal = function(customTitle, customSubtitle) {
    const modal = document.getElementById('globalLoginModal');
    const titleEl = document.getElementById('loginModalTitle');
    const subEl = document.getElementById('loginModalSubtitle');
    const warningEl = document.getElementById('inAppBrowserWarning');

    if (titleEl && customTitle) titleEl.textContent = customTitle;
    if (subEl && customSubtitle) subEl.textContent = customSubtitle;
    if (warningEl) {
      warningEl.style.display = isInAppBrowser() ? 'block' : 'none';
    }

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  };

  window.hideLoginModal = function() {
    const modal = document.getElementById('globalLoginModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
    pendingAuthAction = null;
  };

  window.updateHeaderUI = updateHeaderUI;

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

    // Ensure local persistence
    if (firebase.auth && firebase.auth()) {
      try {
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
      } catch (e) {}
    }

    if (btnSignOut) {
      btnSignOut.addEventListener('click', window.logoutFromModal);
    }

    if (userBadge) {
      userBadge.addEventListener('click', window.openUserProfileModal);
    }

    // Immediately reflect hydrated user state in header
    if (window.currentUser) {
      updateHeaderUI(window.currentUser);
    }

    // Check redirect result
    if (firebase.auth && firebase.auth().getRedirectResult) {
      firebase.auth().getRedirectResult().then(result => {
        if (result && result.user) {
          window.currentUser = result.user;
          const userPayload = {
            uid: result.user.uid,
            displayName: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL || 'img/logo.jpg'
          };
          localStorage.setItem('bww_last_auth_user', JSON.stringify(userPayload));
          window.hideLoginModal();
          updateHeaderUI(result.user);
          notifyCallbacks();
        }
      }).catch(err => {
        console.warn('[auth] Redirect result note:', err);
      });
    }

    // Monitor Firebase Auth State
    if (firebase.auth && firebase.auth()) {
      firebase.auth().onAuthStateChanged(async (user) => {
        authInitialized = true;

        if (user) {
          window.currentUser = user;
          const userPayload = {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL || 'img/logo.jpg'
          };
          localStorage.setItem('bww_last_auth_user', JSON.stringify(userPayload));
          window.hideLoginModal();

          // Check if Admin
          try {
            const adminDoc = await window.db.doc('admins/' + user.uid).get();
            window.isAdmin = adminDoc.exists;
          } catch (err) {
            console.error('[auth] Error checking admin status:', err);
            window.isAdmin = false;
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
          // If we had a cached user in localStorage and user did not explicitly sign out, keep the session active
          const cachedUser = localStorage.getItem('bww_last_auth_user');
          if (cachedUser && !window._explicitSignOut) {
            try {
              window.currentUser = JSON.parse(cachedUser);
              updateHeaderUI(window.currentUser);
              notifyCallbacks();
              return;
            } catch (e) {}
          }
          const savedNick = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name');
          let savedId = localStorage.getItem('bww_player_id');
          if (savedNick && !window._explicitSignOut) {
            if (!savedId) {
              savedId = 'user_' + Math.random().toString(36).substring(2, 11);
              localStorage.setItem('bww_player_id', savedId);
            }
            window.currentUser = {
              uid: savedId,
              displayName: savedNick,
              email: '',
              photoURL: localStorage.getItem('user_custom_avatar') || 'img/logo.jpg'
            };
            updateHeaderUI(window.currentUser);
            notifyCallbacks();
            return;
          }
          window.currentUser = null;
          window.isAdmin = false;
          updateHeaderUI(null);
          document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
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
