import { useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function HomeScreen() {
  const { createRoom, joinRoom, isConnected, error, clearError } = useSocket();
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = () => {
    if (joinCode.trim().length === 4) {
      joinRoom(joinCode.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
      <h1 className="text-4xl font-bold text-white">Connect Five</h1>

      {!isConnected && (
        <p className="text-yellow-400">Connecting to server...</p>
      )}

      {error && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <span>{error}</span>
          <button onClick={clearError} className="ml-2 font-bold">×</button>
        </div>
      )}

      <div className="flex flex-col gap-6 w-full max-w-sm">
        <button
          onClick={createRoom}
          disabled={!isConnected}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-black! font-bold py-4 px-6 rounded-lg text-xl transition-colors"
        >
          Create Game
        </button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-600"></div>
          <span className="text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-600"></div>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            className="bg-gray-700 text-white text-center text-2xl tracking-widest font-mono py-3 px-4 rounded-lg uppercase"
            maxLength={4}
          />
          <button
            onClick={handleJoin}
            disabled={!isConnected || joinCode.length !== 4}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-black! font-bold py-4 px-6 rounded-lg text-xl transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>

      <p className="text-gray-500 text-sm mt-8">
        Get 5 in a row to win!
      </p>
    </div>
  );
}
