/**
 * GameDay Bingo - Motor de Validación Lógica (4x4)
 * Valida si un cartón de bingo tiene una línea o bingo completo.
 */

class BingoValidator {
  /**
   * Verifica el estado del tablero 4x4 de un jugador.
   * @param {Array<boolean>} board - Array de 16 booleanos indicando si la celda está marcada (true) o no (false).
   * @returns {Object} - Resultado de la validación { hasLine: boolean, linesCompleted: number, isFullBingo: boolean }
   */
  static validateBoard(board) {
    if (!Array.isArray(board) || board.length !== 16) {
      throw new Error("El tablero debe contener exactamente 16 casillas (4x4).");
    }

    let linesCompleted = 0;

    // 1. Validar Filas (Horizontales)
    for (let row = 0; row < 4; row++) {
      let isLine = true;
      for (let col = 0; col < 4; col++) {
        if (!board[row * 4 + col]) {
          isLine = false;
          break;
        }
      }
      if (isLine) linesCompleted++;
    }

    // 2. Validar Columnas (Verticales)
    for (let col = 0; col < 4; col++) {
      let isLine = true;
      for (let row = 0; row < 4; row++) {
        if (!board[row * 4 + col]) {
          isLine = false;
          break;
        }
      }
      if (isLine) linesCompleted++;
    }

    // 3. Validar Diagonal Principal (\)
    let isMainDiagonal = true;
    for (let i = 0; i < 4; i++) {
      if (!board[i * 4 + i]) {
        isMainDiagonal = false;
        break;
      }
    }
    if (isMainDiagonal) linesCompleted++;

    // 4. Validar Diagonal Secundaria (/)
    let isSecondaryDiagonal = true;
    for (let i = 0; i < 4; i++) {
      if (!board[i * 4 + (3 - i)]) {
        isSecondaryDiagonal = false;
        break;
      }
    }
    if (isSecondaryDiagonal) linesCompleted++;

    // Retorno final
    const isFullBingo = board.every(cell => cell === true);

    return {
      hasLine: linesCompleted > 0,
      linesCompleted: linesCompleted,
      isFullBingo: isFullBingo
    };
  }

  /**
   * Arbitraje Automático: Cruza los eventos reales del partido con el tablero del jugador.
   * @param {Array<Object>} playerBoard - [{ event: "Gol Local", stamped: true/false }, ...]
   * @param {Array<string>} actualEvents - Eventos validados por el VAR (ej. ["Gol Local", "Tarjeta Amarilla"])
   * @returns {Array<boolean>} - El board validado (true si coincide con la realidad, false si no)
   */
  static arbitrateBoard(playerBoard, actualEvents) {
    return playerBoard.map(cell => {
      // Un jugador intentó tachar algo que NO ha sucedido según el VAR
      if (cell.stamped && !actualEvents.includes(cell.event)) {
        return false; // Penalización: Invalidar marca falsa
      }
      
      // La celda es válida si el evento ocurrió (independientemente si el jugador ya lo tachó o no, 
      // pero en este juego el jugador debe "tachar" proactivamente, por lo que requerimos ambas).
      return cell.stamped && actualEvents.includes(cell.event);
    });
  }
}

module.exports = BingoValidator;
