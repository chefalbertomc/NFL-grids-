// Minuto del Gol Module for Wings & Wins
(function() {
  'use strict';

  let db = null;
  let user = null;

  const firstGoalGamesList = document.getElementById('firstGoalGamesList');
  const myFirstGoalBets = document.getElementById('myFirstGoalBets');

  let activeGames = [];
  let userRegistrations = {}; // { gameId: playerDocData }
  let gamePlayersMap = {};    // { gameId: { [playerId]: playerDocData } }

  // View Mode: 'names', 'photos', or 'both'
  let fgDisplayMode = localStorage.getItem('bww_fg_display_mode') || 'names';

  window.setFGDisplayMode = function(mode) {
    fgDisplayMode = mode;
    localStorage.setItem('bww_fg_display_mode', mode);
    renderGames();
  };

  function getCurrentUser() {
    if (user && user.uid) return user;
    if (window.currentUser && window.currentUser.uid) {
      user = window.currentUser;
      return user;
    }
    if (window.firebase && firebase.auth && firebase.auth().currentUser) {
      user = firebase.auth().currentUser;
      window.currentUser = user;
      return user;
    }
    try {
      const cached = localStorage.getItem('bww_last_auth_user');
      if (cached) {
        user = JSON.parse(cached);
        window.currentUser = user;
        return user;
      }
    } catch(e) {}
    const savedNick = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name');
    let savedId = localStorage.getItem('bww_player_id');
    if (savedNick) {
      if (!savedId) {
        savedId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('bww_player_id', savedId);
      }
      user = {
        uid: savedId,
        displayName: savedNick,
        email: '',
        photoURL: localStorage.getItem('user_custom_avatar') || 'img/logo.jpg'
      };
      window.currentUser = user;
      return user;
    }
    return null;
  }

  function initFirstGoal() {
    if (window.db) {
      db = window.db;
      user = getCurrentUser();
      setupListeners();
      loadActiveGames();
      if (user) {
        listenToUserRegistrations();
      }
    } else {
      setTimeout(initFirstGoal, 100);
    }
  }

  function setupListeners() {
    window.onAuthChange((currentUser) => {
      user = currentUser || getCurrentUser();
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
        listenToUserRegistrations();
      }, err => {
        console.error('[fg] Error listening to active games:', err);
      });
  }

  let unsubRegs = [];
  function listenToUserRegistrations() {
    const u = getCurrentUser();
    if (!db) return;
    
    // Clear previous sub-listeners
    unsubRegs.forEach(unsub => { if (typeof unsub === 'function') unsub(); });
    unsubRegs = [];

    activeGames.forEach(game => {
      // 1. Listen to all approved players in this game for photo & name rendering
      const unsubAll = db.collection('first_goal_games').doc(game.id).collection('players')
        .onSnapshot(snap => {
          if (!gamePlayersMap[game.id]) gamePlayersMap[game.id] = {};
          snap.forEach(doc => {
            gamePlayersMap[game.id][doc.id] = doc.data();
          });
          renderGames();
        }, err => console.warn('[fg] Error listening to players:', err));
      unsubRegs.push(unsubAll);

      // 2. Listen to current user registration status
      if (u && u.uid) {
        const unsubUser = db.collection('first_goal_games').doc(game.id).collection('players').doc(u.uid)
          .onSnapshot(doc => {
            if (doc.exists) {
              userRegistrations[game.id] = doc.data();
            } else {
              delete userRegistrations[game.id];
            }
            renderGames();
          }, err => console.warn('[fg] Error listening to user reg:', err));
        unsubRegs.push(unsubUser);
      }
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
      const u = getCurrentUser();
      const reg = u ? userRegistrations[game.id] : null;
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

      let dateOnlyText = 'HOY';
      let timeOnlyText = game.matchTime ? `${game.matchTime} hrs` : 'POR INICIAR';

      if (game.matchDate) {
        try {
          const d = new Date(game.matchDate);
          if (!isNaN(d.getTime())) {
            dateOnlyText = d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
            if (!game.matchTime) {
              timeOnlyText = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + ' hrs';
            }
          }
        } catch (e) {}
      } else if (game.matchDateFormatted && game.matchDateFormatted.includes('•')) {
        const parts = game.matchDateFormatted.split('•');
        dateOnlyText = parts[0].trim().toUpperCase();
        timeOnlyText = parts[1].trim();
      }

      let centerScoreHtml = `
        <div style="font-size:11.5px; font-weight:800; color:#e0e0e0; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.5px;">${dateOnlyText}</div>
        <div class="fg-tv-vs-badge">VS</div>
        <div style="font-size:12px; font-weight:900; color:#ffd100; margin-top:4px;">${timeOnlyText}</div>
      `;

      if (isLive) {
        centerScoreHtml = `
          <div style="background:#ff0033; color:#fff; font-size:10px; font-weight:900; padding:2px 8px; border-radius:10px; text-transform:uppercase; margin-bottom:4px; display:inline-flex; align-items:center; gap:4px;">
            <span class="pulse-dot"></span> EN VIVO
          </div>
          <div class="fg-tv-score-digits" style="font-size:26px; font-weight:950; color:#ffffff; letter-spacing:3px;">
            ${game.awayScore ?? 0} - ${game.homeScore ?? 0}
          </div>
          <div class="fg-tv-clock" style="font-size:12px; font-weight:800; color:#ffd100; margin-top:2px;">
            Min ${clockText}
          </div>
        `;
      } else if (isFinal) {
        centerScoreHtml = `
          <div style="background:rgba(255,255,255,0.15); color:#a0aab8; font-size:10px; font-weight:900; padding:2px 8px; border-radius:10px; text-transform:uppercase; margin-bottom:4px;">
            🏁 FINAL
          </div>
          <div class="fg-tv-score-digits" style="font-size:26px; font-weight:950; color:#ffffff; letter-spacing:3px;">
            ${game.awayScore ?? 0} - ${game.homeScore ?? 0}
          </div>
          <div class="fg-tv-clock" style="font-size:11px; font-weight:800; color:#a0aab8; margin-top:2px;">
            FINAL
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = 'rgba(255, 255, 255, 0.02)';
      card.style.border = '1px solid var(--border-color)';
      card.style.padding = '16px';
      card.style.marginBottom = '20px';

      // Top Instruction Banner + WhatsApp share button (Placed strictly ABOVE the team logos card)
      const maxLimit = game.maxBlocksPerPlayer || 1;
      const topBannerHtml = `
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px; line-height:1.4; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            👉 Toca cualquier celda vacía con borde verde <strong style="color:#00e676;">+ ELEGIR</strong> para reclamar tu minuto. Límite: <strong style="color:#ffd100;">${maxLimit === 999 ? 'Ilimitado' : maxLimit + ' bloque(s)'}</strong> por persona.
          </div>
          <button type="button" class="btn btn-secondary" onclick="window.shareFirstStrikerWhatsApp('${game.id}', '${encodeURIComponent(homeStyle.name)}', '${encodeURIComponent(awayStyle.name)}', '${encodeURIComponent(dateOnlyText)}', '${encodeURIComponent(timeOnlyText)}')" style="width:auto; padding:6px 12px; font-size:11.5px; font-weight:800; border-radius:8px; background:rgba(37,211,102,0.15); border:1px solid #25d366; color:#25d366; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">
            <span>📲</span> Compartir en WhatsApp
          </button>
        </div>
      `;

      const rawLeague = game.leagueName || game.leagueSlug || game.sport || 'LIGA MX';
      let leagueText = 'LIGA MX';
      if (rawLeague.toLowerCase().includes('leagues') || rawLeague.toLowerCase().includes('cup')) {
        leagueText = 'LEAGUES CUP';
      } else if (rawLeague.includes('First Striker') || rawLeague.includes('Fútbol') || rawLeague === 'mex.1') {
        leagueText = 'LIGA MX';
      } else {
        leagueText = rawLeague.toUpperCase();
      }

      // TV Broadcast Scorebug Header
      const tvScorebugHtml = `
        <div class="fg-tv-scorebug">
          <div class="fg-tv-header" style="justify-content: flex-start;">
            <span class="fg-tv-league" style="font-size:13.5px; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span>📍 ${game.store ? game.store.toUpperCase() : 'JURIQUILLA'}</span>
              <span style="color:var(--text-muted);">•</span>
              <span style="color:#ffd100; font-size:14px; font-weight:950; text-transform:uppercase; letter-spacing:0.5px;">🏆 ${leagueText}</span>
            </span>
          </div>
          <div class="fg-tv-body">
            <div class="fg-tv-team-side away" style="background: linear-gradient(135deg, ${awayStyle.color}dd 0%, rgba(10,15,24,0.95) 100%);">
              <img class="fg-tv-team-logo" src="${awayStyle.logo}" alt="${awayStyle.abbr}" onerror="this.src='img/logo.jpg'"/>
              <div class="fg-tv-team-info">
                <span class="fg-tv-team-name">${awayStyle.name}</span>
                <span class="fg-tv-team-role" style="font-size:10px; font-weight:800; color:#ffd100; text-transform:uppercase; letter-spacing:1px; display:block; margin-top:2px;">VISITANTE</span>
              </div>
              ${isLive || isFinal ? `<span style="font-size:22px; font-weight:950; color:#ffffff; margin-left:auto; padding:2px 8px; background:rgba(0,0,0,0.3); border-radius:6px;">${game.awayScore ?? 0}</span>` : ''}
            </div>
            <div class="fg-tv-center-bug">
              ${centerScoreHtml}
            </div>
            <div class="fg-tv-team-side home" style="background: linear-gradient(225deg, ${homeStyle.color}dd 0%, rgba(10,15,24,0.95) 100%);">
              ${isLive || isFinal ? `<span style="font-size:22px; font-weight:950; color:#ffffff; margin-right:auto; padding:2px 8px; background:rgba(0,0,0,0.3); border-radius:6px;">${game.homeScore ?? 0}</span>` : ''}
              <div class="fg-tv-team-info">
                <span class="fg-tv-team-name">${homeStyle.name}</span>
                <span class="fg-tv-team-role" style="font-size:10px; font-weight:800; color:#ffd100; text-transform:uppercase; letter-spacing:1px; display:block; margin-top:2px;">LOCAL</span>
              </div>
              <img class="fg-tv-team-logo" src="${homeStyle.logo}" alt="${homeStyle.abbr}" onerror="this.src='img/logo.jpg'"/>
            </div>
          </div>
        </div>
      `;

      card.innerHTML = topBannerHtml + tvScorebugHtml;

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
      if (!reg && game.active) {
        // Direct Registration Form (Seamless, no popup or login required)
        const userDefaultNick = localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name') || u?.displayName || '';
        const userDefaultWaiter = localStorage.getItem('player_waiter') || '';
        card.innerHTML += `
          <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:14px; margin-top:8px;">
            <h5 style="color:#ffd100; font-weight:800; font-size:13.5px; margin-bottom:4px;">📋 Registrarse en el Juego</h5>
            <p style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">Ingresa tus datos para participar en la planilla de minuto del gol.</p>
            
            <div class="form-group" style="margin-bottom:10px;">
              <label style="font-size:11px;">👤 Tu Apodo o Nombre (Obligatorio)*</label>
              <input type="text" id="join_nick_${game.id}" value="${userDefaultNick.toUpperCase()}" placeholder="Ej. BETO / EL TIGRE" style="padding:8px 10px; font-size:13px; font-weight:900; text-transform:uppercase;"/>
            </div>
            
            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:11px;">Mesa o Mesero (Opcional)</label>
              <input type="text" id="join_waiter_${game.id}" value="${userDefaultWaiter}" placeholder="Ej. Mesa 4 (Opcional)" style="padding:8px 10px; font-size:13px; font-weight:800;"/>
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
            <p class="hint-text" style="font-size:12px; max-width:280px; margin:0 auto;">Por favor pídele al mesero o administrador que apruebe tu participación${reg.waiter && reg.waiter !== 'Sin mesa' ? ` en la mesa <strong>${reg.waiter}</strong>` : ''}.</p>
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
    if (!db) db = window.db;
    if (!db) return;

    let u = getCurrentUser();
    const nickInput = document.getElementById(`join_nick_${gameId}`);
    const waiterInput = document.getElementById(`join_waiter_${gameId}`);

    let nickname = nickInput ? nickInput.value.trim().toUpperCase() : '';
    let waiter = waiterInput ? waiterInput.value.trim() : '';

    if (!nickname) {
      nickname = (u?.displayName || localStorage.getItem('player_nick') || localStorage.getItem('bww_q_name') || '').trim().toUpperCase();
    }

    if (!nickname) {
      alert('Por favor escribe tu Apodo o Nombre.');
      if (nickInput) nickInput.focus();
      return;
    }

    if (!waiter) {
      waiter = localStorage.getItem('player_waiter') || 'Sin mesa';
    }

    localStorage.setItem('player_nick', nickname);
    localStorage.setItem('bww_q_name', nickname);
    localStorage.setItem('player_waiter', waiter);

    if (!u) {
      let savedId = localStorage.getItem('bww_player_id');
      if (!savedId) {
        savedId = 'user_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('bww_player_id', savedId);
      }
      u = {
        uid: savedId,
        displayName: nickname,
        email: '',
        photoURL: localStorage.getItem('user_custom_avatar') || 'img/logo.jpg'
      };
      window.currentUser = u;
      user = u;
      localStorage.setItem('bww_last_auth_user', JSON.stringify(u));
    }

    try {
      const btn = document.querySelector(`button[onclick*="${gameId}"]`);
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Uniéndote...'; }

      const gameSnap = await db.collection('first_goal_games').doc(gameId).get();
      const game = gameSnap.data() || {};
      const autoApprove = game.autoApprove !== false;

      const photoURL = u.photoURL || localStorage.getItem('user_custom_avatar') || 'img/logo.jpg';
      await db.collection('first_goal_games').doc(gameId).collection('players').doc(u.uid).set({
        nickname: nickname,
        waiter: waiter,
        photoURL: photoURL,
        userPhoto: photoURL,
        userEmail: u.email || '',
        status: autoApprove ? 'approved' : 'pending',
        approved: autoApprove,
        joinedAt: Date.now()
      }, { merge: true });

      userRegistrations[gameId] = {
        nickname: nickname,
        waiter: waiter,
        photoURL: photoURL,
        userPhoto: photoURL,
        status: autoApprove ? 'approved' : 'pending',
        approved: autoApprove
      };

      listenToUserRegistrations();
      renderGames();

      if (autoApprove) {
        alert('🎉 ¡Listo ' + nickname + '! Ya estás dentro del juego. Elige tu casilla de 5 minutos.');
      } else {
        alert('✉️ Solicitud enviada. Pídele al mesero que te apruebe.');
      }
    } catch (err) {
      console.error('[FirstStriker Join Error]', err);
      alert('Error al unirse: ' + err.message);
    }
  };

  // Helper: Parse match minute from clock string (e.g. '11', '11:24', '45+2', '88')
  function parseMatchMinute(clockStr) {
    if (!clockStr) return null;
    if (typeof clockStr === 'number') return clockStr;
    const s = String(clockStr).trim();
    if (s.includes(':')) {
      const p = s.split(':');
      const m = parseInt(p[0], 10);
      return isNaN(m) ? null : m;
    }
    if (s.includes('+')) {
      const p = s.split('+');
      const m = parseInt(p[0], 10) + parseInt(p[1] || 0, 10);
      return isNaN(m) ? null : m;
    }
    const clean = s.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? null : num;
  }

  // Helper: Determine if a match minute falls within a block range
  function isMinuteInRange(minute, rangeId, min, max) {
    if (minute === null || minute === undefined || isNaN(minute)) return false;
    if (rangeId === '41_45') {
      return minute >= 41 && minute <= 50; // includes 45+ added time
    }
    if (rangeId === '86_90') {
      return minute >= 86 && minute <= 105; // includes 90+ added time
    }
    if (rangeId === '101_105') {
      return minute >= 101 && minute <= 108; // includes 105+ added time
    }
    if (rangeId === '116_120') {
      return minute >= 116 && minute <= 130; // includes 120+ added time
    }
    return minute >= min && minute <= max;
  }

  // Helper: Render cell inner content according to view mode & ownership
  function renderCellInnerHtml(gameId, cellKey, cell, isMe, isWin, teamStyle) {
    const u = getCurrentUser();
    if (isWin) {
      const name = cell ? cell.nickname : 'GANADOR';
      const playerInfo = gamePlayersMap[gameId]?.[cell?.playerId];
      const photoSrc = cell?.photoURL || playerInfo?.photoURL || playerInfo?.userPhoto || (isMe ? (u?.photoURL || localStorage.getItem('user_custom_avatar')) : '') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00e676&color=000&bold=true`;
      return `
        <div class="fg-cell-inner winning">
          <span style="font-size:16px;">🏆</span>
          ${fgDisplayMode !== 'names' ? `<img class="fg-cell-avatar large" src="${photoSrc}" onerror="this.src='img/logo.jpg'" alt="${name}"/>` : ''}
          ${fgDisplayMode !== 'photos' ? `<span class="fg-cell-name gold-glow">${name} <span class="fg-winner-tag">¡GOL!</span></span>` : ''}
        </div>
      `;
    }

    if (cell) {
      const name = cell.nickname || 'Socio';
      const playerInfo = gamePlayersMap[gameId]?.[cell.playerId];
      const photoSrc = cell.photoURL || playerInfo?.photoURL || playerInfo?.userPhoto || (isMe ? (u?.photoURL || localStorage.getItem('user_custom_avatar')) : '') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffd100&color=000&bold=true`;

      if (isMe) {
        return `
          <div class="fg-cell-inner me">
            ${fgDisplayMode !== 'names' ? `<img class="fg-cell-avatar me-avatar ${fgDisplayMode === 'photos' ? 'large' : ''}" src="${photoSrc}" onerror="this.src='img/logo.jpg'" alt="${name}"/>` : ''}
            ${fgDisplayMode !== 'photos' ? `<span class="fg-cell-name me-name"><span class="fg-you-badge">⭐ TÚ</span> ${name}</span>` : `<span class="fg-you-badge">⭐ TÚ</span>`}
          </div>
        `;
      } else {
        return `
          <div class="fg-cell-inner other">
            ${fgDisplayMode !== 'names' ? `<img class="fg-cell-avatar ${fgDisplayMode === 'photos' ? 'large' : ''}" src="${photoSrc}" onerror="this.src='img/logo.jpg'" alt="${name}"/>` : ''}
            ${fgDisplayMode !== 'photos' ? `<span class="fg-cell-name other-name">${name}</span>` : ''}
          </div>
        `;
      }
    }

    // Empty cell
    return `
      <div class="fg-cell-inner empty">
        <span class="fg-empty-plus">+</span>
        <span class="fg-empty-text">ELEGIR</span>
      </div>
    `;
  }

  function buildBoardHtml(game, homeStyle, awayStyle) {
    const home = game.homeTeam || 'Local';
    const away = game.awayTeam || 'Visitante';
    const cells = game.cells || {};
    const winCell = game.winningCell || '';
    const u = getCurrentUser();

    const hStyle = homeStyle || (window.resolveTeamStyle ? window.resolveTeamStyle(home) : { name: home, logo: 'img/logo.jpg', color: '#1a1a24' });
    const aStyle = awayStyle || (window.resolveTeamStyle ? window.resolveTeamStyle(away) : { name: away, logo: 'img/logo.jpg', color: '#1a1a24' });

    const isLive = game.status === 'in_progress' || game.status === 'in';
    const currentMatchMinute = isLive ? parseMatchMinute(game.clock) : null;

    // Check if current user has already selected a regular cell
    const isETKey = k => ['91_95', '96_100', '101_105', '106_110', '111_115', '116_120', '91_105', '106_120'].some(id => k.includes(id));
    let userHasRegularCell = false;
    for (const key in cells) {
      if (u && cells[key]?.playerId === u.uid && !isETKey(key)) {
        userHasRegularCell = true;
      }
    }

    const ranges = [
      { id: '0_5', min: 0, max: 5, name: '0:00 - 5:59' },
      { id: '6_10', min: 6, max: 10, name: '6:00 - 10:59' },
      { id: '11_15', min: 11, max: 15, name: '11:00 - 15:59' },
      { id: '16_20', min: 16, max: 20, name: '16:00 - 20:59' },
      { id: '21_25', min: 21, max: 25, name: '21:00 - 25:59' },
      { id: '26_30', min: 26, max: 30, name: '26:00 - 30:59' },
      { id: '31_35', min: 31, max: 35, name: '31:00 - 35:59' },
      { id: '36_40', min: 36, max: 40, name: '36:00 - 40:59' },
      { id: '41_45', min: 41, max: 45, name: '41:00 - 45:59 (+)' },
      { id: '46_50', min: 46, max: 50, name: '46:00 - 50:59' },
      { id: '51_55', min: 51, max: 55, name: '51:00 - 55:59' },
      { id: '56_60', min: 56, max: 60, name: '56:00 - 60:59' },
      { id: '61_65', min: 61, max: 65, name: '61:00 - 65:59' },
      { id: '66_70', min: 66, max: 70, name: '66:00 - 70:59' },
      { id: '71_75', min: 71, max: 75, name: '71:00 - 75:59' },
      { id: '76_80', min: 76, max: 80, name: '76:00 - 80:59' },
      { id: '81_85', min: 81, max: 85, name: '81:00 - 85:59' },
      { id: '86_90', min: 86, max: 90, name: '86:00 - 90:59 (+)' }
    ];

    let rowsHtml = '';
    ranges.forEach(r => {
      const cellHomeKey = `local_${r.id}`;
      const cellAwayKey = `away_${r.id}`;

      const homeCell = cells[cellHomeKey];
      const awayCell = cells[cellAwayKey];

      const isHomeMe = u && homeCell?.playerId === u.uid;
      const isAwayMe = u && awayCell?.playerId === u.uid;

      const isHomeWin = winCell === cellHomeKey;
      const isAwayWin = winCell === cellAwayKey;

      const isThisRangeActive = isLive && isMinuteInRange(currentMatchMinute, r.id, r.min, r.max);

      let homeClass = getCellClass(cellHomeKey, homeCell, userHasRegularCell, game, winCell);
      let awayClass = getCellClass(cellAwayKey, awayCell, userHasRegularCell, game, winCell);

      if (isThisRangeActive) {
        homeClass += ' fg-live-active-slot';
        awayClass += ' fg-live-active-slot';
      }

      const homeContent = renderCellInnerHtml(game.id, cellHomeKey, homeCell, isHomeMe, isHomeWin, hStyle);
      const awayContent = renderCellInnerHtml(game.id, cellAwayKey, awayCell, isAwayMe, isAwayWin, aStyle);

      const homeClick = homeClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${cellHomeKey}')"` : '';
      const awayClick = awayClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${cellAwayKey}')"` : '';

      const awayStyleVars = `--team-tint: ${aStyle.color}44; --team-border: ${aStyle.secondaryColor || aStyle.color};`;
      const homeStyleVars = `--team-tint: ${hStyle.color}44; --team-border: ${hStyle.secondaryColor || hStyle.color};`;

      let timeColHtml = '';
      if (isThisRangeActive) {
        timeColHtml = `
          <td class="fg-time-label-col fg-live-active-time">
            <div class="fg-live-time-content">
              <span class="fg-live-pulse-badge">🔴 EN JUEGO</span>
              <span class="fg-live-time-range">${r.name}</span>
              <span class="fg-live-min-label">⏱️ Minuto ${currentMatchMinute}'</span>
            </div>
          </td>
        `;
      } else {
        timeColHtml = `<td class="fg-time-label-col">${r.name}</td>`;
      }

      rowsHtml += `
        <tr class="${isThisRangeActive ? 'fg-live-active-row' : ''}">
          <td class="${awayClass}" style="${awayStyleVars}" ${awayClick}>${awayContent}</td>
          ${timeColHtml}
          <td class="${homeClass}" style="${homeStyleVars}" ${homeClick}>${homeContent}</td>
        </tr>
      `;
    });

    let html = `
      <div style="margin-top:14px;">
        <!-- View Mode Segmented Bar (Nombres / Fotos / Ambos) -->
        <div class="fg-view-mode-bar">
          <span class="fg-view-mode-label">👀 Ver casillas por:</span>
          <div class="fg-view-toggle-pills">
            <button type="button" class="fg-view-pill ${fgDisplayMode === 'names' ? 'active' : ''}" onclick="window.setFGDisplayMode('names')">
              👤 Nombres
            </button>
            <button type="button" class="fg-view-pill ${fgDisplayMode === 'photos' ? 'active' : ''}" onclick="window.setFGDisplayMode('photos')">
              🖼️ Fotos
            </button>
            <button type="button" class="fg-view-pill ${fgDisplayMode === 'both' ? 'active' : ''}" onclick="window.setFGDisplayMode('both')">
              🔲 Ambos
            </button>
          </div>
        </div>

        <div class="fg-board-container">
          <table class="fg-board-table">
            <thead>
              <tr>
                <th class="away" style="background:linear-gradient(135deg, ${aStyle.color}55 0%, rgba(10,15,24,0.95) 100%);">
                  ${aStyle.name} (Visitante)
                </th>
                <th style="width:110px; background:#080c14; color:#ffd100; font-size:11px;">MINUTO</th>
                <th class="local" style="background:linear-gradient(225deg, ${hStyle.color}55 0%, rgba(10,15,24,0.95) 100%);">
                  ${hStyle.name} (Local)
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

    // Extra Time Panel (5-minute blocks with added time at 105' and 120')
    if (game.activeExtraTime && u) {
      const isAllowedET = game.extraTimePlayers?.[u.uid] === true;
      if (isAllowedET) {
        let etUserHasCell = false;
        for (const k in cells) {
          if (cells[k]?.playerId === u.uid && isETKey(k)) {
            etUserHasCell = true;
          }
        }

        const etRanges = [
          { id: '91_95', min: 91, max: 95, name: '91:00 - 95:59' },
          { id: '96_100', min: 96, max: 100, name: '96:00 - 100:59' },
          { id: '101_105', min: 101, max: 105, name: '101:00 - 105:59 (+)' },
          { id: '106_110', min: 106, max: 110, name: '106:00 - 110:59' },
          { id: '111_115', min: 111, max: 115, name: '111:00 - 115:59' },
          { id: '116_120', min: 116, max: 120, name: '116:00 - 120:59 (+)' }
        ];

        let etRowsHtml = '';
        etRanges.forEach(r => {
          const keyLocal = `local_${r.id}`;
          const keyAway = `away_${r.id}`;

          const localCell = cells[keyLocal];
          const awayCell = cells[keyAway];

          const isLocalMe = u && localCell?.playerId === u.uid;
          const isAwayMe = u && awayCell?.playerId === u.uid;

          const isLocalWin = winCell === keyLocal;
          const isAwayWin = winCell === keyAway;

          const isThisETActive = isLive && isMinuteInRange(currentMatchMinute, r.id, r.min, r.max);

          let localClass = getCellClass(keyLocal, localCell, etUserHasCell, game, winCell);
          let awayClass = getCellClass(keyAway, awayCell, etUserHasCell, game, winCell);

          if (isThisETActive) {
            localClass += ' fg-live-active-slot';
            awayClass += ' fg-live-active-slot';
          }

          const localContent = renderCellInnerHtml(game.id, keyLocal, localCell, isLocalMe, isLocalWin, hStyle);
          const awayContent = renderCellInnerHtml(game.id, keyAway, awayCell, isAwayMe, isAwayWin, aStyle);

          const localClick = localClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${keyLocal}')"` : '';
          const awayClick = awayClass.includes('empty-selectable') ? `onclick="selectFGCell('${game.id}', '${keyAway}')"` : '';

          const awayStyleVars = `--team-tint: ${aStyle.color}44; --team-border: ${aStyle.secondaryColor || aStyle.color};`;
          const homeStyleVars = `--team-tint: ${hStyle.color}44; --team-border: ${hStyle.secondaryColor || hStyle.color};`;

          let etTimeColHtml = '';
          if (isThisETActive) {
            etTimeColHtml = `
              <td class="fg-time-label-col fg-live-active-time">
                <div class="fg-live-time-content">
                  <span class="fg-live-pulse-badge">🔴 EN JUEGO</span>
                  <span class="fg-live-time-range">${r.name}</span>
                  <span class="fg-live-min-label">⏱️ Minuto ${currentMatchMinute}'</span>
                </div>
              </td>
            `;
          } else {
            etTimeColHtml = `<td class="fg-time-label-col" style="color:#ff4444;">${r.name}</td>`;
          }

          etRowsHtml += `
            <tr class="${isThisETActive ? 'fg-live-active-row' : ''}">
              <td class="${awayClass}" style="${awayStyleVars}" ${awayClick}>${awayContent}</td>
              ${etTimeColHtml}
              <td class="${localClass}" style="${homeStyleVars}" ${localClick}>${localContent}</td>
            </tr>
          `;
        });

        html += `
          <div style="margin-top:16px; border-top:1.5px dashed rgba(255,255,255,0.1); padding-top:14px;">
            <h5 style="color:#ff4444; font-weight:900; font-size:13.5px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              ⚡ TIEMPOS EXTRAS (0 - 0)
            </h5>
            <p style="font-size:11.5px; color:var(--text-muted); margin-bottom:10px;">
              El partido terminó 0-0. Los jugadores aprobados pueden elegir un bloque de 5 minutos en los Tiempos Extras.
            </p>
            <div class="fg-board-container">
              <table class="fg-board-table">
                <tbody>
                  ${etRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    }

    // Penalties Shootout Panel
    if (game.activePenalties) {
      const assignments = game.penaltiesAssignments || game.penaltyAssignments || {};
      let penaltyRowsHtml = '';

      for (let i = 1; i <= 5; i++) {
        // Home
        const keyLocal = `pen_local_${i}`;
        const assignLocal = assignments[keyLocal];
        const isLocalMe = u && assignLocal?.playerId === u.uid;
        const isLocalWin = winCell === `${keyLocal}_missed`;

        let localRowClass = 'fg-penalty-row';
        if (isLocalMe) localRowClass += ' me';
        if (isLocalWin) localRowClass += ' winning-penalty';

        const pLocalPhoto = assignLocal?.photoURL || gamePlayersMap[game.id]?.[assignLocal?.playerId]?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignLocal?.nickname || 'J')}&background=ffd100&color=000&bold=true`;

        penaltyRowsHtml += `
          <div class="${localRowClass}">
            <span class="fg-penalty-num">Penal #${i} — ${home}</span>
            <span class="fg-penalty-owner ${assignLocal ? '' : 'unassigned'}" style="display:inline-flex; align-items:center; gap:6px;">
              ${assignLocal && fgDisplayMode !== 'names' ? `<img src="${pLocalPhoto}" class="fg-cell-avatar" onerror="this.src='img/logo.jpg'" alt="${assignLocal.nickname}"/>` : ''}
              ${isLocalWin ? '🏆 ' : ''}${assignLocal ? assignLocal.nickname : 'Sin Asignar'} ${isLocalMe ? '(⭐ TÚ)' : ''}
              ${isLocalWin ? ' — ¡FALLADO! (GANADOR)' : ''}
            </span>
          </div>
        `;

        // Away
        const keyAway = `pen_away_${i}`;
        const assignAway = assignments[keyAway];
        const isAwayMe = u && assignAway?.playerId === u.uid;
        const isAwayWin = winCell === `${keyAway}_missed`;

        let awayRowClass = 'fg-penalty-row';
        if (isAwayMe) awayRowClass += ' me';
        if (isAwayWin) awayRowClass += ' winning-penalty';

        const pAwayPhoto = assignAway?.photoURL || gamePlayersMap[game.id]?.[assignAway?.playerId]?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignAway?.nickname || 'J')}&background=ffd100&color=000&bold=true`;

        penaltyRowsHtml += `
          <div class="${awayRowClass}">
            <span class="fg-penalty-num">Penal #${i} — ${away}</span>
            <span class="fg-penalty-owner ${assignAway ? '' : 'unassigned'}" style="display:inline-flex; align-items:center; gap:6px;">
              ${assignAway && fgDisplayMode !== 'names' ? `<img src="${pAwayPhoto}" class="fg-cell-avatar" onerror="this.src='img/logo.jpg'" alt="${assignAway.nickname}"/>` : ''}
              ${isAwayWin ? '🏆 ' : ''}${assignAway ? assignAway.nickname : 'Sin Asignar'} ${isAwayMe ? '(⭐ TÚ)' : ''}
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
    const u = getCurrentUser();
    if (winCell === key) return 'fg-slot-cell winning-slot';
    if (cell) {
      return (u && cell.playerId === u.uid) ? 'fg-slot-cell occupied-me' : 'fg-slot-cell occupied-other';
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
    if (!db) db = window.db;
    const u = getCurrentUser();
    if (!db || !u) {
      alert('Por favor regístrate en el juego primero.');
      return;
    }

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

        const pRef = gameRef.collection('players').doc(u.uid);
        const pDoc = await transaction.get(pRef);

        if (!pDoc.exists) throw new Error('No estás registrado en este juego.');

        const player = pDoc.data();
        const isApproved = player.approved === true || player.status === 'approved';
        if (!isApproved) throw new Error('Tu registro aún no ha sido aprobado por el admin.');

        const isETKey = k => ['91_95', '96_100', '101_105', '106_110', '111_115', '116_120', '91_105', '106_120'].some(id => k.includes(id));
        const isExtraTimeCell = isETKey(cellKey);
        let regularCount = 0;
        let etCount = 0;

        for (const k in cells) {
          if (cells[k]?.playerId === u.uid) {
            if (isETKey(k)) {
              etCount++;
            } else {
              regularCount++;
            }
          }
        }

        const maxLimit = player.quota || player.maxBlocks || game.maxBlocksPerPlayer || 1;

        if (isExtraTimeCell) {
          if (game.extraTimePlayers?.[u.uid] !== true) {
            throw new Error('No estás autorizado para jugar en Tiempo Extra.');
          }
          if (etCount >= 1) throw new Error('Ya seleccionaste tu bloque de Tiempo Extra.');
        } else {
          if (regularCount >= maxLimit) {
            throw new Error(`Ya alcanzaste tu límite permitido (${maxLimit === 999 ? 'ilimitado' : maxLimit + ' bloque(s)'}) para este partido.`);
          }
        }

        const photoURL = player.photoURL || player.userPhoto || u.photoURL || localStorage.getItem('user_custom_avatar') || 'img/logo.jpg';
        const updatedCells = { ...cells };
        updatedCells[cellKey] = {
          playerId: u.uid,
          nickname: player.nickname || u.displayName || 'Socio',
          photoURL: photoURL,
          userPhoto: photoURL,
          selectedAt: Date.now()
        };

        transaction.update(gameRef, { cells: updatedCells });
      });

      alert('🎉 ¡Bloque de tiempo seleccionado y guardado exitosamente!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // WhatsApp 1-Click Game Sharing
  window.shareFirstStrikerWhatsApp = function(gameId, encHome, encAway, encDate, encTime) {
    const home = decodeURIComponent(encHome || 'Local');
    const away = decodeURIComponent(encAway || 'Visitante');
    const date = decodeURIComponent(encDate || '');
    const time = decodeURIComponent(encTime || '');

    // Use Vercel bridge for dynamic team logos preview if available
    let shareUrl;
    const bridge = window.DW_BRIDGE_URL || localStorage.getItem('dw_bridge_url');
    if (bridge) {
      const base = bridge.replace(/\/+$/, '');
      const qs = new URLSearchParams({ game: 'firstgoal', code: gameId, away, home, sport: 'soccer' });
      shareUrl = `${base}/share?${qs.toString()}`;
    } else {
      const origin = window.location.origin;
      const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      shareUrl = `${origin}${path}share-firstgoal.html?code=${encodeURIComponent(gameId)}&away=${encodeURIComponent(away)}&home=${encodeURIComponent(home)}`;
    }

    const msg = `🏆 *¡ÚNETE A FIRST STRIKER WINS EN DRINKS & WINS!* ⚽🔥\n\n` +
      `🥊 *${away} vs ${home}*\n` +
      `🗓️ *Fecha:* ${date || 'Próximo partido'} ${time ? '• ' + time + ' hrs' : ''}\n\n` +
      `🎯 ¡Aparta tu bloque de 5 minutos del 1er gol y gana premios en tu mesa!\n\n` +
      `📲 *Juega en vivo aquí:* ${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
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
        let url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${g.eventId}`;
        let res = await fetch(url);
        if (!res.ok) {
          res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/concacaf.leagues.cup/summary?event=${g.eventId}`);
        }
        if (!res.ok) {
          res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/summary?event=${g.eventId}`);
        }
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

  window.openFGHowToPlayModal = function() {
    const modal = document.getElementById('fgHowToPlayModal');
    if (modal) {
      modal.classList.add('active');
    }
  };

  window.closeFGHowToPlayModal = function() {
    const modal = document.getElementById('fgHowToPlayModal');
    if (modal) {
      modal.classList.remove('active');
    }
  };

  if (!liveSyncInterval) {
    liveSyncInterval = setInterval(syncActiveGamesESPN, 35000);
  }

  initFirstGoal();
})();

