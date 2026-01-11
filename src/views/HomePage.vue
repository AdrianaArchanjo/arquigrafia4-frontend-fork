<template>
  <div class="homepage-layout">
    <div class="tabs-container px-3 px-md-4">
      <ul class="nav nav-underline tabs-nav">
        <li class="nav-item">
          <button class="nav-link active" aria-current="page">Acervo</button>
        </li>
        <li class="nav-item">
          <button class="nav-link">Percurso</button>
        </li>
        <li class="nav-item">
          <button class="nav-link">Coleções</button>
        </li>
      </ul>
    </div>

    <main id="main-content" role="main">
      <template v-if="hasNoResults">
        <no-search-results
          @clear="handleClearSearch"
          @new-search="handleNewSearch"
        />
      </template>

      <template v-else>
        <div v-if="viewMode === 'grid'" class="px-3 px-md-4 pb-4 pt-2">
          <view-grid />
        </div>
        <div v-else-if="viewMode === 'mosaic'">
          <view-mosaic />
        </div>
        <div v-else>
          <view-map />
        </div>
      </template>
    </main>

    <div class="toolbar-wrapper">
      <template v-if="isMobile">
        <page-toolbar-mobile
          :view-selection="viewSelection"
          :search-mode="searchMode"
          @search-mode-change="handleMobileSearchModeChange"
          @open-view-menu="openViewMenu"
          @open-search-text="openSearchText"
          @open-search-color="openSearchColor"
          @open-search-date="openSearchDate"
        />
      </template>
      <template v-else>
        <page-toolbar
          :search-mode="searchMode"
          :text-query="textQuery"
          :date-range="dateRange"
          :color="selectedColor"
          :advanced-filters="advancedFilters"
          :view-selection="viewSelection"
          :map-settings="mapSettings"
          @search-mode-change="handleToolbarSearchModeChange"
          @update:text-query="handleTextQueryUpdate"
          @update:date-range="handleDateRangeUpdate"
          @update:color="handleColorUpdate"
          @update:map-settings="handleMapSettingsUpdate"
          @view-change="handleViewChange"
          @open-advanced-search="openAdvancedSearch"
          @confirm="handleToolbarConfirm"
        />
      </template>
    </div>

    <mobile-drawer-view-menu v-model="drawerViewMenu" @select="handleMobileViewChange" />
    <mobile-drawer-search-text v-model="drawerSearchText" :filters="advancedFilters" @confirm="confirmAdvancedSearch" />
    <mobile-drawer-search-color v-model="drawerSearchColor" :available-colors="availableColors" :value="selectedColor" @confirm="confirmColor" />
    <mobile-drawer-search-date v-model="drawerSearchDate" :value="dateRange" @confirm="handleDateRangeUpdate" />
    <advanced-search-modal v-model="modalAdvancedSearch" :filters="advancedFilters" @confirm="confirmAdvancedSearch" />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useRouteQuery } from "@vueuse/router";
import { useBreakpoints } from "@vueuse/core";

// --- IMPORTAÇÕES DE COMPONENTES ---
import PageToolbar from "@/components/Toolbar.vue";
import PageToolbarMobile from "@/components/ToolbarMobile.vue";
import MobileDrawerSearchDate from "@/components/homepage/MobileDrawerSearchDate.vue";
import MobileDrawerSearchColor from "@/components/homepage/MobileDrawerSearchColor.vue";
import MobileDrawerViewMenu from "@/components/homepage/MobileDrawerViewMenu.vue";
import MobileDrawerSearchText from "@/components/homepage/MobileDrawerSearchText.vue";
import AdvancedSearchModal from "@/components/homepage/AdvancedSearchModal.vue";
import ViewGrid from "@/components/homepage/ViewGrid.vue";
import ViewMap from "@/components/homepage/ViewMap.vue";
import ViewMosaic from "@/components/homepage/ViewMosaic.vue";
import NoSearchResults from "@/components/homepage/NoSearchResults.vue";

// --- UTILITÁRIOS ---
import { selectionToViewMode, selectionToViewRoute, viewRouteToSelection } from "@/constants/viewModes";
import { useSearchQuery } from "@/composables/useSearchQuery";
import { api } from "@/services/api";
import createDefaultAdvancedFilters from "@/helpers/createDefaultAdvancedFilters";

const route = useRoute();
const router = useRouter();
const breakpoints = useBreakpoints({ md: 768 });
const isMobile = breakpoints.smaller("md");

const viewSelection = ref(viewRouteToSelection(route.params.viewMode) || 'grid');
const viewMode = computed(() => selectionToViewMode(viewSelection.value));

const { searchMode, loadSnapshot, setSearchMode, submitSearch } = useSearchQuery();

const textQuery = ref("");
const dateRange = ref({ start: "", end: "" });
const selectedColor = ref(null);
const advancedFilters = ref(createDefaultAdvancedFilters());
const mapSettingsQuery = useRouteQuery("map-settings", "2d");
const hasNoResults = ref(false);
const isSearching = ref(false);

const availableColors = ref(["#000000", "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"]);

// --- LÓGICA DE BUSCA E SINCRONIZAÇÃO ---

function normalizeMapSettings(value) { return value === "3d" ? "3d" : "2d"; }
const mapSettings = ref(normalizeMapSettings(mapSettingsQuery.value));

function syncFromSnapshot(mode) {
  const snapshot = loadSnapshot(mode);
  if (!snapshot) return;
  switch (snapshot.mode) {
    case "textual": textQuery.value = snapshot.value || ""; break;
    case "data": dateRange.value = snapshot.value || { start: "", end: "" }; break;
    case "cor": selectedColor.value = snapshot.value || null; break;
    case "avancada": advancedFilters.value = { ...createDefaultAdvancedFilters(), ...snapshot.value }; break;
  }
}

onMounted(() => {
  syncFromSnapshot(searchMode.value);
  // Se já houver uma busca na URL ao carregar (vindo da barra global)
  if (route.query.q) handleVoiceSearch(route.query.q);
});

watch(() => searchMode.value, (mode) => syncFromSnapshot(mode));

// ESCUTA A URL: Se a barra global no App.vue mudar a URL, a Home reage aqui
watch(() => route.query.q, (newTerm) => {
  if (newTerm) handleVoiceSearch(newTerm);
});

async function performSearch({ mode, value }) {
  isSearching.value = true;
  try {
    const result = await api.searchImages({ mode, value });
    hasNoResults.value = result.items.length === 0;
  } catch (error) {
    console.error("Erro na busca:", error);
  } finally {
    isSearching.value = false;
  }
}

// --- HANDLERS ---

async function handleVoiceSearch(term) {
  if (!term) return;
  textQuery.value = term;
  await handleToolbarSearchModeChange("textual");
  handleToolbarConfirm({ mode: "textual", value: term });
}

async function handleToolbarConfirm({ mode, value }) {
  submitSearch({ mode, value });
  await performSearch({ mode, value });
}

async function handleToolbarSearchModeChange(mode) {
  await setSearchMode(mode, { replace: true });
  syncFromSnapshot(mode);
}

function handleViewChange({ selection }) {
  viewSelection.value = selection;
  const targetRoute = selectionToViewRoute(selection);
  router.push({ name: "explore", params: { viewMode: targetRoute }, query: route.query });
}

// UI Handlers
const drawerViewMenu = ref(false);
const drawerSearchText = ref(false);
const drawerSearchColor = ref(false);
const drawerSearchDate = ref(false);
const modalAdvancedSearch = ref(false);

function openAdvancedSearch() { modalAdvancedSearch.value = true; }
function openViewMenu() { drawerViewMenu.value = true; }
function openSearchText() { drawerSearchText.value = true; }
function openSearchColor() { drawerSearchColor.value = true; }
function openSearchDate() { drawerSearchDate.value = true; }

async function confirmAdvancedSearch(payload) {
  advancedFilters.value = { ...createDefaultAdvancedFilters(), ...payload };
  handleToolbarConfirm({ mode: "avancada", value: advancedFilters.value });
  modalAdvancedSearch.value = false;
}

async function confirmColor(color) {
  selectedColor.value = color;
  handleToolbarConfirm({ mode: "cor", value: color });
  drawerSearchColor.value = false;
}

function handleTextQueryUpdate(val) { textQuery.value = val; }
function handleDateRangeUpdate(val) { dateRange.value = val; }
function handleColorUpdate(val) { selectedColor.value = val; }
function handleMapSettingsUpdate(val) { mapSettings.value = normalizeMapSettings(val); mapSettingsQuery.value = val; }
function handleMobileViewChange({ selection }) { handleViewChange({ selection }); drawerViewMenu.value = false; }
function handleMobileSearchModeChange(mode) { handleToolbarSearchModeChange(mode); }
function handleClearSearch() { textQuery.value = ""; hasNoResults.value = false; }
function handleNewSearch() { hasNoResults.value = false; isMobile.value ? openSearchText() : openAdvancedSearch(); }
</script>

<style scoped>
.homepage-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.tabs-container { padding-top: 1rem; background: transparent; }
.tabs-nav { border-bottom: 1px solid #dee2e6; margin-bottom: 1rem; }
#main-content { flex: 1; position: relative; }
.toolbar-wrapper {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: auto;
  max-width: 95vw;
}
main { padding-bottom: 100px; }
</style>