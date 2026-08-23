// Player Grid View Module — Drinks & Wins (v72.0)
(function() {
  'use strict';

  let db = null;
  let code = null;
  let pid = null;
  let game = null;
  let activePlayer = null;
  let user = null;
  let approvedPlayers = [];
  let pendingPlayers = [];
  let currentDisplayMode = 'photos'; // 'photos' or 'names'

  const gameTitle = document.getElementById('gameTitle');
  const gameCodeDisplay = document.getElementById('gameCodeDisplay');
  const gameStoreDisplay = document.getElementById('gameStoreDisplay');
  const lockBadge = document.getElementById('lockBadge');
  const gridBoard = document.getElementById('gridBoard');
  const quotaInfo = document.getElementById('quotaInfo');
  const gridMsg = document.getElementById('gridMsg');

  const two = (n) => String(Number(n) || 0).padStart(2, '0');
  const norm = (s) => (s || '').trim().toLowerCase();

  const AVATAR_PRESETS = [
    { name: '🏈 Balón', url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=150&auto=format&fit=crop&q=80' },
    { name: '🏆 Trofeo', url: 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=150&auto=format&fit=crop&q=80' },
    { name: '🍺 Cerveza', url: 'https://images.unsplash.com/photo-1608270199182-3d75fb513a96?w=150&auto=format&fit=crop&q=80' },
    { name: '🍗 Alitas', url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=150&auto=format&fit=crop&q=80' },
    { name: '🛡️ Casco', url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=150&auto=format&fit=crop&q=80' },
    { name: '🔥 Fuego', url: 'https://images.unsplash.com/photo-1520110120835-c965c4731b84?w=150&auto=format&fit=crop&q=80' },
    { name: '👑 Corona', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80' },
    { name: '🍻 Drinks', url: 'img/logo.jpg' }
  ];

  function cellOwnerIsMe(info) {
    if (!info) return false;
    if (activePlayer && info.playerDocId && info.playerDocId === activePlayer.id) {
      return true;
    }
    const mineById = user && info.playerId && info.playerId === user.uid && (!info.playerDocId || (activePlayer && info.playerDocId === activePlayer.id));
    const mineByName = activePlayer && norm(info.name) === norm(activePlayer.nickname);
    return !!(mineById || mineByName);
  }

  function countMyUsed(cells) {
    let used = 0;
    if (!cells) return 0;
    for (const k in cells) {
      if (cellOwnerIsMe(cells[k])) used++;
    }
    return used;
  }

  // --- Initialization ---
  function init() {
    if (window.db) {
      db = window.db;
      startListeners();
    } else {
      setTimeout(init, 100);
    }
  }

  function startListeners() {
    const btnSharePlayerWhatsApp = document.getElementById('btnSharePlayerWhatsApp');
    if (btnSharePlayerWhatsApp) {
      btnSharePlayerWhatsApp.addEventListener('click', () => {
        const g = game || {};
        const home = g.homeTeam || g.home || 'Local';
        const away = g.awayTeam || g.away || 'Visitante';
        const host = window.location.origin + window.location.pathname.replace('player-view.html', '').replace('admin.html', '');
        const joinUrl = `${host}?join=${encodeURIComponent(code || '')}`;
        const text = `🏈 *¡Únete a nuestro Grid de Drinks & Wins!*\n\n🏆 *Partido:* ${away} @ ${home}\n🔑 *Código:* ${code}\n\n👉 *Toca aquí para registrarte y escoger tus casillas:*\n${joinUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      });
    }

    firebase.auth().onAuthStateChanged((u) => {
      user = u || null;
      startGameListener();
    });

    // Auto-open floating tutorial reel on first visit
    if (!localStorage.getItem('has_seen_grid_tutorial')) {
      setTimeout(() => {
        if (window.openHowToPlayModal) window.openHowToPlayModal();
      }, 700);
    }
  }

  let unsubGame = null;
  let playerEspnInterval = null;

  async function syncPlayerGridESPN() {
    if (!game || !code) return;
    const home = norm(game.homeTeam || game.home || '');
    const away = norm(game.awayTeam || game.away || '');
    if (!home || !away) return;

    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100');
      const data = await res.json();
      const events = data.events || [];

      let matchedEvent = null;
      if (game.espnEventId) {
        matchedEvent = events.find(e => String(e.id) === String(game.espnEventId));
      }
      if (!matchedEvent) {
        matchedEvent = events.find(e => {
          const comps = e.competitions?.[0]?.competitors || [];
          const eNames = comps.map(c => norm(c.team?.displayName || c.team?.name || ''));
          const eShorts = comps.map(c => norm(c.team?.shortDisplayName || ''));
          const eAbbrs = comps.map(c => norm(c.team?.abbreviation || ''));
          const allN = [...eNames, ...eShorts, ...eAbbrs];

          const matchHome = allN.some(n => n && (home.includes(n) || n.includes(home)));
          const matchAway = allN.some(n => n && (away.includes(n) || n.includes(away)));
          return matchHome && matchAway;
        });
      }

      if (!matchedEvent) return;

      const comp = matchedEvent.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const homeComp = competitors.find(c => c.homeAway === 'home') || competitors[1] || {};
      const awayComp = competitors.find(c => c.homeAway === 'away') || competitors[0] || {};

      const sHome = parseInt(homeComp.score || 0, 10);
      const sAway = parseInt(awayComp.score || 0, 10);

      const status = matchedEvent.status || {};
      const statusType = status.type || {};
      const statusText = statusType.shortDetail || statusType.detail || 'Q1';
      const periodName = statusType.description || statusText;
      const displayClock = status.displayClock || '15:00';
      const periodNum = status.period || 1;
      const isCompleted = !!statusType.completed;

      // Down & distance situation
      const situation = comp.situation || {};
      const downDist = situation.downDistanceText || '';
      const isRedZone = !!situation.isRedZone;

      // Quarter-by-quarter line scores
      const homeLs = (homeComp.linescores || []).map(l => parseInt(l.value || 0, 10));
      const awayLs = (awayComp.linescores || []).map(l => parseInt(l.value || 0, 10));

      const topNums = Array.isArray(game.numsTop) ? game.numsTop : [];
      const leftNums = Array.isArray(game.numsLeft) ? game.numsLeft : [];
      const cells = buildMergedCells(game.cells || {}, approvedPlayers);

      function getWinnerForScore(aScore, hScore) {
        if (!topNums.length || !leftNums.length) return { winner: '—', scoreStr: `${aScore}-${hScore}` };
        const winCol = topNums.indexOf(Number(hScore) % 10);
        const winRow = leftNums.indexOf(Number(aScore) % 10);
        if (winCol === -1 || winRow === -1) return { winner: '—', scoreStr: `${aScore}-${hScore}` };
        const cell = cells[`${winRow}-${winCol}`];
        return {
          winner: (cell && cell.name) ? cell.name : 'Nadie',
          scoreStr: `${aScore}-${hScore}`,
          row: winRow,
          col: winCol
        };
      }

      // Q1 Winner
      if (periodNum >= 2 || isCompleted || (periodNum === 1 && awayLs.length > 0)) {
        const a1 = awayLs[0] ?? 0;
        const h1 = homeLs[0] ?? 0;
        const w1 = getWinnerForScore(a1, h1);
        game.q1_score = w1.scoreStr;
        game.q1_winner = w1.winner;
      }

      // Q2 / Halftime Winner
      if (periodNum >= 3 || isCompleted || (periodNum === 2 && awayLs.length > 1)) {
        const a2 = (awayLs[0] ?? 0) + (awayLs[1] ?? 0);
        const h2 = (homeLs[0] ?? 0) + (homeLs[1] ?? 0);
        const w2 = getWinnerForScore(a2, h2);
        game.q2_score = w2.scoreStr;
        game.q2_winner = w2.winner;
      }

      // Q3 Winner
      if (periodNum >= 4 || isCompleted || (periodNum === 3 && awayLs.length > 2)) {
        const a3 = (awayLs[0] ?? 0) + (awayLs[1] ?? 0) + (awayLs[2] ?? 0);
        const h3 = (homeLs[0] ?? 0) + (homeLs[1] ?? 0) + (homeLs[2] ?? 0);
        const w3 = getWinnerForScore(a3, h3);
        game.q3_score = w3.scoreStr;
        game.q3_winner = w3.winner;
      }

      // Q4 / Final Winner
      if (isCompleted || periodNum >= 4) {
        const w4 = getWinnerForScore(sAway, sHome);
        game.q4_score = w4.scoreStr;
        game.q4_winner = w4.winner;
        game.winRow = w4.row;
        game.winCol = w4.col;
      } else {
        const curWin = getWinnerForScore(sAway, sHome);
        game.winRow = curWin.row;
        game.winCol = curWin.col;
      }

      // Update in-memory game object
      game.scoreHome = sHome;
      game.scoreAway = sAway;
      game.quarter = statusText;
      game.clock = displayClock;
      game.periodName = periodName;
      game.situation = downDist;
      game.isRedZone = isRedZone;
      game.lastEspnSync = Date.now();

      updateGameHeader(game);
      renderGrid(game);

      try {
        await db.collection('games').doc(code).update({
          scoreHome: sHome,
          scoreAway: sAway,
          quarter: statusText,
          clock: displayClock,
          periodName: periodName,
          situation: downDist,
          isRedZone: isRedZone,
          q1_score: game.q1_score || null,
          q1_winner: game.q1_winner || null,
          q2_score: game.q2_score || null,
          q2_winner: game.q2_winner || null,
          q3_score: game.q3_score || null,
          q3_winner: game.q3_winner || null,
          q4_score: game.q4_score || null,
          q4_winner: game.q4_winner || null,
          winRow: typeof game.winRow === 'number' ? game.winRow : null,
          winCol: typeof game.winCol === 'number' ? game.winCol : null,
          lastEspnSync: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
        });
      } catch (err) {}
    } catch (e) {
      console.warn('[player-view] ESPN auto-sync note:', e);
    }
  }

  function startGameListener() {
    const params = new URLSearchParams(window.location.search);
    code = (params.get('code') || params.get('game') || '').toUpperCase();
    pid = params.get('pid') || localStorage.getItem('bww_player_id');

    if (!code) {
      if (gridMsg) {
        gridMsg.textContent = '❌ No se especificó el código del juego en el enlace.';
        gridMsg.style.display = 'block';
      }
      return;
    }

    if (unsubGame) unsubGame();

    unsubGame = db.collection('games').doc(code).onSnapshot((doc) => {
      if (!doc.exists) {
        if (gridMsg) {
          gridMsg.textContent = `❌ El juego con código "${code}" no existe.`;
          gridMsg.style.display = 'block';
        }
        return;
      }
      game = { id: doc.id, ...doc.data() };
      
      updateGameHeader(game);
      startPlayersListener();
      renderGrid(game);

      if (!playerEspnInterval) {
        syncPlayerGridESPN();
        playerEspnInterval = setInterval(syncPlayerGridESPN, 15000);
      }
    }, (err) => {
      console.error('[player-view] Game listener error:', err);
    });
  }

  let unsubPlayers = null;
  function startPlayersListener() {
    if (!code) return;
    if (unsubPlayers) unsubPlayers();
    unsubPlayers = db.collection('games').doc(code).collection('players')
      .onSnapshot((qs) => {
        approvedPlayers = [];
        pendingPlayers = [];

        qs.forEach(doc => {
          const d = doc.data() || {};
          const isApproved = (d.status === 'approved') || !!d.approved;
          const item = {
            id: doc.id,
            playerId: d.playerId || doc.id,
            nickname: d.nickname || d.name || '',
            userName: d.userName || d.name || '',
            userPhoto: d.userPhoto || d.photoURL || '',
            waiter: d.waiter || '',
            quota: Number(d.quota || d.pack || 0),
            taken: Number(d.taken || 0),
            picks: Array.isArray(d.picks) ? d.picks : [],
            ref: doc.ref
          };

          if (isApproved) {
            approvedPlayers.push(item);
          } else {
            pendingPlayers.push(item);
          }
        });

        const userUid = user ? user.uid : null;
        const userEmail = user && user.email ? user.email.toLowerCase() : null;

        // STRICT MATCH: Only bind to the authenticated player's account
        activePlayer = approvedPlayers.find(p => (userUid && (p.id === userUid || p.playerId === userUid))) ||
                       approvedPlayers.find(p => (userEmail && p.userEmail && p.userEmail.toLowerCase() === userEmail)) ||
                       pendingPlayers.find(p => (userUid && (p.id === userUid || p.playerId === userUid))) ||
                       null;

        if (activePlayer) {
          localStorage.setItem('bww_player_id', activePlayer.id);
          localStorage.setItem('player_nick', activePlayer.nickname);

          // Auto-sync Google photo to Firestore if user has one and activePlayer was empty
          if (user && user.photoURL && !activePlayer.userPhoto) {
            db.collection('games').doc(code).collection('players').doc(activePlayer.id).update({
              userPhoto: user.photoURL
            }).catch(() => {});
          }
        }

        updatePlayerUI();
        if (game) renderGrid(game);
      }, err => {
        console.error('[player-view] Players listen error:', err);
      });
  }

  function updateGameHeader(g) {
    const home = g.homeTeam || g.home || 'Local';
    const away = g.awayTeam || g.away || 'Visitante';
    const codeStr = g.code || code || '';
    const storeStr = g.store || g.tienda || '';

    if (gameCodeDisplay) gameCodeDisplay.textContent = codeStr;
    if (gameStoreDisplay) {
      if (storeStr) {
        gameStoreDisplay.textContent = storeStr;
        gameStoreDisplay.style.display = 'inline-flex';
      } else {
        gameStoreDisplay.style.display = 'none';
      }
    }

    const homeInfo = window.getTeamInfo ? window.getTeamInfo(home) : { color: '#ffd100', logo: 'img/logo.jpg' };
    const awayInfo = window.getTeamInfo ? window.getTeamInfo(away) : { color: '#ff5722', logo: 'img/logo.jpg' };

    const verticalTeam = document.getElementById('verticalTeam');
    const horizontalTeam = document.getElementById('horizontalTeam');

    if (verticalTeam) {
      verticalTeam.style.setProperty('--team-away-color', awayInfo.color);
      verticalTeam.style.setProperty('--team-away-secondary', awayInfo.secondaryColor || '#ffffff');
    }
    if (horizontalTeam) {
      horizontalTeam.style.setProperty('--team-home-color', homeInfo.color);
      horizontalTeam.style.setProperty('--team-home-secondary', homeInfo.secondaryColor || '#ffffff');
    }

    const awayLogoEl = document.getElementById('awayLogo');
    const homeLogoEl = document.getElementById('homeLogo');
    const awayNameEl = document.getElementById('awayTeamName');
    const homeNameEl = document.getElementById('homeTeamName');

    if (awayLogoEl && awayInfo.logo) {
      awayLogoEl.src = awayInfo.logo;
      awayLogoEl.alt = away;
      awayLogoEl.style.display = 'block';
    }
    if (awayNameEl) awayNameEl.textContent = away;

    if (homeLogoEl && homeInfo.logo) {
      homeLogoEl.src = homeInfo.logo;
      homeLogoEl.alt = home;
      homeLogoEl.style.display = 'block';
    }
    if (homeNameEl) homeNameEl.textContent = home;

    if (lockBadge) {
      if (g.locked) {
        lockBadge.textContent = '🔒 BLOQUEADO';
        lockBadge.className = 'badge danger';
        lockBadge.style.display = 'inline-flex';
      } else {
        lockBadge.style.display = 'none';
      }
    }

    // --- TV Broadcast Scorebug Banner ---
    const tvScorebug = document.getElementById('playerTvScorebug');
    if (tvScorebug) {
      tvScorebug.style.display = 'flex';

      const awayWing = document.getElementById('playerTvAwayWing');
      const awayLogo = document.getElementById('playerTvAwayLogo');
      const awayAbbr = document.getElementById('playerTvAwayAbbr');
      const awayScore = document.getElementById('playerTvAwayScore');

      const homeWing = document.getElementById('playerTvHomeWing');
      const homeLogo = document.getElementById('playerTvHomeLogo');
      const homeAbbr = document.getElementById('playerTvHomeAbbr');
      const homeScore = document.getElementById('playerTvHomeScore');

      const tvQuarter = document.getElementById('playerTvQuarter');
      const tvClock = document.getElementById('playerTvClock');
      const tvSituation = document.getElementById('playerTvSituation');

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

    // --- Winner Cards ---
    const quarters = [
      { key: 'q1', nameId: 'q1-winner-name', scoreId: 'q1-winner-score', cardId: 'q1-card', label: '1er Cuarto' },
      { key: 'q2', nameId: 'q2-winner-name', scoreId: 'q2-winner-score', cardId: 'q2-card', label: 'Medio Tiempo' },
      { key: 'q3', nameId: 'q3-winner-name', scoreId: 'q3-winner-score', cardId: 'q3-card', label: '3er Cuarto' },
      { key: 'q4', nameId: 'q4-winner-name', scoreId: 'q4-winner-score', cardId: 'q4-card', label: 'Final' },
    ];
    quarters.forEach(({ key, nameId, scoreId, cardId }) => {
      const winner = g[`${key}_winner`];
      const score  = g[`${key}_score`];
      const nameEl  = document.getElementById(nameId);
      const scoreEl = document.getElementById(scoreId);
      const card    = document.getElementById(cardId);

      if (nameEl) {
        if (winner && winner !== 'Nadie' && winner !== '—') {
          nameEl.innerHTML = `<span style="color:#ffd100; font-size:17px; font-weight:900;">🏆 ${winner}</span>`;
        } else if (winner === 'Nadie') {
          nameEl.innerHTML = `<span style="color:var(--text-muted); font-size:13px; font-weight:700;">Casilla Libre</span>`;
        } else {
          nameEl.textContent = '—';
        }
      }
      if (scoreEl) scoreEl.textContent = score ? `Marcador: ${score}` : '';

      if (card) {
        const hasWinner = winner && winner !== 'Nadie' && winner !== '—';
        card.style.borderColor = hasWinner ? '#ffd100' : 'var(--border-color)';
        card.style.background = hasWinner
          ? 'rgba(255,209,0,0.12)'
          : 'rgba(255,255,255,0.02)';
      }
    });
  }

  function updatePlayerUI() {
    const quota = activePlayer ? Number(activePlayer.quota || 0) : 0;
    const taken = activePlayer ? Number(activePlayer.taken || 0) : 0;

    if (quotaInfo) {
      quotaInfo.textContent = `${taken}/${quota} usados`;
    }

    const statusText = document.getElementById('selection-status-text');
    const playerNickDisplay = document.getElementById('playerNicknameDisplay');

    if (playerNickDisplay) {
      if (activePlayer) {
        playerNickDisplay.textContent = `👤 ${activePlayer.nickname}`;
      } else if (user && user.displayName) {
        playerNickDisplay.textContent = `👤 ${user.displayName.toUpperCase()}`;
      } else {
        playerNickDisplay.textContent = '👤 No Registrado';
      }
    }

    if (statusText) {
      if (activePlayer) {
        const remaining = Math.max(0, quota - taken);
        if (remaining > 0) {
          statusText.innerHTML = `<span class="badge" style="background:rgba(255,209,0,0.18); color:#ffd100; border:1px solid rgba(255,209,0,0.4); font-size:10px; padding:2px 6px; font-weight:800;">🏈 ${taken}/${quota} CASILLAS (${remaining} LIBRES)</span>`;
        } else {
          statusText.innerHTML = `<span class="badge" style="background:rgba(0,230,118,0.18); color:#00e676; border:1px solid rgba(0,230,118,0.4); font-size:10px; padding:2px 6px; font-weight:800;">✅ ¡LISTO! ${quota} CASILLAS</span>`;
        }
      } else if (pendingPlayers.length > 0) {
        statusText.innerHTML = `<span class="badge" style="background:rgba(255,193,7,0.18); color:#ffc107; border:1px solid #ffc107; font-size:10px; padding:2px 6px; font-weight:800;">⏳ PENDIENTE</span>`;
      } else {
        statusText.innerHTML = `<span class="badge" style="font-size:10px; padding:2px 6px; color:var(--text-muted);">📌 Sin Registro</span>`;
      }
    }
  }

  function buildMergedCells(gameCells, approvedList) {
    const merged = { ...(gameCells || {}) };
    if (Array.isArray(approvedList)) {
      approvedList.forEach(p => {
        const pPicks = Array.isArray(p.picks) ? p.picks : [];
        pPicks.forEach(cellKey => {
          merged[cellKey] = {
            name: p.nickname || p.name || 'Jugador',
            userName: p.userName || '',
            userPhoto: p.userPhoto || '',
            waiter: p.waiter || '',
            playerId: p.playerId || p.id,
            playerDocId: p.id,
            timestamp: p.updatedAt || p.createdAt || Date.now()
          };
        });
      });
    }
    return merged;
  }

  function renderGrid(g) {
    if (!gridBoard) return;
    gridBoard.innerHTML = '';

    const reveal = !!(g.showNumbers || g.locked);
    const topNums = Array.isArray(g.numsTop) ? g.numsTop : [];
    const leftNums = Array.isArray(g.numsLeft) ? g.numsLeft : [];
    const cells = buildMergedCells(g.cells || {}, approvedPlayers);

    // Header top-left cell
    const corner = document.createElement('div');
    corner.className = 'grid-header-cell';
    corner.textContent = 'A \\ L';
    gridBoard.appendChild(corner);

    // Columns header (Top numbers)
    for (let c = 0; c < 10; c++) {
      const h = document.createElement('div');
      h.className = 'grid-header-cell';
      h.textContent = reveal ? (topNums[c] ?? '•') : '?';
      gridBoard.appendChild(h);
    }

    // Rows and cells
    for (let r = 0; r < 10; r++) {
      // Row header (Left numbers)
      const l = document.createElement('div');
      l.className = 'grid-side-cell';
      l.textContent = reveal ? (leftNums[r] ?? '•') : '?';
      gridBoard.appendChild(l);

      // Grid Cells
      for (let c = 0; c < 10; c++) {
        const key = `${r}-${c}`;
        const info = cells[key];
        const cell = document.createElement('div');
        cell.className = 'grid-cell';

        if (info) {
          let photoSrc = info.userPhoto || info.photoURL || '';
          if (!photoSrc && cellOwnerIsMe(info) && user && user.photoURL) {
            photoSrc = user.photoURL;
          }
          if (!photoSrc) {
            const cleanNick = (info.name || 'J').trim();
            photoSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanNick)}&background=ffd100&color=000000&bold=true&length=2`;
          }

          if (currentDisplayMode === 'photos') {
            cell.innerHTML = `<img class="cell-avatar-img" src="${photoSrc}" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(info.name || 'J')}&background=ffd100&color=000&bold=true'" alt="${info.name}"/>`;
          } else {
            cell.textContent = info.name || '—';
          }

          if (cellOwnerIsMe(info)) {
            cell.classList.add('own');
          } else {
            cell.classList.add('taken');
          }
        }

        // Highlight Winner cell if applicable
        const isWinner = (g.locked || g.showNumbers) &&
          typeof g.winRow === 'number' && typeof g.winCol === 'number' &&
          g.winRow === r && g.winCol === c;
          
        if (isWinner) {
          cell.classList.add('winner');
        }

        // Add Click Handler
        cell.addEventListener('click', () => onCellClick(key, info, g));
        gridBoard.appendChild(cell);
      }
    }

    // Quota details
    const myUsed = countMyUsed(cells);
    const myQuota = activePlayer ? Number(activePlayer.quota || 0) : 0;
    if (quotaInfo) {
      quotaInfo.textContent = `${myUsed}/${myQuota} usados`;
    }
  }

  window.toggleGridDisplayMode = function() {
    currentDisplayMode = currentDisplayMode === 'photos' ? 'names' : 'photos';
    const btn = document.getElementById('btnToggleViewMode');
    if (btn) {
      btn.textContent = currentDisplayMode === 'photos' ? '🖼️ Fotos' : '👤 Nombres';
    }
    if (game) renderGrid(game);
  };

  function showCellPopover(info, key, g, isOwn) {
    let popover = document.getElementById('cellDetailPopover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'cellDetailPopover';
      popover.className = 'cell-popover-overlay';
      document.body.appendChild(popover);
    }

    const parts = key.split('-');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const awayNum = (g.numsLeft && g.numsLeft[r] !== undefined && (g.showNumbers || g.locked)) ? g.numsLeft[r] : '?';
    const homeNum = (g.numsTop && g.numsTop[c] !== undefined && (g.showNumbers || g.locked)) ? g.numsTop[c] : '?';

    let photo = info.userPhoto || '';
    if (!photo && isOwn && user && user.photoURL) photo = user.photoURL;
    if (!photo) photo = 'img/logo.jpg';

    const nick = info.name || 'Jugador';
    const fullName = info.userName && info.userName !== nick ? ` (${info.userName})` : '';

    popover.innerHTML = `
      <img src="${photo}" onerror="this.onerror=null;this.src='img/logo.jpg'" class="cell-popover-avatar" alt="${nick}" />
      <div class="cell-popover-info">
        <div class="cell-popover-name">${isOwn ? '⭐ Tu Casilla: ' : '👤 '}${nick}${fullName}</div>
        <div class="cell-popover-sub">
          🏈 Marcador: <strong>${g.away || 'Vis'}: ${awayNum}</strong> @ <strong>${g.home || 'Loc'}: ${homeNum}</strong>
          ${info.waiter ? `<br>🍽️ Mesero: ${info.waiter}` : ''}
        </div>
      </div>
      <div class="cell-popover-actions">
        ${isOwn && !g.locked ? `<button type="button" class="btn btn-danger" onclick="window.unpickMyCell('${key}')" style="padding:6px 10px; font-size:11px; width:auto; border-radius:8px;">🗑️ Quitar</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="window.closeCellPopover()" style="padding:6px 10px; font-size:11px; width:auto; border-radius:8px;">✕</button>
      </div>
    `;
    popover.style.display = 'flex';

    clearTimeout(window._cellPopoverTimer);
    window._cellPopoverTimer = setTimeout(() => {
      window.closeCellPopover();
    }, 6000);
  }

  window.closeCellPopover = function() {
    const popover = document.getElementById('cellDetailPopover');
    if (popover) popover.style.display = 'none';
  };

  window.unpickMyCell = async function(key) {
    window.closeCellPopover();
    if (!activePlayer) return;
    try {
      const playerDocRef = db.collection('games').doc(code).collection('players').doc(activePlayer.id);
      const myPicks = Array.isArray(activePlayer.picks) ? activePlayer.picks : [];
      await playerDocRef.update({
        picks: firebase.firestore.FieldValue.arrayRemove(key),
        taken: Math.max(0, myPicks.length - 1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      });
    } catch (err) {
      alert('Error al desmarcar: ' + err.message);
    }
  };

  async function onCellClick(key, info, g) {
    if (g.locked) {
      if (info) showCellPopover(info, key, g, cellOwnerIsMe(info));
      return;
    }

    if (!activePlayer) {
      if (info) {
        showCellPopover(info, key, g, false);
      } else {
        alert('Tu apodo aún está pendiente de aprobación por el administrador o mesero.');
      }
      return;
    }

    const myPicks = Array.isArray(activePlayer.picks) ? activePlayer.picks : [];
    const isPickedByMe = myPicks.includes(key);

    if (info && !isPickedByMe) {
      // Cell is occupied by another player -> Show detail popover with photo & name
      showCellPopover(info, key, g, false);
      return;
    }

    if (isPickedByMe) {
      // Show detail popover with quick unpick option
      showCellPopover(info || { name: activePlayer.nickname, userPhoto: activePlayer.userPhoto || user?.photoURL }, key, g, true);
      return;
    }

    // Cell is empty -> Pick it directly
    const quota = Number(activePlayer.quota || 0);

    if (myPicks.length >= quota) {
      alert(`¡Límite alcanzado! Ya marcaste tus ${quota} casillas permitidas. Si deseas cambiar una, toca tu casilla para desmarcarla.`);
      return;
    }

    try {
      const playerDocRef = db.collection('games').doc(code).collection('players').doc(activePlayer.id);
      await playerDocRef.update({
        picks: firebase.firestore.FieldValue.arrayUnion(key),
        taken: myPicks.length + 1,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      });
    } catch (err) {
      console.error('[player-view] Error updating pick:', err);
      alert('Error al marcar casilla: ' + err.message);
    }
  }

  window.dismissRotateTip = function() {
    const tip = document.getElementById('rotatePhoneTip');
    if (tip) tip.style.display = 'none';
    sessionStorage.setItem('dismissed_rotate_tip', 'true');
  };

  function checkOrientationTip() {
    const tip = document.getElementById('rotatePhoneTip');
    if (!tip) return;
    if (sessionStorage.getItem('dismissed_rotate_tip') === 'true') {
      tip.style.display = 'none';
      return;
    }
    const isPortraitMobile = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    tip.style.display = isPortraitMobile ? 'flex' : 'none';
  }

  window.addEventListener('resize', checkOrientationTip);
  window.addEventListener('orientationchange', checkOrientationTip);

  // Run initialization
  init();
  checkOrientationTip();
})();
