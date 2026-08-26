/**
 * GameDay Bingo - "El VAR" (Motor de Polling Automático)
 * 
 * Este script está diseñado para ejecutarse como un Cron Job (ej. cada 2 minutos)
 * o dentro de una función de servidor Node.js/Firebase Cloud Functions.
 * 
 * Objetivo: Leer el "Play by Play" de ESPN y extraer eventos para inyectarlos
 * automáticamente en el documento de Firestore de la sala de Bingo activa.
 */

// NOTA: Para implementar en Firebase real, descomentar:
// const admin = require('firebase-admin');
// admin.initializeApp();
// const db = admin.firestore();

// Dependencia fetch (Node 18+ la trae por defecto)

async function pollBingoEvents(leagueSlug, eventId, bingoRoomId) {
  try {
    console.log(`[VAR Polling] Iniciando arbitraje para Sala ${bingoRoomId} (Evento ${eventId} - Liga ${leagueSlug})`);

    // 1. Consultar Play by Play en la API de ESPN
    // Para soccer, ESPN requiere el "summary" de un evento específico
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${eventId}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Error HTTP de ESPN: ${res.status}`);
    }

    const data = await res.json();
    
    // 2. Extraer Eventos Reales
    // Extraemos goles, tarjetas amarillas/rojas, etc.
    const actualEvents = [];

    // Goles
    if (data.header && data.header.competitions && data.header.competitions[0]) {
      const match = data.header.competitions[0];
      const homeTeam = match.competitors.find(c => c.homeAway === 'home');
      const awayTeam = match.competitors.find(c => c.homeAway === 'away');

      if (homeTeam && homeTeam.score > 0) {
        actualEvents.push('Gol Local');
      }
      if (awayTeam && awayTeam.score > 0) {
        actualEvents.push('Gol Visitante');
      }
    }

    // Análisis de jugadas (Play by Play - Opcional dependiendo del payload de ESPN)
    if (data.keyEvents && Array.isArray(data.keyEvents)) {
      data.keyEvents.forEach(play => {
        const text = (play.text || '').toLowerCase();
        
        if (text.includes('yellow card')) {
          actualEvents.push('Tarjeta Amarilla');
        }
        if (text.includes('red card')) {
          actualEvents.push('Tarjeta Roja');
        }
        if (text.includes('corner')) {
          actualEvents.push('Tiro de Esquina');
        }
        if (text.includes('penalty')) {
          actualEvents.push('Penal Marcado');
        }
      });
    }

    // Deduplicar eventos (solo nos interesa saber si ocurrió al menos una vez)
    const uniqueEvents = [...new Set(actualEvents)];
    console.log(`[VAR Polling] Eventos detectados en el partido: `, uniqueEvents);

    // 3. Sincronizar con la Base de Datos
    // if (db) {
    //   await db.collection('bingo_games').doc(bingoRoomId).update({
    //     markedEvents: uniqueEvents, // Overwrite con la realidad del VAR
    //     lastVarSync: admin.firestore.FieldValue.serverTimestamp()
    //   });
    //   console.log(`[VAR Polling] Sincronización exitosa en Firestore.`);
    // }

    return uniqueEvents;

  } catch (err) {
    console.error('[VAR Polling] Error crítico en el arbitraje:', err);
    return [];
  }
}

module.exports = { pollBingoEvents };
