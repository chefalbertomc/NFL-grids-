// Grids Module for Wings & Wins — Unified Interactive Cards (v63.0)
(function() {
  'use strict';

  let db = null;
  let ALL_GRIDS = [];
  let MY_REGISTRATIONS = {}; // code -> playerDocData
  let SELECTED_GRID_CODE = null;
  let gridsUnsubscribe = null;

  const gridsList = document.getElementById('gridsList');
  const filterStore = document.getElementById('filterStore');
  const joinGridForm = document.getElementById('joinGridForm');
  const selectedGridLabel = document.getElementById('selectedGridLabel');
  const inpNick = document.getElementById('inpGridNick');
  const inpWaiter = document.getElementById('inpGridWaiter');
  const selPack = document.getElementById('selGridPack');
  const btnJoinGrid = document.getElementById('btnJoinGrid');
  const gridJoinStatus = document.getElementById('gridJoinStatus');

  function initGrids() {
    if (window.db) {
      db = window.db;
      setupEventListeners();
      loadGrids();
    } else {
      setTimeout(initGrids, 100);
    }
  }

  function setupEventListeners() {
    if (filterStore) {
      filterStore.addEventListener('change', renderGrids);
    }

    if (btnJoinGrid) {
      btnJoinGrid.addEventListener('click', joinGrid);
    }

    if (window.onAuthChange) {
      window.onAuthChange((user) => {
        if (user && user.displayName && inpNick && !inpNick.value) {
          inpNick.value = user.displayName.toUpperCase();
        }
        loadMyRegistrations().then(renderGrids);
      });
    }
  }

  function loadGrids() {
    if (!db) return;
    if (gridsUnsubscribe) gridsUnsubscribe();

    gridsUnsubscribe = db.collection('games').onSnapshot(async snap => {
      ALL_GRIDS = [];
      const stores = new Set();

      snap.forEach(doc => {
        const d = doc.data() || {};
        const code = String(doc.id || d.code || '').toUpperCase();
        const home = d.homeTeam || d.home || '';
        const away = d.awayTeam || d.away || '';
        
        if (!home || !away || (home.toLowerCase() === 'local' && away.toLowerCase() === 'visitante')) {
          return;
        }
        
        const cells = d.cells || {};
        const cellCount = Object.keys(cells).length;
        const totalSize = d.size || 100;
        const freeCount = typeof d.free !== 'undefined' ? d.free : Math.max(0, totalSize - cellCount);

        ALL_GRIDS.push({
          code: code,
          home: home,
          away: away,
          store: d.store || d.tienda || '',
          locked: !!d.locked,
          cells: cells,
          size: totalSize,
          free: freeCount
        });

        if (d.store || d.tienda) {
          stores.add(d.store || d.tienda);
        }
      });

      // Populate filter dropdown
      if (filterStore) {
        const currentSelection = filterStore.value;
        filterStore.innerHTML = '<option value="">Todas las sucursales</option>';
        stores.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          filterStore.appendChild(opt);
        });
        filterStore.value = currentSelection;
      }

      await loadMyRegistrations();
      renderGrids();

      // Auto-select if URL has ?join=CODE
      const urlJoin = new URLSearchParams(window.location.search).get('join');
      if (urlJoin && ALL_GRIDS.some(x => x.code === urlJoin.toUpperCase())) {
        selectGrid(urlJoin.toUpperCase());
      }
    }, err => {
      console.error('[grids] Realtime listener error:', err);
      if (gridsList) {
        gridsList.innerHTML = `<div class="text-center hint-text py-4">Error al sincronizar: ${err.message}</div>`;
      }
    });
  }

  // Load user registrations for each game
  async function loadMyRegistrations() {
    if (!db) return;
    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    const userUid = activeUser ? activeUser.uid : null;
    const userEmail = activeUser && activeUser.email ? activeUser.email.toLowerCase() : null;

    MY_REGISTRATIONS = {};

    if (!userUid) return;

    for (const g of ALL_GRIDS) {
      try {
        const snap = await db.collection('games').doc(g.code).collection('players').get();
        snap.forEach(doc => {
          const p = doc.data() || {};
          const pId = p.playerId || p.userUid || doc.id;
          const pEmail = (p.userEmail || '').toLowerCase();

          const isMe = (pId === userUid) || (userEmail && pEmail && pEmail === userEmail);
          if (isMe) {
            MY_REGISTRATIONS[g.code] = { docId: doc.id, ...p };
          }
        });
      } catch (e) {}
    }
  }

  function renderGrids() {
    if (!gridsList) return;
    const filter = filterStore ? filterStore.value : '';
    const filtered = ALL_GRIDS.filter(g => !filter || g.store === filter);

    if (filtered.length === 0) {
      gridsList.innerHTML = '<div class="text-center hint-text py-4">— No hay grids disponibles —</div>';
      if (joinGridForm) joinGridForm.style.display = 'none';
      return;
    }

    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;

    gridsList.innerHTML = '';
    filtered.forEach(g => {
      const isSelected = SELECTED_GRID_CODE === g.code;
      const reg = MY_REGISTRATIONS[g.code];
      const isApproved = reg && (reg.status === 'approved' || !!reg.approved);
      const isPending = reg && !isApproved;

      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '16px 18px';
      card.style.margin = '0 0 14px 0';
      card.style.borderRadius = '18px';
      card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
      card.style.transition = 'all 0.25s ease';

      if (isApproved) {
        card.style.border = '2px solid #00e676';
        card.style.background = 'linear-gradient(145deg, rgba(16,32,20,0.95), rgba(10,20,14,0.98))';
      } else if (isPending) {
        card.style.border = '2px solid #ffc107';
        card.style.background = 'linear-gradient(145deg, rgba(35,28,15,0.95), rgba(20,16,8,0.98))';
      } else if (isSelected) {
        card.style.border = '2px solid var(--accent-color)';
        card.style.background = 'rgba(255,209,0,0.06)';
      } else {
        card.style.border = '1px solid var(--border-color)';
        card.style.background = 'var(--card-bg-hover)';
      }

      // Middle Badges Strip
      let badgesHtml = `
        <span class="badge" style="font-weight: 800; letter-spacing: 0.04em;">🔑 ${g.code}</span>
        ${g.store ? `<span class="badge accent">${g.store}</span>` : ''}
        <span class="badge success" style="font-weight: 800;">🟢 Libres: ${g.free}/${g.size || 100}</span>
      `;

      if (g.locked) {
        badgesHtml += `<span class="badge danger" style="font-weight:800;">🔒 Bloqueado</span>`;
      }

      if (isApproved) {
        const taken = Number(reg.taken || 0);
        const quota = Number(reg.quota || reg.pack || 0);
        badgesHtml += `
          <span class="badge" style="background:#00e676; color:#000; font-weight:900;">✅ APROBADO</span>
          <span class="badge" style="background:rgba(255,255,255,0.12); color:#fff; font-weight:800;">👤 ${reg.nickname || reg.name || 'Tú'}</span>
          <span class="badge" style="background:rgba(255,209,0,0.2); color:#ffd100; font-weight:900;">🎯 ${taken}/${quota} Cuadros Usados</span>
        `;
      } else if (isPending) {
        badgesHtml += `
          <span class="badge" style="background:#ffc107; color:#000; font-weight:900;">🟡 ESPERANDO APROBACIÓN</span>
          <span class="badge" style="background:rgba(255,255,255,0.12); color:#fff; font-weight:800;">👤 ${reg.nickname || reg.name || 'Tú'} (${reg.pack || 5} Cuadros)</span>
        `;
      }

      // Bottom Action Button
      let actionButtonHtml = '';
      if (isApproved) {
        const pid = activeUser ? activeUser.uid : (reg.docId || '');
        actionButtonHtml = `
          <a href="player-view.html?code=${g.code}&pid=${encodeURIComponent(pid)}" class="btn btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px 18px; font-size:15px; font-weight:900; border-radius:12px; text-decoration:none; background: linear-gradient(135deg, #ffd100, #ffb300); color: #000; box-shadow: 0 4px 14px rgba(255,209,0,0.3);">
            <span>👁️ Ver Mi Grid & Escoger Casillas</span>
          </a>
        `;
      } else if (isPending) {
        actionButtonHtml = `
          <button class="btn btn-secondary" disabled style="width: 100%; padding: 12px 16px; font-size: 14px; font-weight: 800; border-radius: 12px; opacity: 0.9; background: rgba(255,193,7,0.15); border: 1px solid #ffc107; color: #ffc107; cursor: not-allowed;">
            ⏳ Solicitud Enviada — Esperando Aprobación del Mesero
          </button>
        `;
      } else {
        actionButtonHtml = `
          <button class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'}" data-select-code="${g.code}" style="width: 100%; padding: 12px 16px; font-size: 14px; font-weight: 800; border-radius: 12px;">
            ${isSelected ? '📝 Completar Registro Abajo' : '🏈 Unirse a este Grid'}
          </button>
        `;
      }

      card.innerHTML = `
        <!-- Card Top: Matchup & WhatsApp Share -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">
              <img src="${window.getTeamLogoURL(g.away)}" onerror="this.onerror=null;this.src='img/logo.jpg'" style="width: 28px; height: 28px; object-fit: contain;" alt="${g.away}"/>
              <span style="font-weight: 900; font-size: 16px; color: #fff;">${g.away}</span>
            </div>
            <span style="font-size: 13px; color: var(--accent-color); font-weight: 900;">@</span>
            <div style="display: inline-flex; align-items: center; gap: 6px;">
              <img src="${window.getTeamLogoURL(g.home)}" onerror="this.onerror=null;this.src='img/logo.jpg'" style="width: 28px; height: 28px; object-fit: contain;" alt="${g.home}"/>
              <span style="font-weight: 900; font-size: 16px; color: #fff;">${g.home}</span>
            </div>
          </div>
          <button class="btn btn-secondary" data-share-code="${g.code}" title="Compartir enlace por WhatsApp" style="width: auto; padding: 6px 12px; font-size: 12px; background: rgba(37,211,102,0.12); border: 1px solid #25D366; color: #25D366; display: inline-flex; align-items: center; gap: 4px; border-radius: 10px; flex-shrink: 0; font-weight: 800;">
            💬 WhatsApp
          </button>
        </div>

        <!-- Card Middle: Badges Strip -->
        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 14px;">
          ${badgesHtml}
        </div>

        <!-- Card Bottom: Direct Action Button -->
        <div>
          ${actionButtonHtml}
        </div>
      `;
      gridsList.appendChild(card);
    });

    // Add click listeners to buttons
    gridsList.querySelectorAll('[data-select-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-select-code');
        selectGrid(code);
      });
    });

    gridsList.querySelectorAll('[data-share-code]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.getAttribute('data-share-code');
        shareGridWhatsApp(code);
      });
    });
  }

  function shareGridWhatsApp(code) {
    const g = ALL_GRIDS.find(x => x.code === code);
    const host = window.location.origin + window.location.pathname.replace('admin.html', '').replace('player-view.html', '');
    const joinUrl = `${host}?join=${encodeURIComponent(code)}`;
    const matchName = g ? `${g.away} @ ${g.home}` : 'NFL Grid';
    const text = `🏈 *¡Únete a nuestro Grid de Drinks & Wins!*\n\n🏆 *Partido:* ${matchName}\n🔑 *Código:* ${code}\n\n👉 *Toca aquí para registrarte y escoger tus casillas:*\n${joinUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function selectGrid(code) {
    SELECTED_GRID_CODE = code;
    const g = ALL_GRIDS.find(x => x.code === code);
    if (!g) return;

    renderGrids();

    if (joinGridForm) {
      joinGridForm.style.display = 'block';
      try {
        joinGridForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
      selectedGridLabel.textContent = `Registrarse en: ${g.away} @ ${g.home} (${g.code})`;
      if (gridJoinStatus) gridJoinStatus.textContent = '';
      
      const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
      const savedNick = (activeUser && activeUser.displayName) || localStorage.getItem('player_nick');
      if (savedNick && inpNick) {
        inpNick.value = savedNick.toUpperCase();
      }
    }
  }

  async function joinGrid() {
    if (!SELECTED_GRID_CODE || !db) return;

    // MANDATORY AUTH CHECK: User must be signed in with Google
    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    if (!activeUser) {
      window.requireUserAuth(joinGrid, '¡Inicia Sesión para Registrarte!', 'Para unirte a un Grid y asegurar tus casillas, necesitas iniciar sesión con Google.');
      return;
    }

    const nick = (inpNick ? inpNick.value : '').trim().toUpperCase();
    const waiter = (inpWaiter ? inpWaiter.value : '').trim();
    const pack = Number(selPack ? selPack.value : 5);

    if (!nick) {
      if (gridJoinStatus) {
        gridJoinStatus.textContent = 'Por favor escribe tu apodo.';
        gridJoinStatus.style.color = 'var(--danger-color)';
      }
      if (inpNick) inpNick.focus();
      return;
    }

    if (gridJoinStatus) {
      gridJoinStatus.textContent = 'Verificando y enviando solicitud...';
      gridJoinStatus.style.color = 'var(--text-muted)';
    }

    try {
      // Check if nickname is already registered in this grid by someone else
      const playersSnap = await db.collection('games').doc(SELECTED_GRID_CODE).collection('players').get();
      let nickTaken = false;
      playersSnap.forEach(doc => {
        const d = doc.data() || {};
        const pNick = (d.nickname || d.name || '').trim().toUpperCase();
        if (pNick === nick && d.playerId !== activeUser.uid && d.userUid !== activeUser.uid && doc.id !== activeUser.uid) {
          nickTaken = true;
        }
      });

      if (nickTaken) {
        if (gridJoinStatus) {
          gridJoinStatus.textContent = `❌ El apodo "${nick}" ya está ocupado en este juego por otro jugador. Elige otro.`;
          gridJoinStatus.style.color = 'var(--danger-color)';
        }
        return;
      }

      const grid = ALL_GRIDS.find(x => x.code === SELECTED_GRID_CODE);
      
      const playerRef = db.collection('games').doc(SELECTED_GRID_CODE).collection('players').doc(activeUser.uid);
      localStorage.setItem('bww_player_id', activeUser.uid);
      localStorage.setItem('player_nick', nick);

      const playerData = {
        id: activeUser.uid,
        playerId: activeUser.uid,
        userUid: activeUser.uid,
        userEmail: activeUser.email || '',
        userName: activeUser.displayName || nick,
        name: nick,
        nickname: nick,
        waiter: waiter || 'Sin mesero',
        pack: pack,
        quota: pack,
        taken: 0,
        picks: [],
        approved: false,
        status: 'pending',
        store: grid ? grid.store : '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      };

      await playerRef.set(playerData, { merge: true });

      MY_REGISTRATIONS[SELECTED_GRID_CODE] = { docId: activeUser.uid, ...playerData };

      if (gridJoinStatus) {
        gridJoinStatus.textContent = '✅ ¡Solicitud enviada! Espera a que el mesero o administrador te apruebe.';
        gridJoinStatus.style.color = 'var(--success-color)';
      }
      
      alert(`¡Solicitud enviada exitosamente para ${nick}! En cuanto te apruebe el mesero o administrador el botón cambiará a "Ver Mi Grid" para que escojas tus cuadros.`);
      
      if (joinGridForm) joinGridForm.style.display = 'none';
      if (inpWaiter) inpWaiter.value = '';

      renderGrids();
    } catch (err) {
      console.error('[grids] Error joining grid:', err);
      if (gridJoinStatus) {
        gridJoinStatus.textContent = 'Error al unirte: ' + err.message;
        gridJoinStatus.style.color = 'var(--danger-color)';
      }
    }
  }

  // Refresh when user returns to app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadGrids();
    }
  });

  initGrids();
})();
