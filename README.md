# Rewind Radio 📻

> **La máquina del tiempo musical.** Sintonizá las canciones reales que marcaron cada año y país alrededor del mundo a través de una radio 3D interactiva con audio procedural y espectro en tiempo real.

Desarrollado para el **Challenge de Webflow en Nerdearla 2026** por [**Manfred Camacho**](https://www.linkedin.com/in/manfred-camacho).

---

## ✨ Características Principales

- **Radio 3D Interactiva (React Three Fiber & Three.js):**
  - **Diales Minimalistas de Año y País:** Controles circulares con pantalla LED central integrada, física de arrastre (`@use-gesture/react`), inercia rotacional amortiguada y soporte para **rueda del mouse**.
  - **Rango Dinámico de Años:** Desde `1970` hasta el año actual (iniciando por defecto en **Argentina · 1990**).
  - **8 Países Sintonizables:** Argentina (`AR`), Estados Unidos (`US`), Reino Unido (`GB`), Japón (`JP`), Francia (`FR`), Brasil (`BR`), Alemania (`DE`) y México (`MX`).
  - **Sintonizador Horizontal (`#1` a `#10`):** Escala interactiva con aguja digital deslizable para cambiar entre las canciones verificadas de cada año y región.
  - **Display LCD & Marquesina con Recorte por Hardware:** Muestra el nombre completo del país y año en la línea superior y desplaza el título de la canción y artista en la línea inferior.
  - **Espectro Musical 3D en Vivo:** Visualizador de 20 barras reactivas e iluminación dinámica sincronizada con las frecuencias del audio (`AnalyserNode` FFT).

- **Motor de Audio Procedural (Web Audio API):**
  - **100% Procedural:** Ruido rosa de estática FM y clicks mecánicos sintetizados en el navegador sin archivos `.mp3` estáticos.
  - **Coreografía de Sintonización:** Crossfade automático entre la estática de radio mientras se giran las perillas y la pista musical al sintonizar.

- **Pipeline Musical Verificado por Año Exacto (Zero API Keys):**
  - Integración híbrida en el Edge entre **iTunes Search API** y **MusicBrainz Open API**.
  - Filtrado estricto por fecha de publicación (`releaseDate`) e intercalado *Round-Robin* para garantizar variedad de artistas y previews de audio M4A en alta calidad junto a sus portadas originales.

- **Interfaz & Experiencia de Usuario (UI/UX):**
  - **Diálogo de Bienvenida:** Guía rápida interactiva con iconografía de controles para comenzar a escuchar con un clic.
  - **Reproductor en Vivo:** Tarjeta inferior con portada del álbum en alta resolución, ecualizador animado y control directo de reproducción/pausa sobre la carátula.

---

## 🚀 Inicio Rápido

No requiere claves de API ni configuración de servicios externos.

### 1. Clonar e Instalar

```bash
git clone https://github.com/tu-usuario/rewind-radio.git
cd rewind-radio
npm install
```

### 2. Ejecutar en Desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🎮 Controles

| Control | Acción |
|---|---|
| **Dial Izquierdo (`AÑO`)** | Arrastrá o girá la rueda del mouse para elegir el año (`1970` – presente). |
| **Dial Derecho (`PAÍS`)** | Arrastrá o girá la rueda del mouse para cambiar de país (`AR`, `US`, `GB`, `JP`, `FR`, `BR`, `DE`, `MX`). |
| **Sintonizador Horizontal** | Hacé clic o deslizá la aguja naranja entre las posiciones `#1` y `#10` para cambiar de canción. |
| **Portada del Disco (Abajo a la derecha)** | Hacé clic sobre la carátula del álbum para pausar o reanudar la reproducción. |

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16 (App Router + Edge Runtime API)
- **Gráficos 3D & Post-procesado:** Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- **Físicas y Gestos:** `@use-gesture/react`
- **Animaciones 2D:** Framer Motion + Tailwind CSS v4
- **Estado Global:** Zustand
- **Audio:** Web Audio API (`AudioContext`, `AnalyserNode`, síntesis de ruido rosa y osciladores)
- **Fuentes de Datos Musicales:** iTunes Search API + MusicBrainz Open API

---

## 📁 Estructura del Proyecto

```text
src/
├── app/
│   ├── api/tune/route.ts         # Endpoint Edge (iTunes Exact-Year + MusicBrainz)
│   ├── icon.png                  # Favicon de Rewind Radio
│   ├── layout.tsx                # Layout raíz y tipografías
│   └── page.tsx                  # Entrada principal, diálogo inicial y footer
├── components/
│   ├── canvas/
│   │   ├── Scene.tsx             # Escena WebGL, cámara e iluminación simétrica
│   │   ├── RadioBody.tsx         # Chasis 3D de la radio
│   │   ├── Dial.tsx              # Perillas 3D de Año y País con display LED
│   │   ├── HorizontalTuner.tsx   # Sintonizador horizontal de pistas (#1 a #10)
│   │   ├── NixieDisplay.tsx      # Visor central con marquesina de texto
│   │   ├── AudioSpectrum.tsx     # Analizador de espectro 3D (20 barras FFT)
│   │   ├── AudioReactiveLights.tsx # Luces reactivas al ritmo del audio
│   │   └── EraEffects.tsx        # Post-procesado (Bloom + Glitch de sintonía)
│   └── overlay/
│       ├── TrackInfo.tsx         # Reproductor inferior con carátula interactiva
│       └── TuningIndicator.tsx   # Indicador visual de sintonización
├── hooks/
│   └── useTuner.ts               # Debounce, AbortController y sincronización de audio
├── lib/
│   ├── audio-engine.ts           # Singleton Web Audio API
│   └── constants.ts              # Países soportados y rangos de años
├── store/
│   └── useEraStore.ts            # Estado global en Zustand (default: AR · 1990)
└── types/
    └── index.ts                  # Definiciones TypeScript
```

---

## 📦 Build y Despliegue

Optimizado para **Webflow Cloud**, Cloudflare Workers/Pages o Vercel (100% compatible con Edge Runtime, sin assets binarios pesados).

```bash
npm run build
```

---

## 👤 Autor

- **Manfred Camacho** — [LinkedIn](https://www.linkedin.com/in/manfred-camacho)
- Proyecto desarrollado para el **Challenge de Webflow en Nerdearla 2026**.
