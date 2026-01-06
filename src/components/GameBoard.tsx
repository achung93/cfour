
type BoardProps = {
    board: number[][]
    onSelect: (row: number, col: number) => void;
    lastDrop?: { row: number; col: number } | null;
    isMyTurn?: boolean;
};

const GameBoard = ({board, onSelect, lastDrop, isMyTurn = true}: BoardProps) => {
  const getCellColor = (cell: number) => {
    if (cell === 1) return '!bg-green-500';
    if (cell === 2) return '!bg-blue-500';
    return '!bg-white';
  };

  const isLastDrop = (r: number, c: number) => {
    return lastDrop && lastDrop.row === r && lastDrop.col === c;
  };

  return (
    <div className={`inline-flex flex-col gap-2 p-4 bg-blue-600 rounded-lg ${!isMyTurn ? 'opacity-75' : ''}`}>
      {board.map((row, r) => (
        <div key={r} className="flex gap-2">
          {row.map((cell, c) => (
            <button
              key={c}
              className={`w-16 h-16 ${getCellColor(cell)} border-2 border-blue-800 rounded-lg hover:opacity-80 transition-all flex items-center justify-center text-2xl font-bold ${isLastDrop(r, c) ? 'animate-drop' : ''} ${!isMyTurn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => onSelect(r, c)}
              disabled={!isMyTurn}
            >
              {''}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default GameBoard