// Admin Module for Wings & Wins
(function() {
  'use strict';

  // --- Custom Premium Modals ---
  function customAlert(title, message) {
    let overlay = document.getElementById('custom-alert-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-alert-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box">
          <div class="modal-header" id="custom-alert-title"></div>
          <div class="modal-body" id="custom-alert-message"></div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="custom-alert-ok" style="width: auto; padding: 8px 20px;">Aceptar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('custom-alert-ok').addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }
    document.getElementById('custom-alert-title').textContent = title;
    document.getElementById('custom-alert-message').textContent = message;
    overlay.classList.add('active');
  }

  function customConfirm(title, message, onConfirm) {
    let overlay = document.getElementById('custom-confirm-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-confirm-overlay';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box">
          <div class="modal-header" id="custom-confirm-title"></div>
          <div class="modal-body" id="custom-confirm-message"></div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="custom-confirm-cancel" style="width: auto; padding: 8px 16px;">Cancelar</button>
            <button class="btn btn-primary" id="custom-confirm-yes" style="width: auto; padding: 8px 20px; color: var(--bg-color);">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    
    document.getElementById('custom-confirm-title').textContent = title;
    document.getElementById('custom-confirm-message').textContent = message;
    
    const btnYes = document.getElementById('custom-confirm-yes');
    const btnCancel = document.getElementById('custom-confirm-cancel');
    
    const newBtnYes = btnYes.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    
    newBtnCancel.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
    
    newBtnYes.addEventListener('click', () => {
      overlay.classList.remove('active');
      if (typeof onConfirm === 'function') onConfirm();
    });
    
    overlay.classList.add('active');
  }

  // Override standard alert
  window.alert = function(msg) {
    customAlert('Drink & Wins', msg);
  };

  let db = null;
  let user = null;
  let CAN_ADMIN = false;
  let currentGridCode = null;
  let currentGame = null;

  // DOM Elements - Auth & Gate
  const adminStatusText = document.getElementById('adminStatusText');

  // DOM Elements - Grids
  const selectStore = document.getElementById('selectStore');
  const selectLocal = document.getElementById('selectLocal');
  const selectVisit = document.getElementById('selectVisit');
  const btnCreateGame = document.getElementById('btnCreateGame');

  const selectGame = document.getElementById('selectGame');
  const btnLoadGame = document.getElementById('btnLoadGame');
  const btnLock = document.getElementById('btnLock');
  const btnUnlock = document.getElementById('btnUnlock');
  const btnGen = document.getElementById('btnGen');
  const btnShow = document.getElementById('btnShow');
  const btnHide = document.getElementById('btnHide');

  const scoreHome = document.getElementById('scoreHome');
  const scoreAway = document.getElementById('scoreAway');
  const btnSaveScore = document.getElementById('btnSaveScore');
  const btnSyncEspn = document.getElementById('btnSyncEspn');
  const chkAutoSyncEspn = document.getElementById('chkAutoSyncEspn');
  const espnStatus = document.getElementById('espnStatus');

  const gridHost = document.getElementById('gridHost');
  const listPend = document.getElementById('listPend');
  const listAppr = document.getElementById('listAppr');

  const btnCleanOrphans = document.getElementById('btnCleanOrphans');
  const btnDeleteGame = document.getElementById('btnDeleteGame');

  // DOM Elements - Pools
  const adminPoolWeekId = document.getElementById('adminPoolWeekId');
  const btnLoadAdminPool = document.getElementById('btnLoadAdminPool');
  const adminPoolGames = document.getElementById('adminPoolGames');
  const adminPoolWinnersForm = document.getElementById('adminPoolWinnersForm');
  const btnUpdatePoolResults = document.getElementById('btnUpdatePoolResults');

  // DOM Elements - Survivor
  const adminSurvivorWeek = document.getElementById('adminSurvivorWeek');
  const btnSaveSurvivorWeek = document.getElementById('btnSaveSurvivorWeek');
  const adminSurvivorPlayers = document.getElementById('adminSurvivorPlayers');

  // DOM Elements - First Goal
  const inpFGGameName = document.getElementById('inpFGGameName');
  const txtFGOptions = document.getElementById('txtFGOptions');
  const btnCreateFG = document.getElementById('btnCreateFG');
  const adminFGActiveGames = document.getElementById('adminFGActiveGames');

  const TEAMS = [
    "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills",
    "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns",
    "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
    "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs",
    "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
    "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants",
    "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers",
    "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders"
  ].sort();

  function initAdmin() {
    if (window.db) {
      db = window.db;
      setupGate();
      setupGridUI();
      setupPoolsUI();
      setupSurvivorUI();
      setupFirstGoalUI();
    } else {
      setTimeout(initAdmin, 100);
    }
  }

  // --- Auth Gate ---
  function disableAllInputs(disabled) {
    document.querySelectorAll('button, select, input, textarea').forEach(el => {
      // Don't disable back link
      if (el.getAttribute('href') !== 'index.html') {
        el.disabled = !!disabled;
      }
    });
  }

  const btnAdminGoogle = document.getElementById('btnAdminGoogle');
  if (btnAdminGoogle) {
    btnAdminGoogle.addEventListener('click', async () => {
      try {
        if (!firebase.auth) return;
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
          await firebase.auth().signInWithPopup(provider);
        } catch (popupErr) {
          if (popupErr.code !== 'auth/popup-closed-by-user' && popupErr.code !== 'auth/cancelled-popup-request') {
            alert('Error al acceder con Google: ' + (popupErr.message || popupErr.code));
          }
        }
      } catch (err) {
        console.error('[admin] Google login error:', err);
      }
    });
  }

  function setupGate() {
    window.onAuthChange(async (currentUser, isAdmin) => {
      user = currentUser;
      CAN_ADMIN = isAdmin;

      if (!user) {
        if (adminStatusText) {
          adminStatusText.textContent = '🔒 Sin Sesión de Administrador';
          adminStatusText.className = 'badge danger';
        }
        if (btnAdminGoogle) {
          btnAdminGoogle.style.display = 'inline-flex';
          btnAdminGoogle.textContent = '🔑 Entrar con Google';
        }
        disableAllInputs(true);
        return;
      }

      if (!CAN_ADMIN) {
        if (adminStatusText) {
          const userEmail = user.email || user.displayName || user.uid;
          adminStatusText.textContent = `Cuenta actual (${userEmail}) no tiene permisos de Admin.`;
          adminStatusText.className = 'badge danger';
        }
        if (btnAdminGoogle) {
          btnAdminGoogle.style.display = 'inline-flex';
          btnAdminGoogle.textContent = '🔄 Cambiar Cuenta';
        }
        disableAllInputs(true);
        return;
      }

      if (adminStatusText) {
        adminStatusText.textContent = '✅ Admin Autorizado (' + (user.email || user.displayName || 'Google') + ')';
        adminStatusText.className = 'badge success';
      }
      if (btnAdminGoogle) {
        btnAdminGoogle.style.display = 'inline-flex';
        btnAdminGoogle.textContent = '🔄 Cambiar Cuenta';
      }
      disableAllInputs(false);

      fillTeamSelects();
      loadGamesDropdown();
      if (window.initSurvivorAdmin) window.initSurvivorAdmin();
      loadFGGamesList();
    });
  }

  // --- NFL/NCAA Game Search via ESPN API ---
  let selectedEspnGame = null;

  function fillTeamSelects() {
    // No-op: team selects replaced by ESPN game picker
  }

  async function searchEspnGames() {
    const league = (document.getElementById('selectLeague') || {}).value || 'nfl';
    const pickerContainer = document.getElementById('gamePickerContainer');
    const pickerList = document.getElementById('gamePickerList');
    const preview = document.getElementById('selectedGamePreview');
    const btnSearch = document.getElementById('btnSearchGames');

    if (!pickerContainer || !pickerList) return;

    if (btnSearch) { btnSearch.disabled = true; btnSearch.textContent = 'Buscando...'; }
    pickerContainer.style.display = 'none';
    if (preview) preview.style.display = 'none';
    selectedEspnGame = null;

    try {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 1);
      const end = new Date();
      end.setDate(today.getDate() + 30); // Lookahead 30 days to get upcoming games and next weeks

      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard?dates=${fmt(start)}-${fmt(end)}&limit=100`;
      
      let res = await fetch(url);
      let data = await res.json();
      let events = data.events || [];

      // If date range returned few, also fetch standard scoreboard
      if (events.length === 0) {
        const res2 = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard`);
        const data2 = await res2.json();
        events = data2.events || [];
      }

      pickerList.innerHTML = '';

      // Filter out finished games
      const upcomingEvents = events.filter(ev => {
        return !(ev.status?.type?.completed === true || ev.status?.type?.state === 'post');
      });

      if (!upcomingEvents.length) {
        pickerList.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:8px;">No se encontraron próximos partidos para esta liga en los próximos 30 días.</div>';
        pickerContainer.style.display = 'block';
        return;
      }

      upcomingEvents.forEach(ev => {

        const comps = ev.competitions?.[0]?.competitors || [];
        const homeComp = comps.find(c => c.homeAway === 'home');
        const awayComp = comps.find(c => c.homeAway === 'away');
        if (!homeComp || !awayComp) return;

        const homeName = homeComp.team?.displayName || homeComp.team?.name || 'Local';
        const awayName = awayComp.team?.displayName || awayComp.team?.name || 'Visitante';
        const homeLogo = homeComp.team?.logo || window.getTeamLogoURL(homeName);
        const awayLogo = awayComp.team?.logo || window.getTeamLogoURL(awayName);
        const homeColor = '#' + (homeComp.team?.color || 'ffd100');
        const awayColor = '#' + (awayComp.team?.color || 'ffd100');
        const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('es-MX', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
        const status = ev.status?.type?.shortDetail || ev.status?.type?.description || '';
        const gameId = ev.id || '';

        const card = document.createElement('div');
        card.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; cursor:pointer; transition:border-color 0.2s;';
        card.innerHTML = `
          <img src="${awayLogo}" style="width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 4px ${awayColor})" onerror="this.src='https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png'" />
          <div style="flex:1;">
            <div style="font-weight:800;font-size:13px;">
              <span style="color:${awayColor}">${awayName}</span>
              <span style="color:var(--text-muted);margin:0 4px;">@</span>
              <span style="color:${homeColor}">${homeName}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${dateStr} &nbsp;•&nbsp; ${status}</div>
          </div>
          <img src="${homeLogo}" style="width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 4px ${homeColor})" onerror="this.src='https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png'" />
        `;

        card.addEventListener('click', () => {
          // Deselect others
          pickerList.querySelectorAll('div').forEach(c => c.style.borderColor = 'var(--border-color)');
          card.style.borderColor = 'var(--accent-color)';

          selectedEspnGame = { homeName, awayName, homeColor, awayColor, homeLogo, awayLogo, gameId, league };

          const previewInfo = document.getElementById('selectedGameInfo');
          if (previewInfo) {
            previewInfo.innerHTML = `<span style="color:${awayColor}">${awayName}</span> <span style="color:var(--text-muted)">vs</span> <span style="color:${homeColor}">${homeName}</span>`;
          }
          if (preview) preview.style.display = 'block';
        });

        pickerList.appendChild(card);
      });

      pickerContainer.style.display = 'block';
    } catch (err) {
      console.error('[admin] ESPN game search error:', err);
      if (pickerList) pickerList.innerHTML = '<div style="color:var(--danger-color);font-size:13px;padding:8px;">Error al buscar partidos. Verifica tu conexión.</div>';
      if (pickerContainer) pickerContainer.style.display = 'block';
    } finally {
      if (btnSearch) { btnSearch.disabled = false; btnSearch.textContent = '🔍 Buscar Partidos'; }
    }
  }

  async function loadGamesDropdown() {
    if (!selectGame) return;
    selectGame.innerHTML = '';
    
    try {
      const snap = await db.collection('games').orderBy('createdAt', 'desc').get();
      if (snap.empty) {
        selectGame.innerHTML = '<option disabled selected>— No hay grids creados —</option>';
        return;
      }

      let validGamesCount = 0;

      for (const doc of snap.docs) {
        const g = doc.data() || {};
        const code = doc.id;
        const away = (g.awayTeam || g.away || '').trim();
        const home = (g.homeTeam || g.home || '').trim();

        // If it's a dummy test placeholder game, auto-purge it from database and skip
        if (!away || !home || (home.toLowerCase() === 'local' && away.toLowerCase() === 'visitante')) {
          try {
            await doc.ref.delete();
          } catch (err) {}
          continue;
        }

        validGamesCount++;
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${away} @ ${home} (${g.store || ''} — ${code})`;
        selectGame.appendChild(opt);
      }

      if (validGamesCount === 0) {
        selectGame.innerHTML = '<option disabled selected>— No hay grids creados —</option>';
        return;
      }

      // Select first valid game by default if not set or invalid
      if (selectGame.options.length) {
        if (!currentGridCode || !Array.from(selectGame.options).some(o => o.value === currentGridCode)) {
          currentGridCode = selectGame.options[0].value;
        }
        selectGame.value = currentGridCode;
        loadGameDetail();
      }
    } catch (e) {
      console.error('[admin] Error listing grids:', e);
    }
  }

  function setupGridUI() {
    if (selectGame) selectGame.addEventListener('change', loadGameDetail);
    if (btnCreateGame) btnCreateGame.addEventListener('click', createGridGame);
    if (btnLoadGame) btnLoadGame.addEventListener('click', loadGameDetail);
    if (btnLock) btnLock.addEventListener('click', () => toggleGridLock(true));
    if (btnUnlock) btnUnlock.addEventListener('click', () => toggleGridLock(false));
    if (btnGen) btnGen.addEventListener('click', generateGridNumbers);
    if (btnShow) btnShow.addEventListener('click', () => toggleNumbersVisibility(true));
    if (btnHide) btnHide.addEventListener('click', () => toggleNumbersVisibility(false));
    if (btnDeleteGame) btnDeleteGame.addEventListener('click', deleteGridGame);
    const btnDeleteCurrentGame = document.getElementById('btnDeleteCurrentGame');
    if (btnDeleteCurrentGame) btnDeleteCurrentGame.addEventListener('click', deleteGridGame);

    const btnSearchGames = document.getElementById('btnSearchGames');
    if (btnSearchGames) btnSearchGames.addEventListener('click', searchEspnGames);

    const btnAdminManualSync = document.getElementById('btnAdminManualSync');
    if (btnAdminManualSync) {
      btnAdminManualSync.addEventListener('click', async () => {
        btnAdminManualSync.disabled = true;
        btnAdminManualSync.textContent = '🔄 Sincronizando...';
        await syncEspnScore(true);
        btnAdminManualSync.disabled = false;
        btnAdminManualSync.textContent = '🔄 Sincronizar Ahora';
      });
    }

    const btnAdminShareWhatsApp = document.getElementById('btnAdminShareWhatsApp');
    if (btnAdminShareWhatsApp) {
      btnAdminShareWhatsApp.addEventListener('click', () => {
        if (!currentGridCode) {
          alert('Primero carga un juego en el menú desplegable para compartir su enlace.');
          return;
        }
        const origin = window.location.origin;
        const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const joinUrl = `${origin}${path}share-grid.html?code=${encodeURIComponent(currentGridCode)}`;
        const home = (currentGame && (currentGame.homeTeam || currentGame.home)) || 'Local';
        const away = (currentGame && (currentGame.awayTeam || currentGame.away)) || 'Visitante';
        const text = `🏈 *¡Únete a nuestro Grid de Drinks & Wins!*\n\n🏆 *Partido:* ${away} @ ${home}\n🔑 *Código:* ${currentGridCode}\n\n👉 *Toca aquí para registrarte y escoger tus casillas:*\n${joinUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      });
    }

    // Toggle Grid Auto-Approve on active grid
    const btnToggleGridAutoApprove = document.getElementById('btnToggleGridAutoApprove');
    if (btnToggleGridAutoApprove) {
      btnToggleGridAutoApprove.addEventListener('click', async () => {
        if (!currentGridCode) {
          alert('Primero selecciona y carga un grid activo.');
          return;
        }
        const newAuto = !(currentGame && currentGame.autoApprove !== false);
        try {
          await db.collection('games').doc(currentGridCode).update({ autoApprove: newAuto });
          if (currentGame) currentGame.autoApprove = newAuto;
          btnToggleGridAutoApprove.textContent = newAuto ? '⚡ Auto-Aprobar: ON' : '⏳ Auto-Aprobar: OFF';
          btnToggleGridAutoApprove.style.borderColor = newAuto ? '#00e676' : '#ffc107';
          btnToggleGridAutoApprove.style.color = newAuto ? '#00e676' : '#ffc107';
          alert(newAuto ? '⚡ Auto-Aprobación ACTIVADA para este Grid.\nLos participantes entrarán directo sin esperar mesero.' : '⏳ Auto-Aprobación DESACTIVADA.\nLos participantes requerirán aprobación manual.');
        } catch (err) {
          alert('Error al actualizar auto-aprobación: ' + err.message);
        }
      });
    }

    // Quarter Selection Handler
    document.querySelectorAll('.btn-q').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-q').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  async function createGridGame() {
    const store = (selectStore || {}).value;
    if (!store) { alert('Por favor selecciona una sucursal.'); return; }

    if (!selectedEspnGame) {
      alert('Primero busca y selecciona un partido de la lista de ESPN.');
      return;
    }

    const { homeName, awayName, gameId, league } = selectedEspnGame;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      await db.collection('games').doc(code).set({
        code,
        store,
        homeTeam: homeName,
        awayTeam: awayName,
        espnGameId: gameId,
        espnLeague: league,
        createdAt: Date.now(),
        locked: false,
        showNumbers: false,
        scoreHome: 0,
        scoreAway: 0,
        quarter: 'Q1',
        numsTop: [],
        numsLeft: [],
        cells: {},
        autoApprove: document.getElementById('chkGridAutoApprove')?.checked === true
      });

      alert(`✅ Grid creado: ${awayName} vs ${homeName}\nCódigo: ${code}`);
      selectedEspnGame = null;
      const preview = document.getElementById('selectedGamePreview');
      const pickerContainer = document.getElementById('gamePickerContainer');
      if (preview) preview.style.display = 'none';
      if (pickerContainer) pickerContainer.style.display = 'none';

      await loadGamesDropdown();
      selectGame.value = code;
      currentGridCode = code;
      loadGameDetail();
    } catch (err) {
      if (err.code === 'permission-denied' || String(err).includes('permission')) {
        alert(`Error de Permisos en Firebase.\n\nTu UID: ${user ? user.uid : 'No autenticado'}`);
      } else {
        alert('Error al crear el grid: ' + err.message);
      }
    }
  }

  async function loadGameDetail() {
    const code = selectGame.value;
    if (!code) return;

    currentGridCode = code;
    try {
      const doc = await db.collection('games').doc(code).get();
      if (!doc.exists) {
        alert('El grid seleccionado no existe.');
        return;
      }

      const g = doc.data() || {};
      renderAdminGrid(g);
      attachPlayersListener(code);

      // Start auto ESPN sync whenever a game is loaded
      startAutoSync();
    } catch (err) {
      console.error('[admin] Error loading grid detail:', err);
    }
  }

  let currentApprovedPlayersList = [];

  function buildMergedCells(gameCells, approvedList) {
    const merged = { ...(gameCells || {}) };
    if (Array.isArray(approvedList)) {
      approvedList.forEach(p => {
        const pPicks = Array.isArray(p.picks) ? p.picks : [];
        pPicks.forEach(cellKey => {
          merged[cellKey] = {
            name: p.nickname || p.name || '—',
            playerDocId: p.id,
            playerId: p.playerId || p.id
          };
        });
      });
    }
    return merged;
  }

  function renderAdminGrid(g) {
    if (!gridHost) return;
    currentGame = g;
    gridHost.innerHTML = '';

    const reveal = !!g.showNumbers;
    const topNums = Array.isArray(g.numsTop) ? g.numsTop : [];
    const leftNums = Array.isArray(g.numsLeft) ? g.numsLeft : [];
    const cells = buildMergedCells(g.cells || {}, currentApprovedPlayersList);

    const home = g.homeTeam || g.home || 'Local';
    const away = g.awayTeam || g.away || 'Visitante';

    // Populate score fields
    if (scoreHome) scoreHome.value = g.scoreHome || 0;
    if (scoreAway) scoreAway.value = g.scoreAway || 0;
    
    // Highlight active quarter button
    const q = g.quarter || 'Q1';
    document.querySelectorAll('.btn-q').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-q') === q);
    });

    const verticalTeamName = document.getElementById('nameAway');
    const horizontalTeamName = document.getElementById('nameHome');

    const homeInfo = window.getTeamInfo ? window.getTeamInfo(home) : { color: '#ffd100', logo: '' };
    const awayInfo = window.getTeamInfo ? window.getTeamInfo(away) : { color: '#ffd100', logo: '' };

    // Update TV Scorebug banner in Admin
    updateAdminScorebug(g);

    // Update Auto-Approve Toggle button state
    const btnToggleGridAutoApprove = document.getElementById('btnToggleGridAutoApprove');
    if (btnToggleGridAutoApprove) {
      const isAuto = g.autoApprove !== false;
      btnToggleGridAutoApprove.textContent = isAuto ? '⚡ Auto-Aprobar: ON' : '⏳ Auto-Aprobar: OFF';
      btnToggleGridAutoApprove.style.borderColor = isAuto ? '#00e676' : '#ffc107';
      btnToggleGridAutoApprove.style.color = isAuto ? '#00e676' : '#ffc107';
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'grid-container-wrapper';

    const gridWrap = document.createElement('div');
    gridWrap.className = 'grid-wrapper';
    // Apply team color CSS variables for axis labels
    gridWrap.style.setProperty('--team-away-color', awayInfo.color);
    gridWrap.style.setProperty('--team-away-secondary', awayInfo.secondaryColor || '#ffffff');
    gridWrap.style.setProperty('--team-home-color', homeInfo.color);
    gridWrap.style.setProperty('--team-home-secondary', homeInfo.secondaryColor || '#ffffff');

    // Away team: vertical left axis with logo + name
    const sideLabel = document.createElement('div');
    sideLabel.className = 'vertical-label';
    const awayLogoEl = document.createElement('img');
    awayLogoEl.src = awayInfo.logo;
    awayLogoEl.alt = away;
    awayLogoEl.className = 'axis-logo';
    awayLogoEl.onerror = function() { this.style.display = 'none'; };
    const awaySpan = document.createElement('span');
    awaySpan.className = 'axis-text';
    awaySpan.textContent = away;
    sideLabel.appendChild(awayLogoEl);
    sideLabel.appendChild(awaySpan);
    gridWrap.appendChild(sideLabel);

    const content = document.createElement('div');
    content.className = 'grid-content';

    // Home team: horizontal top axis with logo + name
    const topLabel = document.createElement('div');
    topLabel.className = 'horizontal-label';
    const homeLogoEl = document.createElement('img');
    homeLogoEl.src = homeInfo.logo;
    homeLogoEl.alt = home;
    homeLogoEl.className = 'axis-logo';
    homeLogoEl.onerror = function() { this.style.display = 'none'; };
    const homeSpan = document.createElement('span');
    homeSpan.className = 'axis-text';
    homeSpan.textContent = home;
    topLabel.appendChild(homeLogoEl);
    topLabel.appendChild(homeSpan);
    content.appendChild(topLabel);

    const board = document.createElement('div');
    board.className = 'grid-board';

    // Corner cell
    const corner = document.createElement('div');
    corner.className = 'grid-header-cell';
    corner.textContent = 'A \\ L';
    board.appendChild(corner);

    // Top headers
    for (let c = 0; c < 10; c++) {
      const h = document.createElement('div');
      h.className = 'grid-header-cell';
      h.textContent = reveal ? (topNums[c] ?? '•') : '?';
      board.appendChild(h);
    }

    // Rows
    for (let r = 0; r < 10; r++) {
      const l = document.createElement('div');
      l.className = 'grid-side-cell';
      l.textContent = reveal ? (leftNums[r] ?? '•') : '?';
      board.appendChild(l);

      for (let c = 0; c < 10; c++) {
        const key = `${r}-${c}`;
        const info = cells[key];
        const cell = document.createElement('div');
        cell.className = 'grid-cell';

        if (info) {
          cell.textContent = info.name || '—';
          cell.classList.add('taken');
        }

        const isWinner = (g.locked || g.showNumbers) && 
          typeof g.winRow === 'number' && typeof g.winCol === 'number' &&
          g.winRow === r && g.winCol === c;
        if (isWinner) {
          cell.classList.add('winner');
        }

        board.appendChild(cell);
      }
    }

    content.appendChild(board);
    gridWrap.appendChild(content);
    wrapper.appendChild(gridWrap);
    gridHost.appendChild(wrapper);
  }

  // --- Real-time Grid Player approval list listeners ---
  let unsubPend = null;
  let unsubAppr = null;

  // Audio Chime Synthesizer for Real-Time Alerts
  function playNotificationChime(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'admin') {
        // Two-tone attention chime (Ding-Dong)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc1.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc1.stop(ctx.currentTime + 0.6);
      } else {
        // Victory chime
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio chime note:', e);
    }
  }

  // Send System Web Push Notification
  function sendSystemNotification(title, body, tag) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: 'img/logo.jpg',
          tag: tag || 'drinks-wins-alert'
        });
      } catch (e) {}
    }
  }

  window.playNotificationChime = playNotificationChime;
  window.sendSystemNotification = sendSystemNotification;
  window.playVictoryChime = () => playNotificationChime('victory');

  let lastPendingCount = 0;

  function attachPlayersListener(code) {
    if (unsubPend) unsubPend();
    if (unsubAppr) unsubAppr();

    const playerRef = db.collection('games').doc(code).collection('players');

    unsubPend = playerRef.onSnapshot(snap => {
      const pendingDocs = [];
      const approvedDocs = [];
      currentApprovedPlayersList = [];
      snap.forEach(doc => {
        const p = doc.data() || {};
        if (p.approved === true || p.status === 'approved') {
          approvedDocs.push(doc);
          currentApprovedPlayersList.push({ id: doc.id, ...p });
        } else {
          pendingDocs.push(doc);
        }
      });

      // Trigger Admin Alert on NEW pending requests
      if (pendingDocs.length > lastPendingCount) {
        playNotificationChime('admin');
        const newest = pendingDocs[pendingDocs.length - 1].data() || {};
        const nick = newest.nickname || newest.name || 'Nuevo Jugador';
        const realName = newest.userName ? ` (${newest.userName})` : '';
        const waiter = newest.waiter ? ` • Mesero: ${newest.waiter}` : '';
        sendSystemNotification(
          '🔔 ¡Nueva Solicitud en NFL Grids!',
          `${nick}${realName} solicitó entrar a ${code}${waiter}.`
        );
      }
      lastPendingCount = pendingDocs.length;

      renderPlayersArray(listPend, pendingDocs, false);
      renderPlayersArray(listAppr, approvedDocs, true);
      if (currentGame) renderAdminGrid(currentGame);
    }, err => console.error('[admin] Error listening players:', err));
  }

  function renderPlayersArray(container, docsArray, isApproved) {
    if (!container) return;
    container.innerHTML = '';

    if (!docsArray || !docsArray.length) {
      container.innerHTML = '<div class="hint-text py-2">— Sin solicitudes en esta categoría —</div>';
      return;
    }

    docsArray.forEach(doc => {
      const p = doc.data() || {};
      const id = doc.id;
      const currentQuota = p.quota ?? p.pack ?? 5;
      const userPhoto = p.userPhoto || 'img/logo.jpg';
      const realName = p.userName || 'Usuario de Google';
      const email = p.userEmail || '';
      const apodo = (p.nickname || p.name || 'JUGADOR').toUpperCase();
      const waiter = p.waiter || 'Sin mesero';

      const card = document.createElement('div');
      card.className = 'flex-between';
      card.style.padding = '10px 12px';
      card.style.background = isApproved ? 'rgba(255,255,255,0.02)' : 'rgba(255,209,0,0.05)';
      card.style.border = isApproved ? '1px solid var(--border-color)' : '1.5px solid rgba(255,209,0,0.4)';
      card.style.borderRadius = '12px';
      card.style.marginBottom = '8px';
      card.style.gap = '10px';
      card.style.flexWrap = 'wrap';

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; min-width:220px; flex:1;">
          <img src="${userPhoto}" alt="${apodo}" onerror="this.onerror=null;this.src='img/logo.jpg'" style="width:42px; height:42px; border-radius:50%; object-fit:cover; border:2px solid ${isApproved ? '#ffd100' : '#ffc107'}; flex-shrink:0;" />
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:900; font-size:14px; color:#ffd100;">${apodo}</span>
              ${!isApproved ? `<span class="badge" style="background:rgba(255,193,7,0.2); color:#ffc107; border:1px solid #ffc107; font-size:9.5px; padding:1px 5px; font-weight:800;">PENDIENTE</span>` : ''}
            </div>
            <div style="font-size:11.5px; color:#ffffff; font-weight:700; margin-top:2px;">
              👤 ${realName} ${email ? `<span style="font-size:10.5px; color:var(--text-muted);">(${email})</span>` : ''}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:3px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>🤵 <strong>Mesero:</strong> ${waiter}</span>
              <label style="margin:0; display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                🎟️ Cuadros: 
                <input type="number" id="quota_${id}" value="${currentQuota}" min="1" max="100" style="width:46px; padding:2px 4px; background:var(--bg-color); border:1px solid var(--border-color); color:#ffd100; font-weight:900; border-radius:6px; text-align:center; margin:0; display:inline-block;">
              </label>
              <span>📌 Usados: <strong>${p.taken || 0}</strong></span>
            </div>
          </div>
        </div>
        <div class="flex-row" style="gap: 6px; align-items:center;">
          ${isApproved 
            ? `<button class="btn btn-primary" data-player-id="${id}" data-action="update-quota" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; color: var(--bg-color); border-radius:8px;">💾 Guardar Cuota</button>
               <button class="btn btn-secondary" data-player-id="${id}" data-action="reset" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; border-radius:8px;">🔄 Reset</button>
               <button class="btn btn-danger" data-player-id="${id}" data-action="remove" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; border-radius:8px;">🗑️</button>`
            : `<button class="btn btn-primary" data-player-id="${id}" data-action="approve" style="padding: 7px 14px; font-size: 12px; font-weight:900; width: auto; color: var(--bg-color); border-radius:8px; background:#00e676; border-color:#00e676;">✅ Aprobar</button>
               <button class="btn btn-secondary" data-player-id="${id}" data-action="reject" style="padding: 7px 10px; font-size: 12px; font-weight:800; width: auto; border-radius:8px; color:#ff4444;">✕ Rechazar</button>
               <button class="btn btn-danger" data-player-id="${id}" data-action="delete" style="padding: 7px 10px; font-size: 12px; font-weight:800; width: auto; border-radius:8px;">🗑️</button>`
          }
        </div>
      `;

      container.appendChild(card);
    });

    // Wire up buttons click events
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-player-id');
        const act = btn.getAttribute('data-action');
        handlePlayerAction(id, act);
      });
    });
  }

  async function handlePlayerAction(playerDocId, action) {
    if (!currentGridCode || !db) return;
    
    const pref = db.collection('games').doc(currentGridCode).collection('players').doc(playerDocId);
    
    try {
      const quotaInput = document.getElementById('quota_' + playerDocId);
      const updatedQuota = quotaInput ? (Number(quotaInput.value) || 5) : 5;

      if (action === 'approve') {
        await pref.update({ 
          approved: true, 
          status: 'approved',
          quota: updatedQuota,
          pack: updatedQuota
        });
      } else if (action === 'update-quota') {
        await pref.update({ 
          quota: updatedQuota,
          pack: updatedQuota
        });
        alert('Cuota del jugador actualizada a ' + updatedQuota + ' cuadros.');
      } else if (action === 'reject') {
        await pref.update({ approved: false, status: 'rejected' });
      } else if (action === 'delete' || action === 'remove') {
        if (!confirm('¿Deseas eliminar a este jugador y liberar todas sus casillas?')) return;
        try {
          await cleanPlayerCells(currentGridCode, playerDocId);
          await pref.delete();
          alert('✅ Jugador eliminado exitosamente.');
        } catch (err) {
          console.error(err);
          alert('Error al eliminar: ' + err.message);
        }
      } else if (action === 'reset') {
        if (!confirm('¿Deseas liberar las casillas elegidas por este jugador?')) return;
        try {
          await cleanPlayerCells(currentGridCode, playerDocId);
          await pref.update({ taken: 0 });
          alert('✅ Casillas liberadas exitosamente.');
        } catch (err) {
          console.error(err);
          alert('Error al resetear: ' + err.message);
        }
      }
    } catch (err) {
      console.error('[admin] Error performing player action:', err);
    }
  }

  async function cleanPlayerCells(code, playerDocId) {
    const ref = db.collection('games').doc(code);
    const snap = await ref.get();
    if (!snap.exists) return;

    const cells = snap.data().cells || {};
    const upd = {};

    for (const key in cells) {
      const cell = cells[key];
      // Check both matches to be safe
      if (cell.playerDocId === playerDocId || cell.name === undefined) {
        upd[`cells.${key}`] = firebase.firestore.FieldValue.delete();
      }
    }

    if (Object.keys(upd).length > 0) {
      await ref.update(upd);
    }
  }

  async function toggleGridLock(locked) {
    if (!currentGridCode) return;
    try {
      await db.collection('games').doc(currentGridCode).update({ locked: locked });
      loadGameDetail();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function generateGridNumbers() {
    if (!currentGridCode) return;
    const base = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    try {
      await db.collection('games').doc(currentGridCode).update({
        numsTop: shuffle(base),
        numsLeft: shuffle(base)
      });
      loadGameDetail();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function toggleNumbersVisibility(visible) {
    if (!currentGridCode) return;
    try {
      await db.collection('games').doc(currentGridCode).update({ showNumbers: visible });
      loadGameDetail();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function saveGridScore() {
    if (!currentGridCode) return;
    const scoreHomeVal = Number(scoreHome.value) || 0;
    const scoreAwayVal = Number(scoreAway.value) || 0;
    
    const activeQBtn = document.querySelector('.btn-q.active');
    const quarter = activeQBtn ? activeQBtn.getAttribute('data-q') : 'Q1';

    try {
      const ref = db.collection('games').doc(currentGridCode);
      const snap = await ref.get();
      const g = snap.data() || {};
      
      const upd = {
        scoreHome: scoreHomeVal,
        scoreAway: scoreAwayVal,
        quarter: quarter
      };

      // Calculate winner coordinates
      const topNums = g.numsTop || [];
      const leftNums = g.numsLeft || [];
      
      // Build merged cell map from approved players' picks
      let mergedCells = { ...(g.cells || {}) };
      try {
        const playersSnap = await ref.collection('players').get();
        playersSnap.forEach(pdoc => {
          const p = pdoc.data() || {};
          if (!(p.approved || p.status === 'approved')) return;
          const pName = p.nickname || p.name || '';
          if (!pName) return;
          (Array.isArray(p.picks) ? p.picks : []).forEach(cellKey => {
            mergedCells[cellKey] = { name: pName, playerDocId: pdoc.id };
          });
        });
      } catch (err) {}

      let winnerName = 'Nadie';
      if (topNums.length && leftNums.length) {
        const lastDigitHome = scoreHomeVal % 10;
        const lastDigitAway = scoreAwayVal % 10;
        
        const winCol = topNums.indexOf(lastDigitHome);
        const winRow = leftNums.indexOf(lastDigitAway);
        
        upd.winCol = winCol;
        upd.winRow = winRow;

        const cellKey = `${winRow}-${winCol}`;
        const winningCell = mergedCells[cellKey];
        if (winningCell && winningCell.name) {
          winnerName = winningCell.name;
        }
      }

      const scoreStr = `${scoreAwayVal} - ${scoreHomeVal}`;
      if (quarter === 'Q1') {
        upd.q1_winner = winnerName;
        upd.q1_score = scoreStr;
      } else if (quarter === 'Q2') {
        upd.q2_winner = winnerName;
        upd.q2_score = scoreStr;
      } else if (quarter === 'Q3') {
        upd.q3_winner = winnerName;
        upd.q3_score = scoreStr;
      } else if (quarter === 'Q4') {
        upd.q4_winner = winnerName;
        upd.q4_score = scoreStr;
      }

      await ref.update(upd);
      alert(`✅ Ganador calculado: ${winnerName}`);
      loadGameDetail();
    } catch (err) {
      alert('Error al guardar marcador: ' + err.message);
    }
  }

  // ---------- ESPN Live Sync ----------
  let espnTimer = null;

  function isTeamMatch(targetTeam, espnTeam) {
    if (!targetTeam || !espnTeam) return false;
    const t = targetTeam.toLowerCase().trim();
    const dName = (espnTeam.displayName || '').toLowerCase().trim();
    const name = (espnTeam.name || '').toLowerCase().trim();
    const location = (espnTeam.location || '').toLowerCase().trim();
    const abbr = (espnTeam.abbreviation || '').toLowerCase().trim();

    return dName.includes(t) || t.includes(dName) ||
           name.includes(t) || t.includes(name) ||
           (location && (location.includes(t) || t.includes(location))) ||
           (abbr && abbr === t);
  }

  function updateAdminScorebug(g) {
    if (!g) return;
    const home = g.homeTeam || g.home || 'Local';
    const away = g.awayTeam || g.away || 'Visitante';
    const homeInfo = window.getTeamInfo ? window.getTeamInfo(home) : { color: '#0076B6', logo: '' };
    const awayInfo = window.getTeamInfo ? window.getTeamInfo(away) : { color: '#5A1414', logo: '' };

    const awayWing = document.getElementById('adminTvAwayWing');
    const awayLogo = document.getElementById('adminTvAwayLogo');
    const awayAbbr = document.getElementById('adminTvAwayAbbr');
    const awayScore = document.getElementById('adminTvAwayScore');

    const homeWing = document.getElementById('adminTvHomeWing');
    const homeLogo = document.getElementById('adminTvHomeLogo');
    const homeAbbr = document.getElementById('adminTvHomeAbbr');
    const homeScore = document.getElementById('adminTvHomeScore');

    const tvQuarter = document.getElementById('adminTvQuarter');
    const tvClock = document.getElementById('adminTvClock');
    const tvSituation = document.getElementById('adminTvSituation');

    if (awayWing) awayWing.style.setProperty('--team-bg', awayInfo.color);
    if (awayLogo) { awayLogo.src = awayInfo.logo; awayLogo.alt = away; }
    if (awayAbbr) awayAbbr.textContent = (awayInfo.abbr || away.substring(0, 3)).toUpperCase();
    if (awayScore) awayScore.textContent = g.scoreAway ?? 0;

    if (homeWing) homeWing.style.setProperty('--team-bg', homeInfo.color);
    if (homeLogo) { homeLogo.src = homeInfo.logo; homeLogo.alt = home; }
    if (homeAbbr) homeAbbr.textContent = (homeInfo.abbr || home.substring(0, 3)).toUpperCase();
    if (homeScore) homeScore.textContent = g.scoreHome ?? 0;

    if (tvQuarter) tvQuarter.textContent = g.periodName || g.quarter || 'Q1';
    if (tvClock) tvClock.textContent = g.clock || '15:00';
    if (tvSituation) {
      tvSituation.textContent = g.situation || 'EN VIVO';
      tvSituation.classList.toggle('redzone', !!g.isRedZone);
    }
  }

  // Always-on ESPN auto-sync — starts automatically when a game is loaded
  let _lastSavedQuarter = null;

  async function syncEspnScore(showToast = false) {
    if (!currentGridCode) return;

    try {
      const syncDot = document.getElementById('espnSyncDot');

      const ref = db.collection('games').doc(currentGridCode);
      const snap = await ref.get();
      if (!snap.exists) return;
      const g = snap.data() || {};

      const espnLeague = g.espnLeague || 'nfl';
      const espnRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/${espnLeague}/scoreboard`);
      const espnData = await espnRes.json();

      const homeTarget = g.homeTeam || g.home || '';
      const awayTarget = g.awayTeam || g.away || '';

      let matchedEvent = null, matchedHomeComp = null, matchedAwayComp = null;

      // First try matching by espnGameId if we have it
      for (const ev of (espnData.events || [])) {
        if (g.espnGameId && ev.id === g.espnGameId) {
          const comps = ev.competitions?.[0]?.competitors || [];
          matchedHomeComp = comps.find(c => c.homeAway === 'home');
          matchedAwayComp = comps.find(c => c.homeAway === 'away');
          matchedEvent = ev;
          break;
        }
      }

      // Fallback to name matching
      if (!matchedEvent) {
        for (const ev of (espnData.events || [])) {
          const comps = ev.competitions?.[0]?.competitors || [];
          const hComp = comps.find(c => c.homeAway === 'home');
          const aComp = comps.find(c => c.homeAway === 'away');
          if (!hComp || !aComp) continue;
          const isHomeMatch = isTeamMatch(homeTarget, hComp.team);
          const isAwayMatch = isTeamMatch(awayTarget, aComp.team);
          const isSwappedHome = isTeamMatch(homeTarget, aComp.team);
          const isSwappedAway = isTeamMatch(awayTarget, hComp.team);
          if ((isHomeMatch && isAwayMatch) || (isSwappedHome && isSwappedAway)) {
            matchedEvent = ev;
            matchedHomeComp = isHomeMatch ? hComp : aComp;
            matchedAwayComp = isAwayMatch ? aComp : hComp;
            break;
          }
        }
      }

      if (!matchedEvent || !matchedHomeComp || !matchedAwayComp) {
        if (espnStatus) espnStatus.textContent = 'Partido no encontrado en ESPN aún';
        return;
      }

      const sHome = parseInt(matchedHomeComp.score || 0, 10);
      const sAway = parseInt(matchedAwayComp.score || 0, 10);
      const statusText = matchedEvent.status?.type?.shortDetail || matchedEvent.status?.type?.detail || 'Q1';
      const isCompleted = matchedEvent.status?.type?.completed === true;
      const displayClock = matchedEvent.status?.displayClock || (isCompleted ? '0:00' : '15:00');
      const periodNum = matchedEvent.status?.period || 1;
      const periodName = isCompleted ? 'FINAL' : (periodNum === 1 ? '1ST' : periodNum === 2 ? '2ND' : periodNum === 3 ? '3RD' : periodNum === 4 ? '4TH' : 'OT');

      const comp = matchedEvent.competitions?.[0] || {};
      const sit = comp.situation || {};
      const downDist = sit.shortDownDistanceText || sit.downDistanceText || (isCompleted ? 'FINAL DEL JUEGO' : 'EN VIVO');
      const isRedZone = !!sit.isRedZone;

      // Determine current quarter key
      let currentQuarterKey = null;
      const st = statusText.toLowerCase();
      if (st.includes('final') || st.includes('ft') || isCompleted) currentQuarterKey = 'q4';
      else if (st.includes('half') || st.includes('ht') || st.includes('2nd')) currentQuarterKey = 'q2';
      else if (st.includes('3rd')) currentQuarterKey = 'q3';
      else if (st.includes('1st') || st.includes('q1')) currentQuarterKey = 'q1';

      const upd = {
        scoreHome: sHome,
        scoreAway: sAway,
        quarter: statusText,
        clock: displayClock,
        periodName: periodName,
        situation: downDist,
        isRedZone: isRedZone,
        lastEspnSync: Date.now()
      };

      // Build merged cell map from approved players' picks to find actual winner name
      const topNums = g.numsTop || [];
      const leftNums = g.numsLeft || [];
      let mergedCells = { ...(g.cells || {}) };
      try {
        const playersSnap = await ref.collection('players').get();
        playersSnap.forEach(pdoc => {
          const p = pdoc.data() || {};
          if (!(p.approved || p.status === 'approved')) return;
          const pName = p.nickname || p.name || '';
          if (!pName) return;
          const pPicks = Array.isArray(p.picks) ? p.picks : [];
          pPicks.forEach(cellKey => {
            mergedCells[cellKey] = { name: pName, playerDocId: pdoc.id };
          });
        });
      } catch (err) {
        console.warn('[winner] Could not load players for winner detection:', err);
      }

      function calcQuarterWinner(aScore, hScore) {
        if (!topNums.length || !leftNums.length) return 'Nadie';
        const lastDigitHome = Number(hScore) % 10;
        const lastDigitAway = Number(aScore) % 10;
        const winCol = topNums.indexOf(lastDigitHome);
        const winRow = leftNums.indexOf(lastDigitAway);
        if (winCol === -1 || winRow === -1) return 'Nadie';
        const cellKey = `${winRow}-${winCol}`;
        const winningCell = mergedCells[cellKey];
        return (winningCell && winningCell.name) ? winningCell.name : 'Nadie';
      }

      // Live overall winner cell coordinates
      if (topNums.length && leftNums.length) {
        const lastDigitHome = sHome % 10;
        const lastDigitAway = sAway % 10;
        upd.winCol = topNums.indexOf(lastDigitHome);
        upd.winRow = leftNums.indexOf(lastDigitAway);
      }

      const aAbbr = (matchedAwayComp.team?.abbreviation || awayTarget.substring(0, 3)).toUpperCase();
      const hAbbr = (matchedHomeComp.team?.abbreviation || homeTarget.substring(0, 3)).toUpperCase();

      const aLines = matchedAwayComp.linescores || [];
      const hLines = matchedHomeComp.linescores || [];

      // Q1 Score & Winner
      if (aLines[0] && hLines[0]) {
        const aQ1 = aLines[0].value;
        const hQ1 = hLines[0].value;
        upd.q1_score = `${aAbbr} ${aQ1} - ${hAbbr} ${hQ1}`;
        upd.q1_winner = calcQuarterWinner(aQ1, hQ1);
      }

      // Q2 (Medio Tiempo cumulative score & winner)
      if (aLines[0] && aLines[1] && hLines[0] && hLines[1]) {
        const aQ2 = aLines[0].value + aLines[1].value;
        const hQ2 = hLines[0].value + hLines[1].value;
        upd.q2_score = `${aAbbr} ${aQ2} - ${hAbbr} ${hQ2}`;
        upd.q2_winner = calcQuarterWinner(aQ2, hQ2);
      }

      // Q3 (3er Cuarto cumulative score & winner)
      if (aLines[0] && aLines[1] && aLines[2] && hLines[0] && hLines[1] && hLines[2]) {
        const aQ3 = aLines[0].value + aLines[1].value + aLines[2].value;
        const hQ3 = hLines[0].value + hLines[1].value + hLines[2].value;
        upd.q3_score = `${aAbbr} ${aQ3} - ${hAbbr} ${hQ3}`;
        upd.q3_winner = calcQuarterWinner(aQ3, hQ3);
      }

      // Q4 (Final score & winner)
      if (isCompleted || periodNum >= 4 || aLines.length >= 4) {
        upd.q4_score = `${aAbbr} ${sAway} - ${hAbbr} ${sHome}`;
        upd.q4_winner = calcQuarterWinner(sAway, sHome);
      }

      await ref.update(upd);

      if (scoreHome) scoreHome.value = sHome;
      if (scoreAway) scoreAway.value = sAway;

      const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (espnStatus) espnStatus.textContent = `Sync ${timeStr} — ${sAway}:${sHome} ${statusText}`;
      if (syncDot) { syncDot.style.background = '#00e676'; syncDot.style.boxShadow = '0 0 8px #00e676'; }

      if (currentGame) renderAdminGrid({ ...currentGame, ...upd });
    } catch (err) {
      console.error('[ESPN Auto-Sync]', err);
      const syncDot = document.getElementById('espnSyncDot');
      if (syncDot) { syncDot.style.background = '#ff5252'; syncDot.style.boxShadow = '0 0 8px #ff5252'; }
      if (espnStatus) espnStatus.textContent = 'Error ESPN — reintentando...';
    }
  }

  function startAutoSync() {
    if (espnTimer) clearInterval(espnTimer);
    _lastSavedQuarter = null;
    syncEspnScore(false);
    espnTimer = setInterval(() => syncEspnScore(false), 15000); // every 15 seconds
  }

  function stopAutoSync() {
    if (espnTimer) { clearInterval(espnTimer); espnTimer = null; }
  }

  function toggleEspnAutoSync() {} // kept as no-op for compatibility

  async function cleanOrphanPicks() {
    if (!currentGridCode) return;
    try {
      const ref = db.collection('games').doc(currentGridCode);
      const snap = await ref.get();
      if (!snap.exists) return;

      const cells = snap.data().cells || {};
      
      // Get all approved and pending player IDs in this game
      const playerSnap = await ref.collection('players').get();
      const existingDocIds = new Set();
      playerSnap.forEach(p => existingDocIds.add(p.id));

      const upd = {};
      for (const key in cells) {
        const cell = cells[key];
        // If cell has a playerDocId reference that doesn't exist anymore, clean it
        if (cell.playerDocId && !existingDocIds.has(cell.playerDocId)) {
          upd[`cells.${key}`] = firebase.firestore.FieldValue.delete();
        }
      }

      if (Object.keys(upd).length > 0) {
        await ref.update(upd);
        alert('Celdas huérfanas limpiadas.');
      } else {
        alert('No se encontraron celdas huérfanas.');
      }
      loadGameDetail();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function deleteGridGame() {
    if (!currentGridCode) {
      alert('Selecciona un juego primero.');
      return;
    }
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el grid ${currentGridCode} y todos sus registros? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const ref = db.collection('games').doc(currentGridCode);
      
      // Delete players subcollection in a batch
      const players = await ref.collection('players').get();
      const batch = db.batch();
      players.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Delete main document
      await ref.delete();
      alert(`✅ Grid ${currentGridCode} eliminado exitosamente.`);
      currentGridCode = null;
      if (gridHost) gridHost.textContent = '(Carga un juego para visualizar el grid)';
      await loadGamesDropdown();
    } catch (err) {
      alert('Error al eliminar grid: ' + err.message);
    }
  }

  // --- Pools (Quinielas) Admin Logic ---
  let adminPoolMatches = [];
  function setupPoolsUI() {
    if (btnLoadAdminPool) btnLoadAdminPool.addEventListener('click', loadAdminPoolData);
    if (btnUpdatePoolResults) btnUpdatePoolResults.addEventListener('click', calculatePoolPoints);
  }

  async function loadAdminPoolData() {
    const weekId = adminPoolWeekId.value.trim();
    if (!weekId) {
      alert('Especifica un ID de semana.');
      return;
    }

    try {
      const doc = await db.collection('pools').doc(weekId).get();
      if (!doc.exists) {
        alert(`No existe la semana ${weekId}. Se usará la plantilla predeterminada.`);
        adminPoolMatches = [
          { id: 'm1', home: 'Kansas City Chiefs', away: 'Baltimore Ravens', date: 'Sept 7, 7:20 PM' },
          { id: 'm2', home: 'Philadelphia Eagles', away: 'Green Bay Packers', date: 'Sept 8, 7:15 PM' },
          { id: 'm3', home: 'Dallas Cowboys', away: 'Cleveland Browns', date: 'Sept 10, 3:25 PM' },
          { id: 'm4', home: 'New York Giants', away: 'Minnesota Vikings', date: 'Sept 10, 12:00 PM' },
          { id: 'm5', home: 'San Francisco 49ers', away: 'New York Jets', date: 'Sept 11, 7:15 PM' }
        ];
      } else {
        adminPoolMatches = doc.data().matches || [];
      }

      renderAdminPoolMatches(weekId);
    } catch (err) {
      alert('Error al cargar quiniela admin: ' + err.message);
    }
  }

  function renderAdminPoolMatches(weekId) {
    if (!adminPoolWinnersForm) return;
    adminPoolWinnersForm.innerHTML = '';
    
    if (adminPoolMatches.length === 0) {
      adminPoolWinnersForm.innerHTML = '<div class="hint-text py-2">Sin partidos registrados.</div>';
      if (btnUpdatePoolResults) btnUpdatePoolResults.style.display = 'none';
      return;
    }

    // Load saved winners if exists
    db.collection('pools').doc(weekId).get().then(doc => {
      const savedWinners = (doc.exists ? doc.data().winners : null) || {};

      adminPoolMatches.forEach(match => {
        const savedWin = savedWinners[match.id];
        
        const row = document.createElement('div');
        row.className = 'card';
        row.style.padding = '10px';
        row.style.margin = '0 0 8px 0';
        row.style.background = 'var(--bg-color)';

        row.innerHTML = `
          <div class="flex-between">
            <span style="font-weight: 700; font-size: 13px;">${match.away} @ ${match.home}</span>
            <div class="flex-row" style="gap: 4px;">
              <button class="btn btn-secondary ${savedWin === 'away' ? 'btn-primary' : ''}" 
                      data-admin-match="${match.id}" data-admin-pick="away" 
                      style="padding: 4px 8px; font-size: 11px; width: auto;">
                V: ${match.away.substring(0,6)}...
              </button>
              <button class="btn btn-secondary ${savedWin === 'home' ? 'btn-primary' : ''}" 
                      data-admin-match="${match.id}" data-admin-pick="home" 
                      style="padding: 4px 8px; font-size: 11px; width: auto;">
                L: ${match.home.substring(0,6)}...
              </button>
            </div>
          </div>
        `;

        adminPoolWinnersForm.appendChild(row);
      });

      // Winners buttons click
      adminPoolWinnersForm.querySelectorAll('[data-admin-match]').forEach(btn => {
        btn.addEventListener('click', () => {
          const matchId = btn.getAttribute('data-admin-match');
          const pick = btn.getAttribute('data-admin-pick');
          
          btn.closest('.flex-row').querySelectorAll('[data-admin-match]').forEach(b => b.classList.remove('btn-primary'));
          btn.classList.add('btn-primary');
        });
      });

      if (btnUpdatePoolResults) btnUpdatePoolResults.style.display = 'block';
    });
  }

  async function calculatePoolPoints() {
    const weekId = adminPoolWeekId.value.trim();
    if (!weekId) return;

    // Collect winners from UI
    const winners = {};
    let allFinished = true;

    adminPoolWinnersForm.querySelectorAll('.flex-row').forEach(row => {
      const activeBtn = row.querySelector('.btn-primary');
      if (!activeBtn) {
        allFinished = false;
        return;
      }
      const matchId = activeBtn.getAttribute('data-admin-match');
      const pick = activeBtn.getAttribute('data-admin-pick');
      winners[matchId] = pick;
    });

    if (!allFinished) {
      alert('Por favor selecciona el ganador oficial de todos los partidos.');
      return;
    }

    if (btnUpdatePoolResults) btnUpdatePoolResults.disabled = true;

    try {
      // 1. Save winners in the main week doc
      await db.collection('pools').doc(weekId).update({ winners: winners });

      // 2. Load all user predictions and calculate points
      const predictionsSnap = await db.collection('pools').doc(weekId).collection('predictions').get();
      
      const batch = db.batch();
      predictionsSnap.forEach(pDoc => {
        const pData = pDoc.data() || {};
        const selections = pData.selections || {};
        
        let score = 0;
        for (const matchId in winners) {
          if (selections[matchId] === winners[matchId]) {
            score++;
          }
        }

        batch.update(pDoc.ref, { points: score });
      });

      await batch.commit();
      alert('¡Puntos de clientes recalculados exitosamente!');
    } catch (err) {
      alert('Error al actualizar resultados: ' + err.message);
    } finally {
      if (btnUpdatePoolResults) btnUpdatePoolResults.disabled = false;
    }
  }

  // --- Survivor Admin Logic ---
  function setupSurvivorUI() {
    if (btnSaveSurvivorWeek) btnSaveSurvivorWeek.addEventListener('click', saveSurvivorWeekSettings);
  }

  async function saveSurvivorWeekSettings() {
    const wNum = Number(adminSurvivorWeek.value) || 1;
    
    try {
      await db.collection('survivor').doc('settings').set({ activeWeek: wNum });
      alert('Semana activa del torneo Survivor actualizada.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function loadSurvivorPlayersList() {
    const listPend = document.getElementById('survListPend');
    if (!db || !adminSurvivorPlayers) return;

    try {
      db.collection('survivor_picks').onSnapshot(snap => {
        adminSurvivorPlayers.innerHTML = '';
        if (listPend) listPend.innerHTML = '';

        let pendCount = 0;
        let apprCount = 0;

        snap.forEach(doc => {
          const p = doc.data() || {};
          const isApproved = p.approved === true || p.status === 'approved' || p.status === 'alive' || p.status === 'eliminated';
          
          if (!isApproved) {
            pendCount++;
            const row = document.createElement('div');
            row.className = 'flex-between';
            row.style.padding = '8px 12px';
            row.style.background = 'rgba(255,255,255,0.02)';
            row.style.border = '1px solid var(--border-color)';
            row.style.borderRadius = '10px';
            row.style.marginBottom = '6px';
            
            row.innerHTML = `
              <div>
                <span style="font-weight: 800;">${p.nickname || 'Anónimo'}</span>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                  Mesa/Mesero: ${p.waiter || 'N/A'}
                </div>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-primary" data-surv-id="${doc.id}" data-surv-act="approve" style="padding: 4px 8px; font-size: 11px; width: auto;">Aprobar</button>
                <button class="btn btn-danger" data-surv-id="${doc.id}" data-surv-act="reject" style="padding: 4px 8px; font-size: 11px; width: auto;">Rechazar</button>
              </div>
            `;
            if (listPend) listPend.appendChild(row);
          } else {
            apprCount++;
            const isAlive = p.status !== 'eliminated';
            const row = document.createElement('div');
            row.className = 'flex-between';
            row.style.padding = '8px 12px';
            row.style.background = 'rgba(255,255,255,0.02)';
            row.style.border = '1px solid var(--border-color)';
            row.style.borderRadius = '10px';
            row.style.marginBottom = '6px';

            row.innerHTML = `
              <div>
                <span style="font-weight: 800;">${p.nickname || 'Anónimo'}</span>
                <span class="badge ${isAlive ? 'success' : 'danger'}" style="margin-left: 6px;">
                  ${isAlive ? 'VIVO' : 'ELIMINADO'}
                </span>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                  Picks: ${JSON.stringify(p.picks || {})}
                </div>
              </div>
              <div>
                ${isAlive 
                  ? `<button class="btn btn-danger" data-surv-id="${doc.id}" data-surv-act="eliminate" style="padding: 4px 8px; font-size: 11px; width: auto;">Eliminar</button>`
                  : `<button class="btn btn-primary" data-surv-id="${doc.id}" data-surv-act="revive" style="padding: 4px 8px; font-size: 11px; width: auto; color: var(--bg-color);">Revivir</button>`
                }
              </div>
            `;
            adminSurvivorPlayers.appendChild(row);
          }
        });

        if (pendCount === 0 && listPend) {
          listPend.innerHTML = '<div class="hint-text py-2 text-center">No hay solicitudes pendientes.</div>';
        }
        if (apprCount === 0) {
          adminSurvivorPlayers.innerHTML = '<div class="hint-text py-2 text-center">No hay participantes aprobados.</div>';
        }

        // Attach listeners for all buttons
        const attachActs = (container) => {
          if (!container) return;
          container.querySelectorAll('[data-surv-act]').forEach(btn => {
            btn.addEventListener('click', async () => {
              const id = btn.getAttribute('data-surv-id');
              const act = btn.getAttribute('data-surv-act');
              if (act === 'revive') {
                toggleSurvivorPlayerStatus(id, true);
              } else if (act === 'eliminate') {
                toggleSurvivorPlayerStatus(id, false);
              } else if (act === 'approve') {
                await db.collection('survivor_picks').doc(id).update({ status: 'alive', approved: true });
              } else if (act === 'reject') {
                await db.collection('survivor_picks').doc(id).delete();
              }
            });
          });
        };
        
        attachActs(listPend);
        attachActs(adminSurvivorPlayers);

      }, err => {
        console.error('[survivor] Realtime error:', err);
      });
    } catch (e) {
      console.error('[survivor] Init player list failed:', e);
    }
  }

  async function toggleSurvivorPlayerStatus(docId, revive) {
    try {
      await db.collection('survivor_picks').doc(docId).update({
        status: revive ? 'alive' : 'eliminated'
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // --- Minuto del Gol Admin Logic ---
  let fgSelectedGameId = null;
  let fgUnsubSelectedGame = null;
  let fgUnsubSelectedPlayers = null;
  let fgUnsubGamesDropdown = null;
  
  let fgSearchMatches = [];
  let fgSelectedMatchData = null;

  function setupFirstGoalUI() {
    const btnSearchFGGames = document.getElementById('btnSearchFGGames');
    const btnCreateFGGame = document.getElementById('btnCreateFGGame');
    const btnLoadFGGame = document.getElementById('btnLoadFGGame');
    const btnDeleteFGGame = document.getElementById('btnDeleteFGGame');
    const btnLockFG = document.getElementById('btnLockFG');
    const btnUnlockFG = document.getElementById('btnUnlockFG');
    const btnToggleFGExtraTime = document.getElementById('btnToggleFGExtraTime');
    const btnToggleFGPenalties = document.getElementById('btnToggleFGPenalties');
    const btnDrawFGPenalties = document.getElementById('btnDrawFGPenalties');
    const btnResolveFGWinner = document.getElementById('btnResolveFGWinner');

    if (btnSearchFGGames) btnSearchFGGames.addEventListener('click', searchFGGames);
    if (btnCreateFGGame) btnCreateFGGame.addEventListener('click', createFirstGoalGame);
    if (btnLoadFGGame) btnLoadFGGame.addEventListener('click', () => {
      const drop = document.getElementById('fgActiveGamesDropdown');
      if (drop && drop.value) {
        loadFGGameDetails(drop.value);
      } else {
        alert('Selecciona un juego de la lista primero.');
      }
    });
    if (btnDeleteFGGame) btnDeleteFGGame.addEventListener('click', () => {
      const drop = document.getElementById('fgActiveGamesDropdown');
      if (drop && drop.value) {
        deleteFGGame(drop.value);
      } else {
        alert('Selecciona un juego de la lista primero.');
      }
    });

    if (btnLockFG) btnLockFG.addEventListener('click', () => setFGLock(true));
    if (btnUnlockFG) btnUnlockFG.addEventListener('click', () => setFGLock(false));
    if (btnToggleFGExtraTime) btnToggleFGExtraTime.addEventListener('click', toggleFGExtraTime);
    if (btnToggleFGPenalties) btnToggleFGPenalties.addEventListener('click', toggleFGPenalties);
    if (btnDrawFGPenalties) btnDrawFGPenalties.addEventListener('click', drawFGPenalties);
    if (btnResolveFGWinner) btnResolveFGWinner.addEventListener('click', resolveFGWinner);
  }

  async function searchFGGames() {
    const sportPath = document.getElementById('fgSportSelect')?.value || document.getElementById('fgLeague')?.value || 'soccer/mex.1';
    const daysRange = parseInt(document.getElementById('fgDaysRange')?.value || '14', 10);
    const btn = document.getElementById('btnSearchFGGames');
    if (btn) { btn.textContent = '⏳ Buscando...'; btn.disabled = true; }
    
    try {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 1);
      const end = new Date();
      end.setDate(today.getDate() + daysRange);

      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      
      let fullSportPath = sportPath;
      if (!fullSportPath.includes('/')) {
        fullSportPath = `soccer/${sportPath}`;
      }
      
      let url = `https://site.api.espn.com/apis/site/v2/sports/${fullSportPath}/scoreboard?dates=${fmt(start)}-${fmt(end)}&limit=100`;
      let res = await fetch(url);
      let data = await res.json();
      let events = data.events || [];

      // Fallback 1: Si no trajo eventos con rango de fechas, consultar el scoreboard estándar
      if (!events.length) {
        const url2 = `https://site.api.espn.com/apis/site/v2/sports/${fullSportPath}/scoreboard?limit=100`;
        const res2 = await fetch(url2);
        if (res2.ok) {
          const data2 = await res2.json();
          events = data2.events || [];
        }
      }

      // Fallback 2: Consultar sin filtro de fechas por día actual si aún no hay
      if (!events.length) {
        const url3 = `https://site.api.espn.com/apis/site/v2/sports/${fullSportPath}/scoreboard?dates=${fmt(today)}&limit=100`;
        const res3 = await fetch(url3);
        if (res3.ok) {
          const data3 = await res3.json();
          events = data3.events || [];
        }
      }
      
      fgSearchMatches = events;
      renderFGGamesList(fgSearchMatches);
      
    } catch (err) {
      console.error('[FirstGoal Admin]', err);
      alert('Error consultando ESPN: ' + err.message);
    } finally {
      if (btn) { btn.textContent = '🔍 Buscar Partidos'; btn.disabled = false; }
    }
  }

  function renderFGGamesList(events) {
    const container = document.getElementById('fgGamePickerContainer');
    const list = document.getElementById('fgGamePickerList');
    if (!container || !list) return;

    container.style.display = 'block';
    list.innerHTML = '';
    fgSelectedMatchData = null;

    if (!events || events.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted); font-size:13px; padding:8px;">No se encontraron partidos para esta liga/fecha.</div>';
      return;
    }

    const leagueSelect = document.getElementById('fgSportSelect');
    const defaultLeagueName = leagueSelect?.options[leagueSelect.selectedIndex]?.text?.trim() || 'Fútbol';

    // Filter out finished games
    const upcomingEvents = events.filter(ev => {
      return !(ev.status?.type?.completed === true || ev.status?.type?.state === 'post');
    });

    const eventsToRender = upcomingEvents.length ? upcomingEvents : events;

    eventsToRender.forEach(ev => {
      const comps = ev.competitions?.[0]?.competitors || [];
      const homeComp = comps.find(c => c.homeAway === 'home') || comps[1] || {};
      const awayComp = comps.find(c => c.homeAway === 'away') || comps[0] || {};
      if (!homeComp || !awayComp) return;

      const homeName = homeComp.team?.displayName || homeComp.team?.shortDisplayName || homeComp.team?.name || 'Local';
      const awayName = awayComp.team?.displayName || awayComp.team?.shortDisplayName || awayComp.team?.name || 'Visitante';
      const homeLogo = homeComp.team?.logo || (window.getTeamLogoURL ? window.getTeamLogoURL(homeName) : 'img/logo.jpg');
      const awayLogo = awayComp.team?.logo || (window.getTeamLogoURL ? window.getTeamLogoURL(awayName) : 'img/logo.jpg');
      const homeColor = '#' + (homeComp.team?.color || 'ffd100').replace('#', '');
      const awayColor = '#' + (awayComp.team?.color || 'ffd100').replace('#', '');
      const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('es-MX', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
      const status = ev.status?.type?.shortDetail || ev.status?.type?.detail || ev.status?.type?.description || '';

      const card = document.createElement('div');
      card.className = 'fg-match-item';
      card.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; cursor:pointer; transition:border-color 0.2s; margin-bottom:6px;';
      card.innerHTML = `
        <img src="${awayLogo}" style="width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 4px ${awayColor})" onerror="this.src='img/logo.jpg'" />
        <div style="flex:1;">
          <div style="font-weight:800;font-size:13px;">
            <span style="color:${awayColor}">${awayName}</span>
            <span style="color:var(--text-muted);margin:0 4px;">vs</span>
            <span style="color:${homeColor}">${homeName}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${dateStr} &nbsp;•&nbsp; ${status}</div>
        </div>
        <img src="${homeLogo}" style="width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 4px ${homeColor})" onerror="this.src='img/logo.jpg'" />
      `;

      card.addEventListener('click', () => {
        // Deselect others
        list.querySelectorAll('.fg-match-item').forEach(c => {
          c.style.borderColor = 'var(--border-color)';
          c.style.background = 'rgba(255,255,255,0.03)';
        });
        card.style.borderColor = 'var(--accent-color)';
        card.style.background = 'rgba(255,209,0,0.08)';

        const defName = `${awayName} vs ${homeName}`;
        const sportPathParts = (document.getElementById('fgSportSelect')?.value || 'soccer/mex.1').split('/');
        const selSport = sportPathParts[0] || 'soccer';
        const selSlug = sportPathParts[1] || 'mex.1';

        fgSelectedMatchData = {
          eventId: ev.id,
          homeTeam: homeName,
          awayTeam: awayName,
          homeAbbr: homeComp.team?.abbreviation || 'HOM',
          awayAbbr: awayComp.team?.abbreviation || 'AWY',
          homeLogo: homeLogo,
          awayLogo: awayLogo,
          homeColor: homeColor,
          awayColor: awayColor,
          leagueName: defaultLeagueName,
          sport: selSport,
          leagueSlug: selSlug,
          matchDate: ev.date || '',
          status: ev.status?.type?.state || 'scheduled',
          defaultName: defName
        };

        const previewInfo = document.getElementById('fgSelectedGameInfo');
        if (previewInfo) {
          previewInfo.innerHTML = `<span style="color:${awayColor}">${awayName}</span> <span style="color:var(--text-muted)">vs</span> <span style="color:${homeColor}">${homeName}</span>`;
        }
        const preview = document.getElementById('fgSelectedGamePreview');
        if (preview) preview.style.display = 'block';

        const nameInp = document.getElementById('fgGameName');
        if (nameInp) nameInp.value = defName;
      });

      list.appendChild(card);
    });
  }

  async function createFirstGoalGame() {
    if (!fgSelectedMatchData) {
      alert('Por favor selecciona un partido de la lista primero.');
      return;
    }

    const store = document.getElementById('fgStore').value;
    const customName = document.getElementById('fgGameName').value.trim();
    const gameName = customName || fgSelectedMatchData.defaultName;
    const autoApprove = document.getElementById('fgAutoApprove').checked;

    try {
      const code = 'fg_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.collection('first_goal_games').doc(code).set({
        eventId: fgSelectedMatchData.eventId || '',
        gameName: gameName,
        homeTeam: fgSelectedMatchData.homeTeam,
        awayTeam: fgSelectedMatchData.awayTeam,
        homeAbbr: fgSelectedMatchData.homeAbbr,
        awayAbbr: fgSelectedMatchData.awayAbbr,
        homeLogo: fgSelectedMatchData.homeLogo,
        awayLogo: fgSelectedMatchData.awayLogo,
        homeColor: fgSelectedMatchData.homeColor || '#1a1a24',
        awayColor: fgSelectedMatchData.awayColor || '#1a1a24',
        homeSecondaryColor: '#ffd100',
        awaySecondaryColor: '#ffd100',
        leagueName: fgSelectedMatchData.leagueName || 'Fútbol',
        sport: fgSelectedMatchData.sport || 'soccer',
        leagueSlug: fgSelectedMatchData.leagueSlug || 'mex.1',
        matchDate: fgSelectedMatchData.matchDate || '',
        store: store,
        autoApprove: autoApprove,
        active: true,
        locked: false,
        status: fgSelectedMatchData.status || 'scheduled',
        cells: {},
        activeExtraTime: false,
        activePenalties: false,
        createdAt: Date.now()
      });

      alert('🏆 ¡Juego First Striker Wins creado exitosamente!');
      document.getElementById('fgGameName').value = '';
      fgSelectedMatchData = null;
      const preview = document.getElementById('fgSelectedGamePreview');
      if (preview) preview.style.display = 'none';
      document.querySelectorAll('#fgGamePickerList .fg-match-item').forEach(c => {
        c.style.borderColor = 'var(--border-color)';
        c.style.background = 'rgba(255,255,255,0.03)';
      });
    } catch (err) {
      alert('Error al crear: ' + err.message);
    }
  }

  function loadFGGamesList() {
    if (!db) return;
    const dropdown = document.getElementById('fgActiveGamesDropdown');
    if (!dropdown) return;

    if (fgUnsubGamesDropdown) fgUnsubGamesDropdown();

    fgUnsubGamesDropdown = db.collection('first_goal_games')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        dropdown.innerHTML = '';
        if (snap.empty) {
          dropdown.innerHTML = '<option value="">-- No hay juegos --</option>';
          return;
        }

        snap.forEach(doc => {
          const game = doc.data();
          const opt = document.createElement('option');
          opt.value = doc.id;
          opt.textContent = `${game.store || 'Gral'} — ${game.gameName} (${game.active ? 'Activo' : 'Cerrado'})`;
          dropdown.appendChild(opt);
        });

        // Auto load first game if none loaded yet
        if (!fgSelectedGameId && dropdown.value) {
          loadFGGameDetails(dropdown.value);
        }
      }, err => {
        console.error('[fg] Error loading games dropdown:', err);
      });
  }

  function loadFGGameDetails(gameId) {
    fgSelectedGameId = gameId;
    
    const panel = document.getElementById('fgManagePanel');
    if (panel) panel.style.display = 'block';

    if (fgUnsubSelectedGame) fgUnsubSelectedGame();
    if (fgUnsubSelectedPlayers) fgUnsubSelectedPlayers();

    // 1. Listen to game doc changes
    fgUnsubSelectedGame = db.collection('first_goal_games').doc(gameId).onSnapshot(doc => {
      if (!doc.exists) return;
      const game = doc.data();
      
      const titleEl = document.getElementById('fgSelectedGameTitle');
      if (titleEl) {
        titleEl.textContent = `Gestionando: ${game.gameName} [${game.store}] (${game.active ? 'Activo' : 'Cerrado'})`;
      }

      // Lock/Unlock buttons state
      const btnLock = document.getElementById('btnLockFG');
      const btnUnlock = document.getElementById('btnUnlockFG');
      if (btnLock && btnUnlock) {
        if (game.locked) {
          btnLock.classList.add('btn-primary');
          btnLock.classList.remove('btn-secondary');
          btnUnlock.classList.add('btn-secondary');
          btnUnlock.classList.remove('btn-primary');
        } else {
          btnLock.classList.add('btn-secondary');
          btnLock.classList.remove('btn-primary');
          btnUnlock.classList.add('btn-primary');
          btnUnlock.classList.remove('btn-secondary');
        }
      }

      // Extra time button label
      const btnET = document.getElementById('btnToggleFGExtraTime');
      if (btnET) {
        btnET.textContent = game.activeExtraTime ? 'Desactivar Tiempos Extras' : 'Activar Tiempos Extras';
        btnET.className = game.activeExtraTime ? 'btn btn-danger' : 'btn btn-primary';
      }

      // Penalties toggle button & controls wrapper
      const btnTogglePen = document.getElementById('btnToggleFGPenalties');
      const btnDrawPen = document.getElementById('btnDrawFGPenalties');
      const penWrapper = document.getElementById('fgPenaltyControlsWrapper');
      if (btnTogglePen) {
        btnTogglePen.textContent = game.activePenalties ? 'Desactivar Tanda de Penales' : 'Activar Tanda de Penales';
        btnTogglePen.className = game.activePenalties ? 'btn btn-danger' : 'btn btn-primary';
      }
      if (penWrapper) {
        penWrapper.style.display = game.activePenalties ? 'block' : 'none';
      }
      if (btnDrawPen) {
        const hasDrawn = game.penaltyAssignments && Object.keys(game.penaltyAssignments).length > 0;
        btnDrawPen.textContent = hasDrawn ? '🎲 Re-Sortear 10 Penales' : '🎲 Sortear 10 Penales al Azar';
      }

      // Populate Winner select
      populateWinningSelect(game);
    });

    // 2. Listen to players subcollection
    fgUnsubSelectedPlayers = db.collection('first_goal_games').doc(gameId).collection('players')
      .onSnapshot(snap => {
        const listPend = document.getElementById('fgListPend');
        const listAppr = document.getElementById('fgListAppr');
        const etContainer = document.getElementById('fgExtraTimePlayersCheckboxes');
        const penContainer = document.getElementById('fgPenaltyPlayersCheckboxes');

        if (etContainer) etContainer.innerHTML = '';
        if (penContainer) penContainer.innerHTML = '';

        const pendingDocs = [];
        const approvedDocs = [];

        // Get game doc snapshot to read existing selections
        db.collection('first_goal_games').doc(gameId).get().then(gameSnap => {
          const game = gameSnap.data() || {};
          const etPlayers = game.extraTimePlayers || {};
          const penPlayers = game.penaltyPlayers || {};

          snap.forEach(pDoc => {
            const p = pDoc.data() || {};
            const pId = pDoc.id;
            const isApproved = p.approved === true || p.status === 'approved';

            if (!isApproved) {
              pendingDocs.push(pDoc);
            } else {
              approvedDocs.push(pDoc);

              // Checkbox inside ET list
              const etLabel = document.createElement('label');
              etLabel.style.display = 'flex';
              etLabel.style.alignItems = 'center';
              etLabel.style.gap = '8px';
              etLabel.style.fontSize = '12.5px';
              etLabel.style.cursor = 'pointer';
              const isEtChecked = etPlayers[pId] === true;
              etLabel.innerHTML = `
                <input type="checkbox" class="fg-et-cb" data-player-id="${pId}" ${isEtChecked ? 'checked' : ''} style="width:16px; height:16px;"/>
                <span>${p.nickname || p.name || 'Socio'}</span>
              `;
              if (etContainer) etContainer.appendChild(etLabel);

              // Checkbox inside Pen list
              const penLabel = document.createElement('label');
              penLabel.style.display = 'flex';
              penLabel.style.alignItems = 'center';
              penLabel.style.gap = '8px';
              penLabel.style.fontSize = '12.5px';
              penLabel.style.cursor = 'pointer';
              const isPenChecked = penPlayers[pId] === true;
              penLabel.innerHTML = `
                <input type="checkbox" class="fg-pen-cb" data-player-id="${pId}" ${isPenChecked ? 'checked' : ''} style="width:16px; height:16px;"/>
                <span>${p.nickname || p.name || 'Socio'}</span>
              `;
              if (penContainer) penContainer.appendChild(penLabel);
            }
          });

          // Render players using rich Grids-style cards (Foto 3)
          renderFGPlayersArray(listPend, pendingDocs, false, gameId, game);
          renderFGPlayersArray(listAppr, approvedDocs, true, gameId, game);

          // Extra Time UI badge
          const etBadge = document.getElementById('fgExtraTimeStatusBadge');
          const btnEt = document.getElementById('btnToggleFGExtraTime');
          if (etBadge) {
            if (game.activeExtraTime) {
              etBadge.textContent = 'Activo';
              etBadge.style.background = '#ff4444';
              etBadge.style.color = '#fff';
            } else {
              etBadge.textContent = 'Inactivo';
              etBadge.style.background = 'rgba(255,255,255,0.1)';
              etBadge.style.color = '#fff';
            }
          }
          if (btnEt) {
            btnEt.textContent = game.activeExtraTime ? 'Desactivar Tiempos Extras' : 'Activar Tiempos Extras';
          }

          // Penalties UI badge & summary
          const penBadge = document.getElementById('fgPenaltyStatusBadge');
          const penSumm = document.getElementById('fgPenaltyAssignmentsSummary');
          const hasAssignments = game.penaltyAssignments && Object.keys(game.penaltyAssignments).length > 0;
          if (penBadge) {
            if (!game.activePenalties) {
              penBadge.textContent = 'Inactivo';
              penBadge.style.background = 'rgba(255,255,255,0.1)';
              penBadge.style.color = '#fff';
            } else if (hasAssignments) {
              penBadge.textContent = 'Activo (Sorteado)';
              penBadge.style.background = '#00e676';
              penBadge.style.color = '#000';
              penBadge.style.fontWeight = '900';
            } else {
              penBadge.textContent = 'Activo (Sin Sortear)';
              penBadge.style.background = '#ffd100';
              penBadge.style.color = '#000';
              penBadge.style.fontWeight = '900';
            }
          }
          if (penSumm) {
            if (game.activePenalties && hasAssignments) {
              penSumm.style.display = 'block';
              let summHtml = '<strong>🎯 Resultados del Sorteo de Penales:</strong><div style="margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">';
              for (let i = 1; i <= 5; i++) {
                const l = game.penaltyAssignments[`pen_local_${i}`];
                const a = game.penaltyAssignments[`pen_away_${i}`];
                summHtml += `<div>Penal Local #${i}: <strong style="color:#ffd100;">${l?.nickname || 'Nadie'}</strong></div>`;
                summHtml += `<div>Penal Visitante #${i}: <strong style="color:#00e676;">${a?.nickname || 'Nadie'}</strong></div>`;
              }
              summHtml += '</div>';
              penSumm.innerHTML = summHtml;
            } else {
              penSumm.style.display = 'none';
            }
          }
        });
      }, err => {
        console.error('[fg] Error loading players list:', err);
      });
  }

  // Render player cards identical to Grids (Foto 3)
  function renderFGPlayersArray(container, docsArray, isApproved, gameId, game) {
    if (!container) return;
    container.innerHTML = '';

    if (!docsArray || !docsArray.length) {
      container.innerHTML = '<div class="hint-text py-2">— Sin solicitudes en esta categoría —</div>';
      return;
    }

    const cells = game.cells || {};

    docsArray.forEach(doc => {
      const p = doc.data() || {};
      const id = doc.id;
      const currentQuota = p.quota ?? p.maxBlocks ?? 1;
      const userPhoto = p.userPhoto || 'img/logo.jpg';
      const realName = p.userName || p.name || 'Usuario de Google';
      const email = p.userEmail || '';
      const apodo = (p.nickname || p.name || 'JUGADOR').toUpperCase();
      const waiter = p.waiter || 'Sin mesero';

      // Count used blocks by this user in game.cells
      let takenCount = 0;
      for (const k in cells) {
        if (cells[k]?.playerId === id) takenCount++;
      }

      const initialLetter = apodo ? apodo.charAt(0).toUpperCase() : 'J';

      const card = document.createElement('div');
      card.className = 'flex-between';
      card.style.padding = '10px 12px';
      card.style.background = isApproved ? 'rgba(255,255,255,0.02)' : 'rgba(255,209,0,0.05)';
      card.style.border = isApproved ? '1px solid var(--border-color)' : '1.5px solid rgba(255,209,0,0.4)';
      card.style.borderRadius = '12px';
      card.style.marginBottom = '8px';
      card.style.gap = '10px';
      card.style.flexWrap = 'wrap';

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; min-width:220px; flex:1;">
          <div style="width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg, #2b3a4a 0%, #1a222d 100%); border:2px solid ${isApproved ? '#ffd100' : '#ffc107'}; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:16px; color:#ffd100; flex-shrink:0;">
            ${initialLetter}
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:900; font-size:14px; color:#ffd100;">${apodo}</span>
              ${!isApproved ? `<span class="badge" style="background:rgba(255,193,7,0.2); color:#ffc107; border:1px solid #ffc107; font-size:9.5px; padding:1px 5px; font-weight:800;">PENDIENTE</span>` : ''}
            </div>
            <div style="font-size:11.5px; color:#ffffff; font-weight:700; margin-top:2px;">
              👤 ${realName} ${email ? `<span style="font-size:10.5px; color:var(--text-muted);">(${email})</span>` : ''}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:3px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>👨‍🍳 <strong>Mesero:</strong> ${waiter}</span>
              <label style="margin:0; display:inline-flex; align-items:center; gap:4px; font-weight:700;">
                🎟️ Cuadros: 
                <input type="number" id="fg_quota_${id}" value="${currentQuota}" min="1" max="100" style="width:46px; padding:2px 4px; background:var(--bg-color); border:1px solid var(--border-color); color:#ffd100; font-weight:900; border-radius:6px; text-align:center; margin:0; display:inline-block;">
              </label>
              <span>📌 Usados: <strong>${takenCount}</strong></span>
            </div>
          </div>
        </div>
        <div class="flex-row" style="gap: 6px; align-items:center;">
          ${isApproved 
            ? `<button class="btn btn-primary" onclick="saveFGPlayerQuota('${gameId}', '${id}')" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; color: var(--bg-color); border-radius:8px;">💾 Guardar Cuota</button>
               <button class="btn btn-secondary" onclick="resetFGPlayer('${gameId}', '${id}')" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; border-radius:8px;">🔄 Reset</button>
               <button class="btn btn-danger" onclick="rejectFGPlayer('${gameId}', '${id}')" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; border-radius:8px;">🗑️</button>`
            : `<button class="btn btn-primary" onclick="approveFGPlayer('${gameId}', '${id}')" style="padding: 7px 14px; font-size: 12px; font-weight:900; width: auto; color: var(--bg-color); border-radius:8px; background:#00e676; border-color:#00e676;">✅ Aprobar</button>
               <button class="btn btn-secondary" onclick="rejectFGPlayer('${gameId}', '${id}')" style="padding: 7px 10px; font-size: 12px; font-weight:800; width: auto; border-radius:8px; color:#ff4444;">✕ Rechazar</button>
               <button class="btn btn-danger" onclick="rejectFGPlayer('${gameId}', '${id}')" style="padding: 7px 10px; font-size: 12px; font-weight:800; width: auto; border-radius:8px;">🗑️</button>`
          }
        </div>
      `;

      container.appendChild(card);
    });
  }

  window.saveFGPlayerQuota = async function(gameId, playerId) {
    const quotaInput = document.getElementById('fg_quota_' + playerId);
    const quota = quotaInput ? (Number(quotaInput.value) || 1) : 1;
    try {
      await db.collection('first_goal_games').doc(gameId).collection('players').doc(playerId).update({
        quota: quota,
        maxBlocks: quota
      });
      alert('💾 Cuota actualizada a ' + quota + ' bloque(s).');
    } catch(err) {
      alert('Error: ' + err.message);
    }
  };

  window.resetFGPlayer = async function(gameId, playerId) {
    if (!confirm('¿Deseas liberar todos los bloques seleccionados por este jugador?')) return;
    try {
      const snap = await db.collection('first_goal_games').doc(gameId).get();
      const game = snap.data() || {};
      const cells = { ...(game.cells || {}) };
      let changed = false;
      for (const k in cells) {
        if (cells[k]?.playerId === playerId) {
          delete cells[k];
          changed = true;
        }
      }
      if (changed) {
        await db.collection('first_goal_games').doc(gameId).update({ cells });
      }
      alert('🔄 Bloques del jugador liberados.');
    } catch(err) {
      alert('Error: ' + err.message);
    }
  };



  window.setFGEtAllMode = function(isAll) {
    const container = document.getElementById('fgExtraTimePlayersCheckboxes');
    if (container) container.style.display = isAll ? 'none' : 'flex';
  };

  window.setFGPenAllMode = function(isAll) {
    const container = document.getElementById('fgPenaltyPlayersCheckboxes');
    if (container) container.style.display = isAll ? 'none' : 'flex';
  };

  // Exposed globally to handle click handlers
  window.approveFGPlayer = async function(gameId, playerId) {
    try {
      await db.collection('first_goal_games').doc(gameId).collection('players').doc(playerId).update({
        status: 'approved',
        approved: true
      });
    } catch (err) {
      alert('Error al aprobar: ' + err.message);
    }
  };

  window.rejectFGPlayer = async function(gameId, playerId) {
    if (!confirm('¿Deseas remover a este jugador?')) return;
    try {
      // Delete user selection from cells first
      const gameSnap = await db.collection('first_goal_games').doc(gameId).get();
      const game = gameSnap.data() || {};
      const cells = game.cells || {};
      const updatedCells = { ...cells };
      
      let changed = false;
      for (const k in updatedCells) {
        if (updatedCells[k]?.playerId === playerId) {
          delete updatedCells[k];
          changed = true;
        }
      }

      if (changed) {
        await db.collection('first_goal_games').doc(gameId).update({ cells: updatedCells });
      }

      await db.collection('first_goal_games').doc(gameId).collection('players').doc(playerId).delete();
    } catch (err) {
      alert('Error al remover: ' + err.message);
    }
  };

  async function setFGLock(locked) {
    if (!fgSelectedGameId) return;
    try {
      await db.collection('first_goal_games').doc(fgSelectedGameId).update({ locked });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function toggleFGExtraTime() {
    if (!fgSelectedGameId) return;
    try {
      const gameSnap = await db.collection('first_goal_games').doc(fgSelectedGameId).get();
      const game = gameSnap.data() || {};
      const nextState = !game.activeExtraTime;

      // Read selected players
      const isAll = document.querySelector('input[name="fgEtMode"]:checked')?.value === 'all';
      const etPlayers = {};

      if (isAll) {
        const playersSnap = await db.collection('first_goal_games').doc(fgSelectedGameId).collection('players').get();
        playersSnap.forEach(d => {
          if (d.data().status === 'approved' || d.data().approved === true) {
            etPlayers[d.id] = true;
          }
        });
      } else {
        document.querySelectorAll('.fg-et-cb').forEach(cb => {
          if (cb.checked) {
            etPlayers[cb.getAttribute('data-player-id')] = true;
          }
        });
      }

      await db.collection('first_goal_games').doc(fgSelectedGameId).update({
        activeExtraTime: nextState,
        extraTimePlayers: etPlayers
      });

      alert(nextState ? '⏱️ ¡Tiempos Extras Activados exitosamente!' : '⏱️ Tiempos Extras desactivados.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function toggleFGPenalties() {
    if (!fgSelectedGameId) return;
    try {
      const gameSnap = await db.collection('first_goal_games').doc(fgSelectedGameId).get();
      const game = gameSnap.data() || {};
      const nextState = !game.activePenalties;

      if (!nextState) {
        if (!confirm('¿Deseas desactivar la Tanda de Penales?')) return;
        await db.collection('first_goal_games').doc(fgSelectedGameId).update({
          activePenalties: false
        });
        alert('🎯 Tanda de Penales desactivada.');
      } else {
        await db.collection('first_goal_games').doc(fgSelectedGameId).update({
          activePenalties: true
        });
        alert('🎯 Tanda de Penales ACTIVADA. Ya puedes seleccionar los participantes y sortear los 10 tiros.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function drawFGPenalties() {
    if (!fgSelectedGameId) return;
    try {
      const gameSnap = await db.collection('first_goal_games').doc(fgSelectedGameId).get();
      const game = gameSnap.data() || {};
      const playersSnap = await db.collection('first_goal_games').doc(fgSelectedGameId).collection('players').get();

      // Read selected players
      const isAll = document.querySelector('input[name="fgPenMode"]:checked')?.value === 'all';
      const penPlayers = {};
      const participantIds = [];
      const idToNick = {};

      playersSnap.forEach(doc => {
        const p = doc.data();
        if (p.status === 'approved' || p.approved === true) {
          idToNick[doc.id] = p.nickname || 'Socio';
          if (isAll) {
            penPlayers[doc.id] = true;
            participantIds.push(doc.id);
          }
        }
      });

      if (!isAll) {
        document.querySelectorAll('.fg-pen-cb').forEach(cb => {
          if (cb.checked) {
            const pId = cb.getAttribute('data-player-id');
            penPlayers[pId] = true;
            participantIds.push(pId);
          }
        });
      }

      if (participantIds.length === 0) {
        alert('Selecciona al menos un jugador participante para la tanda de penales.');
        return;
      }

      // Shuffle helper
      const shuffleArray = arr => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      const shuffledPlayers = shuffleArray([...participantIds]);

      // Assign to penalties: pen_local_1, pen_away_1, up to 10
      const penaltyAssignments = {};
      
      for (let i = 1; i <= 5; i++) {
        // Local penalty
        const idxHome = ((i - 1) * 2) % shuffledPlayers.length;
        const pHomeId = shuffledPlayers[idxHome];
        penaltyAssignments[`pen_local_${i}`] = {
          playerId: pHomeId,
          nickname: idToNick[pHomeId] || 'Socio'
        };

        // Away penalty
        const idxAway = (((i - 1) * 2) + 1) % shuffledPlayers.length;
        const pAwayId = shuffledPlayers[idxAway];
        penaltyAssignments[`pen_away_${i}`] = {
          playerId: pAwayId,
          nickname: idToNick[pAwayId] || 'Socio'
        };
      }

      await db.collection('first_goal_games').doc(fgSelectedGameId).update({
        activePenalties: true,
        penaltyPlayers: penPlayers,
        penaltyAssignments: penaltyAssignments
      });

      alert('🎲 ¡Sorteo de Penales completado exitosamente y publicado!');
    } catch (err) {
      alert('Error al sortear: ' + err.message);
    }
  }

  function populateWinningSelect(game) {
    const select = document.getElementById('fgWinningCellSelect');
    if (!select) return;

    select.innerHTML = '';
    
    // Default option
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = '-- Seleccionar Celda Ganadora --';
    select.appendChild(defOpt);

    const home = game.homeTeam || 'Local';
    const away = game.awayTeam || 'Visitante';

    // 18 regular ranges (5 minutes each, 45' and 90' include added time)
    const ranges = [
      { id: '0_5', name: '0:00 - 5:59' },
      { id: '6_10', name: '6:00 - 10:59' },
      { id: '11_15', name: '11:00 - 15:59' },
      { id: '16_20', name: '16:00 - 20:59' },
      { id: '21_25', name: '21:00 - 25:59' },
      { id: '26_30', name: '26:00 - 30:59' },
      { id: '31_35', name: '31:00 - 35:59' },
      { id: '36_40', name: '36:00 - 40:59' },
      { id: '41_45', name: '41:00 - 45:59 (+)' },
      { id: '46_50', name: '46:00 - 50:59' },
      { id: '51_55', name: '51:00 - 55:59' },
      { id: '56_60', name: '56:00 - 60:59' },
      { id: '61_65', name: '61:00 - 65:59' },
      { id: '66_70', name: '66:00 - 70:59' },
      { id: '71_75', name: '71:00 - 75:59' },
      { id: '76_80', name: '76:00 - 80:59' },
      { id: '81_85', name: '81:00 - 85:59' },
      { id: '86_90', name: '86:00 - 90:59 (+)' }
    ];

    // Local regular time
    ranges.forEach(r => {
      const opt = document.createElement('option');
      opt.value = `local_${r.id}`;
      opt.textContent = `⚽ Gol de ${home} en bloque ${r.name}`;
      if (game.winningCell === opt.value) opt.selected = true;
      select.appendChild(opt);
    });

    // Visitante regular time
    ranges.forEach(r => {
      const opt = document.createElement('option');
      opt.value = `away_${r.id}`;
      opt.textContent = `⚽ Gol de ${away} en bloque ${r.name}`;
      if (game.winningCell === opt.value) opt.selected = true;
      select.appendChild(opt);
    });

    // Extra Time blocks (Strict 5-minute blocks with added time at 105' and 120')
    if (game.activeExtraTime) {
      const etRanges = [
        { id: '91_95', name: '91:00 - 95:59' },
        { id: '96_100', name: '96:00 - 100:59' },
        { id: '101_105', name: '101:00 - 105:59 (+)' },
        { id: '106_110', name: '106:00 - 110:59' },
        { id: '111_115', name: '111:00 - 115:59' },
        { id: '116_120', name: '116:00 - 120:59 (+)' }
      ];
      etRanges.forEach(r => {
        const opt = document.createElement('option');
        opt.value = `local_${r.id}`;
        opt.textContent = `⏱️ Extra: Gol de ${home} en bloque ${r.name}`;
        if (game.winningCell === opt.value) opt.selected = true;
        select.appendChild(opt);
      });
      etRanges.forEach(r => {
        const opt = document.createElement('option');
        opt.value = `away_${r.id}`;
        opt.textContent = `⏱️ Extra: Gol de ${away} en bloque ${r.name}`;
        if (game.winningCell === opt.value) opt.selected = true;
        select.appendChild(opt);
      });
    }

    // Penalty blocks
    if (game.activePenalties) {
      const assignments = game.penaltyAssignments || {};
      for (let i = 1; i <= 5; i++) {
        // Local missed
        const keyLocal = `pen_local_${i}`;
        const ownerLocal = assignments[keyLocal]?.nickname || 'Nadie';
        const optL = document.createElement('option');
        optL.value = `${keyLocal}_missed`;
        optL.textContent = `🎯 Penal: Local #${i} Fallado (Dueño: ${ownerLocal})`;
        if (game.winningCell === optL.value) optL.selected = true;
        select.appendChild(optL);

        // Away missed
        const keyAway = `pen_away_${i}`;
        const ownerAway = assignments[keyAway]?.nickname || 'Nadie';
        const optA = document.createElement('option');
        optA.value = `${keyAway}_missed`;
        optA.textContent = `🎯 Penal: Visitante #${i} Fallado (Dueño: ${ownerAway})`;
        if (game.winningCell === optA.value) optA.selected = true;
        select.appendChild(optA);
      }
    }
  }

  // 1-Click Auto-Detection of the First Goal from ESPN Official API
  window.detectFGFromESPN = async function() {
    if (!fgSelectedGameId) {
      alert('Selecciona y carga un juego de Minuto del Gol primero.');
      return;
    }
    const btn = document.getElementById('btnDetectESPNGol');
    if (btn) { btn.textContent = '⏳ Consultando ESPN...'; btn.disabled = true; }

    try {
      const snap = await db.collection('first_goal_games').doc(fgSelectedGameId).get();
      if (!snap.exists) return;
      const game = snap.data() || {};
      if (!game.eventId) {
        alert('Este juego no tiene un ID de evento de ESPN vinculado.');
        return;
      }

      const gSport = game.sport || 'soccer';
      const gLeague = game.leagueSlug || 'mex.1';
      let res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${gSport}/${gLeague}/summary?event=${game.eventId}`);
      if (!res.ok) {
        res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/concacaf.leagues.cup/summary?event=${game.eventId}`);
      }
      if (!res.ok) {
        res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/summary?event=${game.eventId}`);
      }
      if (!res.ok) throw new Error('No se pudo conectar con ESPN.');
      const data = await res.json();

      const header = data.header || {};
      const comp = (header.competitions || [])[0] || {};
      const competitors = comp.competitors || [];
      const details = comp.details || [];

      let firstGoal = null;
      if (details.length > 0) {
        const goals = details.filter(d => d.type?.text?.toLowerCase().includes('goal') || d.type?.text?.toLowerCase().includes('gol'));
        if (goals.length > 0) firstGoal = goals[0];
      }

      if (!firstGoal && data.keyEvents) {
        const goals = data.keyEvents.filter(k => k.type?.text?.toLowerCase().includes('goal') || k.type?.text?.toLowerCase().includes('gol'));
        if (goals.length > 0) firstGoal = goals[0];
      }

      if (!firstGoal) {
        const homeScore = competitors.find(c => c.homeAway === 'home')?.score || '0';
        const awayScore = competitors.find(c => c.homeAway === 'away')?.score || '0';
        if (parseInt(homeScore, 10) === 0 && parseInt(awayScore, 10) === 0) {
          alert('⚽ Marcador oficial en ESPN: 0 - 0 (Aún no cae ningún gol).');
          return;
        }
        alert('Aún no hay desglose de minuto del gol en ESPN. Ingresa el minuto y segundo manualmente.');
        return;
      }

      const teamId = firstGoal.team?.id;
      const homeTeam = competitors.find(c => c.homeAway === 'home');
      const isHomeScorer = homeTeam && String(homeTeam.id) === String(teamId);
      const teamSide = isHomeScorer ? 'local' : 'away';

      const clockDisplay = firstGoal.clock?.displayValue || firstGoal.clock?.value || '0';
      let minute = 0;
      let second = 0;
      if (typeof clockDisplay === 'string') {
        const clean = clockDisplay.replace("'", "").trim();
        if (clean.includes(':')) {
          const parts = clean.split(':');
          minute = parseInt(parts[0], 10) || 0;
          second = parseInt(parts[1], 10) || 0;
        } else if (clean.includes('+')) {
          const parts = clean.split('+');
          minute = (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0);
        } else {
          minute = parseInt(clean, 10) || 0;
        }
      } else if (typeof clockDisplay === 'number') {
        minute = Math.floor(clockDisplay / 60);
        second = clockDisplay % 60;
      }

      const teamSel = document.getElementById('fgGoalTeamSelect');
      if (teamSel) teamSel.value = teamSide;
      const minInp = document.getElementById('fgGoalMinuteInput');
      if (minInp) minInp.value = minute;
      const secInp = document.getElementById('fgGoalSecondInput');
      if (secInp) secInp.value = second;

      const scorerName = firstGoal.participants?.[0]?.athlete?.displayName || firstGoal.text || 'Gol';
      alert(`⚡ ¡1er Gol Detectado en ESPN!\n\n⚽ Anotó: ${firstGoal.team?.displayName || (teamSide === 'local' ? 'Local' : 'Visitante')}\n⏱️ Minuto y Segundo Oficial: ${minute}:${String(second).padStart(2, '0')}\n👤 Anotador: ${scorerName}`);

      window.calculateFGWinnerAuto();

    } catch (err) {
      console.error('[detectFGFromESPN]', err);
      alert('Error consultando ESPN: ' + err.message);
    } finally {
      if (btn) { btn.textContent = '⚡ Detectar 1er Gol en Vivo (ESPN Oficial)'; btn.disabled = false; }
    }
  };

  // Automating the "Sin Pasarse / Price is Right" Winner Rule with Second-Level Accuracy
  window.calculateFGWinnerAuto = async function() {
    if (!fgSelectedGameId) {
      alert('Selecciona y carga un juego de Minuto del Gol primero.');
      return;
    }

    const teamSide = document.getElementById('fgGoalTeamSelect')?.value || 'away';
    const minInput = document.getElementById('fgGoalMinuteInput');
    const secInput = document.getElementById('fgGoalSecondInput');

    const minute = parseInt(minInput?.value, 10);
    const second = parseInt(secInput?.value || '0', 10);

    const previewBox = document.getElementById('fgWinnerPreviewBox');
    const previewText = document.getElementById('fgWinnerPreviewText');
    const select = document.getElementById('fgWinningCellSelect');

    if (teamSide === 'none') {
      if (previewBox && previewText) {
        previewBox.style.display = 'block';
        previewBox.style.borderColor = '#ffd100';
        previewText.innerHTML = `⚽ <strong>Sin Goles en Tiempo Regular:</strong><br/>Selecciona en el menú desplegable abajo el Penal Fallado ganador del sorteo de penales.`;
      }
      return;
    }

    if (isNaN(minute) || minute < 0) {
      alert('Por favor ingresa el minuto exacto del gol (Ej. 18 ó 32).');
      if (minInput) minInput.focus();
      return;
    }

    // Total seconds elapsed for absolute precision
    const totalGoalSeconds = (minute * 60) + second;
    const timeFormatted = `${minute}:${String(second).padStart(2, '0')}`;

    try {
      const snap = await db.collection('first_goal_games').doc(fgSelectedGameId).get();
      if (!snap.exists) return;
      const game = snap.data() || {};
      const cells = game.cells || {};

      // Ranges in total seconds:
      // e.g. 0-5 => start 0s (0:00), end 359s (5:59)
      // 6-10 => start 360s (6:00), end 659s (10:59)
      // 16-20 => start 960s (16:00), end 1259s (20:59)
      const RANGES = [
        { id: '0_5', name: '0:00 - 5:59', startSec: 0, endSec: 359 },
        { id: '6_10', name: '6:00 - 10:59', startSec: 360, endSec: 659 },
        { id: '11_15', name: '11:00 - 15:59', startSec: 660, endSec: 959 },
        { id: '16_20', name: '16:00 - 20:59', startSec: 960, endSec: 1259 },
        { id: '21_25', name: '21:00 - 25:59', startSec: 1260, endSec: 1559 },
        { id: '26_30', name: '26:00 - 30:59', startSec: 1560, endSec: 1859 },
        { id: '31_35', name: '31:00 - 35:59', startSec: 1860, endSec: 2159 },
        { id: '36_40', name: '36:00 - 40:59', startSec: 2160, endSec: 2459 },
        { id: '41_45', name: '41:00 - 45:59 (+)', startSec: 2460, endSec: 2759 },
        { id: '46_50', name: '46:00 - 50:59', startSec: 2760, endSec: 3059 },
        { id: '51_55', name: '51:00 - 55:59', startSec: 3060, endSec: 3359 },
        { id: '56_60', name: '56:00 - 60:59', startSec: 3360, endSec: 3659 },
        { id: '61_65', name: '61:00 - 65:59', startSec: 3660, endSec: 3959 },
        { id: '66_70', name: '66:00 - 70:59', startSec: 3960, endSec: 4259 },
        { id: '71_75', name: '71:00 - 75:59', startSec: 4260, endSec: 4559 },
        { id: '76_80', name: '76:00 - 80:59', startSec: 4560, endSec: 4859 },
        { id: '81_85', name: '81:00 - 85:59', startSec: 4860, endSec: 5159 },
        { id: '86_90', name: '86:00 - 90:59 (+)', startSec: 5160, endSec: 5459 },
        { id: '91_95', name: '91:00 - 95:59', startSec: 5460, endSec: 5759 },
        { id: '96_100', name: '96:00 - 100:59', startSec: 5760, endSec: 6059 },
        { id: '101_105', name: '101:00 - 105:59 (+)', startSec: 6060, endSec: 6359 },
        { id: '106_110', name: '106:00 - 110:59', startSec: 6360, endSec: 6659 },
        { id: '111_115', name: '111:00 - 115:59', startSec: 6660, endSec: 6959 },
        { id: '116_120', name: '116:00 - 120:59 (+)', startSec: 6960, endSec: 7259 }
      ];

      const scoringTeamName = teamSide === 'local' ? (game.homeTeam || 'Local') : (game.awayTeam || 'Visitante');

      // 1. Exact match test: falls exactly between startSec and endSec
      let exactRange = RANGES.find(r => totalGoalSeconds >= r.startSec && totalGoalSeconds <= r.endSec);
      if (!exactRange) {
        exactRange = totalGoalSeconds > 5459 ? RANGES[RANGES.length - 1] : RANGES[0];
      }

      const exactKey = `${teamSide}_${exactRange.id}`;
      const exactOccupant = cells[exactKey];

      let winningKey = exactKey;
      let winningNickname = exactOccupant ? exactOccupant.nickname : '';
      let explanation = '';

      if (exactOccupant && exactOccupant.nickname) {
        explanation = `🎉 <strong>¡GANADOR DIRECTO POR ACIERTO EXACTO!</strong><br/>` +
          `Gol de <strong>${scoringTeamName}</strong> en el <strong>Minuto ${timeFormatted}</strong> (Dentro del bloque exacto <strong>${exactRange.name}</strong>).<br/>` +
          `🏆 Dueño del bloque: <span style="color:#00e676; font-size:15px; font-weight:900;">${exactOccupant.nickname}</span>.`;
      } else {
        // Find closest occupied range whose startSec <= totalGoalSeconds (Sin pasarse)
        const validCandidates = [];
        RANGES.forEach(r => {
          if (r.startSec <= totalGoalSeconds) {
            const k = `${teamSide}_${r.id}`;
            const occ = cells[k];
            if (occ && occ.nickname) {
              validCandidates.push({
                range: r,
                key: k,
                occupant: occ,
                endSec: r.endSec
              });
            }
          }
        });

        if (validCandidates.length > 0) {
          validCandidates.sort((a, b) => b.endSec - a.endSec);
          const winner = validCandidates[0];
          winningKey = winner.key;
          winningNickname = winner.occupant.nickname;

          explanation = `🎯 <strong>CÁLCULO POR APROXIMACIÓN (SIN PASARSE):</strong><br/>` +
            `El gol de <strong>${scoringTeamName}</strong> cayó en el <strong>Minuto ${timeFormatted}</strong> (El bloque exacto ${exactRange.name} estaba vacío).<br/>` +
            `🏆 <strong>Ganador Oficial:</strong> <span style="color:#00e676; font-size:15px; font-weight:900;">${winner.occupant.nickname}</span> con el bloque <strong>${winner.range.name}</strong> (El más cercano antes del gol sin pasarse).<br/>` +
            `<span style="color:#a0aab8; font-size:11px;">⚠️ Los bloques posteriores a las ${timeFormatted} quedaron descalificados por haber caído después del gol.</span>`;
        } else {
          explanation = `⚠️ <strong>SIN GANADOR POR APROXIMACIÓN:</strong><br/>` +
            `El gol cayó en el <strong>Minuto ${timeFormatted}</strong>, pero ningún participante tenía un bloque antes o igual a las ${timeFormatted} (todos los participantes se pasaron).`;
        }
      }

      if (previewBox && previewText) {
        previewBox.style.display = 'block';
        previewBox.style.borderColor = winningNickname ? '#00e676' : '#ff4444';
        previewText.innerHTML = explanation;
      }

      if (select && winningKey) {
        select.value = winningKey;
      }

      window.fgCalculatedWinner = {
        key: winningKey,
        nickname: winningNickname,
        reason: explanation,
        minute: minute,
        second: second,
        timeFormatted: timeFormatted,
        teamName: scoringTeamName
      };

    } catch (err) {
      console.error('[calculateFGWinnerAuto]', err);
      alert('Error calculando ganador: ' + err.message);
    }
  };

  async function resolveFGWinner() {
    if (!fgSelectedGameId) {
      alert('Selecciona un juego primero.');
      return;
    }
    const select = document.getElementById('fgWinningCellSelect');
    const winnerCell = select ? select.value : '';

    if (!winnerCell) {
      alert('Por favor selecciona o calcula la celda ganadora primero.');
      return;
    }

    if (!confirm('¿Estás seguro de declarar este resultado oficial? Se notificará a todos los participantes y se cerrará el juego.')) return;

    try {
      const snap = await db.collection('first_goal_games').doc(fgSelectedGameId).get();
      const game = snap.data() || {};
      const cells = game.cells || {};

      let winNick = window.fgCalculatedWinner?.nickname || cells[winnerCell]?.nickname || '';
      let winReason = window.fgCalculatedWinner?.reason || `Ganador con la celda ${winnerCell}`;

      await db.collection('first_goal_games').doc(fgSelectedGameId).update({
        winningCell: winnerCell,
        winnerNickname: winNick,
        winnerReason: winReason,
        goalMinute: window.fgCalculatedWinner?.minute || '',
        active: false,
        status: 'completed'
      });

      alert(`🏆 ¡Ganador Oficial Registrado!\n\n${winNick ? 'Ganador: ' + winNick : ''}\nEl juego ha sido cerrado con éxito.`);
      loadFGGameDetails(fgSelectedGameId);
    } catch (err) {
      alert('Error al resolver ganador: ' + err.message);
    }
  }

  async function deleteFGGame(gameId) {
    if (!confirm('¿Estás seguro de eliminar este juego permanentemente? Se borrarán todos los participantes y registros.')) return;
    try {
      // 1. Delete players subcollection
      const playersSnap = await db.collection('first_goal_games').doc(gameId).collection('players').get();
      const batch = db.batch();
      playersSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();

      // 2. Delete game doc
      await db.collection('first_goal_games').doc(gameId).delete();
      alert('Juego de Minuto del Gol eliminado.');
      fgSelectedGameId = null;
      document.getElementById('fgManagePanel').style.display = 'none';
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  }

  // Expose FirstGoal functions directly
  window.searchFGGames = searchFGGames;
  window.createFirstGoalGame = createFirstGoalGame;

  // Start initialization
  initAdmin();
})();
