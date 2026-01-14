<template>
  <Teleport to="body">
    <div 
      v-if="isGuideActive" 
      class="a11y-reading-guide-line" 
      :style="{ top: cursorY + 'px' }"
    ></div>
  </Teleport>

  <nav class="a11y-container" role="navigation">
    <div class="a11y-bar-main">
      <div class="a11y-group">
        <button @click="toggleContrast" class="a11y-btn" :class="{ active: isHighContrast }">
          🌓 Contraste
        </button>
        <button 
          @click="toggleGuide" 
          class="a11y-btn" 
          :class="{ active: isGuideActive }"
        >
          📖 Guia de Leitura
        </button>
      </div>

      <div class="a11y-group voice-core">
        <button 
          @click="toggleVoice" 
          class="voice-main-btn" 
          :class="{ 'is-listening': isListening }"
        >
          <span class="mic-icon">{{ isListening ? '●' : '🎤' }}</span>
          <span>{{ isListening ? 'Desativar Voz' : 'Comando de Voz' }}</span>
        </button>
        <span class="voice-feedback" v-if="voiceMessage">{{ voiceMessage }}</span>
      </div>

      <div class="a11y-group">
        <button @click="adjustFontSize(-10)" class="a11y-btn">A-</button>
        <span class="zoom-indicator">{{ fontSize }}%</span>
        <button @click="adjustFontSize(10)" class="a11y-btn">A+</button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['voice-search', 'voice-view-change', 'map-control']);

const isListening = ref(false);
const voiceMessage = ref("");
const isHighContrast = ref(false);
const isGuideActive = ref(false);
const fontSize = ref(100);
const cursorY = ref(window.innerHeight / 2); // Inicia no meio da tela

let recognition = null;

// --- SÍNTESE DE VOZ (Feedback Sonoro) ---
const speak = (text, callback) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'pt-BR';
    if (callback) msg.onend = callback;
    window.speechSynthesis.speak(msg);
  }
};

// --- ACESSIBILIDADE (Contraste e Guia do Código 2) ---
const toggleContrast = () => {
  isHighContrast.value = !isHighContrast.value;
  document.body.classList.toggle('high-contrast', isHighContrast.value);
  speak(isHighContrast.value ? "Alto contraste ativado" : "Contraste padrão");
};

const toggleGuide = () => {
  isGuideActive.value = !isGuideActive.value;
  if (isGuideActive.value) {
    document.body.classList.add('reading-guide-active');
  } else {
    document.body.classList.remove('reading-guide-active');
  }
  speak(isGuideActive.value ? "Guia de leitura ativado" : "Guia desativado");
};

const adjustFontSize = (delta) => {
  fontSize.value = Math.max(70, Math.min(200, fontSize.value + delta));
  document.documentElement.style.fontSize = `${fontSize.value}%`;
  // CORREÇÃO: Aciona a voz no zoom
  speak(`Fonte em ${fontSize.value} por cento`);
};

// --- RECONHECIMENTO DE VOZ (Lógica Robusta do Código 1) ---
const toggleVoice = () => {
  if (isListening.value) {
    stopRecognition();
  } else {
    initRecognition();
  }
};

const initRecognition = () => {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) return;

  recognition = new Speech();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening.value = true;
    voiceMessage.value = "Ouvindo...";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase();
    isListening.value = false;
    voiceMessage.value = `Entendi: "${text}"`;
    
    speak(`Você disse: ${text}`, () => {
      processCommand(text);
    });
  };

  recognition.onerror = () => { isListening.value = false; };
  recognition.onend = () => { isListening.value = false; };

  speak("Pode falar agora", () => {
    recognition.start();
  });
};

const stopRecognition = () => {
  if (recognition) recognition.abort();
  isListening.value = false;
  voiceMessage.value = "";
  speak("Comando de voz desativado.");
};

// --- PROCESSADOR DE COMANDOS (Buscas e Mapa do Código 1) ---
const processCommand = (text) => {
  // 1. Buscas
  if (text.includes("busca avançada")) emit('voice-search', { type: 'advanced' });
  else if (text.includes("data")) emit('voice-search', { type: 'date' });
  else if (text.includes("cor")) emit('voice-search', { type: 'color' });
  else if (text.includes("buscar") || text.includes("localizar")) {
    const term = text.replace(/buscar por|buscar|localizar/g, "").trim();
    emit('voice-search', { type: 'general', query: term });
  }
  // 2. Mapa
  else if (text.includes("aumentar zoom") || text.includes("aproximar")) {
    emit('map-control', { action: 'zoom-in' });
    speak("Aproximando mapa");
  } else if (text.includes("diminuir zoom") || text.includes("afastar")) {
    emit('map-control', { action: 'zoom-out' });
    speak("Afastando mapa");
  } else if (text.includes("coordenadas")) {
    emit('map-control', { action: 'show-coords' });
    speak("Mostrando coordenadas");
  }
  // 3. Atalhos de Acessibilidade via Voz
  else if (text.includes("contraste")) toggleContrast();
  else if (text.includes("guia")) toggleGuide();
  else if (text.includes("mapa")) emit('voice-view-change', 'map');
};

// --- ATUALIZAÇÃO DO MOUSE (Lógica do Código 2) ---
const updateCursor = (e) => { 
  if (isGuideActive.value) {
    cursorY.value = e.clientY; 
  }
};

onMounted(() => {
  window.addEventListener('mousemove', updateCursor);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', updateCursor);
});
</script>

<style scoped>
.a11y-container {
  background: #1a1a1a;
  color: white;
  padding: 8px 20px;
  border-bottom: 2px solid #ed6921;
  position: relative;
  z-index: 1000;
}
.a11y-bar-main { display: flex; justify-content: space-between; align-items: center; }
.a11y-group { display: flex; align-items: center; gap: 12px; }
.a11y-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.a11y-btn.active { background: #ed6921; border-color: white; }

.voice-main-btn {
  background: #ed6921;
  border: none;
  color: white;
  padding: 8px 20px;
  border-radius: 25px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
.voice-main-btn.is-listening { background: #d63031; box-shadow: 0 0 10px #d63031; }
.voice-feedback { color: #f1c40f; font-size: 13px; font-weight: bold; margin-left: 10px; }

/* ESTILO DA GUIA (Do Código 2 - Máxima Visibilidade) */
.a11y-reading-guide-line {
  position: fixed;
  left: 0;
  width: 100vw;
  height: 6px;
  background: yellow;
  z-index: 2147483647;
  pointer-events: none;
  box-shadow: 0 0 15px yellow;
  border-top: 1px solid black;
  border-bottom: 1px solid black;
}
</style>