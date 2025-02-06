<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const gameStore = useGameStore();
const gameCanvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const recognition = ref<any>(null);

// 游戏常量
const TILE_SIZE = 32;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 48;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;

// 精灵状态
const SPRITE_STATES = {
  IDLE: 0,
  RUNNING: 1,
  JUMPING: 2
};

// 游戏对象
const player = ref({
  x: 100,
  y: 300,
  velocityX: 0,
  velocityY: 0,
  isJumping: false,
  direction: 1, // 1 右 -1 左
  state: SPRITE_STATES.IDLE,
  frame: 0
});

const gameObjects = ref({
  coins: [
    { x: 200, y: 200, collected: false },
    { x: 400, y: 150, collected: false },
    { x: 600, y: 250, collected: false }
  ],
  enemies: [
    { x: 300, y: 368, direction: -1, type: 'goomba' },
    { x: 500, y: 368, direction: 1, type: 'goomba' }
  ],
  blocks: [
    { x: 200, y: 250, type: 'brick' },
    { x: 232, y: 250, type: 'question', hit: false },
    { x: 264, y: 250, type: 'brick' }
  ]
});

const platforms = [
  { x: 0, y: 400, width: 800, height: 32 }, // 地面
  { x: 300, y: 300, width: 128, height: 32 }, // 平台
  { x: 500, y: 200, width: 128, height: 32 }, // 平台
  { x: 650, y: 350, width: 64, height: 96 }  // 管道
];

// 图片资源
const sprites = {
  mario: new Image(),
  enemies: new Image(),
  tiles: new Image(),
  items: new Image()
};

// 加载图片
function loadImages() {
  sprites.mario.src = 'https://raw.githubusercontent.com/meth-meth-method/super-mario/master/public/sprites/mario.png';
  sprites.enemies.src = 'https://raw.githubusercontent.com/meth-meth-method/super-mario/master/public/sprites/goomba.png';
  sprites.tiles.src = 'https://raw.githubusercontent.com/meth-meth-method/super-mario/master/public/sprites/tiles.png';
  sprites.items.src = 'https://raw.githubusercontent.com/meth-meth-method/super-mario/master/public/sprites/items.png';
}

function initVoiceRecognition() {
  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition.value = new SpeechRecognition();
    recognition.value.continuous = true;
    recognition.value.lang = 'zh-CN';
    recognition.value.onresult = handleVoiceCommand;
    recognition.value.start();
  }
}

function handleVoiceCommand(event: any) {
  const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
  
  if (command.includes('跳') || command.includes('跳跃')) {
    jump();
  } else if (command.includes('左')) {
    moveLeft();
  } else if (command.includes('右')) {
    moveRight();
  } else if (command.includes('冲刺')) {
    sprint();
  }
}

function jump() {
  if (!player.value.isJumping) {
    player.value.velocityY = JUMP_FORCE;
    player.value.isJumping = true;
    player.value.state = SPRITE_STATES.JUMPING;
  }
}

function moveLeft() {
  player.value.velocityX = -MOVE_SPEED;
  player.value.direction = -1;
  if (!player.value.isJumping) {
    player.value.state = SPRITE_STATES.RUNNING;
  }
}

function moveRight() {
  player.value.velocityX = MOVE_SPEED;
  player.value.direction = 1;
  if (!player.value.isJumping) {
    player.value.state = SPRITE_STATES.RUNNING;
  }
}

function sprint() {
  player.value.velocityX *= 2;
}

function updatePlayer() {
  // 更新位置
  player.value.x += player.value.velocityX;
  player.value.y += player.value.velocityY;
  player.value.velocityY += GRAVITY;

  // 摩擦力
  player.value.velocityX *= 0.9;

  // 边界检查
  if (player.value.x < 0) player.value.x = 0;
  if (player.value.x > gameCanvas.value!.width - PLAYER_WIDTH) {
    player.value.x = gameCanvas.value!.width - PLAYER_WIDTH;
  }

  // 更新动画帧
  if (Math.abs(player.value.velocityX) > 0.5) {
    player.value.frame = (player.value.frame + 0.1) % 3;
  } else {
    player.value.frame = 0;
    player.value.state = SPRITE_STATES.IDLE;
  }
}

function updateEnemies() {
  gameObjects.value.enemies.forEach(enemy => {
    enemy.x += enemy.direction;
    
    // 简单的AI移动
    if (enemy.x <= 100 || enemy.x >= 700) {
      enemy.direction *= -1;
    }
  });
}

function checkCollisions() {
  // 平台碰撞
  let onPlatform = false;
  for (const platform of platforms) {
    if (
      player.value.x < platform.x + platform.width &&
      player.value.x + PLAYER_WIDTH > platform.x &&
      player.value.y + PLAYER_HEIGHT > platform.y &&
      player.value.y < platform.y + platform.height
    ) {
      if (player.value.velocityY > 0) {
        player.value.y = platform.y - PLAYER_HEIGHT;
        player.value.velocityY = 0;
        player.value.isJumping = false;
        onPlatform = true;
      }
    }
  }

  // 收集金币
  gameObjects.value.coins.forEach(coin => {
    if (!coin.collected &&
        player.value.x < coin.x + TILE_SIZE &&
        player.value.x + PLAYER_WIDTH > coin.x &&
        player.value.y < coin.y + TILE_SIZE &&
        player.value.y + PLAYER_HEIGHT > coin.y) {
      coin.collected = true;
      gameStore.incrementScore(100);
    }
  });

  // 敌人碰撞
  gameObjects.value.enemies.forEach(enemy => {
    if (player.value.x < enemy.x + TILE_SIZE &&
        player.value.x + PLAYER_WIDTH > enemy.x &&
        player.value.y < enemy.y + TILE_SIZE &&
        player.value.y + PLAYER_HEIGHT > enemy.y) {
      // 从上方踩踏敌人
      if (player.value.velocityY > 0) {
        enemy.y = 1000; // 移除敌人
        player.value.velocityY = JUMP_FORCE / 2;
        gameStore.incrementScore(200);
      } else {
        // 碰到敌人
        gameStore.resetGame();
        player.value.x = 100;
        player.value.y = 300;
      }
    }
  });
}

function drawSprite(
  image: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flip: boolean = false
) {
  if (!ctx.value) return;
  
  ctx.value.save();
  if (flip) {
    ctx.value.scale(-1, 1);
    dx = -dx - dw;
  }
  ctx.value.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.value.restore();
}

function drawGame() {
  if (!ctx.value || !gameCanvas.value) return;

  // 清除画布
  ctx.value.clearRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

  // 绘制背景
  const gradient = ctx.value.createLinearGradient(0, 0, 0, gameCanvas.value.height);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(1, '#E0F6FF');
  ctx.value.fillStyle = gradient;
  ctx.value.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

  // 绘制云朵
  ctx.value.fillStyle = '#FFFFFF';
  ctx.value.beginPath();
  ctx.value.arc(100, 100, 30, 0, Math.PI * 2);
  ctx.value.arc(130, 100, 40, 0, Math.PI * 2);
  ctx.value.arc(160, 100, 30, 0, Math.PI * 2);
  ctx.value.fill();

  // 绘制平台
  for (const platform of platforms) {
    if (platform.height === 32) {
      // 普通平台
      ctx.value.fillStyle = '#4CAF50';
      ctx.value.fillRect(platform.x, platform.y, platform.width, platform.height);
    } else {
      // 管道
      ctx.value.fillStyle = '#2E7D32';
      ctx.value.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
  }

  // 绘制金币
  gameObjects.value.coins.forEach(coin => {
    if (!coin.collected) {
      ctx.value!.fillStyle = '#FFD700';
      ctx.value!.beginPath();
      ctx.value!.arc(coin.x + 16, coin.y + 16, 8, 0, Math.PI * 2);
      ctx.value!.fill();
    }
  });

  // 绘制砖块
  gameObjects.value.blocks.forEach(block => {
    ctx.value!.fillStyle = block.type === 'brick' ? '#B97A57' : '#E3BC5A';
    ctx.value!.fillRect(block.x, block.y, TILE_SIZE, TILE_SIZE);
  });

  // 绘制敌人
  gameObjects.value.enemies.forEach(enemy => {
    if (enemy.y < 800) { // 只绘制活着的敌人
      ctx.value!.fillStyle = '#8B4513';
      ctx.value!.fillRect(enemy.x, enemy.y, TILE_SIZE, TILE_SIZE);
    }
  });

  // 绘制玩家
  ctx.value.fillStyle = '#FF0000';
  drawSprite(
    sprites.mario,
    player.value.frame * PLAYER_WIDTH,
    player.value.state * PLAYER_HEIGHT,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    player.value.x,
    player.value.y,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    player.value.direction === -1
  );

  // 绘制分数
  ctx.value.fillStyle = '#000000';
  ctx.value.font = '24px Arial';
  ctx.value.fillText(`分数: ${gameStore.score}`, 20, 40);
  ctx.value.fillText(`最高分: ${gameStore.highScore}`, 20, 70);
}

function gameLoop() {
  updatePlayer();
  updateEnemies();
  checkCollisions();
  drawGame();
  requestAnimationFrame(gameLoop);
}

onMounted(() => {
  if (gameCanvas.value) {
    ctx.value = gameCanvas.value.getContext('2d');
    gameCanvas.value.width = 800;
    gameCanvas.value.height = 600;
    loadImages();
    initVoiceRecognition();
    gameLoop();
  }
});

onUnmounted(() => {
  if (recognition.value) {
    recognition.value.stop();
  }
});
</script>

<template>
  <div class="game-container">
    <canvas ref="gameCanvas"></canvas>
    <div class="instructions">
      <h2>语音指令：</h2>
      <ul>
        <li>"跳跃" - 马里奥跳跃</li>
        <li>"左" - 向左移动</li>
        <li>"右" - 向右移动</li>
        <li>"冲刺" - 加速跑动</li>
      </ul>
      <div class="game-info">
        <p>收集金币获得分数</p>
        <p>踩踏敌人可以消灭它们</p>
        <p>碰到敌人会重新开始</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

canvas {
  border: 4px solid #333;
  border-radius: 8px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.instructions {
  margin-top: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.instructions h2 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 1.5em;
}

.instructions ul {
  list-style-type: none;
  padding: 0;
  margin-bottom: 20px;
}

.instructions li {
  margin: 10px 0;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  color: #2c3e50;
  font-weight: 500;
}

.game-info {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 2px solid #eee;
}

.game-info p {
  color: #666;
  margin: 5px 0;
  font-size: 0.9em;
}
</style>