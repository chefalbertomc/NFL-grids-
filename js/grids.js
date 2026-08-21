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
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
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
  let myGridsUnsub = null;
  async function loadMyGrids() {
    if (!db || !user) return;
    if (myGridsUnsub) {
      myGridsUnsub();
      myGridsUnsub = null;
    }

    // Load active approved registrations
    try {
      myGridsUnsub = db.collectionGroup('players')
        .where('playerId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(async snap => {
          if (!myGridsList) return;
          myGridsList.innerHTML = '';

          if (snap.empty) {
            myGridsList.innerHTML = '<div class="text-center hint-text py-2">— No te has registrado en ningún grid todavía —</div>';
            return;
          }

          // Agrupar registros por código de juego
          const groups = {};
          for (const doc of snap.docs) {
            const p = doc.data() || {};
            const gameRef = doc.ref.parent.parent;
            if (!gameRef) continue;
            const code = gameRef.id;

            if (!groups[code]) {
              groups[code] = {
                code: code,
                gameRef: gameRef,
                players: []
              };
            }
            groups[code].players.push({
              docId: doc.id,
              p: p
            });
          }

          // Cargar detalles de juego y renderizar tarjetas agrupadas
          for (const code in groups) {
            const group = groups[code];
            try {
              const gameDoc = await group.gameRef.get();
              if (!gameDoc.exists) continue;
              const g = gameDoc.data() || {};

              const home = g.homeTeam || g.home || 'Local';
              const away = g.awayTeam || g.away || 'Visitante';
              const store = g.store || g.tienda || '';

              const card = document.createElement('div');
              card.className = 'card';
              card.style.padding = '14px 18px';
              card.style.margin = '0 0 12px 0';
              card.style.background = 'rgba(255,255,255,0.01)';
              card.style.border = '1px solid var(--border-color)';
              card.style.borderRadius = '16px';

              card.innerHTML = `
                <div class="flex-between" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 8px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                      <img src="${window.getTeamLogoURL(away)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${away}"/>
                      <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${away}</span>
                      <span style="font-size: 12px; color: var(--text-muted); font-weight: bold;">@</span>
                      <img src="${window.getTeamLogoURL(home)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${home}"/>
                      <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${home}</span>
                    </div>
                    <div style="margin-top: 4px; display: flex; gap: 6px; align-items: center;">
                      <span class="badge">${code}</span>
                      ${store ? `<span class="badge accent">${store}</span>` : ''}
                    </div>
                  </div>
                  <span class="badge" style="background: rgba(255, 193, 7, 0.1); color: var(--accent-color); font-weight: bold;">
                    ${group.players.length} ${group.players.length === 1 ? 'Registro' : 'Registros'}
                  </span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                  ${group.players.map(item => {
                    const approved = (item.p.status === 'approved') || !!item.p.approved;
                    const taken = Number(item.p.taken || 0);
                    const quota = Number(item.p.quota || item.p.pack || 0);
                    return `
                      <div class="flex-between" style="background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.08);">
                        <div>
                          <span style="font-weight: 700; color: var(--text-color);">${item.p.nickname || item.p.name}</span>
                          <span class="badge success" style="margin-left: 6px;">${taken}/${quota} usados</span>
                        </div>
                        <div>
                          ${approved 
                            ? `<a class="btn btn-primary" href="player-view.html?code=${encodeURIComponent(code)}&pid=${encodeURIComponent(item.docId)}" style="width: auto; padding: 4px 12px; font-size: 12px; text-decoration: none; color: var(--bg-color);">Jugar</a>`
                            : `<span class="badge" style="background-color: var(--danger-glow); color: var(--danger-color); border-color: var(--danger-color); padding: 4px 8px; font-size: 11px;">Pendiente</span>`
                          }
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
              myGridsList.appendChild(card);
            } catch (err) {
              console.error('[grids] Error fetching individual my-grid detail:', err);
            }
          }
        }, err => {
          console.error('[grids] Snap listener error for collectionGroup:', err);
          // Fallback static load if rules prevent group listen
          loadMyGridsOnce();
        });
    } catch (e) {
      console.error('[grids] Error starting my-grids listener:', e);
    }
  }

  // Static fallback load using get()
  async function loadMyGridsOnce() {
    if (!db || !user || !myGridsList) return;
    myGridsList.innerHTML = '<div class="text-center hint-text">Cargando mis grids...</div>';
    
    try {
      const snap = await db.collectionGroup('players').where('playerId', '==', user.uid).get();
      myGridsList.innerHTML = '';
      
      if (snap.empty) {
        myGridsList.innerHTML = '<div class="text-center hint-text">— No te has registrado en ningún grid todavía —</div>';
        return;
      }

      // Agrupar registros por código de juego
      const groups = {};
      for (const doc of snap.docs) {
        const p = doc.data() || {};
        const gameRef = doc.ref.parent.parent;
        if (!gameRef) continue;
        const code = gameRef.id;

        if (!groups[code]) {
          groups[code] = {
            code: code,
            gameRef: gameRef,
            players: []
          };
        }
        groups[code].players.push({
          docId: doc.id,
          p: p
        });
      }

      // Renderizar tarjetas agrupadas
      for (const code in groups) {
        const group = groups[code];
        try {
          const gameDoc = await group.gameRef.get();
          if (!gameDoc.exists) continue;
          const g = gameDoc.data() || {};

          const home = g.homeTeam || g.home || 'Local';
          const away = g.awayTeam || g.away || 'Visitante';
          const store = g.store || g.tienda || '';

          const card = document.createElement('div');
          card.className = 'card';
          card.style.padding = '14px 18px';
          card.style.margin = '0 0 12px 0';
          card.style.background = 'rgba(255,255,255,0.01)';
          card.style.border = '1px solid var(--border-color)';
          card.style.borderRadius = '16px';

          card.innerHTML = `
            <div class="flex-between" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; margin-bottom: 8px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                  <img src="${window.getTeamLogoURL(away)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${away}"/>
                  <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${away}</span>
                  <span style="font-size: 12px; color: var(--text-muted); font-weight: bold;">@</span>
                  <img src="${window.getTeamLogoURL(home)}" style="width: 24px; height: 24px; object-fit: contain;" alt="${home}"/>
                  <span style="font-weight: 700; font-size: 15px; color: var(--text-color);">${home}</span>
                </div>
                <div style="margin-top: 4px; display: flex; gap: 6px; align-items: center;">
                  <span class="badge">${code}</span>
                  ${store ? `<span class="badge accent">${store}</span>` : ''}
                </div>
              </div>
              <span class="badge" style="background: rgba(255, 193, 7, 0.1); color: var(--accent-color); font-weight: bold;">
                ${group.players.length} ${group.players.length === 1 ? 'Registro' : 'Registros'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
              ${group.players.map(item => {
                const approved = (item.p.status === 'approved') || !!item.p.approved;
                const taken = Number(item.p.taken || 0);
                const quota = Number(item.p.quota || item.p.pack || 0);
                return `
                  <div class="flex-between" style="background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.08);">
                    <div>
                      <span style="font-weight: 700; color: var(--text-color);">${item.p.nickname || item.p.name}</span>
                      <span class="badge success" style="margin-left: 6px;">${taken}/${quota} usados</span>
                    </div>
                    <div>
                      ${approved 
                        ? `<a class="btn btn-primary" href="player-view.html?code=${encodeURIComponent(code)}&pid=${encodeURIComponent(item.docId)}" style="width: auto; padding: 4px 12px; font-size: 12px; text-decoration: none; color: var(--bg-color);">Jugar</a>`
                        : `<span class="badge" style="background-color: var(--danger-glow); color: var(--danger-color); border-color: var(--danger-color); padding: 4px 8px; font-size: 11px;">Pendiente</span>`
                      }
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
          myGridsList.appendChild(card);
        } catch (_) {}
      }
    } catch (e) {
      console.error('[grids] Fallback list failed:', e);
    }
  }

  // Start initialization
  initGrids();
})();
