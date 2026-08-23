// Quiniela & Pick'em Player Module — Wings & Wins v50
(function () {
  'use strict';

  let db = null;
  let activeQuiniela = null;
  let picks = {}; // { matchId: { homeScore, awayScore } }
  let playerName = '';
  let liveUnsubscribe = null;
  let standingsUnsubscribe = null;
  let autoSyncInterval = null;

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
      setupQPlayerListeners();
      loadQuinielaList();
    } else {
      setTimeout(initQPlayer, 150);
    }
  }

  function setupQPlayerListeners() {
    const sel = document.getElementById('qPlayerQuinielaSelect');
    if (sel) {
      sel.addEventListener('change', () => {
        const qId = sel.value;
        if (qId) loadQuinielaForPlayer(qId);
      });
    }

    const btnSave = document.getElementById('btnSaveQPicks');
    if (btnSave) btnSave.addEventListener('click', savePlayerPicks);
  }

  async function loadQuinielaList() {
    if (!db) return;
    const sel = document.getElementById('qPlayerQuinielaSelect');
    const picksSection = document.getElementById('qPicksSection');
    if (!sel) return;

    sel.innerHTML = '<option disabled selected>Cargando quinielas...</option>';
    try {
      const snap = await db.collection('quinielas').limit(20).get();
      const docs = [];
      snap.forEach(doc => {
        const q = doc.data();
        if (q.active !== false) docs.push({ id: doc.id, ...q });
      });
      docs.sort((a, b) => (b.createdAt?.seconds || b.createdAt || 0) - (a.createdAt?.seconds || a.createdAt || 0));

      if (docs.length === 0) {
        sel.innerHTML = '<option disabled selected>— No hay quinielas activas —</option>';
        if (picksSection) picksSection.style.display = 'none';
        return;
      }
      sel.innerHTML = '<option value="" disabled selected>— Elige una quiniela —</option>';
      let firstId = null;
      docs.forEach(q => {
        const opt = document.createElement('option');
        opt.value = q.id;
        opt.textContent = q.name;
        sel.appendChild(opt);
        if (!firstId) firstId = q.id;
      });

      if (firstId) {
        sel.value = firstId;
        loadQuinielaForPlayer(firstId);
      }
    } catch (err) {
      console.error('[QPlayer] list error:', err);
      sel.innerHTML = '<option disabled selected>Error al cargar quinielas</option>';
    }
  }

  async function loadQuinielaForPlayer(quinielaId) {
    if (!db) return;

    if (liveUnsubscribe) { liveUnsubscribe(); liveUnsubscribe = null; }
    if (standingsUnsubscribe) { standingsUnsubscribe(); standingsUnsubscribe = null; }
    if (autoSyncInterval) { clearInterval(autoSyncInterval); autoSyncInterval = null; }

    const picksSection = document.getElementById('qPicksSection');
    const standingsSection = document.getElementById('qStandingsSection');
    if (picksSection) picksSection.style.display = 'block';
    if (standingsSection) standingsSection.style.display = 'block';

    // Load user's existing picks
    picks = {};
    try {
      const myPicksDoc = await db.collection('quinielas').doc(quinielaId).collection('picks').doc(deviceId).get();
      if (myPicksDoc.exists) {
        picks = myPicksDoc.data().picks || {};
        playerName = myPicksDoc.data().playerName || playerName;
        if (document.getElementById('qPlayerName')) document.getElementById('qPlayerName').value = playerName;
      }
    } catch (e) {}

    // Live-listen to quiniela document
    liveUnsubscribe = db.collection('quinielas').doc(quinielaId).onSnapshot(snap => {
      if (!snap.exists) return;
      activeQuiniela = { id: snap.id, ...snap.data() };
      renderPicksForm(activeQuiniela);
    }, err => console.error('[QPlayer] live error:', err));

    // Live-listen to standings
    standingsUnsubscribe = db.collection('quinielas').doc(quinielaId).collection('picks').onSnapshot(snap => {
      if (!activeQuiniela) return;
      renderLiveStandings(snap, activeQuiniela.matches || []);
    }, err => console.error('[QPlayer] standings error:', err));

    // Auto-sync ESPN live scores in background every 20 seconds
    syncESPNLiveScores(quinielaId);
    autoSyncInterval = setInterval(() => syncESPNLiveScores(quinielaId), 20000);
  }

  // Background ESPN Live Score fetcher
  async function syncESPNLiveScores(quinielaId) {
    if (!db || !quinielaId) return;
    try {
      const qRef = db.collection('quinielas').doc(quinielaId);
      const snap = await qRef.get();
      if (!snap.exists) return;
      const q = snap.data();
      const matches = q.matches || [];

      // Collect endpoints to fetch
      const endpoints = new Map();
      matches.forEach(m => {
        const sp = m.sport || (m.slug === 'nfl' ? 'football' : 'soccer');
        const sl = m.slug || 'mex.1';
        endpoints.set(`${sp}/${sl}`, { sport: sp, slug: sl });
      });

      if (endpoints.size === 0) {
        endpoints.set('soccer/mex.1', { sport: 'soccer', slug: 'mex.1' });
        endpoints.set('football/nfl', { sport: 'football', slug: 'nfl' });
      }

      const allEvents = {};
      for (const ep of endpoints.values()) {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${ep.sport}/${ep.slug}/scoreboard?limit=100`);
          const data = await res.json();
          (data.events || []).forEach(ev => { allEvents[ev.id] = ev; });
        } catch (e) {}
      }

      let hasChanges = false;
      const updatedMatches = matches.map(m => {
        const ev = allEvents[m.espnEventId];
        if (!ev) return m;

        const comps = ev.competitions?.[0]?.competitors || [];
        const homeC = comps.find(c => c.homeAway === 'home') || comps[1];
        const awayC = comps.find(c => c.homeAway === 'away') || comps[0];
        const completed = !!ev.status?.type?.completed;
        const state = ev.status?.type?.state || 'pre';
        const statusStr = ev.status?.type?.shortDetail || '';

        const newHomeScore = homeC && homeC.score !== undefined ? parseInt(homeC.score, 10) : m.homeScore;
        const newAwayScore = awayC && awayC.score !== undefined ? parseInt(awayC.score, 10) : m.awayScore;

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

      if (hasChanges) {
        await qRef.update({ matches: updatedMatches, lastSync: Date.now() });
      }
    } catch (e) {
      console.warn('[QPlayer] Auto-sync background error:', e);
    }
  }

  function renderPicksForm(q) {
    const formEl = document.getElementById('qMatchPicksForm');
    const titleEl = document.getElementById('qPicksTitle');
    if (!formEl) return;

    if (titleEl) titleEl.textContent = q.name;

    // Preserve currently typed values before re-rendering
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
      formEl.innerHTML = '<div class="text-center hint-text py-3">Esta quiniela no tiene partidos aún.</div>';
      return;
    }

    matches.forEach(m => {
      const existPick = picks[m.id] || { homeScore: '', awayScore: '' };
      const currentAwayVal = currentInputs[`away_${m.id}`] !== undefined ? currentInputs[`away_${m.id}`] : existPick.awayScore;
      const currentHomeVal = currentInputs[`home_${m.id}`] !== undefined ? currentInputs[`home_${m.id}`] : existPick.homeScore;

      const isLive = m.status === 'in';
      const isDone = m.completed;
      const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';

      // Determine cell color from existing pick vs real score
      let statusClass = '';
      let statusLabel = '';
      if (hasScore && currentHomeVal !== '' && currentAwayVal !== '') {
        const pickH = Number(currentHomeVal);
        const pickA = Number(currentAwayVal);
        const exact = pickH === m.homeScore && pickA === m.awayScore;
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const pickWin = pickH > pickA ? 'home' : pickA > pickH ? 'away' : 'draw';
        if (exact) { statusClass = 'q-match-green'; statusLabel = '🎯 ¡Marcador Exacto! (+3 pts)'; }
        else if (realWin === pickWin) { statusClass = 'q-match-yellow'; statusLabel = '✓ Ganador Correcto (+1 pt)'; }
        else { statusClass = 'q-match-red'; statusLabel = '✗ Marcador Incorrecto (0 pts)'; }
      }

      const card = document.createElement('div');
      card.className = `q-match-card ${statusClass}`;
      card.innerHTML = `
        <div class="q-match-header">
          <div>
            <span style="font-size:10px; color:var(--accent-color); font-weight:800; margin-right:6px;">${m.leagueLabel || ''}</span>
            <span style="font-size:11px; color:var(--text-muted);">${m.date || ''}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${isLive ? `<span class="badge danger" style="font-size:10px; animation: tvPulse 1s infinite;">🔴 EN VIVO ${m.statusStr ? '('+m.statusStr+')' : ''}</span>` : ''}
            ${isDone ? '<span class="badge" style="font-size:10px; background:rgba(255,255,255,0.1);">FINAL</span>' : ''}
            ${statusLabel ? `<span style="font-weight:800; font-size:11px;">${statusLabel}</span>` : ''}
          </div>
        </div>

        <div class="q-match-teams">
          <!-- Away Team -->
          <div class="q-match-team">
            <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" class="q-match-logo" alt="${m.away}"/>
            <span class="q-match-team-name">${m.away}</span>
            ${hasScore ? `<span class="q-live-score ${m.awayScore > m.homeScore ? 'winning' : ''}">${m.awayScore}</span>` : ''}
          </div>

          <!-- Score Inputs -->
          <div class="q-score-inputs">
            <input type="number" min="0" max="99" class="q-score-inp" id="pick_away_${m.id}"
              value="${currentAwayVal}" placeholder="0" ${isDone ? 'readonly' : ''} />
            <span class="q-score-dash">—</span>
            <input type="number" min="0" max="99" class="q-score-inp" id="pick_home_${m.id}"
              value="${currentHomeVal}" placeholder="0" ${isDone ? 'readonly' : ''} />
          </div>

          <!-- Home Team -->
          <div class="q-match-team q-match-team-home">
            ${hasScore ? `<span class="q-live-score ${m.homeScore > m.awayScore ? 'winning' : ''}">${m.homeScore}</span>` : ''}
            <span class="q-match-team-name">${m.home}</span>
            <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" class="q-match-logo" alt="${m.home}"/>
          </div>
        </div>
      `;
      formEl.appendChild(card);
    });
  }

  async function savePlayerPicks() {
    if (!db || !activeQuiniela) return;

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
    let incomplete = false;

    matches.forEach(m => {
      const awayInp = document.getElementById(`pick_away_${m.id}`);
      const homeInp = document.getElementById(`pick_home_${m.id}`);
      const awayVal = awayInp ? awayInp.value.trim() : '';
      const homeVal = homeInp ? homeInp.value.trim() : '';

      if (awayVal === '' || homeVal === '') { incomplete = true; return; }
      newPicks[m.id] = { awayScore: Number(awayVal), homeScore: Number(homeVal) };
    });

    if (incomplete) {
      alert('Por favor llena el marcador de todos los partidos antes de guardar.');
      return;
    }

    const btn = document.getElementById('btnSaveQPicks');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }

    try {
      picks = newPicks;
      await db.collection('quinielas').doc(activeQuiniela.id).collection('picks').doc(deviceId).set({
        playerName: name,
        deviceId,
        picks: newPicks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp
          ? firebase.firestore.FieldValue.serverTimestamp()
          : Date.now()
      });

      alert(`✅ ¡Pronósticos guardados para "${name}"! Buena suerte 🏆`);
      renderPicksForm(activeQuiniela);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Pronósticos'; }
    }
  }

  function renderLiveStandings(picksSnap, matches) {
    const el = document.getElementById('qLiveStandings');
    if (!el) return;

    const players = [];
    picksSnap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));

    // Calculate live points
    players.forEach(p => {
      let pts = 0;
      matches.forEach(m => {
        if (m.homeScore === null || m.awayScore === null || m.status === 'pre') return;
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

    el.innerHTML = '';
    if (players.length === 0) {
      el.innerHTML = '<div class="text-center hint-text py-3">Aún no hay pronósticos registrados.</div>';
      return;
    }

    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-x:auto; border-radius:12px;';
    const table = document.createElement('table');
    table.className = 'q-standings-table';

    const thead = table.createTHead();
    const hr = thead.insertRow();
    hr.innerHTML = `<th style="text-align:left; padding:8px 12px; min-width:110px;">Jugador</th>` +
      matches.map(m => `<th style="text-align:center; padding:6px; min-width:85px;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
          <div style="display:flex; align-items:center; gap:3px;">
            <img src="${m.awayLogo}" onerror="this.src='img/logo.jpg'" style="width:18px;height:18px;object-fit:contain;"/>
            <span style="font-size:9px;">vs</span>
            <img src="${m.homeLogo}" onerror="this.src='img/logo.jpg'" style="width:18px;height:18px;object-fit:contain;"/>
          </div>
          <span style="font-size:9px; color:var(--text-muted);">${m.awayAbbr || m.away.substring(0,3)} v ${m.homeAbbr || m.home.substring(0,3)}</span>
          ${m.homeScore !== null && m.status !== 'pre' ? `<span style="font-size:11px; font-weight:900; color:#ffd100;">${m.awayScore}-${m.homeScore} ${m.status === 'in' ? '🔴' : ''}</span>` : '<span style="font-size:9px; color:var(--text-muted);">—</span>'}
        </div>
      </th>`).join('') +
      `<th style="text-align:center; padding:8px;">Pts</th>`;

    const tbody = table.createTBody();
    players.forEach((p, idx) => {
      const isMe = p.id === deviceId;
      const tr = tbody.insertRow();
      if (isMe) tr.style.background = 'rgba(255,209,0,0.08)';
      const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;

      let cells = `<td style="padding:8px 12px; font-weight:${isMe ? '900' : '600'}; white-space:nowrap; color:${isMe ? 'var(--accent-color)' : 'var(--text-color)'};">
        ${rankEmoji} ${p.playerName || 'Anónimo'} ${isMe ? '⭐' : ''}
      </td>`;

      matches.forEach(m => {
        const pick = p.picks?.[m.id];
        if (!pick) { cells += `<td class="q-s-cell q-cell-gray">—</td>`; return; }
        const pickStr = `${pick.awayScore}-${pick.homeScore}`;
        if (m.homeScore === null || m.status === 'pre') { cells += `<td class="q-s-cell q-cell-gray">${pickStr}</td>`; return; }
        const exact = pick.homeScore === m.homeScore && pick.awayScore === m.awayScore;
        const realWin = m.homeScore > m.awayScore ? 'home' : m.awayScore > m.homeScore ? 'away' : 'draw';
        const pickWin = pick.homeScore > pick.awayScore ? 'home' : pick.awayScore > pick.homeScore ? 'away' : 'draw';
        if (exact) cells += `<td class="q-s-cell q-cell-green" title="Exacto (+3 pts)">🎯${pickStr}</td>`;
        else if (realWin === pickWin) cells += `<td class="q-s-cell q-cell-yellow" title="Ganador (+1 pt)">✓${pickStr}</td>`;
        else cells += `<td class="q-s-cell q-cell-red" title="Incorrecto (0 pts)">✗${pickStr}</td>`;
      });

      cells += `<td style="text-align:center; font-weight:900; font-size:16px; color:${p.totalPoints>0?'var(--accent-color)':'var(--text-muted)'};">${p.totalPoints}</td>`;
      tr.innerHTML = cells;
    });

    wrap.appendChild(table);
    el.appendChild(wrap);
  }

  initQPlayer();
})();
