// Survivor Admin Module for Drinks & Wins (Multi-Tournament Architecture)
(function() {
  'use strict';

  let db = null;
  let activeTournaments = [];
  let selectedTournamentId = null;
  let unsubTournament = null;
  let unsubPlayers = null;
  let tournamentPlayers = {};

  const LEAGUES = [
    { label: '🏈 NFL (Americano)', sport: 'football', slug: 'nfl', defaultWeeks: 18 },
    { label: '🏆 Leagues Cup (México vs USA)', sport: 'soccer', slug: 'concacaf.leagues.cup', defaultWeeks: 6 },
    { label: '🇲🇽 Liga MX (Fútbol)', sport: 'soccer', slug: 'mex.1', defaultWeeks: 17 },
    { label: '🇪🇸 La Liga (Fútbol)', sport: 'soccer', slug: 'esp.1', defaultWeeks: 38 },
    { label: '🏆 UEFA Champions League', sport: 'soccer', slug: 'uefa.champions', defaultWeeks: 8 },
    { label: '🇬🇧 Premier League', sport: 'soccer', slug: 'eng.1', defaultWeeks: 38 }
  ];

  window.initSurvivorAdmin = function() {
    if (window.db) {
      db = window.db;
      loadSurvivorTournaments();
    } else {
      setTimeout(window.initSurvivorAdmin, 100);
    }
  };

  // Load all tournaments from 'survivors' collection
  function loadSurvivorTournaments() {
    if (!db) return;
    db.collection('survivors').orderBy('createdAt', 'desc').onSnapshot(snap => {
      activeTournaments = [];
      snap.forEach(doc => {
        activeTournaments.push({ id: doc.id, ...doc.data() });
      });

      renderTournamentSelect();

      if (activeTournaments.length > 0) {
        if (!selectedTournamentId || !activeTournaments.some(t => t.id === selectedTournamentId)) {
          selectedTournamentId = activeTournaments[0].id;
        }
        loadSelectedTournament(selectedTournamentId);
      } else {
        selectedTournamentId = null;
        renderNoTournamentsUI();
      }
    }, err => {
      console.error('[SurvivorAdmin] Error loading tournaments:', err);
    });
  }

  function renderTournamentSelect() {
    const sel = document.getElementById('survAdminTournamentSelect');
    if (!sel) return;
    sel.innerHTML = '';

    if (activeTournaments.length === 0) {
      sel.innerHTML = '<option value="">-- No hay torneos creados --</option>';
      return;
    }

    activeTournaments.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} [${t.store || 'General'}] (Sem. ${t.activeWeek || 1}/${t.totalWeeks || 18}) - ${t.status === 'active' ? '🟢 Activo' : '🔴 Cerrado'}`;
      if (t.id === selectedTournamentId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  window.onSurvivorTournamentChange = function(tournId) {
    selectedTournamentId = tournId;
    loadSelectedTournament(tournId);
  };

  function loadSelectedTournament(tournId) {
    if (!db || !tournId) return;

    if (unsubTournament) unsubTournament();
    if (unsubPlayers) unsubPlayers();

    // 1. Listen to tournament document
    unsubTournament = db.collection('survivors').doc(tournId).onSnapshot(doc => {
      if (!doc.exists) return;
      const tourn = { id: doc.id, ...doc.data() };
      renderTournamentDetails(tourn);
    });

    // 2. Listen to players subcollection
    unsubPlayers = db.collection('survivors').doc(tournId).collection('players').onSnapshot(snap => {
      tournamentPlayers = {};
      snap.forEach(pDoc => {
        tournamentPlayers[pDoc.id] = { id: pDoc.id, ...pDoc.data() };
      });
      renderPlayersAdmin();
    });
  }

  function renderTournamentDetails(tourn) {
    const titleEl = document.getElementById('survAdminSelectedTitle');
    const weekInp = document.getElementById('survAdminActiveWeek');
    const autoApproveChk = document.getElementById('survAdminAutoApprove');
    const statusBadge = document.getElementById('survAdminStatusBadge');

    if (titleEl) titleEl.textContent = `🏆 ${tourn.name} (${tourn.store || 'Todas'})`;
    if (weekInp) {
      weekInp.value = tourn.activeWeek || 1;
      weekInp.max = tourn.totalWeeks || 18;
    }
    if (autoApproveChk) autoApproveChk.checked = tourn.autoApprove !== false;
    if (statusBadge) {
      statusBadge.textContent = tourn.status === 'active' ? '🟢 EN CURSO' : '🔴 CERRADO';
      statusBadge.className = `badge ${tourn.status === 'active' ? 'success' : 'danger'}`;
    }

    const panel = document.getElementById('survAdminManagementPanel');
    if (panel) panel.style.display = 'block';
    const noPanel = document.getElementById('survAdminNoTournaments');
    if (noPanel) noPanel.style.display = 'none';
  }

  function renderNoTournamentsUI() {
    const panel = document.getElementById('survAdminManagementPanel');
    if (panel) panel.style.display = 'none';
    const noPanel = document.getElementById('survAdminNoTournaments');
    if (noPanel) noPanel.style.display = 'block';
  }

  // Save active week settings
  window.saveSurvivorWeekSettings = async function() {
    if (!selectedTournamentId || !db) return;
    const weekInp = document.getElementById('survAdminActiveWeek');
    const autoApproveChk = document.getElementById('survAdminAutoApprove');

    const newWeek = parseInt(weekInp.value, 10) || 1;
    const autoApprove = autoApproveChk ? autoApproveChk.checked : true;

    try {
      await db.collection('survivors').doc(selectedTournamentId).update({
        activeWeek: newWeek,
        autoApprove: autoApprove,
        updatedAt: Date.now()
      });
      alert(`✅ Configuración actualizada: Semana ${newWeek} activa.`);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  // Create new Survivor Tournament Modal
  window.openCreateSurvivorModal = function() {
    const modal = document.getElementById('modalCreateSurvivor');
    if (modal) modal.style.display = 'flex';
  };

  window.closeCreateSurvivorModal = function() {
    const modal = document.getElementById('modalCreateSurvivor');
    if (modal) modal.style.display = 'none';
  };

  window.createSurvivorTournament = async function() {
    if (!db) return;
    const nameInp = document.getElementById('newSurvName');
    const leagueSel = document.getElementById('newSurvLeague');
    const storeSel = document.getElementById('newSurvStore');
    const weeksInp = document.getElementById('newSurvWeeks');
    const autoApproveChk = document.getElementById('newSurvAutoApprove');

    const name = nameInp ? nameInp.value.trim() : '';
    if (!name) {
      alert('Por favor escribe un nombre para el torneo Survivor.');
      return;
    }

    const leagueIdx = parseInt(leagueSel?.value || '0', 10);
    const leagueObj = LEAGUES[leagueIdx] || LEAGUES[0];
    const store = storeSel ? storeSel.value : 'Juriquilla';
    const totalWeeks = parseInt(weeksInp?.value || '18', 10) || 18;
    const autoApprove = autoApproveChk ? autoApproveChk.checked : true;

    const id = 'surv_' + Date.now();

    const newTournament = {
      id: id,
      name: name,
      sport: leagueObj.sport,
      leagueSlug: leagueObj.slug,
      leagueLabel: leagueObj.label,
      store: store,
      totalWeeks: totalWeeks,
      activeWeek: 1,
      autoApprove: autoApprove,
      status: 'active',
      createdAt: Date.now()
    };

    try {
      await db.collection('survivors').doc(id).set(newTournament);
      selectedTournamentId = id;
      window.closeCreateSurvivorModal();
      alert(`🎉 ¡Torneo Survivor "${name}" creado exitosamente!`);
    } catch (err) {
      alert('Error al crear torneo: ' + err.message);
    }
  };

  // Render Players & Approval Lists
  function renderPlayersAdmin() {
    const pendingListEl = document.getElementById('survAdminPendingList');
    const approvedListEl = document.getElementById('survAdminApprovedList');
    const totalAliveEl = document.getElementById('survAdminTotalAlive');
    const totalElimEl = document.getElementById('survAdminTotalElim');

    if (!pendingListEl || !approvedListEl) return;

    const players = Object.values(tournamentPlayers);
    const pending = players.filter(p => p.status === 'pending' || p.approved === false);
    const approved = players.filter(p => p.status === 'approved' || p.approved === true);

    const aliveCount = approved.filter(p => p.isAlive !== false).length;
    const elimCount = approved.filter(p => p.isAlive === false).length;

    if (totalAliveEl) totalAliveEl.textContent = `${aliveCount} Vivos`;
    if (totalElimEl) totalElimEl.textContent = `${elimCount} Eliminados`;

    // 1. Pending players
    pendingListEl.innerHTML = '';
    if (pending.length === 0) {
      pendingListEl.innerHTML = '<div class="hint-text py-2">No hay solicitudes pendientes.</div>';
    } else {
      pending.forEach(p => {
        const item = document.createElement('div');
        item.className = 'flex-between py-2';
        item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${p.photoURL || 'img/logo.jpg'}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;" onerror="this.src='img/logo.jpg'"/>
            <div>
              <strong style="color:#ffd100; font-size:13px;">${p.nickname || p.playerName}</strong>
              <div style="font-size:11px; color:var(--text-muted);">${p.waiter || 'Sin mesa'} • ${p.userEmail || ''}</div>
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary" onclick="window.approveSurvivorPlayer('${p.id}')" style="padding:4px 10px; font-size:11px; width:auto;">Aprobar</button>
            <button class="btn btn-danger" onclick="window.deleteSurvivorPlayer('${p.id}')" style="padding:4px 10px; font-size:11px; width:auto;">Rechazar</button>
          </div>
        `;
        pendingListEl.appendChild(item);
      });
    }

    // 2. Approved players
    approvedListEl.innerHTML = '';
    if (approved.length === 0) {
      approvedListEl.innerHTML = '<div class="hint-text py-2">No hay jugadores aprobados todavía.</div>';
    } else {
      approved.sort((a, b) => {
        if (a.isAlive !== b.isAlive) return a.isAlive !== false ? -1 : 1;
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      });

      const currentTourn = activeTournaments.find(t => t.id === selectedTournamentId);
      const activeWeek = currentTourn ? (currentTourn.activeWeek || 1) : 1;

      approved.forEach(p => {
        const isAlive = p.isAlive !== false;
        const currentPick = p.picks?.[activeWeek];
        const pickTeamText = currentPick ? `${currentPick.teamName || currentPick.team}` : 'Sin pick';

        const item = document.createElement('div');
        item.className = 'flex-between py-2';
        item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <img src="${p.photoURL || 'img/logo.jpg'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1.5px solid ${isAlive ? '#00e676' : '#ff0033'};" onerror="this.src='img/logo.jpg'"/>
            <div>
              <div style="display:flex; align-items:center; gap:6px;">
                <strong style="color:#ffffff; font-size:13.5px;">${p.nickname || p.playerName}</strong>
                <span class="badge ${isAlive ? 'success' : 'danger'}" style="font-size:9.5px; padding:1px 5px;">
                  ${isAlive ? `🟢 VIVO` : `🔴 ELIMINADO (Sem. ${p.eliminatedWeek || '?'})`}
                </span>
              </div>
              <div style="font-size:11px; color:#ffd100; font-weight:700;">
                Sem. ${activeWeek}: <span style="color:#fff;">${pickTeamText}</span> • Pts Totales: ${p.totalPoints || 0}
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${!isAlive ? `
              <button class="btn btn-secondary" onclick="window.reviveSurvivorPlayer('${p.id}')" style="padding:4px 8px; font-size:10.5px; width:auto; border-color:#00e676; color:#00e676;" title="Devolver vida a este jugador">
                💚 Revivir
              </button>
            ` : `
              <button class="btn btn-danger" onclick="window.eliminateSurvivorPlayer('${p.id}')" style="padding:4px 8px; font-size:10.5px; width:auto;" title="Marcar como eliminado">
                ☠️ Eliminar
              </button>
            `}
            <button class="btn btn-secondary" onclick="window.deleteSurvivorPlayer('${p.id}')" style="padding:4px 8px; font-size:10.5px; width:auto; color:#ff4444;" title="Borrar del torneo">
              🗑️
            </button>
          </div>
        `;
        approvedListEl.appendChild(item);
      });
    }
  }

  // Player action handlers
  window.approveSurvivorPlayer = async function(pId) {
    if (!selectedTournamentId || !db) return;
    try {
      await db.collection('survivors').doc(selectedTournamentId).collection('players').doc(pId).update({
        status: 'approved',
        approved: true,
        isAlive: true
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.reviveSurvivorPlayer = async function(pId) {
    if (!selectedTournamentId || !db) return;
    if (!confirm('¿Deseas reactivar la vida de este jugador en el torneo?')) return;
    try {
      await db.collection('survivors').doc(selectedTournamentId).collection('players').doc(pId).update({
        isAlive: true,
        eliminatedWeek: null
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.eliminateSurvivorPlayer = async function(pId) {
    if (!selectedTournamentId || !db) return;
    const tourn = activeTournaments.find(t => t.id === selectedTournamentId);
    const currWeek = tourn ? (tourn.activeWeek || 1) : 1;
    if (!confirm(`¿Deseas marcar a este jugador como ELIMINADO en la Semana ${currWeek}?`)) return;
    try {
      await db.collection('survivors').doc(selectedTournamentId).collection('players').doc(pId).update({
        isAlive: false,
        eliminatedWeek: currWeek
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.deleteSurvivorPlayer = async function(pId) {
    if (!selectedTournamentId || !db) return;
    if (!confirm('¿Estás seguro de eliminar a este participante de este Survivor?')) return;
    try {
      await db.collection('survivors').doc(selectedTournamentId).collection('players').doc(pId).delete();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // 1-Click Auto-Evaluation with ESPN Official API
  window.evaluateSurvivorESPN = async function() {
    if (!selectedTournamentId || !db) return;
    const tourn = activeTournaments.find(t => t.id === selectedTournamentId);
    if (!tourn) return;

    const btn = document.getElementById('btnEvaluateSurvivorESPN');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Consultando ESPN...'; }

    const activeWeek = tourn.activeWeek || 1;
    const sport = tourn.sport || 'football';
    const slug = tourn.leagueSlug || 'nfl';

    try {
      // Fetch scoreboard from ESPN
      let url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${slug}/scoreboard`;
      if (sport === 'football' && slug === 'nfl') {
        url += `?week=${activeWeek}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudo conectar con ESPN.');
      const data = await res.json();
      const events = data.events || [];

      if (events.length === 0) {
        alert(`No se encontraron partidos de ESPN para la Semana ${activeWeek}.`);
        return;
      }

      // Map team results
      const teamResults = {}; // { 'KC': { result: 'win', diff: 7, score: 27 }, 'BAL': { result: 'loss', diff: -7 } }
      events.forEach(ev => {
        const comp = ev.competitions?.[0] || {};
        const isFinished = ev.status?.type?.completed === true;
        const comps = comp.competitors || [];
        if (comps.length >= 2) {
          const home = comps.find(c => c.homeAway === 'home') || comps[1];
          const away = comps.find(c => c.homeAway === 'away') || comps[0];

          const homeScore = parseInt(home.score || '0', 10);
          const awayScore = parseInt(away.score || '0', 10);

          const homeAbbr = (home.team?.abbreviation || home.team?.name || '').toUpperCase();
          const awayAbbr = (away.team?.abbreviation || away.team?.name || '').toUpperCase();
          const homeName = (home.team?.displayName || home.team?.name || '').toLowerCase();
          const awayName = (away.team?.displayName || away.team?.name || '').toLowerCase();

          let homeRes = 'pending';
          let awayRes = 'pending';

          if (isFinished) {
            if (homeScore > awayScore) {
              homeRes = 'win';
              awayRes = 'loss';
            } else if (awayScore > homeScore) {
              homeRes = 'loss';
              awayRes = 'win';
            } else {
              homeRes = 'tie';
              awayRes = 'tie';
            }
          }

          const diffH = homeScore - awayScore;
          const diffA = awayScore - homeScore;

          [homeAbbr, homeName].forEach(k => { if (k) teamResults[k] = { result: homeRes, score: homeScore, oppScore: awayScore, diff: diffH, finished: isFinished }; });
          [awayAbbr, awayName].forEach(k => { if (k) teamResults[k] = { result: awayRes, score: awayScore, oppScore: homeScore, diff: diffA, finished: isFinished }; });
        }
      });

      // Grade players
      const players = Object.values(tournamentPlayers).filter(p => p.status === 'approved' || p.approved === true);
      let survivedCount = 0;
      let eliminatedCount = 0;

      const batch = db.batch();
      const tournRef = db.collection('survivors').doc(selectedTournamentId);

      players.forEach(p => {
        if (p.isAlive === false) return; // already eliminated previously

        const pick = p.picks?.[activeWeek];
        const pRef = tournRef.collection('players').doc(p.id);

        if (!pick || !pick.team) {
          // No pick registered -> eliminated!
          batch.update(pRef, {
            isAlive: false,
            eliminatedWeek: activeWeek,
            [`picks.${activeWeek}.result`]: 'no_pick',
            [`picks.${activeWeek}.diff`]: -10
          });
          eliminatedCount++;
          return;
        }

        const cleanKey = (pick.team || '').toUpperCase();
        const cleanNameKey = (pick.teamName || '').toLowerCase();
        const matchRes = teamResults[cleanKey] || teamResults[cleanNameKey];

        if (matchRes && matchRes.finished) {
          if (matchRes.result === 'win') {
            const currentTotal = p.totalPoints || 0;
            const newTotal = currentTotal + Math.max(matchRes.diff, 1);
            batch.update(pRef, {
              isAlive: true,
              totalPoints: newTotal,
              [`picks.${activeWeek}.result`]: 'win',
              [`picks.${activeWeek}.diff`]: matchRes.diff,
              [`picks.${activeWeek}.score`]: matchRes.score
            });
            survivedCount++;
          } else {
            // Loss or Tie -> Eliminated
            batch.update(pRef, {
              isAlive: false,
              eliminatedWeek: activeWeek,
              [`picks.${activeWeek}.result`]: matchRes.result,
              [`picks.${activeWeek}.diff`]: matchRes.diff,
              [`picks.${activeWeek}.score`]: matchRes.score
            });
            eliminatedCount++;
          }
        }
      });

      await batch.commit();
      alert(`🎯 Calificación ESPN Semana ${activeWeek} completada:\n• Sobrevivieron: ${survivedCount}\n• Eliminados esta semana: ${eliminatedCount}`);
    } catch (err) {
      alert('Error en evaluación ESPN: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '⚡ Calificar Semana con ESPN (1-Click)'; }
    }
  };

  // WhatsApp Invite Link
  window.shareSurvivorWhatsApp = function() {
    if (!selectedTournamentId) return;
    const tourn = activeTournaments.find(t => t.id === selectedTournamentId);
    if (!tourn) return;

    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    const shareUrl = `${origin}${path}share-survivor.html?s=${encodeURIComponent(tourn.id)}`;
    const msg = `🏆 *¡ÚNETE AL SURVIVOR EN DRINKS & WINS!* 🔥\n\n` +
      `📌 *Torneo:* ${tourn.name}\n` +
      `📍 *Sucursal:* ${tourn.store || 'Juriquilla'}\n` +
      `📅 *Semana Activa:* Semana ${tourn.activeWeek || 1}\n\n` +
      `🎯 Regla de Oro: Elige un equipo por semana, si gana sigues VIVO. ¡No puedes repetir equipo!\n\n` +
      `📲 *Entra y registra tu pick aquí:* ${shareUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Initialize
  window.initSurvivorAdmin();
})();
