# 🏹 Student Dart — apuntado manual

El profesor apunta con el ratón y dispara una flecha; **el sector donde impacta decide al estudiante**. No hay selección aleatoria.

- `aim.js` — matemática pura (ratón → objetivo en la diana → dirección del arco → rayo ∩ plano → sector). Sin DOM ni Three.js.
- `index.html` — escena Three.js (diana, arco con cuerda, flecha con plumas), estudiantes, preguntas y pantallas.
- `tests/aim.test.js` — `node games/student-dart/tests/aim.test.js`.

## Reglas
- Ratón horizontal = yaw del arco; vertical = elevación. Zona apuntable limitada a ±4.8 × ±4.2 (la diana tiene radio 3).
- Disparo: `SPACE` o `SHOOT ARROW` (tensión → suelta → vuelo por el rayo apuntado → impacto).
- Sectores iguales hasta el centro, el 0 empieza arriba y avanza en sentido antihorario; intervalos semiabiertos (un borde nunca selecciona a dos); centro exacto = sector 0.
- Fuera del radio de la diana = `MISSED!` (nadie se elimina y se puede disparar de nuevo).
- Acierto: el estudiante sale de `avail` al instante, se muestra el panel, y al `CONTINUE` su sector desaparece y los demás se reorganizan. `ALL` y el almacenamiento no cambian; `PLAY AGAIN` restaura todos.
