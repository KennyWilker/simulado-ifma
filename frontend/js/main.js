import { sessao, acordarServidor } from './api.js';
import { toast } from './ui.js';
import * as auth from './views/auth.js';
import * as aluno from './views/aluno.js';
import { perfil } from './views/perfil.js';
import * as prof from './views/professor.js';

const raiz = document.getElementById('app');

// Rotas: [padrão, perfis permitidos (null = público), função de renderização]
const ROTAS = [
  [/^#\/login$/, null, () => auth.login(raiz)],
  [/^#\/cadastro$/, null, () => auth.cadastro(raiz)],
  [/^#\/recuperar$/, null, () => auth.recuperar(raiz)],
  [/^#\/inicio$/, ['aluno'], () => aluno.inicio(raiz)],
  [/^#\/simulados$/, ['aluno'], () => aluno.simulados(raiz)],
  [/^#\/prova\/([\w-]+)$/, ['aluno'], m => aluno.prova(raiz, m[1])],
  [/^#\/resultado\/([\w-]+)$/, ['aluno', 'professor'], m => aluno.resultado(raiz, m[1])],
  [/^#\/relatorios$/, ['aluno'], () => aluno.relatorios(raiz)],
  [/^#\/perfil$/, ['aluno', 'professor'], () => perfil(raiz)],
  [/^#\/prof\/painel$/, ['professor'], () => prof.painel(raiz)],
  [/^#\/prof\/questoes$/, ['professor'], () => prof.questoes(raiz)],
  [/^#\/prof\/questoes\/nova$/, ['professor'], () => prof.questaoForm(raiz)],
  [/^#\/prof\/questoes\/([\w-]+)$/, ['professor'], m => prof.questaoForm(raiz, m[1])],
  [/^#\/prof\/simulados$/, ['professor'], () => prof.simuladosProf(raiz)],
  [/^#\/prof\/simulados\/novo$/, ['professor'], () => prof.simuladoForm(raiz)],
  [/^#\/prof\/simulados\/([\w-]+)$/, ['professor'], m => prof.simuladoForm(raiz, m[1])],
];
const inicial = u => (!u ? '#/login' : u.perfil === 'professor' ? '#/prof/painel' : '#/inicio');

function rotear() {
  aluno.pararRelogio();
  const hash = location.hash || '#/';
  const u = sessao.token ? sessao.usuario : null;
  for (const [re, perfis, render] of ROTAS) {
    const m = hash.match(re);
    if (!m) continue;
    if (perfis && !u) return (location.hash = '#/login');
    if (!perfis && u) return (location.hash = inicial(u)); // logado não volta ao login
    if (perfis && !perfis.includes(u.perfil)) return (location.hash = inicial(u)); // controle de acesso no cliente
    window.scrollTo(0, 0);
    document.title = `Simulado IFMA`;
    return render(m);
  }
  location.hash = inicial(u);
}
acordarServidor(() => toast('Conectando ao servidor… na primeira visita do dia isso pode levar até 1 minuto.', 'aviso'));
window.addEventListener('hashchange', rotear);
rotear();
