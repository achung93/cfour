import { useSocket } from '../context/SocketContext';

export default function WaitingRoom() {
  const { roomCode, leaveRoom, readyStatus, setReady, playerNumber } = useSocket();

  const copyToClipboard = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
    }
  };

  const bothPlayersJoined = readyStatus && readyStatus.playerCount === 2;
  const isReady = playerNumber === 1 ? readyStatus?.player1Ready : readyStatus?.player2Ready;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
      <h1 className="text-3xl font-bold text-white">
        {bothPlayersJoined ? 'Ready Up!' : 'Waiting for Opponent'}
      </h1>

      <div className="flex flex-col items-center gap-4">
        <p className="text-gray-400">Share this code with your friend:</p>

        <div
          onClick={copyToClipboard}
          className="bg-gray-800 px-8 py-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
        >
          <span className="text-5xl font-mono font-bold text-white tracking-widest">
            {roomCode}
          </span>
        </div>

        <p className="text-gray-500 text-sm">Click to copy</p>
      </div>

      {bothPlayersJoined ? (
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-8">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${readyStatus.player1Ready ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-gray-300">Player 1</span>
              <span className={`text-sm ${readyStatus.player1Ready ? 'text-green-400' : 'text-gray-500'}`}>
                {readyStatus.player1Ready ? 'Ready' : 'Not Ready'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${readyStatus.player2Ready ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="text-gray-300">Player 2</span>
              <span className={`text-sm ${readyStatus.player2Ready ? 'text-green-400' : 'text-gray-500'}`}>
                {readyStatus.player2Ready ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            {!isReady ? (
              <button
                onClick={() => setReady(true)}
                className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-colors"
              >
                Ready
              </button>
            ) : (
              <button
                onClick={() => setReady(false)}
                className="px-8 py-3 bg-red-500 hover:bg-red-400 text-black font-bold rounded-lg transition-colors"
              >
                Not Ready
              </button>
            )}
          </div>

          {readyStatus.player1Ready && readyStatus.player2Ready && (
            <p className="text-green-400 animate-pulse">Starting game...</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Waiting for player 2 to join...</span>
        </div>
      )}

      <button
        onClick={leaveRoom}
        className="mt-8 text-gray-400 hover:text-white underline transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
