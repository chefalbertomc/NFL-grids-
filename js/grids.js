// Grids Module for Wings & Wins — Authentic NFL TV Scorebug & Ultra-Thin Smart Cards (v66.0)
(function() {
  'use strict';

  let db = null;
  let ALL_GRIDS = [];
  let MY_REGISTRATIONS = {}; // code -> playerDocData
  let SELECTED_GRID_CODE = null;
  let gridsUnsubscribe = null;
  let espnSyncInterval = null;

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
      syncESPNLiveGrids();
      if (!espnSyncInterval) {
        espnSyncInterval = setInterval(syncESPNLiveGrids, 15000);
      }
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
          free: freeCount,
          scoreHome: d.scoreHome !== undefined ? d.scoreHome : null,
          scoreAway: d.scoreAway !== undefined ? d.scoreAway : null,
          quarter: d.quarter || d.periodName || '',
          clock: d.clock || '',
          periodName: d.periodName || '',
          kickoff: d.kickoff || d.gameDate || d.date || ''
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
      syncESPNLiveGrids();

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

  // Player Audio Chime Synthesizer
  function playVictoryChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.4);
      });
    } catch (e) {}
  }

  function showPlayerApprovalToast(gameCode, gameName, quota) {
    let toast = document.getElementById('playerApprovalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'playerApprovalToast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        z-index: 100000; width: 92%; max-width: 420px;
        background: linear-gradient(135deg, #102a1e, #0a1811);
        border: 2px solid #00e676; border-radius: 16px;
        padding: 14px 16px; box-shadow: 0 10px 40px rgba(0,230,118,0.35), 0 0 20px rgba(0,0,0,0.8);
        color: #ffffff; animation: toastSlideUp 0.4s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:24px;">🎉</span>
          <div>
            <div style="font-weight:900; font-size:14px; color:#00e676;">¡Tu Solicitud fue APROBADA!</div>
            <div style="font-size:11.5px; color:#e0e0e0;">${gameName || 'NFL Grid'} (${gameCode})</div>
          </div>
        </div>
        <button type="button" onclick="document.getElementById('playerApprovalToast').remove()" style="background:none; border:none; color:var(--text-muted); font-size:16px; cursor:pointer;">✕</button>
      </div>
      <p style="font-size:12px; color:#c8e6c9; margin:0 0 10px 0;">Tienes <strong>${quota || 5} casillas listas</strong> para escoger en el tablero.</p>
      <a href="player-view.html?code=${gameCode}" class="btn btn-primary" style="text-decoration:none; padding:10px; font-size:13px; font-weight:900; border-radius:10px; text-align:center; display:block; background:#00e676; color:#000000; border:none;">
        🏈 ¡Ir a Escoger Mis Casillas Ahora!
      </a>
    `;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🎉 ¡Solicitud Aprobada en NFL Grids!', {
          body: `Tu solicitud en ${gameName} fue aprobada. Ya puedes escoger tus ${quota || 5} casillas.`,
          icon: 'img/logo.jpg'
        });
      } catch (e) {}
    }
  }

  const activePlayerUnsubs = {};

  // Load user registrations for each game & attach realtime listeners for status change
  async function loadMyRegistrations() {
    if (!db) return;
    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    const userUid = activeUser ? activeUser.uid : null;
    const userEmail = activeUser && activeUser.email ? activeUser.email.toLowerCase() : null;

    MY_REGISTRATIONS = {};

    if (!userUid) return;

    for (const g of ALL_GRIDS) {
      try {
        const playerDocRef = db.collection('games').doc(g.code).collection('players').doc(userUid);
        
        // Realtime status listener for current player in each game
        if (!activePlayerUnsubs[g.code]) {
          activePlayerUnsubs[g.code] = playerDocRef.onSnapshot(doc => {
            if (doc.exists) {
              const p = doc.data() || {};
              const prevStatus = MY_REGISTRATIONS[g.code]?.status;
              MY_REGISTRATIONS[g.code] = { docId: doc.id, ...p };

              // Check if player got approved in real-time
              const isNowApproved = p.approved === true || p.status === 'approved';
              if (isNowApproved && prevStatus === 'pending') {
                playVictoryChime();
                showPlayerApprovalToast(g.code, `${g.away} @ ${g.home}`, p.quota || p.pack || 5);
              }
              renderGrids();
            }
          });
        }

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

      // Team visuals from team-logos.js
      const awayInfo = window.getTeamInfo ? window.getTeamInfo(g.away) : { abbr: g.away.substring(0,3).toUpperCase(), color: '#003594', logo: 'img/logo.jpg' };
      const homeInfo = window.getTeamInfo ? window.getTeamInfo(g.home) : { abbr: g.home.substring(0,3).toUpperCase(), color: '#97233F', logo: 'img/logo.jpg' };

      const awayAbbr = awayInfo.abbr ? awayInfo.abbr.toUpperCase() : g.away.substring(0,3).toUpperCase();
      const homeAbbr = homeInfo.abbr ? homeInfo.abbr.toUpperCase() : g.home.substring(0,3).toUpperCase();
      const awayLogo = awayInfo.logo || 'img/logo.jpg';
      const homeLogo = homeInfo.logo || 'img/logo.jpg';
      const awayColor = awayInfo.color || '#162238';
      const homeColor = homeInfo.color || '#381622';

      // Scores & Status
      const isLive = g.isLive || (g.quarter && (g.quarter.includes('Q') || g.quarter.toLowerCase().includes('medio') || g.quarter.toLowerCase().includes('cuarto')));
      const isDone = g.isDone || (g.quarter && g.quarter.toLowerCase().includes('final'));
      const sAway = g.scoreAway !== null && g.scoreAway !== undefined ? g.scoreAway : 0;
      const sHome = g.scoreHome !== null && g.scoreHome !== undefined ? g.scoreHome : 0;

      let centerQuarter = 'POR INICIAR';
      let centerClock = '';
      let centerSub = g.kickoff || 'PREVIA';

      if (isDone) {
        centerQuarter = 'FINAL';
        centerClock = '0:00';
        centerSub = 'FINAL DEL JUEGO';
      } else if (isLive) {
        centerQuarter = g.quarter ? g.quarter.toUpperCase() : 'EN VIVO';
        centerClock = g.clock || '';
        centerSub = g.periodName ? g.periodName.toUpperCase() : 'EN JUEGO';
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '12px 14px';
      card.style.margin = '0 0 12px 0';
      card.style.borderRadius = '16px';
      card.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
      card.style.transition = 'all 0.25s ease';

      if (isApproved) {
        card.style.border = '2px solid #00e676';
        card.style.background = 'linear-gradient(145deg, rgba(10,22,14,0.96), rgba(6,14,9,0.98))';
      } else if (isPending) {
        card.style.border = '2px solid #ffc107';
        card.style.background = 'linear-gradient(145deg, rgba(26,20,8,0.96), rgba(14,10,4,0.98))';
      } else if (isSelected) {
        card.style.border = '2px solid var(--accent-color)';
        card.style.background = 'rgba(255,209,0,0.06)';
      } else {
        card.style.border = '1px solid var(--border-color)';
        card.style.background = 'var(--card-bg-hover)';
      }

      // ULTRA-THIN SINGLE-ROW BADGES STRIP
      let badgesHtml = `
        <span class="badge" style="font-weight: 800; font-size:11px; padding:3px 7px;">🔑 ${g.code}</span>
        ${g.store ? `<span class="badge accent" style="font-size:11px; padding:3px 7px;">${g.store}</span>` : ''}
      `;

      if (g.locked) {
        badgesHtml += `<span class="badge danger" style="font-weight:800; font-size:11px; padding:3px 7px;">🔒 Bloqueado</span>`;
      }

      if (isApproved) {
        // SINGLE COMPACT USER + 10/10 BADGE NEXT TO EACH OTHER
        const taken = Number(reg.taken || 0);
        const quota = Number(reg.quota || reg.pack || 0);
        badgesHtml += `
          <span class="badge" style="background:rgba(0,230,118,0.2); color:#00e676; font-weight:900; border:1px solid rgba(0,230,118,0.4); font-size:11px; padding:3px 8px;">
            👤 ${reg.nickname || reg.name || 'Tú'} • 🎯 ${taken}/${quota}
          </span>
        `;
      } else if (isPending) {
        badgesHtml += `
          <span class="badge success" style="font-weight: 800; font-size:11px; padding:3px 7px;">🟢 ${g.free}/${g.size || 100}</span>
          <span class="badge" style="background:#ffc107; color:#000; font-weight:900; font-size:11px; padding:3px 8px;">🟡 ${reg.nickname || reg.name || 'Tú'} • ${reg.pack || 5} Cuadros</span>
        `;
      } else {
        badgesHtml += `
          <span class="badge success" style="font-weight: 800; font-size:11px; padding:3px 7px;">🟢 ${g.free}/${g.size || 100}</span>
        `;
      }

      // Bottom Action Button
      let actionButtonHtml = '';
      if (isApproved) {
        const pid = activeUser ? activeUser.uid : (reg.docId || '');
        actionButtonHtml = `
          <a href="player-view.html?code=${g.code}&pid=${encodeURIComponent(pid)}" class="btn btn-primary" style="flex: 1; padding:11px 16px; font-size:14px; font-weight:900; border-radius:12px; text-decoration:none; background: linear-gradient(135deg, #ffd100, #ffb300); color: #000; box-shadow: 0 4px 14px rgba(255,209,0,0.3); justify-content:center;">
            <span>👁️ Ver Mi Grid & Escoger Casillas</span>
          </a>
        `;
      } else if (isPending) {
        actionButtonHtml = `
          <button class="btn btn-secondary" disabled style="flex: 1; padding: 11px 14px; font-size:13px; font-weight: 800; border-radius: 12px; opacity: 0.9; background: rgba(255,193,7,0.15); border: 1px solid #ffc107; color: #ffc107; cursor: not-allowed; justify-content:center;">
            ⏳ Solicitud Enviada — Esperando Aprobación
          </button>
        `;
      } else {
        actionButtonHtml = `
          <button class="btn ${isSelected ? 'btn-secondary' : 'btn-primary'}" data-select-code="${g.code}" style="flex: 1; padding: 11px 14px; font-size: 14px; font-weight: 800; border-radius: 12px; justify-content:center;">
            ${isSelected ? '📝 Completar Registro Abajo' : '🏈 Unirse a este Grid'}
          </button>
        `;
      }

      card.innerHTML = `
        <!-- NFL TV Broadcast Scorebug Header (Mobile Crisp Layout) -->
        <div class="tv-scorebug-main" style="margin-bottom: 10px;">
          <!-- Away Team Wing: [Logo] [Abbr] [Score] -->
          <div class="tv-team-wing tv-away" style="--team-bg: ${awayColor};">
            <div class="tv-team-logo-frame">
              <img src="${awayLogo}" onerror="this.onerror=null;this.src='img/logo.jpg'" alt="${g.away}" />
            </div>
            <span class="tv-team-abbr-huge">${awayAbbr}</span>
            <div class="tv-team-score">${sAway}</div>
          </div>

          <!-- Center Segment: [Quarter Clock] [Period Description] -->
          <div class="tv-center-segment">
            <div class="tv-clock-quarter">
              <span class="tv-quarter-text">${centerQuarter}</span>
              ${centerClock ? `<span class="tv-clock-text">${centerClock}</span>` : ''}
            </div>
            <span class="tv-situation-bar">${centerSub}</span>
          </div>

          <!-- Home Team Wing: [Score] [Abbr] [Logo] -->
          <div class="tv-team-wing tv-home" style="--team-bg: ${homeColor};">
            <div class="tv-team-score">${sHome}</div>
            <span class="tv-team-abbr-huge">${homeAbbr}</span>
            <div class="tv-team-logo-frame">
              <img src="${homeLogo}" onerror="this.onerror=null;this.src='img/logo.jpg'" alt="${g.home}" />
            </div>
          </div>
        </div>

        <!-- Middle: Thin Single-Row Badges Strip -->
        <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin-bottom: 10px;">
          ${badgesHtml}
        </div>

        <!-- Bottom: Action Button & WhatsApp Share -->
        <div style="display: flex; gap: 8px; align-items: center;">
          ${actionButtonHtml}
          <button class="btn btn-secondary" data-share-code="${g.code}" title="Compartir enlace por WhatsApp" style="width: auto; padding: 11px 13px; font-size: 12px; background: rgba(37,211,102,0.14); border: 1px solid #25D366; color: #25D366; display: inline-flex; align-items: center; gap: 4px; border-radius: 12px; flex-shrink: 0; font-weight: 900;">
            💬 WhatsApp
          </button>
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

  function norm(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // Live ESPN Scoreboard Sync for NFL Grids
  async function syncESPNLiveGrids() {
    if (!ALL_GRIDS || ALL_GRIDS.length === 0) return;

    try {
      const resp = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
      const data = await resp.json();
      if (!data || !data.events) return;

      let changed = false;

      ALL_GRIDS.forEach(g => {
        const gHome = norm(g.home);
        const gAway = norm(g.away);

        const ev = data.events.find(e => {
          const comps = e.competitions?.[0]?.competitors || [];
          const eNames = comps.map(c => norm(c.team?.displayName || c.team?.name || ''));
          const eShorts = comps.map(c => norm(c.team?.shortDisplayName || ''));
          const eAbbrs = comps.map(c => norm(c.team?.abbreviation || ''));
          const allNames = [...eNames, ...eShorts, ...eAbbrs];

          const matchHome = allNames.some(n => n && (gHome.includes(n) || n.includes(gHome)));
          const matchAway = allNames.some(n => n && (gAway.includes(n) || n.includes(gAway)));
          return matchHome && matchAway;
        });

        if (ev) {
          const comps = ev.competitions?.[0]?.competitors || [];
          const homeC = comps.find(c => c.homeAway === 'home') || comps[1] || {};
          const awayC = comps.find(c => c.homeAway === 'away') || comps[0] || {};

          const completed = !!ev.status?.type?.completed;
          const state = ev.status?.type?.state || 'pre';
          const statusText = ev.status?.type?.shortDetail || ev.status?.type?.detail || '';
          const clock = ev.status?.displayClock || '';

          if (state === 'in' || state === 'post' || completed) {
            g.scoreHome = (homeC && homeC.score !== undefined) ? parseInt(homeC.score, 10) : g.scoreHome;
            g.scoreAway = (awayC && awayC.score !== undefined) ? parseInt(awayC.score, 10) : g.scoreAway;
          }

          g.isLive = state === 'in';
          g.isDone = completed || state === 'post';
          g.quarter = statusText;
          g.clock = clock;
          g.periodName = ev.status?.type?.description || '';

          if (ev.date && !g.kickoff) {
            const d = new Date(ev.date);
            g.kickoff = `${d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} HRS`;
          }

          changed = true;
        }
      });

      if (changed) {
        renderGrids();
      }
    } catch (e) {
      console.warn('[grids] ESPN Live sync background note:', e);
    }
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
      if (inpNick) {
        inpNick.value = '';
        inpNick.focus();
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
    const pack = 5;

    if (!nick) {
      if (gridJoinStatus) {
        gridJoinStatus.textContent = 'Por favor escribe tu apodo (Obligatorio).';
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
        userPhoto: activeUser.photoURL || '',
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
