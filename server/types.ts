export interface Player {
  id: string;
  playerNumber: 1 | 2;
}

export interface GameState {
  board: number[][];
  turn: 1 | 2;
  players: Player[];
  winner: string | null;
  roomCode: string;
  lastDrop: { row: number; col: number } | null;
}

export interface Room {
  code: string;
  gameState: GameState;
  playerIds: string[];
  readyStatus: { [playerId: string]: boolean };
}

// Client -> Server events
export interface ClientToServerEvents {
  'create-room': () => void;
  'join-room': (data: { roomCode: string }) => void;
  'make-move': (data: { col: number }) => void;
  'leave-room': () => void;
  'play-again': () => void;
  'set-ready': (data: { ready: boolean }) => void;
}

export interface ReadyStatus {
  player1Ready: boolean;
  player2Ready: boolean;
  playerCount: number;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room-created': (data: { roomCode: string }) => void;
  'room-joined': (data: { gameState: GameState; playerNumber: 1 | 2 }) => void;
  'game-start': (data: { gameState: GameState }) => void;
  'move-made': (data: { gameState: GameState }) => void;
  'game-over': (data: { winner: string }) => void;
  'opponent-left': () => void;
  'error': (data: { message: string }) => void;
  'play-again-requested': () => void;
  'game-restart': (data: { gameState: GameState }) => void;
  'ready-update': (data: { readyStatus: ReadyStatus }) => void;
  'player-joined-waiting': (data: { playerCount: number }) => void;
}
