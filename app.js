// Rummikub Solver v1.0 - UI only
// Colores oficiales: rojo, azul, negro, naranja; números 1..13; 2 comodines

// Orden solicitado visualmente: negro, azul, naranja, rojo
const COLORS = [
  { key: 'black', label: 'Negro' },
  { key: 'blue', label: 'Azul' },
  { key: 'orange', label: 'Naranja' },
  { key: 'red', label: 'Rojo' },
];
const NUMBERS = Array.from({ length: 13 }, (_, i) => i + 1);
const JOKERS = [{ key: 'joker1', label: 'Comodín 1' }, { key: 'joker2', label: 'Comodín 2' }];

// Estado del tablero y de la mano
// Ajuste solicitado para móviles: tablero 12x10 y mano 12x2 (24 huecos)
const BOARD_ROWS = 10;
const BOARD_COLS = 12;
const HAND_SLOTS = 24;

let boardState = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
let handState = Array(HAND_SLOTS).fill(null);

// DOM refs
const boardEl = document.getElementById('board');
const handEl = document.getElementById('hand');
const pickerEl = document.getElementById('picker');
const pickerBodyEl = document.getElementById('picker-body');
const pickerCloseBtn = document.getElementById('picker-close');
const clearCellBtn = document.getElementById('btn-clear-cell');
const solveBtn = document.getElementById('btn-solve');
const saveBtn = document.getElementById('btn-save-pos');
const loadBtn = document.getElementById('btn-load-pos');
const btnClearAll = document.getElementById('btn-clear-all');
const chkUseHandJokers = document.getElementById('chk-use-hand-jokers');
const inputTimeLimit = document.getElementById('input-time-limit');
const msgResult = document.getElementById('msg-result');

// Contexto del picker: dónde vamos a escribir la ficha seleccionada
let pickerContext = { where: 'board', r: 0, c: 0, idx: 0 };

function createGrid(parent, rows, cols, where) {
  parent.innerHTML = '';
  parent.style.setProperty('--rows', rows);
  parent.style.setProperty('--cols', cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.where = where;
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.setAttribute('aria-label', `Hueco ${where==='board'?'mesa':'mano'} ${r+1}-${c+1}`);
      parent.appendChild(cell);
    }
  }
}

function createHand(parent, slots) {
  parent.innerHTML = '';
  for (let i = 0; i < slots; i++) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell';
    cell.dataset.where = 'hand';
    cell.dataset.idx = String(i);
    cell.setAttribute('aria-label', `Hueco mano ${i+1}`);
    parent.appendChild(cell);
  }
}

function renderAll() {
  // render board
  const cells = boardEl.querySelectorAll('.cell');
  cells.forEach((cell) => {
    const r = Number(cell.dataset.r); const c = Number(cell.dataset.c);
    renderCell(cell, boardState[r][c]);
  });
  // render hand
  const hcells = handEl.querySelectorAll('.cell');
  hcells.forEach((cell) => {
    const idx = Number(cell.dataset.idx);
    renderCell(cell, handState[idx]);
  });
}

function renderCell(cell, tile) {
  cell.innerHTML = '';
  if (!tile) return;
  const span = document.createElement('span');
  if (tile.kind === 'joker') {
    span.className = 'tile joker';
    span.textContent = '★';
  } else {
    span.className = `tile ${tile.color}`;
    span.textContent = String(tile.num);
  }
  cell.appendChild(span);
}

function openPickerForCell(cell) {
  const where = cell.dataset.where;
  if (where === 'board') {
    pickerContext = { where, r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  } else {
    pickerContext = { where, idx: Number(cell.dataset.idx) };
  }
  buildPickerContent();
  // En pantallas estrechas mostramos hoja inferior (sheet)
  if (window.innerWidth <= 480) {
    pickerEl.dataset.mode = 'sheet';
    pickerEl.style.left = '0px';
    pickerEl.style.top = 'auto';
  } else {
    delete pickerEl.dataset.mode;
    positionPickerNear(cell);
  }
  pickerEl.hidden = false;
}

function positionPickerNear(cell) {
  const rect = cell.getBoundingClientRect();
  const vw = window.innerWidth; const vh = window.innerHeight;
  const PADDING = 12;
  let left = rect.left;
  let top = rect.bottom + 6;
  // Mantener dentro de la ventana
  const pickerW = Math.min(850, vw - 40);
  if (left + pickerW > vw - PADDING) left = Math.max(PADDING, vw - pickerW - PADDING);
  if (top + 320 > vh) top = Math.max(PADDING, rect.top - 340);
  pickerEl.style.left = `${left}px`;
  pickerEl.style.top = `${top}px`;
}

function buildPickerContent() {
  pickerBodyEl.innerHTML = '';
  // Una fila por color 1..13
  for (const color of COLORS) {
    const row = document.createElement('div'); row.className = 'picker-row';
    const label = document.createElement('div'); label.className = 'label'; label.textContent = color.label;
    row.appendChild(label);
    for (const n of NUMBERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tilebtn ${color.key}`;
      btn.textContent = String(n);
      btn.addEventListener('click', () => selectTile({ kind: 'num', color: color.key, num: n }));
      row.appendChild(btn);
    }
    pickerBodyEl.appendChild(row);
  }
  // Comodines
  const jrow = document.createElement('div'); jrow.className = 'picker-row';
  const jlabel = document.createElement('div'); jlabel.className = 'label'; jlabel.textContent = 'Comodín';
  jrow.appendChild(jlabel);
  for (const j of JOKERS) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'tilebtn joker'; btn.textContent = '★';
    btn.addEventListener('click', () => selectTile({ kind: 'joker', id: j.key }));
    jrow.appendChild(btn);
  }
  pickerBodyEl.appendChild(jrow);
}

function selectTile(tile) {
  if (pickerContext.where === 'board') {
    const { r, c } = pickerContext;
    boardState[r][c] = normalizeTile(tile);
    // Avanzar a la siguiente celda (izq a derecha, arriba a abajo)
    let nextC = c + 1;
    let nextR = r;
    if (nextC >= BOARD_COLS) { nextC = 0; nextR++; }
    if (nextR < BOARD_ROWS) {
      pickerContext = { where: 'board', r: nextR, c: nextC };
    }
  } else {
    const { idx } = pickerContext;
    handState[idx] = normalizeTile(tile);
    // Avanzar a la siguiente celda de la mano
    const nextIdx = idx + 1;
    if (nextIdx < HAND_SLOTS) {
      pickerContext = { where: 'hand', idx: nextIdx };
    }
  }
  renderAll();
  // NO cerrar el picker; permanece abierto para seguir añadiendo fichas
}

function normalizeTile(tile) {
  if (tile.kind === 'joker') return { kind: 'joker', id: tile.id };
  return { kind: 'num', color: tile.color, num: tile.num };
}

function clearCurrentCell() {
  if (pickerContext.where === 'board') {
    const { r, c } = pickerContext; boardState[r][c] = null;
  } else { handState[pickerContext.idx] = null; }
  renderAll();
  // NO cerrar el picker automáticamente al limpiar
}

function handleCellClick(e) {
  const cell = e.target.closest('.cell'); if (!cell) return;
  openPickerForCell(cell);
}

function handleSolve() {
  // Ocultar mensaje previo
  if (msgResult) msgResult.style.display = 'none';
  
  const startTime = performance.now();
  const tilesBoard = boardState.flat().filter(Boolean);
  const tilesHand = handState.filter(Boolean);
  const useHandJokers = chkUseHandJokers ? chkUseHandJokers.checked : true;
  const timeLimit = inputTimeLimit ? Math.max(1, Number(inputTimeLimit.value) || 30) : 30;
  
  const sol = solveOptimalWithJokers(tilesBoard, tilesHand, useHandJokers, timeLimit);
  if (sol && sol.coversAllBoard) {
    // 1) Calcular cuántas fichas de la mano se han usado: (sets) - (fichas de mesa)
    const usedMap = computeUsedFromHandCounts(sol.sets, tilesBoard);
    // 2) Quitarlas de la mano
    removeTilesFromHand(usedMap);
    // 2b) Quitar comodines usados que provienen de la mano
    const jokersFromHand = computeUsedJokersFromHand(sol.sets, tilesBoard);
    if (jokersFromHand > 0) removeJokersFromHand(jokersFromHand);
    // 3) Colocar sets en la mesa, con una casilla vacía entre cada set
    const layoutInfo = layoutSetsOnBoard(sol.sets);
    boardState = layoutInfo.board;
    renderAll();
    // Calcular tiempo transcurrido y mostrar mensaje de éxito
    const elapsedTime = ((performance.now() - startTime) / 1000).toFixed(3);
    if (msgResult) {
      msgResult.textContent = `Cálculo realizado en ${elapsedTime} segundos`;
      msgResult.style.display = 'inline';
    }
    return;
  }

  // Si no cubre mesa, no tocamos nada.
}

function exportLayout() {
  const data = { board: boardState, hand: handState };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'rummikub_layout.json'; a.click();
  URL.revokeObjectURL(url);
}

function importLayout() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
  input.addEventListener('change', () => {
    const f = input.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data.board) && Array.isArray(data.hand)) {
          boardState = data.board; handState = data.hand; renderAll();
        } else { throw new Error('Formato inválido'); }
      } catch (err) { alert('No se pudo importar: ' + err); }
    };
    reader.readAsText(f);
  });
  input.click();
}

function clearAll() {
  boardState = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  handState = Array(HAND_SLOTS).fill(null); 
  if (msgResult) msgResult.style.display = 'none';
  renderAll();
}

// Inicialización
createGrid(boardEl, BOARD_ROWS, BOARD_COLS, 'board');
createHand(handEl, HAND_SLOTS);
renderAll();

// Eventos
boardEl.addEventListener('click', handleCellClick);
handEl.addEventListener('click', handleCellClick);
pickerCloseBtn.addEventListener('click', () => (pickerEl.hidden = true));
clearCellBtn.addEventListener('click', clearCurrentCell);
solveBtn.addEventListener('click', handleSolve);
btnClearAll.addEventListener('click', clearAll);
if (saveBtn) saveBtn.addEventListener('click', savePosition);
if (loadBtn) loadBtn.addEventListener('click', loadPosition);

// Cerrar picker con ESC
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') pickerEl.hidden = true; });

// Reposicionar picker si cambia el tamaño de ventana
window.addEventListener('resize', () => {
  if (pickerEl.hidden) return;
  if (window.innerWidth <= 480) {
    pickerEl.dataset.mode = 'sheet';
    pickerEl.style.left = '0px'; pickerEl.style.top = 'auto';
  } else {
    delete pickerEl.dataset.mode; pickerEl.style.left = '20px';
  }
});

// ------------------ Algoritmo v1 (sin comodines) ------------------
function keyOf(t) { return `${t.color}-${t.num}`; }

function countTiles(arr) {
  const m = new Map();
  for (const t of arr) { const k = keyOf(t); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

function takeFrom(map, k, n=1) { const v = map.get(k)||0; if (v < n) return false; if (v===n) map.delete(k); else map.set(k, v-n); return true; }
function addTo(map, k, n=1) { map.set(k, (map.get(k)||0)+n); }

// Genera mejores opciones (grupos/escaleras) que incluyan una ficha concreta
function generateSetsIncluding(tile, poolCounts) {
  const out = [];
  // Grupos: mismo número, colores distintos, tamaño 3 o 4
  const colors = ['red','blue','black','orange'];
  const availableColors = colors.filter(c => (poolCounts.get(`${c}-${tile.num}`) || 0) > 0);
  // asegurar que incluye el color de la ficha
  if (availableColors.includes(tile.color)) {
    const rest = availableColors.filter(c => c !== tile.color);
    for (let sz of [4,3]) {
      if (availableColors.length >= sz) {
        // generar TODAS las combinaciones posibles que incluyan tile.color
        const choose = combinations(rest, sz-1);
        for (const combo of choose) {
          const chosen = [tile.color, ...combo];
          out.push({ type:'group', number: tile.num, tiles: chosen.map(c => ({kind:'num', color:c, num:tile.num})) });
        }
      }
    }
  }
  // Escaleras: mismo color, números consecutivos >=3 y contengan tile.num
  const color = tile.color; const nums = [];
  for (let n=1;n<=13;n++) if ((poolCounts.get(`${color}-${n}`)||0)>0) nums.push(n);
  // encontrar secuencias consecutivas que contengan tile.num
  if (nums.length>=3) {
    // construir set del color
    const setNums = new Set(nums);
    // expandir hacia abajo y arriba desde tile.num
    let L = tile.num; let R = tile.num;
    while (setNums.has(L-1)) L--; while (setNums.has(R+1)) R++;
    // dentro de [L..R], probamos todas las subsec que contengan tile.num y len>=3
    for (let a=L; a<=tile.num; a++) {
      for (let b=tile.num; b<=R; b++) {
        const len = b-a+1; if (len>=3) {
          // comprobar que todos existen
          let ok=true; for (let x=a;x<=b;x++){ if(!setNums.has(x)){ok=false;break;} }
          if (ok) {
            out.push({ type:'run', color, tiles: Array.from({length:len},(_,i)=>({kind:'num',color, num:a+i})) });
          }
        }
      }
    }
  }
  return dedupSets(out);
}

// combinaciones de tamaño k a partir de arr (sin repetición)
function combinations(arr, k) {
  const res = [];
  function backtrack(start, path) {
    if (path.length === k) { res.push([...path]); return; }
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      backtrack(i+1, path);
      path.pop();
    }
  }
  if (k === 0) return [[]];
  if (k < 0 || k > arr.length) return [];
  backtrack(0, []);
  return res;
}

function dedupSets(sets) {
  const seen = new Set(); const out = [];
  for (const s of sets) {
    const k = s.type==='group'? `g:${s.number}:${s.tiles.map(t=>t.color).sort().join(',')}` : `r:${s.color}:${s.tiles[0].num}-${s.tiles[s.tiles.length-1].num}`;
    if (!seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out;
}

function canTakeSetFromPool(set, poolCounts) {
  const need = new Map();
  for (const t of set.tiles) addTo(need, keyOf(t), 1);
  for (const [k,v] of need) { if ((poolCounts.get(k)||0) < v) return false; }
  return true;
}

function applySetToPoolAndRequired(set, poolCounts, requiredCounts) {
  let usedFromHand = 0;
  for (const t of set.tiles) {
    const k = keyOf(t);
    // consumir del pool
    takeFrom(poolCounts, k, 1);
    // si la mesa requería esta ficha, cúbrela; si no, era de mano
    if ((requiredCounts.get(k)||0) > 0) {
      takeFrom(requiredCounts, k, 1);
    } else {
      usedFromHand++;
    }
  }
  return usedFromHand;
}

function cloneCounts(m) { const n=new Map(); for (const [k,v] of m) n.set(k,v); return n; }
function sumCounts(m) { let s=0; for (const v of m.values()) s+=v; return s; }
function setsTileCount(sets){ let s=0; for(const st of sets) s+=st.tiles.length; return s; }

function pickNextRequired(requiredCounts, pool) {
  // Elegimos la ficha requerida cuyo MEJOR set potencial maximiza el uso de mano, y luego preferimos grupos y escaleras cortas.
  let bestTile = null; let bestScore = -Infinity;
  for (const [k,v] of requiredCounts) {
    if (v <= 0) continue;
    const [color, numStr] = k.split('-'); const num = Number(numStr);
    const tile = { kind:'num', color, num };
    const options = generateSetsIncluding(tile, pool).filter(s => canTakeSetFromPool(s, pool));
    if (options.length === 0) continue;
    // puntuar por la mejor opción disponible para este tile
    let localBest = -Infinity;
    for (const s of options) {
      const pool2 = cloneCounts(pool); const req2 = cloneCounts(requiredCounts);
      const used = applySetToPoolAndRequired(s, pool2, req2);
      const sc = used*1000 + (s.type==='group'?50:0) + (s.type==='run'?-s.tiles.length:0);
      if (sc > localBest) localBest = sc;
    }
    if (localBest > bestScore) { bestScore = localBest; bestTile = { color, num }; }
  }
  return bestTile;
}

function solveGreedyWithoutJokers(boardTiles, handTiles) {
  const required = countTiles(boardTiles);
  const pool = countTiles([...boardTiles, ...handTiles]);
  const sets = [];
  let usedFromHand = 0;

  // cubrir toda la mesa
  while (true) {
    const next = pickNextRequired(required, pool);
    if (!next) {
      // si aún quedan fichas requeridas, no es posible cubrir la mesa
      for (const [,v] of required) { if (v>0) return { coversAllBoard:false }; }
      break; // cubierto todo
    }
    // generar opciones que incluyan esta ficha
    const tile = { kind:'num', color: next.color, num: next.num };
    const options = generateSetsIncluding(tile, pool).filter(s => canTakeSetFromPool(s, pool));
    if (options.length === 0) {
      return { coversAllBoard:false };
    }
    // elegir la opción según la nueva heurística (mano >> grupo >> escalera corta)
    let best = null; let bestScore = -Infinity;
    for (const s of options) {
      // simular
      const pool2 = cloneCounts(pool); const req2 = cloneCounts(required);
      const used = applySetToPoolAndRequired(s, pool2, req2);
      const score = used*1000 + (s.type==='group'?50:0) + (s.type==='run'?-s.tiles.length:0);
      if (score > bestScore) { bestScore = score; best = { s, pool2, req2, used }; }
    }
    // aplicar la mejor
    sets.push(best.s); pool.clear(); for (const [k,v] of best.pool2) pool.set(k,v);
    required.clear(); for (const [k,v] of best.req2) required.set(k,v);
    usedFromHand += best.used;
  }

  // segunda fase: intenta usar más fichas de mano en nuevos sets
  // estrategia simple: para cada color, todas las escaleras posibles; para cada número, grupos
  let progress = true;
  while (progress) {
    progress = false;
    let best = null; let bestScore = -1;
    // grupos
    for (let n=1;n<=13;n++) {
      const cols = ['red','blue','black','orange'].filter(c => (pool.get(`${c}-${n}`)||0)>0);
      for (let sz of [4,3]) if (cols.length>=sz) {
        const chosen = cols.slice(0, sz);
        const set = { type:'group', number:n, tiles: chosen.map(c=>({kind:'num', color:c, num:n})) };
        if (!canTakeSetFromPool(set, pool)) continue;
        // cuántas son de mano (todas, porque required ya está a cero para esas claves)
        const used = set.tiles.length;
        const score = used * 100 + set.tiles.length;
        if (score>bestScore){ bestScore=score; best={set, used}; }
      }
    }
    // escaleras
    for (const color of ['red','blue','black','orange']) {
      const present = []; for (let n=1;n<=13;n++) if ((pool.get(`${color}-${n}`)||0)>0) present.push(n);
      const setNums = new Set(present);
      // buscar máximas consecutivas
      for (let i=0;i<present.length;i++){
        let a = present[i]; let b = a;
        while (setNums.has(b+1)) b++;
        for (let start=a; start<=b; start++) {
          for (let end=start+2; end<=b; end++) {
            const tiles = []; for (let x=start;x<=end;x++) tiles.push({kind:'num', color, num:x});
            const set = { type:'run', color, tiles };
            if (!canTakeSetFromPool(set, pool)) continue;
            const used = set.tiles.length;
            const score = used * 100 + set.tiles.length;
            if (score>bestScore){ bestScore=score; best={set, used}; }
          }
        }
        i = present.indexOf(b);
      }
    }
    if (best) {
      // aplicar
      applySetToPoolAndRequired(best.set, pool, new Map()); // required vacío
      sets.push(best.set); usedFromHand += best.used; progress = true;
    }
  }

  // tercera fase: extender escaleras existentes con fichas sobrantes de la mano
  usedFromHand += extendRunsWithHandTiles(sets, pool);

  return { coversAllBoard:true, sets, usedFromHand };
}

// Disponer los sets en la mesa con un hueco vacío entre cada set
function layoutSetsOnBoard(sets) {
  const newBoard = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  let r = 0, c = 0, truncated = false;
  const place = (tileOrNull) => {
    if (r >= BOARD_ROWS) { truncated = true; return false; }
    // Preservar el tipo de ficha (num o joker) para poder mostrar ★
    newBoard[r][c] = tileOrNull ? JSON.parse(JSON.stringify(tileOrNull)) : null;
    c++;
    if (c >= BOARD_COLS) { r++; c = 0; }
    return true;
  };
  const ensureFitsOnRow = (lenWithSep) => {
    // Si el set (más su posible separador) no cabe en la fila actual, saltamos a la siguiente
    if (c + lenWithSep > BOARD_COLS) { r++; c = 0; }
    if (r >= BOARD_ROWS) { truncated = true; return false; }
    return true;
  };
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const setLen = s.tiles.length;
    const needSep = (i < sets.length - 1) ? 1 : 0;
    const totalNeeded = setLen + needSep;
    if (!ensureFitsOnRow(totalNeeded)) break;
    // colocar el set completo en la misma fila
    for (const t of s.tiles) { if (!place(t)) break; }
    // separador si cabe aún en la misma fila
    if (needSep && c < BOARD_COLS) { place(null); }
    if (r >= BOARD_ROWS) { truncated = true; break; }
  }
  return { board: newBoard, truncated };
}

// Greedy: extra sets para consumir el máximo de pool (sin requeridos)
function greedySetsFromPool(poolIn) {
  const pool = cloneCounts(poolIn);
  const sets = [];
  let progress = true;
  while (progress) {
    progress = false;
    let best = null; let bestScore = -Infinity;
    // grupos
    for (let n=1;n<=13;n++) {
      const cols = ['red','blue','black','orange'].filter(c => (pool.get(`${c}-${n}`)||0)>0);
      for (let sz of [4,3]) if (cols.length>=sz) {
        const chosen = cols.slice(0, sz);
        const set = { type:'group', number:n, tiles: chosen.map(c=>({kind:'num', color:c, num:n})) };
        if (!canTakeSetFromPool(set, pool)) continue;
        const score = set.tiles.length*1000 + 50;
        if (score>bestScore){ bestScore=score; best={set}; }
      }
    }
    // escaleras
    for (const color of ['red','blue','black','orange']) {
      const present = []; for (let n=1;n<=13;n++) if ((pool.get(`${color}-${n}`)||0)>0) present.push(n);
      const setNums = new Set(present);
      for (let i=0;i<present.length;i++){
        let a = present[i]; let b = a; while (setNums.has(b+1)) b++;
        for (let start=a; start<=b; start++) {
          for (let end=start+2; end<=b; end++) {
            const tiles = []; for (let x=start;x<=end;x++) tiles.push({kind:'num', color, num:x});
            const set = { type:'run', color, tiles };
            if (!canTakeSetFromPool(set, pool)) continue;
            const score = set.tiles.length*1000 - set.tiles.length;
            if (score>bestScore){ bestScore=score; best={set}; }
          }
        }
        i = present.indexOf(b);
      }
    }
    if (best) {
      applySetToPoolAndRequired(best.set, pool, new Map());
      sets.push(best.set); progress = true;
    }
  }
  // También intentar extensión con mano
  extendRunsWithHandTiles(sets, pool);
  return {sets, pool};
}

function computeUsedCountsFromSets(sets) {
  const need = new Map();
  for (const s of sets) for (const t of s.tiles) if (t.kind==='num') addTo(need, keyOf(t), 1);
  return need;
}

function placeSetsAppendToBoard(sets) {
  let r=0, c=0;
  const step = () => {
    while (r < BOARD_ROWS && boardState[r][c] !== null) {
      c++; if (c>=BOARD_COLS){ r++; c=0; }
    }
    return r < BOARD_ROWS;
  };
  for (let i=0;i<sets.length;i++){
    const s = sets[i];
    for (const t of s.tiles){
      if (!step()) return; // sin espacio
      boardState[r][c] = { kind:'num', color:t.color, num:t.num };
      // avanzar
      c++; if (c>=BOARD_COLS){ r++; c=0; }
    }
    // separador
    if (i < sets.length-1){
      if (!step()) return;
      // dejar hueco
      c++; if (c>=BOARD_COLS){ r++; c=0; }
    }
  }
}

// Extiende escaleras ya formadas si hay fichas contiguas disponibles en la mano
function extendRunsWithHandTiles(sets, pool) {
  let used = 0;
  for (const s of sets) {
    if (s.type !== 'run') continue;
    // intenta extender por la izquierda y derecha repetidamente
    let extended = true;
    while (extended) {
      extended = false;
      const start = s.tiles[0].num;
      const end = s.tiles[s.tiles.length - 1].num;
      const color = s.color;
      // izquierda
      const leftKey = `${color}-${start-1}`;
      if (start > 1 && (pool.get(leftKey) || 0) > 0) {
        takeFrom(pool, leftKey, 1);
        s.tiles.unshift({ kind:'num', color, num: start-1 });
        used++; extended = true;
      }
      // derecha
      const rightKey = `${color}-${end+1}`;
      if ((pool.get(rightKey) || 0) > 0) {
        takeFrom(pool, rightKey, 1);
        s.tiles.push({ kind:'num', color, num: end+1 });
        used++; extended = true;
      }
    }
  }
  return used;
}

// ---------------- Guardar / Cargar posición (en memoria) ----------------
let savedPosition = null;
function savePosition() {
  savedPosition = JSON.parse(JSON.stringify({ board: boardState, hand: handState }));
}
function loadPosition() {
  if (!savedPosition) return;
  boardState = JSON.parse(JSON.stringify(savedPosition.board));
  handState = JSON.parse(JSON.stringify(savedPosition.hand));
  renderAll();
}

// ---------------- Óptimo global sin comodines (backtracking + poda) ----------------
function solveOptimalWithoutJokers(boardTiles, handTiles) {
  const required0 = countTiles(boardTiles);
  const pool0 = countTiles([...boardTiles, ...handTiles]);
  let bestPlaced = -1;
  let bestSets = null;

  function MRVTile(required, pool) {
    let best = null; let bestOptions = Infinity;
    for (const [k,v] of required) {
      if (v<=0) continue;
      const [color, numStr] = k.split('-'); const num = Number(numStr);
      const options = generateSetsIncluding({kind:'num', color, num}, pool).filter(s=>canTakeSetFromPool(s,pool));
      if (options.length === 0) return {tile:{color,num}, options:[]};
      if (options.length < bestOptions) { bestOptions = options.length; best = {tile:{color,num}, options}; }
    }
    return best;
  }

  function backtrack(required, pool, chosen, placedSoFar) {
    // poda por cota superior (optimista: usar todo lo que queda en pool)
    const upper = placedSoFar + sumCounts(pool);
    if (upper <= bestPlaced) return;

    // si ya cubrimos la mesa, maximiza usando greedy sobre lo que queda
    let allCovered = true; for (const v of required.values()) if (v>0){ allCovered=false; break; }
    if (allCovered) {
      const {sets: extraSets} = greedySetsFromPool(pool);
      const totalPlaced = placedSoFar + setsTileCount(extraSets);
      if (totalPlaced > bestPlaced) { bestPlaced = totalPlaced; bestSets = [...chosen, ...extraSets]; }
      return;
    }

    const pick = MRVTile(required, pool);
    if (!pick || pick.options.length === 0) return; // sin salida

    // ordenar opciones: grupos primero y más grandes; luego escaleras más cortas
    const options = pick.options.slice().sort((a,b)=>{
      const sa = (a.type==='group'?100:0) - (a.type==='run'?a.tiles.length:0);
      const sb = (b.type==='group'?100:0) - (b.type==='run'?b.tiles.length:0);
      return sb - sa;
    });
    for (const s of options) {
      const pool2 = cloneCounts(pool); const req2 = cloneCounts(required);
      applySetToPoolAndRequired(s, pool2, req2);
      backtrack(req2, pool2, [...chosen, s], placedSoFar + s.tiles.length);
    }
  }

  backtrack(required0, pool0, [], 0);
  if (!bestSets) return { coversAllBoard:false };
  // calcular usedFromHand luego en handleSolve por diferencia
  return { coversAllBoard:true, sets: bestSets, usedFromHand: 0 };
}
// Calcula las fichas de mano usadas: total de fichas en sets menos las de la mesa
function computeUsedFromHandCounts(sets, boardTiles) {
  const need = new Map();
  for (const s of sets) {
    for (const t of s.tiles) { if (t.kind === 'num') addTo(need, keyOf(t), 1); }
  }
  // restar fichas de la mesa
  for (const tb of boardTiles) {
    if (tb.kind !== 'num') continue;
    const k = keyOf(tb);
    const v = need.get(k) || 0;
    if (v > 0) {
      if (v === 1) need.delete(k); else need.set(k, v - 1);
    }
  }
  return need; // mapa de claves color-num -> cantidad a quitar de la mano
}

// Quita de handState las fichas indicadas por usedMap
function removeTilesFromHand(usedMap) {
  if (!usedMap || usedMap.size === 0) return;
  for (let i = 0; i < handState.length; i++) {
    const t = handState[i];
    if (!t || t.kind !== 'num') continue;
    const k = keyOf(t);
    const v = usedMap.get(k) || 0;
    if (v > 0) {
      handState[i] = null;
      if (v === 1) usedMap.delete(k); else usedMap.set(k, v - 1);
      if (usedMap.size === 0) break;
    }
  }
}

// ---------------- Solver integrado con comodines (0,1,2) ----------------
function countJokers(arr) { return arr.reduce((s,t)=>s+(t.kind==='joker'?1:0),0); }

function canTakeSetFromPoolAndJokers(set, poolCounts, poolJokers) {
  const need = new Map(); let needJ = 0;
  for (const t of set.tiles) {
    if (t.kind === 'joker') { needJ++; continue; }
    addTo(need, keyOf(t), 1);
  }
  for (const [k,v] of need) { if ((poolCounts.get(k)||0) < v) return false; }
  if (needJ > poolJokers) return false;
  return true;
}

function applySetToPoolAndRequiredJokers(set, poolCounts, poolJokers, requiredCounts, requiredJokers) {
  let usedFromHandNumeric = 0;
  let usedJokersFromBoard = 0;
  for (const t of set.tiles) {
    if (t.kind === 'joker') {
      // usar 1 comodín del pool
      poolJokers -= 1;
      // si la mesa requería comodines, cúbrelo
      if (requiredJokers > 0) { requiredJokers -= 1; usedJokersFromBoard += 1; }
    } else {
      const k = keyOf(t);
      takeFrom(poolCounts, k, 1);
      if ((requiredCounts.get(k)||0) > 0) {
        takeFrom(requiredCounts, k, 1);
      } else {
        usedFromHandNumeric++;
      }
    }
  }
  return { poolJokers, requiredJokers, usedFromHandNumeric, usedJokersFromBoard };
}

// Función heurística: dado poolCounts de fichas numéricas, retorna los números "cercanos"
// que son candidatos razonables para sustituir comodines (±2 de cualquier número presente)
function computeHeuristicJokerCandidates(poolCounts) {
  const nums = new Set();
  for (const [k, v] of poolCounts) {
    if (v <= 0) continue;
    const [_, numStr] = k.split('-');
    const n = Number(numStr);
    // Añadir n y vecinos ±2
    for (let d = -2; d <= 2; d++) {
      const cand = n + d;
      if (cand >= 1 && cand <= 13) nums.add(cand);
    }
  }
  return nums;
}

function generateSetsIncludingWithJokers(tile, poolCounts, poolJokers, heuristicNums = null) {
  const out = [];
  // Debe existir al menos 1 copia numérica de la ficha requerida en el pool
  const reqKey = keyOf(tile);
  if ((poolCounts.get(reqKey)||0) <= 0) return out;

  // Grupos
  const colors = ['red','blue','black','orange'];
  const rest = colors.filter(c => c !== tile.color);
  for (const sz of [4,3]) {
    const combos = combinations(rest, sz-1);
    for (const comb of combos) {
      const chosen = [tile.color, ...comb];
      let needJ = 0; const tiles = [];
      // incluir la requerida como numérica obligatoria
      tiles.push({kind:'num', color: tile.color, num: tile.num});
      for (const c of comb) {
        const k = `${c}-${tile.num}`;
        if ((poolCounts.get(k)||0) > 0) tiles.push({kind:'num', color:c, num:tile.num});
        else { tiles.push({kind:'joker'}); needJ++; }
      }
      if (needJ <= poolJokers) out.push({ type:'group', number: tile.num, tiles, needJ });
    }
  }

  // Escaleras
  const color = tile.color;
  for (let a=1; a<=tile.num; a++) {
    for (let b=tile.num; b<=13; b++) {
      const len = b-a+1; if (len < 3) continue;
      // exige que la requerida esté presente numéricamente
      if ((poolCounts.get(`${color}-${tile.num}`)||0) <= 0) continue;
      let needJ = 0; const tiles = [];
      let validRun = true;
      for (let x=a; x<=b; x++) {
        if (x === tile.num) { tiles.push({kind:'num', color, num:x}); continue; }
        const k = `${color}-${x}`;
        if ((poolCounts.get(k)||0) > 0) {
          tiles.push({kind:'num', color, num:x});
        } else {
          // Si hay heurística, solo permitir comodines en números candidatos
          if (heuristicNums && !heuristicNums.has(x)) {
            validRun = false; break;
          }
          tiles.push({kind:'joker'}); needJ++;
        }
      }
      if (validRun && needJ <= poolJokers) out.push({ type:'run', color, tiles, needJ });
    }
  }

  return dedupSetsWithJokers(out);
}

function generateSetsUsingAtLeastOneJoker(poolCounts, poolJokers, heuristicNums = null) {
  const out = [];
  if (poolJokers <= 0) return out;
  // Grupos: para cada número, colores 3 o 4
  for (let n=1; n<=13; n++) {
    // Si hay heurística, solo considerar números candidatos
    if (heuristicNums && !heuristicNums.has(n)) continue;
    const colors = ['red','blue','black','orange'];
    for (const sz of [4,3]) {
      const colorCombos = combinations(colors, sz);
      for (const comb of colorCombos) {
        let needJ = 0; const tiles = [];
        for (const c of comb) {
          const k = `${c}-${n}`;
          if ((poolCounts.get(k)||0) > 0) tiles.push({kind:'num', color:c, num:n});
          else { tiles.push({kind:'joker'}); needJ++; }
        }
        if (needJ >= 1 && needJ <= poolJokers) out.push({ type:'group', number:n, tiles, needJ });
      }
    }
  }
  // Escaleras: intervalos por color
  for (const color of ['red','blue','black','orange']) {
    for (let a=1; a<=13; a++) {
      for (let b=a+2; b<=13; b++) {
        let needJ = 0; const tiles = [];
        let validRun = true;
        for (let x=a; x<=b; x++) {
          const k = `${color}-${x}`;
          if ((poolCounts.get(k)||0) > 0) {
            tiles.push({kind:'num', color, num:x});
          } else {
            // Si hay heurística, solo permitir comodines en números candidatos
            if (heuristicNums && !heuristicNums.has(x)) {
              validRun = false; break;
            }
            tiles.push({kind:'joker'}); needJ++;
          }
        }
        if (validRun && needJ >= 1 && needJ <= poolJokers) out.push({ type:'run', color, tiles, needJ });
      }
    }
  }
  return dedupSetsWithJokers(out);
}

function dedupSetsWithJokers(sets) {
  const seen = new Set(); const out = [];
  for (const s of sets) {
    let key;
    if (s.type === 'group') {
      const sig = s.tiles.map(t => t.kind==='joker'? 'J': `${t.color}-${s.number}`).sort().join('|');
      key = `g:${s.number}:${sig}`;
    } else {
      const start = s.tiles[0].kind==='num'? s.tiles[0].num : NaN; // not used in key
      const end = s.tiles[s.tiles.length-1].kind==='num'? s.tiles[s.tiles.length-1].num : NaN;
      const sig = s.tiles.map(t => t.kind==='joker'? 'J': `${s.color}-${t.num}`).join('|');
      key = `r:${s.color}:${sig}`;
    }
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  }
  return out;
}

function pickNextRequirement(requiredCounts, requiredJokers, poolCounts, poolJokers, heuristicNums = null) {
  let best = null; let bestOptions = Infinity; let bestKind = 'num';
  // numéricos
  for (const [k,v] of requiredCounts) {
    if (v<=0) continue;
    const [color, numStr] = k.split('-'); const num = Number(numStr);
    const opts = generateSetsIncludingWithJokers({kind:'num', color, num}, poolCounts, poolJokers, heuristicNums)
                  .filter(s=>canTakeSetFromPoolAndJokers(s, poolCounts, poolJokers));
    if (opts.length === 0) return { kind:'num', key:k, options:[] };
    if (opts.length < bestOptions) { bestOptions = opts.length; best = { kind:'num', key:k, options: opts }; }
  }
  // comodines requeridos en mesa
  if (requiredJokers > 0) {
    const optsJ = generateSetsUsingAtLeastOneJoker(poolCounts, poolJokers, heuristicNums)
                  .filter(s=>canTakeSetFromPoolAndJokers(s, poolCounts, poolJokers));
    if (optsJ.length === 0) return { kind:'joker', key:'joker', options:[] };
    if (!best || optsJ.length < bestOptions) { best = { kind:'joker', key:'joker', options: optsJ }; bestOptions = optsJ.length; }
  }
  return best;
}

function solveOptimalWithJokers(boardTiles, handTiles, useHandJokers = true, timeLimitSec = 30) {
  const boardNums = boardTiles.filter(t=>t.kind==='num');
  const boardJ = countJokers(boardTiles);
  
  // Si no queremos usar comodines de mano, filtrarlos del pool
  const effectiveHandTiles = useHandJokers ? handTiles : handTiles.filter(t => t.kind !== 'joker');
  
  const poolNums = [...boardTiles, ...effectiveHandTiles].filter(t=>t.kind==='num');
  const poolJ0 = countJokers([...boardTiles, ...effectiveHandTiles]);

  const required0 = countTiles(boardNums);
  let requiredJ0 = boardJ;
  const pool0 = countTiles(poolNums);
  
  // Decidir si usar heurística: si hay comodines Y tablero tiene >=25 fichas
  const totalBoardCount = boardTiles.length;
  const hasJokers = (poolJ0 > 0 || boardJ > 0);
  const useHeuristic = hasJokers && totalBoardCount >= 25;
  
  // Si usamos heurística, calcular números candidatos basados en fichas de mano
  const heuristicNums = useHeuristic ? computeHeuristicJokerCandidates(countTiles(effectiveHandTiles.filter(t=>t.kind==='num'))) : null;
  
  let bestPlaced = -1; let bestSets = null;
  
  // Control de tiempo
  const startTime = Date.now();
  const timeLimitMs = timeLimitSec * 1000;
  let timeoutReached = false;

  function backtrack(required, requiredJ, pool, poolJ, chosen, placedSoFar) {
    // Verificar timeout cada cierto número de llamadas (cada 100 para no penalizar rendimiento)
    if (chosen.length % 10 === 0) {
      if (Date.now() - startTime > timeLimitMs) {
        timeoutReached = true;
        return;
      }
    }
    
    // cota superior
    const upper = placedSoFar + sumCounts(pool) + poolJ;
    if (upper <= bestPlaced) return;

    let allCovered = requiredJ===0; for (const v of required.values()) if (v>0){ allCovered=false; break; }
    if (allCovered) {
      const { sets: extraSets } = greedySetsFromPoolWithJokers(pool, poolJ, heuristicNums);
      const total = placedSoFar + setsTileCount(extraSets);
      if (total > bestPlaced) { bestPlaced = total; bestSets = [...chosen, ...extraSets]; }
      return;
    }

    const pick = pickNextRequirement(required, requiredJ, pool, poolJ, heuristicNums);
    if (!pick || pick.options.length === 0) return;

    const options = pick.options.slice().sort((a,b)=>{
      // priorizar menos jokers, grupos primero, y escaleras más cortas
      const sa = (-a.needJ*100) + (a.type==='group'?50:0) - (a.type==='run'?a.tiles.length:0);
      const sb = (-b.needJ*100) + (b.type==='group'?50:0) - (b.type==='run'?b.tiles.length:0);
      return sb - sa;
    });

    for (const s of options) {
      if (timeoutReached) return; // detener exploración si se alcanzó el límite
      const pool2 = cloneCounts(pool); let reqJ2 = requiredJ; let poolJ2 = poolJ; const req2 = cloneCounts(required);
      const res = applySetToPoolAndRequiredJokers(s, pool2, poolJ2, req2, reqJ2);
      poolJ2 = res.poolJokers; reqJ2 = res.requiredJokers;
      backtrack(req2, reqJ2, pool2, poolJ2, [...chosen, s], placedSoFar + s.tiles.length);
    }
  }

  backtrack(required0, requiredJ0, pool0, poolJ0, [], 0);
  if (!bestSets) return { coversAllBoard:false };
  return { coversAllBoard:true, sets: bestSets };
}

function greedySetsFromPoolWithJokers(poolIn, poolJokersIn, heuristicNums = null) {
  const pool = cloneCounts(poolIn); let poolJ = poolJokersIn;
  const sets = [];
  let progress = true;
  while (progress) {
    progress = false; let best = null; let bestScore = -Infinity;
    // grupos
    for (let n=1; n<=13; n++) {
      // Si hay heurística, solo considerar números candidatos
      if (heuristicNums && !heuristicNums.has(n)) continue;
      const colors = ['red','blue','black','orange'];
      for (const sz of [4,3]) {
        for (const comb of combinations(colors, sz)) {
          let needJ=0; const tiles=[];
          for (const c of comb) {
            const k = `${c}-${n}`;
            if ((pool.get(k)||0)>0) tiles.push({kind:'num', color:c, num:n}); else { tiles.push({kind:'joker'}); needJ++; }
          }
          if (needJ <= poolJ) {
            const sc = tiles.length*1000 - needJ*10 + 50;
            if (sc>bestScore) best={set:{type:'group', number:n, tiles, needJ}, score:sc};
          }
        }
      }
    }
    // escaleras
    for (const color of ['red','blue','black','orange']) {
      for (let a=1; a<=13; a++) {
        for (let b=a+2; b<=13; b++) {
          let needJ=0; const tiles=[]; let validRun = true;
          for (let x=a; x<=b; x++) {
            const k = `${color}-${x}`;
            if ((pool.get(k)||0)>0) {
              tiles.push({kind:'num', color, num:x});
            } else {
              // Si hay heurística, solo permitir comodines en números candidatos
              if (heuristicNums && !heuristicNums.has(x)) {
                validRun = false; break;
              }
              tiles.push({kind:'joker'}); needJ++;
            }
          }
          if (validRun && needJ <= poolJ) {
            const sc = tiles.length*1000 - needJ*10 - tiles.length; // penaliza jokers y runs largas
            if (sc>bestScore) best={set:{type:'run', color, tiles, needJ}, score:sc};
          }
        }
      }
    }
    if (best) {
      const res = applySetToPoolAndRequiredJokers(best.set, pool, poolJ, new Map(), 0);
      poolJ = res.poolJokers; sets.push(best.set); progress = true;
    }
  }
  return { sets, pool, poolJ };
}

function computeUsedJokersFromHand(sets, boardTiles) {
  const usedInSets = sets.reduce((s,st)=>s+st.tiles.filter(t=>t.kind==='joker').length, 0);
  const boardJ = countJokers(boardTiles);
  return Math.max(0, usedInSets - boardJ);
}

function removeJokersFromHand(n) {
  if (n<=0) return;
  for (let i=0; i<handState.length && n>0; i++) {
    const t = handState[i];
    if (t && t.kind==='joker') { handState[i]=null; n--; }
  }
}
