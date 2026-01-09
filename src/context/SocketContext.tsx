import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

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

export interface ReadyStatus {
  player1Ready: boolean;
  player2Ready: boolean;
  playerCount: number;
}

export type Screen = 'home' | 'waiting' | 'game';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  roomCode: string | null;
  playerNumber: 1 | 2 | null;
  gameState: GameState | null;
  screen: Screen;
  error: string | null;
  readyStatus: ReadyStatus | null;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  makeMove: (col: number) => void;
  makeMoveHttp: (col: number) => Promise<void>;
  leaveRoom: () => void;
  playAgain: () => void;
  clearError: () => void;
  setReady: (ready: boolean) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

// In production, connect to the same origin (frontend and backend are served together)
// In development, connect to localhost:3001
const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [error, setError] = useState<string | null>(null);
  const [readyStatus, setReadyStatus] = useState<ReadyStatus | null>(null);
  const pendingMoves = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('room-created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setPlayerNumber(1);
      setScreen('waiting');
    });

    newSocket.on('room-joined', ({ gameState, playerNumber }) => {
      setGameState(gameState);
      setPlayerNumber(playerNumber);
      setRoomCode(gameState.roomCode);
      setScreen('waiting');
    });

    newSocket.on('player-joined-waiting', () => {
      // Player 2 has joined, both players now in waiting room
      setScreen('waiting');
    });

    newSocket.on('ready-update', ({ readyStatus }) => {
      setReadyStatus(readyStatus);
    });

    newSocket.on('game-start', ({ gameState }) => {
      setGameState(gameState);
      setScreen('game');
    });

    // Handle incoming move-made events. Server may echo back a `clientToken` we sent when making the move.
    newSocket.on('move-made', (payload) => {
      const { gameState, clientToken } = payload as any;
      setGameState(gameState);

      if (clientToken && pendingMoves.current.has(clientToken)) {
        const start = pendingMoves.current.get(clientToken)!;
        const elapsed = Date.now() - start;
        console.log(`Move roundtrip (ms) for token ${clientToken}: ${elapsed}ms`);
        pendingMoves.current.delete(clientToken);
      }
    });

    newSocket.on('game-over', ({ winner }) => {
      setGameState((prev) => (prev ? { ...prev, winner } : null));
    });

    newSocket.on('opponent-left', () => {
      setError('Opponent left the game');
      setScreen('home');
      setRoomCode(null);
      setPlayerNumber(null);
      setGameState(null);
    });

    newSocket.on('game-restart', ({ gameState }) => {
      setGameState(gameState);
    });

    newSocket.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = () => {
    socket?.emit('create-room');
  };

  const joinRoom = (code: string) => {
    socket?.emit('join-room', { roomCode: code.toUpperCase() });
  };

  const makeMove = (col: number) => {
    if (!socket) return;
    // generate a client token so we can measure RTT when the server echoes it back
    const clientToken = (crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pendingMoves.current.set(clientToken, Date.now());
    socket.emit('make-move', { col, clientToken });
  };

  const makeMoveHttp = async (col: number) => {
    // POST to server HTTP endpoint for performance comparison
    try {
      if (!roomCode || !socket) return;
      const clientToken = (crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // record start time for full roundtrip (will be completed when 'move-made' arrives)
      pendingMoves.current.set(clientToken, Date.now());

      const start = Date.now();
      const resp = await fetch(`${SERVER_URL}/api/make-move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, col, playerId: socket.id, clientToken }),
      });

      const httpMs = Date.now() - start;

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ message: 'Unknown error' }));
        setError(data.message || 'Move failed');
        // remove pending token since it failed
        pendingMoves.current.delete(clientToken);
        return;
      }

      const data = await resp.json();
      console.log(`HTTP /api/make-move response time (ms): ${httpMs}ms`);

      // Server will also broadcast 'move-made' via sockets; `move-made` handler will compute full RTT
      // Update local state optimistically with the response to reduce perceived latency
      if (data.gameState) {
        setGameState(data.gameState);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const leaveRoom = () => {
    socket?.emit('leave-room');
    setScreen('home');
    setRoomCode(null);
    setPlayerNumber(null);
    setGameState(null);
    setReadyStatus(null);
  };

  const playAgain = () => {
    socket?.emit('play-again');
  };

  const clearError = () => {
    setError(null);
  };

  const setReady = (ready: boolean) => {
    socket?.emit('set-ready', { ready });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        roomCode,
        playerNumber,
        gameState,
        screen,
        error,
        readyStatus,
        createRoom,
        joinRoom,
        makeMove,
        makeMoveHttp,
        leaveRoom,
        playAgain,
        clearError,
        setReady,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
