# Rewind Radio 📻

> **La máquina del tiempo musical.** Sintonizá las canciones reales que marcaron cada año y país alrededor del mundo a través de una radio 3D interactiva con audio procedural, espectro reactivo en tiempo real y ranking global en el Edge.

Desarrollado para el **Challenge de Webflow en Nerdearla 2026** por [**Manfred Camacho**](https://bit.ly/ln-rewind-radio).

---

## ✨ Características Principales

### 📻 Experiencia 3D Inmersiva (React Three Fiber & Three.js)
- **Diales Minimalistas de Año y País:** Controles circulares 3D con visor LED central integrado, física de arrastre rotacional (`@use-gesture/react`), inercia amortiguada (`THREE.MathUtils.damp`) y soporte para la rueda del ratón (*mouse wheel*).
- **Rango Dinámico:** Desde `1970` hasta el año actual, iniciando en cada visita con una canción aleatoria histórica de **Argentina** para una experiencia fresca y equitativa para el ranking.
- **8 Países Sintonizables:** Argentina (`AR`), Estados Unidos (`US`), Reino Unido (`GB`), Japón (`JP`), Francia (`FR`), Brasil (`BR`), Alemania (`DE`) y México (`MX`).
- **Sintonizador Horizontal Deslizable:** Escala visual interactiva con aguja digital luminosa posicionada al centro al sintonizar, permitiendo navegar entre las canciones del año.
- **Pantalla LCD "MÁS ESCUCHADAS" (Top 7 Global en 3D):**
  - Pantalla retro-ámbar integrada en el chasis izquierdo de la radio.
  - 3 Columnas: `#` (posición), `TÍTULO · ARTISTA` (hasta 40 caracteres completos sin recortes) y `PLAYS` (reproducciones acumuladas).
  - **Sincronización en Vivo:** Resalta automáticamente con fondo iluminado y brillo ámbar la canción que está sonando en ese instante.
  - **Sintonización Directa:** Al hacer clic en cualquier canción del ranking, la radio viaja de inmediato a ese país y año y la reproduce.
- **Display Central & Marquesina:** Muestra el país y año en la línea superior y desplaza suavemente el título y artista con recorte físico de geometría.
- **Espectro Musical 3D y Luces Reactivas:** Ecualizador de 20 barras reactivas e iluminación ambiental sincronizada con las frecuencias del audio vía `AnalyserNode` (FFT).

### 🔊 Motor de Audio Procedural (Web Audio API)
- **100% Procedural (Zero MP3s pesados):** Ruido rosa analógico y clicks mecánicos sintetizados en vivo en el navegador mediante osciladores y buffers de audio.
- **Coreografía de Sintonización:** Crossfade suave entre estática de radio FM al mover los diales y la pista musical al estabilizar la sintonía.

### 💾 Base de Datos Edge (Cloudflare D1 / SQLite en Webflow Cloud)
- **Registro Atómico de Reproducciones:** Endpoint `POST /api/play` que registra una reproducción cuando el usuario escucha una canción por al menos 5 segundos continuos.
- **Ranking Global en Tiempo Real:** Endpoint `GET /api/ranking` con soporte para límite y filtros geográficos.
- **Persistencia Híbrida:** Utiliza Cloudflare D1 en producción (Webflow Cloud) y SQLite local en desarrollo.

### 📊 Telemetría y Grabación de Sesiones (PostHog)
- **Session Replay:** Grabaciones en video de cómo los usuarios y jueces interactúan con los diales y la radio 3D.
- **Eventos Personalizados:** Captura en tiempo real de `tune_era` (país, año, canción), `track_play_completed` y `ranking_track_clicked`.
- **Detección Automática de Entornos:** Etiqueta `environment: "development"` vs `environment: "production"` para separar visitas locales de producción.

---

## 🎮 Controles

| Control | Acción |
|---|---|
| **Dial Izquierdo (`AÑO`)** | Arrastrá o girá la rueda del mouse para cambiar de año (`1970` – presente). |
| **Dial Derecho (`PAÍS`)** | Arrastrá o girá la rueda del mouse para cambiar de país (`AR`, `US`, `GB`, `JP`, etc.). |
| **Sintonizador Horizontal** | Hacé clic o deslizá la aguja naranja para saltar entre las canciones del año. |
| **Pantalla "MÁS ESCUCHADAS"** | Hacé clic sobre cualquier fila del Top 7 para viajar directamente a esa canción. |
| **Portada del Disco (Abajo derecha)** | Hacé clic sobre la carátula del álbum para pausar o reanudar la reproducción. |
| **Botón de Ranking (Arriba derecha)** | Abre el modal flotante con el ranking global detallado y portadas en HD. |

---

## 🚀 Inicio Rápido

### 1. Clonar e Instalar

```bash
git clone https://github.com/tu-usuario/rewind-radio.git
cd rewind-radio
npm install
```

### 2. Variables de Entorno (Opcional)

Si deseas activar la analítica y grabación de sesiones con PostHog, copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Configura tus credenciales:
```env
NEXT_PUBLIC_POSTHOG_KEY=phc_tu_clave_aqui
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Despliegue Objetivo:** Webflow Cloud (Cloudflare Workers / OpenNext Edge Runtime)
- **Base de Datos:** Cloudflare D1 (SQLite en el Edge)
- **Gráficos 3D & Shaders:** Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- **Físicas y Gestos:** `@use-gesture/react`
- **Animaciones 2D:** Framer Motion + Tailwind CSS v4
- **Estado Global:** Zustand
- **Audio:** Web Audio API (`AudioContext`, `AnalyserNode`, generadores de ruido y osciladores)
- **Fuentes Musicales:** Catálogos curados por país/década + iTunes Search API en vivo
- **Analítica:** PostHog (`posthog-js`)

---

## 📁 Estructura del Proyecto

```text
src/
├── app/
│   ├── api/
│   │   ├── play/route.ts         # Endpoint POST: Registro de reproducción (10s)
│   │   ├── ranking/route.ts      # Endpoint GET: Top canciones más escuchadas
│   │   └── tune/route.ts         # Endpoint GET: Sintonización curada
│   ├── icon.png                  # Favicon oficial
│   ├── layout.tsx                # Root layout con PostHogProvider y tipografías
│   └── page.tsx                  # Entrada principal y escena 3D dinámica
├── components/
│   ├── canvas/
│   │   ├── Scene.tsx             # Escena WebGL, iluminación e interactividad
│   │   ├── RadioBody.tsx         # Chasis 3D, varillas divisoras y marco biselado
│   │   ├── Dial.tsx              # Perillas rotacionales de Año y País con display LED
│   │   ├── HorizontalTuner.tsx   # Sintonizador horizontal de estaciones con aguja
│   │   ├── RankingDisplay.tsx    # Pantalla LCD 3D "MÁS ESCUCHADAS" (Top 7 interactivo)
│   │   ├── NixieDisplay.tsx      # Visor LCD central con marquesina de texto
│   │   ├── AudioSpectrum.tsx     # Analizador de espectro 3D (20 barras FFT)
│   │   └── AudioReactiveLights.tsx # Luces reactivas dinámicas al ritmo musical
│   ├── overlay/
│   │   ├── TrackInfo.tsx         # Tarjeta inferior con carátula interactiva
│   │   ├── RankingModal.tsx      # Modal flotante 2D de ranking global
│   │   └── TuningIndicator.tsx   # Indicador visual durante la sintonización
│   └── providers/
│       └── PostHogProvider.tsx   # Proveedor de analítica y Session Replay
├── hooks/
│   ├── useTuner.ts               # Lógica de sintonización, aguja y selección aleatoria
│   ├── useTrackTracker.ts        # Temporizador de 10s para registrar reproducciones
│   └── useAudioAnalyser.ts       # Extracción de frecuencias FFT para la GPU
├── lib/
│   ├── audio-engine.ts           # Singleton Web Audio (estática FM y clicks procedurales)
│   ├── music-catalog.ts          # Carga de catálogos y consulta en vivo a iTunes
│   ├── analytics.ts              # Utilidad tipada para tracking en PostHog
│   ├── db.ts                     # Conector universal SQLite / Cloudflare D1
│   └── constants.ts              # Lista de países y límites de años
├── store/
│   └── useEraStore.ts            # Estado global reactivo en Zustand
└── types/
    └── index.ts                  # Interfaces y tipos TypeScript
```

---

## 📦 Build y Despliegue

El proyecto está diseñado respetando los límites de la capa gratuita de **Webflow Cloud** (bundle servidor ligero, sin procesamiento pesado de audio/3D en backend, 98% del cómputo en la GPU del cliente):

```bash
npm run build
```

---

## 👤 Autor

- **Manfred Camacho** — [LinkedIn](https://bit.ly/ln-rewind-radio)
- Desarrollado con pasión para el **Challenge de Webflow en Nerdearla 2026**.
