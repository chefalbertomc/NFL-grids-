// Pools (Quinielas) Module for Wings & Wins
(function() {
  'use strict';

  let db = null;
  let user = null;
  const ACTIVE_WEEK = 'week_1'; // Active week ID

  const poolStatus = document.getElementById('poolStatus');
  const poolGamesList = document.getElementById('poolGamesList');
  const btnSavePool = document.getElementById('btnSavePool');
  const poolLeaderboard = document.getElementById('poolLeaderboard');

  let currentPredictions = {}; // { matchId: 'home' | 'away' }
  let weekMatches = [];

  const DEFAULT_MATCHES = [
    { id: 'm1', home: 'Kansas City Chiefs', away: 'Baltimore Ravens', date: 'Sept 7, 7:20 PM' },
    { id: 'm2', home: 'Philadelphia Eagles', away: 'Green Bay Packers', date: 'Sept 8, 7:15 PM' },
    { id: 'm3', home: 'Dallas Cowboys', away: 'Cleveland Browns', date: 'Sept 10, 3:25 PM' },
    { id: 'm4', home: 'New York Giants', away: 'Minnesota Vikings', date: 'Sept 10, 12:00 PM' },
    { id: 'm5', home: 'San Francisco 49ers', away: 'New York Jets', date: 'Sept 11, 7:15 PM' }
  ];

  function initPools() {
    if (window.db) {
      db = window.db;
      setupListeners();
      loadWeekData();
      loadLeaderboard();
    } else {
      setTimeout(initPools, 100);
    }
  }

  function setupListeners() {
    window.onAuthChange((currentUser, isAdmin) => {
      user = currentUser;
      
      if (user) {
        if (poolStatus) {
          poolStatus.textContent = '¡Sesión activa! Haz tus elecciones y guarda tu quiniela.';
          poolStatus.style.color = 'var(--success-color)';
        }
        if (btnSavePool) btnSavePool.disabled = false;
        loadUserPredictions();
      } else {
        if (poolStatus) {
          poolStatus.textContent = 'Inicia sesión con Google para guardar tu quiniela.';
          poolStatus.style.color = 'var(--text-muted)';
        }
        if (btnSavePool) btnSavePool.disabled = true;
        currentPredictions = {};
        renderMatches();
      }
    });

    if (btnSavePool) {
      btnSavePool.addEventListener('click', savePredictions);
    }
  }

  async function loadWeekData() {
    if (!db) return;
    
    try {
      const doc = await db.collection('pools').doc(ACTIVE_WEEK).get();
      
      if (doc.exists) {
        weekMatches = doc.data().matches || DEFAULT_MATCHES;
      } else {
        // Auto-create active week with default matches if it doesn't exist
        weekMatches = DEFAULT_MATCHES;
        try {
          await db.collection('pools').doc(ACTIVE_WEEK).set({
            id: ACTIVE_WEEK,
            name: 'Semana 1',
            matches: DEFAULT_MATCHES,
            createdAt: Date.now(),
            active: true
          });
        } catch (e) {
          console.log('[pools] Could not auto-create pool doc (expected if Firestore rules restrict writes):', e);
        }
      }

      renderMatches();
    } catch (err) {
      console.error('[pools] Error loading pool data:', err);
      weekMatches = DEFAULT_MATCHES;
      renderMatches();
    }
  }

  function renderMatches() {
    if (!poolGamesList) return;
    poolGamesList.innerHTML = '';

    weekMatches.forEach(match => {
      const selected = currentPredictions[match.id];
      const matchRow = document.createElement('div');
      matchRow.className = 'card';
      matchRow.style.padding = '12px';
      matchRow.style.margin = '0 0 10px 0';
      matchRow.style.background = 'var(--card-bg-hover)';

      matchRow.innerHTML = `
        <div class="text-center hint-text" style="font-size: 11px; margin-bottom: 8px;">
          ${match.date}
        </div>
        <div class="flex-row" style="justify-content: space-between; align-items: center;">
          <!-- Away Team -->
          <button class="btn btn-secondary ${selected === 'away' ? 'btn-primary' : ''}" 
                  data-match="${match.id}" data-pick="away" 
                  style="flex: 1; font-size: 13px; padding: 10px 6px;">
            ${match.away}
          </button>
          
          <span style="font-weight: 800; color: var(--text-muted); font-size: 14px;">@</span>
          
          <!-- Home Team -->
          <button class="btn btn-secondary ${selected === 'home' ? 'btn-primary' : ''}" 
                  data-match="${match.id}" data-pick="home" 
                  style="flex: 1; font-size: 13px; padding: 10px 6px;">
            ${match.home}
          </button>
        </div>
      `;

      poolGamesList.appendChild(matchRow);
    });

    // Add click event listeners to team buttons
    poolGamesList.querySelectorAll('[data-match]').forEach(btn => {
      btn.addEventListener('click', () => {
        const matchId = btn.getAttribute('data-match');
        const pick = btn.getAttribute('data-pick');
        
        currentPredictions[matchId] = pick;
        
        // Redraw to show selected active styling
        renderMatches();
      });
    });
  }

  async function loadUserPredictions() {
    if (!db || !user) return;
    
    try {
      const doc = await db.collection('pools').doc(ACTIVE_WEEK)
        .collection('predictions').doc(user.uid).get();
        
      if (doc.exists) {
        currentPredictions = doc.data().selections || {};
        renderMatches();
      }
    } catch (err) {
      console.error('[pools] Error loading user predictions:', err);
    }
  }

  async function savePredictions() {
    if (!db || !user) return;
    
    // Check if user answered all matches
    const answeredCount = Object.keys(currentPredictions).length;
    if (answeredCount < weekMatches.length) {
      alert(`Por favor elige el ganador de todos los partidos (${answeredCount}/${weekMatches.length} completados).`);
      return;
    }

    if (btnSavePool) btnSavePool.disabled = true;
    if (poolStatus) poolStatus.textContent = 'Guardando tus pronósticos...';

    try {
      await db.collection('pools').doc(ACTIVE_WEEK)
        .collection('predictions').doc(user.uid).set({
          playerId: user.uid,
          nickname: user.displayName || user.email.split('@')[0],
          selections: currentPredictions,
          points: 0, // Admin updates points when games finish
          updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
        });

      if (poolStatus) {
        poolStatus.textContent = '¡Quiniela guardada exitosamente!';
        poolStatus.style.color = 'var(--success-color)';
      }
      
      // Reload leaderboard
      loadLeaderboard();
    } catch (err) {
      console.error('[pools] Error saving predictions:', err);
      if (poolStatus) {
        poolStatus.textContent = 'Error al guardar: ' + err.message;
        poolStatus.style.color = 'var(--danger-color)';
      }
    } finally {
      if (btnSavePool) btnSavePool.disabled = false;
    }
  }

  async function loadLeaderboard() {
    if (!db || !poolLeaderboard) return;

    try {
      const snap = await db.collection('pools').doc(ACTIVE_WEEK)
        .collection('predictions').orderBy('points', 'desc').limit(20).get();
      
      poolLeaderboard.innerHTML = '';
      
      if (snap.empty) {
        poolLeaderboard.innerHTML = '<div class="text-center hint-text py-2">No hay pronósticos registrados todavía esta semana.</div>';
        return;
      }

      let rank = 1;
      snap.forEach(doc => {
        const d = doc.data() || {};
        const isUser = user && doc.id === user.uid;

        const row = document.createElement('div');
        row.className = 'flex-between';
        row.style.padding = '8px 12px';
        row.style.background = isUser ? 'var(--accent-glow)' : 'rgba(255,255,255,0.02)';
        row.style.border = isUser ? '1px solid var(--accent-color)' : '1px solid var(--border-color)';
        row.style.borderRadius = '10px';

        row.innerHTML = `
          <div class="flex-row">
            <span style="font-weight: 800; color: ${rank === 1 ? 'var(--accent-color)' : 'var(--text-muted)'}; min-width: 24px;">
              #${rank}
            </span>
            <span style="font-weight: 600; color: ${isUser ? 'var(--accent-color)' : 'var(--text-color)'};">
              ${d.nickname || 'Anónimo'} ${isUser ? ' (Tú)' : ''}
            </span>
          </div>
          <span class="badge success" style="font-size: 12px;">
            ${d.points || 0} pts
          </span>
        `;

        poolLeaderboard.appendChild(row);
        rank++;
      });
    } catch (err) {
      console.error('[pools] Leaderboard load error:', err);
      if (poolLeaderboard) {
        poolLeaderboard.innerHTML = '<div class="text-center hint-text py-2">Clasificación se actualizará pronto.</div>';
      }
    }
  }

  // Start initialization
  initPools();
})();
