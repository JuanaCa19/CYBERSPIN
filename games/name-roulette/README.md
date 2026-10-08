# 🎡 Ruleta Inteligente de Nombres

Aplicación web para seleccionar nombres al azar con una ruleta animada, un **modo justo**, rondas, historial, estadísticas y persistencia local. Sin frameworks, sin backend y sin dependencias.

## Funcionalidades

- Ruleta en `canvas` con un segmento por participante, indicador fijo y desaceleración progresiva.
- **Modo aleatorio** (misma probabilidad) y **modo justo** (reduce la probabilidad de quien ya salió más veces). El modo activo se muestra siempre en la cabecera.
- **Rondas**: dentro de una ronda nadie se repite. Al terminar aparece "¡Todos participaron!" y el botón **Nueva ronda** reinicia la participación sin borrar nombres.
- **Selección múltiple** (1 a 5 personas distintas por ejecución), con un giro por cada persona.
- **Participantes**: agregar, agregar varios (uno por línea), editar y eliminar con confirmación. Se recortan espacios y se rechazan vacíos y duplicados (sin distinguir mayúsculas ni tildes).
- **Historial** con número, nombre, ronda y fecha/hora; limpieza con confirmación.
- **Estadísticas** en vivo: participantes, ronda, seleccionados, giros, más y menos seleccionado.
- **Persistencia** en `localStorage` (participantes, historial, ronda, modo, cantidad y estadísticas), con validación de datos corruptos y **Restablecer todo** con confirmación.
- Diseño oscuro, responsive (sin scroll horizontal), accesible (foco visible, `aria-label`, `prefers-reduced-motion`), con avisos visuales y modales en lugar de `alert()`.

## Cómo ejecutar

Abre `index.html` con doble clic en cualquier navegador moderno. No requiere servidor ni instalación.
Opcional: `npx serve .` o `python3 -m http.server` dentro de la carpeta.

> Los scripts son clásicos (no `type="module"`) para que funcione al abrir el archivo directamente con `file://`, donde los módulos ES son bloqueados. Cada archivo expone su API en el espacio de nombres `RN`.

## Estructura

```
ruleta-nombres/
├── index.html
├── css/styles.css
├── js/
│   ├── utils.js          # helpers: limpieza de nombres, aleatorio, DOM seguro
│   ├── storage.js        # localStorage + validación/saneamiento
│   ├── participants.js   # lógica pura: participantes, rondas, selección, estadísticas
│   ├── roulette.js       # dibujo y animación de la ruleta (canvas)
│   └── app.js            # estado, render, eventos, modales, flujo de giro
└── README.md
```

## Tecnologías

HTML5, CSS3 y JavaScript vanilla (Canvas 2D, `<dialog>`, `localStorage`, `crypto.getRandomValues`).

## Cómo funciona el modo justo

Entre quienes aún no han participado en la ronda, cada persona recibe un peso:

```
peso = 1 / (1 + ventaja)²     ventaja = veces elegida − veces que salió quien menos ha salido
```

Quien salió menos pesa **1**; con una vez más pesa **0,25**; con dos más, **0,11**. El peso nunca llega a cero, así que el azar sigue existiendo. En modo aleatorio todos pesan 1.
Los segmentos de la ruleta son siempre del mismo tamaño: la ponderación se aplica al elegir el ganador, no al dibujo.

## Por qué el resultado visual y el lógico coinciden

1. La lógica elige primero al ganador (índice `i`).
2. La ruleta calcula el ángulo final para dejar el centro del segmento `i` bajo el indicador (con una pequeña variación que nunca toca los bordes).
3. Al terminar, la ruleta lee qué segmento queda realmente bajo el indicador y la app registra **ese** resultado.

## Posibles mejoras futuras

- Exportar e importar participantes (CSV / JSON).
- Sonidos de giro y resultado (con interruptor de silencio).
- Varias listas guardadas, por ejemplo por clase o equipo.
- Pesos manuales por participante y reglas de exclusión.
- Compartir la lista mediante un enlace.
- Pruebas automatizadas para `participants.js` y `storage.js`.
