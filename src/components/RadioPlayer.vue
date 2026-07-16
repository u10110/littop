<template>
    <div class="radio-player-bar">
      <!-- Блок с информацией -->
      <div class="station-info">
        <div class="status-indicator" :class="{ pulse: isPlaying }"></div>
        <div class="text-meta">
          <h3>Мое Радио</h3>
          <p>{{ isPlaying ? 'Прямой эфир' : 'Пауза' }}</p>
        </div>
      </div>
  
      <!-- Скрытый аудио-элемент -->
      <audio ref="audioElement" :src="radioUrl" preload="none"></audio>
  
      <!-- Блок управления -->
      <div class="player-controls">
        <!-- Кнопка Play/Pause -->
        <button class="play-btn" @click="togglePlay" :aria-label="isPlaying ? 'Пауза' : 'Играть'">
            <!-- Используем CSS-фигуры вместо текстовых символов -->
            <Icon v-if="!isPlaying" name="play" />
            <Icon v-else name="pause" />
        </button>
  
        <!-- Управление громкостью -->
        <div class="volume-control">
          <span class="volume-icon"><Icon name="volume-2" /></span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            v-model="volume"
            @input="updateVolume"
            class="volume-slider"
          >
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  
  export default {
    name: 'RadioPlayerBar',
    setup() {
      const audioElement = ref(null);
      const isPlaying = ref(false);
      const volume = ref(0.8);
      const radioUrl = ref('https://stream.littop.ru/radio.ogg');
  
      onMounted(() => {
        if (audioElement.value) {
          audioElement.value.volume = volume.value;
        }
      });
  
      const togglePlay = () => {
        const audio = audioElement.value;
        if (!audio) return;
  
        if (isPlaying.value) {
          audio.pause();
          isPlaying.value = false;
        } else {
          audio.load();
          audio.play().catch(error => {
            console.error("Ошибка воспроизведения:", error);
          });
          isPlaying.value = true;
        }
      };
  
      const updateVolume = () => {
        const audio = audioElement.value;
        if (audio) {
          audio.volume = volume.value;
        }
      };
  
      return {
        audioElement,
        isPlaying,
        volume,
        radioUrl,
        togglePlay,
        updateVolume
      };
    }
  };
  </script>
  
  <style scoped>
  /* Плеер занимает всю ширину grid-ячейки и имеет фиксированную небольшую высоту */
  .radio-player-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    
    /* Растяжение на всю ширину родителя */
    width: 100%; 
    grid-column: 1 / -1; /* Подстраховка для Grid, чтобы занять все колонки, если нужно */
    box-sizing: border-box;
    
    /* Компактные размеры */
    height: 70px;
    padding: 10px 20px;
    
    background: linear-gradient(135deg, #1e1e24 0%, #0f0f12 100%);
    color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    font-family: 'Segoe UI', Roboto, sans-serif;
  }
  
  /* Левая часть: Инфо и статус */
  .station-info {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 150px;
  }
  
  .text-meta h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
  }
  
  .text-meta p {
    margin: 2px 0 0;
    color: #a0a0a0;
    font-size: 0.8rem;
  }
  
  /* Индикатор */
  .status-indicator {
    width: 8px;
    height: 8px;
    background-color: #ff4d4d;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .status-indicator.pulse {
    animation: pulse-animation 1.5s infinite;
  }
  
  @keyframes pulse-animation {
    0% { box-shadow: 0 0 0 0px rgba(255, 77, 77, 0.4); }
    70% { box-shadow: 0 0 0 8px rgba(255, 77, 77, 0); }
    100% { box-shadow: 0 0 0 0px rgba(255, 77, 77, 0); }
  }
  
  /* Правая часть: Кнопка и громкость */
  .player-controls {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-grow: 1;
    justify-content: flex-end;
  }
  
  /* Маленькая кнопка */
  .play-btn {
    background-color: #00bcd4;
    color: #ffffff;
    border: none;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: transform 0.2s, background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .play-btn:hover {
    background-color: #0097a7;
    transform: scale(1.05);
  }
  
  /* Панель громкости */
  .volume-control {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 6px 12px;
    max-width: 200px;
    width: 100%;
  }
  
  .volume-icon {
    margin-right: 8px;
    font-size: 1rem;
  }
  
  .volume-slider {
    width: 100%;
    -webkit-appearance: none;
    background: rgba(255, 255, 255, 0.2);
    height: 4px;
    border-radius: 2px;
    outline: none;
  }
  
  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00bcd4;
    cursor: pointer;
  }

  /* Кнопка Воспроизведение/Пауза */
.play-btn {
  background-color: #00bcd4;
  color: #ffffff;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
  
  /* Идеальное выравнивание внутреннего содержимого */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.play-btn:hover {
  background-color: #0097a7;
  transform: scale(1.05);
}

/* Идеально ровный треугольник на CSS */
.icon-play {
  box-sizing: border-box;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 7px 0 7px 12px; /* Размеры треугольника */
  border-color: transparent transparent transparent #ffffff;
  
  /* Оптический сдвиг: компенсируем острый угол треугольника, 
     чтобы он казался ровно по центру круга */
  margin-left: 3px; 
}

/* Ровные полоски паузы */
.icon-pause {
  display: flex;
  justify-content: space-between;
  width: 10px;
  height: 14px;
}

.icon-pause::before,
.icon-pause::after {
  content: '';
  width: 3px;
  background-color: #ffffff;
  border-radius: 1px;
}

  </style>