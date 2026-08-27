// Trivia TV Projection Screen & Auto-Game Master for Drinks & Wins
(function() {
  'use strict';

  let db = null;
  let gameId = null;
  let gameData = null;
  let playersMap = {};
  let timerInterval = null;
  let autoFlowCoordinatorTimer = null;
  let podiumSequenceStep = 0;
  let leaderboardLoopPageIndex = 0;
  let leaderboardLoopInterval = null;

  function getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('gameId') || params.get('id') || params.get('pin');
  }

  function initTriviaTV() {
    if (window.db) {
      db = window.db;
      gameId = getGameIdFromUrl();
      if (!gameId) {
        loadLatestTriviaGame();
      } else {
        listenToGame(gameId);
      }
    } else {
      setTimeout(initTriviaTV, 100);
    }
  }

  function loadLatestTriviaGame() {
    if (!db) return;
    try {
      db.collection('trivia_games').onSnapshot(snap => {
        if (!snap.empty) {
          const games = [];
          snap.forEach(doc => games.push({ id: doc.id, ...doc.data() }));
          games.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          if (games.length > 0) {
            gameId = games[0].id;
            listenToGame(gameId);
          } else {
            renderNoGameScreen();
          }
        } else {
          renderNoGameScreen();
        }
      }, err => {
        console.error('[TriviaTV] Error loading games:', err);
        renderNoGameScreen();
      });
    } catch (e) {
      console.error('[TriviaTV] Init error:', e);
    }
  }

  function listenToGame(gId) {
    if (!db || !gId) return;

    // Check if gId is a 4-digit PIN instead of document ID
    if (/^\d{4}$/.test(gId)) {
      db.collection('trivia_games').where('pin', '==', gId).limit(1).onSnapshot(snap => {
        if (!snap.empty) {
          const doc = snap.docs[0];
          gameId = doc.id;
          setupGameListeners(gameId);
        } else {
          renderNoGameScreen();
        }
      });
      return;
    }

    setupGameListeners(gId);
  }

  function setupGameListeners(targetId) {
    // 1. Listen to game state
    db.collection('trivia_games').doc(targetId).onSnapshot(doc => {
      if (!doc.exists) {
        renderNoGameScreen();
        return;
      }
      const prevStatus = gameData?.status;
      gameData = { id: doc.id, ...doc.data() };

      updateHeaderInfo();

      // Reset podium sequence if entering podium afresh
      if (gameData.status === 'podium' && prevStatus !== 'podium') {
        podiumSequenceStep = 0;
      }

      renderCurrentPhase();
      runAutoFlowCoordinator();
    }, err => console.error('[TriviaTV] Error loading game:', err));

    // 2. Listen to connected players
    db.collection('trivia_games').doc(targetId).collection('players').onSnapshot(snap => {
      playersMap = {};
      snap.forEach(pDoc => {
        playersMap[pDoc.id] = { id: pDoc.id, ...pDoc.data() };
      });
      renderCurrentPhase();
    }, err => console.error('[TriviaTV] Error loading players:', err));
  }

  function updateHeaderInfo() {
    if (!gameData) return;
    const titleEl = document.getElementById('tvGameTitle');
    const pinEl = document.getElementById('tvPinBadge');
    const urlEl = document.getElementById('tvJoinUrlDisplay') || document.getElementById('tvJoinUrl');

    if (titleEl) titleEl.textContent = `📍 ${gameData.store || 'Sucursal'} • ${gameData.title}`;
    if (pinEl) pinEl.textContent = `PIN: ${gameData.pin || gameData.id}`;
    if (urlEl) urlEl.textContent = `${window.location.host || 'drinks-wins.web.app'}`;
  }

  function renderNoGameScreen() {
    const main = document.getElementById('tvMainContent');
    if (!main) return;
    main.innerHTML = `
      <div style="text-align:center; padding:80px 20px;">
        <span style="font-size:72px;">🧠</span>
        <h2 style="color:#ffd100; font-size:32px; margin-top:16px; font-family:'Outfit', sans-serif;">Esperando Inicio de Trivia en Vivo...</h2>
        <p class="hint-text" style="font-size:17px; max-width:540px; margin:10px auto 24px auto;">
          Inicia o selecciona una sala de Trivia desde el Panel de Administración de Drinks & Wins.
        </p>
      </div>
    `;
  }

  // =========================================================================
  // AUTOMATIC GAME FLOW COORDINATOR
  // =========================================================================
  function runAutoFlowCoordinator() {
    if (autoFlowCoordinatorTimer) clearInterval(autoFlowCoordinatorTimer);
    if (!gameData || !db) return;

    // Only coordinate if status is active
    autoFlowCoordinatorTimer = setInterval(async () => {
      if (!gameData) return;
      const status = gameData.status;
      const now = Date.now();
      const currIdx = gameData.currentQuestionIndex || 0;
      const totalQ = (gameData.questions || []).length || 10;
      const timePerQ = gameData.timePerQuestion || 8;

      // 1. Countdown Phase (10 seconds)
      if (status === 'countdown') {
        const startTime = gameData.countdownStartTime || now;
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= 10) {
          clearInterval(autoFlowCoordinatorTimer);
          try {
            await db.collection('trivia_games').doc(gameData.id).update({
              status: 'question',
              currentQuestionIndex: 0,
              questionStartTime: Date.now()
            });
          } catch (e) {}
        }
      }

      // 2. Question Phase (5, 8 or 12 seconds)
      else if (status === 'question') {
        const startTime = gameData.questionStartTime || now;
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= timePerQ) {
          clearInterval(autoFlowCoordinatorTimer);
          try {
            await db.collection('trivia_games').doc(gameData.id).update({
              status: 'reveal',
              revealTime: Date.now()
            });
          } catch (e) {}
        }
      }

      // 3. Reveal Phase (6 seconds display)
      else if (status === 'reveal') {
        const revealTime = gameData.revealTime || now;
        const elapsed = (now - revealTime) / 1000;
        if (elapsed >= 6) {
          clearInterval(autoFlowCoordinatorTimer);
          try {
            await db.collection('trivia_games').doc(gameData.id).update({
              status: 'leaderboard',
              leaderboardTime: Date.now()
            });
          } catch (e) {}
        }
      }

      // 4. Leaderboard Phase (6 seconds display -> Next Q or Podium)
      else if (status === 'leaderboard') {
        const lbTime = gameData.leaderboardTime || now;
        const elapsed = (now - lbTime) / 1000;
        if (elapsed >= 6) {
          clearInterval(autoFlowCoordinatorTimer);
          if (currIdx + 1 < totalQ) {
            try {
              await db.collection('trivia_games').doc(gameData.id).update({
                currentQuestionIndex: currIdx + 1,
                status: 'question',
                questionStartTime: Date.now()
              });
            } catch (e) {}
          } else {
            // Final Podium
            try {
              await db.collection('trivia_games').doc(gameData.id).update({
                status: 'podium',
                podiumTime: Date.now()
              });
            } catch (e) {}
          }
        }
      }
    }, 500);
  }

  // =========================================================================
  // HOST CONTROLS TRIGGERED DIRECTLY FROM TV
  // =========================================================================
  window.startTriviaFromTV = async function() {
    if (!gameData || !db) return;
    try {
      await db.collection('trivia_games').doc(gameData.id).update({
        status: 'countdown',
        countdownStartTime: Date.now(),
        currentQuestionIndex: 0
      });
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  // =========================================================================
  // RENDER CURRENT GAME PHASE
  // =========================================================================
  function renderCurrentPhase() {
    if (!gameData) return;
    const main = document.getElementById('tvMainContent');
    if (!main) return;

    const status = gameData.status || 'lobby';

    if (status === 'lobby') {
      renderLobbyPhase(main);
    } else if (status === 'countdown') {
      renderCountdownPhase(main);
    } else if (status === 'question') {
      renderQuestionPhase(main);
    } else if (status === 'reveal') {
      renderRevealPhase(main);
    } else if (status === 'leaderboard') {
      renderLeaderboardPhase(main);
    } else if (status === 'podium' || status === 'finished') {
      renderPodiumPhase(main);
    }
  }

  // 1. Lobby Phase (Giant QR Code + Connected Players + Start Button)
  function renderLobbyPhase(container) {
    if (timerInterval) clearInterval(timerInterval);
    if (leaderboardLoopInterval) clearInterval(leaderboardLoopInterval);

    const players = Object.values(playersMap);
    const origin = window.location.origin || '';
    const cleanPath = window.location.pathname.replace('trivia-tv.html', 'index.html').replace('tv.html', 'index.html');
    const joinUrl = `${origin}${cleanPath}#tab-trivia?pin=${gameData.pin || ''}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(joinUrl)}&color=0-0-0&bgcolor=ffd100&margin=1`;

    let playersHtml = '';
    if (players.length === 0) {
      playersHtml = `<div style="font-size:18px; color:var(--text-muted); padding:20px 0;">Escanea el código QR o entra en tu celular para aparecer aquí...</div>`;
    } else {
      players.forEach(p => {
        const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;
        playersHtml += `
          <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:8px 16px; border-radius:30px; border:1.5px solid rgba(255,209,0,0.3); animation:popIn 0.3s ease;">
            <img src="${photoSrc}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:2px solid #ffd100;" alt="${p.nickname}" onerror="this.src='img/logo.jpg'"/>
            <span style="font-size:16px; font-weight:900; color:#ffffff;">${p.nickname || p.playerName}</span>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div style="text-align:center; padding:10px 0;">
        <div style="display:flex; align-items:center; justify-content:center; gap:40px; flex-wrap:wrap; background:rgba(0,0,0,0.45); padding:28px 36px; border-radius:24px; border:2px solid rgba(255,209,0,0.35); box-shadow:0 12px 40px rgba(0,0,0,0.7); max-width:980px; margin:0 auto;">
          <!-- Giant High Contrast QR Code -->
          <div style="text-align:center;">
            <img src="${qrApiUrl}" alt="QR de Acceso" class="tv-qr-giant" style="display:block; margin:0 auto;" />
            <div style="font-size:14px; font-weight:950; color:#ffd100; margin-top:10px; letter-spacing:0.5px;">ESCANEA CON TU CELULAR</div>
          </div>

          <!-- Instructions & Start Button -->
          <div style="text-align:left; max-width:440px;">
            <span class="badge" style="background:#ffd100; color:#000; font-size:13px; font-weight:950; padding:4px 12px; border-radius:8px;">1. ENTRA A LA APP</span>
            <h2 style="font-size:32px; font-weight:950; color:#ffffff; margin:10px 0 6px 0; font-family:'Outfit', sans-serif;">¡Preparen sus Celulares!</h2>
            <p style="font-size:15.5px; color:#e0e0e0; line-height:1.4; margin-bottom:12px;">
              Contesta cada pregunta en tu celular en tiempo real. ¡Los más rápidos se llevan más puntos!
            </p>
            <div style="font-size:16px; color:#00e676; font-weight:900; margin-bottom:16px;">
              👥 <strong>${players.length}</strong> Jugadores Conectados en el Bar
            </div>

            <!-- Start Trivia Button right on TV Screen -->
            <button type="button" onclick="window.startTriviaFromTV()" class="btn btn-primary" style="padding:14px 28px; font-size:18px; font-weight:950; background:linear-gradient(135deg, #ffd100, #ff9900); color:#000; border:none; border-radius:14px; box-shadow:0 0 25px rgba(255,209,0,0.55); cursor:pointer; width:100%;">
              ▶️ Empezar Trivia (10s) 🔥
            </button>
          </div>
        </div>

        <!-- Connected Players Grid -->
        <div style="width:100%; max-width:980px; margin:24px auto 0 auto; text-align:left;">
          <h3 style="font-size:16px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">
            🔥 Jugadores Listos (${players.length}):
          </h3>
          <div style="display:flex; flex-wrap:wrap; gap:10px; max-height:160px; overflow-y:auto;">
            ${playersHtml}
          </div>
        </div>
      </div>
    `;
  }

  // 2. Countdown Phase (10 to 1 Fullscreen Animation)
  function renderCountdownPhase(container) {
    if (timerInterval) clearInterval(timerInterval);
    const startTime = gameData.countdownStartTime || Date.now();

    container.innerHTML = `
      <div style="text-align:center; padding:50px 20px;">
        <div style="font-size:22px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px;">
          ⚡ ¡ATENCIÓN A TODAS LAS MESAS! ⚡
        </div>
        <h2 style="font-size:38px; font-weight:950; color:#ffffff; margin:0 0 20px 0; font-family:'Outfit', sans-serif;">
          LA TRIVIA VA A COMENZAR EN:
        </h2>
        <div id="tvCountdownBigNum" class="tv-countdown-number">10</div>
        <p style="font-size:20px; color:#00e676; font-weight:900; margin-top:24px;">
          ¡Preparen sus dedos para contestar rápido! 🚀
        </p>
      </div>
    `;

    const clockEl = document.getElementById('tvCountdownBigNum');
    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      if (clockEl) clockEl.textContent = remaining;
      if (remaining <= 0) clearInterval(timerInterval);
    }, 200);
  }

  // 3. Question Phase (Big 38px Text, 4 Option Boxes, 5/8/12s Clock)
  function renderQuestionPhase(container) {
    const currIdx = gameData.currentQuestionIndex || 0;
    const totalQ = (gameData.questions || []).length || 10;
    const q = gameData.questions?.[currIdx] || {};
    const timeLimit = gameData.timePerQuestion || 8;
    const startTime = gameData.questionStartTime || Date.now();

    const players = Object.values(playersMap);
    const answeredCount = players.filter(p => p.answers && p.answers[currIdx] !== undefined).length;

    container.innerHTML = `
      <div style="max-width:1250px; margin:0 auto; width:100%;">
        <!-- Question Box -->
        <div style="background:rgba(0,0,0,0.5); border:2px solid rgba(255,209,0,0.4); border-radius:24px; padding:24px 36px; margin-bottom:24px; position:relative; box-shadow:0 12px 40px rgba(0,0,0,0.6); text-align:center;">
          <div id="tvCountdownClock" style="position:absolute; top:20px; right:28px; width:74px; height:74px; border-radius:50%; background:#101726; border:4px solid #ffd100; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:950; color:#ffd100; font-family:'Outfit', sans-serif; box-shadow:0 0 20px rgba(255,209,0,0.4);">
            ${timeLimit}
          </div>

          <div style="font-size:15px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:10px;">
            PREGUNTA ${currIdx + 1} DE ${totalQ}
          </div>
          <h2 class="tv-question-text" style="margin:0 0 14px 0;">
            ${q.q || 'Cargando pregunta...'}
          </h2>
          <div style="display:inline-flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:6px 16px; border-radius:20px;">
            <span style="font-size:14px; font-weight:800; color:#00e676;">⚡ ${answeredCount} de ${players.length} Jugadores han respondido</span>
          </div>
        </div>

        <!-- 4 Option Cards -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div class="tv-option-box opt-a">
            <span style="font-size:32px; font-weight:950;">🔴 A</span>
            <span>${q.a || ''}</span>
          </div>
          <div class="tv-option-box opt-b">
            <span style="font-size:32px; font-weight:950;">🔵 B</span>
            <span>${q.b || ''}</span>
          </div>
          <div class="tv-option-box opt-c">
            <span style="font-size:32px; font-weight:950;">🟡 C</span>
            <span>${q.c || ''}</span>
          </div>
          <div class="tv-option-box opt-d">
            <span style="font-size:32px; font-weight:950;">🟢 D</span>
            <span>${q.d || ''}</span>
          </div>
        </div>
      </div>
    `;

    // Live Clock Countdown
    if (timerInterval) clearInterval(timerInterval);
    const clockEl = document.getElementById('tvCountdownClock');

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      if (clockEl) {
        clockEl.textContent = remaining;
        if (remaining <= 3) {
          clockEl.style.borderColor = '#ff0033';
          clockEl.style.color = '#ff0033';
          clockEl.style.boxShadow = '0 0 30px rgba(255,0,51,0.9)';
        }
      }

      if (remaining <= 0) clearInterval(timerInterval);
    }, 200);
  }

  // 4. Reveal Phase (Correct Answer Highlight + Expanded Fact / Explicación)
  function renderRevealPhase(container) {
    if (timerInterval) clearInterval(timerInterval);

    const currIdx = gameData.currentQuestionIndex || 0;
    const totalQ = (gameData.questions || []).length || 10;
    const q = gameData.questions?.[currIdx] || {};
    const correct = (q.correct || 'A').toUpperCase();

    const players = Object.values(playersMap);
    const totalAnswers = players.filter(p => p.answers && p.answers[currIdx] !== undefined).length;

    const counts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
    players.forEach(p => {
      const a = p.answers?.[currIdx]?.choice;
      if (a && counts[a] !== undefined) counts[a]++;
    });

    const pct = key => totalAnswers > 0 ? Math.round((counts[key] / totalAnswers) * 100) : 0;

    container.innerHTML = `
      <div style="max-width:1250px; margin:0 auto; width:100%;">
        <!-- Question Box with Correct Badge & Fact -->
        <div style="background:rgba(0,0,0,0.5); border:2px solid #00e676; border-radius:24px; padding:22px 36px; margin-bottom:20px; box-shadow:0 0 30px rgba(0,230,118,0.3); text-align:center;">
          <div style="font-size:15px; font-weight:900; color:#00e676; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px;">
            ✓ RESPUESTA REVELADA • PREGUNTA ${currIdx + 1} DE ${totalQ}
          </div>
          <h2 class="tv-question-text" style="font-size:32px; margin:0 0 12px 0;">
            ${q.q || ''}
          </h2>

          <!-- Expanded Real Explanation / Dato Curioso -->
          <div style="background:rgba(255,209,0,0.12); border:1.5px solid #ffd100; border-radius:14px; padding:10px 20px; display:inline-block; max-width:90%; text-align:left;">
            <div style="font-size:15px; color:#ffd100; font-weight:900;">
              💡 <strong>Dato Curioso / Explicación:</strong> ${q.exp || '¡Respuesta correcta verificada!'}
            </div>
          </div>
        </div>

        <!-- 4 Option Cards with Correct Highlight and Stats -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div class="tv-option-box opt-a ${correct === 'A' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:32px; font-weight:950;">🔴 A</span>
            <div style="flex:1;">
              <div>${q.a || ''} ${correct === 'A' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:13px; opacity:0.85; margin-top:2px;">${counts['A']} votos (${pct('A')}%)</div>
            </div>
          </div>

          <div class="tv-option-box opt-b ${correct === 'B' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:32px; font-weight:950;">🔵 B</span>
            <div style="flex:1;">
              <div>${q.b || ''} ${correct === 'B' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:13px; opacity:0.85; margin-top:2px;">${counts['B']} votos (${pct('B')}%)</div>
            </div>
          </div>

          <div class="tv-option-box opt-c ${correct === 'C' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:32px; font-weight:950;">🟡 C</span>
            <div style="flex:1;">
              <div>${q.c || ''} ${correct === 'C' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:13px; opacity:0.85; margin-top:2px;">${counts['C']} votos (${pct('C')}%)</div>
            </div>
          </div>

          <div class="tv-option-box opt-d ${correct === 'D' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:32px; font-weight:950;">🟢 D</span>
            <div style="flex:1;">
              <div>${q.d || ''} ${correct === 'D' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:13px; opacity:0.85; margin-top:2px;">${counts['D']} votos (${pct('D')}%)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Leaderboard Phase (Top 5 Live Standing with Scores)
  function renderLeaderboardPhase(container) {
    if (timerInterval) clearInterval(timerInterval);

    const players = Object.values(playersMap);
    players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    const currIdx = gameData.currentQuestionIndex || 0;
    const totalQ = (gameData.questions || []).length || 10;

    let rowsHtml = '';
    players.slice(0, 5).forEach((p, idx) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;
      const thisQPoints = p.answers?.[currIdx]?.pointsEarned || 0;

      rowsHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.06); border:2px solid ${idx === 0 ? '#ffd100' : 'rgba(255,255,255,0.12)'}; border-radius:18px; padding:14px 28px; margin-bottom:12px; box-shadow:0 6px 20px rgba(0,0,0,0.4);">
          <div style="display:flex; align-items:center; gap:18px;">
            <span style="font-size:30px;">${medals[idx] || '#' + (idx + 1)}</span>
            <img src="${photoSrc}" style="width:52px; height:52px; border-radius:50%; object-fit:cover; border:2px solid ${idx === 0 ? '#ffd100' : '#fff'};" onerror="this.src='img/logo.jpg'"/>
            <div>
              <strong style="font-size:22px; color:#ffffff; font-family:'Outfit', sans-serif;">${p.nickname || p.playerName}</strong>
              <div style="font-size:13px; color:#ffd100; font-weight:800;">${p.waiter ? 'Mesa: ' + p.waiter : 'Cliente'} ${thisQPoints > 0 ? `• 🔥 +${thisQPoints} pts` : ''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:30px; font-weight:950; color:#ffd100; font-family:'Outfit', sans-serif;">${p.totalScore || 0}</div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:800; letter-spacing:0.5px;">PUNTOS</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="max-width:920px; margin:0 auto; width:100%; text-align:center;">
        <div style="font-size:15px; font-weight:900; color:#00e676; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
          POSICIONES TRAS LA PREGUNTA ${currIdx + 1} DE ${totalQ}
        </div>
        <h2 style="font-size:36px; font-weight:950; color:#ffd100; margin:0 0 20px 0; font-family:'Outfit', sans-serif;">
          📊 TABLA DE POSICIONES EN VIVO
        </h2>
        <div style="text-align:left;">
          ${rowsHtml || '<div class="hint-text text-center py-4">Esperando respuestas...</div>'}
        </div>
      </div>
    `;
  }

  // 6. Podium Grand Finale (Reverse Sequential Reveal + Paginated Looping Table)
  function renderPodiumPhase(container) {
    if (timerInterval) clearInterval(timerInterval);

    const players = Object.values(playersMap);
    players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    const p1 = players[0] || { nickname: 'Campeón', totalScore: 0 };
    const p2 = players[1] || { nickname: '2° Lugar', totalScore: 0 };
    const p3 = players[2] || { nickname: '3° Lugar', totalScore: 0 };
    const p4 = players[3];
    const p5 = players[4];

    const getPhoto = p => p?.photoURL || p?.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p?.nickname || 'J')}&background=ffd100&color=000&bold=true`;

    container.innerHTML = `
      <div id="tvPodiumContainer" style="text-align:center; padding:10px 0; width:100%;">
        <h2 style="font-size:42px; font-weight:950; color:#ffd100; margin:0 0 6px 0; font-family:'Outfit', sans-serif; text-shadow:0 0 25px rgba(255,209,0,0.5);">
          🏆 ¡PODIO DE GANADORES DE TRIVIA! 🏆
        </h2>
        <p class="hint-text" style="font-size:16px; margin:0 0 20px 0;">Felicidades a los campeones de Drinks & Wins:</p>

        <!-- Top 3 Pedestals (Silver 2nd, Gold 1st, Bronze 3rd) -->
        <div class="trivia-tv-podium-wrap" style="display:flex; justify-content:center; align-items:flex-end; gap:20px; margin-bottom:20px;">
          <!-- 2nd Place (Silver) -->
          <div id="podiumCol2" class="trivia-podium-column" style="order:1; transition:all 0.5s ease;">
            <img src="${getPhoto(p2)}" class="trivia-podium-avatar" style="width:72px; height:72px; border-radius:50%; border:3px solid #silver; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:18px; font-weight:900; color:#fff; margin-bottom:2px;">${p2.nickname || p2.playerName}</div>
            <div style="font-size:15px; font-weight:950; color:#ffd100; margin-bottom:6px;">${p2.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal silver" style="background:linear-gradient(to top, #757575, #bdbdbd); padding:20px 24px; border-radius:14px 14px 0 0; color:#000; font-weight:950;">
              <span style="font-size:36px;">🥈</span>
              <div style="font-size:18px;">2° LUGAR</div>
            </div>
          </div>

          <!-- 1st Place (Gold Champion) -->
          <div id="podiumCol1" class="trivia-podium-column" style="order:2; width:220px; transition:all 0.5s ease;">
            <span style="font-size:36px; margin-bottom:-10px; z-index:10; display:block;">👑</span>
            <img src="${getPhoto(p1)}" class="trivia-podium-avatar gold-ring" style="width:96px; height:96px; border-radius:50%; border:4px solid #ffd100; box-shadow:0 0 30px rgba(255,209,0,0.8); object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:22px; font-weight:950; color:#ffd100; margin-bottom:2px; font-family:'Outfit', sans-serif;">${p1.nickname || p1.playerName}</div>
            <div style="font-size:20px; font-weight:950; color:#00e676; margin-bottom:6px;">${p1.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal gold" style="background:linear-gradient(to top, #f57f17, #ffd600); padding:32px 28px; border-radius:16px 16px 0 0; color:#000; font-weight:950; box-shadow:0 0 40px rgba(255,209,0,0.6);">
              <span style="font-size:52px;">🏆</span>
              <div style="font-size:24px; font-weight:950;">1° CAMPEÓN</div>
            </div>
          </div>

          <!-- 3rd Place (Bronze) -->
          <div id="podiumCol3" class="trivia-podium-column" style="order:3; transition:all 0.5s ease;">
            <img src="${getPhoto(p3)}" class="trivia-podium-avatar" style="width:68px; height:68px; border-radius:50%; border:3px solid #cd7f32; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:18px; font-weight:900; color:#fff; margin-bottom:2px;">${p3.nickname || p3.playerName}</div>
            <div style="font-size:15px; font-weight:950; color:#ffd100; margin-bottom:6px;">${p3.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal bronze" style="background:linear-gradient(to top, #8d6e63, #d7ccc8); padding:16px 20px; border-radius:12px 12px 0 0; color:#000; font-weight:950;">
              <span style="font-size:32px;">🥉</span>
              <div style="font-size:16px;">3° LUGAR</div>
            </div>
          </div>
        </div>

        <!-- 4th & 5th Place Runner-ups -->
        ${(p4 || p5) ? `
          <div style="display:flex; justify-content:center; gap:20px; margin-top:10px;">
            ${p4 ? `
              <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:8px 18px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);">
                <span style="font-weight:900; color:#ffd100;">4°</span>
                <img src="${getPhoto(p4)}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
                <strong style="color:#fff;">${p4.nickname || p4.playerName}</strong>
                <span style="color:#ffd100; font-weight:800;">${p4.totalScore || 0} pts</span>
              </div>
            ` : ''}
            ${p5 ? `
              <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:8px 18px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);">
                <span style="font-weight:900; color:#ffd100;">5°</span>
                <img src="${getPhoto(p5)}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
                <strong style="color:#fff;">${p5.nickname || p5.playerName}</strong>
                <span style="color:#ffd100; font-weight:800;">${p5.totalScore || 0} pts</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Looping Full Ranking Carousel Container -->
        <div id="tvFullRankingLoopWrap" style="margin-top:24px; display:none;"></div>
      </div>
    `;

    // Fire Confetti Cannon
    if (window.confetti) {
      window.confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
      setTimeout(() => {
        window.confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0 } });
        window.confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1 } });
      }, 600);
    }

    // Start Looping Full Leaderboard after 18 seconds
    setTimeout(() => {
      startLeaderboardLoop(players);
    }, 18000);
  }

  // Looping paginated leaderboard for all tables in restaurant
  function startLeaderboardLoop(players) {
    if (leaderboardLoopInterval) clearInterval(leaderboardLoopInterval);
    if (!players || players.length === 0) return;

    const wrap = document.getElementById('tvFullRankingLoopWrap');
    if (!wrap) return;
    wrap.style.display = 'block';

    const pageSize = 8;
    const totalPages = Math.ceil(players.length / pageSize);
    leaderboardLoopPageIndex = 0;

    function renderPage(pageIdx) {
      const start = pageIdx * pageSize;
      const end = start + pageSize;
      const pagePlayers = players.slice(start, end);

      let rowsHtml = '';
      pagePlayers.forEach((p, idx) => {
        const globalRank = start + idx + 1;
        const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;

        rowsHtml += `
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.06); border-radius:12px; padding:10px 20px; border:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:18px; font-weight:900; color:#ffd100; width:28px;">#${globalRank}</span>
              <img src="${photoSrc}" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
              <div>
                <strong style="color:#ffffff; font-size:16px;">${p.nickname || p.playerName}</strong>
                <div style="font-size:11px; color:var(--text-muted);">${p.waiter ? 'Mesa: ' + p.waiter : 'Cliente'}</div>
              </div>
            </div>
            <div style="font-size:18px; font-weight:900; color:#ffd100;">${p.totalScore || 0} pts</div>
          </div>
        `;
      });

      wrap.innerHTML = `
        <div style="background:rgba(0,0,0,0.45); border:1.5px solid rgba(255,209,0,0.3); border-radius:20px; padding:18px 24px; max-width:880px; margin:0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:18px; font-weight:900; color:#ffd100; font-family:'Outfit', sans-serif;">
              📋 TABLA GENERAL DE POSICIONES (Página ${pageIdx + 1} de ${totalPages})
            </h3>
            <span class="badge" style="background:#ffd100; color:#000; font-weight:900;">${players.length} Jugadores</span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; text-align:left;">
            ${rowsHtml}
          </div>
        </div>
      `;
    }

    renderPage(0);

    if (totalPages > 1) {
      leaderboardLoopInterval = setInterval(() => {
        leaderboardLoopPageIndex = (leaderboardLoopPageIndex + 1) % totalPages;
        renderPage(leaderboardLoopPageIndex);
      }, 6000);
    }
  }

  // Initialize on Load
  initTriviaTV();
})();
