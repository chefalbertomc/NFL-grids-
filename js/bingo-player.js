/**
 * GameDay Bingo - Player Logic
 */

(function() {
  'use strict';

  let db = null;
  let user = null;
  let unsubRooms = null;
  let unsubActiveRoom = null;
  let unsubMyPlayerDoc = null;
  
  let currentRoomId = null;
  let currentMarkedEvents = [];
  let myBoard = [];

  function initBingoPlayer() {
    if (window.db) {
      db = window.db;
      setupListeners();
      loadActiveRooms();
    } else {
      setTimeout(initBingoPlayer, 100);
    }
  }

  function setupListeners() {
    window.onAuthChange((currentUser) => {
      user = currentUser;
      if (user) {
        if (currentRoomId) {
          joinBingoRoom(currentRoomId);
        } else {
          loadActiveRooms();
        }
      } else {
        document.getElementById('bingoListContainer').innerHTML = '<div class="hint-text py-4 text-center">Debes iniciar sesión para jugar al Bingo.</div>';
      }
    });

    const btnShout = document.getElementById('btnShoutBingo');
    if (btnShout) {
      btnShout.addEventListener('click', shoutBingo);
    }
  }

  function loadActiveRooms() {
    if (!db || !user) return;
    
    if (unsubRooms) unsubRooms();
    unsubRooms = db.collection('bingo_games').where('active', '==', true).onSnapshot(snap => {
      const list = document.getElementById('bingoActiveRoomsList');
      if (!list) return;
      
      list.innerHTML = '';
      if (snap.empty) {
        list.innerHTML = '<div class="hint-text py-2">No hay salas de bingo activas en este momento.</div>';
        return;
      }

      snap.forEach(doc => {
        const d = doc.data();
        const card = document.createElement('div');
        card.className = 'card highlight';
        card.style.cursor = 'pointer';
        card.style.padding = '15px';
        card.innerHTML = `
          <h4 style="color:#ffd100; font-size:16px; margin:0 0 4px 0;">🎱 ${d.roomName}</h4>
          <p style="font-size:12px; color:var(--text-muted); margin:0;">📍 ${d.store}</p>
        `;
        card.onclick = () => joinBingoRoom(doc.id, d);
        list.appendChild(card);
      });
    });
  }

  async function joinBingoRoom(roomId, roomData = null) {
    if (!user || !db) return;
    
    currentRoomId = roomId;
    document.getElementById('bingoListContainer').classList.add('hidden');
    document.getElementById('bingoGameContainer').classList.remove('hidden');
    document.getElementById('bingoRoomTitle').textContent = roomData ? roomData.roomName : 'Cargando Sala...';
    document.getElementById('bingoPlayerStatus').textContent = 'Generando tu cartón único...';
    document.getElementById('bingoBoardWrapper').style.display = 'none';

    // 1. Get or Create my player doc
    const pRef = db.collection('bingo_games').doc(roomId).collection('players').doc(user.uid);
    try {
      const pDoc = await pRef.get();
      if (!pDoc.exists) {
        // Necesitamos la lista de eventos de la sala para generar el board
        let eventsList = [];
        if (roomData && roomData.eventsList) {
          eventsList = roomData.eventsList;
        } else {
          const roomDoc = await db.collection('bingo_games').doc(roomId).get();
          eventsList = roomDoc.data().eventsList || [];
        }

        // Shuffle y tomar 16
        const shuffled = [...eventsList].sort(() => 0.5 - Math.random());
        const myGeneratedBoard = shuffled.slice(0, 16).map(ev => ({
          event: ev,
          stamped: false
        }));

        await pRef.set({
          nickname: user.displayName || user.email.split('@')[0],
          board: myGeneratedBoard,
          joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        myBoard = myGeneratedBoard;
      } else {
        myBoard = pDoc.data().board || [];
      }
      
      listenToRoomState(roomId);
      listenToMyPlayerState(roomId);

    } catch (e) {
      alert('Error entrando a la sala: ' + e.message);
    }
  }

  function listenToRoomState(roomId) {
    if (unsubActiveRoom) unsubActiveRoom();
    unsubActiveRoom = db.collection('bingo_games').doc(roomId).onSnapshot(doc => {
      if (!doc.exists) {
        alert('Esta sala ha sido cerrada.');
        document.getElementById('bingoGameContainer').classList.add('hidden');
        document.getElementById('bingoListContainer').classList.remove('hidden');
        return;
      }
      
      const data = doc.data();
      document.getElementById('bingoRoomTitle').textContent = data.roomName;
      currentMarkedEvents = data.markedEvents || [];
      
      // Re-render board with new realities
      renderBoard();
    });
  }

  function listenToMyPlayerState(roomId) {
    if (unsubMyPlayerDoc) unsubMyPlayerDoc();
    unsubMyPlayerDoc = db.collection('bingo_games').doc(roomId).collection('players').doc(user.uid).onSnapshot(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      myBoard = data.board || [];
      
      if (data.bingoClaimedAt) {
        document.getElementById('bingoPlayerStatus').innerHTML = '<strong style="color:#00e676;">¡HAS CANTADO BINGO!</strong> Esperando verificación...';
        document.getElementById('btnShoutBingo').textContent = '¡BINGO CANTADO!';
        document.getElementById('btnShoutBingo').disabled = true;
      } else {
        document.getElementById('bingoPlayerStatus').textContent = 'Toca las casillas que ocurran en el partido.';
      }
      
      renderBoard();
    });
  }

  function renderBoard() {
    const grid = document.getElementById('bingoGrid');
    const wrapper = document.getElementById('bingoBoardWrapper');
    wrapper.style.display = 'flex';
    grid.innerHTML = '';

    if (!myBoard || myBoard.length !== 16) {
      grid.innerHTML = '<div style="grid-column: span 4; text-align:center;">Error cargando cartón.</div>';
      return;
    }

    let isFullBingoValid = true;

    myBoard.forEach((cell, index) => {
      const isReal = currentMarkedEvents.includes(cell.event);
      const isStamped = cell.stamped;
      
      // Logica de validación de El VAR (Backend rules logic simulated here for UI feedback)
      const isCorrectlyStamped = isStamped && isReal;
      const isFalselyStamped = isStamped && !isReal;
      
      if (!isCorrectlyStamped) {
        isFullBingoValid = false;
      }

      const div = document.createElement('div');
      
      // CSS base para la celda
      let bg = 'rgba(255,255,255,0.05)';
      let border = '1px solid var(--border-color)';
      let color = 'var(--text-color)';
      let transform = 'scale(1)';

      if (isCorrectlyStamped) {
        bg = 'rgba(0, 230, 118, 0.2)';
        border = '2px solid #00e676';
        color = '#00e676';
        transform = 'scale(1.02)';
      } else if (isFalselyStamped) {
        bg = 'rgba(255, 68, 68, 0.2)';
        border = '2px dashed #ff4444';
        color = '#ff4444';
      }

      div.style.cssText = `
        background: ${bg};
        border: ${border};
        color: ${color};
        transform: ${transform};
        border-radius: 8px;
        padding: 10px 4px;
        font-size: 10px;
        font-weight: 800;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      `;
      div.textContent = cell.event;
      
      // Indicador de que ya se validó por el VAR pero el usuario no la ha tocado
      if (isReal && !isStamped) {
        div.style.boxShadow = '0 0 10px rgba(255,209,0,0.5)';
        div.style.border = '1px solid #ffd100';
      }

      div.onclick = () => handleCellClick(index, cell.event);
      grid.appendChild(div);
    });

    // Check if bingo button should be enabled
    const btnShout = document.getElementById('btnShoutBingo');
    if (btnShout && document.getElementById('btnShoutBingo').textContent === '¡BINGO!') {
      btnShout.disabled = !isFullBingoValid;
    }
  }

  async function handleCellClick(index, eventName) {
    if (!currentRoomId || !user) return;
    
    // Toggle stamped status locally
    const currentStatus = myBoard[index].stamped;
    const newBoard = [...myBoard];
    newBoard[index].stamped = !currentStatus;

    // Si el usuario intenta marcar algo que no está en el VAR, dar feedback visual (shake)
    if (newBoard[index].stamped && !currentMarkedEvents.includes(eventName)) {
      alert('¡El VAR aún no ha validado esta jugada!');
      return; // Prevenir marcar falsos positivos
    }

    try {
      await db.collection('bingo_games').doc(currentRoomId).collection('players').doc(user.uid).update({
        board: newBoard
      });
    } catch (e) {
      console.error('Error marking cell:', e);
    }
  }

  async function shoutBingo() {
    if (!currentRoomId || !user) return;
    try {
      await db.collection('bingo_games').doc(currentRoomId).collection('players').doc(user.uid).update({
        bingoClaimedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert('¡Has cantado BINGO! El mesero validará tu victoria.');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', initBingoPlayer);
})();
