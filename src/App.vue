<template>
  <div id="app">
    <A11yPanel 
      @voice-search="handleGlobalSearch"
      @voice-view-change="handleGlobalViewChange"
    />
    
    <router-view />
  </div>
</template>

<script setup>
import A11yPanel from "@/components/A11yPanel.vue";
import { useRouter } from "vue-router";
// Importação direta do CSS para garantir que ele carregue antes de tudo
import "@/assets/a11y.css"; 

const router = useRouter();

const handleGlobalSearch = (term) => {
  // A busca agora aceita endereços ou termos gerais
  router.push({ name: 'explore', query: { q: term, searchMode: 'textual' } });
};

const handleGlobalViewChange = (mode) => {
  router.push({ name: 'explore', params: { viewMode: mode } });
};
</script>