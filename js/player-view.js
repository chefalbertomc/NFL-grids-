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
    customAlert('Wings & Wins', msg);
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

        const savedPlayerId = localStorage.getItem('bww_player_id');
        const userUid = user ? user.uid : null;

        activePlayer = approvedPlayers.find(p => pid && (p.id === pid || p.playerId === pid)) ||
                       approvedPlayers.find(p => savedPlayerId && (p.id === savedPlayerId || p.playerId === savedPlayerId)) ||
                       approvedPlayers.find(p => userUid && (p.id === userUid || p.playerId === userUid)) ||
                       pendingPlayers.find(p => pid && (p.id === pid || p.playerId === pid)) ||
                       pendingPlayers.find(p => savedPlayerId && (p.id === savedPlayerId || p.playerId === savedPlayerId)) ||
                       null;

        updatePlayerUI();
        if (game) renderGrid(game);
      }, err => {
        console.error('[player-view] Players listen error:', err);
      });
  }

  function updateGameHeader(g) {
    if (!gameTitle) return;
    const home = g.homeTeam || g.home || 'Local';
    const away = g.awayTeam || g.away || 'Visitante';
    const sh = two(g.scoreHome || 0);
    const sa = two(g.scoreAway || 0);
    const q = g.quarter || 'Q1';

    gameTitle.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <img src="${window.getTeamLogoURL(away)}" style="width: 32px; height: 32px; object-fit: contain;" alt="${away}"/>
        <span>${away} ${sa}</span>
        <span style="color: var(--text-muted); font-size: 0.8em; margin: 0 4px;">vs</span>
        <span>${sh} ${home}</span>
        <img src="${window.getTeamLogoURL(home)}" style="width: 32px; height: 32px; object-fit: contain;" alt="${home}"/>
      </div>
      <div style="font-size: 13px; font-weight: normal; color: var(--text-muted); margin-top: 4px;">
        Código del Grid: <strong style="color: var(--accent-color);">${g.code || code}</strong> | Estado: <strong>${q}</strong>
      </div>
    `;
    
    if (verticalTeam) verticalTeam.textContent = away;
    if (horizontalTeam) horizontalTeam.textContent = home;
    if (lockBadge) {
      if (g.locked) {
        lockBadge.textContent = '🔒 BLOQUEADO';
        lockBadge.className = 'badge badge-danger';
      } else {
        lockBadge.textContent = '⚡ ABIERTO';
        lockBadge.className = 'badge badge-success';
      }
    }

    // Update Winners History Widgets
    const q1Name = document.getElementById('q1-winner-name');
    const q1Score = document.getElementById('q1-winner-score');
    if (q1Name) q1Name.textContent = g.q1_winner || 'Nadie';
    if (q1Score) q1Score.textContent = g.q1_score ? 'Score: ' + g.q1_score : 'Score: —';

    const q2Name = document.getElementById('q2-winner-name');
    const q2Score = document.getElementById('q2-winner-score');
    if (q2Name) q2Name.textContent = g.q2_winner || 'Nadie';
    if (q2Score) q2Score.textContent = g.q2_score ? 'Score: ' + g.q2_score : 'Score: —';

    const q3Name = document.getElementById('q3-winner-name');
    const q3Score = document.getElementById('q3-winner-score');
    if (q3Name) q3Name.textContent = g.q3_winner || 'Nadie';
    if (q3Score) q3Score.textContent = g.q3_score ? 'Score: ' + g.q3_score : 'Score: —';

    const q4Name = document.getElementById('q4-winner-name');
    const q4Score = document.getElementById('q4-winner-score');
    if (q4Name) q4Name.textContent = g.q4_winner || 'Nadie';
    if (q4Score) q4Score.textContent = g.q4_score ? 'Score: ' + g.q4_score : 'Score: —';
  }

  function updatePlayerUI() {
    if (whoamiEl) {
      if (activePlayer) {
        whoamiEl.textContent = `Jugador: ${activePlayer.nickname}`;
        whoamiEl.style.color = 'var(--accent-color)';
      } else if (pendingPlayers.length > 0) {
        whoamiEl.textContent = `Solicitud Pendiente (${pendingPlayers[0].nickname})`;
        whoamiEl.style.color = 'var(--text-muted)';
      } else {
        whoamiEl.textContent = 'Selecciona tu Apodo';
        whoamiEl.style.color = 'var(--text-muted)';
      }
    }

    const quota = activePlayer ? Number(activePlayer.quota || 0) : 0;
    const taken = activePlayer ? Number(activePlayer.taken || 0) : 0;

    const statusCard = document.getElementById('selection-status-card');
    const statusText = document.getElementById('selection-status-text');
    if (statusText) {
      if (activePlayer) {
        const remaining = Math.max(0, quota - taken);
        if (remaining > 0) {
          statusText.innerHTML = `🏈 Te quedan <strong style="font-size:18px; color: var(--accent-color);">${remaining}</strong> casillas por escoger.`;
          if (statusCard) {
            statusCard.style.background = 'rgba(255,193,7,0.02)';
            statusCard.style.borderColor = 'var(--border-color)';
          }
        } else {
          statusText.innerHTML = `✅ ¡Listo! Has seleccionado tus <strong style="font-size:18px; color: #28a745;">${quota}</strong> casillas.`;
          if (statusCard) {
            statusCard.style.background = 'rgba(40,167,69,0.02)';
            statusCard.style.borderColor = '#28a745';
          }
        }
      } else if (pendingPlayers.length > 0) {
        statusText.innerHTML = `⏳ Tu registro está pendiente de aprobación por el administrador.`;
        if (statusCard) {
          statusCard.style.background = 'rgba(220,53,69,0.02)';
          statusCard.style.borderColor = 'var(--danger-color)';
        }
      } else {
        statusText.innerHTML = `📌 Selecciona tu apodo en la lista desplegable abajo para comenzar.`;
        if (statusCard) {
          statusCard.style.background = 'rgba(255,255,255,0.01)';
          statusCard.style.borderColor = 'var(--border-color)';
        }
      }
    }

    // Toggle dropdown if approved players exist
    if (approvedPlayers.length > 0 && nickChooser) {
      nickChooser.style.display = 'inline-block';
      nickChooser.innerHTML = '<option value="">-- Elige tu Apodo --</option>';
      approvedPlayers.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = `${p.nickname} (${p.taken}/${p.quota} cuadros)`;
        nickChooser.appendChild(o);
      });
      if (activePlayer) {
        nickChooser.value = activePlayer.id;
      }
      
      // Update handler
      nickChooser.onchange = () => {
        const selectedId = nickChooser.value;
        if (selectedId) {
          activePlayer = approvedPlayers.find(p => p.id === selectedId) || null;
          localStorage.setItem('bww_player_id', selectedId);
          
          if (activePlayer) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('pid', activePlayer.id);
            window.history.replaceState(null, '', newUrl.toString());
          }
        } else {
          activePlayer = null;
        }

        updatePlayerUI();
        if (game) renderGrid(game);
      };
    } else if (nickChooser) {
      nickChooser.style.display = 'none';
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
