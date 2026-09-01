// Quiniela & Pick'em Admin Module — Wings & Wins v54
(function () {
  'use strict';

  let db = null;

  const LEAGUES = {
    // ⚽ QUINIELAS (Fútbol / Soccer)
    'leagues-cup':      { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'concacaf.leagues.cup',  label: '🏆 Leagues Cup (México vs USA)' },
    'liga-mx':          { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'mex.1',                 label: '🇲🇽 Liga MX' },
    'liga-mx-fem':      { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'mex.w.1',               label: '🇲🇽 Liga MX Femenil' },
    'premier':          { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'eng.1',                 label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
    'laliga':           { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'esp.1',                 label: '🇪🇸 La Liga Española' },
    'champions':        { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'uefa.champions',        label: '🏆 Champions League' },
    'europa':           { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'uefa.europa',           label: '🏆 Europa League' },
    'serie-a':          { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'ita.1',                 label: '🇮🇹 Serie A Italia' },
    'bundesliga':       { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'ger.1',                 label: '🇩🇪 Bundesliga' },
    'ligue-1':          { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'fra.1',                 label: '🇫🇷 Ligue 1 Francia' },
    'mls':              { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'usa.1',                 label: '🇺🇸 MLS' },
    'libertadores':     { group: '⚽ QUINIELA (Fútbol)', sport: 'soccer',     slug: 'conmebol.libertadores', label: '🌎 Copa Libertadores' },

    // 🏈 ⚾ 🏀 PICK'EM (US Sports)
    'nfl':              { group: "🏈 ⚾ 🏀 PICK'EM (US Sports)", sport: 'football',   slug: 'nfl',                     label: '🏈 NFL' },
    'mlb':              { group: "🏈 ⚾ 🏀 PICK'EM (US Sports)", sport: 'baseball',   slug: 'mlb',                     label: '⚾ MLB Béisbol' },
    'nba':              { group: "🏈 ⚾ 🏀 PICK'EM (US Sports)", sport: 'basketball', slug: 'nba',                     label: '🏀 NBA Basquetbol' },
    'wnba':             { group: "🏈 ⚾ 🏀 PICK'EM (US Sports)", sport: 'basketball', slug: 'wnba',                    label: '🏀 WNBA' },
    'college-football': { group: "🏈 ⚾ 🏀 PICK'EM (US Sports)", sport: 'football',   slug: 'college-football',        label: '🎓 NCAA Football' },
    'ncaab':            { group: "🏈 ⚾ 🏀 PICK'EM (US Sports)", sport: 'basketball', slug: 'mens-college-basketball', label: '🎓 NCAA Basketball' },
  };

  let qSelectedMatches = {};
  let activeQuinielaId = null;

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

  function initQAdmin() {
    if (window.db) {
      db = window.db;
      buildLeagueSelector();
      setupQAdminListeners();
      loadActiveQuinielas();
    } else {
      setTimeout(initQAdmin, 150);
    }
  }

  function buildLeagueSelector() {
    const sel = document.getElementById('qSportSelect');
    if (!sel) return;
    sel.innerHTML = '';

    const groups = {};
    Object.entries(LEAGUES).forEach(([key, val]) => {
      const gName = val.group || 'Otras';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push({ key, ...val });
    });

    Object.entries(groups).forEach(([groupName, items]) => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = groupName;
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.key;
        opt.textContent = item.label;
        optGroup.appendChild(opt);
      });
      sel.appendChild(optGroup);
    });
  }

  function setupQAdminListeners() {
    const btnSearch = document.getElementById('btnQSearchGames');
    if (btnSearch) btnSearch.addEventListener('click', searchQuinielaGames);

    const btnCreate = document.getElementById('btnCreateQuiniela');
    if (btnCreate) btnCreate.addEventListener('click', createQuiniela);

    const btnClearSel = document.getElementById('btnQClearSelected');
    if (btnClearSel) btnClearSel.addEventListener('click', () => {
      qSelectedMatches = {};
      document.querySelectorAll('.q-game-pick-card.selected').forEach(card => {
        card.classList.remove('selected');
        const chk = card.querySelector('.q-pick-check');
        if (chk) chk.textContent = '☐';
      });
      updateSelectedCount();
    });

    const btnSync = document.getElementById('btnQAdminSync');
    if (btnSync) btnSync.addEventListener('click', () => syncQuinielaScores(activeQuinielaId));

    const qDropdown = document.getElementById('selectActiveQuiniela');
    if (qDropdown) {
      qDropdown.addEventListener('change', () => {
        activeQuinielaId = qDropdown.value;
        loadQuinielaStandings(activeQuinielaId);
      });
    }

    const btnDelete = document.getElementById('btnDeleteQuiniela');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        if (!activeQuinielaId) { alert('Selecciona una quiniela primero.'); return; }
        if (!confirm('¿Eliminar esta quiniela permanentemente? Esto borrará todos los pronósticos.')) return;
        try {
          const picks = await db.collection('quinielas').doc(activeQuinielaId).collection('picks').get();
          const batch = db.batch();
          picks.forEach(d => batch.delete(d.ref));
          await batch.commit();
          await db.collection('quinielas').doc(activeQuinielaId).delete();
          alert('✅ Quiniela eliminada.');
          activeQuinielaId = null;
          const panel = document.getElementById('qManagePanel');
          if (panel) panel.style.display = 'none';
          loadActiveQuinielas();
        } catch (err) { alert('Error al eliminar: ' + err.message); }
      });
    }

    const btnShare = document.getElementById('btnQShareWhatsApp');
    if (btnShare) btnShare.addEventListener('click', shareQuinielaWhatsApp);

    const btnCopyLink = document.getElementById('btnQAdminCopyLink');
    if (btnCopyLink) btnCopyLink.addEventListener('click', copyQuinielaLink);

    const btnToggleLock = document.getElementById('btnToggleQLock');
    if (btnToggleLock) btnToggleLock.addEventListener('click', toggleQuinielaLock);
  }

  function shareQuinielaWhatsApp() {
    const sel = document.getElementById('selectActiveQuiniela');
    const name = sel?.options[sel.selectedIndex]?.text || 'Quiniela';
    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const directUrl = `${origin}${path}share-quiniela.html?q=${encodeURIComponent(activeQuinielaId)}`;
    const text = `🏆 *¡Únete a nuestra Quiniela & Pick'em "${name}"!*\n\n🎯 Pronostica el marcador de los partidos\n✅ +3 pts marcador exacto | +1 pt solo ganador\n\n📱 *Entra aquí para registrar tus pronósticos:*\n${directUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  function copyQuinielaLink() {
    if (!activeQuinielaId) { alert('Selecciona una quiniela primero.'); return; }
    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const directUrl = `${origin}${path}share-quiniela.html?q=${encodeURIComponent(activeQuinielaId)}`;
    navigator.clipboard.writeText(directUrl).then(() => {
      alert('✅ Enlace copiado al portapapeles:\n' + directUrl);
    }).catch(() => {
      prompt('Copia este enlace directo:', directUrl);
    });
  }

  async function toggleQuinielaLock() {
    if (!db || !activeQuinielaId) { alert('Selecciona una quiniela primero.'); return; }
    try {
      const qRef = db.collection('quinielas').doc(activeQuinielaId);
      const snap = await qRef.get();
      if (!snap.exists) return;
      const currentLocked = !!snap.data().locked;
      const newLocked = !currentLocked;
      await qRef.update({ locked: newLocked });
      alert(newLocked ? '🔒 Quiniela BLOQUEADA. Los jugadores ya no podrán registrar ni modificar pronósticos.' : '🔓 Quiniela DESBLOQUEADA. Los jugadores pueden volver a pronosticar.');
      updateLockBtnState(newLocked);
    } catch (err) {
      alert('Error al cambiar bloqueo: ' + err.message);
    }
  }

  function updateLockBtnState(isLocked) {
    const btn = document.getElementById('btnToggleQLock');
    if (!btn) return;
    if (isLocked) {
      btn.textContent = '🔓 Desbloquear Pronósticos';
      btn.className = 'btn btn-danger';
      btn.style.background = '#ff4444';
      btn.style.color = '#fff';
    } else {
      btn.textContent = '🔒 Bloquear Pronósticos';
      btn.className = 'btn btn-secondary';
      btn.style.background = '';
      btn.style.color = '';
    }
  }

  async function searchQuinielaGames() {
    const leagueKey = document.getElementById('qSportSelect')?.value;
    const league = LEAGUES[leagueKey];
    if (!league) return;

    const resultsEl = document.getElementById('qGamePickerList');
    const container = document.getElementById('qGamePickerContainer');
    const btnSearch = document.getElementById('btnQSearchGames');
    const daysRange = parseInt(document.getElementById('qDaysRange')?.value || '21', 10);

    if (btnSearch) { btnSearch.disabled = true; btnSearch.textContent = '⏳ Buscando...'; }
    if (resultsEl) resultsEl.innerHTML = '<div class="text-center hint-text py-3">Buscando partidos en ESPN...</div>';
    if (container) container.style.display = 'block';

    try {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 1);
      const end = new Date();
      end.setDate(today.getDate() + daysRange);

      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard?dates=${fmt(start)}-${fmt(end)}&limit=100`;

      const res = await fetch(url);
      const data = await res.json();
      const events = data.events || [];

      if (events.length === 0) {
        if (resultsEl) resultsEl.innerHTML = `<div class="text-center hint-text py-3">No se encontraron partidos para ${league.label} en este rango.</div>`;
        return;
      }

      renderQGamePicker(events, league);
    } catch (err) {
      console.error('[QAdmin]', err);
      if (resultsEl) resultsEl.innerHTML = '<div class="text-center hint-text py-3" style="color:var(--danger-color);">Error al conectar con ESPN.</div>';
    } finally {
      if (btnSearch) { btnSearch.disabled = false; btnSearch.textContent = '🔍 Buscar Partidos'; }
    }
  }

  function renderQGamePicker(events, league) {
    const el = document.getElementById('qGamePickerList');
    if (!el) return;
    el.innerHTML = '';

    events.forEach(ev => {
      const comp = ev.competitions?.[0] || {};
      const comps = comp.competitors || [];
      const home = comps.find(c => c.homeAway === 'home') || comps[1] || {};
      const away = comps.find(c => c.homeAway === 'away') || comps[0] || {};
      const homeName = home.team?.displayName || home.team?.shortDisplayName || 'Local';
      const awayName = away.team?.displayName || away.team?.shortDisplayName || 'Visitante';
      const homeLogo = home.team?.logo || 'img/logo.jpg';
      const awayLogo = away.team?.logo || 'img/logo.jpg';
      const isCompleted = ev.status?.type?.completed === true || ev.status?.type?.state === 'post';
      // Skip completed / finished games so only upcoming and live games appear for selection
      if (isCompleted) return;

      const isLive = ev.status?.type?.state === 'in';
      const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('es-MX', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

      const alreadySelected = !!qSelectedMatches[ev.id];

      const card = document.createElement('div');
      card.className = `q-game-pick-card${alreadySelected ? ' selected' : ''}`;
      card.dataset.evId = ev.id;
      card.innerHTML = `
        <div class="q-pick-check">${alreadySelected ? '☑' : '☐'}</div>
        <div class="q-pick-teams">
          <div class="q-pick-team">
            <img src="${awayLogo}" onerror="this.src='img/logo.jpg'" class="q-pick-logo" alt="${awayName}"/>
            <span class="q-pick-name">${awayName}</span>
          </div>
          <span class="q-pick-vs">vs</span>
          <div class="q-pick-team">
            <img src="${homeLogo}" onerror="this.src='img/logo.jpg'" class="q-pick-logo" alt="${homeName}"/>
            <span class="q-pick-name">${homeName}</span>
          </div>
        </div>
        <div class="q-pick-meta">
          <span style="font-size:10px; color:var(--accent-color); font-weight:800;">${league.label}</span>
          <span style="font-size:11px;color:var(--text-muted);">${dateStr}</span>
          ${isLive ? '<span class="badge danger" style="font-size:10px; margin-left:6px;">🔴 EN VIVO</span>' : ''}
          ${isCompleted ? '<span class="badge" style="font-size:10px; background:rgba(255,255,255,0.1); margin-left:6px;">TERMINADO</span>' : ''}
        </div>
      `;

      card.addEventListener('click', () => {
        const chk = card.querySelector('.q-pick-check');
        if (qSelectedMatches[ev.id]) {
          delete qSelectedMatches[ev.id];
          card.classList.remove('selected');
          if (chk) chk.textContent = '☐';
        } else {
          const venueName = comp.venue?.fullName || comp.venue?.name || '';
          qSelectedMatches[ev.id] = {
            espnEventId: ev.id,
            sport: league.sport,
            slug: league.slug,
            leagueLabel: league.label,
            date: dateStr,
            rawDate: ev.date || '',
            venue: venueName,
            stadium: venueName,
            home: { name: homeName, logo: homeLogo, id: home.team?.id || '', abbr: home.team?.abbreviation || homeName.substring(0,3) },
            away: { name: awayName, logo: awayLogo, id: away.team?.id || '', abbr: away.team?.abbreviation || awayName.substring(0,3) }
          };
          card.classList.add('selected');
          if (chk) chk.textContent = '☑';
        }
        updateSelectedCount();
      });

      el.appendChild(card);
    });

    updateSelectedCount();
    renderSelectedSummary();
  }

  function renderSelectedSummary() {
    let summaryEl = document.getElementById('qSelectedSummary');
    if (!summaryEl) {
      summaryEl = document.createElement('div');
      summaryEl.id = 'qSelectedSummary';
      summaryEl.style.cssText = 'margin-bottom:12px; display:flex; flex-wrap:wrap; gap:6px;';
      const container = document.getElementById('qGamePickerContainer');
      if (container) container.insertBefore(summaryEl, container.firstChild);
    }

    const entries = sortMatchesChronologically(Object.values(qSelectedMatches));
    if (entries.length === 0) {
      summaryEl.innerHTML = '';
      return;
    }

    summaryEl.innerHTML = '<div style="width:100%; font-size:11px; color:var(--text-muted); margin-bottom:4px; font-weight:700;">✅ PARTIDOS SELECCIONADOS (Ordenados Cronológicamente):</div>' +
      entries.map(m => `
        <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(255,209,0,0.1); border:1px solid rgba(255,209,0,0.4); border-radius:20px; padding:4px 10px; font-size:11px; font-weight:700;">
          <span style="font-size:9px; color:var(--accent-color);">${m.leagueLabel || ''}</span>
          <img src="${m.away.logo}" onerror="this.src='img/logo.jpg'" style="width:16px;height:16px;object-fit:contain;"/>
          ${m.away.abbr} vs ${m.home.abbr}
          <img src="${m.home.logo}" onerror="this.src='img/logo.jpg'" style="width:16px;height:16px;object-fit:contain;"/>
          <span style="font-size:9px; color:var(--text-muted); margin-left:2px;">${m.date ? m.date.split(',')[1] || m.date : ''}</span>
        </div>
      `).join('');
  }

  function updateSelectedCount() {
    const count = Object.keys(qSelectedMatches).length;
    const countEl = document.getElementById('qSelectedCount');
    const btn = document.getElementById('btnCreateQuiniela');
    const clearBtn = document.getElementById('btnQClearSelected');
    if (countEl) countEl.textContent = count > 0 ? `✅ ${count} partido${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}` : '';
    if (btn) btn.disabled = count === 0;
    if (clearBtn) clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    renderSelectedSummary();
  }

  async function createQuiniela() {
    if (!db) return;
    const name = (document.getElementById('qName')?.value || '').trim();
    const matchCount = Object.keys(qSelectedMatches).length;

    if (!name) { alert('Escribe un nombre para la quiniela o pick\'em.'); return; }
    if (matchCount === 0) { alert('Selecciona al menos un partido.'); return; }

    // Sort matches chronologically: earliest match first, latest match last (handles ISO and Spanish dates)
    const rawList = sortMatchesChronologically(Object.values(qSelectedMatches));

    const matches = rawList.map((m, i) => ({
      id: `m${i + 1}`,
      espnEventId: m.espnEventId,
      sport: m.sport || 'soccer',
      slug: m.slug || 'mex.1',
      leagueLabel: m.leagueLabel || '',
      home: m.home.name,
      away: m.away.name,
      homeLogo: m.home.logo,
      awayLogo: m.away.logo,
      homeAbbr: m.home.abbr,
      awayAbbr: m.away.abbr,
      date: m.date,
      rawDate: m.rawDate || '',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      completed: false
    }));

    try {
      const ref = db.collection('quinielas').doc();
      const isHybrid = document.getElementById('chkIsHybrid')?.checked === true;
      await ref.set({
        id: ref.id,
        name,
        sport: 'mixed',
        matches,
        active: true,
        autoApprove: document.getElementById('chkAutoApprove')?.checked === true,
        isHybrid: isHybrid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp
          ? firebase.firestore.FieldValue.serverTimestamp()
          : Date.now()
      });

      alert(`✅ Quiniela / Pick'em "${name}" creada con ${matchCount} partidos.`);
      if (document.getElementById('qName')) document.getElementById('qName').value = '';
      const hybridChk = document.getElementById('chkIsHybrid');
      if (hybridChk) hybridChk.checked = false;
      qSelectedMatches = {};
      updateSelectedCount();
      const picker = document.getElementById('qGamePickerContainer');
      if (picker) picker.style.display = 'none';
      loadActiveQuinielas();
    } catch (err) {
      alert('Error al crear quiniela: ' + err.message);
    }
  }

  async function loadActiveQuinielas() {
    if (!db) return;
    const sel = document.getElementById('selectActiveQuiniela');
    const panel = document.getElementById('qManagePanel');
    if (!sel) return;

    sel.innerHTML = '<option disabled selected>— Cargando... —</option>';
    try {
      const snap = await db.collection('quinielas').limit(20).get();
      if (snap.empty) {
        sel.innerHTML = '<option disabled selected>— No hay quinielas creadas —</option>';
        if (panel) panel.style.display = 'none';
        return;
      }
      const docs = [];
      snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || b.createdAt || 0) - (a.createdAt?.seconds || a.createdAt || 0));

      sel.innerHTML = '';
      docs.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.id;
        opt.textContent = `${q.name} (${q.matches?.length || 0} partidos)`;
        sel.appendChild(opt);
      });
      attachGlobalQuinielasWatchers(docs);
      if (!activeQuinielaId || !Array.from(sel.options).some(o => o.value === activeQuinielaId)) {
        activeQuinielaId = sel.options[0]?.value;
      }
      if (activeQuinielaId) {
        sel.value = activeQuinielaId;
        if (panel) panel.style.display = 'block';
        loadQuinielaStandings(activeQuinielaId);
      }
    } catch (err) {
      console.error('[QAdmin] load quinielas error:', err);
    }
  }

  const globalQUnsubs = {};
  const globalQPendingCounts = {};

  function attachGlobalQuinielasWatchers(docs) {
    if (!db || !Array.isArray(docs)) return;
    docs.forEach(q => {
      if (globalQUnsubs[q.id]) return;
      let isFirstSnap = true;
      globalQUnsubs[q.id] = db.collection('quinielas').doc(q.id).collection('picks').onSnapshot(snap => {
        let pending = 0;
        let newestPending = null;
        snap.forEach(doc => {
          const p = doc.data() || {};
          if (p.approved !== true && p.status !== 'approved') {
            pending++;
            newestPending = p;
          }
        });

        if (!isFirstSnap && pending > (globalQPendingCounts[q.id] || 0)) {
          if (typeof window.playNotificationChime === 'function') {
            window.playNotificationChime('admin');
          }
          const nick = newestPending?.nickname || newestPending?.name || 'Jugador';
          const waiter = newestPending?.waiter ? ` • Mesero: ${newestPending.waiter}` : '';
          if (typeof window.sendSystemNotification === 'function') {
            window.sendSystemNotification('🔔 ¡Nueva Solicitud en Quinielas!', `${nick} solicitó entrar a "${q.name}"${waiter}.`);
          }
        }
        isFirstSnap = false;
        globalQPendingCounts[q.id] = pending;
      }, err => console.warn('[QAdmin] watcher error:', err));
    });
  }

  let qPlayersUnsub = null;
  let lastQPendingCount = 0;

  function loadQuinielaStandings(quinielaId) {
    if (!db || !quinielaId) return;
    const standingsEl = document.getElementById('qAdminStandings');
    const listPend = document.getElementById('qListPend');
    const listAppr = document.getElementById('qListAppr');
    if (!standingsEl) return;

    if (qPlayersUnsub) {
      qPlayersUnsub();
      qPlayersUnsub = null;
    }

    standingsEl.innerHTML = '<div class="text-center hint-text py-3">Cargando pronósticos...</div>';

    db.collection('quinielas').doc(quinielaId).get().then(quinielaSnap => {
      if (!quinielaSnap.exists) {
        standingsEl.innerHTML = '<div class="text-center hint-text py-2">Quiniela no encontrada.</div>';
        return;
      }
      const q = quinielaSnap.data() || {};
      const rawMatches = q.matches || [];

      // Sort matches chronologically: earliest first, latest last (handles ISO and Spanish dates)
      const matches = sortMatchesChronologically(rawMatches);

      updateLockBtnState(!!q.locked);

      // Realtime listener on picks
      qPlayersUnsub = db.collection('quinielas').doc(quinielaId).collection('picks').onSnapshot(picksSnap => {
        const pendingDocs = [];
        const approvedDocs = [];
        const allPlayers = [];

        picksSnap.forEach(doc => {
          const p = doc.data() || {};
          const isApproved = p.approved === true || p.status === 'approved';
          const pData = { id: doc.id, ...p, isApproved };
          allPlayers.push(pData);
          if (isApproved) {
            approvedDocs.push({ id: doc.id, ...p });
          } else {
            pendingDocs.push({ id: doc.id, ...p });
          }
        });

        // Trigger chime on new pending requests
        if (pendingDocs.length > lastQPendingCount && typeof playNotificationChime === 'function') {
          playNotificationChime('admin');
        }
        lastQPendingCount = pendingDocs.length;

        // Render player approval lists
        renderQPlayersArray(listPend, pendingDocs, false, quinielaId);
        renderQPlayersArray(listAppr, approvedDocs, true, quinielaId);

        if (allPlayers.length === 0) {
          standingsEl.innerHTML = `
            <div class="text-center hint-text py-3">Aún no hay pronósticos registrados.</div>
            <div style="margin-top:10px; text-align:center;">
              <p style="font-size:12px; color:var(--text-muted);">Comparte la quiniela con los jugadores usando el botón 💬 WhatsApp</p>
            </div>`;
          return;
        }

        // Determine tiebreaker type
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

        // Calculate points for each player
        allPlayers.forEach(p => {
          let pts = 0;
          let exactHits = 0;
          let winnerHits = 0;

          matches.forEach(m => {
            if (m.homeScore === null || m.awayScore === null || m.status === 'pre') return;
            const pick = p.picks?.[m.id];
            if (!pick) return;

             const sport = detectSport(m);
             const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
             const isHybrid = q.isHybrid === true;

             if (sport === 'soccer' && !isHybrid) {
              // Exact score: +3 pts, Outcome: +1 pt
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
              // US Sports (NFL, MLB, NBA): Pick Winner (+1 pt)
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

        // Sort: Approved first, then by Total Points desc, then by Tiebreaker diff asc
        allPlayers.sort((a, b) => {
          if (a.isApproved !== b.isApproved) return b.isApproved ? 1 : -1;
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
          return a.tiebreakerDiff - b.tiebreakerDiff;
        });

        renderAdminStandings(standingsEl, allPlayers, matches, isAllSoccer, realTiebreakerValue);
      }, err => {
        console.error('[QAdmin] realtime picks error:', err);
      });
    }).catch(err => {
      console.error('[QAdmin] standings error:', err);
      standingsEl.innerHTML = '<div class="text-center hint-text py-2" style="color:var(--danger-color);">Error al cargar posiciones.</div>';
    });
  }

  function renderQPlayersArray(container, docsArray, isApproved, quinielaId) {
    if (!container) return;
    container.innerHTML = '';

    if (!docsArray || !docsArray.length) {
      container.innerHTML = '<div class="hint-text py-2">— Sin solicitudes en esta categoría —</div>';
      return;
    }

    docsArray.forEach(p => {
      const id = p.id;
      const userPhoto = p.photoURL || p.userPhoto || 'img/logo.jpg';
      const realName = p.playerName || p.userName || 'Usuario';
      const email = p.userEmail || '';
      const waiter = p.waiter || 'Sin mesero';
      const picksCount = p.picks ? Object.keys(p.picks).length : 0;
      const tiebreakerVal = (p.tiebreaker !== undefined && p.tiebreaker !== null && p.tiebreaker !== '') ? p.tiebreaker : 'Sin capturar';

      const card = document.createElement('div');
      card.className = 'flex-between';
      card.style.cssText = `padding:10px 12px; background:${isApproved ? 'rgba(255,255,255,0.02)' : 'rgba(255,209,0,0.05)'}; border:${isApproved ? '1px solid var(--border-color)' : '1.5px solid rgba(255,209,0,0.4)'}; border-radius:12px; margin-bottom:8px; gap:10px; flex-wrap:wrap;`;

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; min-width:220px; flex:1;">
          <img src="${userPhoto}" alt="${realName}" onerror="this.onerror=null;this.src='img/logo.jpg'" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid ${isApproved ? '#ffd100' : '#ffc107'}; flex-shrink:0;" />
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:900; font-size:14px; color:#ffd100;">${realName}</span>
              ${!isApproved ? `<span class="badge" style="background:rgba(255,193,7,0.2); color:#ffc107; border:1px solid #ffc107; font-size:9.5px; padding:1px 5px; font-weight:800;">SOLICITUD ENTRADA</span>` : '<span class="badge success" style="font-size:9.5px; padding:1px 5px; font-weight:800;">APROBADO</span>'}
            </div>
            <div style="font-size:11.5px; color:#ffffff; font-weight:700; margin-top:2px;">
              👤 ${realName} ${email ? `<span style="font-size:10.5px; color:var(--text-muted);">(${email})</span>` : ''}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:3px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>🤵 <strong>Mesero:</strong> ${waiter}</span>
              <span>📝 <strong>Pronósticos:</strong> <strong style="color:${picksCount > 0 ? '#00e676' : '#aaa'};">${picksCount > 0 ? `${picksCount} partidos` : 'Pendiente'}</strong></span>
              <span>🎯 <strong>Desempate:</strong> <strong style="color:#ffd100;">${tiebreakerVal}</strong></span>
            </div>
          </div>
        </div>
        <div class="flex-row" style="gap: 6px; align-items:center;">
          ${isApproved 
            ? `<button class="btn btn-secondary" data-q-player-id="${id}" data-action="reject" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; border-radius:8px; color:#ff4444;">✕ Desaprobar</button>
               <button class="btn btn-danger" data-q-player-id="${id}" data-action="delete" style="padding: 6px 10px; font-size: 11.5px; font-weight:800; width: auto; border-radius:8px;">🗑️</button>`
            : `<button class="btn btn-primary" data-q-player-id="${id}" data-action="approve" style="padding: 7px 14px; font-size: 12px; font-weight:900; width: auto; color: var(--bg-color); border-radius:8px; background:#00e676; border-color:#00e676;">✅ Aprobar</button>
               <button class="btn btn-secondary" data-q-player-id="${id}" data-action="reject" style="padding: 7px 10px; font-size: 12px; font-weight:800; width: auto; border-radius:8px; color:#ff4444;">✕ Rechazar</button>
               <button class="btn btn-danger" data-q-player-id="${id}" data-action="delete" style="padding: 7px 10px; font-size: 12px; font-weight:800; width: auto; border-radius:8px;">🗑️</button>`
          }
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-q-player-id');
        const act = btn.getAttribute('data-action');
        handleQPlayerAction(id, act, quinielaId);
      });
    });
  }

  async function handleQPlayerAction(playerDocId, action, quinielaId) {
    if (!quinielaId || !db) return;
    const pref = db.collection('quinielas').doc(quinielaId).collection('picks').doc(playerDocId);

    try {
      if (action === 'approve') {
        await pref.update({ approved: true, status: 'approved' });
      } else if (action === 'reject') {
        await pref.update({ approved: false, status: 'rejected' });
      } else if (action === 'delete') {
        if (!confirm('¿Deseas eliminar a este participante de la quiniela?')) return;
        await pref.delete();
      }
    } catch (err) {
      console.error('[QAdmin] player action error:', err);
      alert('Error en acción de jugador: ' + err.message);
    }
  }

  function renderAdminStandings(container, players, matches, isAllSoccer, realTiebreakerValue) {
    container.innerHTML = '';

    // Check if tournament is completely finished
    const allDone = matches.length > 0 && matches.every(m => m.completed === true || m.status === 'post' || (m.homeScore !== null && m.awayScore !== null && m.status !== 'in'));
    const approvedPlayers = players.filter(p => p.isApproved);

    // 1. Render Admin Winner Champion Card
    const adminWinnerEl = document.getElementById('qAdminWinnerBanner');
    if (adminWinnerEl) {
      if (allDone && approvedPlayers.length > 0) {
        const champ = approvedPlayers[0];
        adminWinnerEl.style.display = 'block';
        adminWinnerEl.innerHTML = `
          <div class="q-winner-card" style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
              <div style="display:flex; align-items:center; gap:14px;">
                <span style="font-size:36px; filter: drop-shadow(0 0 10px rgba(255,209,0,0.6));">👑 🏆</span>
                <div style="text-align:left;">
                  <div style="font-size:11px; font-weight:900; letter-spacing:0.12em; color:#ffd100; text-transform:uppercase;">Ganador Oficial de la Quiniela</div>
                  <div style="font-size:19px; font-weight:900; color:#fff;">${champ.playerName || champ.nickname || champ.name || 'Campeón'}</div>
                  <div style="font-size:13px; font-weight:800; color:#00e676; margin-top:2px;">
                    🥇 Puntos: ${champ.totalPoints} pts &bull; Aciertos Exactos: ${champ.exactHits || 0} &bull; Desempate: ${champ.tiebreaker ?? 'N/A'} (Dif: ${champ.tiebreakerDiff ?? 'N/A'})
                  </div>
                </div>
              </div>
              <div style="text-align:right;">
                <span class="badge" style="background:rgba(255,215,0,0.2); border:1.5px solid #ffd100; color:#ffd100; font-weight:900; font-size:12px; padding:6px 12px; border-radius:10px;">
                  🏁 JORNADA FINALIZADA
                </span>
              </div>
            </div>
          </div>
        `;
      } else {
        adminWinnerEl.style.display = 'none';
        adminWinnerEl.innerHTML = '';
      }
    }

    // 2. Render Admin Sleeper Podium
    const adminPodiumEl = document.getElementById('qAdminSleeperPodium');
    if (adminPodiumEl) {
      if (approvedPlayers.length > 0) {
        adminPodiumEl.style.display = 'flex';
        const first = approvedPlayers[0];
        const second = approvedPlayers[1];
        const third = approvedPlayers[2];

        adminPodiumEl.innerHTML = `
          ${second ? `
            <div class="sleeper-podium-card sleeper-podium-2nd animate-fade">
              <span class="sleeper-podium-medal">🥈</span>
              <img src="${second.photoURL || 'img/logo.jpg'}" onerror="this.src='img/logo.jpg'" class="sleeper-podium-avatar" alt="${second.playerName || second.name}"/>
              <div class="sleeper-podium-name">${second.playerName || second.nickname || second.name || 'Jugador'}</div>
              <div class="sleeper-podium-pts">${second.totalPoints} pts</div>
            </div>
          ` : ''}

          ${first ? `
            <div class="sleeper-podium-card sleeper-podium-1st animate-fade">
              <span class="sleeper-podium-medal">👑</span>
              <img src="${first.photoURL || 'img/logo.jpg'}" onerror="this.src='img/logo.jpg'" class="sleeper-podium-avatar" alt="${first.playerName || first.name}"/>
              <div class="sleeper-podium-name" style="color:#ffd100;">${first.playerName || first.nickname || first.name || 'Jugador'}</div>
              <div class="sleeper-podium-pts" style="font-size:15px;">${first.totalPoints} pts</div>
            </div>
          ` : ''}

          ${third ? `
            <div class="sleeper-podium-card sleeper-podium-3rd animate-fade">
              <span class="sleeper-podium-medal">🥉</span>
              <img src="${third.photoURL || 'img/logo.jpg'}" onerror="this.src='img/logo.jpg'" class="sleeper-podium-avatar" alt="${third.playerName || third.name}"/>
              <div class="sleeper-podium-name">${third.playerName || third.nickname || third.name || 'Jugador'}</div>
              <div class="sleeper-podium-pts">${third.totalPoints} pts</div>
            </div>
          ` : ''}
        `;
      } else {
        adminPodiumEl.style.display = 'none';
      }
    }

    // 3. Render Table
    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-x:auto; border-radius:12px;';

    const table = document.createElement('table');
    table.className = 'q-standings-table';

    function getAdminHeaderSchedule(m) {
      if (m.status === 'in') {
        return `<div style="background:rgba(255,68,68,0.25); border:1px solid #ff4444; border-radius:6px; padding:2px 4px; margin-top:2px;">
          <span style="font-size:10px; font-weight:900; color:#ff4444; animation:tvPulse 1s infinite;">🔴 ${m.awayScore ?? 0}-${m.homeScore ?? 0}</span>
        </div>`;
      }
      if (m.completed || m.status === 'post') {
        return `<div style="margin-top:2px;">
          <span style="font-size:10px; font-weight:900; color:#ffd100;">${m.awayScore}-${m.homeScore}</span>
          <div style="font-size:8px; color:#00e676; font-weight:800;">FINAL</div>
        </div>`;
      }
      const str = (m.date || '').trim();
      return `<span style="font-size:8.5px; color:var(--text-muted); font-weight:800; display:inline-block; margin-top:2px;">${str || 'PENDIENTE'}</span>`;
    }

    const thead = table.createTHead();
    const hr = thead.insertRow();
    hr.innerHTML = `
      <th style="text-align:left; padding:10px 12px; min-width:140px; color:#ffd100; font-weight:900;">JUGADOR</th>
      <th style="text-align:center; padding:10px 8px; min-width:55px; color:#ffd100; font-weight:900; font-size:13px;" title="Puntos Totales">PTS</th>
    ` +
      matches.map(m => {
        const scoreHtml = getAdminHeaderSchedule(m);
        return `<th style="text-align:center; padding:6px; min-width:85px;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" style="width:19px; height:19px; object-fit:contain;" title="${m.away}"/>
              <span style="font-size:8px; font-weight:900; color:#ffd100;">VS</span>
              <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" style="width:19px; height:19px; object-fit:contain;" title="${m.home}"/>
            </div>
            ${scoreHtml}
          </div>
        </th>`;
      }).join('') +
      `<th style="text-align:center; padding:10px; min-width:70px; color:#ffd100; font-weight:900;" title="Pronóstico Desempate">🎯 DESEMPATE</th>`;

    const tbody = table.createTBody();
    players.forEach((p, idx) => {
      const isMe = false;
      const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;
      const name = p.nickname || p.name || p.playerName || 'Jugador';
      const photo = p.photoURL || 'img/logo.jpg';
      const isApproved = p.approved === true || p.status === 'approved';

      const tr = tbody.insertRow();
      tr.style.cssText = `border-bottom:1px solid rgba(255,255,255,0.05); ${!isApproved ? 'opacity:0.5;' : ''}`;

      let playerCell = `
        <td style="padding:8px 12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:12px; font-weight:900; color:#ffd100; min-width:20px;">${rankEmoji}</span>
            <img src="${photo}" onerror="this.src='img/logo.jpg'" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" alt="${name}"/>
            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:110px;">
              <span style="font-size:12px; font-weight:800; color:#fff;">${name}</span>
              ${p.waiter ? `<div style="font-size:9px; color:var(--text-muted);">Mesero: ${p.waiter}</div>` : ''}
              ${!isApproved ? '<div style="font-size:9px; color:#ffc107;">🟡 Pendiente</div>' : ''}
            </div>
          </div>
        </td>
      `;

      let ptsCell = `
        <td style="text-align:center; padding:8px; font-size:15px; font-weight:900; color:#ffd100; background:rgba(255,255,255,0.02);">
          ${p.totalPoints}
        </td>
      `;

      let cells = playerCell + ptsCell;

      matches.forEach(m => {
        const pick = p.picks?.[m.id];
        const sport = detectSport(m);
        const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';
        const isLive = m.status === 'in';

        if (!pick) {
          cells += `<td class="q-s-cell q-cell-neutral" style="color:var(--text-muted); font-size:11px;">—</td>`;
          return;
        }

        if (sport === 'soccer') {
          const rawA = pick.awayScore;
          const rawH = pick.homeScore;
          const pickStr = `${rawA ?? '-'}-${rawH ?? '-'}`;

          if (!hasScore) {
            cells += `<td class="q-s-cell q-cell-neutral">${pickStr}</td>`;
            return;
          }

          const pickA = parseInt(rawA, 10);
          const pickH = parseInt(rawH, 10);
          const exact = pickH === m.homeScore && pickA === m.awayScore;
          const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
          const pickWin = pickH > pickA ? 'home' : pickA > pickH ? 'away' : 'draw';

          if (isLive) {
            if (exact) {
              cells += `<td class="q-s-cell q-cell-live-winning" title="En Vivo: Exacto (+3 pts)">${pickStr}</td>`;
            } else if (realWin === pickWin) {
              cells += `<td class="q-s-cell q-cell-live-tied" title="En Vivo: Ganador (+1 pt)">${pickStr}</td>`;
            } else {
              cells += `<td class="q-s-cell q-cell-live-losing" title="En Vivo: Fallado (0 pts)">${pickStr}</td>`;
            }
          } else {
            if (exact) {
              cells += `<td class="q-s-cell q-cell-exact-hit" title="Final: Exacto (+3 pts)">🎯 ${pickStr}</td>`;
            } else if (realWin === pickWin) {
              cells += `<td class="q-s-cell q-cell-winner-hit" title="Final: Ganador (+1 pt)">✓ ${pickStr}</td>`;
            } else {
              cells += `<td class="q-s-cell q-cell-final-miss" title="Final: Fallado (0 pts)">✗ ${pickStr}</td>`;
            }
          }
        } else {
          const winnerSide = pick.winner ? pick.winner : (Number(pick.homeScore) > Number(pick.awayScore) ? 'home' : 'away');

          let logoHtml = '';
          if (winnerSide === 'draw') {
            logoHtml = `
              <div class="q-cell-logo-wrap" title="Empate">
                <span style="font-size:16px;">🤝</span>
                <span class="q-cell-team-sub">EMPATE</span>
              </div>
            `;
          } else {
            const pickedLogo = winnerSide === 'home' ? m.homeLogo : m.awayLogo;
            const pickedAbbr = winnerSide === 'home' ? (m.homeAbbr || m.home) : (m.awayAbbr || m.away);
            const shortAbbr = pickedAbbr && pickedAbbr.length > 4 ? pickedAbbr.substring(0, 3).toUpperCase() : (pickedAbbr || '').toUpperCase();

            logoHtml = `
              <div class="q-cell-logo-wrap" title="${pickedAbbr}">
                <img src="${pickedLogo}" onerror="this.src='img/logo.jpg'" class="q-cell-team-logo" alt="${pickedAbbr}" />
                <span class="q-cell-team-sub">${shortAbbr}</span>
              </div>
            `;
          }

          if (!hasScore) {
            cells += `<td class="q-s-cell q-cell-neutral">${logoHtml}</td>`;
            return;
          }

          const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';

          if (isLive) {
            if (winnerSide === realWin) {
              cells += `<td class="q-s-cell q-cell-live-winning" title="En Vivo: ¡Ganando! (+1 pt)">${logoHtml}</td>`;
            } else if (realWin === 'draw') {
              cells += `<td class="q-s-cell q-cell-live-tied" title="En Vivo: Empate">${logoHtml}</td>`;
            } else {
              cells += `<td class="q-s-cell q-cell-live-losing" title="En Vivo: Perdiendo (0 pts)">${logoHtml}</td>`;
            }
          } else {
            if (winnerSide === realWin) {
              cells += `<td class="q-s-cell q-cell-final-hit" title="Final: Acertado (+1 pt)">${logoHtml}</td>`;
            } else {
              cells += `<td class="q-s-cell q-cell-final-miss" title="Final: Fallado (0 pts)">${logoHtml}</td>`;
            }
          }
        }
      });

      const tieVal = (p.tiebreaker !== undefined && p.tiebreaker !== null && p.tiebreaker !== '') ? p.tiebreaker : '—';
      cells += `<td style="text-align:center; font-size:12px; font-weight:800; color:#ffd100;">${tieVal}</td>`;
      tr.innerHTML = cells;
    });

    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function norm(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
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

  async function syncQuinielaScores(quinielaId) {
    if (!db || !quinielaId) { alert('Selecciona una quiniela primero.'); return; }
    const btn = document.getElementById('btnQAdminSync');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sincronizando...'; }

    try {
      const ref = db.collection('quinielas').doc(quinielaId);
      const snap = await ref.get();
      const q = snap.data() || {};
      const matches = q.matches || [];
      if (matches.length === 0) { alert('No hay partidos en esta quiniela.'); return; }

      // 1. Calculate dynamic date range based on actual match dates in this quiniela
      let minTs = null;
      let maxTs = null;
      matches.forEach(m => {
        const t = parseMatchTimestamp(m);
        if (t > 0) {
          if (!minTs || t < minTs) minTs = t;
          if (!maxTs || t > maxTs) maxTs = t;
        }
      });

      const today = new Date();
      const start = minTs ? new Date(minTs - 3 * 86400000) : new Date(today.getTime() - 14 * 86400000);
      const end = maxTs ? new Date(maxTs + 3 * 86400000) : new Date(today.getTime() + 21 * 86400000);
      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const dateParam = `dates=${fmt(start)}-${fmt(end)}&limit=100`;

      // 2. Build complete endpoint list
      const neededUrls = [];
      const seenUrls = new Set();
      const addUrl = (url, sport, slug) => {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          neededUrls.push({ url, sport, slug });
        }
      };

      const hasFootball = matches.some(m => detectSport(m) === 'football');
      const hasSoccer = matches.some(m => detectSport(m) === 'soccer');
      const hasBaseball = matches.some(m => detectSport(m) === 'baseball');
      const hasBasketball = matches.some(m => detectSport(m) === 'basketball');

      if (hasFootball) {
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?${dateParam}`, 'football', 'nfl');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=1&week=1`, 'football', 'nfl');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=1&week=2`, 'football', 'nfl');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=1&week=3`, 'football', 'nfl');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&limit=100`, 'football', 'nfl');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100`, 'football', 'nfl');
      }

      if (hasSoccer) {
        const soccerSlugs = new Set(['mex.1', 'esp.1', 'eng.1', 'uefa.champions', 'fra.1', 'ita.1', 'ger.1', 'usa.1']);
        matches.forEach(m => {
          if (detectSport(m) === 'soccer' && m.slug) soccerSlugs.add(m.slug);
        });
        soccerSlugs.forEach(slug => {
          addUrl(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?${dateParam}`, 'soccer', slug);
          addUrl(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?limit=100`, 'soccer', slug);
        });
      }

      if (hasBaseball) {
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?${dateParam}`, 'baseball', 'mlb');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?limit=100`, 'baseball', 'mlb');
      }

      if (hasBasketball) {
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?${dateParam}`, 'basketball', 'nba');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?limit=100`, 'basketball', 'nba');
      }

      if (neededUrls.length === 0) {
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?${dateParam}`, 'soccer', 'mex.1');
        addUrl(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?${dateParam}`, 'football', 'nfl');
      }

      // 3. Fetch scoreboard feeds concurrently
      const eventsBySport = {};
      const eventsById = {};

      await Promise.all(neededUrls.map(async item => {
        try {
          const res = await fetch(item.url);
          if (!res.ok) return;
          const data = await res.json();
          if (data && Array.isArray(data.events)) {
            if (!eventsBySport[item.sport]) eventsBySport[item.sport] = [];
            data.events.forEach(ev => {
              const enhanced = { ...ev, _sport: item.sport, _slug: item.slug };
              eventsBySport[item.sport].push(enhanced);
              if (ev.id) eventsById[String(ev.id)] = enhanced;
            });
          }
        } catch (e) {}
      }));

      // 4. Direct Fallback: query ESPN summary endpoint for missing events
      const missingMatches = matches.filter(m => m.espnEventId && !eventsById[String(m.espnEventId)] && (m.homeScore === null || m.completed !== true));
      if (missingMatches.length > 0) {
        await Promise.all(missingMatches.slice(0, 20).map(async m => {
          try {
            const sp = detectSport(m);
            const sl = m.slug || (sp === 'football' ? 'nfl' : sp === 'baseball' ? 'mlb' : sp === 'basketball' ? 'nba' : 'mex.1');
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sp}/${sl}/summary?event=${m.espnEventId}`);
            if (!res.ok) return;
            const data = await res.json();
            const header = data?.header;
            const comp = header?.competitions?.[0];
            if (comp) {
              const syntheticEv = {
                id: m.espnEventId,
                status: comp.status,
                competitions: [comp],
                _sport: sp,
                _slug: sl
              };
              eventsById[String(m.espnEventId)] = syntheticEv;
              if (!eventsBySport[sp]) eventsBySport[sp] = [];
              eventsBySport[sp].push(syntheticEv);
            }
          } catch (e) {}
        }));
      }

      // 5. Update matches with SCORE PRESERVATION
      let updated = 0;
      const updatedMatches = matches.map(m => {
        const matchSport = detectSport(m);
        const candidateEvents = eventsBySport[matchSport] || [];

        let ev = null;
        if (m.espnEventId && eventsById[String(m.espnEventId)]) {
          ev = eventsById[String(m.espnEventId)];
        }

        if (!ev && m.espnEventId) {
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

        // PRESERVE EXISTING VALUES BY DEFAULT - NEVER WIPE OUT WITH NULL
        let newHomeScore = m.homeScore;
        let newAwayScore = m.awayScore;
        let state = m.status || 'pre';
        let statusStr = m.statusStr || '';
        let completed = m.completed || false;

        if (ev) {
          const comps = ev.competitions?.[0]?.competitors || [];
          const homeC = comps.find(c => c.homeAway === 'home') || comps[1] || {};
          const awayC = comps.find(c => c.homeAway === 'away') || comps[0] || {};
          const evCompleted = !!ev.status?.type?.completed;
          const evState = ev.status?.type?.state || 'pre';
          const evStatusStr = ev.status?.type?.shortDetail || '';

          if (evState === 'in' || evState === 'post' || evCompleted) {
            if (homeC && homeC.score !== undefined && homeC.score !== null && homeC.score !== '') {
              const parsedH = parseInt(homeC.score, 10);
              if (!isNaN(parsedH)) newHomeScore = parsedH;
            }
            if (awayC && awayC.score !== undefined && awayC.score !== null && awayC.score !== '') {
              const parsedA = parseInt(awayC.score, 10);
              if (!isNaN(parsedA)) newAwayScore = parsedA;
            }
            state = evState;
            statusStr = evStatusStr;
            completed = evCompleted || evState === 'post' || (evStatusStr && (evStatusStr.toUpperCase().includes('FINAL') || evStatusStr === 'FT'));
          }
        }

        updated++;
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

      await ref.update({ matches: updatedMatches, lastSync: Date.now() });
      alert(`✅ Sincronizado: ${updated} partidos actualizados con marcadores en vivo.`);
      loadQuinielaStandings(quinielaId);
    } catch (err) {
      alert('Error al sincronizar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Sincronizar ESPN'; }
    }
  }

  window.qAdminLoadStandings = loadQuinielaStandings;
  window.qAdminSyncQuiniela = syncQuinielaScores;

  initQAdmin();
})();
