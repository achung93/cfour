import { useEffect, useState, useRef, useCallback } from 'react'
import './App.css'
import { SocketProvider, useSocket } from './context/SocketContext'
import HomeScreen from './components/HomeScreen'
import WaitingRoom from './components/WaitingRoom'
import GameBoard from './components/GameBoard'

const TURN_TIME_LIMIT = 10; // seconds

function GameScreen() {
  const { gameState, playerNumber, makeMove, makeMoveHttp, playAgain, leaveRoom } = useSocket();
  const [useHttp, setUseHttp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const timerRef = useRef<number | null>(null);

  const isMyTurn = gameState?.turn === playerNumber;
  const myColor = playerNumber === 1 ? 'Green' : 'Blue';
  const opponentColor = playerNumber === 1 ? 'Blue' : 'Green';

  const getAvailableColumns = useCallback(() => {
    if (!gameState) return [];
    const available: number[] = [];
    for (let col = 0; col < gameState.board[0].length; col++) {
      if (gameState.board[0][col] === 0) {
        available.push(col);
      }
    }
    return available;
  }, [gameState]);

  const makeRandomMove = useCallback(() => {
    const availableCols = getAvailableColumns();
    if (availableCols.length > 0) {
      const randomCol = availableCols[Math.floor(Math.random() * availableCols.length)];
      makeMove(randomCol);
    }
  }, [getAvailableColumns, makeMove]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!gameState || gameState.winner) {
      return;
    }

    // Reset timer when turn changes
    const startTime = Date.now();
    setTimeLeft(TURN_TIME_LIMIT);

    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = TURN_TIME_LIMIT - elapsed;

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTimeLeft(0);
        if (isMyTurn) {
          makeRandomMove();
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.turn, gameState?.winner]);

  if (!gameState || !playerNumber) {
    return <div className="text-white">Loading...</div>;
  }

  const handleCellClick = (_row: number, col: number) => {
    if (isMyTurn && !gameState.winner) {
      if (useHttp) {
        makeMoveHttp(col);
      } else {
        makeMove(col);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
      <div className="flex items-center gap-4 text-white">
        <span className="text-gray-400">Room:</span>
        <span className="font-mono font-bold">{gameState.roomCode}</span>
        <span className="text-gray-400">|</span>
        <span>You are: <span className={playerNumber === 1 ? 'text-green-500' : 'text-blue-500'}>{myColor}</span></span>
        <span className="text-gray-400">|</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Protocol:</span>
          <button
            onClick={() => setUseHttp((s) => !s)}
            className="font-mono font-bold px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-black"
          >
            {useHttp ? 'HTTP' : 'WebSocket'}
          </button>
        </div>
      </div>

      {gameState.winner ? (
        <div className="flex flex-col items-center gap-4">
          <h2 className={`text-3xl font-bold ${gameState.winner === myColor ? 'text-green-400' : 'text-red-400'}`}>
            {gameState.winner === myColor ? 'You Win!' : `${opponentColor} Wins!`}
          </h2>
          <div className="flex gap-4">
            <button
              onClick={playAgain}
              className="bg-green-500 hover:bg-green-600 text-black! font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={leaveRoom}
              className="bg-gray-600 hover:bg-gray-700 text-black! font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className={`text-xl font-bold ${isMyTurn ? 'text-green-400' : 'text-gray-400'}`}>
            {isMyTurn ? "Your turn!" : "Opponent's turn..."}
          </div>
          <div className={`text-2xl font-mono font-bold ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
            {timeLeft}s
          </div>
        </div>
      )}

      <GameBoard
        board={gameState.board}
        onSelect={handleCellClick}
        lastDrop={gameState.lastDrop}
        isMyTurn={isMyTurn && !gameState.winner}
      />

      {!gameState.winner && (
        <button
          onClick={leaveRoom}
          className="mt-4 text-gray-400 hover:text-white underline transition-colors"
        >
          Leave Game
        </button>
      )}
    </div>
  );
}

function AppContent() {
  const { screen } = useSocket();

  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'waiting':
      return <WaitingRoom />;
    case 'game':
      return <GameScreen />;
    default:
      return <HomeScreen />;
  }
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App
