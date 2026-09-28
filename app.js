const address = 'گیلان، لنگرود، شهر چاف و چمخاله، میدان اصلی شهر (میدان چاف)';
const toast = document.querySelector('#toast');
let toastTimeout;

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.querySelector('#copyAddress').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(address);
    showToast('آدرس کپی شد ✓');
  } catch {
    showToast('آدرس: ' + address);
  }
});

document.querySelector('#shareButton').addEventListener('click', async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'موبایل مهدی', text: 'صفحه رسمی موبایل مهدی در چاف و چمخاله', url: location.href });
    } else {
      await navigator.clipboard.writeText(location.href);
      showToast('لینک صفحه کپی شد ✓');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('اشتراک‌گذاری انجام نشد');
  }
});

const start = document.querySelector('#gameStart');
const grid = document.querySelector('#memoryGrid');
const puzzleGrid = document.querySelector('#puzzleGrid');
const scoreElement = document.querySelector('#score');
const timerElement = document.querySelector('#gameTimer');
const timerLabel = document.querySelector('.game-time span');
const labelElement = document.querySelector('#gameLabel');
const message = document.querySelector('#gameMessage');
const controls = document.querySelector('#gameControls');
const mineFlagButton = document.querySelector('#mineFlagButton');
const sudokuKeypad = document.querySelector('#sudokuKeypad');
const faNumber = (number) => String(Math.max(0, number)).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[digit]);
const gameNames = { sudoku: 'سودوکوی ۹×۹', mines: 'مین‌یاب ویندوزی', xo: 'دوز هوشمند' };

let activeGame = 'sudoku';
let running = false;
let score = 0;
let mines = [];
let mineRevealed = [];
let mineFlagged = [];
let mineReady = false;
let mineFlagMode = false;
let xoBoard = [];
let xoTurn = 'X';
let aiTimeout;

// The classic 9x9 Sudoku puzzle, with a fixed valid solution for reliable offline play.
const sudokuSolution = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 3, 4, 2, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 4, 2, 3,
  4, 2, 6, 8, 5, 3, 7, 9, 1,
  7, 1, 3, 9, 2, 4, 8, 5, 6,
  9, 6, 1, 5, 3, 7, 2, 8, 4,
  2, 8, 7, 4, 1, 9, 6, 3, 5,
  3, 4, 5, 2, 8, 6, 1, 7, 9,
];
const sudokuGiven = new Set([
  0, 1, 4,
  9, 12, 13, 14,
  19, 20, 25,
  27, 31, 35,
  36, 39, 41, 44,
  45, 49, 53,
  55, 60, 61,
  66, 67, 68, 71,
  76, 79, 80,
]);
let sudokuBoard = [];
let sudokuSelected = null;
let sudokuMistakes = 0;

function stopGame() {
  clearTimeout(aiTimeout);
  aiTimeout = null;
  running = false;
}

function setScore(value) { scoreElement.textContent = value; }
function setTimer(value, label = 'خطا') { timerLabel.textContent = label; timerElement.textContent = value; }

function emptyView() {
  grid.style.display = 'none';
  puzzleGrid.style.display = 'none';
  controls.classList.remove('visible');
  mineFlagButton.classList.remove('visible', 'active');
  sudokuKeypad.classList.remove('visible');
}

function finishGame(text) {
  stopGame();
  start.style.display = 'flex';
  start.querySelector('span').textContent = 'دوباره بازی کن';
  start.querySelector('small').textContent = `امتیاز: ${faNumber(score)}`;
  message.textContent = text;
}

function startActiveGame() {
  if (running) return;
  running = true;
  start.style.display = 'none';
  if (activeGame === 'sudoku') startSudoku();
  else if (activeGame === 'mines') startMines();
  else startXO();
}

// Sudoku
function renderSudoku() {
  puzzleGrid.innerHTML = '';
  puzzleGrid.className = 'puzzle-grid sudoku-grid';
  sudokuBoard.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `sudoku-cell ${sudokuGiven.has(index) ? 'given' : ''} ${sudokuSelected === index ? 'selected' : ''}`;
    cell.textContent = value ? faNumber(value) : '';
    cell.disabled = sudokuGiven.has(index);
    cell.setAttribute('aria-label', `خانه ${index + 1}${value ? `، عدد ${value}` : ' خالی'}`);
    cell.addEventListener('click', () => {
      if (!running || sudokuGiven.has(index)) return;
      sudokuSelected = index;
      renderSudoku();
      message.textContent = 'حالا یک عدد از صفحه‌کلید انتخاب کن.';
    });
    puzzleGrid.appendChild(cell);
  });
}

function placeSudoku(value) {
  if (!running || activeGame !== 'sudoku' || sudokuSelected === null || sudokuGiven.has(sudokuSelected)) return;
  if (value === 'clear') {
    sudokuBoard[sudokuSelected] = 0;
    renderSudoku();
    message.textContent = 'خانه پاک شد؛ یک عدد درست جایش بگذار.';
    return;
  }
  if (Number(value) !== sudokuSolution[sudokuSelected]) {
    sudokuMistakes += 1;
    setTimer(faNumber(sudokuMistakes));
    message.textContent = 'این عدد درست نیست؛ ردیف و ستون را دوباره بررسی کن.';
    return;
  }
  sudokuBoard[sudokuSelected] = Number(value);
  score = sudokuBoard.filter(Boolean).length - sudokuGiven.size;
  setScore(faNumber(score));
  renderSudoku();
  message.textContent = 'آفرین! خانه‌ی بعدی را پیدا کن.';
  if (sudokuBoard.every(Boolean)) finishGame('سودوکو کامل شد؛ ذهن منطقی داری 🧩');
}

function startSudoku() {
  emptyView();
  puzzleGrid.style.display = 'grid';
  sudokuKeypad.classList.add('visible');
  sudokuBoard = sudokuSolution.map((value, index) => sudokuGiven.has(index) ? value : 0);
  sudokuSelected = null;
  sudokuMistakes = 0;
  score = 0;
  setScore('۰');
  setTimer('۰', 'خطا');
  renderSudoku();
  message.textContent = 'خانه‌ی خالی را انتخاب کن و عدد درست را بزن؛ هر ردیف، ستون و مربع ۳×۳ باید کامل شود.';
}

// Minesweeper: mines are placed after the first click, keeping the opening move safe.
const mineSize = 8;
const mineCount = 10;
function mineNeighbours(index) {
  const x = index % mineSize;
  const y = Math.floor(index / mineSize);
  const result = [];
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < mineSize && ny >= 0 && ny < mineSize && (dx || dy)) result.push(ny * mineSize + nx);
  }
  return result;
}
function prepareMines(first) {
  mines = Array(mineSize * mineSize).fill(false);
  const blocked = new Set([first, ...mineNeighbours(first)]);
  const available = mines.map((_, index) => index).filter(index => !blocked.has(index)).sort(() => Math.random() - .5);
  available.slice(0, mineCount).forEach(index => { mines[index] = true; });
  mineReady = true;
}
function adjacentMines(index) { return mineNeighbours(index).filter(neighbour => mines[neighbour]).length; }
function renderMines(showAll = false) {
  puzzleGrid.innerHTML = '';
  puzzleGrid.className = 'puzzle-grid mines-grid';
  mineRevealed.forEach((revealed, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    const number = adjacentMines(index);
    const isMine = mines[index];
    cell.className = `mine-cell ${revealed || showAll ? 'revealed' : ''} ${mineFlagged[index] ? 'flagged' : ''} ${showAll && isMine ? 'mine' : ''}`;
    cell.textContent = showAll && isMine ? '💣' : mineFlagged[index] && !revealed ? '🚩' : revealed && number ? faNumber(number) : '';
    cell.setAttribute('aria-label', `خانه ${index + 1}`);
    cell.addEventListener('click', () => handleMineClick(index));
    cell.addEventListener('contextmenu', event => { event.preventDefault(); toggleMineFlag(index); });
    puzzleGrid.appendChild(cell);
  });
}
function floodMine(index) {
  const queue = [index];
  while (queue.length) {
    const current = queue.shift();
    if (mineRevealed[current] || mineFlagged[current] || mines[current]) continue;
    mineRevealed[current] = true;
    if (!adjacentMines(current)) mineNeighbours(current).forEach(neighbour => { if (!mineRevealed[neighbour] && !mines[neighbour]) queue.push(neighbour); });
  }
}
function checkMineWin() { return mineRevealed.every((revealed, index) => mines[index] || revealed); }
function handleMineClick(index) {
  if (!running || mineFlagged[index]) return;
  if (mineFlagMode) { toggleMineFlag(index); return; }
  if (!mineReady) prepareMines(index);
  if (mines[index]) {
    mineRevealed = mineRevealed.map((_, mineIndex) => mines[mineIndex]);
    renderMines(true);
    score = 0;
    finishGame('اوه! روی بمب زدی؛ دوباره باهوش‌تر شروع کن 💣');
    return;
  }
  floodMine(index);
  score = mineRevealed.filter(Boolean).length;
  setScore(faNumber(score));
  renderMines();
  if (checkMineWin()) finishGame('همه‌ی بمب‌ها پیدا شد؛ مین‌یاب حرفه‌ای هستی 🏆');
}
function toggleMineFlag(index) {
  if (!running || mineRevealed[index]) return;
  mineFlagged[index] = !mineFlagged[index];
  renderMines();
}
function startMines() {
  emptyView();
  puzzleGrid.style.display = 'grid';
  mineFlagButton.classList.add('visible');
  mineFlagMode = false;
  mineFlagButton.classList.remove('active');
  mineFlagButton.textContent = '🚩 حالت پرچم: خاموش';
  mines = Array(mineSize * mineSize).fill(false);
  mineRevealed = Array(mineSize * mineSize).fill(false);
  mineFlagged = Array(mineSize * mineSize).fill(false);
  mineReady = false;
  score = 0;
  setScore('۰');
  setTimer('۱۰', 'بمب');
  renderMines();
  message.textContent = 'خانه‌ها را باز کن؛ عدد هر خانه تعداد بمب‌های اطراف را می‌گوید!';
}

// Tic-Tac-Toe with a small minimax opponent.
function winner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return lines.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}
function emptyCells(board) { return board.map((value, index) => value ? null : index).filter(index => index !== null); }
function renderXO() {
  puzzleGrid.innerHTML = '';
  puzzleGrid.className = 'puzzle-grid xo-grid';
  xoBoard.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `xo-cell ${value ? `mark-${value.toLowerCase()}` : ''}`;
    cell.textContent = value || '';
    cell.addEventListener('click', () => playXO(index));
    puzzleGrid.appendChild(cell);
  });
}
function minimax(board, maximizing) {
  const win = winner(board);
  if (win) return board[win[0]] === 'O' ? 10 : -10;
  const open = emptyCells(board);
  if (!open.length) return 0;
  const scores = open.map(index => {
    const next = [...board];
    next[index] = maximizing ? 'O' : 'X';
    return minimax(next, !maximizing);
  });
  return maximizing ? Math.max(...scores) - .1 : Math.min(...scores) + .1;
}
function concludeXO() {
  const win = winner(xoBoard);
  if (win) {
    score = xoBoard[win[0]] === 'X' ? 1 : 0;
    setScore(xoBoard[win[0]]);
    finishGame(xoBoard[win[0]] === 'X' ? 'بردی! دوزباز حرفه‌ای هستی 🏆' : 'این بار هوش مصنوعی برد؛ دوباره امتحان کن 🤖');
  } else if (!emptyCells(xoBoard).length) {
    score = 0;
    setScore('مساوی');
    finishGame('مساوی شد؛ بازی بعدی را تو ببر!');
  }
}
function aiMove() {
  if (!running) return;
  const moves = emptyCells(xoBoard);
  if (!moves.length) return;
  let best = -Infinity;
  let choices = [];
  moves.forEach(index => {
    const next = [...xoBoard];
    next[index] = 'O';
    const value = minimax(next, false);
    if (value > best) { best = value; choices = [index]; }
    else if (value === best) choices.push(index);
  });
  xoBoard[choices[Math.floor(Math.random() * choices.length)]] = 'O';
  xoTurn = 'X';
  renderXO();
  concludeXO();
}
function playXO(index) {
  if (!running || xoTurn !== 'X' || xoBoard[index]) return;
  xoBoard[index] = 'X';
  setScore('X');
  renderXO();
  concludeXO();
  if (running) {
    xoTurn = 'O';
    message.textContent = 'نوبت من شد...';
    aiTimeout = setTimeout(aiMove, 350);
  }
}
function startXO() {
  emptyView();
  puzzleGrid.style.display = 'grid';
  xoBoard = Array(9).fill('');
  xoTurn = 'X';
  score = 0;
  setScore('X');
  setTimer('X', 'نوبت');
  renderXO();
  message.textContent = 'اول تو بازی کن؛ دوز هوشمند حریف توست!';
}

function selectGame(kind) {
  stopGame();
  activeGame = kind;
  labelElement.textContent = gameNames[kind];
  start.style.display = 'flex';
  start.querySelector('span').textContent = 'شروع بازی';
  start.querySelector('small').textContent = 'رکوردت رو بساز';
  message.textContent = 'امتیازت فقط برای سرگرمیه؛ آماده‌ای؟';
  document.querySelectorAll('.game-choice').forEach(button => button.classList.toggle('active', button.dataset.game === kind));
  emptyView();
  if (kind === 'sudoku') { setScore('۰'); setTimer('۰', 'خطا'); }
  else if (kind === 'mines') { setScore('۰'); setTimer('۱۰', 'بمب'); }
  else { setScore('X'); setTimer('X', 'نوبت'); }
}

document.querySelectorAll('.game-choice').forEach(button => button.addEventListener('click', () => selectGame(button.dataset.game)));
document.querySelectorAll('[data-sudoku-value]').forEach(button => button.addEventListener('click', () => placeSudoku(button.dataset.sudokuValue)));
document.querySelector('#gameRestart').addEventListener('click', () => { stopGame(); startActiveGame(); });
mineFlagButton.addEventListener('click', () => {
  if (!running || activeGame !== 'mines') return;
  mineFlagMode = !mineFlagMode;
  mineFlagButton.classList.toggle('active', mineFlagMode);
  mineFlagButton.textContent = `🚩 حالت پرچم: ${mineFlagMode ? 'روشن' : 'خاموش'}`;
});
start.addEventListener('click', startActiveGame);
window.addEventListener('keydown', event => {
  if (activeGame === 'sudoku') {
    const digit = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 }[event.key];
    if (digit) { event.preventDefault(); placeSudoku(digit); }
    if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); placeSudoku('clear'); }
  }
});
selectGame('sudoku');
