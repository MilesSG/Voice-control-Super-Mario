<script setup lang="ts">
import Game from './components/Game.vue'
</script>

<template>
  <div class="app">
    <h1>语音控制平台游戏</h1>
    <Game />
  </div>
</template>

<style>
.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  color: #2c3e50;
  margin-bottom: 2rem;
}
</style>