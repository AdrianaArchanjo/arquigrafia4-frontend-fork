<template>
  <div 
    v-if="isGuideActive" 
    class="a11y-reading-guide-line" 
    :style="{ top: cursorY + 'px' }"
  ></div>

  <nav class="a11y-container" role="navigation">
    <div class="a11y-bar-main">
      <div class="a11y-group">
        <button @click="toggleContrast" class="a11y-btn" :class="{ active: isHighContrast }">
          🌓 Contraste
        </button>
        <button @click="toggleGuide" class="a11y-btn" :class="{ active: isGuideActive }">
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
const cursorY = ref(0);

let recognition = null;

// --- FUNÇÃO DE SÍNTESE DE VOZ ---
const speak = (text, callback) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Para qualquer fala anterior
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'pt-BR';
    msg.rate = 1.0;
    // O callback garante que só abriremos o mic após o PC terminar de falar
    if (callback) msg.onend = callback; 
    window.speechSynthesis.speak(msg);
  }
};

// --- CONTROLE DO RECONHECIMENTO ---
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
  recognition.continuous = false; // Ouve apenas uma frase por vez para evitar loops
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening.value = true;
    voiceMessage.value = "Ouvindo...";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase();
    isListening.value = false; // Fecha o mic imediatamente
    
    // Repete o que entendeu antes de processar
    voiceMessage.value = `Entendi: "${text}"`;
    speak(`Você disse: ${text}`, () => {
      processCommand(text); // Só executa a ação após confirmar a fala
    });
  };

  recognition.onerror = (event) => {
    if (event.error !== 'aborted') {
      voiceMessage.value = "Não entendi, tente novamente.";
      speak("Não consegui ouvir.");
    }
    isListening.value = false;
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  // Passo 1: O sistema pede para falar -> Passo 2: Abre o mic (no callback)
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

// --- PROCESSADOR DE COMANDOS (MAPA E BUSCAS) ---
const processCommand = (text) => {
  // 1. Buscas (Conforme menu da imagem)
  if (text.includes("busca avançada")) {
    emit('voice-search', { type: 'advanced' });
  } else if (text.includes("busca por data") || text.includes("buscar data")) {
    emit('voice-search', { type: 'date' });
  } else if (text.includes("busca por cor") || text.includes("buscar cor")) {
    emit('voice-search', { type: 'color' });
  } else if (text.includes("busca textual")) {
    emit('voice-search', { type: 'text' });
  } else if (text.includes("buscar") || text.includes("localizar")) {
    const term = text.replace(/buscar por|buscar|localizar/g, "").trim();
    emit('voice-search', { type: 'general', query: term });
  }

  // 2. Manipulação do Mapa
  else if (text.includes("aumentar zoom") || text.includes("aproximar")) {
    emit('map-control', { action: 'zoom-in' });
  } else if (text.includes("diminuir zoom") || text.includes("afastar")) {
    emit('map-control', { action: 'zoom-out' });
  } else if (text.includes("coordenadas") || text.includes("latitude")) {
    emit('map-control', { action: 'show-coords' });
  } else if (text.includes("endereço")) {
    emit('map-control', { action: 'get-address' });
  } else if (text.includes("georreferenciamento") || text.includes("satélite")) {
    emit('map-control', { action: 'toggle-layer' });
  }

  // 3. Acessibilidade
  else if (text.includes("contraste")) toggleContrast();
  else if (text.includes("guia")) toggleGuide();
  else if (text.includes("mapa")) emit('voice-view-change', 'map');
  else if (text.includes("grade") || text.includes("mosaico")) emit('voice-view-change', 'mosaic');
};

// --- ACESSIBILIDADE ---
const toggleContrast = () => {
  isHighContrast.value = !isHighContrast.value;
  document.body.classList.toggle('high-contrast', isHighContrast.value);
  speak(isHighContrast.value ? "Alto contraste ativado" : "Contraste padrão");
};

const toggleGuide = () => {
  isGuideActive.value = !isGuideActive.value;
  speak(isGuideActive.value ? "Guia de leitura ativado" : "Guia desativado");
};

const adjustFontSize = (delta) => {
  fontSize.value = Math.max(70, Math.min(200, fontSize.value + delta));
  document.documentElement.style.fontSize = `${fontSize.value}%`;
  speak(`Fonte em ${fontSize.value} por cento`);
};

const updateCursor = (e) => { cursorY.value = e.clientY; };
onMounted(() => window.addEventListener('mousemove', updateCursor));
onUnmounted(() => window.removeEventListener('mousemove', updateCursor));
</script>

<style scoped>
.a11y-container {
  background: #1a1a1a;
  color: white;
  padding: 8px 20px;
  border-bottom: 2px solid #ed6921;
}
.a11y-bar-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.a11y-group { display: flex; align-items: center; gap: 12px; }
.a11y-btn {
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.a11y-btn.active { background: #ed6921; border-color: #ed6921; }
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
  transition: all 0.3s;
}
.voice-main-btn.is-listening {
  background: #d63031;
  box-shadow: 0 0 10px #d63031;
}
.voice-feedback { color: #f1c40f; font-size: 13px; font-weight: bold; }
.a11y-reading-guide-line {
  position: fixed;
  left: 0;
  width: 100%;
  height: 4px;
  background: yellow;
  z-index: 99999;
  pointer-events: none;
  box-shadow: 0 0 15px yellow;
}
</style>