// Quiniela Admin Module — Wings & Wins
(function () {
  'use strict';

  let db = null;

  const LEAGUES = {
    'nfl':              { sport: 'football',   slug: 'nfl',                     label: 'NFL 🏈' },
    'college-football': { sport: 'football',   slug: 'college-football',        label: 'NCAA Football 🎓' },
    'nba':              { sport: 'basketball', slug: 'nba',                     label: 'NBA 🏀' },
    'mls':              { sport: 'soccer',     slug: 'usa.1',                   label: 'MLS ⚽' },
    'liga-mx':          { sport: 'soccer',     slug: 'mex.1',                   label: 'Liga MX ⚽' },
    'premier':          { sport: 'soccer',     slug: 'eng.1',                   label: 'Premier League ⚽' },
    'champions':        { sport: 'soccer',     slug: 'uefa.champions',          label: 'Champions League ⚽' },
    'laliga':           { sport: 'soccer',     slug: 'esp.1',                   label: 'La Liga ⚽' },
  };

  let qSearchResults = [];
  let qSelectedMatches = {};
  let activeQuinielaId = null;

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
    Object.entries(LEAGUES).forEach(([key, val]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.label;
      sel.appendChild(opt);
    });
  }

  function setupQAdminListeners() {
    const btnSearch = document.getElementById('btnQSearchGames');
    if (btnSearch) btnSearch.addEventListener('click', searchQuinielaGames);

    const btnCreate = document.getElementById('btnCreateQuiniela');
    if (btnCreate) btnCreate.addEventListener('click', createQuiniela);

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
        if (!activeQuinielaId) return;
        if (!confirm('¿Eliminar esta quiniela permanentemente?')) return;
        try {
          const picks = await db.collection('quinielas').doc(activeQuinielaId).collection('picks').get();
          const batch = db.batch();
          picks.forEach(d => batch.delete(d.ref));
          await batch.commit();
          await db.collection('quinielas').doc(activeQuinielaId).delete();
          alert('✅ Quiniela eliminada.');
          activeQuinielaId = null;
          loadActiveQuinielas();
        } catch (err) { alert('Error: ' + err.message); }
      });
    }
  }

  async function searchQuinielaGames() {
    const leagueKey = document.getElementById('qSportSelect')?.value;
    const league = LEAGUES[leagueKey];
    if (!league) return;

    const resultsEl = document.getElementById('qGamePickerList');
    const container = document.getElementById('qGamePickerContainer');
    const btnSearch = document.getElementById('btnQSearchGames');

    if (btnSearch) { btnSearch.disabled = true; btnSearch.textContent = '⏳ Buscando...'; }
    if (resultsEl) resultsEl.innerHTML = '<div class="text-center hint-text py-3">Buscando partidos en ESPN...</div>';
    if (container) container.style.display = 'block';

    qSelectedMatches = {};
    qSearchResults = [];

    try {
      const today = new Date();
      const end = new Date();
      end.setDate(today.getDate() + 14);
      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const url = `https://site.api.espn.com/apis/site/v2/sports/${league.sport}/${league.slug}/scoreboard?dates=${fmt(today)}-${fmt(end)}&limit=50`;

      const res = await fetch(url);
      const data = await res.json();
      const events = data.events || [];

      if (events.length === 0) {
        if (resultsEl) resultsEl.innerHTML = '<div class="text-center hint-text py-3">No se encontraron partidos. Prueba con otra liga o fechas distintas.</div>';
        return;
      }

      qSearchResults = events;
      renderQGamePicker(events);
    } catch (err) {
      console.error('[QAdmin]', err);
      if (resultsEl) resultsEl.innerHTML = '<div class="text-center hint-text py-3" style="color:var(--danger-color);">Error al conectar con ESPN.</div>';
    } finally {
      if (btnSearch) { btnSearch.disabled = false; btnSearch.textContent = '🔍 Buscar Partidos'; }
    }
  }

  function renderQGamePicker(events) {
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
      const isCompleted = ev.status?.type?.completed;
      const isLive = ev.status?.type?.state === 'in';
      const dateStr = ev.date ? new Date(ev.date).toLocaleDateString('es-MX', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

      const card = document.createElement('div');
      card.className = 'q-game-pick-card';
      card.dataset.evId = ev.id;
      card.innerHTML = `
        <div class="q-pick-check" id="chk_${ev.id}">☐</div>
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
          qSelectedMatches[ev.id] = {
            ev, espnEventId: ev.id, date: dateStr,
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
  }

  function updateSelectedCount() {
    const count = Object.keys(qSelectedMatches).length;
    const countEl = document.getElementById('qSelectedCount');
    const btn = document.getElementById('btnCreateQuiniela');
    if (countEl) countEl.textContent = count > 0 ? `${count} partido${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}` : '';
    if (btn) btn.disabled = count === 0;
  }

  async function createQuiniela() {
    if (!db) return;
    const name = (document.getElementById('qName')?.value || '').trim();
    const leagueKey = document.getElementById('qSportSelect')?.value;
    const league = LEAGUES[leagueKey];
    const matchCount = Object.keys(qSelectedMatches).length;

    if (!name) { alert('Escribe un nombre para la quiniela.'); return; }
    if (matchCount === 0) { alert('Selecciona al menos un partido.'); return; }

    const matches = Object.values(qSelectedMatches).map((m, i) => ({
      id: `m${i + 1}`,
      espnEventId: m.espnEventId,
      home: m.home.name,
      away: m.away.name,
      homeLogo: m.home.logo,
      awayLogo: m.away.logo,
      homeAbbr: m.home.abbr,
      awayAbbr: m.away.abbr,
      date: m.date,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      completed: false
    }));

    try {
      const ref = db.collection('quinielas').doc();
      await ref.set({
        id: ref.id,
        name,
        sport: league.sport,
        leagueKey,
        espnSlug: league.slug,
        matches,
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp
          ? firebase.firestore.FieldValue.serverTimestamp()
          : Date.now()
      });

      alert(`✅ Quiniela "${name}" creada con ${matchCount} partidos.`);
      if (document.getElementById('qName')) document.getElementById('qName').value = '';
      qSelectedMatches = {};
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
      const snap = await db.collection('quinielas').orderBy('createdAt', 'desc').limit(20).get();
      if (snap.empty) {
        sel.innerHTML = '<option disabled selected>— No hay quinielas creadas —</option>';
        if (panel) panel.style.display = 'none';
        return;
      }
      sel.innerHTML = '';
      snap.forEach(doc => {
        const q = doc.data();
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = `${q.name} (${q.matches?.length || 0} partidos)`;
        sel.appendChild(opt);
      });
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

  async function loadQuinielaStandings(quinielaId) {
    if (!db || !quinielaId) return;
    const standingsEl = document.getElementById('qAdminStandings');
    if (!standingsEl) return;
    standingsEl.innerHTML = '<div class="text-center hint-text py-3">Cargando pronósticos...</div>';

    try {
      const quinielaSnap = await db.collection('quinielas').doc(quinielaId).get();
      if (!quinielaSnap.exists) { standingsEl.innerHTML = '<div class="text-center hint-text py-2">Quiniela no encontrada.</div>'; return; }
      const q = quinielaSnap.data() || {};
      const matches = q.matches || [];

      const picksSnap = await db.collection('quinielas').doc(quinielaId).collection('picks').get();
      if (picksSnap.empty) {
        standingsEl.innerHTML = '<div class="text-center hint-text py-3">Aún no hay pronósticos registrados.</div>';
        return;
      }

      const players = [];
      picksSnap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

      players.forEach(p => {
        let pts = 0;
        matches.forEach(m => {
          if (m.homeScore === null || m.awayScore === null) return;
          const pick = p.picks?.[m.id];
          if (!pick) return;
          if (pick.homeScore === m.homeScore && pick.awayScore === m.awayScore) {
            pts += 3;
          } else {
            const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
            const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
            if (realWin === pickWin) pts += 1;
          }
        });
        p.totalPoints = pts;
      });
      players.sort((a, b) => b.totalPoints - a.totalPoints);
      renderAdminStandings(standingsEl, players, matches);
    } catch (err) {
      console.error('[QAdmin] standings error:', err);
      standingsEl.innerHTML = '<div class="text-center hint-text py-2" style="color:var(--danger-color);">Error al cargar posiciones.</div>';
    }
  }

  function renderAdminStandings(container, players, matches) {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-x:auto; border-radius:12px;';

    const table = document.createElement('table');
    table.className = 'q-standings-table';

    // Header
    const thead = table.createTHead();
    const hr = thead.insertRow();
    hr.innerHTML = `<th style="text-align:left; padding:10px 12px; min-width:120px;">Jugador</th>` +
      matches.map(m => `<th style="text-align:center; padding:6px; min-width:90px;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
          <div style="display:flex; align-items:center; gap:4px;">
            <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" style="width:20px; height:20px; object-fit:contain;"/>
            <span style="font-size:9px; font-weight:700;">vs</span>
            <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" style="width:20px; height:20px; object-fit:contain;"/>
          </div>
          <span style="font-size:9px; color:var(--text-muted);">${m.awayAbbr || m.away.substring(0,3)} v ${m.homeAbbr || m.home.substring(0,3)}</span>
          ${m.homeScore !== null ? `<span style="font-size:10px; font-weight:900; color:#ffd100;">${m.awayScore}-${m.homeScore}</span>` : '<span style="font-size:9px; color:var(--text-muted);">Pendiente</span>'}
        </div>
      </th>`).join('') +
      `<th style="text-align:center; padding:10px;">Pts</th>`;

    const tbody = table.createTBody();
    players.forEach((p, idx) => {
      const tr = tbody.insertRow();
      const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;

      let cells = `<td style="padding:10px 12px; font-weight:700; white-space:nowrap;">${rankEmoji} ${p.playerName || 'Anónimo'}</td>`;
      matches.forEach(m => {
        const pick = p.picks?.[m.id];
        if (!pick) { cells += `<td class="q-s-cell q-cell-gray">—</td>`; return; }
        const pickStr = `${pick.awayScore}-${pick.homeScore}`;
        if (m.homeScore === null) { cells += `<td class="q-s-cell q-cell-gray">${pickStr}</td>`; return; }
        const exact = pick.homeScore === m.homeScore && pick.awayScore === m.awayScore;
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
        if (exact) cells += `<td class="q-s-cell q-cell-green" title="+3 pts">🎯${pickStr}</td>`;
        else if (realWin === pickWin) cells += `<td class="q-s-cell q-cell-yellow" title="+1 pt">✓${pickStr}</td>`;
        else cells += `<td class="q-s-cell q-cell-red" title="0 pts">✗${pickStr}</td>`;
      });
      cells += `<td style="text-align:center; font-weight:900; color:${p.totalPoints>0?'var(--accent-color)':'var(--text-muted)'}; font-size:15px;">${p.totalPoints}</td>`;
      tr.innerHTML = cells;
    });

    wrap.appendChild(table);
    container.appendChild(wrap);
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
      const espnSlug = q.espnSlug || 'nfl';
      const sport = q.sport || 'football';

      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${espnSlug}/scoreboard`);
      const data = await res.json();
      const events = data.events || [];

      let updated = 0;
      const updatedMatches = matches.map(m => {
        const ev = events.find(e => e.id === m.espnEventId);
        if (!ev) return m;
        const comps = ev.competitions?.[0]?.competitors || [];
        const homeC = comps.find(c => c.homeAway === 'home');
        const awayC = comps.find(c => c.homeAway === 'away');
        const completed = !!ev.status?.type?.completed;
        const state = ev.status?.type?.state || 'pre';
        updated++;
        return {
          ...m,
          homeScore: homeC ? parseInt(homeC.score || 0, 10) : m.homeScore,
          awayScore: awayC ? parseInt(awayC.score || 0, 10) : m.awayScore,
          completed,
          status: state,
          statusStr: ev.status?.type?.shortDetail || '',
          lastSync: Date.now()
        };
      });

      await ref.update({ matches: updatedMatches, lastSync: Date.now() });
      alert(`✅ Sincronizado: ${updated} partidos actualizados.`);
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
