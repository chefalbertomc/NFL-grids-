// Grids Module for Wings & Wins
(function() {
  'use strict';

  let db = null;
  let user = null;
  let ALL_GRIDS = [];
  let SELECTED_GRID_CODE = null;

  // DOM Elements
  const gridsList = document.getElementById('gridsList');
  const myGridsList = document.getElementById('myGridsList');
  const filterStore = document.getElementById('filterStore');
  const joinGridForm = document.getElementById('joinGridForm');
  const selectedGridLabel = document.getElementById('selectedGridLabel');
  const gridJoinStatus = document.getElementById('gridJoinStatus');
  
  const inpNick = document.getElementById('inpGridNick');
  const inpTable = document.getElementById('inpGridTable');
  const inpWaiter = document.getElementById('inpGridWaiter');
  const selPack = document.getElementById('selGridPack');
  const btnJoinGrid = document.getElementById('btnJoinGrid');

  // Check if Firebase is ready
  function initGrids() {
    if (window.db) {
      db = window.db;
      setupListeners();
      loadGrids();
    } else {
      setTimeout(initGrids, 100);
    }
  }

  function setupListeners() {
    // Watch Auth State Changes
    window.onAuthChange((currentUser, isAdmin) => {
      user = currentUser;
      if (user) {
        loadMyGrids();
      } else {
        if (myGridsList) {
          myGridsList.innerHTML = '<div class="text-center hint-text">Inicia sesión con Google para ver tus grids.</div>';
        }
      }
      loadGrids(); // Reload grid actions based on auth status
    });

    if (filterStore) {
      filterStore.addEventListener('change', renderGrids);
    }

    if (btnJoinGrid) {
      btnJoinGrid.addEventListener('click', joinGrid);
    }
  }

  async function loadGrids() {
    if (!db) return;
    try {
      let snap;
      try {
        snap = await db.collection('games').orderBy('createdAt', 'desc').get();
      } catch (err) {
        // Fallback if index is not ready
        snap = await db.collection('games').get();
      }

      ALL_GRIDS = [];
      const stores = new Set();

      snap.forEach(doc => {
        const d = doc.data() || {};
        const code = String(doc.id || d.code || '').toUpperCase();
        if (!code) return;
        const free = 100 - Object.keys(d.cells || {}).length;
        
        ALL_GRIDS.push({
          code: code,
          home: d.homeTeam || d.home || 'Local',
          away: d.awayTeam || d.away || 'Visitante',
          store: d.store || d.tienda || '',
          locked: !!d.locked,
          free: free
        });

        if (d.store || d.tienda) {
          stores.add(d.store || d.tienda);
        }
      });

      // Populate filter
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

      renderGrids();
      await loadMyGrids();

      // Check if URL has ?join=CODE
      const urlJoin = new URLSearchParams(window.location.search).get('join');
      if (urlJoin && ALL_GRIDS.some(x => x.code === urlJoin.toUpperCase())) {
        selectGrid(urlJoin.toUpperCase());
      }
    } catch (e) {
      console.error('[grids] Error loading grids:', e);
      if (gridsList) {
        gridsList.innerHTML = `<div class="text-center hint-text py-4">Error al cargar grids: ${e.message}</div>`;
      }
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

    gridsList.innerHTML = '';
    filtered.forEach(g => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '12px 16px';
      card.style.margin = '0 0 8px 0';
      card.style.background = 'var(--card-bg-hover)';
      card.style.borderColor = SELECTED_GRID_CODE === g.code ? 'var(--accent-color)' : 'var(--border-color)';
      
      card.innerHTML = `
        <div class="flex-between">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              <img src="${window.getTeamLogoURL(g.away)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${g.away}"/>
              <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${g.away}</span>
              <span style="font-size: 12px; color: var(--text-muted); font-weight: bold;">@</span>
              <img src="${window.getTeamLogoURL(g.home)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${g.home}"/>
              <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${g.home}</span>
            </div>
            <div style="margin-top: 4px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span class="badge">${g.code}</span>
              ${g.store ? `<span class="badge accent">${g.store}</span>` : ''}
              <span class="badge success">Libres: ${g.free}</span>
              ${g.locked ? '<span class="badge danger">Bloqueado</span>' : ''}
            </div>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
            <button class="btn btn-secondary" data-share-code="${g.code}" title="Compartir enlace de registro por WhatsApp" style="width: auto; padding: 6px 10px; font-size: 12px; background: rgba(37,211,102,0.12); border: 1px solid #25D366; color: #25D366; display: inline-flex; align-items: center; gap: 4px;">
              💬 WhatsApp
            </button>
            <a href="player-view.html?code=${g.code}" class="btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 13px; text-decoration: none;">
              👁️ Ver Tablero
            </a>
            <button class="btn btn-primary" data-select-code="${g.code}" style="width: auto; padding: 6px 12px; font-size: 13px;">
              ${SELECTED_GRID_CODE === g.code ? 'Seleccionado' : 'Unirse'}
            </button>
          </div>
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

    // Redraw grids list to show selected state border
    renderGrids();

    if (joinGridForm) {
      joinGridForm.style.display = 'block';
      try {
        joinGridForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
      selectedGridLabel.textContent = `Registrarse en: ${g.away} @ ${g.home} (${g.code})`;
      if (gridJoinStatus) gridJoinStatus.textContent = '';
      
      // Auto-fill nick from localStorage if available
      const savedNick = localStorage.getItem('player_nick');
      if (savedNick && inpNick) {
        inpNick.value = savedNick;
      }
    }
  }

  async function joinGrid() {
    if (!SELECTED_GRID_CODE || !db) return;

    const nick = (inpNick ? inpNick.value : '').trim();
    const table = (inpTable ? inpTable.value : '').trim();
    const waiter = (inpWaiter ? inpWaiter.value : '').trim();
    const pack = Number(selPack ? selPack.value : 5);

    if (!nick) {
      if (gridJoinStatus) {
        gridJoinStatus.textContent = 'Por favor escribe tu apodo.';
        gridJoinStatus.style.color = 'var(--danger-color)';
      }
      return;
    }

    if (gridJoinStatus) {
      gridJoinStatus.textContent = 'Enviando solicitud...';
      gridJoinStatus.style.color = 'var(--text-muted)';
    }

    try {
      if (window.ensurePlayerAuth) {
        await window.ensurePlayerAuth();
      }

      const activeUser = firebase.auth() ? firebase.auth().currentUser : null;
      const grid = ALL_GRIDS.find(x => x.code === SELECTED_GRID_CODE);
      
      // Auto-generate a unique document ID for this registration so no player ever overwrites another
      const playerRef = db.collection('games').doc(SELECTED_GRID_CODE).collection('players').doc();
      const pDocId = playerRef.id;
      localStorage.setItem('bww_player_id', pDocId);

      await playerRef.set({
        id: pDocId,
        playerId: activeUser ? activeUser.uid : pDocId,
        name: nick,
        nickname: nick,
        table: table,
        waiter: waiter,
        pack: pack,
        quota: pack,
        taken: 0,
        picks: [],
        approved: false,
        status: 'pending',
        store: grid ? grid.store : '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      });

      localStorage.setItem('player_nick', nick);
      if (gridJoinStatus) {
        gridJoinStatus.textContent = '¡Solicitud enviada! Espera a que el mesero o administrador te apruebe.';
        gridJoinStatus.style.color = 'var(--success-color)';
      }
      alert(`¡Solicitud enviada exitosamente para ${nick}! Ahora revisa la pantalla de Admin para aprobarla.`);
      
      if (inpTable) inpTable.value = '';
      if (inpWaiter) inpWaiter.value = '';

      loadMyGrids(); // Refresh player's grids list
    } catch (err) {
      console.error('[grids] Error joining grid:', err);
      if (gridJoinStatus) {
        gridJoinStatus.textContent = 'Error al unirte: ' + err.message;
        gridJoinStatus.style.color = 'var(--danger-color)';
      }
    }
  }

  // Fetch grids where player has an approved registration
  async function loadMyGrids() {
    if (!db || !myGridsList) return;

    let savedNick = (localStorage.getItem('player_nick') || '').trim();
    const savedPlayerId = localStorage.getItem('bww_player_id');
    const userUid = user ? user.uid : null;

    if (!savedNick && !savedPlayerId && !userUid) {
      myGridsList.innerHTML = `
        <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 14px; padding: 16px; text-align: center;">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">
            🔍 ¿Ya tienes registro o fuiste aprobado? Escribe tu apodo:
          </div>
          <div style="display: flex; gap: 8px; justify-content: center; max-width: 340px; margin: 0 auto; flex-wrap: wrap;">
            <input type="text" id="inpMyNickSearch" placeholder="Tu Apodo (ej. BETO)" style="margin: 0; padding: 8px 12px; font-size: 13px; border-radius: 10px; flex: 1; min-width: 140px;" />
            <button id="btnMyNickSearch" class="btn btn-primary" style="width: auto; padding: 8px 16px; font-size: 13px;">Buscar</button>
          </div>
        </div>
      `;

      const inpSearch = document.getElementById('inpMyNickSearch');
      const btnSearch = document.getElementById('btnMyNickSearch');
      if (btnSearch && inpSearch) {
        btnSearch.addEventListener('click', () => {
          const val = inpSearch.value.trim();
          if (val) {
            localStorage.setItem('player_nick', val);
            loadMyGrids();
          }
        });
        inpSearch.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            const val = inpSearch.value.trim();
            if (val) {
              localStorage.setItem('player_nick', val);
              loadMyGrids();
            }
          }
        });
      }
      return;
    }

    try {
      const activeRegistrations = [];
      const matchNickLower = savedNick.toLowerCase();

      // Scan all active games
      for (const g of ALL_GRIDS) {
        try {
          const playersSnap = await db.collection('games').doc(g.code).collection('players').get();
          playersSnap.forEach(pdoc => {
            const p = pdoc.data() || {};
            const pNick = (p.nickname || p.name || '').trim().toLowerCase();
            const pId = p.playerId || '';

            const isMatch = (matchNickLower && pNick === matchNickLower) ||
                            (savedPlayerId && (pdoc.id === savedPlayerId || pId === savedPlayerId)) ||
                            (userUid && (pId === userUid || pdoc.id === userUid));

            if (isMatch) {
              activeRegistrations.push({
                code: g.code,
                game: g,
                docId: pdoc.id,
                player: p,
                isApproved: (p.status === 'approved') || !!p.approved
              });
            }
          });
        } catch (err) {}
      }

      if (activeRegistrations.length === 0) {
        myGridsList.innerHTML = `
          <div style="background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: 14px; padding: 14px; text-align: center;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
              <span style="font-size: 13px; color: var(--text-muted);">👤 Apodo actual: <strong style="color: #ffd100;">${savedNick}</strong></span>
              <button id="btnChangeNick" class="btn btn-secondary" style="width: auto; padding: 2px 8px; font-size: 11px;">Cambiar</button>
            </div>
            <div class="hint-text py-2">— No se encontraron registros con este apodo todavía —</div>
          </div>
        `;
        const btnChange = document.getElementById('btnChangeNick');
        if (btnChange) {
          btnChange.addEventListener('click', () => {
            localStorage.removeItem('player_nick');
            localStorage.removeItem('bww_player_id');
            loadMyGrids();
          });
        }
        return;
      }

      myGridsList.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 4px;">
          <span style="font-size: 12px; color: var(--text-muted);">
            👤 Registrado como: <strong style="color: #ffd100; font-size: 13px;">${savedNick || activeRegistrations[0].player.nickname}</strong>
          </span>
          <button id="btnChangeNick" class="btn btn-secondary" style="width: auto; padding: 3px 8px; font-size: 11px;" title="Cambiar apodo">
            Cambiar
          </button>
        </div>
      `;

      const btnChange = document.getElementById('btnChangeNick');
      if (btnChange) {
        btnChange.addEventListener('click', () => {
          localStorage.removeItem('player_nick');
          localStorage.removeItem('bww_player_id');
          loadMyGrids();
        });
      }

      activeRegistrations.forEach(item => {
        const g = item.game;
        const p = item.player;
        const taken = Number(p.taken || 0);
        const quota = Number(p.quota || p.pack || 0);
        const remaining = Math.max(0, quota - taken);

        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '14px 18px';
        card.style.margin = '0 0 12px 0';
        card.style.background = 'rgba(255,255,255,0.02)';
        card.style.border = item.isApproved ? '1px solid var(--accent-color)' : '1px solid var(--border-color)';
        card.style.borderRadius = '16px';

        card.innerHTML = `
          <div class="flex-between" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <img src="${window.getTeamLogoURL(g.away)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${g.away}"/>
                <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${g.away}</span>
                <span style="font-size: 12px; color: var(--text-muted); font-weight: bold;">@</span>
                <img src="${window.getTeamLogoURL(g.home)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${g.home}"/>
                <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${g.home}</span>
              </div>
              <div style="margin-top: 4px; display: flex; gap: 6px; align-items: center;">
                <span class="badge">${g.code}</span>
                ${g.store ? `<span class="badge accent">${g.store}</span>` : ''}
              </div>
            </div>
            <span class="badge" style="${item.isApproved ? 'background:#00e676; color:#000; font-weight:900;' : 'background:rgba(255,209,0,0.1); color:#ffd100;'}">
              ${item.isApproved ? '✅ APROBADO' : '⏳ PENDIENTE'}
            </span>
          </div>
          <div class="flex-between" style="margin-top: 10px; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-weight: 800; font-size: 15px; color: var(--accent-color);">${p.nickname || p.name}</span>
              <span class="badge success" style="margin-left: 8px;">${taken}/${quota} casillas usadas</span>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-secondary" onclick="window.shareGridWhatsApp('${g.code}')" style="width: auto; padding: 6px 10px; font-size: 12px; background: rgba(37,211,102,0.12); border: 1px solid #25D366; color: #25D366; display: inline-flex; align-items: center; gap: 4px;">
                💬 WhatsApp
              </button>
              ${item.isApproved
                ? `<a class="btn btn-primary" href="player-view.html?code=${encodeURIComponent(g.code)}&pid=${encodeURIComponent(item.docId)}&nick=${encodeURIComponent(p.nickname || p.name)}" style="width: auto; padding: 8px 14px; font-size: 13px; text-decoration: none; font-weight: 800;">
                    ${remaining > 0 ? `🎲 Escoger ${remaining} Casillas` : '👁️ Ver Mi Grid'}
                   </a>`
                : `<span style="font-size: 12px; color: var(--text-muted);">Espera a que el admin te apruebe</span>`
              }
            </div>
          </div>
        `;
        myGridsList.appendChild(card);
      });
    } catch (e) {
      console.error('[grids] Error loading my grids:', e);
      if (myGridsList) myGridsList.innerHTML = '<div class="text-center hint-text py-2">— Error al cargar tus grids —</div>';
    }
  }

  // Expose global share function
  window.shareGridWhatsApp = shareGridWhatsApp;

  // Start initialization
  initGrids();
})();
