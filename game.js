const ROWS = 5;
const COLS = 9;
const CELL_SIZE = 80;
const GRID_COLOR = "#2d5a27";
const GRID_LINE_COLOR = "rgba(0, 0, 0, 0.25)";
const GRID_WIDTH = COLS * CELL_SIZE;
const GRID_HEIGHT = ROWS * CELL_SIZE;

const SHADOW_RX = 25;
const SHADOW_RY = 8;
const FLASH_DURATION = 0.08;
const ENEMY_DPS = 10;
const ENEMY_SPEED_BASE = 40;
const ENEMY_HP_BASE = 100;
const ENEMY_SPAWN_MIN_BASE = 5;
const ENEMY_SPAWN_MAX_BASE = 8;
const PROJECTILE_SPEED = 300;
const PROJECTILE_SHADOW_RX = 6;
const PROJECTILE_SHADOW_RY = 4;

const DEFENDER_COST = 50;
const DEFENDER_HP = 200;
const DEFENDER_SHOT_INTERVAL = 2;
const DEFENDER_DAMAGE = 34;

const DEFENDER_TYPES = {
  rifleman: {
    name: "Rifleman",
    cost: 2,
    hp: 6,
    damage: 2,
    color: "#1fb03d",
    flashColor: '#ff4d4d',
  },
  shieldwall: {
    name: "Shieldwall",
    cost: 3,
    hp: 20,
    damage: 0,
    color: "#8b4513",
    flashColor: '#ff6b6b',
    blocksMovement: true,
  },
  sniper: {
    name: "Sniper",
    cost: 5,
    hp: 4,
    damage: 5,
    color: "#4169e1",
    flashColor: '#ff4d4d',
    longRange: true,
  },
  mortar: {
    name: "Mortar",
    cost: 4,
    hp: 6,
    damage: 3,
    color: "#ff6347",
    flashColor: '#ff4d4d',
    areaDamage: true,
  },
  mechanic: {
    name: "Mechanic",
    cost: 2,
    hp: 5,
    damage: 0,
    color: "#ffd700",
    flashColor: '#ff6b6b',
    heals: true,
    healAmount: 3,
  },
};

const ENEMY_TYPES = {
  basic: {
    name: "Basic",
    cost: 1,
    weight: 4000,
    hp: 2,
    damage: 1,
    color: "#d22b2b",
    headColor: null,
  },
  conehead: {
    name: "Conehead",
    cost: 2,
    weight: 1500,
    hp: 5,
    damage: 1,
    color: "#d22b2b",
    headColor: "#e8a020",
  },
  buckethead: {
    name: "Buckethead",
    cost: 4,
    weight: 500,
    hp: 10,
    damage: 2,
    color: "#d22b2b",
    headColor: "#888",
  },
};

const SUN_DROP_INTERVAL_MIN = 8;
const SUN_DROP_INTERVAL_MAX = 12;
const SUN_DROP_LIFETIME = 10;
const SUN_DROP_RADIUS = 14;
const SUN_DROP_MAX_COUNT = 3;
const SUN_DROP_VALUE = 25;
const HP_BAR_WIDTH = 44;
const HP_BAR_HEIGHT = 6;
const HP_BAR_OFFSET_Y = 10;
const HP_BAR_LERP_RATE = 8;

const HIT_FLASH_DURATION = 0.08;
const PARTICLE_COUNT = 8;
const PARTICLE_RADIUS = 3;
const PARTICLE_SPEED = 120;
const PARTICLE_LIFETIME = 0.4;
const SCREEN_SHAKE_DURATION = 0.3;
const SCREEN_SHAKE_INTENSITY = 4;

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const diceDisplay = document.getElementById("diceDisplay");
const availablePointsDisplay = document.getElementById("availablePoints");
const bankedPointsDisplay = document.getElementById("bankedPoints");
const turnDisplay = document.getElementById("turnDisplay");
const phaseDisplay = document.getElementById("phaseDisplay");
const endTurnBtn = document.getElementById("endTurnBtn");
const pauseBtn = document.getElementById("pauseBtn");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const beginBtn = document.getElementById("beginBtn");
const retryBtn = document.getElementById("retryBtn");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverMessage = document.getElementById("gameOverMessage");
const gameOverStats = document.getElementById("gameOverStats");

const restartButtonRect = {
  width: 180,
  height: 50,
  x: GRID_WIDTH / 2 - 90,
  y: GRID_HEIGHT / 2 + 24,
};

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function getCellCenter(row, col) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

const getRowGroundY = (row) => row * CELL_SIZE + CELL_SIZE * 0.75;

function getDefenderShadow(defender) {
  return { x: defender.x, y: defender.y, rx: SHADOW_RX, ry: SHADOW_RY };
}

function getEnemyShadow(enemy) {
  return { x: enemy.x, y: enemy.y, rx: SHADOW_RX, ry: SHADOW_RY };
}

function getProjectileShadow(projectile) {
  return { x: projectile.x, y: projectile.y, rx: PROJECTILE_SHADOW_RX, ry: PROJECTILE_SHADOW_RY };
}

function projectileHitsEnemyShadow(projectile, enemy) {
  const px = projectile.x;
  const py = projectile.y;
  const ox = enemy.x;
  const oy = enemy.y - 25;
  const hitRx = SHADOW_RX + projectile.radius;
  const hitRy = SHADOW_RY + projectile.radius;
  return ((px - ox) / hitRx) ** 2 + ((py - oy) / hitRy) ** 2 <= 1;
}

function projectileSegmentHitsEnemyShadow(projectile, enemy) {
  const startX = projectile.prevX ?? projectile.x;
  const startY = projectile.prevY ?? projectile.y;
  const endX = projectile.x;
  const endY = projectile.y;
  const dx = endX - startX;
  const dy = endY - startY;
  const distance = Math.hypot(dx, dy);
  const samples = Math.max(1, Math.ceil(distance / 4));

  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const testProjectile = {
      x: startX + dx * t,
      y: startY + dy * t,
      radius: projectile.radius,
    };
    if (projectileHitsEnemyShadow(testProjectile, enemy)) {
      return true;
    }
  }
  return false;
}

function shadowsOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const sumRx = a.rx + b.rx;
  const sumRy = a.ry + b.ry;
  return (dx * dx) / (sumRx * sumRx) + (dy * dy) / (sumRy * sumRy) <= 1;
}

function initialState() {
  return {
    defenders: [],
    enemies: [],
    particles: [],
    damageNumbers: [],
    placementHighlights: [],
    gameStatus: "playing",
    wave: 1,
    screenShakeTimer: 0,
    screenShakeX: 0,
    screenShakeY: 0,
    selectedDefenderType: 'rifleman',
    isPaused: false,
    // Turn-based system
    turn: 1,
    currentRoll: 0,
    bankedPoints: 0,
    availablePoints: 0,
    isPlayerTurn: true,
    diceRolled: false,
    diceRolling: false,
    diceAnimationTimer: 0,
    diceDisplayFaces: [],
    turnPhase: 'waiting', // 'waiting', 'rolling', 'placing', 'enemy'
    enemyMoveTimer: 0,
    // Wave budget system
    waveBudget: 2,
    remainingBudget: 2,
    waveSpawnQueue: [],
    waveInitialHP: 0,
    waveTurnCounter: 0,
    nextWaveReady: false,
    // Game states
    showStartScreen: true,
    totalEnemiesDefeated: 0,
    maxWaveReached: 1,
  };
}

const state = initialState();
let lastTime = 0;

function resetGame() {
  Object.assign(state, initialState());
  startScreen.style.display = 'flex';
  gameOverScreen.style.display = 'none';
}

function beginGame() {
  state.showStartScreen = false;
  startScreen.style.display = 'none';
  startWave(1);
  startTurn();
}

function showGameOver(isVictory) {
  state.gameStatus = isVictory ? 'win' : 'gameOver';
  gameOverScreen.style.display = 'flex';
  
  if (isVictory) {
    gameOverTitle.textContent = 'Victory';
    gameOverTitle.className = 'game-over-title victory';
    gameOverMessage.textContent = 'The line held.';
    gameOverStats.textContent = `Survived ${state.turn} turns • Defeated ${state.totalEnemiesDefeated} enemies`;
  } else {
    gameOverTitle.textContent = 'Defeated';
    gameOverTitle.className = 'game-over-title defeated';
    gameOverMessage.textContent = 'The line did not hold.';
    gameOverStats.textContent = `Fell on Wave ${state.wave}`;
  }
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function startDiceRoll() {
  state.diceRolling = true;
  state.diceAnimationTimer = 0;
  state.diceDisplayFaces = [];
  for (let i = 0; i < 3; i++) {
    state.diceDisplayFaces.push(rollDice());
  }
}

function updateDiceAnimation(dt) {
  if (!state.diceRolling) return;
  
  state.diceAnimationTimer += dt;
  
  // Show animation faces
  const faceIndex = Math.floor(state.diceAnimationTimer * 10) % 3;
  diceDisplay.textContent = DICE_FACES[state.diceDisplayFaces[faceIndex] - 1];
  diceDisplay.classList.add('rolling');
  
  // End animation after 1 second
  if (state.diceAnimationTimer >= 1) {
    state.diceRolling = false;
    state.diceRolled = true;
    diceDisplay.classList.remove('rolling');
    state.currentRoll = rollDice();
    diceDisplay.textContent = DICE_FACES[state.currentRoll - 1];
    
    // Calculate available points with banking
    const totalPoints = state.currentRoll + state.bankedPoints;
    state.bankedPoints = Math.min(10, totalPoints - Math.min(...Object.values(DEFENDER_TYPES).map(d => d.cost)));
    state.availablePoints = totalPoints - state.bankedPoints;
    
    state.turnPhase = 'placing';
    updateTurnUI();
  }
}

function startTurn() {
  state.turnPhase = 'waiting';
  state.diceRolled = false;
  state.availablePoints = 0;
  updateTurnUI();
}

function handleDiceClick() {
  if (state.turnPhase === 'waiting' && !state.diceRolled) {
    state.turnPhase = 'rolling';
    startDiceRoll();
  }
}

function endTurn() {
  // Bank remaining points
  state.bankedPoints = Math.min(10, state.bankedPoints + state.availablePoints);
  state.availablePoints = 0;
  
  // Start enemy phase
  state.turnPhase = 'enemy';
  state.enemyMoveTimer = 0.5; // Delay before enemy movement
  updateTurnUI();
}

function addDamageNumber(x, y, damage, color = '#ff0000') {
  state.damageNumbers.push({
    x,
    y,
    damage,
    color,
    timer: 1.0,
    velocity: -30
  });
}

function resolveCombat() {
  const combatLog = [];
  
  // Step 2: Adjacent combat
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    
    const overlappingDefender = findOverlappingDefender(enemy);
    if (overlappingDefender && overlappingDefender.hp > 0) {
      const defenderType = DEFENDER_TYPES[overlappingDefender.type];
      const enemyType = ENEMY_TYPES[enemy.type];
      
      // Defender deals damage to enemy
      if (defenderType.damage > 0) {
        enemy.hp -= defenderType.damage;
        addDamageNumber(enemy.x, enemy.y - 20, defenderType.damage, '#00ff00');
        combatLog.push(`${overlappingDefender.type} deals ${defenderType.damage} to ${enemy.type}`);
      }
      
      // Enemy deals damage to defender
      if (enemy.hp > 0) {
        overlappingDefender.hp -= enemyType.damage;
        addDamageNumber(overlappingDefender.x, overlappingDefender.y - 20, enemyType.damage, '#ff0000');
        combatLog.push(`${enemy.type} deals ${enemyType.damage} to ${overlappingDefender.type}`);
      }
    }
  }
  
  // Step 3: Snipers fire at furthest enemy in lane
  for (const defender of state.defenders) {
    if (defender.hp <= 0) continue;
    
    const defenderType = DEFENDER_TYPES[defender.type];
    if (defenderType.longRange) {
      const enemiesInLane = state.enemies.filter(e => e.hp > 0 && e.row === defender.row);
      if (enemiesInLane.length > 0) {
        const furthestEnemy = enemiesInLane.reduce((furthest, enemy) => 
          enemy.x > furthest.x ? enemy : furthest
        );
        furthestEnemy.hp -= defenderType.damage;
        addDamageNumber(furthestEnemy.x, furthestEnemy.y - 20, defenderType.damage, '#00ff00');
        combatLog.push(`Sniper hits furthest enemy for ${defenderType.damage}`);
      }
    }
  }
  
  // Step 4: Mortars deal area damage
  for (const defender of state.defenders) {
    if (defender.hp <= 0) continue;
    
    const defenderType = DEFENDER_TYPES[defender.type];
    if (defenderType.areaDamage) {
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0) continue;
        
        const distance = Math.abs(enemy.x - defender.x) + Math.abs(enemy.row - defender.row);
        if (distance <= 1) { // 1 tile radius including diagonals
          enemy.hp -= defenderType.damage;
          addDamageNumber(enemy.x, enemy.y - 20, defenderType.damage, '#ff8800');
          combatLog.push(`Mortar hits enemy for ${defenderType.damage}`);
        }
      }
    }
  }
  
  // Step 5: Mechanics heal adjacent defenders
  for (const defender of state.defenders) {
    if (defender.hp <= 0) continue;
    
    const defenderType = DEFENDER_TYPES[defender.type];
    if (defenderType.heals) {
      for (const otherDefender of state.defenders) {
        if (otherDefender.hp <= 0 || otherDefender === defender) continue;
        
        const distance = Math.abs(otherDefender.x - defender.x) + Math.abs(otherDefender.row - defender.row);
        if (distance <= 1) { // Adjacent including diagonals
          const maxHP = DEFENDER_TYPES[otherDefender.type].hp;
          const healAmount = Math.min(defenderType.healAmount, maxHP - otherDefender.hp);
          if (healAmount > 0) {
            otherDefender.hp += healAmount;
            addDamageNumber(otherDefender.x, otherDefender.y - 20, healAmount, '#00ffff');
            combatLog.push(`Mechanic heals ${otherDefender.type} for ${healAmount}`);
          }
        }
      }
    }
  }
  
  // Remove dead units and track defeats
  const initialEnemyCount = state.enemies.length;
  state.enemies = state.enemies.filter(e => e.hp > 0);
  state.defenders = state.defenders.filter(d => d.hp > 0);
  
  // Track defeated enemies
  const enemiesDefeated = initialEnemyCount - state.enemies.length;
  state.totalEnemiesDefeated += enemiesDefeated;
}

function advanceEnemies() {
  // Handle wave spawning (one enemy per turn)
  if (state.waveSpawnQueue.length > 0) {
    const enemyType = state.waveSpawnQueue.shift();
    const row = Math.floor(Math.random() * ROWS);
    const y = getRowGroundY(row);
    const typeConfig = ENEMY_TYPES[enemyType];
    
    const newEnemy = {
      type: enemyType,
      row,
      x: GRID_WIDTH - CELL_SIZE, // Rightmost tile
      y,
      hp: typeConfig.hp,
      maxHp: typeConfig.hp,
      damage: typeConfig.damage,
      flashTimer: 0,
      hasTakenDamage: false,
    };
    state.enemies.push(newEnemy);
    state.waveInitialHP += typeConfig.hp;
  }
  
  // Move enemies one tile left
  for (const enemy of state.enemies) {
    if (enemy.hp > 0) {
      enemy.x -= CELL_SIZE;
      
      // Check if enemy reached left edge
      if (enemy.x < 0) {
        showGameOver(false);
        return;
      }
    }
  }
  
  // Resolve combat after movement
  resolveCombat();
  
  // Check wave completion triggers
  state.waveTurnCounter++;
  const currentTotalHP = state.enemies.reduce((sum, e) => sum + e.hp, 0);
  
  // HP trigger: 50% of initial HP
  if (!state.nextWaveReady && currentTotalHP <= state.waveInitialHP * 0.5) {
    state.nextWaveReady = true;
  }
  
  // Timer trigger: 8 turns
  if (!state.nextWaveReady && state.waveTurnCounter >= 8) {
    state.nextWaveReady = true;
  }
  
  // Start next wave if ready and current queue is empty (max 5 waves)
  if (state.nextWaveReady && state.waveSpawnQueue.length === 0 && state.wave < 5) {
    state.wave++;
    startWave(state.wave);
  }
  
  // Check win condition: all waves complete and no enemies left
  if (state.wave >= 5 && state.waveSpawnQueue.length === 0 && state.enemies.length === 0) {
    showGameOver(true);
  }
  
  // Start next turn
  state.turn++;
  startTurn();
}

function getWaveBudget(waveNumber) {
  const fixedWaveBudgets = {
    1: 2,   // Wave 1: 2 points
    2: 4,   // Wave 2: 4 points
    3: 7,   // Wave 3: 7 points
    4: 11,  // Wave 4: 11 points
    5: 16   // Wave 5: 16 points (final wave)
  };
  
  return fixedWaveBudgets[waveNumber] || 0;
}

function generateWaveSpawnQueue(waveNumber) {
  const budget = getWaveBudget(waveNumber);
  const queue = [];
  let remaining = budget;

  while (remaining > 0) {
    const affordable = Object.entries(ENEMY_TYPES)
      .filter(([key, e]) => e.cost <= remaining);
    if (affordable.length === 0) break;

    // Weighted random pick
    const totalWeight = affordable.reduce((sum, [k, e]) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const [key, e] of affordable) {
      roll -= e.weight;
      if (roll <= 0) {
        queue.push(key);
        remaining -= e.cost;
        break;
      }
    }
  }
  return queue;
}

function startWave(waveNumber) {
  state.waveBudget = getWaveBudget(waveNumber);
  state.remainingBudget = state.waveBudget;
  state.waveSpawnQueue = generateWaveSpawnQueue(waveNumber);
  state.waveInitialHP = 0;
  state.waveTurnCounter = 0;
  state.nextWaveReady = false;
  
  // Spawn first enemy immediately
  if (state.waveSpawnQueue.length > 0) {
    const enemyType = state.waveSpawnQueue.shift();
    const row = Math.floor(Math.random() * ROWS);
    const y = getRowGroundY(row);
    const typeConfig = ENEMY_TYPES[enemyType];
    
    const newEnemy = {
      type: enemyType,
      row,
      x: GRID_WIDTH - CELL_SIZE, // Rightmost tile
      y,
      hp: typeConfig.hp,
      maxHp: typeConfig.hp,
      damage: typeConfig.damage,
      flashTimer: 0,
      hasTakenDamage: false,
    };
    state.enemies.push(newEnemy);
    state.waveInitialHP += typeConfig.hp;
  }
}

function updateTurnUI() {
  availablePointsDisplay.textContent = state.availablePoints;
  bankedPointsDisplay.textContent = state.bankedPoints;
  turnDisplay.textContent = `Turn ${state.turn} | Wave ${state.wave}`;
  
  const phaseText = {
    'waiting': 'Click die to roll',
    'rolling': 'Rolling...',
    'placing': 'Place units',
    'enemy': 'Enemy phase'
  };
  phaseDisplay.textContent = phaseText[state.turnPhase];
  
  // Update dice display
  if (state.turnPhase === 'waiting') {
    diceDisplay.textContent = '?';
    diceDisplay.style.cursor = 'pointer';
    diceDisplay.classList.remove('rolling');
  } else {
    diceDisplay.style.cursor = 'default';
  }
  
  // Enable/disable end turn button
  endTurnBtn.disabled = state.turnPhase !== 'placing';
}

function updateDefenderSelectionUI() {
  const cards = document.querySelectorAll('.defender-card');
  cards.forEach(card => {
    const type = card.dataset.type;
    const defenderType = DEFENDER_TYPES[type];
    const overlay = card.querySelector('.card-overlay');
    
    card.classList.remove('selected', 'disabled');
    
    if (state.selectedDefenderType === type) {
      card.classList.add('selected');
    }
    
    const canAfford = state.availablePoints >= defenderType.cost && state.turnPhase === 'placing' && state.diceRolled;
    
    if (!canAfford) {
      card.classList.add('disabled');
      overlay.style.display = 'flex';
      overlay.textContent = '🔒';
      // Make cost text red
      const costElement = card.querySelector('.card-cost');
      costElement.style.color = '#ff4444';
    } else {
      overlay.style.display = 'none';
      // Reset cost text color
      const costElement = card.querySelector('.card-cost');
      costElement.style.color = '#ffd700';
    }
  });
}

function getWeightsForWave(waveNumber) {
  if (waveNumber === 1) {
    return { basic: 100, conehead: 0, buckethead: 0 };
  } else if (waveNumber === 2) {
    return { basic: 70, conehead: 30, buckethead: 0 };
  } else if (waveNumber === 3) {
    return { basic: 40, conehead: 40, buckethead: 20 };
  } else {
    return { basic: 20, conehead: 40, buckethead: 40 };
  }
}

function generateSpawnQueue(waveNumber) {
  const budget = (waveNumber * 20) + 50;
  const weights = getWeightsForWave(waveNumber);
  const queue = [];
  let remaining = budget;

  while (remaining > 0) {
    const affordable = Object.entries(ENEMY_TYPES)
      .filter(([key, e]) => e.cost <= remaining && weights[key] > 0);
    if (affordable.length === 0) break;

    // weighted random pick
    const totalWeight = affordable.reduce((sum, [k]) => sum + weights[k], 0);
    let roll = Math.random() * totalWeight;
    for (const [key, e] of affordable) {
      roll -= weights[key];
      if (roll <= 0) {
        queue.push(key);
        remaining -= e.cost;
        break;
      }
    }
  }
  return queue;
}

function startWave(waveNumber) {
  const queue = generateSpawnQueue(waveNumber);
  const subWaveSize = Math.ceil(queue.length / 3);
  state.subWaves = [
    queue.slice(0, subWaveSize),
    queue.slice(subWaveSize, subWaveSize * 2),
    queue.slice(subWaveSize * 2)
  ];
  state.activeSubWave = 0;
  state.currentSpawnQueue = state.subWaves[0] || [];
  state.subWaveTimer = 45;
  state.enemySpawnTimer = 0;
}

function updateHud() {
  let hudText = `☀ ${state.sun}<br>Wave ${state.wave}`;
  
  const totalEnemies = state.subWaves.reduce((sum, sub) => sum + sub.length, 0) + 
                      state.currentSpawnQueue.length + 
                      state.enemies.filter(e => e.hp > 0).length;
  if (totalEnemies > 0) {
    hudText += `<br>Enemies: ${totalEnemies}`;
  }
  
  sunDisplay.innerHTML = hudText;
  updateDefenderSelectionUI();
  pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
}

function togglePause() {
  if (state.gameStatus === 'playing' || state.gameStatus === 'paused') {
    state.isPaused = !state.isPaused;
    state.gameStatus = state.isPaused ? 'paused' : 'playing';
  }
}

function handleKeyPress(event) {
  switch(event.key.toLowerCase()) {
    case 'p':
      togglePause();
      break;
    case 'r':
      resetGame();
      break;
    case 'escape':
      togglePause();
      break;
  }
}

function drawGrid() {
  ctx.fillStyle = GRID_COLOR;
  ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
  ctx.strokeStyle = GRID_LINE_COLOR;
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * CELL_SIZE);
    ctx.lineTo(GRID_WIDTH, row * CELL_SIZE);
    ctx.stroke();
  }
  for (let col = 0; col <= COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * CELL_SIZE, 0);
    ctx.lineTo(col * CELL_SIZE, GRID_HEIGHT);
    ctx.stroke();
  }
}

function drawPlacementHighlights() {
  for (const highlight of state.placementHighlights) {
    const alpha = Math.min(0.45, (highlight.timer / FLASH_DURATION) * 0.45);
    if (alpha <= 0) {
      continue;
    }
    ctx.fillStyle = `rgba(255, 245, 120, ${alpha})`;
    ctx.fillRect(highlight.col * CELL_SIZE, highlight.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
}

function drawShadow(shadow) {
  ctx.fillStyle = "rgba(85, 85, 85, 0.4)";
  ctx.beginPath();
  ctx.ellipse(shadow.x, shadow.y, shadow.rx, shadow.ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHpBar(entity, topY) {
  if (!entity.hasTakenDamage) {
    return;
  }
  entity.displayHp = entity.displayHp ?? entity.maxHp;
  entity.displayHp += (entity.hp - entity.displayHp) * HP_BAR_LERP_RATE * (1/60);
  const width = HP_BAR_WIDTH;
  const height = HP_BAR_HEIGHT;
  const x = entity.x - width / 2;
  const y = topY - HP_BAR_OFFSET_Y - height;
  const ratio = Math.max(0, Math.min(1, entity.displayHp / entity.maxHp));
  ctx.fillStyle = "#500";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#3a3";
  ctx.fillRect(x, y, width * ratio, height);
}

function drawDefenders() {
  for (const defender of state.defenders) {
    if (defender.hp <= 0) continue;
    const type = DEFENDER_TYPES[defender.type];
    const color = defender.flashTimer > 0 ? '#ff0000' : type.color; // Red flash on hit
    ctx.fillStyle = color;
    ctx.fillRect(
      defender.x - DEFENDER_RADIUS,
      defender.y - DEFENDER_RADIUS,
      DEFENDER_RADIUS * 2,
      DEFENDER_RADIUS * 2
    );
    
    // Draw HP bar
    drawHpBar(defender.x, defender.y, defender.hp, type.hp);
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    drawShadow(getEnemyShadow(enemy));
    const typeConfig = ENEMY_TYPES[enemy.type];
    ctx.fillStyle = enemy.flashTimer > 0 ? '#ff0000' : typeConfig.color; // Red flash on hit
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y - 25, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw enemy head accessories
    if (typeConfig.headColor) {
      ctx.fillStyle = typeConfig.headColor;
      if (enemy.type === 'conehead') {
        // Draw orange cone
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - 55);
        ctx.lineTo(enemy.x - 12, enemy.y - 30);
        ctx.lineTo(enemy.x + 12, enemy.y - 30);
        ctx.closePath();
        ctx.fill();
      } else if (enemy.type === 'buckethead') {
        // Draw grey bucket rectangle
        ctx.fillRect(enemy.x - 15, enemy.y - 58, 30, 22);
      }
    }
    
    // Draw HP bar
    drawHpBar(enemy.x, enemy.y - 25, enemy.hp, typeConfig.hp);
  }
}

function drawProjectiles() {
  ctx.fillStyle = "#ffd84d";
  for (const projectile of state.projectiles) {
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWaveBanner(text) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";
  ctx.fillText(text, GRID_WIDTH / 2, GRID_HEIGHT / 2);
  ctx.textAlign = "start";
}

function drawOverlay(title) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";
  ctx.fillText(title, GRID_WIDTH / 2, GRID_HEIGHT / 2 - 20);
  ctx.fillStyle = "#3f7d38";
  ctx.fillRect(restartButtonRect.x, restartButtonRect.y, restartButtonRect.width, restartButtonRect.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Arial";
  ctx.fillText("Restart", GRID_WIDTH / 2, restartButtonRect.y + 33);
  ctx.textAlign = "start";
}

function spawnEnemy() {
  if (state.currentSpawnQueue.length === 0) return;
  
  const enemyType = state.currentSpawnQueue.shift();
  const row = Math.floor(Math.random() * ROWS);
  const y = getRowGroundY(row);
  const typeConfig = ENEMY_TYPES[enemyType];
  
  state.enemies.push({
    type: enemyType,
    row,
    x: GRID_WIDTH + 30,
    y,
    hp: typeConfig.hp,
    maxHp: typeConfig.hp,
    speed: typeConfig.speed,
    flashTimer: 0,
    hasTakenDamage: false,
  });
}

function findOverlappingDefender(enemy) {
  const enemyShadow = getEnemyShadow(enemy);
  return state.defenders.find(
    (defender) => defender.hp > 0 && shadowsOverlap(enemyShadow, getDefenderShadow(defender))
  );
}

function updateEnemySpawns(dt) {
  // Handle game start delay
  if (state.gameStartTimer > 0) {
    state.gameStartTimer -= dt;
    if (state.gameStartTimer <= 0) {
      startWave(state.wave);
    }
    return;
  }
  
  // Update reload timers
  for (const type in state.reloadTimers) {
    state.reloadTimers[type] = Math.max(0, state.reloadTimers[type] - dt);
  }
  
  // Check if we need to advance to next sub-wave (dual triggers)
  const activeEnemies = state.enemies.filter(e => e.hp > 0).length;
  const shouldAdvanceSubWave = (activeEnemies <= 3 && state.currentSpawnQueue.length === 0) || 
                               (state.subWaveTimer <= 0 && state.currentSpawnQueue.length === 0);
  
  if (shouldAdvanceSubWave && state.activeSubWave < 2) {
    state.activeSubWave++;
    state.currentSpawnQueue = state.subWaves[state.activeSubWave] || [];
    state.subWaveTimer = 45;
    state.enemySpawnTimer = 0;
  }
  
  // Update sub-wave timer
  state.subWaveTimer -= dt;
  
  // Spawn enemies from current queue
  if (state.currentSpawnQueue.length > 0) {
    state.enemySpawnTimer -= dt;
    if (state.enemySpawnTimer <= 0) {
      spawnEnemy();
      state.enemySpawnTimer = 4; // 4 seconds between spawns
    }
  }
  
  // Check if wave is complete and start next wave immediately (continuous flow)
  const totalRemaining = state.currentSpawnQueue.length + 
                        state.subWaves.slice(state.activeSubWave + 1).reduce((sum, sub) => sum + sub.length, 0) +
                        activeEnemies;
  
  if (totalRemaining === 0 && state.gameStartTimer <= 0) {
    state.wave++;
    startWave(state.wave);
  }
}

function updateDefenders(dt) {
  for (const defender of state.defenders) {
    if (defender.hp <= 0) {
      continue;
    }
    const type = DEFENDER_TYPES[defender.type];
    defender.cooldown -= dt;
    defender.flashTimer = Math.max(0, defender.flashTimer - dt);
    
    if (defender.type === 'sunflower') {
      if (defender.cooldown <= 0) {
        state.sun = Math.min(300, state.sun + 25);
        defender.cooldown = type.sunInterval;
      }
    } else if (type.canShoot) {
      const enemyInRow = state.enemies.some((enemy) => enemy.row === defender.row && enemy.hp > 0);
      if (enemyInRow && defender.cooldown <= 0) {
        state.projectiles.push({
          row: defender.row,
          x: defender.x + 30,
          y: defender.y - 30,
          radius: 5,
          damage: type.damage,
        });
        defender.cooldown = type.shotInterval;
      }
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) {
      continue;
    }
    enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
    const target = findOverlappingDefender(enemy);
    if (target) {
      const damage = ENEMY_DPS * dt;
      target.hp -= damage;
      target.hasTakenDamage = true;
      target.flashTimer = HIT_FLASH_DURATION;
      continue;
    }
    enemy.x -= enemy.speed * dt;
  }
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    projectile.prevX = projectile.x;
    projectile.prevY = projectile.y;
    projectile.x += PROJECTILE_SPEED * dt;
  }
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = state.projectiles[i];
    let didHit = false;
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.row !== projectile.row) {
        continue;
      }
      if (projectileSegmentHitsEnemyShadow(projectile, enemy)) {
        enemy.hp -= projectile.damage;
        enemy.hasTakenDamage = true;
        enemy.flashTimer = HIT_FLASH_DURATION;
        if (enemy.hp <= 0) {
          const typeConfig = ENEMY_TYPES[enemy.type];
          spawnDeathParticles(enemy.x, enemy.y - 25, typeConfig.color);
        }
        didHit = true;
        break;
      }
    }
    if (didHit || projectile.x > GRID_WIDTH + 20) {
      state.projectiles.splice(i, 1);
    }
  }
}

function cleanupEntities() {
  const deadDefenders = state.defenders.filter((defender) => defender.hp <= 0);
  for (const defender of deadDefenders) {
    const type = DEFENDER_TYPES[defender.type];
    spawnDeathParticles(defender.x, defender.y - 30, type.color);
  }
  
  state.defenders = state.defenders.filter((defender) => defender.hp > 0);
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  state.projectiles = state.projectiles.filter((projectile) => projectile.x <= GRID_WIDTH + 20);
}

function updatePlacementHighlights(dt) {
  for (const highlight of state.placementHighlights) {
    highlight.timer -= dt;
  }
  state.placementHighlights = state.placementHighlights.filter((highlight) => highlight.timer > 0);
}

function checkEndStates() {
  if (state.gameStatus !== "playing") {
    return;
  }
  const reachedLeft = state.enemies.some((enemy) => getEnemyShadow(enemy).x - SHADOW_RX <= 0);
  if (reachedLeft) {
    if (state.screenShakeTimer <= 0) {
      state.screenShakeTimer = SCREEN_SHAKE_DURATION;
    }
    state.gameStatus = "gameOver";
    return;
  }
}

function isInsideGrid(x, y) {
  return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}

function spawnSunDrop() {
  if (state.sunDrops.length >= SUN_DROP_MAX_COUNT) {
    return;
  }
  let attempts = 0;
  while (attempts < 50) {
    const col = Math.floor(Math.random() * COLS);
    const row = Math.floor(Math.random() * ROWS);
    const occupied = state.defenders.some((d) => d.col === col && d.row === row);
    if (!occupied) {
      const center = getCellCenter(row, col);
      state.sunDrops.push({
        x: center.x,
        y: center.y,
        radius: SUN_DROP_RADIUS,
        lifetime: SUN_DROP_LIFETIME,
        spawnTime: 0,
        scale: 1,
        collecting: false,
        collectAnimation: 0,
      });
      break;
    }
    attempts += 1;
  }
}

function updateSunDrops(dt) {
  state.sunDropSpawnTimer -= dt;
  if (state.sunDropSpawnTimer <= 0) {
    spawnSunDrop();
    state.sunDropSpawnTimer = randomRange(SUN_DROP_INTERVAL_MIN, SUN_DROP_INTERVAL_MAX);
  }
  
  for (let i = state.sunDrops.length - 1; i >= 0; i -= 1) {
    const sunDrop = state.sunDrops[i];
    sunDrop.spawnTime += dt;
    sunDrop.scale = 1 + Math.sin(sunDrop.spawnTime * 3) * 0.1;
    
    if (sunDrop.collecting) {
      sunDrop.collectAnimation += dt * 3;
      if (sunDrop.collectAnimation >= 1) {
        state.sunDrops.splice(i, 1);
      }
    } else if (sunDrop.spawnTime >= SUN_DROP_LIFETIME) {
      state.sunDrops.splice(i, 1);
    }
  }
}

function updateScreenShake(dt) {
  if (state.screenShakeTimer > 0) {
    state.screenShakeTimer -= dt;
    const intensity = (state.screenShakeTimer / SCREEN_SHAKE_DURATION) * SCREEN_SHAKE_INTENSITY;
    state.screenShakeX = (Math.random() - 0.5) * intensity * 2;
    state.screenShakeY = (Math.random() - 0.5) * intensity * 2;
  } else {
    state.screenShakeX = 0;
    state.screenShakeY = 0;
  }
}

function drawSunDrops() {
  for (const sunDrop of state.sunDrops) {
    if (sunDrop.collecting) {
      const alpha = 1 - sunDrop.collectAnimation;
      const scale = 1 + sunDrop.collectAnimation * 2;
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sunDrop.x, sunDrop.y, sunDrop.radius * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const opacity = Math.min(1, sunDrop.spawnTime / 0.3);
      ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
      ctx.beginPath();
      ctx.arc(sunDrop.x, sunDrop.y, sunDrop.radius * sunDrop.scale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `rgba(255, 255, 100, ${opacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(sunDrop.x, sunDrop.y, sunDrop.radius * sunDrop.scale * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function spawnDeathParticles(x, y, color) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * PARTICLE_SPEED,
      vy: Math.sin(angle) * PARTICLE_SPEED,
      color,
      lifetime: PARTICLE_LIFETIME,
      maxLifetime: PARTICLE_LIFETIME,
    });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const particle = state.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.lifetime -= dt;
    if (particle.lifetime <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = particle.lifetime / particle.maxLifetime;
    ctx.fillStyle = particle.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDamageNumbers() {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const damageNum = state.damageNumbers[i];
    
    ctx.fillStyle = damageNum.color;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`-${damageNum.damage}`, damageNum.x, damageNum.y);
    
    // Update position and timer
    damageNum.y += damageNum.velocity * 0.016; // Assuming 60 FPS
    damageNum.velocity += 50 * 0.016; // Gravity
    damageNum.timer -= 0.016;
    
    if (damageNum.timer <= 0) {
      state.damageNumbers.splice(i, 1);
    }
  }
}

function drawHpBar(x, y, currentHp, maxHp, width = 30, height = 4) {
  const barY = y - 15; // Position above unit
  
  // Background
  ctx.fillStyle = '#333';
  ctx.fillRect(x - width/2, barY, width, height);
  
  // HP fill
  const hpPercent = currentHp / maxHp;
  let fillColor;
  if (hpPercent > 0.5) {
    fillColor = '#00ff00'; // Green
  } else if (hpPercent > 0.25) {
    fillColor = '#ffff00'; // Yellow
  } else {
    fillColor = '#ff0000'; // Red
  }
  
  ctx.fillStyle = fillColor;
  ctx.fillRect(x - width/2, barY, width * hpPercent, height);
  
  // Border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width/2, barY, width, height);
}

function tryPlaceDefender(x, y) {
  if (!isInsideGrid(x, y) || state.turnPhase !== 'placing') {
    return;
  }
  const defenderType = DEFENDER_TYPES[state.selectedDefenderType];
  if (state.availablePoints < defenderType.cost) {
    return;
  }
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  const occupied = state.defenders.some((defender) => defender.row === row && defender.col === col);
  if (occupied) {
    return;
  }
  const center = getCellCenter(row, col);
  state.defenders.push({
    type: state.selectedDefenderType,
    row,
    col,
    x: center.x,
    y: getRowGroundY(row),
    hp: defenderType.hp,
    maxHp: defenderType.hp,
    flashTimer: 0,
    hasTakenDamage: false,
  });
  state.availablePoints -= defenderType.cost;
  state.placementHighlights.push({ row, col, timer: FLASH_DURATION });
  updateTurnUI();
}

function handleCanvasMouseMove(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  for (let i = state.sunDrops.length - 1; i >= 0; i--) {
    const sunDrop = state.sunDrops[i];
    if (!sunDrop.collecting) {
      const distance = Math.hypot(x - sunDrop.x, y - sunDrop.y);
      if (distance <= 20) {
        sunDrop.collecting = true;
        state.sun = Math.min(300, state.sun + SUN_DROP_VALUE);
      }
    }
  }
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (state.gameStatus !== "playing") {
    const inRestart =
      x >= restartButtonRect.x &&
      x <= restartButtonRect.x + restartButtonRect.width &&
      y >= restartButtonRect.y &&
      y <= restartButtonRect.y + restartButtonRect.height;
    if (inRestart) {
      resetGame();
    }
    return;
  }

  tryPlaceDefender(x, y);
}

function update(dt) {
  updatePlacementHighlights(dt);
  updateParticles(dt);
  updateScreenShake(dt);
  updateDiceAnimation(dt);
  
  if (state.gameStatus !== "playing" && state.gameStatus !== "paused") {
    return;
  }
  if (state.isPaused) {
    return;
  }
  
  // Handle enemy phase
  if (state.turnPhase === 'enemy') {
    state.enemyMoveTimer -= dt;
    if (state.enemyMoveTimer <= 0) {
      advanceEnemies();
    }
    return;
  }
}

function render() {
  ctx.save();
  ctx.translate(state.screenShakeX, state.screenShakeY);
  
  drawGrid();
  drawPlacementHighlights();
  drawParticles();
  drawDefenders();
  drawEnemies();
  drawDamageNumbers();
  
  ctx.restore();
  
  if (state.gameStatus === "gameOver") {
    drawOverlay("Game Over");
  } else if (state.gameStatus === "win") {
    drawOverlay("You Win!");
  } else if (state.isPaused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 48px Arial";
    ctx.fillText("Paused", GRID_WIDTH / 2, GRID_HEIGHT / 2);
    ctx.textAlign = "start";
  }
  updateTurnUI();
}

function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
  const enemyType = 'basic'; // Start with basic enemies
  const row = Math.floor(Math.random() * ROWS);
  const y = getRowGroundY(row);
  const typeConfig = ENEMY_TYPES[enemyType];
  
  state.enemies.push({
    type: enemyType,
    row,
    x: GRID_WIDTH - CELL_SIZE, // Rightmost tile
    y,
    hp: typeConfig.hp,
    maxHp: typeConfig.hp,
    speed: typeConfig.speed,
    flashTimer: 0,
    hasTakenDamage: false,
  });
}

function shouldSpawnEnemy() {
  return state.turnsUntilNextSpawn <= 0;
}

resetGame();

document.querySelectorAll('.defender-card').forEach(card => {
  card.addEventListener('click', () => {
    const type = card.dataset.type;
    const defenderType = DEFENDER_TYPES[type];
    if (state.availablePoints >= defenderType.cost && state.turnPhase === 'placing') {
      state.selectedDefenderType = type;
      updateTurnUI();
    }
  });
});

diceDisplay.addEventListener('click', handleDiceClick);
endTurnBtn.addEventListener('click', endTurn);
pauseBtn.addEventListener('click', togglePause);
beginBtn.addEventListener('click', beginGame);
retryBtn.addEventListener('click', resetGame);
document.addEventListener('keydown', handleKeyPress);
canvas.addEventListener("click", handleCanvasClick);
requestAnimationFrame(gameLoop);