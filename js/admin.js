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

  const btnSwitchAccount = document.getElementById('btnSwitchAccount');
  if (btnSwitchAccount) {
    btnSwitchAccount.addEventListener('click', async () => {
      try {
        await firebase.auth().signOut();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await firebase.auth().signInWithPopup(provider);
      } catch (err) {
        console.error('[admin] Switch account error:', err);
      }
    });
  }

  function setupGate() {
    window.onAuthChange(async (currentUser, isAdmin) => {
      user = currentUser;
      CAN_ADMIN = isAdmin;

      if (!user) {
        if (adminStatusText) {
          adminStatusText.textContent = 'Sin Sesión - Usa "Cambiar Cuenta de Google" para entrar con chefalbertomc';
          adminStatusText.className = 'badge danger';
        }
        disableAllInputs(true);
        return;
      }

      if (!CAN_ADMIN) {
        if (adminStatusText) {
          const userEmail = user.email || user.displayName || user.uid;
          adminStatusText.textContent = `Cuenta actual (${userEmail}) no es Admin. Usa "Cambiar Cuenta" para entrar con chefalbertomc`;
          adminStatusText.className = 'badge danger';
        }
        disableAllInputs(true);
        return;
      }

      if (adminStatusText) {
        adminStatusText.textContent = 'Admin Autorizado (' + (user.email || user.displayName || 'Google') + ')';
        adminStatusText.className = 'badge success';
      }
      disableAllInputs(false);

      fillTeamSelects();
      loadGamesDropdown();
      loadSurvivorPlayersList();
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
          <img src="${awayLogo}" style="width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 4px ${awayColor})" onerror="this.src='https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png'" />
          <div style="flex:1;">
            <div style="font-weight:800;font-size:13px;">
              <span style="color:${awayColor}">${awayName}</span>
              <span style="color:var(--text-muted);margin:0 4px;">@</span>
              <span style="color:${homeColor}">${homeName}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${dateStr} &nbsp;•&nbsp; ${status}</div>
          </div>
          <img src="${homeLogo}" style="width:32px;height:32px;object-fit:contain;filter:drop-shadow(0 0 4px ${homeColor})" onerror="this.src='https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png'" />
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
        const host = window.location.origin + window.location.pathname.replace('admin.html', '').replace('player-view.html', '');
        const joinUrl = `${host}?join=${encodeURIComponent(currentGridCode)}`;
        const home = (currentGame && (currentGame.homeTeam || currentGame.home)) || 'Local';
        const away = (currentGame && (currentGame.awayTeam || currentGame.away)) || 'Visitante';
        const text = `🏈 *¡Únete a nuestro Grid de Drinks & Wins!*\n\n🏆 *Partido:* ${away} @ ${home}\n🔑 *Código:* ${currentGridCode}\n\n👉 *Toca aquí para registrarte y escoger tus casillas:*\n${joinUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
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
        cells: {}
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
    if (!db || !adminSurvivorPlayers) return;

    try {
      // Real-time listener for survivor picks
      db.collection('survivor_picks').onSnapshot(snap => {
        adminSurvivorPlayers.innerHTML = '';
        
        if (snap.empty) {
          adminSurvivorPlayers.innerHTML = '<div class="hint-text py-2">No hay participantes registrados.</div>';
          return;
        }

        snap.forEach(doc => {
          const p = doc.data() || {};
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
        });

        // Click actions
        adminSurvivorPlayers.querySelectorAll('[data-surv-act]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-surv-id');
            const act = btn.getAttribute('data-surv-act');
            toggleSurvivorPlayerStatus(id, act === 'revive');
          });
        });
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

  // --- First Goal Admin Logic ---
  function setupFirstGoalUI() {
    if (btnCreateFG) btnCreateFG.addEventListener('click', createFirstGoalGame);
  }

  async function createFirstGoalGame() {
    const gameName = inpFGGameName.value.trim();
    const optsStr = txtFGOptions.value.trim();

    if (!gameName || !optsStr) {
      alert('Rellena el nombre del partido y las opciones.');
      return;
    }

    const options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
    if (options.length === 0) {
      alert('Proporciona al menos una opción.');
      return;
    }

    try {
      const code = 'fg_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.collection('first_goal_games').doc(code).set({
        gameName: gameName,
        options: options,
        winner: '',
        active: true,
        createdAt: Date.now()
      });

      alert('Juego de Primer Gol creado exitosamente.');
      inpFGGameName.value = '';
      txtFGOptions.value = '';
    } catch (err) {
      alert('Error al crear: ' + err.message);
    }
  }

  let unsubFG = null;
  function loadFGGamesList() {
    if (!db || !adminFGActiveGames) return;
    if (unsubFG) unsubFG();

    unsubFG = db.collection('first_goal_games').onSnapshot(snap => {
      adminFGActiveGames.innerHTML = '';
      
      if (snap.empty) {
        adminFGActiveGames.innerHTML = '<div class="hint-text py-2">No hay juegos de primer gol creados.</div>';
        return;
      }

      snap.forEach(doc => {
        const game = doc.data() || {};
        const code = doc.id;
        const options = game.options || [];

        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = 'rgba(255,255,255,0.02)';
        card.style.border = game.active ? '1px solid var(--border-focus)' : '1px solid var(--border-color)';

        // Options selector to declare winner
        let selectorOptions = '<option value="" disabled selected>— Declarar Ganador —</option>';
        options.forEach(opt => {
          selectorOptions += `<option value="${opt}" ${game.winner === opt ? 'selected' : ''}>${opt}</option>`;
        });

        card.innerHTML = `
          <div class="flex-between" style="margin-bottom: 12px;">
            <h4 style="font-size: 15px;">${game.gameName}</h4>
            <span class="badge ${game.active ? 'success' : ''}">${game.active ? 'Activo' : 'Cerrado'}</span>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
            Opciones: ${options.join(', ')}
          </div>

          <div class="flex-row" style="flex-wrap: wrap; gap: 8px;">
            <select id="winner_${code}" style="flex: 1; padding: 6px; font-size: 12px;">
              ${selectorOptions}
            </select>
            <button class="btn btn-primary" data-fg-win-code="${code}" style="width: auto; padding: 6px 12px; font-size: 12px; color: var(--bg-color);">
              Declarar Ganador
            </button>
            <button class="btn btn-secondary" data-fg-toggle-code="${code}" style="width: auto; padding: 6px 12px; font-size: 12px;">
              ${game.active ? 'Pausar' : 'Activar'}
            </button>
            <button class="btn btn-danger" data-fg-del-code="${code}" style="width: auto; padding: 6px 12px; font-size: 12px;">
              Eliminar
            </button>
          </div>
        `;

        adminFGActiveGames.appendChild(card);
      });

      // Actions bindings
      adminFGActiveGames.querySelectorAll('[data-fg-win-code]').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-fg-win-code');
          const winnerSel = document.getElementById(`winner_${code}`);
          const winner = winnerSel ? winnerSel.value : '';
          
          if (winner) {
            declareFGWinner(code, winner);
          } else {
            alert('Selecciona un ganador de la lista.');
          }
        });
      });

      adminFGActiveGames.querySelectorAll('[data-fg-toggle-code]').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-fg-toggle-code');
          const game = snap.docs.find(d => d.id === code).data();
          toggleFGActiveStatus(code, !game.active);
        });
      });

      adminFGActiveGames.querySelectorAll('[data-fg-del-code]').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = btn.getAttribute('data-fg-del-code');
          deleteFGGame(code);
        });
      });
    }, err => {
      console.error('[firstgoal] Admin list load error:', err);
    });
  }

  async function declareFGWinner(gameId, winner) {
    try {
      await db.collection('first_goal_games').doc(gameId).update({
        winner: winner,
        active: false // Close game when winner is declared
      });
      alert('Ganador declarado oficialmente.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function toggleFGActiveStatus(gameId, active) {
    try {
      await db.collection('first_goal_games').doc(gameId).update({
        active: active
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function deleteFGGame(gameId) {
    customConfirm('Eliminar Apuesta', '¿Deseas eliminar permanentemente esta apuesta de primer gol?', async () => {
      try {
        await db.collection('first_goal_games').doc(gameId).delete();
        
        // Clean corresponding bets in batch
        const snap = await db.collection('first_goal_bets').where('gameId', '==', gameId).get();
        const batch = db.batch();
        snap.forEach(d => batch.delete(d.ref));
        await batch.commit();

        alert('Juego de primer gol eliminado.');
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // Start initialization
  initAdmin();
})();
