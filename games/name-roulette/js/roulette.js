/* roulette.js — dibujo y animación de la ruleta (canvas).
 *
 * Convención de ángulos (la clave para que el resultado visual == lógico):
 *  - El indicador está FIJO arriba (12 en punto).
 *  - El segmento i ocupa, en coordenadas locales de la ruleta y medido en sentido
 *    horario desde arriba, el rango [i·seg, (i+1)·seg).
 *  - Si la ruleta rota `rotation` radianes en sentido horario, el punto local
 *    que queda bajo el indicador es  φ = (−rotation) mod 2π.
 *  - Para ganar con el segmento i basta dejar φ dentro de su rango.
 */
(function (RN) {
  'use strict';

  const { clamp } = RN.utils;
  const TAU = Math.PI * 2;
  const mod = (value, base) => ((value % base) + base) % base;
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  class Roulette {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.items = []; // { label, color, dimmed }
      this.rotation = 0;
      this.spinning = false;
      this.size = 0;
      this.dpr = 1;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement);
      this.resize();
    }

    setItems(items) {
      this.items = items;
      this.draw();
    }

    resetRotation() {
      if (!this.spinning) {
        this.rotation = 0;
        this.draw();
      }
    }

    resize() {
      const width = Math.floor(this.canvas.parentElement.clientWidth);
      if (width < 50) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.size = width;
      this.canvas.width = Math.round(width * this.dpr);
      this.canvas.height = Math.round(width * this.dpr);
      this.draw();
    }

    /** Índice del segmento que está bajo el indicador ahora mismo. */
    indexAtPointer() {
      const count = this.items.length;
      if (!count) return -1;
      const phi = mod(-this.rotation, TAU);
      return Math.min(count - 1, Math.floor(phi / (TAU / count)));
    }

    /**
     * Gira hasta dejar el segmento `targetIndex` bajo el indicador.
     * Resuelve con el índice que REALMENTE queda bajo el indicador.
     */
    spin(targetIndex, { duration = 5000 } = {}) {
      const count = this.items.length;
      if (this.spinning) return Promise.reject(new Error('La ruleta ya está girando.'));
      if (!count || targetIndex < 0 || targetIndex >= count) {
        return Promise.reject(new Error('Índice de ruleta inválido.'));
      }

      this.spinning = true;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const totalMs = reduceMotion ? 900 : duration;

      const seg = TAU / count;
      const jitter = (RN.utils.random() - 0.5) * 0.7; // nunca cerca de los bordes
      const targetLocal = (targetIndex + 0.5 + jitter) * seg;
      const finalRotation = mod(-targetLocal, TAU);
      const start = mod(this.rotation, TAU);
      const extraTurns = reduceMotion ? 1 : 5 + Math.floor(RN.utils.random() * 3);
      const delta = mod(finalRotation - start, TAU) + extraTurns * TAU;

      return new Promise((resolve) => {
        let finished = false;
        let rafId = 0;
        const t0 = performance.now();

        const finish = () => {
          if (finished) return;
          finished = true;
          cancelAnimationFrame(rafId);
          clearTimeout(safetyTimer);
          this.rotation = finalRotation;
          this.spinning = false;
          this.draw();
          resolve(this.indexAtPointer());
        };

        const frame = (now) => {
          if (finished) return;
          const t = clamp((now - t0) / totalMs, 0, 1);
          this.rotation = start + delta * easeOutQuart(t);
          this.draw();
          if (t >= 1) finish();
          else rafId = requestAnimationFrame(frame);
        };

        // Si la pestaña está oculta y el navegador pausa rAF, el giro igual termina.
        const safetyTimer = setTimeout(finish, totalMs + 400);
        rafId = requestAnimationFrame(frame);
      });
    }

    /* ---------------- Dibujo ---------------- */

    draw() {
      const { ctx, size, dpr } = this;
      if (!size) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const center = size / 2;
      const outer = center - 6;
      const radius = outer - 10;

      ctx.save();
      ctx.translate(center, center);
      this.drawRing(outer, radius);

      if (!this.items.length) this.drawPlaceholder(radius);
      else {
        ctx.save();
        ctx.rotate(this.rotation);
        this.items.forEach((item, i) => this.drawSegment(item, i, radius));
        ctx.restore();
      }
      this.drawHub(radius);
      ctx.restore();
    }

    drawRing(outer, radius) {
      const { ctx } = this;
      const ring = ctx.createLinearGradient(-outer, -outer, outer, outer);
      ring.addColorStop(0, '#2b3566');
      ring.addColorStop(0.5, '#10152e');
      ring.addColorStop(1, '#3b2f6b');
      ctx.shadowColor = 'rgba(108, 123, 255, 0.45)';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(0, 0, outer, 0, TAU);
      ctx.fillStyle = ring;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Luces del borde
      const dots = 32;
      for (let i = 0; i < dots; i++) {
        const angle = (i / dots) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * (outer - 5), Math.sin(angle) * (outer - 5), 1.8, 0, TAU);
        ctx.fillStyle = i % 2 ? 'rgba(34, 211, 238, 0.9)' : 'rgba(244, 114, 182, 0.9)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius + 1, 0, TAU);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    drawSegment(item, index, radius) {
      const { ctx } = this;
      const count = this.items.length;
      const seg = TAU / count;
      const start = -Math.PI / 2 + index * seg;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      if (item.dimmed) {
        ctx.fillStyle = 'rgba(8, 10, 22, 0.62)';
        ctx.fill();
      }
      if (count > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Nombre sobre el eje del segmento, de afuera hacia adentro
      const thickness = count === 1 ? radius * 0.6 : 2 * radius * 0.6 * Math.sin(seg / 2);
      const fontSize = clamp(Math.min(this.size / 24, thickness * 0.55), 9, 20);
      const maxWidth = radius * 0.8 - radius * 0.16;

      ctx.save();
      ctx.rotate(start + seg / 2);
      ctx.font = `600 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = item.dimmed ? 'rgba(255,255,255,0.5)' : '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 3;
      ctx.fillText(this.fitText(item.label, maxWidth), radius - 14, 0);
      ctx.restore();
    }

    fitText(text, maxWidth) {
      const { ctx } = this;
      if (ctx.measureText(text).width <= maxWidth) return text;
      let shortened = text;
      while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) {
        shortened = shortened.slice(0, -1);
      }
      return `${shortened}…`;
    }

    drawPlaceholder(radius) {
      const { ctx } = this;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fillStyle = '#121833';
      ctx.fill();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(139,149,181,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.7, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#8b95b5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${clamp(this.size / 24, 13, 20)}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText('Agrega participantes', 0, -radius * 0.58);
      ctx.fillText('para empezar', 0, -radius * 0.58 + clamp(this.size / 18, 20, 28));
    }

    drawHub(radius) {
      const { ctx } = this;
      const hubRadius = radius * 0.13;
      const gradient = ctx.createRadialGradient(0, -hubRadius * 0.3, 2, 0, 0, hubRadius);
      gradient.addColorStop(0, '#3a4585');
      gradient.addColorStop(1, '#0b0f24');
      ctx.beginPath();
      ctx.arc(0, 0, hubRadius, 0, TAU);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#22d3ee';
      ctx.stroke();
    }
  }

  RN.Roulette = Roulette;
})(window.RN);
