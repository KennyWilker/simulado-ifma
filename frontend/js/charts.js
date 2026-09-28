import { esc, fmtNota } from './ui.js';

// Gráfico de barras em SVG puro (sem bibliotecas externas)
export function barras(dados, { max = 10 } = {}) {
  if (!dados.length) return '';
  const W = 320, H = 190, pl = 28, pb = 26, pt = 18;
  const larg = (W - pl - 10) / dados.length;
  const y = v => pt + (H - pt - pb) * (1 - v / max);
  const grade = [0, 2.5, 5, 7.5, 10].map(v =>
    `<line x1="${pl}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="grade"/><text x="${pl - 6}" y="${y(v) + 4}" class="eixo" text-anchor="end">${v}</text>`).join('');
  const bs = dados.map((d, i) => {
    const x = pl + i * larg + larg * 0.2, w = larg * 0.6;
    return `<g><rect x="${x}" y="${y(d.valor)}" width="${w}" height="${Math.max(0, H - pb - y(d.valor))}" rx="6" class="barra ${d.cor || 'azul'}"/>
      <text x="${x + w / 2}" y="${y(d.valor) - 6}" text-anchor="middle" class="rotulo">${d.vazio ? '—' : fmtNota(d.valor)}</text>
      <text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" class="eixo">${esc(d.rotulo)}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="${esc(dados.map(d => `${d.rotulo}: ${fmtNota(d.valor)}`).join(', '))}">${grade}${bs}</svg>`;
}

// Gráfico de linha (evolução das notas)
export function linha(pontos, { max = 10 } = {}) {
  if (!pontos.length) return '';
  const W = 320, H = 180, pl = 28, pr = 14, pb = 26, pt = 16;
  const x = i => (pontos.length === 1 ? (W + pl) / 2 : pl + 8 + i * ((W - pl - pr - 16) / (pontos.length - 1)));
  const y = v => pt + (H - pt - pb) * (1 - v / max);
  const grade = [0, 5, 10].map(v =>
    `<line x1="${pl}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="grade"/><text x="${pl - 6}" y="${y(v) + 4}" class="eixo" text-anchor="end">${v}</text>`).join('');
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = `${d} L${x(pontos.length - 1).toFixed(1)},${H - pb} L${x(0).toFixed(1)},${H - pb} Z`;
  const pts = pontos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.valor)}" r="4.5" class="ponto"><title>${esc(p.rotulo)}: ${fmtNota(p.valor)}</title></circle>
    <text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="eixo">${esc(p.rotulo)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img" aria-label="Evolução das notas">${grade}<path d="${area}" class="area"/><path d="${d}" class="linha"/>${pts}</svg>`;
}
