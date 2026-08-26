// Minuto del Gol Module for Wings & Wins
(function() {
  'use strict';

  let db = null;
  let user = null;

  const firstGoalGamesList = document.getElementById('firstGoalGamesList');
  const myFirstGoalBets = document.getElementById('myFirstGoalBets');

  let activeGames = [];
  let userRegistrations = {}; // { gameId: playerDocData }

  function initFirstGoal() {
    if (window.db) {
      db = window.db;
      setupListeners();
      loadActiveGames();
    } else {
      setTimeout(initFirstGoal, 100);
    }
  }

  function setupListeners() {
    window.onAuthChange((currentUser, isAdmin) => {
      user = currentUser;
      if (user) {
        listenToUserRegistrations();
      } else {
        userRegistrations = {};
        renderGames();
      }
    });
  }

  function loadActiveGames() {
    if (!db) return;
    
    // Listen to active games or games completed within the last 12 hours
    const yesterday = Date.now() - 12 * 60 * 60 * 1000;
    db.collection('first_goal_games')
      .where('createdAt', '>=', yesterday)
      .onSnapshot(snap => {
        activeGames = [];
        snap.forEach(doc => {
          activeGames.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Sort active first, then by date desc
        activeGames.sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return b.createdAt - a.createdAt;
        });

        renderGames();
      }, err => {
        console.error('[fg] Error listening to active games:', err);
      });
  }

  let unsubRegs = null;
  function listenToUserRegistrations() {
    if (!db || !user) return;
    if (unsubRegs) unsubRegs();

    activeGames.forEach(game => {
      db.collection('first_goal_games').doc(game.id).collection('players').doc(user.uid)
        .onSnapshot(doc => {
          if (doc.exists) {
            userRegistrations[game.id] = doc.data();
          } else {
            delete userRegistrations[game.id];
          }
          renderGames();
        });
    });
  }

  function renderGames() {
    if (!firstGoalGamesList) return;
    firstGoalGamesList.innerHTML = '';

    if (activeGames.length === 0) {
      firstGoalGamesList.innerHTML = '<div class="text-center hint-text py-4">No hay partidos activos de Minuto del Gol en este momento.</div>';
      return;
    }

    activeGames.forEach(game => {
      const reg = userRegistrations[game.id];
      const isApproved = reg && (reg.approved === true || reg.status === 'approved');

      const awayStyle = window.resolveTeamStyle ? window.resolveTeamStyle({
        name: game.awayTeam,
        abbr: game.awayAbbr,
        logo: game.awayLogo,
        color: game.awayColor,
        secondaryColor: game.awaySecondaryColor
      }) : { name: game.awayTeam || 'Visitante', abbr: game.awayAbbr || 'AWY', logo: game.awayLogo || 'img/logo.jpg', color: game.awayColor || '#1a1a24', secondaryColor: '#ffd100' };

      const homeStyle = window.resolveTeamStyle ? window.resolveTeamStyle({
        name: game.homeTeam,
        abbr: game.homeAbbr,
        logo: game.homeLogo,
        color: game.homeColor,
        secondaryColor: game.homeSecondaryColor
      }) : { name: game.homeTeam || 'Local', abbr: game.homeAbbr || 'HOM', logo: game.homeLogo || 'img/logo.jpg', color: game.homeColor || '#1a1a24', secondaryColor: '#ffd100' };

      const isLive = game.status === 'in_progress' || game.status === 'in';
      const isFinal = game.status === 'completed' || game.status === 'post';
      const clockText = game.clock ? `${game.clock}` : (isLive ? '1T' : '');

      let statusBadgeHtml = `<span class="fg-tv-status-badge scheduled">🗓️ ${game.matchDateFormatted || 'Por Iniciar'}</span>`;
      let centerScoreHtml = `<div class="fg-tv-vs-badge">VS</div><div class="fg-tv-kickoff-time">${game.matchTime || 'Por Iniciar'}</div>`;

      if (isLive) {
        statusBadgeHtml = `<span class="fg-tv-status-badge live"><span class="pulse-dot"></span> 🔴 EN VIVO • Min ${clockText}</span>`;
        centerScoreHtml = `<div class="fg-tv-score-digits">${game.awayScore ?? 0} - ${game.homeScore ?? 0}</div><div class="fg-tv-clock">${clockText}</div>`;
      } else if (isFinal) {
        statusBadgeHtml = `<span class="fg-tv-status-badge final">🏁 FINAL</span>`;
        centerScoreHtml = `<div class="fg-tv-score-digits">${game.awayScore ?? 0} - ${game.homeScore ?? 0}</div><div class="fg-tv-clock" style="color:#a0aab8;">FINAL</div>`;
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = 'rgba(255, 255, 255, 0.02)';
      card.style.border = '1px solid var(--border-color)';
      card.style.padding = '16px';
      card.style.marginBottom = '20px';

      // TV Broadcast Scorebug Header
      const tvScorebugHtml = `
        <div class="fg-tv-scorebug">
          <div class="fg-tv-header">
            <span class="fg-tv-league">🏆 ${game.leagueName || 'Minuto del Gol'} • 📍 ${game.store || 'Todas'}</span>
            ${statusBadgeHtml}
          </div>
          <div class="fg-tv-body">
            <div class="fg-tv-team-side away" style="background: linear-gradient(135deg, ${awayStyle.color}dd 0%, rgba(10,15,24,0.95) 100%);">
              <img class="fg-tv-team-logo" src="${awayStyle.logo}" alt="${awayStyle.abbr}" onerror="this.src='img/logo.jpg'"/>
              <div class="fg-tv-team-info">
                <span class="fg-tv-team-name">${awayStyle.name}</span>
                <span class="fg-tv-team-role">Visitante</span>
              </div>
            </div>
            <div class="fg-tv-center-bug">
              ${centerScoreHtml}
            </div>
            <div class="fg-tv-team-side home" style="background: linear-gradient(225deg, ${homeStyle.color}dd 0%, rgba(10,15,24,0.95) 100%);">
              <div class="fg-tv-team-info">
                <span class="fg-tv-team-name">${homeStyle.name}</span>
                <span class="fg-tv-team-role">Local</span>
              </div>
              <img class="fg-tv-team-logo" src="${homeStyle.logo}" alt="${homeStyle.abbr}" onerror="this.src='img/logo.jpg'"/>
            </div>
          </div>
        </div>
      `;

      card.innerHTML = tvScorebugHtml;

      // Winner Celebration Banner for completed games
      if (game.status === 'completed' && (game.winnerNickname || game.winningCell)) {
        const winNick = game.winnerNickname || game.cells?.[game.winningCell]?.nickname || 'Ganador';
        const winnerBannerHtml = `
          <div style="background: linear-gradient(135deg, rgba(0,230,118,0.2) 0%, rgba(10,15,24,0.95) 100%); border: 2px solid #00e676; border-radius: 14px; padding: 14px 16px; margin-top: 12px; margin-bottom: 14px; text-align: center; box-shadow: 0 0 25px rgba(0,230,118,0.3);">
            <div style="font-size: 24px; line-height: 1; margin-bottom: 4px;">🏆 👑 🏆</div>
            <h4 style="font-size: 16px; font-weight: 900; color: #ffffff; margin: 0 0 4px 0;">
              ¡RESULTADO GANADOR OFICIAL!
            </h4>
            <div style="font-size: 19px; font-weight: 900; color: #00e676; text-transform: uppercase; letter-spacing: 0.5px;">
              ${winNick}
            </div>
            <div style="font-size: 12px; color: #e0e0e0; margin-top: 6px; font-weight: 700; line-height: 1.4;">
              ${game.winnerReason || 'Primer Gol del Partido'}
            </div>
          </div>
        `;
        card.innerHTML += winnerBannerHtml;
      }

      // Conditional content based on user state
      if (!user) {
        card.innerHTML += `
          <div class="text-center py-3">
            <p class="hint-text" style="font-size:12.5px; margin-bottom:12px;">Inicia sesión con tu cuenta para unirte a este juego y elegir tu bloque de tiempo.</p>
            <button class="btn btn-primary" onclick="window.toggleSideDrawer(true)" style="width:auto; padding:8px 16px; font-size:12px;">🔑 Iniciar Sesión / Registrarme</button>
          </div>
        `;
      } else if (!reg && game.active) {
        // Register form
        const userDefaultNick = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name') || '';
        card.innerHTML += `
          <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:14px; margin-top:8px;">
            <h5 style="color:#ffd100; font-weight:800; font-size:13.5px; margin-bottom:4px;">📋 Registrarse en el Juego</h5>
            <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">Ingresa tus datos para participar en la planilla de minuto del gol.</p>
            
            <div class="form-group" style="margin-bottom:10px;">
              <label style="font-size:11px;">👤 Tu Apodo o Nombre (Obligatorio)*</label>
              <input type="text" id="join_nick_${game.id}" value="${userDefaultNick.toUpperCase()}" placeholder="Ej. BETO / EL TIGRE" style="padding:8px 10px; font-size:13px; font-weight:900; text-transform:uppercase;"/>
            </div>
            
            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:11px;">Mesero / Número de Mesa</label>
              <input type="text" id="join_waiter_${game.id}" placeholder="Ej. Mesa 4 / Daniel" style="padding:8px 10px; font-size:13px; font-weight:800;"/>
            </div>

            <button class="btn btn-primary" onclick="joinFirstGoalGame('${game.id}')" style="font-size:12.5px; padding:10px; font-weight:900;">
              🚀 Solicitar Acceso al Juego
            </button>
          </div>
        `;
      } else if (!isApproved) {
        card.innerHTML += `
          <div class="text-center py-4" style="background:rgba(255,255,255,0.01); border-radius:12px; border:1px dashed var(--border-color); margin-top:8px;">
            <span style="font-size:24px;">⌛</span>
            <h5 style="color:#ffd100; font-weight:900; margin-top:8px; margin-bottom:4px;">Solicitud Enviada</h5>
            <p class="hint-text" style="font-size:12px; max-width:280px; margin:0 auto;">Por favor pídele al mesero o administrador que apruebe tu participación en la mesa <strong>${reg.waiter || '—'}</strong>.</p>
          </div>
        `;
      } else {
        // Active and Approved player - Show game board!
        const boardHtml = buildBoardHtml(game, homeStyle, awayStyle);
        card.innerHTML += boardHtml;
      }

      firstGoalGamesList.appendChild(card);
    });
  }

  window.joinFirstGoalGame = async function(gameId) {
    if (!db || !user) return;
    const nickInput = document.getElementById(`join_nick_${gameId}`);
    const waiterInput = document.getElementById(`join_waiter_${gameId}`);

    const nickname = nickInput ? nickInput.value.trim().toUpperCase() : '';
    const waiter = waiterInput ? waiterInput.value.trim() : '';

    if (!nickname || !waiter) {
      alert('Por favor ingresa tu Apodo y el número de Mesa.');
      return;
    }

    try {
      const gameSnap = await db.collection('first_goal_games').doc(gameId).get();
      const game = gameSnap.data() || {};
      const autoApprove = game.autoApprove === true;

      await db.collection('first_goal_games').doc(gameId).collection('players').doc(user.uid).set({
        nickname: nickname,
        waiter: waiter,
        status: autoApprove ? 'approved' : 'pending',
        approved: autoApprove,
        joinedAt: Date.now()
      });

      if (autoApprove) {
        alert('🎉 ¡Te has unido exitosamente al juego! Ya puedes seleccionar tu bloque.');
      } else {
        alert('✉️ Solicitud enviada. Pídele al mesero que te apruebe.');
      }
    } catch (err) {
      alert('Error al unirse: ' + err.message);
    }
  };

  function buildBoardHtml(game, homeStyle, awayStyle) {
    const home = game.homeTeam || 'Local';
    const away = game.awayTeam || 'Visitante';
    const cells = game.cells || {};
    const winCell = game.winningCell || '';

    const hStyle = homeStyle || (window.resolveTeamStyle ? window.resolveTeamStyle(home) : { name: home, logo: 'img/logo.jpg', color: '#1a1a24' });
    const aStyle = awayStyle || (window.resolveTeamStyle ? window.resolveTeamStyle(away) : { name: away, logo: 'img/logo.jpg', color: '#1a1a24' });

    // Check if current user has already selected a regular cell
    let userHasRegularCell = false;
    for (const key in cells) {
      if (cells[key]?.playerId === user.uid && !key.includes('91_105') && !key.includes('106_120')) {
        userHasRegularCell = true;
      }
    }

    const ranges = [
      { id: '0_5', name: '0 - 5' },
      { id: '6_10', name: '6 - 10' },
      { id: '11_15', name: '11 - 15' },
      { id: '16_20', name: '16 - 20' },
      { id: '21_25', name: '21 - 25' },
      { id: '26_30', name: '26 - 30' },
      { id: '31_35', name: '31 - 35' },
      { id: '36_40', name: '36 - 40' },
      { id: '41_45', name: '41 - 45 y +' },
      { id: '46_50', name: '46 - 50' },
      { id: '51_55', name: '51 - 55' },
      { id: '56_60', name: '56 - 60' },
      { id: '61_65', name: '61 - 65' },
      { id: '66_70', name: '66 - 70' },
      { id: '71_75', name: '71 - 75' },
      { id: '76_80', name: '76 - 80' },
      { id: '81_85', name: '81 - 85' },
      { id: '86_90', name: '86 - 90 y +' }
    ];

    let rowsHtml = '';
    ranges.forEach(r => {
      const cellHomeKey = `local_${r.id}`;
      const cellAwayKey = `away_${r.id}`;

      const homeCell = cells[cellHomeKey];
      const awayCell = cells[cellAwayKey];

      const homeClass = getCellClass(cellHomeKey, homeCell, userHasRegularCell, game, winCell);
      const awayClass = getCellClass(cellAwayKey, awayCell, userHasRegularCell, game, winCell);

      const homeText = getCellText(cellHomeKey, homeCell, game);
      const awayText = getCellText(cellAwayKey, awayCell, game);

      const homeClick = homeClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${cellHomeKey}')"` : '';
      const awayClick = awayClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${cellAwayKey}')"` : '';

      rowsHtml += `
        <tr>
          <td class="${awayClass}" ${awayClick}>${awayText}</td>
          <td class="fg-time-label-col">${r.name}</td>
          <td class="${homeClass}" ${homeClick}>${homeText}</td>
        </tr>
      `;
    });

    let html = `
      <div style="margin-top:14px;">
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px; line-height:1.4;">
          Toca cualquier celda vacía con borde verde <span style="color:#00e676; font-weight:800;">+ ELEGIR</span> para reclamar tu minuto. Límite: 1 bloque por persona.
        </p>
        <div class="fg-board-container">
          <table class="fg-board-table">
            <thead>
              <tr>
                <th class="away" style="width:calc(50% - 40px); background: linear-gradient(135deg, ${aStyle.color}88 0%, rgba(10,15,24,0.95) 100%); font-size:12px; font-weight:900; color:#ffd100; letter-spacing:1px; padding:10px;">
                  VISITANTE
                </th>
                <th style="width:80px; background:rgba(0,0,0,0.5); color:#ffffff; font-weight:900; font-size:11.5px; padding:10px; letter-spacing:0.5px;">
                  MINUTO
                </th>
                <th class="local" style="width:calc(50% - 40px); background: linear-gradient(225deg, ${hStyle.color}88 0%, rgba(10,15,24,0.95) 100%); font-size:12px; font-weight:900; color:#ffd100; letter-spacing:1px; padding:10px;">
                  LOCAL
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Extra Time Panel
    if (game.activeExtraTime) {
      const isAllowedET = game.extraTimePlayers?.[user.uid] === true;
      if (isAllowedET) {
        let etUserHasCell = false;
        for (const k in cells) {
          if (cells[k]?.playerId === user.uid && (k.includes('91_105') || k.includes('106_120'))) {
            etUserHasCell = true;
          }
        }

        const etRanges = [
          { id: '91_105', name: '91 - 105' },
          { id: '106_120', name: '106 - 120' }
        ];

        let etRowsHtml = '';
        etRanges.forEach(r => {
          const keyLocal = `local_${r.id}`;
          const keyAway = `away_${r.id}`;

          const localCell = cells[keyLocal];
          const awayCell = cells[keyAway];

          const localClass = getCellClass(keyLocal, localCell, etUserHasCell, game, winCell);
          const awayClass = getCellClass(keyAway, awayCell, etUserHasCell, game, winCell);

          const localText = getCellText(keyLocal, localCell, game);
          const awayText = getCellText(keyAway, awayCell, game);

          const localClick = localClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${keyLocal}')"` : '';
          const awayClick = awayClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${keyAway}')"` : '';

          etRowsHtml += `
            <tr>
              <td class="${localClass}" ${localClick}>${localText}</td>
              <td class="fg-time-label-col" style="color:#ff4444;">${r.name}</td>
              <td class="${awayClass}" ${awayClick}>${awayText}</td>
            </tr>
          `;
        });

        html += `
          <div style="margin-top:16px; border-top:1.5px dashed rgba(255,255,255,0.1); padding-top:14px;">
            <h5 style="color:#ff4444; font-weight:900; font-size:13.5px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              ⏱️ TIEMPOS EXTRAS ACTIVO
            </h5>
            <p style="font-size:11.5px; color:var(--text-muted); margin-bottom:8px;">
              ¡Felicidades, participas en los Tiempos Extras! Reclama tu bloque adicional para los minutos de alargue:
            </p>
            <div class="fg-board-container" style="border-color:#ff4444; box-shadow:0 0 15px rgba(255,68,68,0.15);">
              <table class="fg-board-table">
                <tbody>
                  ${etRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="text-center py-3" style="background:rgba(255,255,255,0.01); border-radius:10px; border:1px solid rgba(255,255,255,0.05); margin-top:16px;">
            <p class="hint-text" style="font-size:11.5px; color:var(--text-muted);">Tiempos Extras activos. Solo los jugadores autorizados por el admin pueden elegir bloques de alargue.</p>
          </div>
        `;
      }
    }

    // Penalty Shootout Panel
    if (game.activePenalties) {
      const assignments = game.penaltyAssignments || {};

      let penaltyRowsHtml = '';
      for (let i = 1; i <= 5; i++) {
        // Local
        const keyLocal = `pen_local_${i}`;
        const assignLocal = assignments[keyLocal];
        const isLocalMe = assignLocal?.playerId === user.uid;
        const isLocalWin = winCell === `${keyLocal}_missed`;

        let localRowClass = 'fg-penalty-row';
        if (isLocalMe) localRowClass += ' me';
        if (isLocalWin) localRowClass += ' winning-penalty';

        penaltyRowsHtml += `
          <div class="${localRowClass}">
            <span class="fg-penalty-num">Penal #${i} — ${home}</span>
            <span class="fg-penalty-owner ${assignLocal ? '' : 'unassigned'}">
              ${isLocalWin ? '🏆 ' : ''}${assignLocal ? assignLocal.nickname : 'Sin Asignar'} ${isLocalMe ? '(TÚ)' : ''}
              ${isLocalWin ? ' — ¡FALLADO! (GANADOR)' : ''}
            </span>
          </div>
        `;

        // Away
        const keyAway = `pen_away_${i}`;
        const assignAway = assignments[keyAway];
        const isAwayMe = assignAway?.playerId === user.uid;
        const isAwayWin = winCell === `${keyAway}_missed`;

        let awayRowClass = 'fg-penalty-row';
        if (isAwayMe) awayRowClass += ' me';
        if (isAwayWin) awayRowClass += ' winning-penalty';

        penaltyRowsHtml += `
          <div class="${awayRowClass}">
            <span class="fg-penalty-num">Penal #${i} — ${away}</span>
            <span class="fg-penalty-owner ${assignAway ? '' : 'unassigned'}">
              ${isAwayWin ? '🏆 ' : ''}${assignAway ? assignAway.nickname : 'Sin Asignar'} ${isAwayMe ? '(TÚ)' : ''}
              ${isAwayWin ? ' — ¡FALLADO! (GANADOR)' : ''}
            </span>
          </div>
        `;
      }

      html += `
        <div style="margin-top:16px; border-top:1.5px dashed rgba(255,255,255,0.1); padding-top:14px;">
          <h5 style="color:#00e676; font-weight:900; font-size:13.5px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            🎯 TANDA DE PENALES (SORTEO)
          </h5>
          <p style="font-size:11.5px; color:var(--text-muted); margin-bottom:10px;">
            Los penales se han sorteado al azar entre los jugadores aprobados. Si el tirador del penal asignado lo **FALLA**, el dueño de ese tiro gana el juego.
          </p>
          <div style="max-height:220px; overflow-y:auto;">
            ${penaltyRowsHtml}
          </div>
        </div>
      `;
    }

    return html;
  }

  function getCellClass(key, cell, userHasCell, game, winCell) {
    if (winCell === key) return 'fg-slot-cell winning-slot';
    if (cell) {
      return cell.playerId === user.uid ? 'fg-slot-cell occupied-me' : 'fg-slot-cell occupied-other';
    }
    if (game.locked || !game.active) return 'fg-slot-cell occupied-other';
    if (userHasCell) return 'fg-slot-cell occupied-other';
    return 'fg-slot-cell empty-selectable';
  }

  function getCellText(key, cell, game) {
    if (game.winningCell === key) {
      return `🏆 ${cell ? cell.nickname : 'GANADOR'}`;
    }
    if (cell) return cell.nickname;
    if (game.locked || !game.active) return '—';
    return '+ ELEGIR';
  }

  window.selectFGCell = async function(gameId, cellKey) {
    if (!db || !user) return;

    if (!confirm(`¿Deseas elegir este bloque de tiempo? Una vez seleccionado no se puede cambiar.`)) {
      return;
    }

    try {
      await db.runTransaction(async transaction => {
        const gameRef = db.collection('first_goal_games').doc(gameId);
        const gameDoc = await transaction.get(gameRef);

        if (!gameDoc.exists) throw new Error('El juego no existe.');

        const game = gameDoc.data();
        if (game.locked || !game.active) throw new Error('El juego está bloqueado o cerrado.');

        const cells = game.cells || {};
        if (cells[cellKey]) throw new Error('Este bloque ya fue seleccionado por otro jugador.');

        const pRef = gameRef.collection('players').doc(user.uid);
        const pDoc = await transaction.get(pRef);

        if (!pDoc.exists) throw new Error('No estás registrado en este juego.');

        const player = pDoc.data();
        const isApproved = player.approved === true || player.status === 'approved';
        if (!isApproved) throw new Error('Tu registro aún no ha sido aprobado por el admin.');

        const isExtraTimeCell = cellKey.includes('91_105') || cellKey.includes('106_120');
        let regularCount = 0;
        let etCount = 0;

        for (const k in cells) {
          if (cells[k]?.playerId === user.uid) {
            if (k.includes('91_105') || k.includes('106_120')) {
              etCount++;
            } else {
              regularCount++;
            }
          }
        }

        if (isExtraTimeCell) {
          if (game.extraTimePlayers?.[user.uid] !== true) {
            throw new Error('No estás autorizado para jugar en Tiempo Extra.');
          }
          if (etCount >= 1) throw new Error('Ya seleccionaste tu bloque de Tiempo Extra.');
        } else {
          if (regularCount >= 1) throw new Error('Ya seleccionaste tu bloque de tiempo regular.');
        }

        const updatedCells = { ...cells };
        updatedCells[cellKey] = {
          playerId: user.uid,
          nickname: player.nickname || 'Socio'
        };

        transaction.update(gameRef, { cells: updatedCells });
      });

      alert('🎉 ¡Bloque de tiempo seleccionado y guardado exitosamente!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Live ESPN score & minute auto-sync
  let liveSyncInterval = null;
  async function syncActiveGamesESPN() {
    if (!activeGames || activeGames.length === 0) return;
    for (const g of activeGames) {
      if (!g.eventId) continue;
      try {
        const sport = g.sport || 'soccer';
        const league = g.leagueSlug || 'mex.1';
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${g.eventId}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const header = data.header || {};
        const competitions = header.competitions || [];
        const comp = competitions[0] || {};
        const competitors = comp.competitors || [];
        const status = comp.status || {};

        const team1 = competitors[0] || {};
        const team2 = competitors[1] || {};
        const home = team1.homeAway === 'home' ? team1 : team2;
        const away = team1.homeAway === 'away' ? team1 : team2;

        const isLive = status.type?.state === 'in';
        const isPost = status.type?.state === 'post';
        const clock = status.displayClock ? `${status.displayClock}'` : (status.type?.detail || '');

        const newStatus = isLive ? 'in_progress' : (isPost ? 'completed' : 'scheduled');
        const newHomeScore = home.score !== undefined ? parseInt(home.score, 10) : (g.homeScore || 0);
        const newAwayScore = away.score !== undefined ? parseInt(away.score, 10) : (g.awayScore || 0);

        if (g.homeScore !== newHomeScore || g.awayScore !== newAwayScore || g.clock !== clock || g.status !== newStatus) {
          g.homeScore = newHomeScore;
          g.awayScore = newAwayScore;
          g.clock = clock;
          g.status = newStatus;
          renderGames();
        }
      } catch (e) {
        console.warn('[FirstGoal LiveSync] sync note:', e);
      }
    }
  }

  if (!liveSyncInterval) {
    liveSyncInterval = setInterval(syncActiveGamesESPN, 35000);
  }

  initFirstGoal();
})();

