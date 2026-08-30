// Survivor Module for Drinks & Wins (Multi-Tournament Architecture & Matrix Leaderboard)
(function() {
  'use strict';

  let db = null;
  let user = null;
  let activeTournaments = [];
  let currentTournamentId = null;
  let currentTournament = null;
  let tournamentPlayers = {}; // { [playerId]: playerData }
  let unsubTournament = null;
  let unsubPlayers = null;

  // Filter state for Matrix Grid
  let matrixStatusFilter = 'all'; // 'all', 'alive', 'elim'
  let matrixDisplayMode = localStorage.getItem('bww_surv_display_mode') || 'both'; // 'both', 'names', 'photos'

  const NFL_TEAMS = [
    { abbr: 'ARI', name: 'Arizona Cardinals', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', color: '#97233F' },
    { abbr: 'ATL', name: 'Atlanta Falcons', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', color: '#a71930' },
    { abbr: 'BAL', name: 'Baltimore Ravens', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', color: '#241773' },
    { abbr: 'BUF', name: 'Buffalo Bills', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', color: '#00338D' },
    { abbr: 'CAR', name: 'Carolina Panthers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', color: '#0085CA' },
    { abbr: 'CHI', name: 'Chicago Bears', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', color: '#0B162A' },
    { abbr: 'CIN', name: 'Cincinnati Bengals', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', color: '#FB4F14' },
    { abbr: 'CLE', name: 'Cleveland Browns', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', color: '#311D00' },
    { abbr: 'DAL', name: 'Dallas Cowboys', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', color: '#041E42' },
    { abbr: 'DEN', name: 'Denver Broncos', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', color: '#FB4F14' },
    { abbr: 'DET', name: 'Detroit Lions', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', color: '#0076B6' },
    { abbr: 'GB',  name: 'Green Bay Packers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', color: '#203731' },
    { abbr: 'HOU', name: 'Houston Texans', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', color: '#03202F' },
    { abbr: 'IND', name: 'Indianapolis Colts', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', color: '#002C5F' },
    { abbr: 'JAX', name: 'Jacksonville Jaguars', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', color: '#006778' },
    { abbr: 'KC',  name: 'Kansas City Chiefs', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', color: '#E31837' },
    { abbr: 'LV',  name: 'Las Vegas Raiders', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', color: '#000000' },
    { abbr: 'LAC', name: 'Los Angeles Chargers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', color: '#0080C6' },
    { abbr: 'LAR', name: 'Los Angeles Rams', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', color: '#003594' },
    { abbr: 'MIA', name: 'Miami Dolphins', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', color: '#008E97' },
    { abbr: 'MIN', name: 'Minnesota Vikings', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', color: '#4F2683' },
    { abbr: 'NE',  name: 'New England Patriots', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', color: '#002244' },
    { abbr: 'NO',  name: 'New Orleans Saints', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', color: '#D3BC8D' },
    { abbr: 'NYG', name: 'New York Giants', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', color: '#0B2265' },
    { abbr: 'NYJ', name: 'New York Jets', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', color: '#125740' },
    { abbr: 'PHI', name: 'Philadelphia Eagles', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', color: '#004C54' },
    { abbr: 'PIT', name: 'Pittsburgh Steelers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', color: '#FFB612' },
    { abbr: 'SF',  name: 'San Francisco 49ers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', color: '#AA0000' },
    { abbr: 'SEA', name: 'Seattle Seahawks', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', color: '#002244' },
    { abbr: 'TB',  name: 'Tampa Bay Buccaneers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', color: '#D50A0A' },
    { abbr: 'TEN', name: 'Tennessee Titans', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', color: '#0C2340' },
    { abbr: 'WSH', name: 'Washington Commanders', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', color: '#5A1414' }
  ];

  const LIGAMX_TEAMS = [
    { abbr: 'AME', name: 'América', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/227.png', color: '#ff6600' },
    { abbr: 'GDL', name: 'Guadalajara', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/219.png', color: '#c70000' },
    { abbr: 'CAZ', name: 'Cruz Azul', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/218.png', color: '#0044aa' },
    { abbr: 'PUM', name: 'Pumas UNAM', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/233.png', color: '#152438' },
    { abbr: 'TIG', name: 'Tigres UANL', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/232.png', color: '#f39c12' },
    { abbr: 'MTY', name: 'Monterrey', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/220.png', color: '#0f2042' },
    { abbr: 'TOL', name: 'Toluca', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/223.png', color: '#c0392b' },
    { abbr: 'SAN', name: 'Santos Laguna', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/225.png', color: '#27ae60' },
    { abbr: 'PAC', name: 'Pachuca', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/234.png', color: '#2980b9' },
    { abbr: 'LEO', name: 'León', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/228.png', color: '#1e824c' },
    { abbr: 'ATL', name: 'Atlas', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/216.png', color: '#b71c1c' },
    { abbr: 'PUE', name: 'Puebla', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/231.png', color: '#2980b9' },
    { abbr: 'QRO', name: 'Querétaro', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/222.png', color: '#2c3e50' },
    { abbr: 'TIJ', name: 'Tijuana', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/10125.png', color: '#96281b' },
    { abbr: 'NEC', name: 'Necaxa', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/229.png', color: '#d35400' },
    { abbr: 'ASL', name: 'Atlético San Luis', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/15720.png', color: '#c0392b' },
    { abbr: 'JUA', name: 'Juárez', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/17851.png', color: '#27ae60' }
  ];

  function getCurrentUser() {
    if (user && user.uid) return user;
    if (window.currentUser && window.currentUser.uid) return window.currentUser;
    const fbUser = window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : null;
    return fbUser || null;
  }

  function initSurvivor() {
    if (window.db) {
      db = window.db;
      setupAuthListener();
      loadTournaments();
    } else {
      setTimeout(initSurvivor, 100);
    }
  }

  function setupAuthListener() {
    if (window.onAuthChange) {
      window.onAuthChange(currentUser => {
        user = currentUser;
        renderSurvivorApp();
      });
    }
  }

  function loadTournaments() {
    if (!db) return;
    db.collection('survivors').orderBy('createdAt', 'desc').onSnapshot(snap => {
      activeTournaments = [];
      snap.forEach(doc => {
        activeTournaments.push({ id: doc.id, ...doc.data() });
      });

      // Check URL query param for tournament code or ID
      const urlParams = new URLSearchParams(window.location.search);
      const paramCode = (urlParams.get('code') || urlParams.get('s') || '').trim().toUpperCase();

      if (paramCode) {
        const foundByCode = activeTournaments.find(t => (t.code && t.code.toUpperCase() === paramCode) || t.id === paramCode);
        if (foundByCode) {
          currentTournamentId = foundByCode.id;
        }
      }

      if (activeTournaments.length > 0) {
        if (!currentTournamentId || !activeTournaments.some(t => t.id === currentTournamentId)) {
          currentTournamentId = activeTournaments[0].id;
        }
        selectTournament(currentTournamentId);
      } else {
        currentTournament = null;
        renderSurvivorApp();
      }
    }, err => {
      console.error('[Survivor] Error loading tournaments:', err);
    });
  }

  function selectTournament(tournId) {
    currentTournamentId = tournId;
    currentTournament = activeTournaments.find(t => t.id === tournId) || null;

    if (unsubTournament) unsubTournament();
    if (unsubPlayers) unsubPlayers();

    if (!tournId || !db) return;

    unsubTournament = db.collection('survivors').doc(tournId).onSnapshot(doc => {
      if (doc.exists) {
        currentTournament = { id: doc.id, ...doc.data() };
        renderSurvivorApp();
      }
    });

    unsubPlayers = db.collection('survivors').doc(tournId).collection('players').onSnapshot(snap => {
      tournamentPlayers = {};
      snap.forEach(pDoc => {
        tournamentPlayers[pDoc.id] = { id: pDoc.id, ...pDoc.data() };
      });
      renderSurvivorApp();
    });
  }

  window.selectSurvivorTournament = function(tournId) {
    selectTournament(tournId);
  };

  // Join Tournament with Private Code Prompt
  window.promptJoinWithCode = function() {
    const code = prompt('🔑 Ingresa el Código de Acceso del Torneo Survivor (Ej. SURV26):');
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    const found = activeTournaments.find(t => (t.code && t.code.toUpperCase() === cleanCode) || t.id === cleanCode);
    if (found) {
      window.selectSurvivorTournament(found.id);
      setTimeout(() => {
        const joinBox = document.getElementById('survJoinSection');
        if (joinBox) joinBox.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      alert(`❌ No se encontró ningún torneo con el código "${cleanCode}". Verifica con tu mesero.`);
    }
  };

  window.setSurvFilter = function(filter) {
    matrixStatusFilter = filter;
    renderSurvivorApp();
  };

  window.setSurvDisplayMode = function(mode) {
    matrixDisplayMode = mode;
    localStorage.setItem('bww_surv_display_mode', mode);
    renderSurvivorApp();
  };

  // Main Render Routine
  function renderSurvivorApp() {
    const container = document.getElementById('tab-survivor');
    if (!container) return;

    if (activeTournaments.length === 0) {
      container.innerHTML = `
        <section class="card text-center py-5">
          <span style="font-size:40px;">🏆</span>
          <h3 style="color:#ffd100; margin-top:10px;">No hay Torneos Survivor Activos</h3>
          <p class="hint-text">Pide a tu mesero o administrador que inicie un nuevo torneo Survivor para participar.</p>
        </section>
        <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v215.1</span></footer>
      `;
      return;
    }

    const t = currentTournament || activeTournaments[0];
    const u = getCurrentUser();
    const myPlayer = u ? (tournamentPlayers[u.uid] || Object.values(tournamentPlayers).find(p => p.id === u.uid || p.uid === u.uid)) : null;
    const isJoined = !!myPlayer;
    const isApproved = myPlayer ? (myPlayer.status !== 'rejected' && myPlayer.approved !== false) : false;
    const maxLives = t.maxLives || 3;
    const myLives = myPlayer ? (myPlayer.lives !== undefined ? myPlayer.lives : (myPlayer.isAlive !== false ? maxLives : 0)) : maxLives;
    const isAlive = myPlayer ? (myPlayer.isAlive !== false && myLives > 0) : false;
    const activeWeek = t.activeWeek || 1;
    const totalWeeks = t.totalWeeks || 18;

    // Get previous picked teams for no-repeat rule
    const previousUsedTeams = {};
    if (myPlayer && myPlayer.picks) {
      Object.keys(myPlayer.picks).forEach(wKey => {
        const wNum = parseInt(wKey, 10);
        if (wNum < activeWeek) {
          const p = myPlayer.picks[wKey];
          if (p) {
            if (p.team) previousUsedTeams[p.team.toUpperCase()] = wNum;
            if (p.teamName) previousUsedTeams[p.teamName.toUpperCase()] = wNum;
          }
        }
      });
    }

    const currentPick = myPlayer?.picks?.[activeWeek];

    // Tournament Selector Header & Private Code Button
    let selectorHtml = '';
    const opts = activeTournaments.map(trn => `
      <option value="${trn.id}" ${trn.id === t.id ? 'selected' : ''}>
        ${trn.name} [${trn.store || 'General'}] • Sem. ${trn.activeWeek || 1}/${trn.totalWeeks || 18} (Código: ${trn.code || 'SURV'})
      </option>
    `).join('');

    selectorHtml = `
      <div style="margin-bottom:12px; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:14px; border:1px solid rgba(255,255,255,0.08); display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <div style="flex:1; min-width:200px;">
          <label style="font-size:11px; font-weight:800; color:#ffd100; display:block; margin-bottom:3px;">Torneo Survivor Seleccionado:</label>
          <select onchange="window.selectSurvivorTournament(this.value)" style="font-size:13px; font-weight:800; width:100%; margin:0;">
            ${opts}
          </select>
        </div>
        <button type="button" class="btn btn-secondary" onclick="window.promptJoinWithCode()" style="width:auto; padding:8px 12px; font-size:11.5px; font-weight:900; border-color:#ffd100; color:#ffd100; display:inline-flex; align-items:center; gap:5px; height:40px; margin-top:auto;">
          <span>🔑</span> Unirme con Código
        </button>
      </div>
    `;

    // Hero Status Card
    const heartIcons = '❤️'.repeat(myLives) + '🖤'.repeat(Math.max(0, maxLives - myLives));
    let heroBadgeHtml = '';

    if (!u) {
      heroBadgeHtml = `<span class="badge" style="background:rgba(255,255,255,0.1); color:#fff;">👤 Inicia Sesión para Jugar</span>`;
    } else if (!isJoined) {
      heroBadgeHtml = `<span class="badge accent">📝 Sin Registrar</span>`;
    } else if (!isApproved) {
      heroBadgeHtml = `<span class="badge" style="background:rgba(255,193,7,0.2); color:#ffc107; border:1px solid #ffc107; font-weight:900;">⌛ Solicitud Pendiente</span>`;
    } else if (isAlive) {
      heroBadgeHtml = `<span class="surv-live-badge"><span class="pulse-dot" style="background:#00e676;"></span> ${heartIcons} ${myLives}/${maxLives} VIDAS</span>`;
    } else {
      heroBadgeHtml = `<span class="surv-elim-badge">💀 ELIMINADO (0 Vidas)</span>`;
    }

    let pickHeroHtml = '';
    if (isJoined && !isApproved) {
      pickHeroHtml = `
        <div class="surv-hero-current-pick" style="border-color:#ffc107; background:rgba(255,193,7,0.08);">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">⏳</span>
            <div>
              <div style="font-size:12px; color:#ffc107; font-weight:800;">Solicitud enviada a ${t.name}</div>
              <p style="margin:2px 0 0 0; font-size:11px; color:#ddd;">Tu registro está esperando aprobación del administrador o mesero. En cuanto seas aceptado recibirás tus ${maxLives} vidas ❤️.</p>
            </div>
          </div>
        </div>
      `;
    } else if (isJoined && isApproved && isAlive) {
      if (currentPick && currentPick.team) {
        pickHeroHtml = `
          <div class="surv-hero-current-pick">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${currentPick.logo || 'img/logo.jpg'}" style="width:32px; height:32px; object-fit:contain;" onerror="this.src='img/logo.jpg'"/>
              <div>
                <div style="font-size:10px; color:var(--text-muted); font-weight:800;">TU PICK SEMANA ${activeWeek}:</div>
                <strong style="color:#ffffff; font-size:14px;">${currentPick.teamName || currentPick.team}</strong>
              </div>
            </div>
            <span class="badge success" style="font-size:10px; font-weight:900;">✓ REGISTRADO</span>
          </div>
        `;
      } else {
        pickHeroHtml = `
          <div class="surv-hero-current-pick" style="border-color:#ffd100; background:rgba(255,209,0,0.06);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:18px;">⚠️</span>
              <div style="font-size:12px; color:#ffd100; font-weight:800;">¡Aún no seleccionas tu equipo para la Semana ${activeWeek}! Tienes ${myLives} vidas ❤️</div>
            </div>
          </div>
        `;
      }
    } else if (isJoined && isApproved && !isAlive) {
      pickHeroHtml = `
        <div class="surv-hero-current-pick" style="border-color:#ff0033; background:rgba(255,0,51,0.08);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">💀</span>
            <div style="font-size:12px; color:#ff4444; font-weight:800;">Has perdido tus ${maxLives} vidas. ¡Suerte en el próximo torneo!</div>
          </div>
        </div>
      `;
    }

    // Join Section (if not yet joined)
    let joinSectionHtml = '';
    if (u && !isJoined) {
      const defaultName = u.displayName || '';
      joinSectionHtml = `
        <section id="survJoinSection" class="card" style="border:1.5px solid #ffd100; background:linear-gradient(135deg, rgba(255,209,0,0.08) 0%, rgba(10,15,24,0.95) 100%); margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <h4 style="color:#ffd100; font-weight:950; font-size:15px; margin:0; display:flex; align-items:center; gap:6px;">
              <span>🎟️</span> Unirme a ${t.name}
            </h4>
            <span class="badge" style="background:rgba(255,209,0,0.15); color:#ffd100; font-size:10px; font-weight:900;">
              ❤️ ${maxLives} Vidas Iniciales
            </span>
          </div>
          <p class="hint-text" style="font-size:11.5px; margin-bottom:12px;">
            Ingresa tu apodo y mesa para registrarte en el torneo. Código del Torneo: <strong style="color:#fff;">${t.code || 'SURV'}</strong>
          </p>

          <div class="form-group" style="margin-bottom:10px;">
            <label style="font-size:11px;">Tu Apodo / Nombre de Jugador</label>
            <input type="text" id="survJoinNickname" value="${defaultName}" placeholder="Ej. El Champion" style="font-weight:800; font-size:14px;"/>
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label style="font-size:11px;">Mesero / Mesa</label>
            <input type="text" id="survJoinWaiter" placeholder="Ej. Carlos / Mesa 4" style="font-weight:700;"/>
          </div>

          <button type="button" class="btn btn-primary" onclick="window.joinSurvivorTournament('${t.id}')" style="font-weight:900; font-size:13.5px;">
            ¡Entrar al Torneo (${maxLives} Vidas)! 🔥
          </button>
        </section>
      `;
    }

    // Pick Selector Grid (if player is alive and approved)
    let pickSectionHtml = '';
    if (isJoined && isApproved && isAlive) {
      const isWeekLocked = !!t.locked;
      const teamsList = t.sport === 'soccer' ? LIGAMX_TEAMS : NFL_TEAMS;
      
      let teamCardsHtml = '';
      teamsList.forEach(tm => {
        const keyAbbr = (tm.abbr || '').toUpperCase();
        const keyName = (tm.name || '').toUpperCase();
        const usedInWeek = previousUsedTeams[keyAbbr] || previousUsedTeams[keyName];
        const isUsed = usedInWeek !== undefined;
        const isSelected = currentPick && (currentPick.team === tm.abbr || currentPick.team === tm.name);

        let cardClass = 'surv-team-card';
        if (isUsed || isWeekLocked) cardClass += ' used-team';
        if (isSelected) cardClass += ' selected';

        const clickAttr = (isUsed || isWeekLocked) ? '' : `onclick="window.selectWeeklySurvivorTeam('${t.id}', '${tm.abbr}', '${tm.name}', '${tm.logo}', '${tm.color}')"`;

        teamCardsHtml += `
          <div class="${cardClass}" style="--team-bg: ${tm.color}33; ${isUsed ? 'opacity: 0.35; filter: grayscale(100%); pointer-events: none;' : ''}" ${clickAttr}>
            ${isUsed ? `<span class="surv-used-badge" style="background:#ff3333; color:#ffffff; font-weight:900;">🔒 Usado Sem. ${usedInWeek}</span>` : ''}
            ${isSelected ? `<span class="surv-selected-check">✓</span>` : ''}
            <img src="${tm.logo}" class="surv-team-logo" alt="${tm.name}" onerror="this.src='img/logo.jpg'"/>
            <span class="surv-team-name">${tm.name}</span>
          </div>
        `;
      });

      pickSectionHtml = `
        <section class="card highlight" style="margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:4px;">
            <h4 style="margin:0; font-size:15px; font-weight:950; color:#ffd100; display:flex; align-items:center; gap:6px;">
              <span>🎯</span> Selecciona tu Pick para la Semana ${activeWeek}
            </h4>
            <span class="badge" style="background:rgba(255,255,255,0.08); font-size:10px; color:#bbb;">Regla: 1 Solo Equipo por Torneo</span>
          </div>
          ${isWeekLocked ? `
            <div style="font-size:12px; color:#ffd100; font-weight:900; padding:10px 14px; background:rgba(255,209,0,0.12); border-radius:10px; border:1px solid rgba(255,209,0,0.3); margin-bottom:10px; display:flex; align-items:center; gap:8px;">
              <span>🔒</span> <span>Picks BLOQUEADOS para la Semana ${activeWeek}. ¡El primer partido ya ha iniciado! Todos los logos de los participantes son ahora visibles en la tabla.</span>
            </div>
          ` : `
            <p class="hint-text" style="font-size:11.5px; margin-bottom:8px;">Toca un equipo para elegirlo. Tus elecciones son privadas con 🔒 hasta que inicie el primer partido de la semana.</p>
          `}

          <div class="surv-team-picker-grid">
            ${teamCardsHtml}
          </div>
        </section>
      `;
    }

    // Leaderboard Matrix Grid (The exact reference image visual table!)
    const matrixHtml = buildSurvivorMatrixHtml(t, activeWeek, totalWeeks, u);

    container.innerHTML = `
      ${selectorHtml}

      <!-- Hero Card -->
      <section class="surv-hero-card">
        <div class="surv-hero-badge-bar">
          <div>
            <h3 style="margin:0; font-size:18px; font-weight:950; color:#ffffff; letter-spacing:-0.3px;">${t.name}</h3>
            <div style="font-size:11.5px; color:#ffd100; font-weight:800; margin-top:2px;">
              🔑 Código: <strong>${t.code || 'SURV'}</strong> • 📍 Sucursal: ${t.store || 'General'} • 📅 Sem. ${activeWeek}/${totalWeeks}
            </div>
          </div>
          <div>${heroBadgeHtml}</div>
        </div>
        ${pickHeroHtml}
      </section>

      ${joinSectionHtml}
      ${pickSectionHtml}

      <!-- Full Matrix Grid Section -->
      <section class="card" style="padding:14px 10px;">
        <div class="surv-matrix-header-bar">
          <div>
            <h4 style="margin:0; font-size:15px; font-weight:950; color:#ffffff; display:flex; align-items:center; gap:6px;">
              <span>📊</span> Tabla de Resultados Survivor
            </h4>
            <p class="hint-text" style="margin:0; font-size:11px;">Celdas verdes = Victoria • Celdas rojas = Derrota (Pierde 1 Vida ❤️) • Con 0 Vidas = 💀 Eliminado</p>
          </div>

          <!-- Controls: Filters & Display Mode -->
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <!-- Alive / Elim Filter -->
            <div class="surv-filter-group">
              <button type="button" class="surv-filter-btn ${matrixStatusFilter === 'all' ? 'active' : ''}" onclick="window.setSurvFilter('all')">👥 Todos</button>
              <button type="button" class="surv-filter-btn ${matrixStatusFilter === 'alive' ? 'active' : ''}" onclick="window.setSurvFilter('alive')">🟢 Vivos</button>
              <button type="button" class="surv-filter-btn ${matrixStatusFilter === 'elim' ? 'active' : ''}" onclick="window.setSurvFilter('elim')">🔴 Eliminados</button>
            </div>

            <!-- View Mode: Names / Photos / Both -->
            <div class="surv-filter-group">
              <button type="button" class="surv-filter-btn ${matrixDisplayMode === 'names' ? 'active' : ''}" onclick="window.setSurvDisplayMode('names')" title="Solo Nombres">👤 Nombres</button>
              <button type="button" class="surv-filter-btn ${matrixDisplayMode === 'photos' ? 'active' : ''}" onclick="window.setSurvDisplayMode('photos')" title="Solo Fotos">🖼️ Fotos</button>
              <button type="button" class="surv-filter-btn ${matrixDisplayMode === 'both' ? 'active' : ''}" onclick="window.setSurvDisplayMode('both')" title="Nombres y Fotos">🔲 Ambos</button>
            </div>
          </div>
        </div>

        ${matrixHtml}
      </section>

      <!-- Tab Footer Version Indicator -->
      <footer class="tab-footer-version">
        <span>DRINKS & WINS</span> • <span class="ver">v215.9</span>
      </footer>
    `;
  }

  // Build the Survivor Matrix Table HTML (Matching user's reference image with Lives)
  function buildSurvivorMatrixHtml(tourn, activeWeek, totalWeeks, currentUser) {
    const maxLives = tourn.maxLives || 3;
    const isWeekLocked = !!tourn.locked;
    const players = Object.values(tournamentPlayers).filter(p => p.status !== 'rejected' && p.approved !== false);

    if (players.length === 0) {
      return `<div class="hint-text text-center py-4">Aún no hay participantes aprobados en este torneo.</div>`;
    }

    // Apply Filter
    let filteredPlayers = players;
    if (matrixStatusFilter === 'alive') {
      filteredPlayers = players.filter(p => p.isAlive !== false && (p.lives === undefined || p.lives > 0));
    } else if (matrixStatusFilter === 'elim') {
      filteredPlayers = players.filter(p => p.isAlive === false || p.lives === 0);
    }

    // Sort: most lives first, then points desc
    filteredPlayers.sort((a, b) => {
      const livesA = a.lives !== undefined ? a.lives : (a.isAlive !== false ? maxLives : 0);
      const livesB = b.lives !== undefined ? b.lives : (b.isAlive !== false ? maxLives : 0);
      if (livesB !== livesA) return livesB - livesA;
      return (b.totalPoints || 0) - (a.totalPoints || 0);
    });

    // Build Table Header (Player + Week 1..maxWeeks + Total Score)
    const displayWeeksCount = Math.max(activeWeek, Math.min(totalWeeks, 18));
    let weekThs = '';
    for (let w = 1; w <= displayWeeksCount; w++) {
      weekThs += `<th class="surv-col-week" style="${w === activeWeek ? 'color:#00e676; border-bottom-color:#00e676;' : ''}">${w}</th>`;
    }

    let rowsHtml = '';
    filteredPlayers.forEach(p => {
      const isMe = currentUser && (p.id === currentUser.uid || p.uid === currentUser.uid || p.docId === currentUser.uid);
      const lives = p.lives !== undefined ? p.lives : (p.isAlive !== false ? maxLives : 0);
      const isAlive = p.isAlive !== false && lives > 0;
      const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;

      let cellsHtml = '';
      for (let w = 1; w <= displayWeeksCount; w++) {
        const pick = p.picks?.[w];
        if (pick && pick.team) {
          const res = pick.result || (w < activeWeek ? 'loss' : (w === activeWeek ? 'live' : 'pending'));
          const diffText = pick.diff !== undefined ? (pick.diff > 0 ? `+${pick.diff}` : `${pick.diff}`) : '';
          
          // Ocultar la elección de la semana activa a otros jugadores (privacidad) mientras no esté evaluada ni bloqueada
          const isEvaluated = (pick.result === 'win' || pick.result === 'loss' || pick.result === 'no_pick');
          const isHiddenPick = (w === activeWeek && !isMe && !isEvaluated && !isWeekLocked);

          if (isHiddenPick) {
            cellsHtml += `
              <td>
                <div class="surv-pick-cell live" title="Pick registrado (Oculto para los demás)">
                  <span style="font-size:13px;" title="Pick Oculto">🔒</span>
                </div>
              </td>
            `;
          } else {
            let cellClass = 'surv-pick-cell';
            if (res === 'win') cellClass += ' win';
            else if (res === 'loss' || res === 'no_pick') cellClass += ' loss';
            else if (res === 'live') cellClass += ' live';
            else cellClass += ' pending';

            cellsHtml += `
              <td>
                <div class="${cellClass}">
                  <img src="${pick.logo || 'img/logo.jpg'}" class="surv-pick-logo" alt="${pick.team}" onerror="this.src='img/logo.jpg'"/>
                  ${diffText ? `<span class="surv-pick-pts">${diffText}</span>` : ''}
                </div>
              </td>
            `;
          }
        } else {
          cellsHtml += `<td><div class="surv-pick-cell empty">—</div></td>`;
        }
      }

      // Player Name & Avatar cell based on matrixDisplayMode
      let playerDisplayHtml = '';
      if (matrixDisplayMode === 'photos') {
        playerDisplayHtml = `
          <div class="surv-player-badge" style="justify-content:center;">
            <img src="${photoSrc}" class="surv-player-avatar ${isAlive ? 'alive' : 'elim'}" onerror="this.src='img/logo.jpg'" alt="${p.nickname}"/>
          </div>
        `;
      } else if (matrixDisplayMode === 'names') {
        playerDisplayHtml = `
          <div class="surv-player-badge">
            <div style="display:flex; flex-direction:column;">
              <span class="surv-player-name ${isMe ? 'me' : ''}">${p.nickname || p.playerName} ${isMe ? '(TÚ)' : ''}</span>
              ${!isAlive ? '<span style="font-size:9.5px; color:#ff3333; margin-top:2px;">💀 Eliminado</span>' : ''}
            </div>
          </div>
        `;
      } else {
        // Both
        playerDisplayHtml = `
          <div class="surv-player-badge">
            <img src="${photoSrc}" class="surv-player-avatar ${isAlive ? 'alive' : 'elim'}" onerror="this.src='img/logo.jpg'" alt="${p.nickname}"/>
            <div style="display:flex; flex-direction:column; text-align:left;">
              <span class="surv-player-name ${isMe ? 'me' : ''}">${p.nickname || p.playerName} ${isMe ? '(TÚ)' : ''}</span>
              ${!isAlive ? '<span style="font-size:9.5px; color:#ff3333; margin-top:2px;">💀 Eliminado</span>' : ''}
            </div>
          </div>
        `;
      }

      rowsHtml += `
        <tr style="${isMe ? 'background:rgba(255,209,0,0.06);' : ''}">
          <td class="surv-td-player">
            ${playerDisplayHtml}
          </td>
          ${cellsHtml}
          <td class="surv-td-total" style="font-size:13px; font-weight:900; color:#ffd100;">${isAlive ? `❤️ ${lives}/${maxLives}` : '💀 0'}</td>
        </tr>
      `;
    });

    return `
      <div class="surv-matrix-wrap">
        <table class="surv-matrix-table">
          <thead>
            <tr>
              <th class="surv-th-player">Participante</th>
              ${weekThs}
              <th style="width:85px; color:#ffd100;">Vidas</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // Join Tournament Handler
  window.joinSurvivorTournament = async function(tournId) {
    const u = getCurrentUser();
    if (!u) {
      alert('Por favor inicia sesión con Google primero.');
      return;
    }

    const t = currentTournament || activeTournaments.find(trn => trn.id === tournId);
    const maxLives = t ? (t.maxLives || 3) : 3;

    const nickInp = document.getElementById('survJoinNickname');
    const waiterInp = document.getElementById('survJoinWaiter');

    const nickname = nickInp ? nickInp.value.trim() : (u.displayName || 'Socio');
    const waiter = waiterInp ? waiterInp.value.trim() : 'Mesa Directa';

    if (!nickname) {
      alert('Por favor ingresa un apodo para participar.');
      return;
    }

    const autoApprove = t ? t.autoApprove !== false : true;
    const photoURL = u.photoURL || localStorage.getItem('user_custom_avatar') || 'img/logo.jpg';

    try {
      await db.collection('survivors').doc(tournId).collection('players').doc(u.uid).set({
        id: u.uid,
        playerId: u.uid,
        userUid: u.uid,
        userEmail: u.email || '',
        playerName: u.displayName || nickname,
        nickname: nickname,
        waiter: waiter,
        photoURL: photoURL,
        userPhoto: photoURL,
        status: autoApprove ? 'approved' : 'pending',
        approved: autoApprove,
        isAlive: true,
        lives: maxLives,
        eliminatedWeek: null,
        totalPoints: 0,
        picks: {},
        joinedAt: Date.now()
      }, { merge: true });

      alert(autoApprove ? `🎉 ¡Te has unido a ${t.name} con ${maxLives} Vidas! Ya puedes seleccionar tu equipo.` : '⌛ Solicitud enviada al mesero o administrador para su aprobación.');
    } catch (err) {
      alert('Error al unirse: ' + err.message);
    }
  };

  // Select Weekly Team Pick Handler
  window.selectWeeklySurvivorTeam = async function(tournId, teamAbbr, teamName, logo, color) {
    const u = getCurrentUser();
    if (!u) return;

    if (!currentTournament) return;
    const activeWeek = currentTournament.activeWeek || 1;

    if (currentTournament.locked) {
      alert(`🔒 La Semana ${activeWeek} está bloqueada porque ya iniciaron los partidos. No se pueden modificar selecciones.`);
      return;
    }

    try {
      await db.collection('survivors').doc(tournId).collection('players').doc(u.uid).update({
        [`picks.${activeWeek}`]: {
          team: teamAbbr,
          teamName: teamName,
          logo: logo,
          color: color,
          result: 'pending',
          pickedAt: Date.now()
        }
      });
      console.log(`[Survivor] Pick guardado: ${teamName} para Semana ${activeWeek}`);
    } catch (err) {
      alert('Error al guardar pick: ' + err.message);
    }
  };

  // Initialize
  initSurvivor();
})();
