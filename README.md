# Rewind Radio 📻

> **La máquina del tiempo musical.** Sintonizá las canciones reales que marcaron cada año y país alrededor del mundo a través de una radio retro analógica interactiva construida en CSS puro de alta fidelidad, audio procedural en tiempo real, sintonizador mecánico y ranking global en el Edge.

Proyecto desarrollado para el **Challenge de Webflow en Nerdearla 2026** por [**Manfred Camacho**](https://bit.ly/ln-manfred-camacho).

---

## ✨ Características Principales

### 📻 Chasis Analógico de Alta Fidelidad (Pure CSS & Micro-Interacciones)
* **Diseño Retro Industrial (Inspiración Braun / Dieter Rams):** Chasis frontal con gradientes metálicos profundos, tornillos Phillips en las esquinas, ranuras acústicas fresadas para el altavoz y serigrafía vintage con relieve y texturas de aluminio CNC.
* **Diales Rotativos Discretos (AÑO y PAÍS):**
  - **Marcas Radiales Exactas:** Arco vintage de 270° con marcas precisas para los **8 países** (`AR`, `BR`, `DE`, `FR`, `GB`, `JP`, `MX`, `US`) y para los años desde **1970 hasta 2024** con décadas destacadas (`'70`, `'80`, `'90`, `'00`, `'10`, `'20`, `'24`).
  - **Clic Directo en Marcas:** Podés hacer clic directamente sobre cualquier rayita radial, país o década para que el dial salte inmediatamente a esa posición.
  - **Detents Mecánicos Discretos:** La perilla gira con saltos discretos audibles (*clicks* mecánicos sintetizados en Web Audio) y muesca iluminada en ámbar que apunta a la marca seleccionada.
  - **Controles Auxiliares:** Botones táctiles paso a paso (`‹` y `›`), soporte para arrastre natural con sensibilidad calibrada y rueda del ratón (*mouse wheel*).
* **Sintonizador Horizontal de 10 Emisoras:**
  - Riel analógico iluminado con 10 marcas de estación equidistantes y botones directos del `#1` al `#10`.
  - Aguja digital luminosa con bombilla central calibrada al subpíxel para alinearse de forma matemática perfecta sobre el centro de cada estación.
  - Soporte de arrastre continuo con inercia o clic directo para cambiar de tema dentro del año.
* **Fader Vertical de Volumen Analógico:**
  - Deslizador vertical de 0 a 10 con hendidura metálica, muescas luminosas y ranura central.
  - **LED POWER Verde:** Indicador luminoso de sistema encendido posicionado directamente a la derecha del volumen con halo emissive (`#00ff88`) y texto serigrafiado vertical.
* **Botonera Física Vintage:**
  - Trío de botones mecánicos con efecto de pulsación táctil: **Anterior** (`⏮`), **Play/Pausa** (`⏯`) y **Siguiente** (`⏭`).
* **Botón RANDOM (Shuffle Total):**
  - Sintoniza al instante un año al azar, un país al azar **y una pista aleatoria dentro del Top 10** de ese año.
* **Pantallas LCD e Información en Vivo:**
  - **Main Display:** Marquesina superior con país, año y desplazamiento continuo de Título y Artista.
  - **Visualizador de Espectro:** Ecualizador gráfico de barras animadas en tiempo real debajo de la marquesina.
  - **Visor LCD "MÁS ESCUCHADAS":** Ranking en vivo del Top canciones más reproducidas con número de plays e indicador animado de la canción sonando actualmente. Clickeable para viajar inmediatamente a esa canción.
  - **Tarjeta Flotante de Reproducción:** Portada del álbum en alta resolución, botón play/pausa sobre la carátula y enlaces directos a Spotify, YouTube y Apple Music para escuchar el tema completo.

---

### 🔊 Motor de Audio Procedural (Web Audio API)
* **100% Procedural en el Cliente:** Cero archivos MP3 pesados para efectos de sonido.
* **Estática FM Analógica:** Generador de ruido rosa y sonido heterodino sintetizados mediante `AudioBuffer` y osciladores matemáticos.
* **Clicks Mecánicos Táctiles:** Pulsos de 4 ms generados dinámicamente al girar diales, mover faders o presionar botones.
* **Transiciones Suaves (Cross-fades):** Al sintonizar o cambiar de emisora, la música anterior se desvanece suavemente, suena la estática FM analógica con un click mecánico (~600 ms) y se reproduce la nueva pista.
* **Análisis de Frecuencias:** `AnalyserNode` FFT de 64 bandas para alimentar el ecualizador gráfico.

---

### 🌐 Backend Híbrido & Caché de 3 Niveles (Webflow Cloud / Cloudflare Workers)
* **Arquitectura Ultra-Ligera (100% compatible con Edge/Workers):**
  - Sin dependencias de Node.js (`fs`, `path` o binarios nativos) en el backend.
  - Todos los catálogos históricos están empaquetados en memoria (~200 KB en total), asegurando lectura en **0 ms** sin llamadas a disco.
* **Resolución en Servidor con Deezer API:**
  - Búsqueda en paralelo en el servidor con Deezer API, superando por completo las limitaciones de CORS y los bloqueos de rate-limit (`429 Too Many Requests`) de Apple Akamai.
  - Previews en formato MP3 con cabecera `Access-Control-Allow-Origin: *` para compatibilidad total con `AudioContext`.
* **Caché Multinivel:**
  1. *Memory Cache:* `Map` en el Worker para responder en **< 1 ms** a consultas repetidas.
  2. *CDN Cache:* Cabeceras HTTP `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.
  3. *Seed Cache:* Fallback instantáneo con pistas pre-calculadas en caso de fallos de conectividad externa.

---

### 💾 Base de Datos Edge (SQLite / Cloudflare D1)
* **Registro Atómico:** Endpoint `POST /api/play` que registra una reproducción cuando el usuario escucha una canción por al menos 5 segundos continuos (evitando conteos accidentales).
* **Ranking Global:** Endpoint `GET /api/ranking` con soporte para filtrado por país y límite de resultados.
* **Modal Completo de Ranking:** Diálogo flotante con buscador, filtros por banderas de países, conteo de plays y acceso directo a cada canción.

---

### 📊 Telemetría y Analítica (PostHog)
Seguimiento completo de interacciones de usuario y Session Replay para optimizar la experiencia:
1. `onboarding_started`: Clic en modal inicial o botón "Escuchar radio".
2. `creator_link_clicked`: Clic en enlace de LinkedIn en el footer.
3. `tune_era`: Sintonización resuelta (país, año, título, artista).
4. `auto_advance_track`: Transición automática al finalizar la pista actual.
5. `auto_advance_year`: Avance de año al terminar las 10 canciones del año.
6. `auto_advance_country`: Avance de país al superar el año máximo.
7. `tuner_track_selected`: Selección de pista en sintonizador horizontal.
8. `tuner_station_button_clicked`: Clic específico en botón de emisora (`#1` a `#10`).
9. `dial_year_changed`: Cambio de año en dial rotativo.
10. `dial_country_changed`: Cambio de país en dial rotativo.
11. `dial_mark_clicked`: Clic directo en marca radial o etiqueta del dial (`label`, `value`, `index`).
12. `dial_stepper_clicked`: Clic en botones `‹` o `›` del dial (`prev` / `next`).
13. `random_tune_clicked`: Activación del modo RANDOM (`country`, `year`, `track_index`).
14. `playback_prev_clicked`: Pulsación del botón físico Anterior.
15. `playback_play_pause_clicked`: Pulsación del botón físico Play/Pausa.
16. `playback_next_clicked`: Pulsación del botón físico Siguiente.
17. `volume_changed`: Ajuste de nivel en el fader de volumen analógico.
18. `ranking_track_clicked`: Clic en una fila del visor LCD de más escuchadas.
19. `ranking_modal_opened`: Apertura del modal de ranking global.
20. `ranking_modal_closed`: Cierre del modal de ranking.
21. `ranking_modal_country_filtered`: Filtrado por país en el modal de ranking.
22. `ranking_modal_track_clicked`: Selección de tema desde el modal de ranking.
23. `playback_toggled`: Clic en la carátula flotante para reproducir/pausar.
24. `external_player_clicked`: Clic en enlaces de Spotify, YouTube o Apple Music.
25. `track_play_completed`: Canción escuchada por más de 5 segundos continuos.

---

## 🎮 Controles de la Radio

| Control | Acción |
|---|---|
| **Dial AÑO** | Arrastrá con el mouse, girá la rueda o **hacé clic en cualquier marca/década** para viajar entre 1970 y 2024. |
| **Dial PAÍS** | Arrastrá, girá la rueda o **hacé clic en cualquier código de país** (`AR`, `US`, `GB`, `JP`, etc.). |
| **Sintonizador Horizontal** | Hacé clic en los números `#1` al `#10` o arrastrá la aguja luminosa para cambiar de tema. |
| **Botón RANDOM** | Sintonizá una combinación sorpresa de país, año y canción del Top 10. |
| **Botones Físicos (`⏮`, `⏯`, `⏭`)** | Retrocedé, pausá/reanudá o avanzá de canción manualmente. |
| **Fader de Volumen** | Deslizá verticalmente o usá la rueda del ratón para ajustar el volumen analógico. |
| **Visor LCD Más Escuchadas** | Hacé clic en cualquier tema del top para reproducirlo inmediatamente. |
| **Ranking Global (Arriba Izq.)** | Abre el panel completo con filtros por país y podio de popularidad. |
| **Carátula (Arriba Der.)** | Tocá la imagen para alternar Play/Pausa o abrila en Spotify/YouTube/Apple Music. |

---

## 🚀 Inicio Rápido en Local

### 1. Clonar e Instalar Dependencias

```bash
git clone https://github.com/mannydev96/rewind-radio.git
cd rewind-radio
npm install
```

### 2. Variables de Entorno (Opcional para Analytics y D1)

Copiá `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Configurá las variables si deseás capturar telemetría en PostHog:
```env
NEXT_PUBLIC_POSTHOG_KEY=phc_tu_clave_posthog
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🛠️ Stack Tecnológico

* **Framework:** Next.js 16 (App Router + Turbopack)
* **Despliegue Objetivo:** Webflow Cloud (Cloudflare Workers vía OpenNext Edge Runtime)
* **Base de Datos:** Cloudflare D1 (SQLite en Edge) en producción / SQLite local en desarrollo
* **Diseño e Interfaz:** Pure CSS + Tailwind CSS v4 + Framer Motion (cero dependencias pesadas de 3D)
* **Motor de Sonido:** Web Audio API nativa (`AudioContext`, `AnalyserNode`, `OscillatorNode`, ruido rosa procedural)
* **Catálogo Musical:** Catálogos históricos curados por país/año + Deezer API con resolución en servidor y previews MP3 con CORS abierto
* **Analítica & Telemetría:** PostHog (`posthog-js`) con Session Replay y tracking de eventos
* **Iconografía:** Lucide React

---

## 📦 Build para Producción

Cumple estrictamente los límites de la capa gratuita de **Webflow Cloud** (Cold start < 400 ms, bundle de servidor ligero, sin lectura de sistema de archivos `fs`, cómputo visual y de audio en el navegador):

```bash
npm run build
```

---

## 👤 Autor

* **Manfred Camacho** — [LinkedIn](https://bit.ly/ln-manfred-camacho)
* Desarrollado para el **Challenge de Webflow en Nerdearla 2026**.
