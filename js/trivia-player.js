// Trivia Mobile Player Module for Drinks & Wins (Crowdpurr / Kahoot Style)
(function() {
  'use strict';

  let db = null;
  let user = null;
  let activeGames = [];
  let currentTriviaId = null;
  let currentTrivia = null;
  let myPlayerDoc = null;
  let allPlayers = [];
  let unsubGame = null;
  let unsubMyPlayer = null;
  let unsubAllPlayers = null;
  let mobileTimerInterval = null;
  let mobileCountdownInterval = null;
  let renderedMobilePhaseKey = null;

  function getCurrentUser() {
    if (user && user.uid) return user;
    if (window.currentUser && window.currentUser.uid) return window.currentUser;
    const fbUser = window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : null;
    return fbUser || null;
  }

  function initTriviaPlayer() {
    if (window.db) {
      db = window.db;
      setupAuthListener();
      loadActiveTriviaGames();
    } else {
      setTimeout(initTriviaPlayer, 100);
    }
  }

  function setupAuthListener() {
    if (window.onAuthChange) {
      window.onAuthChange(currentUser => {
        user = currentUser;
        renderedMobilePhaseKey = null;
        renderTriviaMobile();
      });
    }
  }

  function loadActiveTriviaGames() {
    if (!db) return;
    try {
      db.collection('trivia_games').onSnapshot(snap => {
        activeGames = [];
        snap.forEach(doc => {
          activeGames.push({ id: doc.id, ...doc.data() });
        });

        // In-memory sort
        activeGames.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Check if there is a PIN specified in URL hash or query params
        const hashPinMatch = window.location.hash.match(/pin=(\d+)/);
        const queryPinMatch = new URLSearchParams(window.location.search).get('pin');
        const targetPin = queryPinMatch || (hashPinMatch ? hashPinMatch[1] : null);

        if (activeGames.length > 0) {
          if (targetPin) {
            const found = activeGames.find(g => String(g.pin) === String(targetPin));
            if (found) currentTriviaId = found.id;
          }

          if (!currentTriviaId || !activeGames.some(g => g.id === currentTriviaId)) {
            // Select the most recent active game
            currentTriviaId = activeGames[0].id;
          }
          listenToCurrentTrivia(currentTriviaId);
        } else {
          currentTriviaId = null;
          currentTrivia = null;
          renderedMobilePhaseKey = null;
          renderTriviaMobile();
        }
      }, err => {
        console.error('[TriviaPlayer] Error loading active games:', err);
        renderTriviaMobile();
      });
    } catch (e) {
      console.error('[TriviaPlayer] Init error:', e);
    }
  }

  function listenToCurrentTrivia(gId) {
    if (!db || !gId) return;

    if (unsubGame) unsubGame();
    if (unsubMyPlayer) unsubMyPlayer();
    if (unsubAllPlayers) unsubAllPlayers();

    // 1. Listen to game state
    unsubGame = db.collection('trivia_games').doc(gId).onSnapshot(doc => {
      if (!doc.exists) return;
      currentTrivia = { id: doc.id, ...doc.data() };
      renderTriviaMobile();
    });

    // 2. Listen to my player doc
    const u = getCurrentUser();
    if (u && u.uid) {
      unsubMyPlayer = db.collection('trivia_games').doc(gId).collection('players').doc(u.uid).onSnapshot(pDoc => {
        if (pDoc.exists) {
          myPlayerDoc = { id: pDoc.id, ...pDoc.data() };
        } else {
          myPlayerDoc = null;
        }
        renderTriviaMobile();
      });
    }

    // 3. Listen to all players for leaderboard ranking
    unsubAllPlayers = db.collection('trivia_games').doc(gId).collection('players').onSnapshot(snap => {
      allPlayers = [];
      snap.forEach(p => allPlayers.push({ id: p.id, ...p.data() }));
      renderTriviaMobile();
    });
  }

  window.selectTriviaMobileGame = function(gId) {
    currentTriviaId = gId;
    renderedMobilePhaseKey = null;
    listenToCurrentTrivia(gId);
  };

  // Main Render Routine for Mobile (Flicker-Free, No Interval Resets)
  function renderTriviaMobile() {
    const container = document.getElementById('tab-trivia');
    if (!container) return;

    if (activeGames.length === 0) {
      renderedMobilePhaseKey = 'no_games';
      container.innerHTML = `
        <section class="card text-center py-5">
          <span style="font-size:44px;">🧠</span>
          <h3 style="color:#ffd100; margin-top:10px;">No hay Trivias en Vivo</h3>
          <p class="hint-text">El mesero o el host iniciará una trivia en las pantallas del bar muy pronto.</p>
        </section>
        <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v198.0</span></footer>
      `;
      return;
    }

    const g = currentTrivia || activeGames[0];
    const u = getCurrentUser();
    const isJoined = !!myPlayerDoc;
    const status = g.status || 'lobby';
    const currIdx = g.currentQuestionIndex || 0;

    // Calculate player rank in room
    const sorted = [...allPlayers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const myRankIdx = sorted.findIndex(p => p.id === (u ? u.uid : ''));
    const myRank = myRankIdx >= 0 ? myRankIdx + 1 : 1;
    const totalScore = myPlayerDoc?.totalScore || 0;

    const phaseKey = `${g.id}_${status}_${currIdx}_${isJoined}_${u ? u.uid : 'anon'}`;

    // If already in this exact phase, perform only surgical UI state updates
    if (renderedMobilePhaseKey === phaseKey) {
      // Update score in hero
      const scoreEl = document.getElementById('triviaMobileHeroScore');
      if (scoreEl) scoreEl.textContent = `⭐ ${totalScore} PTS`;

      // Update question answered state if in question phase
      if (status === 'question') {
        const myAnswer = myPlayerDoc?.answers?.[currIdx];
        if (myAnswer) {
          ['a', 'b', 'c', 'd'].forEach(letter => {
            const btn = document.getElementById(`btnMobileChoice_${letter.toUpperCase()}`);
            if (btn) {
              if (letter.toUpperCase() === myAnswer.choice) {
                btn.classList.add('selected');
                btn.classList.remove('disabled');
              } else {
                btn.classList.add('disabled');
                btn.classList.remove('selected');
              }
            }
          });
          const fbBox = document.getElementById('triviaMobileAnswerSubmittedBox');
          if (fbBox) fbBox.style.display = 'block';
        }
      }
      return;
    }

    renderedMobilePhaseKey = phaseKey;

    // 1. Not Logged In Screen
    if (!u) {
      container.innerHTML = `
        <section class="card text-center py-5">
          <span style="font-size:48px;">🧠</span>
          <h2 style="color:#ffd100; margin-top:8px; font-family:'Outfit', sans-serif;">Trivia en Vivo Drinks & Wins</h2>
          <p class="hint-text" style="font-size:13px; max-width:320px; margin:8px auto 20px auto;">
            Inicia sesión con tu cuenta de Google en 1 clic para participar en la trivia de las pantallas del bar.
          </p>
          <button type="button" class="btn btn-primary" onclick="if(window.loginWithGoogle) window.loginWithGoogle();" style="font-size:15px; font-weight:900;">
            🚀 Entrar con Google
          </button>
        </section>
        <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v198.0</span></footer>
      `;
      return;
    }

    // 2. Not Joined Room Screen
    if (!isJoined) {
      const defaultNick = (u.displayName || 'Socio').split(' ')[0];
      container.innerHTML = `
        <section class="card highlight" style="border:2px solid #ffd100;">
          <div style="text-align:center; margin-bottom:14px;">
            <span class="badge" style="background:#ffd100; color:#000; font-size:12px; font-weight:900;">PIN: ${g.pin || '----'}</span>
            <h3 style="color:#ffffff; margin:8px 0 4px 0; font-size:18px; font-family:'Outfit', sans-serif;">${g.title}</h3>
            <p class="hint-text" style="font-size:12px; margin:0;">📍 ${g.store || 'Sucursal'} • ${g.timePerQuestion || 8}s por pregunta</p>
          </div>

          <div class="form-group" style="margin-bottom:10px;">
            <label style="font-size:11px;">Tu Apodo / Nombre en Pantalla*</label>
            <input type="text" id="trivJoinNickname" value="${defaultNick}" placeholder="Ej. Alex, Beto, Campeón" style="font-weight:800; font-size:14px;"/>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label style="font-size:11px;">Mesa / Mesero</label>
            <input type="text" id="trivJoinWaiter" placeholder="Ej. Mesa 3 / Memo" style="font-weight:700;"/>
          </div>

          <button type="button" class="btn btn-primary" onclick="window.joinTriviaGame('${g.id}')" style="font-weight:900; font-size:14px;">
            ¡Unirme a la Trivia en Vivo! 🔥
          </button>
        </section>
        <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v198.0</span></footer>
      `;
      return;
    }

    // Header Hero for Active Mobile Player
    const playerHeroHtml = `
      <div class="trivia-mobile-hero">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${myPlayerDoc.photoURL || 'img/logo.jpg'}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid #ffd100;" onerror="this.src='img/logo.jpg'"/>
            <div style="text-align:left;">
              <strong style="color:#ffffff; font-size:14px;">${myPlayerDoc.nickname || myPlayerDoc.playerName}</strong>
              <div style="font-size:10px; color:var(--text-muted);">Puesto #${myRank} de ${sorted.length}</div>
            </div>
          </div>
          <div id="triviaMobileHeroScore" class="trivia-score-pill">
            <span>⭐ ${totalScore}</span> <span style="font-size:10px; opacity:0.8;">PTS</span>
          </div>
        </div>
      </div>
    `;

    // Render phase specific mobile view
    let phaseContentHtml = '';

    if (status === 'lobby') {
      phaseContentHtml = `
        <section class="card text-center py-4" style="border:1.5px dashed rgba(255,209,0,0.4);">
          <span style="font-size:36px; animation: tvGlowPulse 1.5s infinite;">⏳</span>
          <h4 style="color:#ffd100; margin-top:10px;">¡Estás Conectado a la Trivia!</h4>
          <p class="hint-text" style="font-size:13px; line-height:1.4;">
            Mira la pantalla del restaurante. En cuanto inicie la trivia, aparecerá la cuenta regresiva y tus 4 botones de respuesta aquí.
          </p>
          <div style="font-size:12px; color:#00e676; font-weight:800; margin-top:12px;">
            ✓ Sala Lista • Esperando Inicio...
          </div>
        </section>
      `;
    } else if (status === 'countdown') {
      const startTime = g.countdownStartTime || Date.now();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      phaseContentHtml = `
        <section class="card text-center py-4" style="border:2px solid #ffd100; background:rgba(0,0,0,0.6); box-shadow:0 0 25px rgba(255,209,0,0.3);">
          <div style="font-size:13px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:1.5px;">⚡ ¡PREPÁRATE! ⚡</div>
          <h3 style="color:#ffffff; margin:6px 0 10px 0; font-size:20px; font-weight:950;">LA TRIVIA COMIENZA EN:</h3>
          <div id="mobileCountdownNum" style="font-size:72px; font-weight:950; color:#ffd100; line-height:1; font-family:'Outfit', sans-serif;">${remaining}</div>
          <p class="hint-text" style="font-size:12.5px; margin-top:10px; color:#00e676; font-weight:800;">
            ¡Tus 4 botones de respuesta aparecerán al llegar a 0! 🚀
          </p>
        </section>
      `;
    } else if (status === 'question') {
      phaseContentHtml = renderMobileQuestionPhase(g, u);
    } else if (status === 'reveal') {
      phaseContentHtml = renderMobileRevealPhase(g, u, myRank, sorted.length);
    } else if (status === 'leaderboard') {
      phaseContentHtml = renderMobileLeaderboardPhase(g, u, sorted);
    } else if (status === 'podium' || status === 'finished') {
      phaseContentHtml = renderMobilePodiumPhase(g, u, myRank, totalScore);
    }

    container.innerHTML = `
      ${playerHeroHtml}
      ${phaseContentHtml}
      <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v198.0</span></footer>
    `;

    // Start live countdown or question progress bar
    if (status === 'countdown') {
      startMobileCountdown(g);
    } else if (status === 'question') {
      if (mobileCountdownInterval) clearInterval(mobileCountdownInterval);
      startMobileTimerBar(g);
    } else {
      if (mobileCountdownInterval) clearInterval(mobileCountdownInterval);
      if (mobileTimerInterval) clearInterval(mobileTimerInterval);
    }
  }

  function startMobileCountdown(game) {
    if (mobileCountdownInterval) clearInterval(mobileCountdownInterval);
    const clockEl = document.getElementById('mobileCountdownNum');
    const startTime = game.countdownStartTime || Date.now();

    mobileCountdownInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      if (clockEl) clockEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(mobileCountdownInterval);
      }
    }, 150);
  }

  // Mobile Question Phase (Question Text + 4 Giant Touch Buttons)
  function renderMobileQuestionPhase(game, currentUser) {
    const currIdx = game.currentQuestionIndex || 0;
    const totalQ = (game.questions || []).length || 10;
    const q = game.questions?.[currIdx] || {};

    const myAnswer = myPlayerDoc?.answers?.[currIdx];
    const hasAnswered = !!myAnswer;

    return `
      <!-- Timer Bar -->
      <div class="trivia-mobile-timer-bar-wrap">
        <div id="triviaMobileTimerBar" class="trivia-mobile-timer-bar"></div>
      </div>

      <!-- Question Card -->
      <div class="trivia-mobile-q-card">
        <div class="trivia-mobile-q-num">Pregunta ${currIdx + 1} de ${totalQ}</div>
        <div class="trivia-mobile-q-text">${q.q || ''}</div>
      </div>

      <!-- Answer Confirmation Box -->
      <div id="triviaMobileAnswerSubmittedBox" style="display:${hasAnswered ? 'block' : 'none'}; background:rgba(255,209,0,0.1); border:1.5px solid #ffd100; border-radius:14px; padding:14px; text-align:center; margin-bottom:12px;">
        <span style="font-size:22px;">✓</span>
        <h4 style="color:#ffd100; margin:2px 0;">¡Respuesta Registrada!</h4>
        <p class="hint-text" style="font-size:12px; margin:0;">Elegiste la opción <strong>[${myAnswer?.choice || ''}]</strong>. Mira la TV para los resultados.</p>
      </div>

      <!-- 4 Giant Thumb Buttons -->
      <div class="trivia-buttons-grid">
        <button type="button" id="btnMobileChoice_A" class="trivia-btn-choice btn-a ${myAnswer?.choice === 'A' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'A')">
          <span class="trivia-btn-letter">🔴 A</span>
          <span class="trivia-btn-text">${q.a || ''}</span>
        </button>

        <button type="button" id="btnMobileChoice_B" class="trivia-btn-choice btn-b ${myAnswer?.choice === 'B' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'B')">
          <span class="trivia-btn-letter">🔵 B</span>
          <span class="trivia-btn-text">${q.b || ''}</span>
        </button>

        <button type="button" id="btnMobileChoice_C" class="trivia-btn-choice btn-c ${myAnswer?.choice === 'C' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'C')">
          <span class="trivia-btn-letter">🟡 C</span>
          <span class="trivia-btn-text">${q.c || ''}</span>
        </button>

        <button type="button" id="btnMobileChoice_D" class="trivia-btn-choice btn-d ${myAnswer?.choice === 'D' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'D')">
          <span class="trivia-btn-letter">🟢 D</span>
          <span class="trivia-btn-text">${q.d || ''}</span>
        </button>
      </div>
    `;
  }

  function startMobileTimerBar(game) {
    if (mobileTimerInterval) clearInterval(mobileTimerInterval);
    const bar = document.getElementById('triviaMobileTimerBar');
    if (!bar) return;

    const timeLimit = game.timePerQuestion || 8;
    const startTime = game.questionStartTime || Date.now();

    mobileTimerInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const fraction = Math.max(0, Math.min(1, 1 - (elapsed / timeLimit)));
      if (bar) bar.style.width = `${fraction * 100}%`;

      if (fraction <= 0) {
        clearInterval(mobileTimerInterval);
      }
    }, 100);
  }

  // Mobile Reveal Phase (Correct / Incorrect Card with Points Feedback)
  function renderMobileRevealPhase(game, currentUser, rank, totalPlayers) {
    if (mobileTimerInterval) clearInterval(mobileTimerInterval);
    const currIdx = game.currentQuestionIndex || 0;
    const q = game.questions?.[currIdx] || {};
    const correct = (q.correct || 'A').toUpperCase();

    const myAnswer = myPlayerDoc?.answers?.[currIdx];
    const isCorrect = myAnswer ? myAnswer.isCorrect === true : false;
    const pointsEarned = myAnswer ? (myAnswer.pointsEarned || 0) : 0;

    let cardClass = isCorrect ? 'correct' : 'incorrect';
    let feedbackIcon = isCorrect ? '🎉' : '❌';
    let feedbackTitle = isCorrect ? '¡RESPUESTA CORRECTA!' : '¡RESPUESTA INCORRECTA!';

    return `
      <div class="trivia-feedback-card ${cardClass}">
        <span style="font-size:44px;">${feedbackIcon}</span>
        <h3 style="font-size:20px; font-weight:950; color:#ffffff; margin:6px 0;">${feedbackTitle}</h3>
        <div style="font-size:18px; font-weight:950; color:${isCorrect ? '#00e676' : '#ff0033'}; margin-bottom:10px;">
          ${isCorrect ? `+${pointsEarned} Puntos Ganados` : '+0 Puntos'}
        </div>
        <p style="font-size:13px; color:#e0e0e0; line-height:1.35; margin:0;">
          La respuesta correcta es <strong>[${correct}]</strong>.
        </p>
        ${q.exp ? `<div style="font-size:11.5px; color:#ffd100; margin-top:8px;">💡 ${q.exp}</div>` : ''}
      </div>

      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; text-align:center;">
        <div style="font-size:11px; color:var(--text-muted);">TU POSICIÓN EN LA TABLA</div>
        <strong style="font-size:18px; color:#ffd100;">Puesto #${rank} de ${totalPlayers} Jugadores</strong>
      </div>
    `;
  }

  // Mobile Leaderboard Phase
  function renderMobileLeaderboardPhase(game, currentUser, sortedPlayers) {
    if (mobileTimerInterval) clearInterval(mobileTimerInterval);
    let topRows = '';
    sortedPlayers.slice(0, 5).forEach((p, idx) => {
      const isMe = currentUser && p.id === currentUser.uid;
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      topRows += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-radius:10px; margin-bottom:6px; background:${isMe ? 'rgba(255,209,0,0.15)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isMe ? '#ffd100' : 'rgba(255,255,255,0.08)'};">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${medals[idx] || '#' + (idx + 1)}</span>
            <strong style="color:${isMe ? '#ffd100' : '#fff'}; font-size:13px;">${p.nickname || p.playerName} ${isMe ? '(TÚ)' : ''}</strong>
          </div>
          <span style="font-weight:900; color:#ffd100; font-size:13px;">${p.totalScore || 0} pts</span>
        </div>
      `;
    });

    return `
      <section class="card highlight">
        <h4 style="color:#ffd100; font-size:15px; font-weight:950; margin-bottom:10px; text-align:center;">
          📊 Top 5 en Vivo
        </h4>
        <div>
          ${topRows}
        </div>
      </section>
    `;
  }

  // Mobile Podium Phase
  function renderMobilePodiumPhase(game, currentUser, rank, totalScore) {
    if (mobileTimerInterval) clearInterval(mobileTimerInterval);
    const isWinner = rank === 1;
    const isTop3 = rank <= 3;

    return `
      <div class="trivia-feedback-card ${isWinner ? 'correct' : (isTop3 ? 'correct' : '')}" style="background:linear-gradient(135deg, rgba(255,209,0,0.2) 0%, rgba(15,20,30,0.95) 100%); border:2px solid #ffd100;">
        <span style="font-size:48px;">${isWinner ? '👑' : (isTop3 ? '🏆' : '🎉')}</span>
        <h2 style="font-size:22px; font-weight:950; color:#ffd100; margin:6px 0;">
          ${isWinner ? '¡ERES EL CAMPEÓN DE LA TRIVIA!' : (isTop3 ? `¡FELICIDADES! ¡QUEDASTE EN EL PUESTO #${rank}!` : `¡GRACIAS POR JUGAR!`)}
        </h2>
        <div style="font-size:26px; font-weight:950; color:#ffffff; margin:8px 0;">
          ${totalScore} Puntos Totales
        </div>
        <p class="hint-text" style="font-size:13px; margin:0;">
          ${isWinner ? '¡Pide tu premio o cortesía con el mesero del bar!' : 'Sigue participando en los próximos juegos en vivo.'}
        </p>
      </div>
    `;
  }

  // Join Handler
  window.joinTriviaGame = async function(gameId) {
    const u = getCurrentUser();
    if (!u) {
      if (window.loginWithGoogle) window.loginWithGoogle();
      return;
    }

    const nickInp = document.getElementById('trivJoinNickname');
    const waiterInp = document.getElementById('trivJoinWaiter');

    const nickname = nickInp ? nickInp.value.trim() : (u.displayName || 'Socio');
    const waiter = waiterInp ? waiterInp.value.trim() : 'Mesa Directa';

    if (!nickname) {
      alert('Por favor escribe tu apodo para jugar.');
      return;
    }

    const photoURL = u.photoURL || localStorage.getItem('user_custom_avatar') || 'img/logo.jpg';

    try {
      await db.collection('trivia_games').doc(gameId).collection('players').doc(u.uid).set({
        id: u.uid,
        playerId: u.uid,
        userEmail: u.email || '',
        playerName: u.displayName || nickname,
        nickname: nickname,
        waiter: waiter,
        photoURL: photoURL,
        userPhoto: photoURL,
        totalScore: 0,
        answers: {},
        joinedAt: Date.now()
      }, { merge: true });

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (err) {
      alert('Error al unirse: ' + err.message);
    }
  };

  // Submit Answer Handler
  window.submitTriviaMobileAnswer = async function(gameId, questionIndex, choiceKey) {
    const u = getCurrentUser();
    if (!u || !currentTrivia) return;

    // Check if already answered
    if (myPlayerDoc?.answers?.[questionIndex]) return;

    // Immediate optimistic UI update
    ['a', 'b', 'c', 'd'].forEach(letter => {
      const btn = document.getElementById(`btnMobileChoice_${letter.toUpperCase()}`);
      if (btn) {
        if (letter.toUpperCase() === choiceKey) {
          btn.classList.add('selected');
        } else {
          btn.classList.add('disabled');
        }
      }
    });
    const fbBox = document.getElementById('triviaMobileAnswerSubmittedBox');
    if (fbBox) fbBox.style.display = 'block';

    // Haptic feedback for tactile thumb feel
    if (navigator.vibrate) navigator.vibrate(50);

    const q = currentTrivia.questions?.[questionIndex] || {};
    const correct = (q.correct || 'A').toUpperCase();
    const isCorrect = choiceKey.toUpperCase() === correct;

    const timeLimit = currentTrivia.timePerQuestion || 8;
    const startTime = currentTrivia.questionStartTime || Date.now();
    const responseTimeMs = Math.max(100, Date.now() - startTime);

    // Calculate Points with Kahoot/Crowdpurr speed formula (500 to 1000 pts)
    let pointsEarned = 0;
    if (isCorrect) {
      const timeLimitMs = timeLimit * 1000;
      const speedFactor = Math.max(0, Math.min(1, 1 - (responseTimeMs / (timeLimitMs * 2))));
      pointsEarned = Math.round(1000 * speedFactor);
      if (pointsEarned < 500) pointsEarned = 500;
    }

    try {
      const pRef = db.collection('trivia_games').doc(gameId).collection('players').doc(u.uid);
      await db.runTransaction(async tx => {
        const pDoc = await tx.get(pRef);
        const pData = pDoc.exists ? pDoc.data() : {};
        const answers = pData.answers || {};

        if (answers[questionIndex]) return; // Already answered

        answers[questionIndex] = {
          choice: choiceKey,
          isCorrect: isCorrect,
          pointsEarned: pointsEarned,
          responseTimeMs: responseTimeMs,
          answeredAt: Date.now()
        };

        const currentTotal = pData.totalScore || 0;
        const newTotal = currentTotal + pointsEarned;

        tx.update(pRef, {
          answers: answers,
          totalScore: newTotal
        });
      });
    } catch (err) {
      console.error('[TriviaPlayer] Error saving answer:', err);
    }
  };

  // Initialize
  initTriviaPlayer();
})();
