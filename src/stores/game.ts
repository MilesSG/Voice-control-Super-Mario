import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    score: 0,
    highScore: localStorage.getItem('highScore') ? Number(localStorage.getItem('highScore')) : 0,
    lives: 3
  }),
  
  actions: {
    incrementScore(points: number) {
      this.score += points;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('highScore', this.highScore.toString());
      }
    },
    
    resetGame() {
      this.lives--;
      if (this.lives <= 0) {
        this.score = 0;
        this.lives = 3;
      }
    }
  }
});