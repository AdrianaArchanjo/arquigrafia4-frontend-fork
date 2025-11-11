<template>
  <section class="accessible-map mt-3" aria-labelledby="mapTitle">
    <h3 id="mapTitle" class="h6 mb-2">Mapa Interativo</h3>

    <!-- Contêiner do mapa -->
    <div
      :id="mapId"
      class="map-container"
      role="application"
      tabindex="0"
      aria-label="Mapa de localização"
    ></div>

    <!-- Descrição textual -->
    <p class="text-muted mt-2">{{ description }}</p>

    <!-- Coordenadas e link alternativo -->
    <div v-if="latitude && longitude" class="mt-2">
      <p>
        <strong>Coordenadas:</strong> {{ latitude }}, {{ longitude }}
      </p>
      <a
        :href="`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`"
        target="_blank"
        rel="noopener"
        class="btn btn-outline-secondary btn-sm"
        aria-label="Abrir mapa completo da localização no OpenStreetMap em nova aba"
      >
        Ver no OpenStreetMap
      </a>
    </div>
  </section>
</template>

<script>
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default {
  name: 'MapAccessible',
  props: {
    title: String,
    description: String,
    latitude: Number,
    longitude: Number
  },
  data() {
    return {
      mapId: 'map-' + Math.random().toString(36).substr(2, 9) // ID único
    };
  },
  mounted() {
    if (!this.latitude || !this.longitude) return;

    // Inicializa o mapa com OSM
    const map = L.map(this.mapId, {
      center: [this.latitude, this.longitude],
      zoom: 15,
      scrollWheelZoom: false, // evita navegação acidental
      keyboard: true // habilita uso por teclado
    });

    // Adiciona camada do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
    }).addTo(map);

    // Adiciona marcador acessível
    const marker = L.marker([this.latitude, this.longitude])
      .addTo(map)
      .bindPopup(`<strong>${this.title}</strong><br>${this.description}`);

    // Foco visível no container
    const mapContainer = document.getElementById(this.mapId);
    mapContainer.addEventListener('focus', () => {
      mapContainer.style.outline = '3px solid #AA4F28';
      mapContainer.style.outlineOffset = '4px';
    });
    mapContainer.addEventListener('blur', () => {
      mapContainer.style.outline = 'none';
    });
  }
};
</script>

<style scoped>
.map-container {
  height: 250px;
  border-radius: 8px;
  background-color: #f8f9fa;
  outline: none;
}

.map-container:focus {
  outline: 3px solid #AA4F28;
  outline-offset: 4px;
}
</style>
