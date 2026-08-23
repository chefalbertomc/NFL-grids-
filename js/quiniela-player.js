// Quiniela & Pick'em Player Module — Wings & Wins v57.0 (Multi-Quinielas Grid, Strict First-Match Lock, Sharing & Countdown)
(function () {
  'use strict';

  let db = null;
  let allQuinielas = [];
  let myParticipations = {}; // qId -> picksDoc
  let activeQuiniela = null;
  let activeFilter = 'all';
  let picks = {};
  let playerName = '';
  
  let catalogUnsubscribe = null;
  let liveUnsubscribe = null;
  let standingsUnsubscribe = null;
  let autoSyncInterval = null;
  let countdownTimerInterval = null;
  let latestPicksSnap = null;

  const deviceId = (function () {
    let id = localStorage.getItem('bww_quiniela_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
      localStorage.setItem('bww_quiniela_device_id', id);
    }
    return id;
  })();

  function initQPlayer() {
    if (window.db) {
      db = window.db;
      playerName = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name') || '';
      setupEventListeners();
      listenQuinielasCatalog();
    } else {
      setTimeout(initQPlayer, 150);
    }
  }

  function setupEventListeners() {
    // Back to catalog button
    const btnBack = document.getElementById('btnBackToCatalog');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        showCatalogView();
      });
    }

    // Save picks button
    const btnSave = document.getElementById('btnSaveQPicks');
    if (btnSave) {
      btnSave.addEventListener('click', savePlayerPicks);
    }

    // Filter pills
    const filterNav = document.getElementById('qFilterNav');
    if (filterNav) {
      filterNav.querySelectorAll('.q-filter-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          filterNav.querySelectorAll('.q-filter-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter = btn.getAttribute('data-q-filter') || 'all';
          renderQuinielasCatalog();
        });
      });
    }

    // Share buttons
    const btnShareWA = document.getElementById('btnShareQWhatsApp');
    if (btnShareWA) {
      btnShareWA.addEventListener('click', shareActiveQuinielaWhatsApp);
    }

    const btnCopy = document.getElementById('btnCopyQLink');
    if (btnCopy) {
      btnCopy.addEventListener('click', copyActiveQuinielaLink);
    }

    const btnShareTicket = document.getElementById('btnShareTicketWhatsApp');
    if (btnShareTicket) {
      btnShareTicket.addEventListener('click', sharePlayerTicketWhatsApp);
    }

    // Auto-select quiniela if in URL query string (e.g. ?q=ID or ?quiniela=ID)
    window.addEventListener('popstate', checkUrlParams);
  }

  function showToast(message, icon = '✅') {
    const toast = document.getElementById('qToast');
    const msgEl = document.getElementById('qToastMsg');
    const iconEl = document.getElementById('qToastIcon');
    if (!toast) return;

    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  function showCatalogView() {
    activeQuiniela = null;
    if (liveUnsubscribe) { liveUnsubscribe(); liveUnsubscribe = null; }
    if (standingsUnsubscribe) { standingsUnsubscribe(); standingsUnsubscribe = null; }
    if (autoSyncInterval) { clearInterval(autoSyncInterval); autoSyncInterval = null; }
    if (countdownTimerInterval) { clearInterval(countdownTimerInterval); countdownTimerInterval = null; }

    const catalogSec = document.getElementById('qCatalogSection');
    const detailSec = document.getElementById('qDetailSection');
    if (catalogSec) catalogSec.style.display = 'block';
    if (detailSec) detailSec.style.display = 'none';

    // Clear q query param in URL without reload
    const url = new URL(window.location);
    if (url.searchParams.has('q') || url.searchParams.has('quiniela')) {
      url.searchParams.delete('q');
      url.searchParams.delete('quiniela');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const targetQId = params.get('q') || params.get('quiniela');
    if (targetQId && allQuinielas.some(q => q.id === targetQId)) {
      openQuiniela(targetQId);
    }
  }

  // Realtime catalog listener
  function listenQuinielasCatalog() {
    if (!db) return;
    if (catalogUnsubscribe) catalogUnsubscribe();

    catalogUnsubscribe = db.collection('quinielas').onSnapshot(async snap => {
      const list = [];
      snap.forEach(doc => {
        const q = doc.data();
        if (q.active !== false) {
          list.push({ id: doc.id, ...q });
        }
      });

      list.sort((a, b) => (b.createdAt?.seconds || b.createdAt || 0) - (a.createdAt?.seconds || a.createdAt || 0));
      allQuinielas = list;

      // Load user participations for each quiniela
      await loadUserParticipations();

      updateTopStats();
      renderQuinielasCatalog();

      // Check if URL has quiniela ID
      const params = new URLSearchParams(window.location.search);
      const targetQId = params.get('q') || params.get('quiniela');
      if (targetQId && !activeQuiniela && allQuinielas.some(q => q.id === targetQId)) {
        // Auto-switch to tab-pools if not active
        const poolTabBtn = document.querySelector('[data-target="tab-pools"]');
        if (poolTabBtn) poolTabBtn.click();
        openQuiniela(targetQId);
      }
    }, err => {
      console.error('[QPlayer] catalog error:', err);
      const grid = document.getElementById('qCatalogGrid');
      if (grid) grid.innerHTML = `<div class="text-center hint-text py-4" style="grid-column:1/-1;">Error al cargar quinielas: ${err.message}</div>`;
    });
  }

  async function loadUserParticipations() {
    if (!db) return;
    const promises = allQuinielas.map(async q => {
      try {
        const docSnap = await db.collection('quinielas').doc(q.id).collection('picks').doc(deviceId).get();
        if (docSnap.exists) {
          myParticipations[q.id] = docSnap.data();
        } else {
          delete myParticipations[q.id];
        }
      } catch (e) {}
    });
    await Promise.all(promises);
  }

  function updateTopStats() {
    let totalMatches = 0;
    let myPointsSum = 0;
    let myCount = 0;

    allQuinielas.forEach(q => {
      const matches = q.matches || [];
      totalMatches += matches.length;

      const userPickDoc = myParticipations[q.id];
      if (userPickDoc) {
        myCount++;
        const userPicks = userPickDoc.picks || {};
        matches.forEach(m => {
          if (m.homeScore === null || m.awayScore === null || m.status === 'pre') return;
          const p = userPicks[m.id];
          if (!p) return;
          if (p.homeScore === m.homeScore && p.awayScore === m.awayScore) {
            myPointsSum += 3;
          } else {
            const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
            const pickWin = p.homeScore > p.awayScore ? 'home' : p.awayScore > p.homeScore ? 'away' : 'draw';
            if (realWin === pickWin) myPointsSum += 1;
          }
        });
      }
    });

    const elActive = document.getElementById('statActiveQuinielas');
    const elMatches = document.getElementById('statTotalMatches');
    const elMine = document.getElementById('statMyParticipations');
    const elPoints = document.getElementById('statMyTotalPoints');

    if (elActive) elActive.textContent = allQuinielas.length;
    if (elMatches) elMatches.textContent = totalMatches;
    if (elMine) elMine.textContent = myCount;
    if (elPoints) elPoints.textContent = `${myPointsSum} pts`;
  }

  // Intelligent Lock Check: Lock if manual lock is on, or if first game started / kickoff date has passed
  function checkQuinielaLockStatus(q) {
    if (q.locked === true) {
      return { isLocked: true, reason: 'Quiniela bloqueada por el administrador', earliestTime: null };
    }

    const matches = q.matches || [];
    if (matches.length === 0) {
      return { isLocked: false, reason: 'Sin partidos', earliestTime: null };
    }

    // Check if any match is already LIVE, POST or COMPLETED
    const anyStarted = matches.some(m => m.status === 'in' || m.status === 'post' || m.completed === true);
    if (anyStarted) {
      return { isLocked: true, reason: 'La jornada ya inició con el primer partido en curso o finalizado', earliestTime: null };
    }

    // Check match start timestamps if available
    let earliestTime = null;
    matches.forEach(m => {
      if (m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) {
          if (!earliestTime || d.getTime() < earliestTime) {
            earliestTime = d.getTime();
          }
        }
      }
    });

    if (earliestTime && Date.now() >= earliestTime) {
      return { isLocked: true, reason: 'La fecha y hora del primer partido ya comenzó', earliestTime };
    }

    // Check custom deadline if configured
    if (q.lockDeadline) {
      const dl = new Date(q.lockDeadline).getTime();
      if (!isNaN(dl) && Date.now() >= dl) {
        return { isLocked: true, reason: 'Se alcanzó la fecha límite para pronósticos', earliestTime: dl };
      }
      if (!earliestTime || (dl && dl < earliestTime)) {
        earliestTime = dl;
      }
    }

    return { isLocked: false, reason: 'Abierta', earliestTime };
  }

  function detectSport(m) {
    if (m.sport && m.sport !== 'mixed') return m.sport;
    const label = (m.leagueLabel || '').toLowerCase();
    if (label.includes('nfl') || label.includes('ncaa football') || label.includes('football')) return 'football';
    if (label.includes('mlb') || label.includes('beisbol') || label.includes('baseball')) return 'baseball';
    if (label.includes('nba') || label.includes('wnba') || label.includes('basquet')) return 'basketball';
    return 'soccer';
  }

  function renderQuinielasCatalog() {
    const grid = document.getElementById('qCatalogGrid');
    if (!grid) return;

    if (allQuinielas.length === 0) {
      grid.innerHTML = `
        <div class="text-center hint-text py-5" style="grid-column: 1/-1; background:rgba(0,0,0,0.2); border-radius:16px; padding:30px;">
          <div style="font-size:36px; margin-bottom:8px;">📋</div>
          <h4 style="color:#fff; margin-bottom:4px;">No hay quinielas activas en este momento</h4>
          <p style="font-size:13px; color:var(--text-muted);">Pronto publicaremos nuevas jornadas de Liga MX, NFL y Champions League.</p>
        </div>
      `;
      return;
    }

    // Filter quinielas
    const filtered = allQuinielas.filter(q => {
      const matches = q.matches || [];
      const { isLocked } = checkQuinielaLockStatus(q);
      const isMine = !!myParticipations[q.id];
      const hasLive = matches.some(m => m.status === 'in');
      const sportTypes = matches.map(detectSport);

      if (activeFilter === 'open') return !isLocked;
      if (activeFilter === 'live') return hasLive || isLocked;
      if (activeFilter === 'mine') return isMine;
      if (activeFilter === 'soccer') return sportTypes.includes('soccer');
      if (activeFilter === 'football') return sportTypes.includes('football');
      if (activeFilter === 'baseball') return sportTypes.includes('baseball');
      if (activeFilter === 'basketball') return sportTypes.includes('basketball');
      return true; // 'all'
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="text-center hint-text py-4" style="grid-column: 1/-1;">
          No hay quinielas con el filtro seleccionado ("${activeFilter}").
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach(q => {
      const matches = q.matches || [];
      const { isLocked } = checkQuinielaLockStatus(q);
      const isMine = !!myParticipations[q.id];
      const hasLive = matches.some(m => m.status === 'in');
      const allDone = matches.length > 0 && matches.every(m => m.completed || m.status === 'post');

      let statusBadge = '';
      if (hasLive) {
        statusBadge = `<span class="badge danger" style="background:#ff4444; color:#fff; animation: tvPulse 1s infinite; font-weight:900;">🔴 EN VIVO</span>`;
      } else if (allDone) {
        statusBadge = `<span class="badge" style="background:rgba(255,255,255,0.12); color:#aaa; font-weight:800;">🏁 FINALIZADA</span>`;
      } else if (isLocked) {
        statusBadge = `<span class="badge danger" style="font-weight:800;">🔒 JORNADA INICIADA</span>`;
      } else {
        statusBadge = `<span class="badge success" style="font-weight:800;">🟢 ABIERTA</span>`;
      }

      // Extract unique logos for teams preview strip
      const logos = [];
      matches.forEach(m => {
        if (m.awayLogo && !logos.includes(m.awayLogo)) logos.push(m.awayLogo);
        if (m.homeLogo && !logos.includes(m.homeLogo)) logos.push(m.homeLogo);
      });

      const card = document.createElement('div');
      card.className = 'q-catalog-card';
      card.innerHTML = `
        <div>
          <!-- Header -->
          <div class="q-catalog-card-header">
            <div>
              <span class="q-catalog-league-tag">${q.leagueLabel || 'TORNEO MULTI-DEPORTE'}</span>
              <h4 class="q-catalog-title">${q.name}</h4>
            </div>
            ${statusBadge}
          </div>

          <!-- Meta Badges -->
          <div class="q-catalog-meta">
            <span class="badge" style="background:rgba(255,255,255,0.06); font-weight:700;">
              ⚽ ${matches.length} Partidos
            </span>
            ${isMine ? `<span class="badge accent" style="font-weight:900; background:rgba(255,209,0,0.18);">✅ Ya Participas</span>` : `<span class="badge" style="font-weight:700; color:var(--text-muted);">📝 Sin Pronosticar</span>`}
          </div>

          <!-- Teams Logos Strip -->
          ${logos.length > 0 ? `
            <div class="q-catalog-teams-strip" title="Equipos participantes">
              ${logos.slice(0, 8).map(src => `<img src="${src}" class="q-strip-logo" onerror="this.src='img/logo.jpg'" alt="Team"/>`).join('')}
              ${logos.length > 8 ? `<span style="font-size:10px; color:var(--text-muted); font-weight:800; padding:0 4px;">+${logos.length - 8}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Card Actions (Enter Quiniela & Share) -->
        <div class="q-catalog-actions" style="margin-top:12px;">
          <button class="btn btn-primary" data-open-q="${q.id}" style="flex:1; padding:10px 14px; font-size:13px; font-weight:900; border-radius:10px;">
            ${isLocked ? '📊 Ver Resultados & Tabla' : '📝 Pronosticar Marcadores'}
          </button>
          <button class="btn btn-secondary btn-whatsapp-share" data-share-q="${q.id}" style="width:auto; padding:10px 12px; font-size:13px; border-radius:10px;" title="Compartir en WhatsApp">
            💬
          </button>
          <button class="btn btn-secondary" data-copy-q="${q.id}" style="width:auto; padding:10px 12px; font-size:13px; border-radius:10px;" title="Copiar enlace directo">
            🔗
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach click handlers
    grid.querySelectorAll('[data-open-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-open-q');
        openQuiniela(qId);
      });
    });

    grid.querySelectorAll('[data-share-q]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qId = btn.getAttribute('data-share-q');
        const q = allQuinielas.find(x => x.id === qId);
        if (q) shareQuinielaWhatsAppDirect(q);
      });
    });

    grid.querySelectorAll('[data-copy-q]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qId = btn.getAttribute('data-copy-q');
        copyQuinielaLinkDirect(qId);
      });
    });
  }

  // Open single Quiniela view
  async function openQuiniela(quinielaId) {
    if (!db) return;
    const qObj = allQuinielas.find(x => x.id === quinielaId);
    if (!qObj) return;

    activeQuiniela = qObj;

    // Switch view
    const catalogSec = document.getElementById('qCatalogSection');
    const detailSec = document.getElementById('qDetailSection');
    if (catalogSec) catalogSec.style.display = 'none';
    if (detailSec) detailSec.style.display = 'block';

    // Update URL query parameter
    const url = new URL(window.location);
    url.searchParams.set('q', quinielaId);
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);

    // Reset intervals
    if (liveUnsubscribe) { liveUnsubscribe(); liveUnsubscribe = null; }
    if (standingsUnsubscribe) { standingsUnsubscribe(); standingsUnsubscribe = null; }
    if (autoSyncInterval) { clearInterval(autoSyncInterval); autoSyncInterval = null; }
    if (countdownTimerInterval) { clearInterval(countdownTimerInterval); countdownTimerInterval = null; }

    picks = {};
    try {
      const myPicksDoc = await db.collection('quinielas').doc(quinielaId).collection('picks').doc(deviceId).get();
      if (myPicksDoc.exists) {
        const data = myPicksDoc.data();
        picks = data.picks || {};
        playerName = data.playerName || playerName;
        myParticipations[quinielaId] = data;
        const nameInp = document.getElementById('qPlayerName');
        if (nameInp) nameInp.value = playerName;
        
        // Show share ticket button
        const btnTicket = document.getElementById('btnShareTicketWhatsApp');
        if (btnTicket) btnTicket.style.display = 'inline-flex';
      } else {
        const btnTicket = document.getElementById('btnShareTicketWhatsApp');
        if (btnTicket) btnTicket.style.display = 'none';
      }
    } catch (e) {}

    // Live Snapshot listener on quiniela
    liveUnsubscribe = db.collection('quinielas').doc(quinielaId).onSnapshot(snap => {
      if (!snap.exists) return;
      activeQuiniela = { id: snap.id, ...snap.data() };
      updateQuinielaView(activeQuiniela);
      if (latestPicksSnap) {
        renderLiveStandings(latestPicksSnap, activeQuiniela.matches || []);
      }
    }, err => console.error('[QPlayer] live error:', err));

    // Live Snapshot listener on standings
    standingsUnsubscribe = db.collection('quinielas').doc(quinielaId).collection('picks').onSnapshot(snap => {
      latestPicksSnap = snap;
      if (!activeQuiniela) return;
      renderLiveStandings(snap, activeQuiniela.matches || []);
    }, err => console.error('[QPlayer] standings error:', err));

    // Instant sync & background loop every 12s
    syncESPNLiveScores(quinielaId);
    autoSyncInterval = setInterval(() => syncESPNLiveScores(quinielaId), 12000);

    // Initial render
    updateQuinielaView(activeQuiniela);
  }

  function updateQuinielaView(q) {
    const lockInfo = checkQuinielaLockStatus(q);
    renderLockBannerAndTimer(lockInfo);
    renderPicksForm(q, lockInfo.isLocked);
  }

  function renderLockBannerAndTimer(lockInfo) {
    const banner = document.getElementById('qLockBanner');
    const titleEl = document.getElementById('qLockBannerTitle');
    const subEl = document.getElementById('qLockBannerSubtitle');
    const timerEl = document.getElementById('qCountdownTimer');
    const timerContainer = document.getElementById('qCountdownContainer');
    const badgeEl = document.getElementById('qPicksStatusBadge');
    const btnSave = document.getElementById('btnSaveQPicks');

    if (countdownTimerInterval) {
      clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
    }

    if (lockInfo.isLocked) {
      if (banner) {
        banner.className = 'q-lock-banner locked';
        banner.querySelector('span').textContent = '🔒';
      }
      if (titleEl) titleEl.textContent = 'Jornada Iniciada — Pronósticos Bloqueados';
      if (subEl) subEl.textContent = 'Los marcadores ya no se pueden modificar porque comenzó el primer partido de la quiniela. ¡Sigue los resultados en vivo!';
      if (timerContainer) timerContainer.style.display = 'none';
      if (badgeEl) {
        badgeEl.className = 'badge danger';
        badgeEl.textContent = '🔒 BLOQUEADA';
      }
      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = '🔒 Jornada en Curso — Pronósticos Cerrados';
        btnSave.style.opacity = '0.6';
      }
    } else {
      if (banner) {
        banner.className = 'q-lock-banner open';
        banner.querySelector('span').textContent = '🟢';
      }
      if (titleEl) titleEl.textContent = 'Pronósticos Abiertos';
      if (subEl) subEl.textContent = 'Ingresa tus marcadores antes del pitazo inicial del primer partido. Se bloquearán automáticamente al comenzar.';
      if (timerContainer) timerContainer.style.display = 'block';
      if (badgeEl) {
        badgeEl.className = 'badge success';
        badgeEl.textContent = '🟢 ABIERTA';
      }
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = '💾 Guardar Mis Pronósticos';
        btnSave.style.opacity = '1';
      }

      // Start ticking countdown
      if (lockInfo.earliestTime) {
        const updateTick = () => {
          const now = Date.now();
          const diff = lockInfo.earliestTime - now;
          if (diff <= 0) {
            if (timerEl) timerEl.textContent = '00:00:00';
            clearInterval(countdownTimerInterval);
            if (activeQuiniela) updateQuinielaView(activeQuiniela);
          } else {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (timerEl) {
              timerEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }
          }
        };
        updateTick();
        countdownTimerInterval = setInterval(updateTick, 1000);
      } else {
        if (timerEl) timerEl.textContent = 'POR INICIAR';
      }
    }
  }

  window.stepScore = function(matchId, side, delta) {
    if (!activeQuiniela) return;
    const lockInfo = checkQuinielaLockStatus(activeQuiniela);
    if (lockInfo.isLocked) {
      alert('🔒 La jornada ya inició. No se pueden modificar los marcadores de esta quiniela.');
      return;
    }

    const inp = document.getElementById(`pick_${side}_${matchId}`);
    if (!inp || inp.disabled) return;
    let val = parseInt(inp.value, 10);
    if (isNaN(val)) val = 0;
    val += delta;
    if (val < 0) val = 0;
    if (val > 99) val = 99;
    inp.value = val;

    // Dynamic points preview
    const match = (activeQuiniela.matches || []).find(m => m.id === matchId);
    if (match && match.homeScore !== null && match.awayScore !== null && match.status !== 'pre') {
      const awayInp = document.getElementById(`pick_away_${matchId}`);
      const homeInp = document.getElementById(`pick_home_${matchId}`);
      const card = document.getElementById(`card_match_${matchId}`);
      const statusLabel = document.getElementById(`status_label_${matchId}`);
      if (awayInp && homeInp && card) {
        const pickA = parseInt(awayInp.value, 10);
        const pickH = parseInt(homeInp.value, 10);
        const exact = pickH === match.homeScore && pickA === match.awayScore;
        const realWin = match.homeScore > match.awayScore ? 'home' : match.awayScore > match.homeScore ? 'away' : 'draw';
        const pickWin = pickH > pickA ? 'home' : pickA > pickH ? 'away' : 'draw';
        card.className = 'q-match-card ' + (exact ? 'q-match-green' : realWin === pickWin ? 'q-match-yellow' : 'q-match-red');
        if (statusLabel) {
          statusLabel.textContent = exact ? '🎯 Exacto (+3 pts)' : realWin === pickWin ? '✓ Ganador (+1 pt)' : '✗ 0 pts';
        }
      }
    }
  };

  function renderPicksForm(q, isLocked) {
    const formEl = document.getElementById('qMatchPicksForm');
    const titleEl = document.getElementById('qPicksTitle');
    if (!formEl) return;

    if (titleEl) titleEl.textContent = `Pronósticos — ${q.name}`;

    const currentInputs = {};
    (q.matches || []).forEach(m => {
      const awayInp = document.getElementById(`pick_away_${m.id}`);
      const homeInp = document.getElementById(`pick_home_${m.id}`);
      if (awayInp && awayInp.value !== '') currentInputs[`away_${m.id}`] = awayInp.value;
      if (homeInp && homeInp.value !== '') currentInputs[`home_${m.id}`] = homeInp.value;
    });

    formEl.innerHTML = '';
    const matches = q.matches || [];

    if (matches.length === 0) {
      formEl.innerHTML = '<div class="text-center hint-text py-3">Esta quiniela no tiene partidos asignados aún.</div>';
      return;
    }

    matches.forEach(m => {
      const existPick = picks[m.id] || { homeScore: 0, awayScore: 0 };
      const currentAwayVal = currentInputs[`away_${m.id}`] !== undefined ? currentInputs[`away_${m.id}`] : (existPick.awayScore !== '' && existPick.awayScore !== undefined ? existPick.awayScore : 0);
      const currentHomeVal = currentInputs[`home_${m.id}`] !== undefined ? currentInputs[`home_${m.id}`] : (existPick.homeScore !== '' && existPick.homeScore !== undefined ? existPick.homeScore : 0);

      const isLive = m.status === 'in';
      const isDone = m.completed || m.status === 'post';
      const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';
      const isIndividualMatchLocked = isLocked || isLive || isDone;

      let statusClass = '';
      let statusLabel = '';
      if (hasScore && currentHomeVal !== '' && currentAwayVal !== '') {
        const pickH = Number(currentHomeVal);
        const pickA = Number(currentAwayVal);
        const exact = pickH === m.homeScore && pickA === m.awayScore;
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const pickWin = pickH > pickA ? 'home' : pickA > pickH ? 'away' : 'draw';
        if (exact) { statusClass = 'q-match-green'; statusLabel = '🎯 Exacto (+3 pts)'; }
        else if (realWin === pickWin) { statusClass = 'q-match-yellow'; statusLabel = '✓ Ganador (+1 pt)'; }
        else { statusClass = 'q-match-red'; statusLabel = '✗ 0 pts'; }
      }

      const card = document.createElement('div');
      card.id = `card_match_${m.id}`;
      card.className = `q-match-card ${statusClass}`;
      card.innerHTML = `
        <div class="q-match-header">
          <div>
            <span style="font-size:10px; color:var(--accent-color); font-weight:800; margin-right:6px;">${m.leagueLabel || ''}</span>
            <span style="font-size:11px; color:var(--text-muted);">${m.date || ''}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${isLive ? `<span class="badge danger" style="font-size:11px; font-weight:900; background:#ff4444; color:#fff; padding:3px 8px; border-radius:12px; animation: tvPulse 1s infinite;">🔴 EN VIVO ${m.statusStr ? '('+m.statusStr+')' : ''}</span>` : ''}
            ${isDone ? '<span class="badge" style="font-size:10px; background:rgba(255,255,255,0.1);">FINAL</span>' : ''}
            ${isIndividualMatchLocked && !isDone && !isLive ? '<span class="badge danger" style="font-size:10px;">🔒 Bloqueado</span>' : ''}
            <span id="status_label_${m.id}" style="font-weight:800; font-size:11px;">${statusLabel}</span>
          </div>
        </div>

        <div class="q-match-row-horizontal">
          <!-- Away Team (Left) -->
          <div class="q-team-side q-team-away">
            <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" class="q-team-row-logo" alt="${m.away}"/>
            <div class="q-team-text-block">
              <span class="q-team-row-name" title="${m.away}">${m.away}</span>
              ${hasScore ? `<span class="q-row-live-badge ${m.awayScore > m.homeScore ? 'winning' : ''}">${isLive ? '🔴 ' : ''}Marcador: ${m.awayScore}</span>` : ''}
            </div>
          </div>

          <!-- Steppers Widget (Center) -->
          <div class="q-steppers-center">
            <!-- Away Counter -->
            <div class="q-counter-box">
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'away', -1)" ${isIndividualMatchLocked ? 'disabled' : ''} title="Restar">−</button>
              <input type="number" min="0" max="99" class="q-score-box" id="pick_away_${m.id}" value="${currentAwayVal}" readonly />
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'away', 1)" ${isIndividualMatchLocked ? 'disabled' : ''} title="Sumar">+</button>
            </div>

            <span class="q-vs-separator">:</span>

            <!-- Home Counter -->
            <div class="q-counter-box">
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'home', -1)" ${isIndividualMatchLocked ? 'disabled' : ''} title="Restar">−</button>
              <input type="number" min="0" max="99" class="q-score-box" id="pick_home_${m.id}" value="${currentHomeVal}" readonly />
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'home', 1)" ${isIndividualMatchLocked ? 'disabled' : ''} title="Sumar">+</button>
            </div>
          </div>

          <!-- Home Team (Right) -->
          <div class="q-team-side q-team-home">
            <div class="q-team-text-block text-right">
              <span class="q-team-row-name" title="${m.home}">${m.home}</span>
              ${hasScore ? `<span class="q-row-live-badge ${m.homeScore > m.awayScore ? 'winning' : ''}">${isLive ? '🔴 ' : ''}Marcador: ${m.homeScore}</span>` : ''}
            </div>
            <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" class="q-team-row-logo" alt="${m.home}"/>
          </div>
        </div>
      `;
      formEl.appendChild(card);
    });
  }

  async function savePlayerPicks() {
    if (!db || !activeQuiniela) return;

    // Re-verify strict lock before saving
    const lockInfo = checkQuinielaLockStatus(activeQuiniela);
    if (lockInfo.isLocked) {
      alert('🔒 La jornada ya inició con el primer partido. No es posible guardar o modificar marcadores.');
      return;
    }

    const nameInp = document.getElementById('qPlayerName');
    const name = (nameInp ? nameInp.value : '').trim();
    if (!name) {
      alert('Por favor escribe tu nombre o apodo para guardar tu quiniela.');
      if (nameInp) nameInp.focus();
      return;
    }

    playerName = name;
    localStorage.setItem('bww_q_name', name);
    localStorage.setItem('player_nick', name);

    const matches = activeQuiniela.matches || [];
    const newPicks = {};

    matches.forEach(m => {
      const awayInp = document.getElementById(`pick_away_${m.id}`);
      const homeInp = document.getElementById(`pick_home_${m.id}`);
      const awayVal = awayInp ? awayInp.value.trim() : '0';
      const homeVal = homeInp ? homeInp.value.trim() : '0';

      newPicks[m.id] = { awayScore: Number(awayVal || 0), homeScore: Number(homeVal || 0) };
    });

    const btn = document.getElementById('btnSaveQPicks');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando pronósticos...'; }

    try {
      picks = newPicks;
      const pickData = {
        playerName: name,
        deviceId,
        picks: newPicks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp
          ? firebase.firestore.FieldValue.serverTimestamp()
          : Date.now()
      };

      await db.collection('quinielas').doc(activeQuiniela.id).collection('picks').doc(deviceId).set(pickData);
      myParticipations[activeQuiniela.id] = pickData;

      // Show share ticket button
      const btnTicket = document.getElementById('btnShareTicketWhatsApp');
      if (btnTicket) btnTicket.style.display = 'inline-flex';

      showToast(`¡Pronósticos guardados para "${name}"! 🏆`);
      updateTopStats();
      updateQuinielaView(activeQuiniela);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      if (btn && !lockInfo.isLocked) {
        btn.disabled = false;
        btn.textContent = '💾 Guardar Mis Pronósticos';
      }
    }
  }

  // Sharing features
  function getShareUrl(quinielaId) {
    const base = window.location.origin + window.location.pathname;
    return `${base}?q=${quinielaId}#tab-pools`;
  }

  function shareQuinielaWhatsAppDirect(q) {
    const url = getShareUrl(q.id);
    const matches = q.matches || [];
    const gamesList = matches.slice(0, 5).map(m => `⚽ ${m.away} vs ${m.home}`).join('\n');
    const extra = matches.length > 5 ? `\n...y ${matches.length - 5} partidos más` : '';

    const text = `🏆 *¡Únete a la Quiniela "${q.name}" en Drinks & Wins!*\n\n${gamesList}${extra}\n\n🎯 *Pronostica los marcadores antes de que empiece la jornada:*\n${url}\n\n¡Compite por el primer lugar! 🥇`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function copyQuinielaLinkDirect(quinielaId) {
    const url = getShareUrl(quinielaId);
    navigator.clipboard.writeText(url).then(() => {
      showToast('¡Enlace de quiniela copiado al portapapeles! 🔗');
    }).catch(() => {
      prompt('Copia este enlace para compartir:', url);
    });
  }

  function shareActiveQuinielaWhatsApp() {
    if (!activeQuiniela) return;
    shareQuinielaWhatsAppDirect(activeQuiniela);
  }

  function copyActiveQuinielaLink() {
    if (!activeQuiniela) return;
    copyQuinielaLinkDirect(activeQuiniela.id);
  }

  function sharePlayerTicketWhatsApp() {
    if (!activeQuiniela) return;
    const matches = activeQuiniela.matches || [];
    const myName = playerName || 'Jugador';
    const lines = matches.map(m => {
      const p = picks[m.id];
      const pStr = p ? `${p.awayScore} - ${p.homeScore}` : '—';
      return `• ${m.away} vs ${m.home} ➔ *${pStr}*`;
    }).join('\n');

    const url = getShareUrl(activeQuiniela.id);
    const text = `🎟️ *MI BOLETO DE QUINIELA*\n🏆 *Torneo:* ${activeQuiniela.name}\n👤 *Jugador:* ${myName}\n\n*Mis Pronósticos:*\n${lines}\n\n📲 *Participa o sigue los resultados aquí:*\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function renderLiveStandings(picksSnap, matches) {
    const el = document.getElementById('qLiveStandings');
    if (!el) return;

    const players = [];
    picksSnap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

    // Calculate live points & exact hits count
    players.forEach(p => {
      let pts = 0;
      let exactHits = 0;
      let winnerHits = 0;

      matches.forEach(m => {
        if (m.homeScore === null || m.awayScore === null || m.status === 'pre') return;
        const pick = p.picks?.[m.id];
        if (!pick) return;
        if (pick.homeScore === m.homeScore && pick.awayScore === m.awayScore) {
          pts += 3;
          exactHits += 1;
        } else {
          const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
          const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
          if (realWin === pickWin) {
            pts += 1;
            winnerHits += 1;
          }
        }
      });

      p.totalPoints = pts;
      p.exactHits = exactHits;
      p.winnerHits = winnerHits;
    });

    players.sort((a, b) => b.totalPoints - a.totalPoints || b.exactHits - a.exactHits);

    el.innerHTML = '';
    if (players.length === 0) {
      el.innerHTML = '<div class="text-center hint-text py-3">Aún no hay participantes registrados en esta quiniela. ¡Sé el primero en guardar tus pronósticos!</div>';
      return;
    }

    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-x:auto; border-radius:12px;';
    const table = document.createElement('table');
    table.className = 'q-standings-table';

    const thead = table.createTHead();
    const hr = thead.insertRow();
    hr.innerHTML = `<th style="text-align:left; padding:8px 12px; min-width:130px;">Jugador</th>` +
      matches.map(m => {
        const isLive = m.status === 'in';
        const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';

        let scoreHtml = '<span style="font-size:9px; color:var(--text-muted); font-weight:700;">PENDIENTE</span>';
        if (isLive && hasScore) {
          scoreHtml = `<div style="background:rgba(255,68,68,0.25); border:1px solid #ff4444; border-radius:6px; padding:2px 4px; margin-top:2px;">
            <span style="font-size:11px; font-weight:900; color:#ff4444; animation: tvPulse 1s infinite;">🔴 ${m.awayScore}-${m.homeScore}</span>
            <div style="font-size:8px; color:#fff; font-weight:800;">${m.statusStr || 'EN VIVO'}</div>
          </div>`;
        } else if (hasScore) {
          scoreHtml = `<span style="font-size:11px; font-weight:900; color:#ffd100;">${m.awayScore}-${m.homeScore}</span><div style="font-size:8px; color:var(--text-muted);">FINAL</div>`;
        }

        return `<th style="text-align:center; padding:6px; min-width:85px;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <div style="display:flex; align-items:center; gap:3px;">
              <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" style="width:18px;height:18px;object-fit:contain;"/>
              <span style="font-size:9px;">vs</span>
              <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" style="width:18px;height:18px;object-fit:contain;"/>
            </div>
            <span style="font-size:9px; color:var(--text-muted); font-weight:800;">${m.awayAbbr || m.away.substring(0,3)} v ${m.homeAbbr || m.home.substring(0,3)}</span>
            ${scoreHtml}
          </div>
        </th>`;
      }).join('') +
      `<th style="text-align:center; padding:8px; min-width:60px;">Exactos</th>` +
      `<th style="text-align:center; padding:8px; min-width:60px;">Total Pts</th>`;

    const tbody = table.createTBody();
    players.forEach((p, idx) => {
      const isMe = p.id === deviceId;
      const tr = tbody.insertRow();
      if (isMe) tr.style.background = 'rgba(255,209,0,0.12)';
      const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;

      let cells = `<td style="padding:8px 12px; font-weight:${isMe ? '900' : '600'}; white-space:nowrap; color:${isMe ? 'var(--accent-color)' : 'var(--text-color)'};">
        ${rankEmoji} ${p.playerName || 'Anónimo'} ${isMe ? '⭐ (Tú)' : ''}
      </td>`;

      matches.forEach(m => {
        const pick = p.picks?.[m.id];
        if (!pick) { cells += `<td class="q-s-cell q-cell-gray">—</td>`; return; }
        const pickStr = `${pick.awayScore}-${pick.homeScore}`;
        if (m.homeScore === null || m.status === 'pre') { cells += `<td class="q-s-cell q-cell-gray">${pickStr}</td>`; return; }
        const exact = pick.homeScore === m.homeScore && pick.awayScore === m.awayScore;
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
        if (exact) cells += `<td class="q-s-cell q-cell-green" title="Exacto (+3 pts)">🎯 ${pickStr}</td>`;
        else if (realWin === pickWin) cells += `<td class="q-s-cell q-cell-yellow" title="Ganador (+1 pt)">✓ ${pickStr}</td>`;
        else cells += `<td class="q-s-cell q-cell-red" title="Incorrecto (0 pts)">✗ ${pickStr}</td>`;
      });

      cells += `<td style="text-align:center; font-weight:800; font-size:13px; color:#00e676;">🎯 ${p.exactHits}</td>`;
      cells += `<td style="text-align:center; font-weight:900; font-size:16px; color:${p.totalPoints>0?'var(--accent-color)':'var(--text-muted)'};">${p.totalPoints}</td>`;
      tr.innerHTML = cells;
    });

    wrap.appendChild(table);
    el.appendChild(wrap);
  }

  function norm(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  async function syncESPNLiveScores(quinielaId) {
    if (!db || !quinielaId) return;
    try {
      const qRef = db.collection('quinielas').doc(quinielaId);
      const snap = await qRef.get();
      if (!snap.exists) return;
      const q = snap.data();
      const matches = q.matches || [];

      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 2);
      const end = new Date();
      end.setDate(today.getDate() + 21);
      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const dateParam = `dates=${fmt(start)}-${fmt(end)}&limit=100`;

      const endpoints = [
        { sport: 'soccer', slug: 'mex.1' },
        { sport: 'soccer', slug: 'mex.w.1' },
        { sport: 'soccer', slug: 'eng.1' },
        { sport: 'soccer', slug: 'esp.1' },
        { sport: 'soccer', slug: 'ita.1' },
        { sport: 'soccer', slug: 'ger.1' },
        { sport: 'soccer', slug: 'fra.1' },
        { sport: 'soccer', slug: 'usa.1' },
        { sport: 'soccer', slug: 'uefa.champions' },
        { sport: 'football', slug: 'nfl' },
        { sport: 'baseball', slug: 'mlb' },
        { sport: 'basketball', slug: 'nba' },
      ];

      const eventsBySport = {};
      const fetchPromises = endpoints.map(ep => 
        fetch(`https://site.api.espn.com/apis/site/v2/sports/${ep.sport}/${ep.slug}/scoreboard?${dateParam}`)
          .then(r => r.json())
          .then(data => {
            if (data && data.events) {
              if (!eventsBySport[ep.sport]) eventsBySport[ep.sport] = [];
              eventsBySport[ep.sport].push(...data.events.map(ev => ({ ...ev, _sport: ep.sport, _slug: ep.slug })));
            }
          })
          .catch(() => {})
      );

      await Promise.all(fetchPromises);

      let hasChanges = false;
      const updatedMatches = matches.map(m => {
        const matchSport = detectSport(m);
        const candidateEvents = eventsBySport[matchSport] || [];

        let ev = null;
        if (m.espnEventId) {
          ev = candidateEvents.find(e => String(e.id) === String(m.espnEventId));
        }

        if (!ev) {
          const mHome = norm(m.home);
          const mAway = norm(m.away);
          ev = candidateEvents.find(e => {
            const comps = e.competitions?.[0]?.competitors || [];
            const eNames = comps.map(c => norm(c.team?.displayName || c.team?.name || ''));
            const eShorts = comps.map(c => norm(c.team?.shortDisplayName || ''));
            const eAbbrs = comps.map(c => norm(c.team?.abbreviation || ''));
            const allMatchNames = [...eNames, ...eShorts, ...eAbbrs];

            const matchHome = allMatchNames.some(n => n && (mHome.includes(n) || n.includes(mHome)));
            const matchAway = allMatchNames.some(n => n && (mAway.includes(n) || n.includes(mAway)));
            return matchHome && matchAway;
          });
        }

        let newHomeScore = null;
        let newAwayScore = null;
        let state = 'pre';
        let statusStr = '';
        let completed = false;

        if (ev) {
          const comps = ev.competitions?.[0]?.competitors || [];
          const homeC = comps.find(c => c.homeAway === 'home') || comps[1] || {};
          const awayC = comps.find(c => c.homeAway === 'away') || comps[0] || {};
          completed = !!ev.status?.type?.completed;
          state = ev.status?.type?.state || 'pre';
          statusStr = ev.status?.type?.shortDetail || '';

          if (state === 'in' || state === 'post' || completed) {
            newHomeScore = (homeC && homeC.score !== undefined && homeC.score !== null) ? parseInt(homeC.score, 10) : null;
            newAwayScore = (awayC && awayC.score !== undefined && awayC.score !== null) ? parseInt(awayC.score, 10) : null;
          }
        }

        if (newHomeScore !== m.homeScore || newAwayScore !== m.awayScore || state !== m.status || statusStr !== m.statusStr) {
          hasChanges = true;
        }

        return {
          ...m,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          completed,
          status: state,
          statusStr,
          lastSync: Date.now()
        };
      });

      if (activeQuiniela && activeQuiniela.id === quinielaId) {
        activeQuiniela.matches = updatedMatches;
        updateQuinielaView(activeQuiniela);
        if (latestPicksSnap) {
          renderLiveStandings(latestPicksSnap, updatedMatches);
        }
      }

      if (hasChanges) {
        try {
          await qRef.update({ matches: updatedMatches, lastSync: Date.now() });
        } catch (errWrite) {}
      }
    } catch (e) {
      console.warn('[QPlayer] Auto-sync background error:', e);
    }
  }

  initQPlayer();
})();
