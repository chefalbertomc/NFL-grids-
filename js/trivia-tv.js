// Trivia TV Projection Screen & Auto-Game Master for Drinks & Wins
(function() {
  'use strict';

  let db = null;
  let gameId = null;
  let gameData = null;
  let playersMap = {};
  let tvTickerInterval = null;
  let currentRenderedKey = null;
  let leaderboardLoopPageIndex = 0;
  let leaderboardLoopInterval = null;

  function getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('gameId') || params.get('id') || params.get('pin');
  }

  async function ensureTVAuth() {
    if (window.firebase && firebase.auth) {
      if (!firebase.auth().currentUser) {
        try {
          await firebase.auth().signInAnonymously();
          console.log('[TriviaTV] Pantalla TV autenticada en Firebase');
        } catch (e) {
          console.warn('[TriviaTV] Auth note:', e);
        }
      }
    }
  }

  function initTriviaTV() {
    if (window.db && window.firebase && firebase.auth) {
      db = window.db;
      ensureTVAuth().then(() => {
        gameId = getGameIdFromUrl();
        if (!gameId) {
          showTVRoomSelector();
        } else {
          listenToGame(gameId);
        }
      });
    } else {
      setTimeout(initTriviaTV, 100);
    }
  }

  // =========================================================================
  // CENTRAL SYNCHRONIZED TIMELINE CALCULATOR (ZERO FIRESTORE WRITE ERRORS)
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
    const timePerQ = game.timePerQuestion || 8;
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
        // Answering Question
        const rem = Math.max(0, Math.ceil(timePerQ - qSec));
        return {
          status: 'question',
          questionIndex: qIdx,
          question: q,
          remainingSec: rem,
          timeLimit: timePerQ,
          totalQuestions: totalQ
        };
      } else if (qSec < timePerQ + revealSec) {
        // Revealing Correct Answer
        const rem = Math.max(0, Math.ceil((timePerQ + revealSec) - qSec));
        return {
          status: 'reveal',
          questionIndex: qIdx,
          question: q,
          remainingSec: rem,
          totalQuestions: totalQ
        };
      } else {
        // Showing Question Leaderboard
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
  // TV ROOM SELECTOR & REMOTE-FRIENDLY PIN PAD
  // =========================================================================
  window.showTVRoomSelector = function() {
    if (tvTickerInterval) clearInterval(tvTickerInterval);
    if (leaderboardLoopInterval) clearInterval(leaderboardLoopInterval);

    currentRenderedKey = null;
    const main = document.getElementById('tvMainContent');
    const titleEl = document.getElementById('tvGameTitle');
    const pinEl = document.getElementById('tvPinBadge');

    if (titleEl) titleEl.textContent = '📍 Selecciona una Sala de Trivia';
    if (pinEl) pinEl.textContent = 'PIN: ----';

    if (!db || !main) return;

    db.collection('trivia_games').get().then(snap => {
      const games = [];
      snap.forEach(doc => games.push({ id: doc.id, ...doc.data() }));
      games.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      let gamesCardsHtml = '';
      if (games.length === 0) {
        gamesCardsHtml = `
          <div style="background:rgba(255,255,255,0.05); padding:30px; border-radius:18px; text-align:center; border:2px dashed rgba(255,209,0,0.3); grid-column:1/-1;">
            <p style="font-size:22px; color:var(--text-muted); margin:0;">No hay salas de trivia creadas actualmente.</p>
            <p style="font-size:16px; color:#ffd100; margin-top:8px;">Crea una sala desde el Panel de Administración para proyectar aquí.</p>
          </div>
        `;
      } else {
        games.forEach(gm => {
          gamesCardsHtml += `
            <div onclick="window.selectTVGame('${gm.id}')" style="background:rgba(255,255,255,0.07); border:2.5px solid rgba(255,209,0,0.4); border-radius:20px; padding:24px 28px; cursor:pointer; text-align:left; transition:all 0.25s ease; box-shadow:0 8px 30px rgba(0,0,0,0.5);" onmouseover="this.style.borderColor='#ffd100'; this.style.transform='scale(1.02)';" onmouseout="this.style.borderColor='rgba(255,209,0,0.4)'; this.style.transform='scale(1)';">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span class="badge" style="background:#ffd100; color:#000; font-size:18px; font-weight:950; padding:6px 14px; border-radius:10px; font-family:'Outfit', sans-serif;">PIN: ${gm.pin || '----'}</span>
                <span style="font-size:15px; color:#00e676; font-weight:800;">📍 ${gm.store || 'Sucursal'}</span>
              </div>
              <h3 style="margin:0 0 8px 0; font-size:26px; font-weight:950; color:#ffffff; font-family:'Outfit', sans-serif;">${gm.title}</h3>
              <div style="font-size:16px; color:#ffd100; font-weight:800;">
                ⏱️ ${gm.timePerQuestion || 8}s por pregunta • 📋 ${(gm.questions || []).length} preguntas
              </div>
              <div style="margin-top:14px; text-align:right;">
                <button type="button" class="btn btn-primary" style="font-size:16px; font-weight:900; padding:8px 20px;">
                  Proyectar Sala 🖥️
                </button>
              </div>
            </div>
          `;
        });
      }

      main.innerHTML = `
        <div style="max-width:1300px; margin:0 auto; width:100%; text-align:center;">
          <h2 style="font-size:42px; font-weight:950; color:#ffd100; margin:0 0 10px 0; font-family:'Outfit', sans-serif;">
            📺 SELECCIONA LA SALA PARA PROYECTAR
          </h2>
          <p class="hint-text" style="font-size:18px; margin:0 0 28px 0;">Elige una sala activa o ingresa el PIN de 4 dígitos:</p>

          <!-- Quick PIN Input Row -->
          <div style="display:flex; justify-content:center; align-items:center; gap:14px; margin-bottom:34px; background:rgba(0,0,0,0.5); padding:16px 28px; border-radius:20px; border:2px solid rgba(255,209,0,0.3); max-width:600px; margin-left:auto; margin-right:auto;">
            <label style="font-size:20px; font-weight:900; color:#ffd100;">Ingresar PIN:</label>
            <input type="text" id="tvPinDirectInput" maxlength="4" placeholder="4 Dígitos" style="font-size:28px; font-weight:950; text-align:center; width:170px; letter-spacing:4px; padding:8px; border-radius:12px; border:2px solid #ffd100; background:#0e1420; color:#ffd100; font-family:'Outfit', sans-serif;" onkeypress="if(event.key==='Enter') window.submitDirectPin();" />
            <button type="button" onclick="window.submitDirectPin()" class="btn btn-primary" style="font-size:18px; font-weight:900; padding:10px 24px;">
              Entrar 🚀
            </button>
          </div>

          <!-- Active Rooms Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap:20px;">
            ${gamesCardsHtml}
          </div>
        </div>
      `;
    }).catch(err => {
      console.error('[TriviaTV] Error loading rooms:', err);
    });
  };

  window.selectTVGame = function(targetGameId) {
    gameId = targetGameId;
    currentRenderedKey = null;
    const newUrl = `${window.location.pathname}?gameId=${targetGameId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    listenToGame(targetGameId);
  };

  window.submitDirectPin = function() {
    const pinVal = document.getElementById('tvPinDirectInput')?.value.trim();
    if (!pinVal || pinVal.length < 4) {
      alert('Ingresa el PIN de 4 dígitos de la trivia.');
      return;
    }
    db.collection('trivia_games').where('pin', '==', pinVal).limit(1).get().then(snap => {
      if (!snap.empty) {
        window.selectTVGame(snap.docs[0].id);
      } else {
        alert(`No se encontró ninguna sala de trivia con el PIN ${pinVal}.`);
      }
    });
  };

  // =========================================================================
  // LISTEN TO ACTIVE TRIVIA GAME
  // =========================================================================
  function listenToGame(targetId) {
    if (!db || !targetId) return;

    if (/^\d{4}$/.test(targetId)) {
      db.collection('trivia_games').where('pin', '==', targetId).limit(1).onSnapshot(snap => {
        if (!snap.empty) {
          gameId = snap.docs[0].id;
          setupGameListeners(gameId);
        } else {
          showTVRoomSelector();
        }
      });
      return;
    }

    setupGameListeners(targetId);
  }

  function setupGameListeners(targetId) {
    // 1. Listen to game state in real time
    db.collection('trivia_games').doc(targetId).onSnapshot(doc => {
      if (!doc.exists) {
        showTVRoomSelector();
        return;
      }
      gameData = { id: doc.id, ...doc.data() };
      updateHeaderInfo();
    }, err => console.error('[TriviaTV] Error loading game:', err));

    // 2. Listen to connected players in real time
    db.collection('trivia_games').doc(targetId).collection('players').onSnapshot(snap => {
      playersMap = {};
      snap.forEach(pDoc => {
        playersMap[pDoc.id] = { id: pDoc.id, ...pDoc.data() };
      });
      updatePlayersUIInPlace();
    }, err => console.error('[TriviaTV] Error loading players:', err));

    // 3. Start high-precision TV Ticker loop (100ms)
    startTVTicker();
  }

  function updateHeaderInfo() {
    if (!gameData) return;
    const titleEl = document.getElementById('tvGameTitle');
    const pinEl = document.getElementById('tvPinBadge');
    const urlEl = document.getElementById('tvJoinUrlDisplay');

    if (titleEl) titleEl.textContent = `📍 ${gameData.store || 'Sucursal'} • ${gameData.title}`;
    if (pinEl) pinEl.textContent = `PIN: ${gameData.pin || gameData.id}`;
    if (urlEl) urlEl.textContent = `${window.location.host || 'drinks-wins.web.app'}`;
  }

  // Update players count and chips without re-rendering entire screen
  function updatePlayersUIInPlace() {
    const players = Object.values(playersMap);
    const countEl = document.getElementById('tvLobbyPlayersCount');
    const listEl = document.getElementById('tvLobbyPlayersList');

    if (countEl) countEl.textContent = `${players.length}`;

    if (listEl) {
      if (players.length === 0) {
        listEl.innerHTML = `<div style="font-size:22px; color:var(--text-muted); padding:20px 0;">Escanea el código QR gigante para unirte a la trivia...</div>`;
      } else {
        listEl.innerHTML = players.map(p => {
          const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;
          return `
            <div style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.1); padding:10px 20px; border-radius:30px; border:2px solid rgba(255,209,0,0.4); animation:popIn 0.3s ease;">
              <img src="${photoSrc}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2.5px solid #ffd100;" alt="${p.nickname}" onerror="this.src='img/logo.jpg'"/>
              <span style="font-size:20px; font-weight:950; color:#ffffff;">${p.nickname || p.playerName}</span>
            </div>
          `;
        }).join('');
      }
    }
  }

  // TV Remote Start Button (Sets start timestamp once)
  window.startTriviaFromTV = async function() {
    if (!gameData || !db) return;
    try {
      // Clear player scores
      const playersSnap = await db.collection('trivia_games').doc(gameData.id).collection('players').get();
      if (!playersSnap.empty) {
        const batch = db.batch();
        playersSnap.forEach(pDoc => {
          batch.update(pDoc.ref, { totalScore: 0, answers: {} });
        });
        await batch.commit();
      }

      await db.collection('trivia_games').doc(gameData.id).update({
        status: 'running',
        autoFlowStartTime: Date.now()
      });
    } catch (e) {
      alert('Error al iniciar: ' + e.message);
    }
  };

  // TV Reset to Lobby Button
  window.resetTriviaToLobby = async function() {
    if (!gameData || !db) return;
    try {
      await db.collection('trivia_games').doc(gameData.id).update({
        status: 'lobby',
        autoFlowStartTime: null
      });

      const playersSnap = await db.collection('trivia_games').doc(gameData.id).collection('players').get();
      if (!playersSnap.empty) {
        const batch = db.batch();
        playersSnap.forEach(pDoc => {
          batch.update(pDoc.ref, { totalScore: 0, answers: {} });
        });
        await batch.commit();
      }
    } catch (e) {
      alert('Error al reiniciar sala: ' + e.message);
    }
  };

  // =========================================================================
  // HIGH PRECISION TICKER LOOP (100ms)
  // =========================================================================
  function startTVTicker() {
    if (tvTickerInterval) clearInterval(tvTickerInterval);
    tvTickerInterval = setInterval(() => {
      if (!gameData) return;
      const phase = computeTriviaTimelinePhase(gameData);
      renderTVPhase(phase);
    }, 100);
  }

  function renderTVPhase(phase) {
    const main = document.getElementById('tvMainContent');
    if (!main) return;

    const phaseKey = `${phase.status}_${phase.questionIndex !== undefined ? phase.questionIndex : ''}`;

    // Update live clock in-place if phase is already mounted
    if (currentRenderedKey === phaseKey) {
      if (phase.status === 'countdown') {
        const clockEl = document.getElementById('tvCountdownBigNum');
        if (clockEl) clockEl.textContent = phase.remainingSec;
      } else if (phase.status === 'question') {
        const clockEl = document.getElementById('tvCountdownClock');
        if (clockEl) {
          clockEl.textContent = phase.remainingSec;
          if (phase.remainingSec <= 3) {
            clockEl.style.borderColor = '#ff0033';
            clockEl.style.color = '#ff0033';
            clockEl.style.boxShadow = '0 0 35px rgba(255,0,51,1)';
          }
        }
        // Update answered count in-place
        const players = Object.values(playersMap);
        const answeredCount = players.filter(p => p.answers && p.answers[phase.questionIndex] !== undefined).length;
        const ansEl = document.getElementById('tvQuestionAnsweredCount');
        if (ansEl) ansEl.textContent = `⚡ ${answeredCount} de ${players.length} Jugadores han respondido`;
      }
      return;
    }

    // Phase changed -> Render new phase structure
    currentRenderedKey = phaseKey;

    if (phase.status === 'lobby') {
      renderLobbyPhase(main);
    } else if (phase.status === 'countdown') {
      renderCountdownPhase(main, phase);
    } else if (phase.status === 'question') {
      renderQuestionPhase(main, phase);
    } else if (phase.status === 'reveal') {
      renderRevealPhase(main, phase);
    } else if (phase.status === 'leaderboard') {
      renderLeaderboardPhase(main, phase);
    } else if (phase.status === 'podium' || phase.status === 'finished') {
      renderPodiumPhase(main, phase);
    }
  }

  // 1. Lobby Phase
  function renderLobbyPhase(container) {
    if (leaderboardLoopInterval) clearInterval(leaderboardLoopInterval);

    const players = Object.values(playersMap);
    const origin = window.location.origin || '';
    const cleanPath = window.location.pathname.replace('trivia-tv.html', 'index.html').replace('tv.html', 'index.html');
    const joinUrl = `${origin}${cleanPath}?pin=${gameData.pin || ''}#tab-trivia`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&data=${encodeURIComponent(joinUrl)}&color=0-0-0&bgcolor=ffd100&margin=2`;

    container.innerHTML = `
      <div style="text-align:center; padding:10px 0; width:100%;">
        <div style="display:flex; align-items:center; justify-content:center; gap:60px; flex-wrap:wrap; background:rgba(0,0,0,0.55); padding:36px 48px; border-radius:32px; border:3px solid #ffd100; box-shadow:0 15px 50px rgba(0,0,0,0.85); max-width:1250px; margin:0 auto;">
          <!-- Giant QR Code -->
          <div style="text-align:center;">
            <img src="${qrApiUrl}" alt="QR de Acceso" class="tv-qr-giant" />
            <div style="font-size:20px; font-weight:950; color:#ffd100; margin-top:14px; letter-spacing:1px;">
              📱 ESCANEA CON TU CÁMARA
            </div>
          </div>

          <!-- Instructions & Start Button -->
          <div style="text-align:left; max-width:560px;">
            <div style="display:inline-block; background:#ffd100; color:#000; font-size:20px; font-weight:950; padding:6px 18px; border-radius:10px; margin-bottom:12px; font-family:'Outfit', sans-serif;">
              PASO 1: ENTRA AL JUEGO
            </div>
            <h2 style="font-size:44px; font-weight:950; color:#ffffff; margin:0 0 10px 0; font-family:'Outfit', sans-serif; line-height:1.15;">
              ¡Preparen sus Celulares para Jugar!
            </h2>
            <p style="font-size:20px; color:#e0e0e0; line-height:1.4; margin-bottom:18px;">
              Contesta cada pregunta en tu celular lo más rápido posible. ¡Entre más rápido aciertes, más puntos ganas!
            </p>
            <div style="font-size:22px; color:#00e676; font-weight:950; margin-bottom:24px;">
              👥 <strong id="tvLobbyPlayersCount">${players.length}</strong> Jugadores Conectados en el Bar
            </div>

            <!-- Big Start Button on TV -->
            <button type="button" onclick="window.startTriviaFromTV()" class="btn btn-primary" style="padding:18px 36px; font-size:24px; font-weight:950; background:linear-gradient(135deg, #ffd100, #ff9900); color:#000; border:none; border-radius:18px; box-shadow:0 0 35px rgba(255,209,0,0.7); cursor:pointer; width:100%; letter-spacing:0.5px;">
              ▶️ Empezar Trivia (10s) 🔥
            </button>
          </div>
        </div>

        <!-- Connected Players Live Grid -->
        <div style="width:100%; max-width:1250px; margin:28px auto 0 auto; text-align:left;">
          <h3 style="font-size:22px; font-weight:950; color:#ffd100; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:14px;">
            🔥 Jugadores Conectados:
          </h3>
          <div id="tvLobbyPlayersList" style="display:flex; flex-wrap:wrap; gap:12px; max-height:200px; overflow-y:auto;"></div>
        </div>
      </div>
    `;

    updatePlayersUIInPlace();
  }

  // 2. Countdown Phase
  function renderCountdownPhase(container, phase) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:30px; font-weight:950; color:#ffd100; text-transform:uppercase; letter-spacing:3px; margin-bottom:18px;">
          ⚡ ¡ATENCIÓN A TODAS LAS MESAS! ⚡
        </div>
        <h2 style="font-size:54px; font-weight:950; color:#ffffff; margin:0 0 24px 0; font-family:'Outfit', sans-serif;">
          LA TRIVIA VA A COMENZAR EN:
        </h2>
        <div id="tvCountdownBigNum" class="tv-countdown-number">${phase.remainingSec}</div>
        <p style="font-size:28px; color:#00e676; font-weight:950; margin-top:28px; letter-spacing:0.5px;">
          ¡Preparen sus dedos para contestar rápido! 🚀
        </p>
      </div>
    `;
  }

  // 3. Question Phase
  function renderQuestionPhase(container, phase) {
    const currIdx = phase.questionIndex;
    const totalQ = phase.totalQuestions;
    const q = phase.question || {};
    const timeLimit = phase.timeLimit || 8;

    const players = Object.values(playersMap);
    const answeredCount = players.filter(p => p.answers && p.answers[currIdx] !== undefined).length;

    container.innerHTML = `
      <div style="max-width:1450px; margin:0 auto; width:100%;">
        <!-- Question Box -->
        <div style="background:rgba(0,0,0,0.6); border:3px solid #ffd100; border-radius:30px; padding:32px 48px; margin-bottom:28px; position:relative; box-shadow:0 15px 50px rgba(0,0,0,0.8); text-align:center;">
          <!-- Giant Clock -->
          <div id="tvCountdownClock" style="position:absolute; top:24px; right:32px; width:95px; height:95px; border-radius:50%; background:#101726; border:5px solid #ffd100; display:flex; align-items:center; justify-content:center; font-size:44px; font-weight:950; color:#ffd100; font-family:'Outfit', sans-serif; box-shadow:0 0 30px rgba(255,209,0,0.6);">
            ${phase.remainingSec}
          </div>

          <div style="font-size:22px; font-weight:950; color:#ffd100; text-transform:uppercase; letter-spacing:2px; margin-bottom:12px;">
            PREGUNTA ${currIdx + 1} DE ${totalQ}
          </div>
          <h2 class="tv-question-text" style="margin:0 0 16px 0;">
            ${q.q || 'Cargando pregunta...'}
          </h2>
          <div style="display:inline-flex; align-items:center; gap:12px; background:rgba(255,255,255,0.12); padding:8px 22px; border-radius:24px;">
            <span id="tvQuestionAnsweredCount" style="font-size:18px; font-weight:900; color:#00e676;">⚡ ${answeredCount} de ${players.length} Jugadores han respondido</span>
          </div>
        </div>

        <!-- 4 Giant Option Cards -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <div class="tv-option-box opt-a">
            <span style="font-size:42px; font-weight:950;">🔴 A</span>
            <span>${q.a || ''}</span>
          </div>
          <div class="tv-option-box opt-b">
            <span style="font-size:42px; font-weight:950;">🔵 B</span>
            <span>${q.b || ''}</span>
          </div>
          <div class="tv-option-box opt-c">
            <span style="font-size:42px; font-weight:950;">🟡 C</span>
            <span>${q.c || ''}</span>
          </div>
          <div class="tv-option-box opt-d">
            <span style="font-size:42px; font-weight:950;">🟢 D</span>
            <span>${q.d || ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Reveal Phase
  function renderRevealPhase(container, phase) {
    const currIdx = phase.questionIndex;
    const totalQ = phase.totalQuestions;
    const q = phase.question || {};
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
      <div style="max-width:1450px; margin:0 auto; width:100%;">
        <!-- Question Box with Correct Badge & Fact -->
        <div style="background:rgba(0,0,0,0.6); border:3px solid #00e676; border-radius:30px; padding:28px 48px; margin-bottom:24px; box-shadow:0 0 40px rgba(0,230,118,0.4); text-align:center;">
          <div style="font-size:22px; font-weight:950; color:#00e676; text-transform:uppercase; letter-spacing:2px; margin-bottom:10px;">
            ✓ RESPUESTA REVELADA • PREGUNTA ${currIdx + 1} DE ${totalQ}
          </div>
          <h2 class="tv-question-text" style="font-size:44px; margin:0 0 16px 0;">
            ${q.q || ''}
          </h2>

          <!-- Expanded Real Explanation / Dato Curioso -->
          <div style="background:rgba(255,209,0,0.15); border:2.5px solid #ffd100; border-radius:18px; padding:14px 28px; display:inline-block; max-width:92%; text-align:left; box-shadow:0 4px 20px rgba(0,0,0,0.4);">
            <div style="font-size:22px; color:#ffd100; font-weight:950; line-height:1.35;">
              💡 <strong>Dato Curioso / Explicación:</strong> ${q.exp || '¡Respuesta correcta verificada!'}
            </div>
          </div>
        </div>

        <!-- 4 Option Cards with Correct Highlight and Stats -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <div class="tv-option-box opt-a ${correct === 'A' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:42px; font-weight:950;">🔴 A</span>
            <div style="flex:1;">
              <div>${q.a || ''} ${correct === 'A' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:16px; opacity:0.9; margin-top:4px;">${counts['A']} votos (${pct('A')}%)</div>
            </div>
          </div>

          <div class="tv-option-box opt-b ${correct === 'B' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:42px; font-weight:950;">🔵 B</span>
            <div style="flex:1;">
              <div>${q.b || ''} ${correct === 'B' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:16px; opacity:0.9; margin-top:4px;">${counts['B']} votos (${pct('B')}%)</div>
            </div>
          </div>

          <div class="tv-option-box opt-c ${correct === 'C' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:42px; font-weight:950;">🟡 C</span>
            <div style="flex:1;">
              <div>${q.c || ''} ${correct === 'C' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:16px; opacity:0.9; margin-top:4px;">${counts['C']} votos (${pct('C')}%)</div>
            </div>
          </div>

          <div class="tv-option-box opt-d ${correct === 'D' ? 'correct-highlight' : 'wrong-dimmed'}">
            <span style="font-size:42px; font-weight:950;">🟢 D</span>
            <div style="flex:1;">
              <div>${q.d || ''} ${correct === 'D' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:16px; opacity:0.9; margin-top:4px;">${counts['D']} votos (${pct('D')}%)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Leaderboard Phase
  function renderLeaderboardPhase(container, phase) {
    const players = Object.values(playersMap);
    players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    const currIdx = phase.questionIndex;
    const totalQ = phase.totalQuestions;

    let rowsHtml = '';
    players.slice(0, 5).forEach((p, idx) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;
      const thisQPoints = p.answers?.[currIdx]?.pointsEarned || 0;

      rowsHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.08); border:2.5px solid ${idx === 0 ? '#ffd100' : 'rgba(255,255,255,0.15)'}; border-radius:22px; padding:18px 36px; margin-bottom:14px; box-shadow:0 8px 25px rgba(0,0,0,0.5);">
          <div style="display:flex; align-items:center; gap:22px;">
            <span style="font-size:38px;">${medals[idx] || '#' + (idx + 1)}</span>
            <img src="${photoSrc}" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:3px solid ${idx === 0 ? '#ffd100' : '#fff'};" onerror="this.src='img/logo.jpg'"/>
            <div>
              <strong style="font-size:28px; color:#ffffff; font-family:'Outfit', sans-serif;">${p.nickname || p.playerName}</strong>
              <div style="font-size:16px; color:#ffd100; font-weight:900;">${p.waiter ? 'Mesa: ' + p.waiter : 'Cliente'} ${thisQPoints > 0 ? `• 🔥 +${thisQPoints} pts` : ''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:38px; font-weight:950; color:#ffd100; font-family:'Outfit', sans-serif;">${p.totalScore || 0}</div>
            <div style="font-size:13px; color:var(--text-muted); font-weight:900; letter-spacing:1px;">PUNTOS</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="max-width:1100px; margin:0 auto; width:100%; text-align:center;">
        <div style="font-size:20px; font-weight:950; color:#00e676; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px;">
          POSICIONES TRAS LA PREGUNTA ${currIdx + 1} DE ${totalQ}
        </div>
        <h2 style="font-size:46px; font-weight:950; color:#ffd100; margin:0 0 24px 0; font-family:'Outfit', sans-serif;">
          📊 TABLA DE POSICIONES EN VIVO
        </h2>
        <div style="text-align:left;">
          ${rowsHtml || '<div class="hint-text text-center py-4" style="font-size:20px;">Esperando respuestas de los clientes...</div>'}
        </div>
      </div>
    `;
  }

  // 6. Podium Grand Finale
  function renderPodiumPhase(container, phase) {
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
        <h2 style="font-size:52px; font-weight:950; color:#ffd100; margin:0 0 8px 0; font-family:'Outfit', sans-serif; text-shadow:0 0 35px rgba(255,209,0,0.6);">
          🏆 ¡PODIO DE GANADORES DE TRIVIA! 🏆
        </h2>
        <p class="hint-text" style="font-size:20px; margin:0 0 24px 0;">Felicidades a los campeones de Drinks & Wins:</p>

        <!-- Top 3 Pedestals (Silver 2nd, Gold 1st, Bronze 3rd) -->
        <div class="trivia-tv-podium-wrap" style="display:flex; justify-content:center; align-items:flex-end; gap:28px; margin-bottom:24px;">
          <!-- 2nd Place (Silver) -->
          <div class="trivia-podium-column" style="order:1; transition:all 0.5s ease;">
            <img src="${getPhoto(p2)}" class="trivia-podium-avatar" style="width:88px; height:88px; border-radius:50%; border:4px solid #c0c0c0; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:24px; font-weight:950; color:#fff; margin-bottom:3px;">${p2.nickname || p2.playerName}</div>
            <div style="font-size:20px; font-weight:950; color:#ffd100; margin-bottom:8px;">${p2.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal silver" style="background:linear-gradient(to top, #757575, #bdbdbd); padding:26px 32px; border-radius:18px 18px 0 0; color:#000; font-weight:950;">
              <span style="font-size:46px;">🥈</span>
              <div style="font-size:22px;">2° LUGAR</div>
            </div>
          </div>

          <!-- 1st Place (Gold Champion) -->
          <div class="trivia-podium-column" style="order:2; width:260px; transition:all 0.5s ease;">
            <span style="font-size:48px; margin-bottom:-12px; z-index:10; display:block;">👑</span>
            <img src="${getPhoto(p1)}" class="trivia-podium-avatar gold-ring" style="width:115px; height:115px; border-radius:50%; border:5px solid #ffd100; box-shadow:0 0 35px rgba(255,209,0,0.9); object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:28px; font-weight:950; color:#ffd100; margin-bottom:4px; font-family:'Outfit', sans-serif;">${p1.nickname || p1.playerName}</div>
            <div style="font-size:24px; font-weight:950; color:#00e676; margin-bottom:8px;">${p1.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal gold" style="background:linear-gradient(to top, #f57f17, #ffd600); padding:40px 36px; border-radius:20px 20px 0 0; color:#000; font-weight:950; box-shadow:0 0 50px rgba(255,209,0,0.7);">
              <span style="font-size:64px;">🏆</span>
              <div style="font-size:28px; font-weight:950;">1° CAMPEÓN</div>
            </div>
          </div>

          <!-- 3rd Place (Bronze) -->
          <div class="trivia-podium-column" style="order:3; transition:all 0.5s ease;">
            <img src="${getPhoto(p3)}" class="trivia-podium-avatar" style="width:84px; height:84px; border-radius:50%; border:4px solid #cd7f32; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:24px; font-weight:950; color:#fff; margin-bottom:3px;">${p3.nickname || p3.playerName}</div>
            <div style="font-size:20px; font-weight:950; color:#ffd100; margin-bottom:8px;">${p3.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal bronze" style="background:linear-gradient(to top, #8d6e63, #d7ccc8); padding:20px 28px; border-radius:16px 16px 0 0; color:#000; font-weight:950;">
              <span style="font-size:42px;">🥉</span>
              <div style="font-size:20px;">3° LUGAR</div>
            </div>
          </div>
        </div>

        <!-- 4th & 5th Place Runner-ups -->
        ${(p4 || p5) ? `
          <div style="display:flex; justify-content:center; gap:24px; margin-top:14px;">
            ${p4 ? `
              <div style="display:flex; align-items:center; gap:14px; background:rgba(255,255,255,0.1); padding:10px 24px; border-radius:16px; border:1.5px solid rgba(255,255,209,0.2);">
                <span style="font-weight:950; color:#ffd100; font-size:20px;">4°</span>
                <img src="${getPhoto(p4)}" style="width:42px; height:42px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
                <strong style="color:#fff; font-size:20px;">${p4.nickname || p4.playerName}</strong>
                <span style="color:#ffd100; font-weight:950; font-size:20px;">${p4.totalScore || 0} pts</span>
              </div>
            ` : ''}
            ${p5 ? `
              <div style="display:flex; align-items:center; gap:14px; background:rgba(255,255,255,0.1); padding:10px 24px; border-radius:16px; border:1.5px solid rgba(255,255,209,0.2);">
                <span style="font-weight:950; color:#ffd100; font-size:20px;">5°</span>
                <img src="${getPhoto(p5)}" style="width:42px; height:42px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
                <strong style="color:#fff; font-size:20px;">${p5.nickname || p5.playerName}</strong>
                <span style="color:#ffd100; font-weight:950; font-size:20px;">${p5.totalScore || 0} pts</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Looping Full Ranking Carousel Container -->
        <div id="tvFullRankingLoopWrap" style="margin-top:30px; display:none;"></div>
      </div>
    `;

    // Fire Confetti Cannon
    if (window.confetti) {
      window.confetti({ particleCount: 180, spread: 110, origin: { y: 0.6 } });
      setTimeout(() => {
        window.confetti({ particleCount: 140, angle: 60, spread: 80, origin: { x: 0 } });
        window.confetti({ particleCount: 140, angle: 120, spread: 80, origin: { x: 1 } });
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
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.08); border-radius:16px; padding:12px 24px; border:1.5px solid rgba(255,255,255,0.15);">
            <div style="display:flex; align-items:center; gap:16px;">
              <span style="font-size:24px; font-weight:950; color:#ffd100; width:36px;">#${globalRank}</span>
              <img src="${photoSrc}" style="width:46px; height:46px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
              <div>
                <strong style="color:#ffffff; font-size:22px;">${p.nickname || p.playerName}</strong>
                <div style="font-size:14px; color:var(--text-muted);">${p.waiter ? 'Mesa: ' + p.waiter : 'Cliente'}</div>
              </div>
            </div>
            <div style="font-size:24px; font-weight:950; color:#ffd100;">${p.totalScore || 0} pts</div>
          </div>
        `;
      });

      wrap.innerHTML = `
        <div style="background:rgba(0,0,0,0.55); border:2px solid #ffd100; border-radius:24px; padding:22px 32px; max-width:1050px; margin:0 auto; box-shadow:0 10px 40px rgba(0,0,0,0.7);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; font-size:24px; font-weight:950; color:#ffd100; font-family:'Outfit', sans-serif;">
              📋 TABLA GENERAL DE POSICIONES (Página ${pageIdx + 1} de ${totalPages})
            </h3>
            <span class="badge" style="background:#ffd100; color:#000; font-size:16px; font-weight:950; padding:6px 14px; border-radius:10px;">${players.length} Jugadores</span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px; text-align:left;">
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

  // Initialize
  initTriviaTV();
})();
