import { GameState } from './types.js';

const ROWS = 9;
const COLS = 9;
const WIN_LENGTH = 5;

export function createBoard(): number[][] {
  const board: number[][] = [];
  for (let i = 0; i < ROWS; i++) {
    const row: number[] = [];
    for (let j = 0; j < COLS; j++) {
      row.push(0);
    }
    board.push(row);
  }
  return board;
}

export function createInitialGameState(roomCode: string): GameState {
  return {
    board: createBoard(),
    turn: 1,
    players: [],
    winner: null,
    roomCode,
    lastDrop: null,
  };
}

export function getOpenRow(board: number[][], col: number): number {
  for (let i = board.length - 1; i >= 0; i--) {
    if (board[i][col] === 0) {
      return i;
    }
  }
  return -1;
}

export function checkWinner(board: number[][], row: number, col: number, player: number): boolean {
  // Check horizontal
  let count = 1;
  for (let i = col - 1; i >= 0 && board[row][i] === player; i--) {
    count++;
  }
  for (let i = col + 1; i < board[0].length && board[row][i] === player; i++) {
    count++;
  }
  if (count >= WIN_LENGTH) return true;

  // Check vertical
  count = 1;
  for (let i = row - 1; i >= 0 && board[i][col] === player; i--) {
    count++;
  }
  for (let i = row + 1; i < board.length && board[i][col] === player; i++) {
    count++;
  }
  if (count >= WIN_LENGTH) return true;

  // Check diagonal (top-left to bottom-right)
  count = 1;
  for (let i = 1; row - i >= 0 && col - i >= 0 && board[row - i][col - i] === player; i++) {
    count++;
  }
  for (let i = 1; row + i < board.length && col + i < board[0].length && board[row + i][col + i] === player; i++) {
    count++;
  }
  if (count >= WIN_LENGTH) return true;

  // Check diagonal (top-right to bottom-left)
  count = 1;
  for (let i = 1; row - i >= 0 && col + i < board[0].length && board[row - i][col + i] === player; i++) {
    count++;
  }
  for (let i = 1; row + i < board.length && col - i >= 0 && board[row + i][col - i] === player; i++) {
    count++;
  }
  if (count >= WIN_LENGTH) return true;

  return false;
}

export function makeMove(gameState: GameState, col: number, playerNumber: 1 | 2): { success: boolean; row?: number } {
  if (gameState.turn !== playerNumber) {
    return { success: false };
  }

  if (gameState.winner) {
    return { success: false };
  }

  const row = getOpenRow(gameState.board, col);
  if (row === -1) {
    return { success: false };
  }

  gameState.board[row][col] = playerNumber;
  gameState.lastDrop = { row, col };

  if (checkWinner(gameState.board, row, col, playerNumber)) {
    gameState.winner = playerNumber === 1 ? 'Green' : 'Blue';
  } else {
    gameState.turn = playerNumber === 1 ? 2 : 1;
  }

  return { success: true, row };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
