let telegram = window.Telegram.WebApp;
telegram.ready();
telegram.expand();

let currentPlayer = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;

const statusDisplay = document.querySelector('.status');
const cells = document.querySelectorAll('.cell');
const restartButton = document.querySelector('.restart');

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
];

function handleCellClick(clickedCellEvent) {
    const clickedCell = clickedCellEvent.target;
    const clickedCellIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (gameBoard[clickedCellIndex] !== '' || !gameActive) return;

    gameBoard[clickedCellIndex] = currentPlayer;
    clickedCell.textContent = currentPlayer;

    checkWin();
    checkDraw();
    
    if (gameActive) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        statusDisplay.textContent = `${currentPlayer}'s turn`;
    }
}

function checkWin() {
    for (let condition of winningConditions) {
        let [a, b, c] = condition;
        if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
            gameActive = false;
            statusDisplay.textContent = `${currentPlayer} wins!`;
            sendGameResult(`${currentPlayer} wins!`);
            return;
        }
    }
}

function checkDraw() {
    if (!gameBoard.includes('') && gameActive) {
        gameActive = false;
        statusDisplay.textContent = 'Game ended in a draw!';
        sendGameResult('Game ended in a draw!');
    }
}

function handleRestartGame() {
    currentPlayer = 'X';
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    statusDisplay.textContent = `${currentPlayer}'s turn`;
    cells.forEach(cell => cell.textContent = '');
}

function sendGameResult(result) {
    telegram.sendData(JSON.stringify({
        type: 'game_result',
        result: result
    }));
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartButton.addEventListener('click', handleRestartGame);
