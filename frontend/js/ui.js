import { sessao } from './api.js';

// Escapa texto antes de inserir no HTML (proteção contra XSS)
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M9 16v-5M14 16V8M19 16v-9"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  book: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 14v4M8 21h8M9 18h6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v3h3M4 13a8 8 0 0 0 14.9 3M20 19v-3h-3"/>',
};
export const icon = (nome, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nome] || ''}</svg>`;

// Cores e ícones por disciplina
export const discInfo = nome => (nome === 'Português'
  ? { cor: 'verde', icone: 'book', sigla: 'Port' }
  : { cor: 'azul', icone: 'calc', sigla: 'Mat' });

export const fmtNota = n => (n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 }));
export const fmtData = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtDataCurta = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
export const fmtTempo = seg => {
  const m = Math.floor(seg / 60), s = seg % 60;
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min ${String(s).padStart(2, '0')} s`;
};
export const iniciais = nome => (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
export const LETRAS = ['A', 'B', 'C', 'D', 'E'];

let toastTimer;
export function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.className = `mostrar ${tipo}`;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ''), 3500);
}

// Diálogo de confirmação acessível (substitui window.confirm)
export function confirmar({ titulo, texto, ok = 'Confirmar', perigo = false }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = `<h2>${esc(titulo)}</h2><p>${esc(texto)}</p>
      <div class="modal-acoes"><button class="btn btn-sec" value="n">Cancelar</button>
      <button class="btn ${perigo ? 'btn-perigo' : 'btn-pri'}" value="s">${esc(ok)}</button></div>`;
    document.body.append(d);
    d.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { d.close(); resolve(b.value === 's'); }));
    d.addEventListener('cancel', () => resolve(false));
    d.addEventListener('close', () => d.remove());
    d.showModal();
    d.querySelector('[value="s"]').focus();
  });
}

export const carregando = (txt = 'Carregando…') => `<div class="estado"><span class="spinner"></span><p>${esc(txt)}</p></div>`;
export const erroTela = (msg, acao = '') => `<div class="estado erro">${icon('alert')}<p>${esc(msg)}</p>${acao}</div>`;

// Navegação: barra inferior no celular, lateral no desktop
const NAV = {
  aluno: [['#/inicio', 'home', 'Início'], ['#/simulados', 'file', 'Simulados'], ['#/relatorios', 'chart', 'Relatórios'], ['#/perfil', 'user', 'Perfil']],
  professor: [['#/prof/painel', 'grid', 'Painel'], ['#/prof/questoes', 'pen', 'Questões'], ['#/prof/simulados', 'layers', 'Simulados'], ['#/perfil', 'user', 'Perfil']],
};
export function layout(conteudo, rotaAtiva) {
  const u = sessao.usuario;
  const itens = NAV[u?.perfil] || [];
  const links = itens.map(([href, ic, txt]) =>
    `<a href="${href}" class="${rotaAtiva.startsWith(href) ? 'ativo' : ''}" ${rotaAtiva.startsWith(href) ? 'aria-current="page"' : ''}>${icon(ic)}<span>${txt}</span></a>`).join('');
  return `<div class="shell">
    <nav class="nav" aria-label="Menu principal">
      <div class="nav-marca">${icon('book')}<strong>Simulado IFMA</strong></div>
      ${links}
      <div class="nav-rodape"><span class="avatar mini">${esc(iniciais(u?.nome))}</span><span>${esc(u?.nome)}<small>${u?.perfil === 'professor' ? 'Professor' : 'Aluno'}</small></span></div>
    </nav>
    <main class="conteudo">${conteudo}</main>
  </div>`;
}

export const hero = (titulo, sub = '', extra = '') =>
  `<header class="hero"><div class="hero-in"><div><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${extra}</div></header>`;
