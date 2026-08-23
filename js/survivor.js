// Survivor Module for Wings & Wins
(function() {
  'use strict';

  let db = null;
  let user = null;
  let activeWeek = 1;
  let userPickData = { picks: {}, status: 'alive' }; // default

  const survivorUserStatus = document.getElementById('survivorUserStatus');
  const survivorWeekNum = document.getElementById('survivorWeekNum');
  const selSurvivorTeam = document.getElementById('selSurvivorTeam');
  const btnSaveSurvivor = document.getElementById('btnSaveSurvivor');
  const survivorStatusText = document.getElementById('survivorStatusText');
  const survivorHistory = document.getElementById('survivorHistory');

  const TEAMS = [
    "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills",
    "Carolina Panthers", "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns",
    "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
    "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs",
    "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
    "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants",
    "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers",
    "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders"
  ].sort();

  function initSurvivor() {
    if (window.db) {
      db = window.db;
      setupListeners();
      loadSettings();
    } else {
      setTimeout(initSurvivor, 100);
    }
  }

  function setupListeners() {
    window.onAuthChange((currentUser, isAdmin) => {
      user = currentUser;
      
      if (user) {
        if (btnSaveSurvivor) btnSaveSurvivor.disabled = false;
        loadUserPick();
      } else {
        if (survivorUserStatus) survivorUserStatus.textContent = '—';
        if (survivorUserStatus) survivorUserStatus.style.color = 'var(--text-muted)';
        if (btnSaveSurvivor) btnSaveSurvivor.disabled = false;
        if (survivorStatusText) {
          survivorStatusText.textContent = 'Inicia sesión con Google, Apple o Facebook para jugar a Survivor.';
          survivorStatusText.style.color = 'var(--text-muted)';
        }
        userPickData = { picks: {}, status: 'alive' };
        populateTeams();
        renderHistory();
      }
    });

    if (btnSaveSurvivor) {
      btnSaveSurvivor.addEventListener('click', savePick);
    }
  }

  async function loadSettings() {
    if (!db) return;
    try {
      const doc = await db.collection('survivor').doc('settings').get();
      if (doc.exists) {
        activeWeek = doc.data().activeWeek || 1;
      } else {
        // Auto-create settings if not found
        activeWeek = 1;
        try {
          await db.collection('survivor').doc('settings').set({ activeWeek: 1 });
        } catch (_) {}
      }

      if (survivorWeekNum) survivorWeekNum.textContent = `Semana ${activeWeek}`;
      populateTeams();
    } catch (err) {
      console.error('[survivor] Error loading settings:', err);
      populateTeams();
    }
  }

  async function loadUserPick() {
    if (!db || !user) return;
    
    try {
      const doc = await db.collection('survivor_picks').doc(user.uid).get();
      if (doc.exists) {
        userPickData = doc.data() || { picks: {}, status: 'alive' };
      } else {
        userPickData = { picks: {}, status: 'alive' };
      }

      // Update User Status UI
      const isAlive = userPickData.status !== 'eliminated';
      if (survivorUserStatus) {
        survivorUserStatus.textContent = isAlive ? 'VIVO' : 'ELIMINADO';
        survivorUserStatus.style.color = isAlive ? 'var(--success-color)' : 'var(--danger-color)';
      }

      populateTeams();
      renderHistory();
    } catch (err) {
      console.error('[survivor] Error loading user pick:', err);
    }
  }

  function populateTeams() {
    if (!selSurvivorTeam) return;
    selSurvivorTeam.innerHTML = '';

    const isAlive = userPickData.status !== 'eliminated';

    if (!user) {
      selSurvivorTeam.innerHTML = '<option value="" disabled selected>Inicia sesión primero</option>';
      return;
    }

    if (!isAlive) {
      selSurvivorTeam.innerHTML = '<option value="" disabled selected>Estás eliminado de este Survivor</option>';
      if (btnSaveSurvivor) btnSaveSurvivor.disabled = true;
      return;
    }

    // Filter out teams already picked in previous weeks
    const pickedTeams = Object.values(userPickData.picks || {});
    const currentWeekPick = userPickData.picks ? userPickData.picks[activeWeek] : null;

    const availableTeams = TEAMS.filter(t => !pickedTeams.includes(t) || t === currentWeekPick);

    // Initial placeholder
    const optPlaceholder = document.createElement('option');
    optPlaceholder.value = '';
    optPlaceholder.disabled = true;
    optPlaceholder.selected = !currentWeekPick;
    optPlaceholder.textContent = '— Selecciona un Equipo —';
    selSurvivorTeam.appendChild(optPlaceholder);

    availableTeams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team;
      opt.textContent = team;
      if (team === currentWeekPick) {
        opt.selected = true;
      }
      selSurvivorTeam.appendChild(opt);
    });

    if (btnSaveSurvivor) btnSaveSurvivor.disabled = !isAlive;
  }

  async function savePick() {
    if (!db) return;
    if (!user) {
      window.requireUserAuth(savePick, '¡Inicia Sesión para Survivor!', 'Necesitas iniciar sesión con Google, Apple o Facebook para registrar tu selección semanal.');
      return;
    }
    
    const selectedTeam = selSurvivorTeam.value;
    if (!selectedTeam) {
      alert('Por favor selecciona un equipo.');
      return;
    }

    if (btnSaveSurvivor) btnSaveSurvivor.disabled = true;
    if (survivorStatusText) {
      survivorStatusText.textContent = 'Registrando tu selección...';
      survivorStatusText.style.color = 'var(--text-muted)';
    }

    try {
      const picks = userPickData.picks || {};
      picks[activeWeek] = selectedTeam;

      await db.collection('survivor_picks').doc(user.uid).set({
        playerId: user.uid,
        nickname: user.displayName || user.email.split('@')[0],
        picks: picks,
        status: userPickData.status || 'alive',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp ? firebase.firestore.FieldValue.serverTimestamp() : Date.now()
      });

      if (survivorStatusText) {
        survivorStatusText.textContent = `¡Selección registrada exitosamente! Elegiste a ${selectedTeam} para la Semana ${activeWeek}.`;
        survivorStatusText.style.color = 'var(--success-color)';
      }

      loadUserPick(); // Reload data
    } catch (err) {
      console.error('[survivor] Error saving pick:', err);
      if (survivorStatusText) {
        survivorStatusText.textContent = 'Error al registrar: ' + err.message;
        survivorStatusText.style.color = 'var(--danger-color)';
      }
      if (btnSaveSurvivor) btnSaveSurvivor.disabled = false;
    }
  }

  function renderHistory() {
    if (!survivorHistory) return;
    survivorHistory.innerHTML = '';

    const picks = userPickData.picks || {};
    const weeks = Object.keys(picks).sort((a,b) => Number(a) - Number(b));

    if (weeks.length === 0) {
      survivorHistory.innerHTML = '<div class="text-center hint-text py-2">No tienes selecciones previas.</div>';
      return;
    }

    weeks.forEach(w => {
      const row = document.createElement('div');
      row.className = 'flex-between';
      row.style.padding = '8px 12px';
      row.style.background = 'rgba(255,255,255,0.02)';
      row.style.border = '1px solid var(--border-color)';
      row.style.borderRadius = '10px';

      row.innerHTML = `
        <span style="font-weight: 700; color: var(--accent-color);">Semana ${w}</span>
        <span style="font-weight: 600;">${picks[w]}</span>
      `;
      survivorHistory.appendChild(row);
    });
  }

  // Start initialization
  initSurvivor();
})();
