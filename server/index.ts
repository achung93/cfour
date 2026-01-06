import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room, ClientToServerEvents, ServerToClientEvents, GameState, ReadyStatus } from './types.js';
import { createInitialGameState, generateRoomCode, makeMove, createBoard } from './game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from the frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

const httpServer = createServer(app);

// Configure CORS for Socket.IO
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || true]  // In production, allow the frontend URL or all origins
  : ['http://localhost:5173', 'http://localhost:5174'];

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Store active rooms
const rooms = new Map<string, Room>();
// Map socket IDs to room codes
const playerRooms = new Map<string, string>();

function getReadyStatus(room: Room): ReadyStatus {
  const player1Id = room.gameState.players.find(p => p.playerNumber === 1)?.id;
  const player2Id = room.gameState.players.find(p => p.playerNumber === 2)?.id;

  return {
    player1Ready: player1Id ? room.readyStatus[player1Id] ?? false : false,
    player2Ready: player2Id ? room.readyStatus[player2Id] ?? false : false,
    playerCount: room.playerIds.length,
  };
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create-room', () => {
    // Generate unique room code
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    // Create room
    const room: Room = {
      code: roomCode,
      gameState: createInitialGameState(roomCode),
      playerIds: [socket.id],
      readyStatus: {},
    };

    room.gameState.players.push({ id: socket.id, playerNumber: 1 });
    rooms.set(roomCode, room);
    playerRooms.set(socket.id, roomCode);

    socket.join(roomCode);
    socket.emit('room-created', { roomCode });
    console.log(`Room ${roomCode} created by ${socket.id}`);
  });

  socket.on('join-room', ({ roomCode }) => {
    const room = rooms.get(roomCode.toUpperCase());

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.playerIds.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Add player to room
    room.playerIds.push(socket.id);
    room.gameState.players.push({ id: socket.id, playerNumber: 2 });
    playerRooms.set(socket.id, roomCode.toUpperCase());

    socket.join(roomCode.toUpperCase());
    socket.emit('room-joined', { gameState: room.gameState, playerNumber: 2 });

    // Notify both players that player 2 joined (move to waiting room with ready buttons)
    io.to(roomCode.toUpperCase()).emit('player-joined-waiting', { playerCount: 2 });

    // Send initial ready status
    const readyStatus = getReadyStatus(room);
    io.to(roomCode.toUpperCase()).emit('ready-update', { readyStatus });

    console.log(`Player ${socket.id} joined room ${roomCode}`);
  });

  socket.on('set-ready', ({ ready }) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Update ready status
    room.readyStatus[socket.id] = ready;

    // Get ready status and broadcast
    const readyStatus = getReadyStatus(room);
    io.to(roomCode).emit('ready-update', { readyStatus });

    // Check if both players are ready
    if (room.playerIds.length === 2 && readyStatus.player1Ready && readyStatus.player2Ready) {
      // Start the game
      io.to(roomCode).emit('game-start', { gameState: room.gameState });
      console.log(`Game started in room ${roomCode}`);
    }
  });

  socket.on('make-move', ({ col }) => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Find player number
    const player = room.gameState.players.find((p) => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    const result = makeMove(room.gameState, col, player.playerNumber);
    if (!result.success) {
      socket.emit('error', { message: 'Invalid move' });
      return;
    }

    // Broadcast updated game state
    io.to(roomCode).emit('move-made', { gameState: room.gameState });

    if (room.gameState.winner) {
      io.to(roomCode).emit('game-over', { winner: room.gameState.winner });
    }
  });

  socket.on('play-again', () => {
    const roomCode = playerRooms.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    // Reset game state but keep players
    room.gameState.board = createBoard();
    room.gameState.turn = 1;
    room.gameState.winner = null;
    room.gameState.lastDrop = null;

    io.to(roomCode).emit('game-restart', { gameState: room.gameState });
  });

  socket.on('leave-room', () => {
    handlePlayerLeave(socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    handlePlayerLeave(socket.id);
  });

  function handlePlayerLeave(playerId: string) {
    const roomCode = playerRooms.get(playerId);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    // Remove player from room
    room.playerIds = room.playerIds.filter((id) => id !== playerId);
    room.gameState.players = room.gameState.players.filter((p) => p.id !== playerId);
    playerRooms.delete(playerId);

    // Notify remaining player
    io.to(roomCode).emit('opponent-left');

    // Clean up empty room
    if (room.playerIds.length === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    }
  }
});

// Catch-all route for SPA - serve index.html for any non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
