// Trivia TV Projection Screen Controller for Drinks & Wins
(function() {
  'use strict';

  let db = null;
  let gameId = null;
  let gameData = null;
  let playersMap = {};
  let timerInterval = null;

  function getGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('gameId') || params.get('id');
  }

  function initTriviaTV() {
    if (window.db) {
      db = window.db;
      gameId = getGameIdFromUrl();
      if (!gameId) {
        // Look for the latest active trivia game
        loadLatestTriviaGame();
      } else {
        listenToGame(gameId);
      }
    } else {
      setTimeout(initTriviaTV, 100);
    }
  }

  function loadLatestTriviaGame() {
    db.collection('trivia_games').orderBy('createdAt', 'desc').limit(1).onSnapshot(snap => {
      if (!snap.empty) {
        const doc = snap.docs[0];
        gameId = doc.id;
        listenToGame(gameId);
      } else {
        renderNoGameScreen();
      }
    });
  }

  function listenToGame(gId) {
    // 1. Listen to game state
    db.collection('trivia_games').doc(gId).onSnapshot(doc => {
      if (!doc.exists) {
        renderNoGameScreen();
        return;
      }
      gameData = { id: doc.id, ...doc.data() };
      updateHeaderInfo();
      renderCurrentPhase();
    }, err => console.error('[TriviaTV] Error loading game:', err));

    // 2. Listen to players
    db.collection('trivia_games').doc(gId).collection('players').onSnapshot(snap => {
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
    const urlEl = document.getElementById('tvJoinUrl');

    if (titleEl) titleEl.textContent = `📍 ${gameData.store || 'Sucursal'} • ${gameData.title}`;
    if (pinEl) pinEl.textContent = `PIN: ${gameData.pin || gameData.id}`;
    if (urlEl) urlEl.textContent = `${window.location.host || 'drinks-and-wins.web.app'}/#tab-trivia`;
  }

  function renderNoGameScreen() {
    const main = document.getElementById('tvMainContent');
    if (!main) return;
    main.innerHTML = `
      <div style="text-align:center; padding:80px 20px;">
        <span style="font-size:56px;">🧠</span>
        <h2 style="color:#ffd100; font-size:28px; margin-top:16px;">Esperando Inicio de Trivia...</h2>
        <p class="hint-text" style="font-size:16px;">Inicia una sala de Trivia desde el Panel de Administración para proyectar aquí.</p>
      </div>
    `;
  }

  function renderCurrentPhase() {
    if (!gameData) return;
    const main = document.getElementById('tvMainContent');
    if (!main) return;

    const status = gameData.status || 'lobby';

    if (status === 'lobby') {
      renderLobbyPhase(main);
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

  // 1. Lobby Phase (QR Code + Joining Players)
  function renderLobbyPhase(container) {
    if (timerInterval) clearInterval(timerInterval);

    const players = Object.values(playersMap);
    const joinUrl = `${window.location.origin}${window.location.pathname.replace('trivia-tv.html', 'index.html')}#tab-trivia`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}&color=0-0-0&bgcolor=ffd100`;

    let playersHtml = '';
    if (players.length === 0) {
      playersHtml = `<div style="font-size:16px; color:var(--text-muted); margin-top:20px;">Escanea el código QR o entra a la app para aparecer aquí...</div>`;
    } else {
      players.forEach(p => {
        const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;
        playersHtml += `
          <div class="trivia-tv-player-pill">
            <img src="${photoSrc}" class="trivia-tv-player-avatar" alt="${p.nickname}" onerror="this.src='img/logo.jpg'"/>
            <span style="font-size:16px; font-weight:900; color:#ffffff;">${p.nickname || p.playerName}</span>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div class="trivia-tv-lobby">
        <div style="display:flex; align-items:center; justify-content:center; gap:40px; flex-wrap:wrap; background:rgba(0,0,0,0.4); padding:28px 40px; border-radius:24px; border:2px solid rgba(255,209,0,0.3); box-shadow:0 12px 40px rgba(0,0,0,0.6);">
          <div style="text-align:center;">
            <img src="${qrApiUrl}" alt="QR de Acceso" style="width:200px; height:200px; border-radius:16px; border:3px solid #ffd100; box-shadow:0 0 25px rgba(255,209,0,0.5);" />
            <div style="font-size:12px; font-weight:900; color:#ffd100; margin-top:8px;">ESCANEA CON TU CELULAR</div>
          </div>
          <div style="text-align:left; max-width:480px;">
            <span class="badge" style="background:#ffd100; color:#000; font-size:13px; font-weight:950; padding:4px 12px; border-radius:8px;">1. ENTRA A LA APP</span>
            <h2 style="font-size:28px; font-weight:950; color:#ffffff; margin:10px 0 6px 0;">¡Prepara tu Celular para Jugar!</h2>
            <p style="font-size:15px; color:#e0e0e0; line-height:1.4; margin-bottom:14px;">
              Contesta cada pregunta lo más rápido posible. Entre más rápido y acertado respondas, ¡más puntos ganas!
            </p>
            <div style="font-size:14px; color:#00e676; font-weight:800;">
              👥 <strong>${players.length}</strong> Jugadores Listos en el Bar
            </div>
          </div>
        </div>

        <div style="width:100%; margin-top:30px;">
          <h3 style="font-size:18px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">
            🔥 Jugadores Conectados (${players.length}):
          </h3>
          <div class="trivia-tv-players-grid">
            ${playersHtml}
          </div>
        </div>
      </div>
    `;
  }

  // 2. Question Phase (Big Question + Circular Timer + 4 Colored Option Cards)
  function renderQuestionPhase(container) {
    const currIdx = gameData.currentQuestionIndex || 0;
    const totalQ = (gameData.questions || []).length || 10;
    const q = gameData.questions?.[currIdx] || {};
    const timeLimit = gameData.timePerQuestion || 15;
    const startTime = gameData.questionStartTime || Date.now();

    const players = Object.values(playersMap);
    const answeredCount = players.filter(p => p.answers && p.answers[currIdx] !== undefined).length;

    container.innerHTML = `
      <div style="max-width:1150px; margin:0 auto;">
        <!-- Question Box -->
        <div class="trivia-tv-question-box">
          <div id="tvCountdownClock" class="trivia-tv-clock-circle">${timeLimit}</div>
          <div style="font-size:14px; font-weight:900; color:#ffd100; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
            PREGUNTA ${currIdx + 1} DE ${totalQ}
          </div>
          <h2 style="font-size:32px; font-weight:950; color:#ffffff; line-height:1.3; margin:0;">
            ${q.q || 'Cargando pregunta...'}
          </h2>
          <div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-top:16px;">
            <span class="badge" style="background:rgba(255,255,255,0.1); font-size:13px; color:#fff;">
              ⚡ ${answeredCount} de ${players.length} Jugadores han respondido
            </span>
          </div>
        </div>

        <!-- 4 Option Cards -->
        <div class="trivia-tv-options-grid">
          <div class="trivia-tv-option-card card-a">
            <span style="font-size:28px; font-weight:950;">🔴 A</span>
            <span>${q.a || ''}</span>
          </div>
          <div class="trivia-tv-option-card card-b">
            <span style="font-size:28px; font-weight:950;">🔵 B</span>
            <span>${q.b || ''}</span>
          </div>
          <div class="trivia-tv-option-card card-c">
            <span style="font-size:28px; font-weight:950;">🟡 C</span>
            <span>${q.c || ''}</span>
          </div>
          <div class="trivia-tv-option-card card-d">
            <span style="font-size:28px; font-weight:950;">🟢 D</span>
            <span>${q.d || ''}</span>
          </div>
        </div>
      </div>
    `;

    // Start Live Clock
    if (timerInterval) clearInterval(timerInterval);
    const clockEl = document.getElementById('tvCountdownClock');

    timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      if (clockEl) {
        clockEl.textContent = remaining;
        if (remaining <= 5) {
          clockEl.style.borderColor = '#ff0033';
          clockEl.style.color = '#ff0033';
          clockEl.style.boxShadow = '0 0 25px rgba(255,0,51,0.8)';
        }
      }

      if (remaining <= 0) {
        clearInterval(timerInterval);
      }
    }, 200);
  }

  // 3. Reveal Phase (Highlight Correct Answer + Stats Bar Distribution)
  function renderRevealPhase(container) {
    if (timerInterval) clearInterval(timerInterval);

    const currIdx = gameData.currentQuestionIndex || 0;
    const totalQ = (gameData.questions || []).length || 10;
    const q = gameData.questions?.[currIdx] || {};
    const correct = (q.correct || 'A').toUpperCase();

    const players = Object.values(playersMap);
    const totalAnswers = players.filter(p => p.answers && p.answers[currIdx] !== undefined).length;

    // Count votes per option
    const counts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
    players.forEach(p => {
      const a = p.answers?.[currIdx]?.choice;
      if (a && counts[a] !== undefined) counts[a]++;
    });

    const pct = key => totalAnswers > 0 ? Math.round((counts[key] / totalAnswers) * 100) : 0;

    container.innerHTML = `
      <div style="max-width:1150px; margin:0 auto;">
        <!-- Question Box with Correct Badge -->
        <div class="trivia-tv-question-box" style="border-color:#00e676;">
          <div style="font-size:14px; font-weight:900; color:#00e676; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
            ✓ RESPUESTA REVELADA • PREGUNTA ${currIdx + 1} DE ${totalQ}
          </div>
          <h2 style="font-size:28px; font-weight:950; color:#ffffff; line-height:1.3; margin:0;">
            ${q.q || ''}
          </h2>
          <p style="font-size:15px; color:#ffd100; font-weight:800; margin-top:12px; background:rgba(255,209,0,0.1); padding:8px 16px; border-radius:10px; display:inline-block;">
            💡 ${q.exp || '¡Respuesta correcta confirmada!'}
          </p>
        </div>

        <!-- 4 Option Cards with Distribution Bars -->
        <div class="trivia-tv-options-grid">
          <div class="trivia-tv-option-card card-a ${correct === 'A' ? 'correct-glow' : 'wrong-fade'}">
            <span style="font-size:28px; font-weight:950;">🔴 A</span>
            <div style="flex:1;">
              <div>${q.a || ''} ${correct === 'A' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:12px; opacity:0.85; margin-top:2px;">${counts['A']} votos (${pct('A')}%)</div>
            </div>
            <div class="trivia-tv-stat-bar-fill" style="width:${pct('A')}%;"></div>
          </div>

          <div class="trivia-tv-option-card card-b ${correct === 'B' ? 'correct-glow' : 'wrong-fade'}">
            <span style="font-size:28px; font-weight:950;">🔵 B</span>
            <div style="flex:1;">
              <div>${q.b || ''} ${correct === 'B' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:12px; opacity:0.85; margin-top:2px;">${counts['B']} votos (${pct('B')}%)</div>
            </div>
            <div class="trivia-tv-stat-bar-fill" style="width:${pct('B')}%;"></div>
          </div>

          <div class="trivia-tv-option-card card-c ${correct === 'C' ? 'correct-glow' : 'wrong-fade'}">
            <span style="font-size:28px; font-weight:950;">🟡 C</span>
            <div style="flex:1;">
              <div>${q.c || ''} ${correct === 'C' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:12px; opacity:0.85; margin-top:2px;">${counts['C']} votos (${pct('C')}%)</div>
            </div>
            <div class="trivia-tv-stat-bar-fill" style="width:${pct('C')}%;"></div>
          </div>

          <div class="trivia-tv-option-card card-d ${correct === 'D' ? 'correct-glow' : 'wrong-fade'}">
            <span style="font-size:28px; font-weight:950;">🟢 D</span>
            <div style="flex:1;">
              <div>${q.d || ''} ${correct === 'D' ? '⭐ (CORRECTA)' : ''}</div>
              <div style="font-size:12px; opacity:0.85; margin-top:2px;">${counts['D']} votos (${pct('D')}%)</div>
            </div>
            <div class="trivia-tv-stat-bar-fill" style="width:${pct('D')}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Leaderboard Phase (Top 5 Live Standing)
  function renderLeaderboardPhase(container) {
    if (timerInterval) clearInterval(timerInterval);

    const players = Object.values(playersMap);
    players.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    let rowsHtml = '';
    players.slice(0, 5).forEach((p, idx) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const photoSrc = p.photoURL || p.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nickname || p.playerName || 'J')}&background=ffd100&color=000&bold=true`;

      rowsHtml += `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.06); border:1.5px solid ${idx === 0 ? '#ffd100' : 'rgba(255,255,255,0.1)'}; border-radius:16px; padding:12px 24px; margin-bottom:12px; animation:popIn 0.3s ease;">
          <div style="display:flex; align-items:center; gap:16px;">
            <span style="font-size:26px;">${medals[idx] || '#' + (idx + 1)}</span>
            <img src="${photoSrc}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid ${idx === 0 ? '#ffd100' : '#fff'};" onerror="this.src='img/logo.jpg'"/>
            <div>
              <strong style="font-size:20px; color:#ffffff;">${p.nickname || p.playerName}</strong>
              <div style="font-size:13px; color:var(--text-muted);">${p.waiter || 'Mesa'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:26px; font-weight:950; color:#ffd100;">${p.totalScore || 0}</div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:800;">PUNTOS</div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="max-width:850px; margin:0 auto; text-align:center;">
        <h2 style="font-size:32px; font-weight:950; color:#ffd100; margin-bottom:6px;">📊 TABLA DE POSICIONES EN VIVO</h2>
        <p class="hint-text" style="font-size:15px; margin-bottom:24px;">Los 5 mejores jugadores hasta el momento:</p>
        <div style="text-align:left;">
          ${rowsHtml}
        </div>
      </div>
    `;
  }

  // 5. Podium Phase (Grand Finale Top 5 with Photos and Confetti!)
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
      <div style="text-align:center; padding:20px 0;">
        <h2 style="font-size:38px; font-weight:950; color:#ffd100; margin-bottom:4px; font-family:'Outfit', sans-serif;">
          🏆 ¡PODIO DE GANADORES DE TRIVIA! 🏆
        </h2>
        <p class="hint-text" style="font-size:16px; margin-bottom:20px;">Felicidades a los campeones de Drinks & Wins:</p>

        <!-- Top 3 Pedestals (Silver 2nd, Gold 1st, Bronze 3rd) -->
        <div class="trivia-tv-podium-wrap">
          <!-- 2nd Place (Silver) -->
          <div class="trivia-podium-column" style="order:1;">
            <img src="${getPhoto(p2)}" class="trivia-podium-avatar" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:16px; font-weight:900; color:#fff; margin-bottom:4px;">${p2.nickname || p2.playerName}</div>
            <div style="font-size:14px; font-weight:950; color:#ffd100; margin-bottom:6px;">${p2.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal silver">
              <span style="font-size:32px;">🥈</span>
              <span style="font-size:18px;">2° LUGAR</span>
            </div>
          </div>

          <!-- 1st Place (Gold Champion) -->
          <div class="trivia-podium-column" style="order:2; width:180px;">
            <span style="font-size:28px; margin-bottom:-10px; z-index:10;">👑</span>
            <img src="${getPhoto(p1)}" class="trivia-podium-avatar gold-ring" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:20px; font-weight:950; color:#ffd100; margin-bottom:4px;">${p1.nickname || p1.playerName}</div>
            <div style="font-size:18px; font-weight:950; color:#00e676; margin-bottom:6px;">${p1.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal gold">
              <span style="font-size:44px;">🏆</span>
              <span style="font-size:22px; font-weight:950;">1° CAMPEÓN</span>
            </div>
          </div>

          <!-- 3rd Place (Bronze) -->
          <div class="trivia-podium-column" style="order:3;">
            <img src="${getPhoto(p3)}" class="trivia-podium-avatar" onerror="this.src='img/logo.jpg'"/>
            <div style="font-size:16px; font-weight:900; color:#fff; margin-bottom:4px;">${p3.nickname || p3.playerName}</div>
            <div style="font-size:14px; font-weight:950; color:#ffd100; margin-bottom:6px;">${p3.totalScore || 0} pts</div>
            <div class="trivia-podium-pedestal bronze">
              <span style="font-size:28px;">🥉</span>
              <span style="font-size:16px;">3° LUGAR</span>
            </div>
          </div>
        </div>

        <!-- 4th and 5th Place Runner-ups -->
        ${(p4 || p5) ? `
          <div style="display:flex; justify-content:center; gap:20px; margin-top:20px;">
            ${p4 ? `
              <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:8px 18px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);">
                <span style="font-weight:900; color:#ffd100;">4°</span>
                <img src="${getPhoto(p4)}" style="width:32px; height:32px; border-radius:50%;" onerror="this.src='img/logo.jpg'"/>
                <strong style="color:#fff;">${p4.nickname || p4.playerName}</strong>
                <span style="color:#ffd100; font-weight:800;">${p4.totalScore || 0} pts</span>
              </div>
            ` : ''}
            ${p5 ? `
              <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.08); padding:8px 18px; border-radius:12px; border:1px solid rgba(255,255,255,0.15);">
                <span style="font-weight:900; color:#ffd100;">5°</span>
                <img src="${getPhoto(p5)}" style="width:32px; height:32px; border-radius:50%;" onerror="this.src='img/logo.jpg'"/>
                <strong style="color:#fff;">${p5.nickname || p5.playerName}</strong>
                <span style="color:#ffd100; font-weight:800;">${p5.totalScore || 0} pts</span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;

    // Fire Victory Confetti
    if (window.confetti) {
      window.confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => {
        window.confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0 } });
        window.confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1 } });
      }, 500);
    }
  }

  // Initialize
  initTriviaTV();
})();
