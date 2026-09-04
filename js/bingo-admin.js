/**
 * GameDay Bingo - Admin Logic
 */

(function() {
  'use strict';

  let db = null;
  let bingoSearchMatches = [];
  let bingoSelectedMatchData = null;
  let activeBingoRoomId = null;
  let unsubBingoRooms = null;
  let unsubActiveRoom = null;
  let unsubActiveRoomPlayers = null;

  function initBingoAdmin() {
    if (window.db) {
      db = window.db;
      setupBingoUI();
      loadBingoRooms();
    } else {
      setTimeout(initBingoAdmin, 100);
    }
  }

  function setupBingoUI() {
    const btnSearch = document.getElementById('btnSearchBingoGames');
    const btnCreate = document.getElementById('btnCreateBingoRoom');
    const btnDelete = document.getElementById('btnDeleteBingoRoom');
    const dropdown = document.getElementById('bingoActiveRoomsDropdown');
    const btnAddEvent = document.getElementById('btnAddManualEvent');

    if (btnSearch) btnSearch.addEventListener('click', searchBingoGames);
    if (btnCreate) btnCreate.addEventListener('click', createBingoRoom);
    if (btnDelete) btnDelete.addEventListener('click', deleteActiveBingoRoom);
    if (btnAddEvent) btnAddEvent.addEventListener('click', addManualEvent);
    
    if (dropdown) {
      dropdown.addEventListener('change', () => {
        activeBingoRoomId = dropdown.value;
        loadActiveRoomDetails();
      });
    }

    const filterEl = document.getElementById('bingoFilterStore');
    if (filterEl) {
      filterEl.addEventListener('change', renderFilteredBingoRoomsDropdown);
    }
  }

  async function searchBingoGames() {
    const leagueSport = document.getElementById('bingoLeague').value; // e.g. soccer/mex.1
    const btn = document.getElementById('btnSearchBingoGames');
    if (!leagueSport || !btn) return;
    
    btn.textContent = 'Buscando...';
    btn.disabled = true;
    
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${leagueSport}/scoreboard`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      bingoSearchMatches = data.events || [];
      renderBingoGamePicker(bingoSearchMatches);
    } catch (err) {
      alert('Error consultando ESPN: ' + err.message);
    }
    
    btn.textContent = '🔍 Buscar Partidos';
    btn.disabled = false;
  }

  function renderBingoGamePicker(events) {
    const container = document.getElementById('bingoGamePickerContainer');
    const list = document.getElementById('bingoGamePickerList');
    container.style.display = 'block';
    list.innerHTML = '';
    bingoSelectedMatchData = null;

    if (!events.length) {
      list.innerHTML = '<div class="hint-text text-center py-2">No hay partidos activos en ESPN.</div>';
      return;
    }

    events.forEach(ev => {
      const match = ev.competitions[0];
      const team1 = match.competitors[0];
      const team2 = match.competitors[1];

      const home = team1.homeAway === 'home' ? team1 : team2;
      const away = team1.homeAway === 'away' ? team1 : team2;

      const card = document.createElement('div');
      card.className = 'game-pick-card';
      card.innerHTML = `
        <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">${ev.status.type.detail}</div>
        <div class="flex-between">
          <div style="display:flex; align-items:center; gap:6px;">
            <img src="${away.team.logo}" onerror="this.src='img/logo.jpg'" style="width:24px;height:24px;object-fit:contain;"/>
            <span style="font-size:13px; font-weight:800;">${away.team.shortDisplayName}</span>
          </div>
          <span style="font-size:12px; color:var(--text-muted); font-weight:900;">vs</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <img src="${home.team.logo}" onerror="this.src='img/logo.jpg'" style="width:24px;height:24px;object-fit:contain;"/>
            <span style="font-size:13px; font-weight:800;">${home.team.shortDisplayName}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('#bingoGamePickerList .game-pick-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        bingoSelectedMatchData = {
          eventId: ev.id,
          home: home.team.shortDisplayName,
          away: away.team.shortDisplayName,
          defaultName: `${home.team.shortDisplayName} vs ${away.team.shortDisplayName}`
        };
      });

      list.appendChild(card);
    });
  }

  async function createBingoRoom() {
    if (!bingoSelectedMatchData) {
      alert('Selecciona un partido primero.');
      return;
    }

    const store = document.getElementById('bingoStore').value;
    const customName = document.getElementById('bingoGameName').value.trim();
    const roomName = customName || bingoSelectedMatchData.defaultName;

    // Generar un pool de eventos posibles (básico genérico para soccer)
    const possibleEvents = [
      "Gol Local", "Gol Visitante", "Tarjeta Amarilla Local", "Tarjeta Amarilla Visitante",
      "Tiro de Esquina Local", "Tiro de Esquina Visitante", "Falta Local", "Falta Visitante",
      "Tiro a puerta Local", "Tiro a puerta Visitante", "Fuera de Lugar Local", "Fuera de Lugar Visitante",
      "Sustitución Local", "Sustitución Visitante", "Tarjeta Roja", "Penal a favor Local"
    ];

    try {
      const roomId = 'bingo_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.collection('bingo_games').doc(roomId).set({
        eventId: bingoSelectedMatchData.eventId,
        roomName: roomName,
        store: store,
        active: true,
        eventsList: possibleEvents,
        markedEvents: [],
        createdAt: Date.now()
      });

      alert('Sala de Bingo creada exitosamente.');
      document.getElementById('bingoGameName').value = '';
      bingoSelectedMatchData = null;
      document.getElementById('bingoGamePickerContainer').style.display = 'none';
      
    } catch (err) {
      alert('Error al crear sala: ' + err.message);
    }
  }

  let allCachedBingoRooms = [];

  function matchStoreFilter(gameStore, filterVal) {
    if (!filterVal || filterVal === 'Todas' || filterVal === 'Todas las Sucursales') return true;
    if (!gameStore) return true;
    const g = gameStore.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const f = filterVal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return g.includes(f) || f.includes(g) || g.includes('todas');
  }

  function renderFilteredBingoRoomsDropdown() {
    const dropdown = document.getElementById('bingoActiveRoomsDropdown');
    if (!dropdown) return;
    const filterEl = document.getElementById('bingoFilterStore');
    const filterVal = filterEl ? filterEl.value : 'Todas';

    const filtered = allCachedBingoRooms.filter(r => matchStoreFilter(r.store, filterVal));

    dropdown.innerHTML = '<option value="" disabled selected>-- Selecciona una sala --</option>';
    if (filtered.length === 0) {
      dropdown.innerHTML = `<option value="" disabled selected>No hay salas en ${filterVal}</option>`;
      const details = document.getElementById('bingoActiveRoomDetails');
      if (details) details.style.display = 'none';
      return;
    }

    filtered.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.roomName} (${d.store || 'Gral'})`;
      dropdown.appendChild(opt);
    });

    if (activeBingoRoomId && filtered.some(r => r.id === activeBingoRoomId)) {
      dropdown.value = activeBingoRoomId;
    }
  }

  function loadBingoRooms() {
    if (!db) return;
    const dropdown = document.getElementById('bingoActiveRoomsDropdown');
    
    if (unsubBingoRooms) unsubBingoRooms();
    unsubBingoRooms = db.collection('bingo_games').orderBy('createdAt', 'desc').onSnapshot(snap => {
      allCachedBingoRooms = [];
      if (snap.empty) {
        if (dropdown) dropdown.innerHTML = '<option value="" disabled selected>No hay salas activas</option>';
        const details = document.getElementById('bingoActiveRoomDetails');
        if (details) details.style.display = 'none';
        return;
      }

      snap.forEach(doc => {
        allCachedBingoRooms.push({ id: doc.id, ...doc.data() });
      });

      renderFilteredBingoRoomsDropdown();
    });
  }

  function loadActiveRoomDetails() {
    if (!activeBingoRoomId) return;
    document.getElementById('bingoActiveRoomDetails').style.display = 'block';

    if (unsubActiveRoom) unsubActiveRoom();
    unsubActiveRoom = db.collection('bingo_games').doc(activeBingoRoomId).onSnapshot(doc => {
      if (!doc.exists) {
        document.getElementById('bingoActiveRoomDetails').style.display = 'none';
        return;
      }
      const data = doc.data();
      renderMarkedEvents(data.markedEvents || [], activeBingoRoomId);
    });

    if (unsubActiveRoomPlayers) unsubActiveRoomPlayers();
    unsubActiveRoomPlayers = db.collection('bingo_games').doc(activeBingoRoomId).collection('players').onSnapshot(snap => {
      const list = document.getElementById('bingoPlayersList');
      list.innerHTML = '';
      if (snap.empty) {
        list.innerHTML = '<div class="hint-text py-2">Nadie ha entrado a la sala.</div>';
        return;
      }

      snap.forEach(pDoc => {
        const p = pDoc.data();
        const div = document.createElement('div');
        div.className = 'flex-between';
        div.style.padding = '8px; border-bottom: 1px solid rgba(255,255,255,0.05);';
        
        let bingoLabel = p.bingoClaimedAt ? '<span class="badge success">¡BINGO CANTADO!</span>' : '';
        
        div.innerHTML = `
          <div>
            <strong>${p.nickname || 'Anónimo'}</strong>
            <div style="font-size:11px; color:var(--text-muted);">${bingoLabel}</div>
          </div>
          <button class="btn btn-danger" onclick="kickBingoPlayer('${activeBingoRoomId}', '${pDoc.id}')" style="padding:4px 8px; font-size:11px;">Kick</button>
        `;
        list.appendChild(div);
      });
    });
  }

  function renderMarkedEvents(events, roomId) {
    const list = document.getElementById('bingoMarkedEventsList');
    list.innerHTML = '';
    if (!events.length) {
      list.innerHTML = '<div class="hint-text py-2">No hay eventos marcados aún.</div>';
      return;
    }
    events.forEach(ev => {
      const tag = document.createElement('div');
      tag.style.cssText = 'background:rgba(0,230,118,0.2); color:#00e676; border:1px solid #00e676; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:800; display:flex; align-items:center; gap:8px;';
      tag.innerHTML = `
        ${ev}
        <span style="cursor:pointer; color:#ff4444; font-size:14px;" onclick="removeManualEvent('${roomId}', '${ev}')">✕</span>
      `;
      list.appendChild(tag);
    });
  }

  async function addManualEvent() {
    if (!activeBingoRoomId) return;
    const input = document.getElementById('bingoManualEventInput');
    const val = input.value.trim();
    if (!val) return;

    try {
      await db.collection('bingo_games').doc(activeBingoRoomId).update({
        markedEvents: firebase.firestore.FieldValue.arrayUnion(val)
      });
      input.value = '';
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  window.removeManualEvent = async function(roomId, evName) {
    try {
      await db.collection('bingo_games').doc(roomId).update({
        markedEvents: firebase.firestore.FieldValue.arrayRemove(evName)
      });
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  async function deleteActiveBingoRoom() {
    if (!activeBingoRoomId) return;
    if (!confirm('¿Seguro que deseas eliminar esta sala de Bingo?')) return;
    try {
      await db.collection('bingo_games').doc(activeBingoRoomId).delete();
      activeBingoRoomId = null;
      document.getElementById('bingoActiveRoomDetails').style.display = 'none';
      alert('Sala eliminada.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  window.kickBingoPlayer = async function(roomId, playerId) {
    try {
      await db.collection('bingo_games').doc(roomId).collection('players').doc(playerId).delete();
    } catch(e) {}
  };

  // Auto-init
  document.addEventListener('DOMContentLoaded', initBingoAdmin);
})();
