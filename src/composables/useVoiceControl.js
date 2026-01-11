import { ref } from 'vue';

export function useVoiceControl(callbacks) {
  const isListening = ref(false);
  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition 
    ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() 
    : null;

  if (recognition) {
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      processCommand(command);
      isListening.value = false;
    };

    recognition.onerror = () => { isListening.value = false; };
    recognition.onend = () => { isListening.value = false; };
  }

  const processCommand = (text) => {
    console.log("Comando recebido:", text);
    
    // Lógica de mapeamento de intenções
    if (text.includes("mapa")) callbacks.onViewChange('map');
    else if (text.includes("grade") || text.includes("grid")) callbacks.onViewChange('grid');
    else if (text.includes("mosaico")) callbacks.onViewChange('mosaic');
    else if (text.includes("buscar por")) {
      const query = text.replace("buscar por", "").trim();
      callbacks.onSearch(query);
    }
    else if (text.includes("ajuda")) callbacks.onHelp();
  };

  const startListening = () => {
    if (!recognition) return alert("Navegador não suporta comandos de voz.");
    isListening.value = true;
    recognition.start();
  };

  return { isListening, startListening, hasSupport: !!recognition };
}