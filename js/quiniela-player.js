// Quiniela & Pick'em Player Module — Wings & Wins v59.0 (Interactive Live Leader, Mandatory Auth & Social Logins)
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
      const user = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
      playerName = (user && user.displayName) || localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name') || '';
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

    // Join Quiniela button
    const btnSubmitJoin = document.getElementById('btnSubmitJoinQuiniela');
    if (btnSubmitJoin) {
      btnSubmitJoin.addEventListener('click', submitJoinQuiniela);
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

    // Re-check participations on Auth state change
    if (window.onAuthChange) {
      window.onAuthChange((user) => {
        if (user && user.displayName && !playerName) {
          playerName = user.displayName;
          const nameInp = document.getElementById('qPlayerName');
          if (nameInp && !nameInp.value) nameInp.value = user.displayName;
        }
        loadUserParticipations().then(() => {
          renderQuinielasCatalog();
          if (activeQuiniela && latestPicksSnap) {
            renderLiveStandings(latestPicksSnap, activeQuiniela.matches || []);
          }
        });
      });
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
      renderQuinielasCatalog();

      // Check if URL has quiniela ID
      const params = new URLSearchParams(window.location.search);
      const targetQId = params.get('q') || params.get('quiniela');
      if (targetQId && !activeQuiniela && allQuinielas.some(q => q.id === targetQId)) {
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

  const qParticipationUnsubs = {};

  async function loadUserParticipations() {
    if (!db) return;
    const user = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    const authUid = user ? user.uid : null;

    if (!authUid) return;

    allQuinielas.forEach(q => {
      try {
        const playerDocRef = db.collection('quinielas').doc(q.id).collection('picks').doc(authUid);
        if (!qParticipationUnsubs[q.id]) {
          qParticipationUnsubs[q.id] = playerDocRef.onSnapshot(doc => {
            if (doc.exists) {
              const data = doc.data() || {};
              const prevStatus = myParticipations[q.id]?.status;
              const wasApproved = myParticipations[q.id]?.approved === true || prevStatus === 'approved';
              const isNowApproved = data.approved === true || data.status === 'approved';

              myParticipations[q.id] = data;

              if (isNowApproved && !wasApproved && prevStatus === 'pending') {
                if (typeof window.playVictoryChime === 'function') window.playVictoryChime();
                showToast(`🎉 ¡Tu solicitud fue APROBADA en "${q.name}"! 🏆`);
              }

              renderQuinielasCatalog();
              if (activeQuiniela && activeQuiniela.id === q.id) {
                updateQuinielaView(activeQuiniela);
              }
            } else {
              delete myParticipations[q.id];
              renderQuinielasCatalog();
            }
          });
        }
      } catch (e) {}
    });
  }

  // --- Universal Match Date & Chronological Sorting Helper ---
  function parseMatchTimestamp(m) {
    if (!m) return 0;

    // 1. If explicit ISO rawDate or dateISO or numeric timestamp is available
    if (m.rawDate) {
      const t = new Date(m.rawDate).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (m.dateISO) {
      const t = new Date(m.dateISO).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (typeof m.timestamp === 'number' && m.timestamp > 0) {
      return m.timestamp;
    }

    const str = (m.date || '').toLowerCase().trim();
    if (!str) return 0;

    // 2. Direct JavaScript Date parse
    const direct = new Date(str).getTime();
    if (!isNaN(direct) && direct > 0) return direct;

    // 3. Multi-language month dictionary (Spanish & English)
    const monthMap = {
      'ene': 0, 'enero': 0, 'jan': 0, 'january': 0,
      'feb': 1, 'febrero': 1, 'february': 1,
      'mar': 2, 'marzo': 2, 'march': 2,
      'abr': 3, 'abril': 3, 'apr': 3, 'april': 3,
      'may': 4, 'mayo': 4,
      'jun': 5, 'junio': 5, 'june': 5,
      'jul': 6, 'julio': 6, 'july': 6,
      'ago': 7, 'agosto': 7, 'aug': 7, 'august': 7,
      'sep': 8, 'septiembre': 8, 'sept': 8, 'september': 8,
      'oct': 9, 'octubre': 9, 'october': 9,
      'nov': 10, 'noviembre': 10, 'november': 10,
      'dic': 11, 'diciembre': 11, 'dec': 11, 'december': 11
    };

    // Clean accents and punctuation
    const cleanStr = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Extract Day (1-31) and Month Name
    let day = null;
    let month = null;

    // Pattern A: "28 de ago" or "28 ago" or "28 de agosto"
    const patternA = cleanStr.match(/(\d{1,2})\s*(?:de|\/|-)?\s*([a-z]+)/i);
    if (patternA) {
      const dVal = parseInt(patternA[1], 10);
      const mRaw = patternA[2].toLowerCase();
      const mKey = mRaw.slice(0, 3);
      if (dVal >= 1 && dVal <= 31 && (monthMap[mKey] !== undefined || monthMap[mRaw] !== undefined)) {
        day = dVal;
        month = monthMap[mKey] !== undefined ? monthMap[mKey] : monthMap[mRaw];
      }
    }

    // Pattern B: "ago 28" or "agosto 28"
    if (day === null || month === null) {
      const patternB = cleanStr.match(/([a-z]+)\s*(\d{1,2})/i);
      if (patternB) {
        const mRaw = patternB[1].toLowerCase();
        const mKey = mRaw.slice(0, 3);
        const dVal = parseInt(patternB[2], 10);
        if (dVal >= 1 && dVal <= 31 && (monthMap[mKey] !== undefined || monthMap[mRaw] !== undefined)) {
          day = dVal;
          month = monthMap[mKey] !== undefined ? monthMap[mKey] : monthMap[mRaw];
        }
      }
    }

    // Extract Time: "12:45 p.m.", "05:00 p.m.", "05:00 p. m.", "17:00", "1:30 pm"
    let hours = 12;
    let minutes = 0;
    const timeMatch = cleanStr.match(/(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ap = (timeMatch[3] || '').toLowerCase();
      if (ap === 'p' && hours < 12) hours += 12;
      if (ap === 'a' && hours === 12) hours = 0;
    }

    const yearMatch = cleanStr.match(/\b(20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    if (day !== null && month !== null) {
      return new Date(year, month, day, hours, minutes, 0, 0).getTime();
    }

    return 0;
  }

  function sortMatchesChronologically(matchesList) {
    if (!Array.isArray(matchesList)) return [];
    return [...matchesList].sort((a, b) => {
      const tA = parseMatchTimestamp(a);
      const tB = parseMatchTimestamp(b);
      return tA - tB;
    });
  }

  window.sortMatchesChronologically = sortMatchesChronologically;
  window.parseMatchTimestamp = parseMatchTimestamp;

  // Intelligent Lock Check: Lock if manual lock is on, or if first game started / kickoff date has passed
  function checkQuinielaLockStatus(q) {
    if (q.locked === true) {
      return { isLocked: true, reason: 'Quiniela bloqueada por el administrador', earliestTime: null };
    }

    const rawMatches = q.matches || [];
    if (rawMatches.length === 0) {
      return { isLocked: false, reason: 'Sin partidos', earliestTime: null };
    }

    const matches = sortMatchesChronologically(rawMatches);

    // Check if any match is already LIVE, POST or COMPLETED
    const anyStarted = matches.some(m => m.status === 'in' || m.status === 'post' || m.completed === true);
    if (anyStarted) {
      return { isLocked: true, reason: 'La jornada ya inició con el primer partido en curso o finalizado', earliestTime: null };
    }

    // Check match start timestamps using universal date parser
    let earliestTime = null;
    matches.forEach(m => {
      const t = parseMatchTimestamp(m);
      if (t > 0) {
        if (!earliestTime || t < earliestTime) {
          earliestTime = t;
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
    if (!m) return 'soccer';
    if (m.sport && m.sport !== 'mixed') return m.sport;
    const label = (m.leagueLabel || '').toLowerCase();
    const slug = (m.slug || '').toLowerCase();
    if (label.includes('nfl') || label.includes('ncaa football') || label.includes('football') || slug.includes('nfl') || slug.includes('football') || slug.includes('college-football')) return 'football';
    if (label.includes('mlb') || label.includes('beisbol') || label.includes('baseball') || slug.includes('mlb') || slug.includes('baseball')) return 'baseball';
    if (label.includes('nba') || label.includes('wnba') || label.includes('basquet') || label.includes('basketball') || slug.includes('nba') || slug.includes('wnba') || slug.includes('basketball') || slug.includes('mens-college-basketball')) return 'basketball';
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

      const card = document.createElement('div');
      card.className = 'q-catalog-card';
      card.innerHTML = `
        <div>
          <!-- Header -->
          <div class="q-catalog-card-header">
            <div>
              <span class="q-catalog-league-tag">${q.leagueLabel || 'TORNEO'}</span>
              <h4 class="q-catalog-title">${q.name}</h4>
            </div>
            ${statusBadge}
          </div>

          <!-- Meta Badges -->
          <div class="q-catalog-meta">
            <span class="badge" style="background:rgba(255,255,255,0.06); font-weight:700;">
              ⚽ ${matches.length} Partidos
            </span>
            ${isMine 
              ? ((myParticipations[q.id]?.approved === true || myParticipations[q.id]?.status === 'approved')
                ? `<span class="badge" style="font-weight:900; background:rgba(0,230,118,0.18); color:#00e676; border:1px solid rgba(0,230,118,0.4);">✅ Confirmado</span>`
                : `<span class="badge" style="font-weight:900; background:rgba(255,193,7,0.18); color:#ffc107; border:1px solid rgba(255,193,7,0.4);">🟡 Pendiente</span>`)
              : `<span class="badge" style="font-weight:700; color:var(--text-muted);">📝 Sin Pronosticar</span>`}
          </div>
        </div>

        <!-- Card Actions (Enter Quiniela & 1 Single Share Button) -->
        <div class="q-catalog-actions" style="margin-top:14px; display:flex; gap:8px;">
          ${(() => {
            const myReg = myParticipations[q.id];
            const isApproved = myReg && (myReg.approved === true || myReg.status === 'approved');
            const isPending = myReg && !isApproved;

            if (isApproved) {
              return `<button class="btn btn-primary" data-open-q="${q.id}" style="flex:1; padding:11px 14px; font-size:13px; font-weight:900; border-radius:10px; background:linear-gradient(135deg, #ffd100, #ffb300); color:#000;">
                ${isLocked ? '📊 Ver Resultados & Tabla' : '📝 Pronosticar Marcadores'}
              </button>`;
            } else if (isPending) {
              return `<button class="btn btn-secondary" data-open-q="${q.id}" style="flex:1; padding:11px 14px; font-size:12px; font-weight:800; border-radius:10px; background:rgba(255,193,7,0.15); border:1px solid #ffc107; color:#ffc107;">
                ⏳ Solicitud Enviada — Esperando Aprobación
              </button>`;
            } else {
              return `<button class="btn btn-primary" data-join-q="${q.id}" style="flex:1; padding:11px 14px; font-size:13px; font-weight:900; border-radius:10px;">
                📋 Unirse a esta Quiniela
              </button>`;
            }
          })()}
          <button class="btn btn-secondary btn-whatsapp-share" data-share-q="${q.id}" style="width:auto; padding:11px 14px; font-size:13px; border-radius:10px; display:inline-flex; align-items:center; gap:6px;" title="Compartir en WhatsApp">
            <span>💬</span>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Attach click handlers
    grid.querySelectorAll('[data-open-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-open-q');
        const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
        if (!activeUser) {
          window.requireUserAuth(() => openQuiniela(qId), '¡Inicia Sesión con Google!', 'Para ingresar a la quiniela, registrar tus pronósticos y competir en la tabla, inicia sesión con Google.');
          return;
        }
        openQuiniela(qId);
      });
    });

    grid.querySelectorAll('[data-join-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-join-q');
        selectQuinielaToJoin(qId);
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
  }

  let SELECTED_Q_ID_FOR_JOIN = null;

  function selectQuinielaToJoin(qId) {
    const q = allQuinielas.find(x => x.id === qId);
    if (!q) return;

    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    if (!activeUser) {
      window.requireUserAuth(() => selectQuinielaToJoin(qId), '¡Inicia Sesión con Google!', 'Para solicitar tu entrada a la quiniela, inicia sesión.');
      return;
    }

    SELECTED_Q_ID_FOR_JOIN = qId;
    const form = document.getElementById('joinQuinielaForm');
    const label = document.getElementById('selectedQuinielaLabel');
    const inpNick = document.getElementById('inpQNick');
    const inpWaiter = document.getElementById('inpQWaiter');
    const statusMsg = document.getElementById('qJoinStatus');

    if (label) label.textContent = `📝 Solicitar Entrada a "${q.name}"`;
    if (inpNick && !inpNick.value) inpNick.value = activeUser.displayName ? activeUser.displayName.toUpperCase().slice(0, 20) : '';
    if (statusMsg) statusMsg.textContent = '';
    if (form) {
      form.style.display = 'block';
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  window.selectQuinielaToJoin = selectQuinielaToJoin;

  async function submitJoinQuiniela() {
    if (!SELECTED_Q_ID_FOR_JOIN || !db) return;
    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    if (!activeUser) {
      window.requireUserAuth(submitJoinQuiniela, '¡Inicia Sesión!', 'Para solicitar entrada a la quiniela, inicia sesión con Google.');
      return;
    }

    const inpNick = document.getElementById('inpQNick');
    const inpWaiter = document.getElementById('inpQWaiter');
    const statusMsg = document.getElementById('qJoinStatus');
    const btnSubmit = document.getElementById('btnSubmitJoinQuiniela');

    const nick = (inpNick ? inpNick.value : '').trim().toUpperCase();
    const waiter = (inpWaiter ? inpWaiter.value : '').trim();

    if (!nick) {
      if (statusMsg) {
        statusMsg.textContent = 'Por favor escribe tu apodo (Obligatorio).';
        statusMsg.style.color = 'var(--danger-color)';
      }
      if (inpNick) inpNick.focus();
      return;
    }

    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = '⏳ Enviando solicitud...'; }

    try {
      const q = allQuinielas.find(x => x.id === SELECTED_Q_ID_FOR_JOIN);
      const playerRef = db.collection('quinielas').doc(SELECTED_Q_ID_FOR_JOIN).collection('picks').doc(activeUser.uid);

      const playerData = {
        id: activeUser.uid,
        playerId: activeUser.uid,
        userUid: activeUser.uid,
        userEmail: activeUser.email || '',
        userName: activeUser.displayName || nick,
        playerName: nick,
        nickname: nick,
        photoURL: activeUser.photoURL || '',
        userPhoto: activeUser.photoURL || '',
        waiter: waiter || 'Sin mesero',
        approved: false,
        status: 'pending',
        picks: {},
        tiebreaker: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      };

      await playerRef.set(playerData, { merge: true });
      myParticipations[SELECTED_Q_ID_FOR_JOIN] = playerData;

      alert(`✅ ¡Solicitud enviada para ${nick}! En cuanto el mesero o administrador te apruebe, el botón cambiará para que puedas ingresar tus pronósticos.`);
      
      const form = document.getElementById('joinQuinielaForm');
      if (form) form.style.display = 'none';

      renderQuinielasCatalog();
    } catch (err) {
      console.error('[QPlayer] Error joining quiniela:', err);
      if (statusMsg) {
        statusMsg.textContent = 'Error al enviar solicitud: ' + err.message;
        statusMsg.style.color = 'var(--danger-color)';
      }
    } finally {
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.textContent = '✅ Solicitar Entrada'; }
    }
  }

  let isEditingPicks = false;

  window.toggleEditQuinielaPicks = function(editState) {
    isEditingPicks = editState !== undefined ? editState : !isEditingPicks;
    if (activeQuiniela) updateQuinielaView(activeQuiniela);
  };

  // Open single Quiniela view
  async function openQuiniela(quinielaId) {
    if (!db) return;
    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    if (!activeUser) {
      window.requireUserAuth(() => openQuiniela(quinielaId), '¡Inicia Sesión con Google!', 'Para entrar a la quiniela, guardar tus marcadores y seguir las posiciones en vivo, inicia sesión.');
      return;
    }

    const qObj = allQuinielas.find(x => x.id === quinielaId);
    if (!qObj) return;

    activeQuiniela = { ...qObj, matches: sortMatchesChronologically(qObj.matches || []) };

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
    isEditingPicks = false;
    const user = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    const authUid = user ? user.uid : null;

    try {
      let myPicksDoc = null;
      if (authUid) {
        const s = await db.collection('quinielas').doc(quinielaId).collection('picks').doc(authUid).get();
        if (s.exists) myPicksDoc = s;
      }
      if (!myPicksDoc) {
        const s2 = await db.collection('quinielas').doc(quinielaId).collection('picks').doc(deviceId).get();
        if (s2.exists) myPicksDoc = s2;
      }

      if (myPicksDoc && myPicksDoc.exists) {
        const data = myPicksDoc.data();
        picks = data.picks || {};
        playerName = data.playerName || (user && user.displayName) || playerName;
        myParticipations[quinielaId] = data;
        const nameInp = document.getElementById('qPlayerName');
        if (nameInp) nameInp.value = playerName;
        isEditingPicks = Object.keys(picks).length === 0;
      } else {
        if (user && user.displayName) {
          playerName = user.displayName;
          const nameInp = document.getElementById('qPlayerName');
          if (nameInp) nameInp.value = playerName;
        }
        isEditingPicks = true;
      }
    } catch (e) {
      isEditingPicks = true;
    }

    // Real-time listener for current player's approval status in this quiniela
    if (authUid) {
      db.collection('quinielas').doc(quinielaId).collection('picks').doc(authUid).onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data() || {};
          const prevStatus = myParticipations[quinielaId]?.status;
          const wasApproved = myParticipations[quinielaId]?.approved === true || prevStatus === 'approved';
          const isNowApproved = data.approved === true || data.status === 'approved';

          myParticipations[quinielaId] = data;
          picks = data.picks || picks;

          if (isNowApproved && !wasApproved && prevStatus === 'pending') {
            if (typeof playVictoryChime === 'function') playVictoryChime();
            showToast(`🎉 ¡Tu participación en "${activeQuiniela?.name || 'la quiniela'}" fue aprobada! 🏆`);
          }

          if (activeQuiniela) updateQuinielaView(activeQuiniela);
        }
      });
    }

    // Live Snapshot listener on quiniela
    liveUnsubscribe = db.collection('quinielas').doc(quinielaId).onSnapshot(snap => {
      if (!snap.exists) return;
      const data = snap.data() || {};
      activeQuiniela = { id: snap.id, ...data, matches: sortMatchesChronologically(data.matches || []) };
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

    const hasSavedPicks = picks && Object.keys(picks).length > 0;
    const shouldShowEditor = isEditingPicks && !lockInfo.isLocked;

    const editorSec = document.getElementById('qPicksSection');
    const standingsSec = document.getElementById('qStandingsSection');

    // Button to edit picks in toolbar if open
    let btnToggleEdit = document.getElementById('btnToolbarEditQPicks');
    const toolbar = document.querySelector('.q-toolbar');
    if (toolbar && !lockInfo.isLocked) {
      if (!btnToggleEdit) {
        btnToggleEdit = document.createElement('button');
        btnToggleEdit.id = 'btnToolbarEditQPicks';
        btnToggleEdit.type = 'button';
        btnToggleEdit.className = 'btn btn-secondary';
        btnToggleEdit.style.cssText = 'width:auto; padding:6px 12px; font-size:12px; font-weight:800; border-radius:8px; display:inline-flex; align-items:center; gap:4px;';
        toolbar.appendChild(btnToggleEdit);
      }
      btnToggleEdit.style.display = 'inline-flex';
      btnToggleEdit.innerHTML = shouldShowEditor ? '📊 Ver Tabla Quiniela PRO' : '✏️ Modificar Pronósticos';
      btnToggleEdit.onclick = () => toggleEditQuinielaPicks();
    } else if (btnToggleEdit) {
      btnToggleEdit.style.display = 'none';
    }

    // LOCKED: always show standings table, never picks form
    if (lockInfo.isLocked) {
      if (editorSec) editorSec.style.display = 'none';
      if (standingsSec) standingsSec.style.display = 'block';
      return;
    }

    // OPEN: if user has saved picks and is not editing, show standings
    if (hasSavedPicks && !shouldShowEditor) {
      if (editorSec) editorSec.style.display = 'none';
      if (standingsSec) standingsSec.style.display = 'block';
    } else {
      if (editorSec) {
        editorSec.style.display = 'block';
        renderPicksForm(q, lockInfo.isLocked);
      }
    }
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
      if (subEl) subEl.textContent = 'Ingresa tus pronósticos antes del pitazo inicial del primer partido. Se bloquearán automáticamente al comenzar.';
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

  // Helper for Stepper in Soccer matches
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

    if (!picks[matchId]) picks[matchId] = {};
    if (side === 'away') picks[matchId].awayScore = val;
    if (side === 'home') picks[matchId].homeScore = val;

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

  // Helper for Winner Selection in Non-Soccer matches (NFL, MLB, NBA, etc.)
  window.pickWinner = function(matchId, winnerSide) {
    if (!activeQuiniela) return;
    const lockInfo = checkQuinielaLockStatus(activeQuiniela);
    if (lockInfo.isLocked) {
      alert('🔒 La jornada ya inició. No se pueden modificar los pronósticos de esta quiniela.');
      return;
    }

    if (!picks[matchId]) picks[matchId] = {};
    picks[matchId].winner = winnerSide;
    picks[matchId].awayScore = winnerSide === 'away' ? 1 : 0;
    picks[matchId].homeScore = winnerSide === 'home' ? 1 : 0;

    const btnAway = document.getElementById(`btn_pick_away_${matchId}`);
    const btnHome = document.getElementById(`btn_pick_home_${matchId}`);
    const chkAway = document.getElementById(`chk_pick_away_${matchId}`);
    const chkHome = document.getElementById(`chk_pick_home_${matchId}`);

    if (btnAway && btnHome) {
      if (winnerSide === 'away') {
        btnAway.classList.add('selected');
        btnHome.classList.remove('selected');
        if (chkAway) chkAway.textContent = '✓';
        if (chkHome) chkHome.textContent = '';
      } else if (winnerSide === 'home') {
        btnHome.classList.add('selected');
        btnAway.classList.remove('selected');
        if (chkHome) chkHome.textContent = '✓';
        if (chkAway) chkAway.textContent = '';
      }
    }

    // Dynamic result preview
    const match = (activeQuiniela.matches || []).find(m => m.id === matchId);
    if (match && match.homeScore !== null && match.awayScore !== null && match.status !== 'pre') {
      const card = document.getElementById(`card_match_${matchId}`);
      const statusLabel = document.getElementById(`status_label_${matchId}`);
      const realWin = match.homeScore > match.awayScore ? 'home' : match.awayScore > match.homeScore ? 'away' : 'draw';
      const isCorrect = winnerSide === realWin;
      if (card) {
        card.className = 'q-match-card ' + (isCorrect ? 'q-match-green' : 'q-match-red');
      }
      if (statusLabel) {
        statusLabel.textContent = isCorrect ? '✓ Ganador (+1 pt)' : '✗ 0 pts';
      }
    }
  };

  function renderPicksForm(q, isLocked) {
    const formEl = document.getElementById('qMatchPicksForm');
    const titleEl = document.getElementById('qPicksTitle');
    if (!formEl) return;

    if (titleEl) titleEl.textContent = `Pronósticos — ${q.name}`;

    formEl.innerHTML = '';
    const rawMatches = q.matches || [];

    if (rawMatches.length === 0) {
      formEl.innerHTML = '<div class="text-center hint-text py-3">Esta quiniela no tiene partidos asignados aún.</div>';
      return;
    }

    // 1. Sort matches chronologically: earliest first, latest last (handles rawDate, dateISO, and Spanish strings)
    const matches = sortMatchesChronologically(rawMatches);

    // 2. Check Player Registration & Approval State
    const myReg = myParticipations[q.id];
    const isApproved = myReg && (myReg.approved === true || myReg.status === 'approved');
    const isPending = myReg && !isApproved;
    const isNotJoined = !myReg;
    const btnSave = document.getElementById('btnSaveQPicks');

    if (isNotJoined) {
      if (btnSave) btnSave.style.display = 'none';
      formEl.innerHTML = `
        <div class="card" style="border:2px solid var(--accent-color); background:linear-gradient(145deg, rgba(30,26,16,0.96), rgba(18,16,10,0.98)); padding:24px 18px; text-align:center; border-radius:16px; margin-bottom:14px;">
          <div style="font-size:38px; margin-bottom:8px;">📋</div>
          <h3 style="color:#ffd100; margin-bottom:6px; font-weight:900;">Solicita Unirte a esta Quiniela</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px; line-height:1.4;">
            Para participar en <strong>"${q.name}"</strong>, primero debes registrarte con tu apodo y esperar a que el mesero o administrador apruebe tu entrada.
          </p>
          <button type="button" class="btn btn-primary" onclick="window.selectQuinielaToJoin('${q.id}')" style="font-size:14px; font-weight:900; padding:12px 24px; border-radius:12px; display:inline-flex; align-items:center; gap:8px;">
            📝 Solicitar Entrada a la Quiniela
          </button>
        </div>
      `;
      return;
    }

    if (isPending) {
      if (btnSave) btnSave.style.display = 'none';
      formEl.innerHTML = `
        <div class="card" style="border:2px solid #ffc107; background:linear-gradient(145deg, rgba(26,20,8,0.96), rgba(14,10,4,0.98)); padding:24px 18px; text-align:center; border-radius:16px; margin-bottom:14px;">
          <div style="font-size:38px; margin-bottom:8px;">⏳</div>
          <h3 style="color:#ffc107; margin-bottom:6px; font-weight:900;">Solicitud Pendiente de Aprobación</h3>
          <p style="font-size:13.5px; color:#ffffff; margin-bottom:10px; font-weight:700;">
            Tu solicitud para <strong>"${q.name}"</strong> fue enviada (Mesero: <em>${myReg.waiter || 'Sin mesero'}</em>).
          </p>
          <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">
            En cuanto el mesero o administrador apruebe tu solicitud, esta pantalla se actualizará automáticamente y podrás ingresar tus pronósticos.
          </p>
        </div>
      `;
      return;
    }

    if (btnSave && !isLocked) {
      btnSave.style.display = 'block';
    }

    const statusBanner = document.createElement('div');
    statusBanner.className = 'q-player-status-card approved';
    statusBanner.innerHTML = `
      <div style="font-size:24px;">✅</div>
      <div>
        <strong style="font-size:13px; color:#00e676;">¡Participación Aprobada!</strong>
        <div style="font-size:11.5px; color:#ffffff; opacity:0.9;">Tu registro está autorizado. Ingresa tus pronósticos y tu criterio de desempate antes del inicio de la jornada:</div>
      </div>
    `;
    formEl.appendChild(statusBanner);

    // 3. Render Match Cards
    matches.forEach(m => {
      const sport = detectSport(m);
      const isSoccer = sport === 'soccer';
      const existPick = picks[m.id] || {};
      const savedWinner = existPick.winner || (existPick.awayScore > existPick.homeScore ? 'away' : existPick.homeScore > existPick.awayScore ? 'home' : '');

      const currentAwayVal = existPick.awayScore !== undefined && existPick.awayScore !== '' ? existPick.awayScore : 0;
      const currentHomeVal = existPick.homeScore !== undefined && existPick.homeScore !== '' ? existPick.homeScore : 0;

      const isLive = m.status === 'in';
      const isDone = m.completed || m.status === 'post';
      const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';
      const isIndividualMatchLocked = isLocked || isLive || isDone;

      let statusClass = '';
      let statusLabel = '';

      if (hasScore) {
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        if (isSoccer) {
          const pickH = Number(currentHomeVal);
          const pickA = Number(currentAwayVal);
          const exact = pickH === m.homeScore && pickA === m.awayScore;
          const pickWin = pickH > pickA ? 'home' : pickA > pickH ? 'away' : 'draw';
          if (exact) { statusClass = 'q-match-green'; statusLabel = '🎯 Exacto (+3 pts)'; }
          else if (realWin === pickWin) { statusClass = 'q-match-yellow'; statusLabel = '✓ Ganador (+1 pt)'; }
          else { statusClass = 'q-match-red'; statusLabel = '✗ 0 pts'; }
        } else {
          const isCorrect = savedWinner === realWin;
          if (isCorrect) { statusClass = 'q-match-green'; statusLabel = '✓ Ganador (+1 pt)'; }
          else { statusClass = 'q-match-red'; statusLabel = '✗ 0 pts'; }
        }
      }

      const card = document.createElement('div');
      card.id = `card_match_${m.id}`;
      card.className = `q-match-card ${statusClass}`;

      let matchContentHtml = '';

      if (isSoccer) {
        // SOCCER: Exact score steppers
        matchContentHtml = `
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
              <div class="q-counter-box">
                <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'away', -1)" ${isIndividualMatchLocked ? 'disabled' : ''} title="Restar">−</button>
                <input type="number" min="0" max="99" class="q-score-box" id="pick_away_${m.id}" value="${currentAwayVal}" readonly />
                <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'away', 1)" ${isIndividualMatchLocked ? 'disabled' : ''} title="Sumar">+</button>
              </div>

              <span class="q-vs-separator">:</span>

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
      } else {
        // US SPORTS (NFL, MLB, NBA, Basketball, Baseball, etc.): Pick Winner Buttons
        const awaySelected = savedWinner === 'away';
        const homeSelected = savedWinner === 'home';

        matchContentHtml = `
          <div class="q-winner-selector">
            <!-- Away Winner Button -->
            <button type="button" class="q-winner-team-btn ${awaySelected ? 'selected' : ''}" id="btn_pick_away_${m.id}" onclick="pickWinner('${m.id}', 'away')" ${isIndividualMatchLocked ? 'disabled' : ''}>
              <div class="q-winner-check" id="chk_pick_away_${m.id}">${awaySelected ? '✓' : ''}</div>
              <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" class="q-winner-team-logo" alt="${m.away}"/>
              <span class="q-winner-team-name">${m.away}</span>
              ${hasScore ? `<span class="q-row-live-badge ${m.awayScore > m.homeScore ? 'winning' : ''}" style="margin-left:auto; font-size:12px;">${m.awayScore}</span>` : ''}
            </button>

            <span class="q-winner-vs-tag">vs</span>

            <!-- Home Winner Button -->
            <button type="button" class="q-winner-team-btn ${homeSelected ? 'selected' : ''}" id="btn_pick_home_${m.id}" onclick="pickWinner('${m.id}', 'home')" ${isIndividualMatchLocked ? 'disabled' : ''}>
              <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" class="q-winner-team-logo" alt="${m.home}"/>
              <span class="q-winner-team-name">${m.home}</span>
              ${hasScore ? `<span class="q-row-live-badge ${m.homeScore > m.awayScore ? 'winning' : ''}" style="margin-left:auto; font-size:12px;">${m.homeScore}</span>` : ''}
              <div class="q-winner-check" id="chk_pick_home_${m.id}">${homeSelected ? '✓' : ''}</div>
            </button>
          </div>
        `;
      }

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
        ${matchContentHtml}
      `;

      formEl.appendChild(card);
    });

    // 4. Dynamic Tiebreaker Input Section
    const isAllSoccer = matches.every(m => detectSport(m) === 'soccer');
    const lastMatch = matches[matches.length - 1];
    const savedTiebreaker = myReg?.tiebreaker !== undefined && myReg?.tiebreaker !== null ? myReg.tiebreaker : '';

    const tiebreakerCard = document.createElement('div');
    tiebreakerCard.className = 'q-tiebreaker-card';
    tiebreakerCard.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="flex:1; min-width:200px;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:18px;">🎯</span>
            <strong style="color:#ffd100; font-size:13px;">Criterio de Desempate Oficial</strong>
            <span class="badge" style="background:rgba(255,209,0,0.2); color:#ffd100; font-size:10px; font-weight:800;">Obligatorio</span>
          </div>
          <p style="font-size:12px; color:var(--text-color); margin:0; line-height:1.4;">
            ${isAllSoccer 
              ? '¿Cuántos <strong>GOLES EN TOTAL</strong> se anotarán en toda esta quiniela?'
              : `¿Cuántos <strong>PUNTOS EN TOTAL</strong> se anotarán entre ambos equipos en el <strong>ÚLTIMO JUEGO</strong> (${lastMatch.away} vs ${lastMatch.home})?`}
          </p>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">(Se usará únicamente en caso de empate en puntos para definir al ganador)</div>
        </div>
        <div>
          <input type="number" id="qTiebreakerInput" min="0" max="999" class="q-tiebreaker-input" placeholder="0" value="${savedTiebreaker}" ${isLocked ? 'disabled' : ''} />
        </div>
      </div>
    `;
    formEl.appendChild(tiebreakerCard);
  }

  async function savePlayerPicks() {
    if (!db || !activeQuiniela) return;

    // MANDATORY AUTH CHECK
    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    if (!activeUser) {
      window.requireUserAuth(savePlayerPicks, '¡Inicia Sesión para Pronosticar!', 'Para registrar tus pronósticos y competir en la quiniela, inicia sesión con Google, Apple o Facebook.');
      return;
    }

    // Re-verify strict lock before saving
    const lockInfo = checkQuinielaLockStatus(activeQuiniela);
    if (lockInfo.isLocked) {
      alert('🔒 La jornada ya inició con el primer partido. No es posible guardar o modificar pronósticos.');
      return;
    }

    const nameInp = document.getElementById('qPlayerName');
    const name = (nameInp ? nameInp.value : '').trim() || activeUser.displayName || 'Jugador';

    const tieInp = document.getElementById('qTiebreakerInput');
    const tieVal = tieInp ? tieInp.value.trim() : '';

    if (tieVal === '' || isNaN(Number(tieVal))) {
      alert('⚠️ Por favor ingresa tu pronóstico de Desempate (número de goles o puntos totales).');
      if (tieInp) tieInp.focus();
      return;
    }

    playerName = name;
    localStorage.setItem('bww_q_name', name);
    localStorage.setItem('player_nick', name);

    const matches = activeQuiniela.matches || [];
    const newPicks = {};

    matches.forEach(m => {
      const sport = detectSport(m);
      if (sport === 'soccer') {
        const awayInp = document.getElementById(`pick_away_${m.id}`);
        const homeInp = document.getElementById(`pick_home_${m.id}`);
        const awayVal = awayInp ? awayInp.value.trim() : '0';
        const homeVal = homeInp ? homeInp.value.trim() : '0';
        newPicks[m.id] = { awayScore: Number(awayVal || 0), homeScore: Number(homeVal || 0) };
      } else {
        const currentWinner = picks[m.id]?.winner || 'away';
        newPicks[m.id] = {
          winner: currentWinner,
          awayScore: currentWinner === 'away' ? 1 : 0,
          homeScore: currentWinner === 'home' ? 1 : 0
        };
      }
    });

    const btn = document.getElementById('btnSaveQPicks');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando pronósticos...'; }

    try {
      picks = newPicks;

      const existingDoc = myParticipations[activeQuiniela.id] || {};
      const isAlreadyApproved = existingDoc.approved === true || existingDoc.status === 'approved';

      if (!isAlreadyApproved) {
        alert('🔒 Tu solicitud aún no ha sido aprobada por el mesero o administrador. En cuanto seas aprobado, podrás guardar tus pronósticos.');
        return;
      }

      const pickData = {
        playerId: activeUser.uid,
        userUid: activeUser.uid,
        userEmail: activeUser.email || '',
        photoURL: activeUser.photoURL || '',
        playerName: name,
        deviceId,
        picks: newPicks,
        tiebreaker: Number(tieVal),
        approved: true,
        status: 'approved',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp
          ? firebase.firestore.FieldValue.serverTimestamp()
          : Date.now()
      };

      // Save directly using user's unique UID as doc ID
      await db.collection('quinielas').doc(activeQuiniela.id).collection('picks').doc(activeUser.uid).set(pickData, { merge: true });
      myParticipations[activeQuiniela.id] = pickData;

      isEditingPicks = false;
      showToast(`¡Pronósticos guardados para "${name}"! 🏆`);
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

    const text = `🏆 *¡Únete a la Quiniela "${q.name}" en Drinks & Wins!*\n\n${gamesList}${extra}\n\n🎯 *Pronostica antes de que empiece la jornada:*\n${url}\n\n¡Compite por el primer lugar! 🥇`;
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

  // Interactive Live Leaderboard & Quiniela PRO Matrix Table
  function renderLiveStandings(picksSnap, rawMatches) {
    const leaderCardEl = document.getElementById('qLiveLeaderCard');
    const standingsListEl = document.getElementById('qLiveStandings');
    if (!standingsListEl) return;

    const activeUser = firebase.auth && firebase.auth() ? firebase.auth().currentUser : null;
    const players = [];
    picksSnap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

    // 1. Sort matches chronologically: earliest first, latest last (handles rawDate, dateISO, and Spanish strings)
    const matches = sortMatchesChronologically(rawMatches || []);

    // 2. Determine actual tiebreaker value
    const isAllSoccer = matches.length > 0 && matches.every(m => detectSport(m) === 'soccer');
    const lastMatch = matches.length > 0 ? matches[matches.length - 1] : null;

    let actualTotalGoals = 0;
    let actualLastGamePoints = 0;

    matches.forEach(m => {
      if (m.homeScore !== null && m.awayScore !== null && m.status !== 'pre') {
        actualTotalGoals += (Number(m.homeScore) + Number(m.awayScore));
      }
    });

    if (lastMatch && lastMatch.homeScore !== null && lastMatch.awayScore !== null && lastMatch.status !== 'pre') {
      actualLastGamePoints = (Number(lastMatch.homeScore) + Number(lastMatch.awayScore));
    }

    const realTiebreakerValue = isAllSoccer ? actualTotalGoals : actualLastGamePoints;

    // 3. Calculate live points & exact hits count for THIS quiniela
    players.forEach(p => {
      let pts = 0;
      let exactHits = 0;
      let winnerHits = 0;
      const isApproved = p.approved === true || p.status === 'approved';
      p.isApproved = isApproved;

      matches.forEach(m => {
        if (m.homeScore === null || m.awayScore === null || m.status === 'pre') return;
        const pick = p.picks?.[m.id];
        if (!pick) return;

        const sport = detectSport(m);
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';

        if (sport === 'soccer') {
          if (pick.homeScore === m.homeScore && pick.awayScore === m.awayScore) {
            pts += 3;
            exactHits += 1;
          } else {
            const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
            if (realWin === pickWin) {
              pts += 1;
              winnerHits += 1;
            }
          }
        } else {
          const playerWinPick = pick.winner ? pick.winner : (pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw');
          if (playerWinPick === realWin) {
            pts += 1;
            winnerHits += 1;
          }
        }
      });

      p.totalPoints = pts;
      p.exactHits = exactHits;
      p.winnerHits = winnerHits;

      if (p.tiebreaker !== undefined && p.tiebreaker !== null && p.tiebreaker !== '') {
        p.tiebreakerDiff = Math.abs(Number(p.tiebreaker) - realTiebreakerValue);
      } else {
        p.tiebreakerDiff = 9999;
      }
    });

    // Sort: Approved first, Total Points desc, Exact hits desc, Tiebreaker diff asc
    players.sort((a, b) => {
      if (a.isApproved !== b.isApproved) return b.isApproved ? 1 : -1;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      return a.tiebreakerDiff - b.tiebreakerDiff;
    });

    if (players.length === 0) {
      if (leaderCardEl) leaderCardEl.style.display = 'none';
      standingsListEl.innerHTML = '<div class="text-center hint-text py-3">Aún no hay participantes registrados en esta quiniela. ¡Sé el primero en guardar tus pronósticos!</div>';
      return;
    }

    // 1. Render Live Leader Card (Top Player or Tie)
    if (leaderCardEl) {
      const topPts = players[0].totalPoints;
      const leaders = players.filter(p => p.isApproved && p.totalPoints === topPts && topPts > 0);

      leaderCardEl.style.display = 'flex';
      leaderCardEl.className = 'q-leader-card';

      if (leaders.length === 0 || topPts === 0) {
        leaderCardEl.innerHTML = `
          <div class="q-leader-left">
            <div class="q-leader-crown">⏳</div>
            <div>
              <div class="q-leader-title">ESTADO DE LA QUINIELA</div>
              <div class="q-leader-name" style="font-size:14px; color:#aaa;">Jornada por iniciar — ${players.length} participantes listos</div>
            </div>
          </div>
          <div class="q-leader-pts-badge">
            <div class="q-leader-pts-val" style="color:var(--text-muted);">0 pts</div>
            <div class="q-leader-pts-sub">Líder pendiente</div>
          </div>
        `;
      } else if (leaders.length === 1) {
        const leader = leaders[0];
        const isMe = (activeUser && (leader.id === activeUser.uid || leader.userUid === activeUser.uid)) || leader.id === deviceId;
        leaderCardEl.innerHTML = `
          <div class="q-leader-left">
            <div class="q-leader-crown">👑</div>
            <div>
              <div class="q-leader-title">🥇 LÍDER ACTUAL EN VIVO</div>
              <div class="q-leader-name" style="font-size:16px;">${leader.playerName || 'Anónimo'} ${isMe ? '⭐ (¡Vas ganando!)' : ''}</div>
            </div>
          </div>
          <div class="q-leader-pts-badge">
            <div class="q-leader-pts-val">${leader.totalPoints} PTS</div>
            <div class="q-leader-pts-sub">🎯 ${leader.exactHits} Aciertos exactos</div>
          </div>
        `;
      } else {
        const names = leaders.slice(0, 3).map(l => l.playerName).join(' y ');
        leaderCardEl.innerHTML = `
          <div class="q-leader-left">
            <div class="q-leader-crown">🔥</div>
            <div>
              <div class="q-leader-title">🤝 EMPATE EN 1ER LUGAR</div>
              <div class="q-leader-name" style="font-size:15px;">${names}</div>
            </div>
          </div>
          <div class="q-leader-pts-badge">
            <div class="q-leader-pts-val">${topPts} PTS</div>
            <div class="q-leader-pts-sub">Empate en la cima</div>
          </div>
        `;
      }
    }

    // 2. Render Authentic Quiniela Table (Exact Bar Format)
    standingsListEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-x:auto; border-radius:14px; border:1px solid rgba(255,255,255,0.1); background:#0e131d; box-shadow:0 8px 30px rgba(0,0,0,0.6); position:relative;';

    const table = document.createElement('table');
    table.className = 'q-standings-table';

    const thead = table.createTHead();
    const hr = thead.insertRow();
    hr.innerHTML = `<th style="text-align:left; padding:12px 14px; min-width:150px; position:sticky; left:0; background:#161d2a; z-index:5; border-bottom:1px solid rgba(255,255,255,0.12); color:#ffd100; font-weight:900;">JUGADOR</th>` +
      matches.map(m => {
        const isLive = m.status === 'in';
        const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';

        let scoreHtml = '<span style="font-size:9px; color:var(--text-muted); font-weight:800; display:inline-block; margin-top:2px;">PENDIENTE</span>';
        if (isLive && hasScore) {
          scoreHtml = `<div style="background:rgba(255,68,68,0.25); border:1px solid #ff4444; border-radius:6px; padding:2px 5px; margin-top:2px;">
            <span style="font-size:11px; font-weight:900; color:#ff4444; animation:tvPulse 1s infinite;">🔴 ${m.awayScore}-${m.homeScore}</span>
            <div style="font-size:8.5px; color:#fff; font-weight:800;">${m.statusStr || 'EN VIVO'}</div>
          </div>`;
        } else if (hasScore) {
          scoreHtml = `<div style="margin-top:2px;"><span style="font-size:12px; font-weight:900; color:#ffd100;">${m.awayScore}-${m.homeScore}</span><div style="font-size:8.5px; color:var(--text-muted); font-weight:800;">FINAL</div></div>`;
        }

        return `<th style="text-align:center; padding:8px 6px; min-width:85px; border-left:1px solid rgba(255,255,255,0.06); border-bottom:1px solid rgba(255,255,255,0.12); background:#121824;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <div style="display:flex; align-items:center; gap:3px;">
              <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" style="width:18px; height:18px; object-fit:contain;"/>
              <span style="font-size:8.5px; font-weight:800; color:#aaa;">vs</span>
              <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" style="width:18px; height:18px; object-fit:contain;"/>
            </div>
            <span style="font-size:9px; color:var(--text-muted); font-weight:800; text-transform:uppercase;">${m.awayAbbr || m.away.substring(0,3)} v ${m.homeAbbr || m.home.substring(0,3)}</span>
            ${scoreHtml}
          </div>
        </th>`;
      }).join('') +
      `<th style="text-align:center; padding:10px; min-width:65px; border-left:1px solid rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.12); background:#161d2a; color:#ffd100; font-weight:900;" title="Pronóstico de Desempate">DESEMPATE</th>` +
      `<th style="text-align:center; padding:10px; min-width:55px; border-left:1px solid rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.12); background:#161d2a; color:#ffd100; font-weight:900;">PTS</th>`;

    const tbody = table.createTBody();
    players.forEach((p, idx) => {
      const isMe = (activeUser && (p.id === activeUser.uid || p.userUid === activeUser.uid)) || p.id === deviceId;
      const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;
      const photo = p.photoURL || 'img/logo.jpg';
      const name = p.playerName || 'Anónimo';
      const statusPill = p.isApproved ? '' : ` <span class="badge" style="background:rgba(255,193,7,0.2); color:#ffc107; font-size:9px; padding:1px 4px;">PENDIENTE</span>`;

      const tr = tbody.insertRow();
      tr.className = `q-matrix-row ${isMe ? 'is-me' : ''}`;

      let cells = `<td style="padding:10px 12px; font-weight:800; white-space:nowrap; position:sticky; left:0; background:${isMe ? '#1c1d18' : '#0e131d'}; z-index:4; border-bottom:1px solid rgba(255,255,255,0.05); box-shadow:2px 0 8px rgba(0,0,0,0.3);">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:12px;">${rankEmoji}</span>
          <img src="${photo}" alt="${name}" onerror="this.onerror=null;this.src='img/logo.jpg'" style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:1.5px solid ${isMe ? '#ffd100' : '#444'};" />
          <span style="color:${isMe ? '#ffd100' : '#ffffff'}; font-size:13px; max-width:95px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name} ${isMe ? '(Tú)' : ''}</span>
          ${statusPill}
        </div>
      </td>`;

      matches.forEach(m => {
        const pick = p.picks?.[m.id];
        if (!pick) {
          cells += `<td class="q-s-cell q-cell-gray" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);">—</td>`;
          return;
        }

        const sport = detectSport(m);
        const isSoccer = sport === 'soccer';
        const pickStr = isSoccer ? `${pick.awayScore}-${pick.homeScore}` : (pick.winner === 'home' ? m.homeAbbr || 'LOC' : pick.winner === 'away' ? m.awayAbbr || 'VIS' : `${pick.awayScore}-${pick.homeScore}`);

        if (m.homeScore === null || m.status === 'pre') {
          cells += `<td class="q-s-cell q-cell-gray" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);">${pickStr}</td>`;
          return;
        }

        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';

        if (isSoccer) {
          const exact = pick.homeScore === m.homeScore && pick.awayScore === m.awayScore;
          const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
          if (exact) cells += `<td class="q-s-cell q-cell-green" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);" title="+3 pts">🎯 ${pickStr}</td>`;
          else if (realWin === pickWin) cells += `<td class="q-s-cell q-cell-yellow" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);" title="+1 pt">✓ ${pickStr}</td>`;
          else cells += `<td class="q-s-cell q-cell-red" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);" title="0 pts">✗ ${pickStr}</td>`;
        } else {
          const playerWinPick = pick.winner ? pick.winner : (pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw');
          if (playerWinPick === realWin) cells += `<td class="q-s-cell q-cell-green" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);" title="+1 pt">✓ ${pickStr}</td>`;
          else cells += `<td class="q-s-cell q-cell-red" style="border-left:1px solid rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.05);" title="0 pts">✗ ${pickStr}</td>`;
        }
      });

      const tieVal = (p.tiebreaker !== undefined && p.tiebreaker !== null && p.tiebreaker !== '') ? p.tiebreaker : '—';
      cells += `<td style="text-align:center; font-size:12px; font-weight:800; color:#ffd100; border-left:1px solid rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.05);">${tieVal}</td>`;
      cells += `<td style="text-align:center; font-weight:900; color:${p.totalPoints > 0 ? '#ffd100' : 'var(--text-muted)'}; font-size:14px; padding:8px; border-left:1px solid rgba(255,255,255,0.08); border-bottom:1px solid rgba(255,255,255,0.05);">${p.totalPoints}</td>`;
      tr.innerHTML = cells;
    });

    wrap.appendChild(table);
    standingsListEl.appendChild(wrap);
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

      // Only query endpoints for sports/leagues present in this quiniela
      const neededEndpoints = [];
      const seen = new Set();
      matches.forEach(m => {
        const sp = detectSport(m);
        const sl = m.slug || (sp === 'football' ? 'nfl' : sp === 'baseball' ? 'mlb' : sp === 'basketball' ? 'nba' : 'mex.1');
        const key = `${sp}/${sl}`;
        if (!seen.has(key)) {
          seen.add(key);
          neededEndpoints.push({ sport: sp, slug: sl });
        }
      });

      if (neededEndpoints.length === 0) {
        neededEndpoints.push({ sport: 'soccer', slug: 'mex.1' }, { sport: 'football', slug: 'nfl' });
      }

      const eventsBySport = {};
      const fetchPromises = neededEndpoints.map(async ep => {
        try {
          let res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ep.sport}/${ep.slug}/scoreboard?${dateParam}`);
          if (!res.ok) {
            res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ep.sport}/${ep.slug}/scoreboard?limit=100`);
          }
          if (!res.ok) return;
          const data = await res.json();
          if (data && data.events) {
            if (!eventsBySport[ep.sport]) eventsBySport[ep.sport] = [];
            eventsBySport[ep.sport].push(...data.events.map(ev => ({ ...ev, _sport: ep.sport, _slug: ep.slug })));
          }
        } catch (e) {}
      });

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
