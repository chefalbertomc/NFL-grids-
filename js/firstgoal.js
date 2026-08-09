// First Goal Module for Wings & Wins
(function() {
  'use strict';

  let db = null;
  let user = null;

  const firstGoalGamesList = document.getElementById('firstGoalGamesList');
  const myFirstGoalBets = document.getElementById('myFirstGoalBets');

  let activeGames = [];
  let userBets = {}; // { gameId: betObj }

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
        loadUserBets();
      } else {
        userBets = {};
        renderActiveGames();
        if (myFirstGoalBets) {
          myFirstGoalBets.innerHTML = '<div class="text-center hint-text py-2">Inicia sesión con Google para ver tus apuestas.</div>';
        }
      }
    });
  }

  async function loadActiveGames() {
    if (!db) return;

    try {
      // Listen to active first goal games in real time
      db.collection('first_goal_games')
        .where('active', '==', true)
        .onSnapshot(snap => {
          activeGames = [];
          snap.forEach(doc => {
            const data = doc.data() || {};
            activeGames.push({
              id: doc.id,
              ...data
            });
          });

          renderActiveGames();
        }, err => {
          console.error('[firstgoal] Error listening to active games:', err);
        });
    } catch (err) {
      console.error('[firstgoal] Init error:', err);
    }
  }

  async function loadUserBets() {
    if (!db || !user) return;

    try {
      db.collection('first_goal_bets')
        .where('playerId', '==', user.uid)
        .onSnapshot(snap => {
          userBets = {};
          snap.forEach(doc => {
            const data = doc.data() || {};
            if (data.gameId) {
              userBets[data.gameId] = {
                id: doc.id,
                ...data
              };
            }
          });

          renderActiveGames();
          renderUserBetsHistory();
        }, err => {
          console.error('[firstgoal] Error listening to user bets:', err);
        });
    } catch (err) {
      console.error('[firstgoal] Bets load error:', err);
    }
  }

  function renderActiveGames() {
    if (!firstGoalGamesList) return;
    firstGoalGamesList.innerHTML = '';

    if (activeGames.length === 0) {
      firstGoalGamesList.innerHTML = '<div class="text-center hint-text py-4">No hay partidos activos para apuestas de primer gol en este momento.</div>';
      return;
    }

    activeGames.forEach(game => {
      const userBet = userBets[game.id];
      const card = document.createElement('div');
      card.className = 'card';
      card.style.background = 'rgba(255,255,255,0.02)';
      card.style.border = userBet ? '1px solid var(--success-color)' : '1px solid var(--border-color)';

      // Generate HTML for options
      const options = game.options || ['Jugador A', 'Jugador B', 'Otro', 'Nadie'];
      let optionsHtml = '';
      
      options.forEach(opt => {
        const isSelected = userBet && userBet.optionSelected === opt;
        optionsHtml += `
          <button class="btn btn-secondary ${isSelected ? 'btn-primary' : ''}" 
                  data-game-id="${game.id}" data-opt="${opt}" 
                  ${userBet ? 'disabled' : ''}
                  style="font-size: 13px; padding: 8px 12px; margin-bottom: 6px; text-align: left; justify-content: flex-start;">
            ${isSelected ? '✅ ' : ''}${opt}
          </button>
        `;
      });

      card.innerHTML = `
        <div class="flex-between" style="margin-bottom: 12px;">
          <h4 style="font-size: 16px;">${game.gameName || 'Partido'}</h4>
          ${userBet 
            ? '<span class="badge success">Apuesta Registrada</span>' 
            : '<span class="badge accent">Apuestas Abiertas</span>'
          }
        </div>
        
        <div class="flex-row" style="flex-direction: column; gap: 4px; margin-bottom: 12px;">
          <label>¿Quién anotará el primer gol / touchdown?</label>
          ${optionsHtml}
        </div>

        ${!userBet ? `
          <div class="flex-row" style="margin-top: 8px;">
            <input type="text" id="table_${game.id}" placeholder="Número de Mesa" style="flex: 1; padding: 10px; font-size: 13px;"/>
            <button class="btn btn-primary" data-submit-bet="${game.id}" style="width: auto; padding: 10px 20px; font-size: 13px;">
              Guardar Apuesta
            </button>
          </div>
          <p id="bet_status_${game.id}" class="hint-text mt-2 text-center" style="font-weight: 600;"></p>
        ` : `
          <div class="hint-text mt-2" style="color: var(--success-color); font-weight: bold; text-align: center;">
            Apostaste por: ${userBet.optionSelected} (Mesa ${userBet.table || '—'})
          </div>
        `}
      `;

      firstGoalGamesList.appendChild(card);
    });

    // Add listeners to option click (if not already bet)
    firstGoalGamesList.querySelectorAll('button[data-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.getAttribute('data-game-id');
        const opt = btn.getAttribute('data-opt');
        
        // Temporarily store selection on the button element attribute for the submit button to read
        const card = btn.closest('.card');
        card.setAttribute('data-selected-option', opt);
        
        // Highlight chosen option
        card.querySelectorAll('button[data-opt]').forEach(b => {
          b.classList.remove('btn-primary');
          if (b.getAttribute('data-opt') === opt) {
            b.classList.add('btn-primary');
          }
        });
      });
    });

    // Add listener to submit button
    firstGoalGamesList.querySelectorAll('[data-submit-bet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.getAttribute('data-submit-bet');
        const card = btn.closest('.card');
        const opt = card.getAttribute('data-selected-option');
        const tableInput = document.getElementById(`table_${gameId}`);
        const statusEl = document.getElementById(`bet_status_${gameId}`);
        
        const table = tableInput ? tableInput.value.trim() : '';

        submitBet(gameId, opt, table, statusEl);
      });
    });
  }

  async function submitBet(gameId, option, table, statusEl) {
    if (!db || !user) {
      alert('Inicia sesión con Google para registrar tu apuesta.');
      return;
    }

    if (!option) {
      if (statusEl) {
        statusEl.textContent = 'Selecciona una opción de la lista.';
        statusEl.style.color = 'var(--danger-color)';
      }
      return;
    }

    if (!table) {
      if (statusEl) {
        statusEl.textContent = 'Por favor escribe tu número de mesa.';
        statusEl.style.color = 'var(--danger-color)';
      }
      return;
    }

    if (statusEl) {
      statusEl.textContent = 'Enviando apuesta...';
      statusEl.style.color = 'var(--text-muted)';
    }

    try {
      const betId = `${gameId}_${user.uid}`;
      await db.collection('first_goal_bets').doc(betId).set({
        gameId: gameId,
        playerId: user.uid,
        nickname: user.displayName || user.email.split('@')[0],
        optionSelected: option,
        table: table,
        timestamp: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      });

      if (statusEl) {
        statusEl.textContent = '¡Apuesta registrada exitosamente!';
        statusEl.style.color = 'var(--success-color)';
      }
    } catch (err) {
      console.error('[firstgoal] Error saving bet:', err);
      if (statusEl) {
        statusEl.textContent = 'Error: ' + err.message;
        statusEl.style.color = 'var(--danger-color)';
      }
    }
  }

  function renderUserBetsHistory() {
    if (!myFirstGoalBets) return;
    myFirstGoalBets.innerHTML = '';

    const betKeys = Object.keys(userBets);

    if (betKeys.length === 0) {
      myFirstGoalBets.innerHTML = '<div class="text-center hint-text py-2">No has hecho apuestas hoy.</div>';
      return;
    }

    betKeys.forEach(k => {
      const bet = userBets[k];
      const gameObj = activeGames.find(g => g.id === bet.gameId);
      
      const row = document.createElement('div');
      row.className = 'flex-between';
      row.style.padding = '10px 12px';
      row.style.background = 'rgba(255,255,255,0.02)';
      row.style.border = '1px solid var(--border-color)';
      row.style.borderRadius = '10px';

      row.innerHTML = `
        <div>
          <span style="font-weight: 700; color: var(--accent-color); block;">
            ${gameObj ? gameObj.gameName : 'Partido'}
          </span>
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
            Tu elección: ${bet.optionSelected} (Mesa ${bet.table || '—'})
          </div>
        </div>
        <div>
          ${gameObj && gameObj.winner ? (
            gameObj.winner === bet.optionSelected 
              ? '<span class="badge success">Ganaste</span>' 
              : '<span class="badge danger">Perdiste</span>'
          ) : '<span class="badge">Pendiente</span>'}
        </div>
      `;

      myFirstGoalBets.appendChild(row);
    });
  }

  // Start initialization
  initFirstGoal();
})();
