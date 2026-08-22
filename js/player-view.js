// Player View Module for Wings & Wins
(function() {
  'use strict';

  // --- Custom Premium Alerts ---
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

  // Override standard alert
  window.alert = function(msg) {
    customAlert('Drink & Wins', msg);
  };

  // --- Parameters & DOM ---
  const params = new URLSearchParams(location.search);
  let code = (params.get('code') || '').trim().toUpperCase();
  const pid = (params.get('pid') || '').trim();

  const gameTitle = document.getElementById('gameTitle');
  const lockBadge = document.getElementById('lockBadge');
  const whoamiEl = document.getElementById('whoami');
  const quotaInfo = document.getElementById('quotaInfo');
  const nickChooser = document.getElementById('nickChooser');
  const gridBoard = document.getElementById('gridBoard');
  const gridMsg = document.getElementById('gridMsg');
  const verticalTeam = document.getElementById('verticalTeam');
  const horizontalTeam = document.getElementById('horizontalTeam');

  // --- State ---
  let db = null;
  let user = null;
  let game = null;
  let activePlayer = null; // { id, nickname, quota, taken, ref }
  let approvedPlayers = [];
  let pendingPlayers = [];

  // --- Utils ---
  const two = (n) => String(Number(n) || 0).padStart(2, '0');
  const norm = (s) => (s || '').trim().toLowerCase();

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
  }

  let unsubGame = null;
  async function startGameListener() {
    if (unsubGame) unsubGame();

    // Si la URL no trae código de juego, buscar automáticamente el juego más reciente en Firestore
    if (!code) {
      try {
        const snap = await db.collection('games').orderBy('createdAt', 'desc').limit(1).get();
        if (!snap.empty) {
          code = snap.docs[0].id;
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('code', code);
          window.history.replaceState(null, '', newUrl.toString());
        }
      } catch (err) {
        try {
          const snap = await db.collection('games').limit(1).get();
          if (!snap.empty) code = snap.docs[0].id;
        } catch (e) {}
      }
    }

    if (!code) {
      if (gridMsg) gridMsg.textContent = 'No hay juegos activos en este momento.';
      return;
    }

    unsubGame = db.collection('games').doc(code).onSnapshot((snap) => {
      if (!snap.exists) {
        if (gridMsg) gridMsg.textContent = 'El juego no existe en la base de datos.';
        return;
      }
      game = snap.data() || {};
      updateGameHeader(game);
      renderGrid(game);
      startPlayersListener();
    }, err => {
      console.error('[player-view] Game listen error:', err);
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

        const urlParams = new URLSearchParams(window.location.search);
        const urlNick = (urlParams.get('nick') || '').trim().toLowerCase();
        const savedNick = (localStorage.getItem('player_nick') || '').trim().toLowerCase();
        const savedPlayerId = localStorage.getItem('bww_player_id');
        const userUid = user ? user.uid : null;

        activePlayer = approvedPlayers.find(p => pid && (p.id === pid || p.playerId === pid)) ||
                       approvedPlayers.find(p => urlNick && p.nickname.toLowerCase() === urlNick) ||
                       approvedPlayers.find(p => savedNick && p.nickname.toLowerCase() === savedNick) ||
                       approvedPlayers.find(p => savedPlayerId && (p.id === savedPlayerId || p.playerId === savedPlayerId)) ||
                       approvedPlayers.find(p => userUid && (p.id === userUid || p.playerId === userUid)) ||
                       pendingPlayers.find(p => pid && (p.id === pid || p.playerId === pid)) ||
                       pendingPlayers.find(p => urlNick && p.nickname.toLowerCase() === urlNick) ||
                       pendingPlayers.find(p => savedNick && p.nickname.toLowerCase() === savedNick) ||
                       pendingPlayers.find(p => savedPlayerId && (p.id === savedPlayerId || p.playerId === savedPlayerId)) ||
                       null;

        if (activePlayer) {
          localStorage.setItem('bww_player_id', activePlayer.id);
          localStorage.setItem('player_nick', activePlayer.nickname);
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

    const homeInfo = window.getTeamInfo ? window.getTeamInfo(home) : { color: '#ffd100', logo: '' };
    const awayInfo = window.getTeamInfo ? window.getTeamInfo(away) : { color: '#ffd100', logo: '' };

    const gameCodeDisplay = document.getElementById('gameCodeDisplay');
    const gameStoreDisplay = document.getElementById('gameStoreDisplay');
    if (gameCodeDisplay) gameCodeDisplay.textContent = g.code || code;
    if (gameStoreDisplay) {
      if (g.store) {
        gameStoreDisplay.textContent = g.store;
        gameStoreDisplay.style.display = 'inline-block';
      } else {
        gameStoreDisplay.style.display = 'none';
      }
    }

    // Apply team colors to CSS variables on the grid wrapper
    const gridWrapper = document.querySelector('.grid-wrapper');
    if (gridWrapper) {
      gridWrapper.style.setProperty('--team-home-color', homeInfo.color);
      gridWrapper.style.setProperty('--team-home-secondary', homeInfo.secondaryColor || '#ffffff');
      gridWrapper.style.setProperty('--team-away-color', awayInfo.color);
      gridWrapper.style.setProperty('--team-away-secondary', awayInfo.secondaryColor || '#ffffff');
    }

    // Update axis labels with logos
    const awayLogoEl = document.getElementById('awayLogo');
    const awayNameEl = document.getElementById('awayTeamName');
    const homeLogoEl = document.getElementById('homeLogo');
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
    if (statusText) {
      if (activePlayer) {
        const remaining = Math.max(0, quota - taken);
        if (remaining > 0) {
          statusText.innerHTML = `<span class="badge" style="background:rgba(255,209,0,0.15); color:#ffd100; border:1px solid rgba(255,209,0,0.4); font-size:11px; padding:2px 8px; font-weight:800;">🏈 Te quedan ${remaining} casillas</span>`;
        } else {
          statusText.innerHTML = `<span class="badge" style="background:rgba(0,230,118,0.15); color:#00e676; border:1px solid rgba(0,230,118,0.4); font-size:11px; padding:2px 8px; font-weight:800;">✅ ¡Listo! ${quota} casillas</span>`;
        }
      } else if (pendingPlayers.length > 0) {
        statusText.innerHTML = `<span class="badge danger" style="font-size:11px; padding:2px 8px;">⏳ Pendiente</span>`;
      } else {
        statusText.innerHTML = `<span class="badge" style="font-size:11px; padding:2px 8px; color:var(--text-muted);">📌 Elige tu apodo</span>`;
      }
    }

    // Toggle dropdown if approved players exist
    if (nickChooser) {
      if (approvedPlayers.length > 0) {
        nickChooser.innerHTML = '';
        approvedPlayers.forEach(p => {
          const o = document.createElement('option');
          o.value = p.id;
          o.textContent = `${p.nickname} (${p.taken}/${p.quota} cuadros)`;
          nickChooser.appendChild(o);
        });
        if (activePlayer) {
          nickChooser.value = activePlayer.id;
        }
      } else if (pendingPlayers.length > 0) {
        nickChooser.innerHTML = `<option value="">${pendingPlayers[0].nickname} (Pendiente)</option>`;
      } else {
        nickChooser.innerHTML = '<option value="">Sin registros</option>';
      }
      
      // Update handler
      nickChooser.onchange = () => {
        const selectedId = nickChooser.value;
        if (selectedId) {
          activePlayer = approvedPlayers.find(p => p.id === selectedId) || null;
          if (activePlayer) {
            localStorage.setItem('bww_player_id', activePlayer.id);
            localStorage.setItem('player_nick', activePlayer.nickname);
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('pid', activePlayer.id);
            newUrl.searchParams.set('nick', activePlayer.nickname);
            window.history.replaceState(null, '', newUrl.toString());
          }
        } else {
          activePlayer = null;
        }

        updatePlayerUI();
        if (game) renderGrid(game);
      };
    }
  }

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

  function renderGrid(g) {
    if (!gridBoard) return;
    gridBoard.innerHTML = '';

    const reveal = !!g.showNumbers;
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
          cell.textContent = info.name || '—';
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

    // Help Text
    if (gridMsg) {
      if (g.locked) {
        gridMsg.textContent = '🔒 El juego está bloqueado por el administrador.';
        gridMsg.style.color = 'var(--danger-color)';
      } else if (!activePlayer) {
        if (pendingPlayers.length > 0) {
          gridMsg.textContent = '⏳ Registro enviado. Espera aprobación del mesero.';
          gridMsg.style.color = 'var(--accent-color)';
        } else {
          gridMsg.textContent = '📌 Para jugar, selecciona este Grid en la pantalla principal e inscríbete.';
          gridMsg.style.color = 'var(--text-muted)';
        }
      } else {
        gridMsg.textContent = '⚡ Toca una casilla vacía para marcarla, o toca tu casilla para desmarcarla.';
        gridMsg.style.color = 'var(--success-color)';
      }
    }

    // Quota details
    const myUsed = countMyUsed(cells);
    const myQuota = activePlayer ? Number(activePlayer.quota || 0) : 0;
    if (quotaInfo) {
      quotaInfo.textContent = `${myUsed}/${myQuota} usados`;
    }
  }

  async function onCellClick(key, info, g) {
    if (g.locked) return;
    if (!activePlayer) {
      alert('Tu apodo aún está pendiente de aprobación por el administrador en el panel Admin.');
      return;
    }

    const myPicks = Array.isArray(activePlayer.picks) ? activePlayer.picks : [];
    const isPickedByMe = myPicks.includes(key);

    if (!isPickedByMe && info && info.playerDocId && info.playerDocId !== activePlayer.id) {
      alert('Esta casilla ya está ocupada por otro jugador.');
      return;
    }

    const quota = Number(activePlayer.quota || 0);

    try {
      if (window.ensurePlayerAuth) {
        await window.ensurePlayerAuth();
      }

      const playerDocRef = db.collection('games').doc(code).collection('players').doc(activePlayer.id);

      if (isPickedByMe) {
        await playerDocRef.update({
          picks: firebase.firestore.FieldValue.arrayRemove(key),
          taken: Math.max(0, myPicks.length - 1),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
        });
      } else {
        if (myPicks.length >= quota) {
          alert('¡Límite alcanzado! No tienes más cuadros disponibles en tu paquete para este registro.');
          return;
        }
        await playerDocRef.update({
          picks: firebase.firestore.FieldValue.arrayUnion(key),
          taken: myPicks.length + 1,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
        });
      }
    } catch (err) {
      console.error('[player-view] Error updating pick:', err);
      alert('Error al marcar casilla: ' + err.message);
    }
  }

  // Run initialization
  init();
})();
