# 🎁 Mystery Boxes

Juego 3D (Three.js r128) para elegir estudiantes al azar con cajas misteriosas. Se abre desde el menú principal (tarjeta **MYSTERY BOXES**).

## Estructura (`window.MysteryBoxesGame`)
| Módulo | Responsabilidad |
|---|---|
| `js/roundManager.js` | **Lógica pura**: ALL / AVAILABLE STUDENTS, selección, resultados. Probable con Node. |
| `js/studentManager.js` | Lista registrada (reutiliza `ArenaDB`, compartida con los otros juegos). |
| `js/questionManager.js` | Preguntas: usa `shared/question-bank.js` y `localStorage` `ebr.c` / `ebr.q` (iguales que Bomb Race). |
| `js/boxManager.js` | Escena 3D: cajas, shuffle, selección, apertura, partículas, cámara. |
| `js/uiManager.js` | HUD, banners, panel de pregunta, pantallas, diálogos. |
| `js/resultManager.js` | Historial de la ronda y resumen final. |
| `js/audioManager.js` | Sonidos WebAudio (comparte `snd`/`vol` con Bomb Race). |
| `js/game.js` | Controlador del flujo y acciones. |

## Regla de la ronda
`AVAILABLE = ALL` al empezar. Al seleccionar: `AVAILABLE = AVAILABLE − seleccionado` (antes de la pregunta, sin importar si acierta). `PLAY AGAIN` crea una ronda nueva copiando de nuevo todos los estudiantes registrados.

## Probar que nadie se repite
- Node: `node games/mystery-boxes/tests/roundManager.test.js`
- Navegador (consola): `MysteryBoxesGame.selfTest(500)` → `{ duplicates: 0, passed: true }`
