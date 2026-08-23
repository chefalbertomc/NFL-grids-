// Quiniela & Pick'em Player Module — Wings & Wins v54 (Live Score Engine & Prominent En Vivo Badges)
(function () {
  'use strict';

  let db = null;
  let activeQuiniela = null;
  let picks = {};
  let playerName = '';
  let liveUnsubscribe = null;
  let standingsUnsubscribe = null;
  let autoSyncInterval = null;
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

    picks = {};
    try {
      const myPicksDoc = await db.collection('quinielas').doc(quinielaId).collection('picks').doc(deviceId).get();
      if (myPicksDoc.exists) {
        picks = myPicksDoc.data().picks || {};
        playerName = myPicksDoc.data().playerName || playerName;
        if (document.getElementById('qPlayerName')) document.getElementById('qPlayerName').value = playerName;
      }
    } catch (e) {}

    liveUnsubscribe = db.collection('quinielas').doc(quinielaId).onSnapshot(snap => {
      if (!snap.exists) return;
      activeQuiniela = { id: snap.id, ...snap.data() };
      renderPicksForm(activeQuiniela);
      if (latestPicksSnap) {
        renderLiveStandings(latestPicksSnap, activeQuiniela.matches || []);
      }
    }, err => console.error('[QPlayer] live error:', err));

    standingsUnsubscribe = db.collection('quinielas').doc(quinielaId).collection('picks').onSnapshot(snap => {
      latestPicksSnap = snap;
      if (!activeQuiniela) return;
      renderLiveStandings(snap, activeQuiniela.matches || []);
    }, err => console.error('[QPlayer] standings error:', err));

    // Instant sync & background loop every 12s
    syncESPNLiveScores(quinielaId);
    autoSyncInterval = setInterval(() => syncESPNLiveScores(quinielaId), 12000);
  }

  function norm(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function detectSport(m) {
    if (m.sport && m.sport !== 'mixed') return m.sport;
    const label = (m.leagueLabel || '').toLowerCase();
    if (label.includes('nfl') || label.includes('ncaa football') || label.includes('football')) return 'football';
    if (label.includes('mlb') || label.includes('beisbol') || label.includes('baseball')) return 'baseball';
    if (label.includes('nba') || label.includes('wnba') || label.includes('basquet')) return 'basketball';
    return 'soccer';
  }

  async function syncESPNLiveScores(quinielaId) {
    if (!db || !quinielaId) return;
    try {
      const qRef = db.collection('quinielas').doc(quinielaId);
      const snap = await qRef.get();
      if (!snap.exists) return;
      const q = snap.data();
      const matches = q.matches || [];

      // Build date window from -2 days to +21 days so all matches (past, live, upcoming) are found
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 2);
      const end = new Date();
      end.setDate(today.getDate() + 21);
      const fmt = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const dateParam = `dates=${fmt(start)}-${fmt(end)}&limit=100`;

      const endpoints = [
        { sport: 'soccer', slug: 'mex.1' },
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

        // Match by ESPN Event ID within the same sport
        let ev = null;
        if (m.espnEventId) {
          ev = candidateEvents.find(e => String(e.id) === String(m.espnEventId));
        }

        // Fallback match by team names strictly within the same sport
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
        renderPicksForm(activeQuiniela);
        if (latestPicksSnap) {
          renderLiveStandings(latestPicksSnap, updatedMatches);
        }
      }

      if (hasChanges) {
        try {
          await qRef.update({ matches: updatedMatches, lastSync: Date.now() });
        } catch (errWrite) {
          console.log('[QPlayer] Live sync in-memory active (Firestore guest write skipped):', errWrite);
        }
      }
    } catch (e) {
      console.warn('[QPlayer] Auto-sync background error:', e);
    }
  }

  window.stepScore = function(matchId, side, delta) {
    const inp = document.getElementById(`pick_${side}_${matchId}`);
    if (!inp) return;
    let val = parseInt(inp.value, 10);
    if (isNaN(val)) val = 0;
    val += delta;
    if (val < 0) val = 0;
    if (val > 99) val = 99;
    inp.value = val;

    if (activeQuiniela) {
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
    }
  };

  function renderPicksForm(q) {
    const formEl = document.getElementById('qMatchPicksForm');
    const titleEl = document.getElementById('qPicksTitle');
    if (!formEl) return;

    if (titleEl) titleEl.textContent = q.name;

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
      const existPick = picks[m.id] || { homeScore: 0, awayScore: 0 };
      const currentAwayVal = currentInputs[`away_${m.id}`] !== undefined ? currentInputs[`away_${m.id}`] : (existPick.awayScore !== '' && existPick.awayScore !== undefined ? existPick.awayScore : 0);
      const currentHomeVal = currentInputs[`home_${m.id}`] !== undefined ? currentInputs[`home_${m.id}`] : (existPick.homeScore !== '' && existPick.homeScore !== undefined ? existPick.homeScore : 0);

      const isLive = m.status === 'in';
      const isDone = m.completed || m.status === 'post';
      const hasScore = m.homeScore !== null && m.awayScore !== null && m.status !== 'pre';

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
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'away', -1)" ${isDone ? 'disabled' : ''} title="Restar">−</button>
              <input type="number" min="0" max="99" class="q-score-box" id="pick_away_${m.id}" value="${currentAwayVal}" readonly />
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'away', 1)" ${isDone ? 'disabled' : ''} title="Sumar">+</button>
            </div>

            <span class="q-vs-separator">:</span>

            <!-- Home Counter -->
            <div class="q-counter-box">
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'home', -1)" ${isDone ? 'disabled' : ''} title="Restar">−</button>
              <input type="number" min="0" max="99" class="q-score-box" id="pick_home_${m.id}" value="${currentHomeVal}" readonly />
              <button type="button" class="q-step-btn" onclick="stepScore('${m.id}', 'home', 1)" ${isDone ? 'disabled' : ''} title="Sumar">+</button>
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
      matches.map(m => {
        const isLive = m.status === 'in';
        const isDone = m.completed || m.status === 'post';
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
        if (exact) cells += `<td class="q-s-cell q-cell-green" title="Exacto (+3 pts)">🎯 ${pickStr}</td>`;
        else if (realWin === pickWin) cells += `<td class="q-s-cell q-cell-yellow" title="Ganador (+1 pt)">✓ ${pickStr}</td>`;
        else cells += `<td class="q-s-cell q-cell-red" title="Incorrecto (0 pts)">✗ ${pickStr}</td>`;
      });

      cells += `<td style="text-align:center; font-weight:900; font-size:16px; color:${p.totalPoints>0?'var(--accent-color)':'var(--text-muted)'};">${p.totalPoints}</td>`;
      tr.innerHTML = cells;
    });

    wrap.appendChild(table);
    el.appendChild(wrap);
  }

  initQPlayer();
})();
