// Mobile Player Engine for Trivia en Vivo (Drinks & Wins)
(function() {
  'use strict';

  let db = null;
  let activeGames = [];
  let currentTriviaId = null;
  let currentTrivia = null;
  let myPlayerDoc = null;
  let allPlayers = [];
  let unsubGame = null;
  let unsubMyPlayer = null;
  let unsubAllPlayers = null;
  let mobileTickerInterval = null;
  let renderedMobilePhaseKey = null;

  function getCurrentUser() {
    return window.currentUser || null;
  }

  function getPinFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const hashPart = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashPart);
    return searchParams.get('pin') || hashParams.get('pin') || searchParams.get('gameId') || null;
  }

  function initTriviaPlayer() {
    if (window.db) {
      db = window.db;
      listenToActiveTriviaGames();
      startMobileTicker();
    } else {
      setTimeout(initTriviaPlayer, 100);
    }
  }

  // =========================================================================
  // CENTRAL SYNCHRONIZED TIMELINE CALCULATOR (SHARED TIMELINE)
  // =========================================================================
  function computeTriviaTimelinePhase(game) {
    if (!game) return { status: 'lobby' };
    const status = game.status || 'lobby';
    if (status === 'lobby' || status === 'finished') {
      return { status: status };
    }

    const startTime = game.autoFlowStartTime || game.countdownStartTime;
    if (!startTime) {
      return { status: 'lobby' };
    }

    const now = Date.now();
    const elapsedSec = (now - startTime) / 1000;
    const countdownSec = 10;
    const timePerQ = game.timePerQuestion || 15;
    const revealSec = 6;
    const lbSec = 6;
    const cycleSec = timePerQ + revealSec + lbSec;
    const questions = game.questions || [];
    const totalQ = questions.length || 10;

    // 1. Initial 10s Countdown
    if (elapsedSec < countdownSec) {
      const rem = Math.max(0, Math.ceil(countdownSec - elapsedSec));
      return {
        status: 'countdown',
        remainingSec: rem,
        totalSec: countdownSec
      };
    }

    // 2. Question Cycles
    const gameElapsed = elapsedSec - countdownSec;
    const qIdx = Math.floor(gameElapsed / cycleSec);

    if (qIdx < totalQ) {
      const qSec = gameElapsed % cycleSec;
      const q = questions[qIdx] || {};

      if (qSec < timePerQ) {
        const rem = Math.max(0, Math.ceil(timePerQ - qSec));
        const fraction = Math.max(0, Math.min(1, 1 - (qSec / timePerQ)));
        return {
          status: 'question',
          questionIndex: qIdx,
          question: q,
          remainingSec: rem,
          qSec: qSec,
          timeLimit: timePerQ,
          timerFraction: fraction,
          totalQuestions: totalQ
        };
      } else if (qSec < timePerQ + revealSec) {
        const rem = Math.max(0, Math.ceil((timePerQ + revealSec) - qSec));
        return {
          status: 'reveal',
          questionIndex: qIdx,
          question: q,
          remainingSec: rem,
          totalQuestions: totalQ
        };
      } else {
        const rem = Math.max(0, Math.ceil(cycleSec - qSec));
        return {
          status: 'leaderboard',
          questionIndex: qIdx,
          remainingSec: rem,
          totalQuestions: totalQ
        };
      }
    }

    // 3. Grand Podium
    return {
      status: 'podium',
      totalQuestions: totalQ
    };
  }

  // =========================================================================
  // LISTEN TO ACTIVE TRIVIAS (STRICT PIN / QR ACCESS GATE)
  // =========================================================================
  function listenToActiveTriviaGames() {
    if (!db) return;

    db.collection('trivia_games').onSnapshot(snap => {
      activeGames = [];
      snap.forEach(doc => {
        activeGames.push({ id: doc.id, ...doc.data() });
      });

      activeGames.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const pinFromUrl = getPinFromUrl();
      const savedPin = localStorage.getItem('trivia_joined_room_pin');

      // 1. If URL has PIN (scanned QR code) -> Connect to that specific room
      if (pinFromUrl && !currentTriviaId) {
        const found = activeGames.find(g => g.pin === pinFromUrl || g.id === pinFromUrl);
        if (found) {
          selectTriviaMobileGame(found.id);
          return;
        }
      }

      // 2. If user already joined a PIN previously in this session
      if (savedPin && !currentTriviaId) {
        const found = activeGames.find(g => g.pin === savedPin || g.id === savedPin);
        if (found) {
          selectTriviaMobileGame(found.id);
          return;
        }
      }

      // 3. If currently selected, keep data refreshed
      if (currentTriviaId) {
        const currentUpdated = activeGames.find(g => g.id === currentTriviaId);
        if (currentUpdated) {
          currentTrivia = currentUpdated;
        }
      }
    }, err => console.error('[TriviaPlayer] Error listening to active games:', err));
  }

  function listenToCurrentTrivia(gId) {
    if (unsubGame) unsubGame();
    if (unsubMyPlayer) unsubMyPlayer();
    if (unsubAllPlayers) unsubAllPlayers();

    // 1. Listen to trivia game document
    unsubGame = db.collection('trivia_games').doc(gId).onSnapshot(doc => {
      if (doc.exists) {
        currentTrivia = { id: doc.id, ...doc.data() };
      } else {
        currentTrivia = null;
        currentTriviaId = null;
      }
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
      });
    }

    // 3. Listen to all players for leaderboard ranking
    unsubAllPlayers = db.collection('trivia_games').doc(gId).collection('players').onSnapshot(snap => {
      allPlayers = [];
      snap.forEach(p => allPlayers.push({ id: p.id, ...p.data() }));
    });
  }

  window.selectTriviaMobileGame = function(gId) {
    currentTriviaId = gId;
    renderedMobilePhaseKey = null;
    listenToCurrentTrivia(gId);
  };

  window.exitTriviaRoom = function() {
    currentTriviaId = null;
    currentTrivia = null;
    myPlayerDoc = null;
    localStorage.removeItem('trivia_joined_room_pin');
    if (unsubGame) unsubGame();
    if (unsubMyPlayer) unsubMyPlayer();
    if (unsubAllPlayers) unsubAllPlayers();
    renderedMobilePhaseKey = null;
    renderTriviaMobile();
  };

  // =========================================================================
  // HIGH-PRECISION MOBILE TICKER LOOP (100ms)
  // =========================================================================
  function startMobileTicker() {
    if (mobileTickerInterval) clearInterval(mobileTickerInterval);
    mobileTickerInterval = setInterval(() => {
      renderTriviaMobile();
    }, 100);
  }

  function renderTriviaMobile() {
    const container = document.getElementById('tab-trivia');
    if (!container) return;

    const u = getCurrentUser();
    const pinFromUrl = getPinFromUrl();

    // 1. Google Login Required Card
    if (!u) {
      if (renderedMobilePhaseKey !== 'unauth') {
        renderedMobilePhaseKey = 'unauth';
        container.innerHTML = `
          <section class="card text-center py-4" style="border:2px solid rgba(255,209,0,0.5); background:linear-gradient(135deg, rgba(20,28,45,0.95) 0%, rgba(10,15,26,0.98) 100%);">
            <span style="font-size:48px;">🏆</span>
            <h2 style="color:#ffd100; font-size:22px; font-weight:950; margin:8px 0;">¡Trivia en Vivo Drinks & Wins!</h2>
            <p class="hint-text" style="font-size:13px; line-height:1.4; margin-bottom:16px;">
              Inicia sesión con tu cuenta de Google para ingresar con el PIN de las pantallas del restaurante:
            </p>
            <button type="button" class="btn btn-primary" onclick="if(window.loginWithGoogle) window.loginWithGoogle();" style="width:100%; font-size:15px; font-weight:900; padding:12px; background:linear-gradient(135deg, #ffd100, #ff9900); color:#000; border:none; border-radius:12px; box-shadow:0 0 20px rgba(255,209,0,0.5);">
              🚀 Entrar con Google
            </button>
          </section>
          <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v201.0</span></footer>
        `;
      }
      return;
    }

    // 2. PIN Gate / Join Screen (If not joined yet or no room selected)
    const isJoined = !!myPlayerDoc;
    if (!currentTriviaId || !currentTrivia || !isJoined) {
      const formKey = `join_form_${pinFromUrl || ''}_${currentTriviaId || 'none'}`;
      if (renderedMobilePhaseKey !== formKey) {
        renderedMobilePhaseKey = formKey;
        const defaultPin = pinFromUrl || (currentTrivia ? currentTrivia.pin : '') || '';

        container.innerHTML = `
          <section class="card" style="border:2px solid #ffd100; background:linear-gradient(135deg, rgba(20,28,45,0.95) 0%, rgba(10,15,26,0.98) 100%); padding:22px;">
            <div style="text-align:center; margin-bottom:16px;">
              <span style="font-size:44px;">📱</span>
              <h2 style="color:#ffd100; font-size:22px; font-weight:950; margin:6px 0 2px 0; font-family:'Outfit', sans-serif;">
                INGRESAR A TRIVIA EN VIVO
              </h2>
              <p class="hint-text" style="font-size:12.5px; margin:0;">
                Ingresa el PIN de 4 dígitos proyectado en la TV del restaurante:
              </p>
            </div>

            <!-- PIN Input with QR detected badge -->
            <div style="margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="font-size:12px; font-weight:900; color:#ffd100;">PIN DE LA PANTALLA:</label>
                ${pinFromUrl ? `<span class="badge" style="background:#00e676; color:#000; font-size:10px; font-weight:900;">✓ Detectado por QR</span>` : ''}
              </div>
              <input type="text" id="trivPlayerPinInput" class="input-control" value="${defaultPin}" placeholder="4 Dígitos (Ej. 4821)" maxlength="6" style="width:100%; box-sizing:border-box; font-size:22px; font-weight:950; text-align:center; letter-spacing:4px; border:2px solid #ffd100; border-radius:12px; padding:10px; background:#0e1420; color:#ffd100; font-family:'Outfit', sans-serif;"/>
            </div>

            <div style="margin-bottom:12px;">
              <label style="display:block; font-size:12px; font-weight:800; color:#e0e0e0; margin-bottom:4px;">Tu Apodo / Nombre en Pantalla:</label>
              <input type="text" id="trivJoinNickname" class="input-control" value="${u.displayName || localStorage.getItem('player_nick') || ''}" placeholder="Ej. El Gallo, Beto, etc." maxlength="25" style="width:100%; box-sizing:border-box; font-size:14px; font-weight:800; border:1.5px solid rgba(255,255,255,0.3); border-radius:10px; padding:10px; background:#0e1420; color:#fff;"/>
            </div>

            <div style="margin-bottom:18px;">
              <label style="display:block; font-size:12px; font-weight:800; color:#e0e0e0; margin-bottom:4px;">Tu Número de Mesa / Ubicación:</label>
              <input type="text" id="trivJoinWaiter" class="input-control" value="${localStorage.getItem('trivia_player_table') || ''}" placeholder="Ej. Mesa 4, Barra, Terraza" maxlength="30" style="width:100%; box-sizing:border-box; font-size:14px; border-radius:10px; padding:10px; background:#0e1420; color:#fff; border:1.5px solid rgba(255,255,255,0.3);"/>
            </div>

            <button type="button" class="btn btn-primary" onclick="window.submitPlayerJoinByPin()" style="width:100%; font-size:16px; font-weight:950; padding:14px; background:linear-gradient(135deg, #00e676, #00b0ff); color:#000; border:none; border-radius:12px; box-shadow:0 0 25px rgba(0,230,118,0.5);">
              ¡Unirme a la Trivia en Vivo! 🔥
            </button>
          </section>
          <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v201.0</span></footer>
        `;
      }
      return;
    }

    // 3. Active Joined Game View
    const g = currentTrivia;
    const phase = computeTriviaTimelinePhase(g);

    // Calculate player rank in room
    const sorted = [...allPlayers].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const myRankIdx = sorted.findIndex(p => p.id === (u ? u.uid : ''));
    const myRank = myRankIdx >= 0 ? myRankIdx + 1 : 1;
    const totalScore = myPlayerDoc?.totalScore || 0;

    const phaseKey = `active_${g.id}_${phase.status}_${phase.questionIndex !== undefined ? phase.questionIndex : ''}_${u ? u.uid : 'anon'}`;

    // If phase structure already mounted, update dynamic elements in place
    if (renderedMobilePhaseKey === phaseKey) {
      if (phase.status === 'countdown') {
        const clockEl = document.getElementById('mobileCountdownNum');
        if (clockEl) clockEl.textContent = phase.remainingSec;
      } else if (phase.status === 'question') {
        const bar = document.getElementById('triviaMobileTimerBar');
        if (bar && phase.timerFraction !== undefined) {
          bar.style.width = `${phase.timerFraction * 100}%`;
        }
      }
      const scoreEl = document.getElementById('triviaMobileHeroScore');
      if (scoreEl) scoreEl.innerHTML = `<span>⭐ ${totalScore}</span> <span style="font-size:10px; opacity:0.8;">PTS</span>`;
      return;
    }

    // Phase structure changed -> Render new DOM
    renderedMobilePhaseKey = phaseKey;

    const playerHeroHtml = `
      <div class="trivia-mobile-hero">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${myPlayerDoc.photoURL || 'img/logo.jpg'}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid #ffd100;" onerror="this.src='img/logo.jpg'"/>
            <div style="text-align:left;">
              <strong style="color:#ffffff; font-size:14px;">${myPlayerDoc.nickname || myPlayerDoc.playerName}</strong>
              <div style="font-size:10px; color:var(--text-muted);">Mesa: ${myPlayerDoc.waiter || 'Bar'} • #${myRank} de ${sorted.length}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div id="triviaMobileHeroScore" class="trivia-score-pill">
              <span>⭐ ${totalScore}</span> <span style="font-size:10px; opacity:0.8;">PTS</span>
            </div>
            <button type="button" onclick="window.exitTriviaRoom()" style="background:transparent; border:none; color:#ff4d4d; font-size:11px; font-weight:800; cursor:pointer;" title="Salir de Sala">
              ✕ Salir
            </button>
          </div>
        </div>
      </div>
    `;

    let phaseContentHtml = '';

    if (phase.status === 'lobby') {
      phaseContentHtml = `
        <section class="card text-center py-4" style="border:1.5px dashed rgba(255,209,0,0.4);">
          <span style="font-size:36px; animation: tvGlowPulse 1.5s infinite;">⏳</span>
          <h4 style="color:#ffd100; margin-top:10px;">¡Estás Conectado a la Trivia!</h4>
          <p class="hint-text" style="font-size:13px; line-height:1.4;">
            Mira la pantalla del restaurante (PIN: <strong>${g.pin || ''}</strong>). En cuanto inicie la trivia, aparecerá la cuenta regresiva y tus 4 botones aquí.
          </p>
          <div style="font-size:12px; color:#00e676; font-weight:800; margin-top:12px;">
            ✓ Sala Lista • Esperando Inicio del Host...
          </div>
        </section>
      `;
    } else if (phase.status === 'countdown') {
      phaseContentHtml = `
        <section class="card text-center py-4" style="border:2px solid #ffd100; background:rgba(0,0,0,0.6); box-shadow:0 0 25px rgba(255,209,0,0.3);">
          <div style="font-size:13px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:1.5px;">⚡ ¡PREPÁRATE! ⚡</div>
          <h3 style="color:#ffffff; margin:6px 0 10px 0; font-size:20px; font-weight:950;">LA TRIVIA COMIENZA EN:</h3>
          <div id="mobileCountdownNum" style="font-size:72px; font-weight:950; color:#ffd100; line-height:1; font-family:'Outfit', sans-serif;">${phase.remainingSec}</div>
          <p class="hint-text" style="font-size:12.5px; margin-top:10px; color:#00e676; font-weight:800;">
            ¡Tus 4 botones de respuesta aparecerán al llegar a 0! 🚀
          </p>
        </section>
      `;
    } else if (phase.status === 'question') {
      phaseContentHtml = renderMobileQuestionPhase(g, u, phase);
    } else if (phase.status === 'reveal') {
      phaseContentHtml = renderMobileRevealPhase(g, u, phase, myRank, sorted.length);
    } else if (phase.status === 'leaderboard') {
      phaseContentHtml = renderMobileLeaderboardPhase(g, u, sorted);
    } else if (phase.status === 'podium' || phase.status === 'finished') {
      phaseContentHtml = renderMobilePodiumPhase(g, u, myRank, totalScore);
    }

    container.innerHTML = `
      ${playerHeroHtml}
      ${phaseContentHtml}
      <footer class="tab-footer-version"><span>DRINKS & WINS</span> • <span class="ver">v201.0</span></footer>
    `;
  }

  // Mobile Question Phase (Question Text + 4 Giant Touch Buttons)
  function renderMobileQuestionPhase(game, currentUser, phase) {
    const currIdx = phase.questionIndex;
    const totalQ = phase.totalQuestions;
    const q = phase.question || {};

    const myAnswer = myPlayerDoc?.answers?.[currIdx];
    const hasAnswered = !!myAnswer;
    const fractionPct = (phase.timerFraction !== undefined ? phase.timerFraction : 1) * 100;

    return `
      <!-- Timer Bar -->
      <div class="trivia-mobile-timer-bar-wrap">
        <div id="triviaMobileTimerBar" class="trivia-mobile-timer-bar" style="width:${fractionPct}%;"></div>
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
        <button type="button" id="btnMobileChoice_A" class="trivia-btn-choice btn-a ${myAnswer?.choice === 'A' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'A', ${phase.qSec || 0}, ${phase.timeLimit || 8})">
          <span class="trivia-btn-letter">🔴 A</span>
          <span class="trivia-btn-text">${q.a || ''}</span>
        </button>

        <button type="button" id="btnMobileChoice_B" class="trivia-btn-choice btn-b ${myAnswer?.choice === 'B' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'B', ${phase.qSec || 0}, ${phase.timeLimit || 8})">
          <span class="trivia-btn-letter">🔵 B</span>
          <span class="trivia-btn-text">${q.b || ''}</span>
        </button>

        <button type="button" id="btnMobileChoice_C" class="trivia-btn-choice btn-c ${myAnswer?.choice === 'C' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'C', ${phase.qSec || 0}, ${phase.timeLimit || 8})">
          <span class="trivia-btn-letter">🟡 C</span>
          <span class="trivia-btn-text">${q.c || ''}</span>
        </button>

        <button type="button" id="btnMobileChoice_D" class="trivia-btn-choice btn-d ${myAnswer?.choice === 'D' ? 'selected' : (hasAnswered ? 'disabled' : '')}" onclick="window.submitTriviaMobileAnswer('${game.id}', ${currIdx}, 'D', ${phase.qSec || 0}, ${phase.timeLimit || 8})">
          <span class="trivia-btn-letter">🟢 D</span>
          <span class="trivia-btn-text">${q.d || ''}</span>
        </button>
      </div>
    `;
  }

  // Mobile Reveal Phase
  function renderMobileRevealPhase(game, currentUser, phase, rank, totalPlayers) {
    const currIdx = phase.questionIndex;
    const q = phase.question || {};
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

  // Join by PIN Handler
  window.submitPlayerJoinByPin = async function() {
    const u = getCurrentUser();
    if (!u) {
      if (window.loginWithGoogle) window.loginWithGoogle();
      return;
    }

    const pinInp = document.getElementById('trivPlayerPinInput');
    const nickInp = document.getElementById('trivJoinNickname');
    const waiterInp = document.getElementById('trivJoinWaiter');

    const enteredPin = pinInp ? pinInp.value.trim() : '';
    const nickname = nickInp ? nickInp.value.trim() : (u.displayName || 'Socio');
    const waiter = waiterInp ? waiterInp.value.trim() : 'Mesa Directa';

    if (!enteredPin || enteredPin.length < 4) {
      alert('Ingresa el PIN de 4 dígitos que aparece en la pantalla de la TV.');
      if (pinInp) pinInp.focus();
      return;
    }

    if (!nickname) {
      alert('Por favor escribe tu apodo para jugar.');
      if (nickInp) nickInp.focus();
      return;
    }

    // Find active game by PIN
    const targetGame = activeGames.find(g => (g.pin || '').toString() === enteredPin || g.id === enteredPin);
    if (!targetGame) {
      alert(`No se encontró ninguna sala de trivia activa con el PIN "${enteredPin}".\n\nPor favor verifica el PIN en la pantalla de la TV del bar.`);
      return;
    }

    localStorage.setItem('trivia_joined_room_pin', enteredPin);
    localStorage.setItem('trivia_player_table', waiter);
    localStorage.setItem('player_nick', nickname);

    const photoURL = u.photoURL || localStorage.getItem('user_custom_avatar') || 'img/logo.jpg';

    try {
      await db.collection('trivia_games').doc(targetGame.id).collection('players').doc(u.uid).set({
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

      selectTriviaMobileGame(targetGame.id);
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (err) {
      alert('Error al unirse: ' + err.message);
    }
  };

  // Submit Answer Handler
  window.submitTriviaMobileAnswer = async function(gameId, questionIndex, choiceKey, qElapsedSec, timeLimit) {
    const u = getCurrentUser();
    if (!u || !currentTrivia) return;

    if (myPlayerDoc?.answers?.[questionIndex]) return;

    // Optimistic UI update
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

    if (navigator.vibrate) navigator.vibrate(50);

    const q = currentTrivia.questions?.[questionIndex] || {};
    const correct = (q.correct || 'A').toUpperCase();
    const isCorrect = choiceKey.toUpperCase() === correct;

    const responseTimeMs = Math.max(100, Math.round((qElapsedSec || 1) * 1000));
    const limitSec = timeLimit || currentTrivia.timePerQuestion || 15;

    let pointsEarned = 0;
    if (isCorrect) {
      const timeLimitMs = limitSec * 1000;
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

        if (answers[questionIndex]) return;

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
