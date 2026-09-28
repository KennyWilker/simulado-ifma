import { api, sessao } from '../api.js';
import { esc, icon, layout, hero, carregando, erroTela, discInfo, fmtNota, fmtData, fmtDataCurta, fmtTempo, iniciais, LETRAS, toast, confirmar } from '../ui.js';
import { barras, linha } from '../charts.js';

const tentarNovamente = '<button class="btn btn-sec" data-acao="recarregar">Tentar novamente</button>';
function ligarRecarregar(raiz, fn) {
  raiz.querySelector('[data-acao="recarregar"]')?.addEventListener('click', fn);
}

const itemHistorico = h => {
  const d = discInfo(h.disciplina);
  return `<a class="item-hist" href="#/resultado/${esc(h.id)}"><span class="faixa ${d.cor}"></span>
    <span class="ih-txt"><strong>${esc(h.disciplina)}</strong><small>${fmtData(h.data)} · ${h.total} questões</small></span>
    <span class="ih-nota"><b>${fmtNota(h.nota)}</b><small>Nota</small></span></a>`;
};

// ---------------- Início ----------------
export async function inicio(raiz) {
  const u = sessao.usuario;
  const topo = hero(`<small class="hero-saud">Bem-vindo de volta,</small>${esc(u.nome)}`, '',
    `<a href="#/perfil" class="avatar-btn" aria-label="Abrir perfil">${esc(iniciais(u.nome))}</a>`);
  raiz.innerHTML = layout(topo + carregando(), '#/inicio');
  let e;
  try { e = await api('/me/estatisticas'); } catch (err) {
    raiz.innerHTML = layout(topo + erroTela(err.message, tentarNovamente), '#/inicio');
    return ligarRecarregar(raiz, () => inicio(raiz));
  }
  const horas = e.minutosEstudo >= 60 ? `${Math.floor(e.minutosEstudo / 60)}h${String(e.minutosEstudo % 60).padStart(2, '0')}` : `${e.minutosEstudo} min`;
  const pct = Math.min(100, Math.round((e.semana.feitos / e.semana.meta) * 100));
  raiz.innerHTML = layout(`${topo}
    <div class="pagina sobe">
      <section class="stats">
        <div class="stat"><span class="stat-ic azul">${icon('file')}</span><b>${e.simuladosFeitos}</b><small>Simulados feitos</small></div>
        <div class="stat"><span class="stat-ic verde">${icon('trophy')}</span><b>${fmtNota(e.media)}</b><small>Média geral</small></div>
        <div class="stat"><span class="stat-ic roxo">${icon('target')}</span><b>${e.questoesResolvidas}</b><small>Questões resolvidas</small></div>
        <div class="stat"><span class="stat-ic laranja">${icon('clock')}</span><b>${horas}</b><small>Tempo de estudo</small></div>
      </section>
      <div class="duas">
        <section class="card">
          <h2 class="card-tit">${icon('trend', 'verde-t')} Progresso semanal</h2>
          <div class="meta-lin"><span>Meta de simulados (últimos 7 dias)</span><b>${e.semana.feitos}/${e.semana.meta}</b></div>
          <div class="barra-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
          <p class="nota-rodape">${e.semana.feitos >= e.semana.meta ? 'Meta da semana cumprida.' : `Faltam ${e.semana.meta - e.semana.feitos} simulado(s) para a meta.`}
          ${e.ranking ? ` Você está em <b>#${e.ranking}</b> de ${e.totalRanqueados} no ranking.` : ''}</p>
        </section>
        <section class="card">
          <h2 class="card-tit">Últimos simulados</h2>
          ${e.historico.length ? `<div class="lista-hist">${e.historico.slice(0, 3).map(itemHistorico).join('')}</div>`
            : '<p class="vazio">Você ainda não fez nenhum simulado. Comece pelo de Matemática ou Português.</p>'}
        </section>
      </div>
      <a class="btn btn-verde bloco grande" href="#/simulados">Iniciar novo simulado</a>
    </div>`, '#/inicio');
}

// ---------------- Lista de simulados ----------------
export async function simulados(raiz, filtro = 'Todas') {
  const topo = hero('Simulados disponíveis', 'Escolha uma disciplina para praticar');
  raiz.innerHTML = layout(topo + carregando(), '#/simulados');
  let lista;
  try { lista = await api('/simulados'); } catch (err) {
    raiz.innerHTML = layout(topo + erroTela(err.message, tentarNovamente), '#/simulados');
    return ligarRecarregar(raiz, () => simulados(raiz));
  }
  const filtrada = filtro === 'Todas' ? lista : lista.filter(s => s.disciplina?.nome === filtro);
  raiz.innerHTML = layout(`${topo}
    <div class="pagina sobe">
      <div class="chips" role="group" aria-label="Filtrar por disciplina">
        ${['Todas', 'Matemática', 'Português'].map(c => `<button class="chip ${c === filtro ? 'ativo' : ''}" data-f="${c}" aria-pressed="${c === filtro}">${c}</button>`).join('')}
      </div>
      <div class="grade-sim">
      ${filtrada.length ? filtrada.map(s => {
        const d = discInfo(s.disciplina?.nome);
        return `<article class="card sim">
          <span class="sim-ic ${d.cor}">${icon(d.icone)}</span>
          <div class="sim-corpo">
            <div class="sim-topo"><div><h2>${esc(s.disciplina?.nome)}</h2><p class="sim-tit">${esc(s.titulo)}</p></div>
              ${s.vezesFeitas ? `<span class="selo" title="Melhor nota: ${fmtNota(s.melhorNota)}">${icon('check')} ${s.vezesFeitas}x</span>` : ''}</div>
            <p class="sim-meta">${icon('file')} ${s.qtdQuestoes} questões <span>${icon('clock')} ${s.tempoLimite} min</span>
              ${s.melhorNota != null ? `<span>${icon('trophy')} melhor nota ${fmtNota(s.melhorNota)}</span>` : ''}</p>
            <a class="btn btn-pri bloco" href="#/prova/${esc(s.id)}">Iniciar simulado</a>
          </div></article>`;
      }).join('') : '<p class="vazio card">Nenhum simulado disponível nesta disciplina no momento.</p>'}
      </div>
    </div>`, '#/simulados');
  raiz.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => simulados(raiz, b.dataset.f)));
}

// ---------------- Realização do simulado ----------------
let relogio = null;
export function pararRelogio() { clearInterval(relogio); relogio = null; }

export async function prova(raiz, simuladoId) {
  raiz.innerHTML = `<div class="prova">${carregando('Preparando o simulado…')}</div>`;
  let t;
  try { t = await api(`/simulados/${encodeURIComponent(simuladoId)}/iniciar`, { metodo: 'POST' }); } catch (err) {
    raiz.innerHTML = `<div class="prova">${erroTela(err.message, '<a class="btn btn-sec" href="#/simulados">Voltar aos simulados</a>')}</div>`;
    return;
  }
  // Progresso salvo no navegador: sobrevive a recarregamentos e quedas de conexão
  const chave = `sifma.prova.${t.tentativaId}`;
  const salvo = JSON.parse(localStorage.getItem(chave) || '{}');
  const estado = { atual: salvo.atual || 0, respostas: salvo.respostas || {}, enviando: false };
  const persistir = () => localStorage.setItem(chave, JSON.stringify({ atual: estado.atual, respostas: estado.respostas }));
  const desvio = Date.parse(t.agora) - Date.now(); // corrige diferença de relógio entre servidor e aparelho
  const fim = Date.parse(t.expiraEm);
  const total = t.questoes.length;
  const d = discInfo(t.disciplina);

  raiz.innerHTML = `<div class="prova">
    <header class="prova-topo ${d.cor}">
      <div class="prova-lin">
        <button class="icone-btn" id="sair" aria-label="Sair do simulado">${icon('back')}</button>
        <h1>${esc(t.disciplina)}</h1>
        <span class="cronometro" id="crono" role="timer" aria-live="off">${icon('clock')} <b>--:--</b></span>
      </div>
      <div class="prova-lin prog-txt"><span id="qn"></span><span id="pct"></span></div>
      <div class="barra-prog clara"><span id="barra"></span></div>
    </header>
    <main class="prova-corpo">
      <div id="aviso" class="alerta" hidden></div>
      <section class="card questao" id="questao" aria-live="polite"></section>
      <nav class="mapa" id="mapa" aria-label="Ir para a questão"></nav>
      <div class="prova-acoes">
        <button class="btn btn-sec" id="ant">Anterior</button>
        <button class="btn btn-pri" id="prox">Próxima questão</button>
      </div>
    </main></div>`;
  const $ = s => raiz.querySelector(s);

  function desenhar() {
    const q = t.questoes[estado.atual];
    const respondidas = Object.keys(estado.respostas).length;
    $('#qn').textContent = `Questão ${estado.atual + 1} de ${total}`;
    $('#pct').textContent = `${Math.round((respondidas / total) * 100)}% respondido`;
    $('#barra').style.width = `${(respondidas / total) * 100}%`;
    $('#questao').innerHTML = `<h2><span class="num">${estado.atual + 1}</span><span>${esc(q.enunciado)}</span></h2>
      <div class="alternativas" role="radiogroup" aria-label="Alternativas">
      ${q.alternativas.map((a, i) => `<button class="alt ${estado.respostas[q.id] === i ? 'marcada' : ''}" role="radio"
        aria-checked="${estado.respostas[q.id] === i}" data-i="${i}"><span class="letra">${LETRAS[i]}</span><span>${esc(a)}</span></button>`).join('')}
      </div>`;
    $('#questao').querySelectorAll('.alt').forEach(b => b.addEventListener('click', () => {
      estado.respostas[q.id] = Number(b.dataset.i); persistir(); desenhar();
    }));
    $('#mapa').innerHTML = t.questoes.map((x, i) =>
      `<button class="${i === estado.atual ? 'atual' : ''} ${x.id in estado.respostas ? 'feita' : ''}" data-i="${i}" aria-label="Questão ${i + 1}${x.id in estado.respostas ? ', respondida' : ''}">${i + 1}</button>`).join('');
    $('#mapa').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { estado.atual = Number(b.dataset.i); persistir(); desenhar(); }));
    $('#ant').disabled = estado.atual === 0;
    const ultima = estado.atual === total - 1;
    $('#prox').textContent = ultima ? 'Finalizar simulado' : 'Próxima questão';
    $('#prox').className = `btn ${ultima ? 'btn-verde' : 'btn-pri'}`;
    $('#prox').disabled = !ultima && !(q.id in estado.respostas);
  }

  async function enviar(automatico = false) {
    if (estado.enviando) return;
    estado.enviando = true;
    const aviso = $('#aviso');
    $('#prox').disabled = true; $('#prox').innerHTML = '<span class="spinner mini"></span> Corrigindo…';
    try {
      const respostas = Object.entries(estado.respostas).map(([questaoId, alternativa]) => ({ questaoId, alternativa }));
      const r = await api(`/tentativas/${t.tentativaId}/enviar`, { metodo: 'POST', corpo: { respostas } });
      pararRelogio();
      localStorage.removeItem(chave);
      sessionStorage.setItem(`sifma.res.${r.resultadoId}`, JSON.stringify(r));
      if (automatico) toast('Tempo esgotado: suas respostas foram enviadas.', 'aviso');
      location.hash = `#/resultado/${r.resultadoId}`;
    } catch (err) {
      estado.enviando = false;
      if (err.status === 409 && err.dados?.detalhes?.resultadoId) {
        localStorage.removeItem(chave);
        location.hash = `#/resultado/${err.dados.detalhes.resultadoId}`; return;
      }
      aviso.hidden = false;
      aviso.innerHTML = `${esc(err.message)} Suas respostas continuam salvas neste aparelho.
        ${err.status === 0 ? '<button class="btn btn-sec mini" id="reenviar">Tentar enviar de novo</button>' : ''}`;
      aviso.querySelector('#reenviar')?.addEventListener('click', () => enviar());
      if (err.status === 422) { pararRelogio(); localStorage.removeItem(chave); }
      desenhar();
    }
  }

  function tique() {
    const resta = Math.max(0, Math.round((fim - (Date.now() + desvio)) / 1000));
    const el = $('#crono');
    if (!el) return pararRelogio();
    el.querySelector('b').textContent = `${String(Math.floor(resta / 60)).padStart(2, '0')}:${String(resta % 60).padStart(2, '0')}`;
    el.classList.toggle('urgente', resta <= 60);
    if (resta === 0) { pararRelogio(); enviar(true); }
  }

  $('#ant').addEventListener('click', () => { estado.atual--; persistir(); desenhar(); });
  $('#prox').addEventListener('click', async () => {
    if (estado.atual < total - 1) { estado.atual++; persistir(); return desenhar(); }
    const brancas = total - Object.keys(estado.respostas).length;
    const ok = await confirmar({
      titulo: 'Finalizar simulado?',
      texto: brancas ? `Você deixou ${brancas} questão(ões) em branco. Elas serão contadas como erradas.` : 'Todas as questões foram respondidas. Depois de enviar não é possível alterar as respostas.',
      ok: 'Enviar respostas',
    });
    if (ok) enviar();
  });
  $('#sair').addEventListener('click', async () => {
    const ok = await confirmar({ titulo: 'Sair do simulado?', texto: 'Suas respostas ficam salvas, mas o cronômetro continua correndo.', ok: 'Sair' });
    if (ok) { pararRelogio(); location.hash = '#/simulados'; }
  });
  desenhar();
  pararRelogio(); tique(); relogio = setInterval(tique, 1000);
  if (Object.keys(salvo.respostas || {}).length) toast('Simulado retomado de onde você parou.');
}

// ---------------- Resultado ----------------
export async function resultado(raiz, id) {
  const cache = sessionStorage.getItem(`sifma.res.${id}`);
  let r = cache ? JSON.parse(cache) : null;
  if (!r) {
    raiz.innerHTML = layout(hero('Resultado') + carregando(), '#/relatorios');
    try { r = await api(`/resultados/${encodeURIComponent(id)}`); } catch (err) {
      raiz.innerHTML = layout(hero('Resultado') + erroTela(err.message), '#/relatorios'); return;
    }
  }
  const faixa = r.nota >= 7 ? ['verde', 'Ótimo desempenho!'] : r.nota >= 5 ? ['laranja', 'Bom caminho, continue praticando.'] : ['vermelho', 'Revise os conteúdos e tente de novo.'];
  raiz.innerHTML = layout(`${hero('Resultado', esc(r.titulo))}
    <div class="pagina sobe">
      <section class="card resumo">
        <div class="anel ${faixa[0]}" style="--p:${r.nota * 10}"><b>${fmtNota(r.nota)}</b><small>de 10</small></div>
        <div><h2>${faixa[1]}</h2>
          <p class="res-lin">${icon('check', 'verde-t')} ${r.acertos} acertos de ${r.total} questões</p>
          <p class="res-lin">${icon('clock')} Tempo: ${fmtTempo(r.tempoGastoSeg)}</p></div>
      </section>
      <h2 class="secao-tit">Gabarito comentado</h2>
      ${r.gabarito.map((g, i) => `<article class="card gab ${g.acertou ? 'certo' : 'errado'}">
        <h3>${icon(g.acertou ? 'check' : 'x')} <span>${i + 1}. ${esc(g.enunciado)}</span></h3>
        <ul>${g.alternativas.map((a, j) => `<li class="${j === g.correta ? 'correta' : ''} ${j === g.marcada && !g.acertou ? 'sua' : ''}">
          <span class="letra">${LETRAS[j]}</span>${esc(a)}${j === g.correta ? ' <em>resposta correta</em>' : j === g.marcada ? ' <em>sua resposta</em>' : ''}</li>`).join('')}</ul>
        ${g.marcada === null ? '<p class="branco">Questão deixada em branco.</p>' : ''}
        ${g.explicacao ? `<p class="explica">${esc(g.explicacao)}</p>` : ''}
      </article>`).join('')}
      <div class="duas-btn"><a class="btn btn-sec" href="#/relatorios">Ver relatórios</a><a class="btn btn-pri" href="#/simulados">Fazer outro simulado</a></div>
    </div>`, '#/relatorios');
}

// ---------------- Relatórios ----------------
export async function relatorios(raiz) {
  const topo = hero('Relatórios', 'Acompanhe seu progresso');
  raiz.innerHTML = layout(topo + carregando(), '#/relatorios');
  let e;
  try { e = await api('/me/estatisticas'); } catch (err) {
    raiz.innerHTML = layout(topo + erroTela(err.message, tentarNovamente), '#/relatorios');
    return ligarRecarregar(raiz, () => relatorios(raiz));
  }
  if (!e.historico.length) {
    raiz.innerHTML = layout(`${topo}<div class="pagina"><div class="card vazio-grande">${icon('chart')}
      <p>Seus gráficos aparecem aqui depois do primeiro simulado.</p><a class="btn btn-pri" href="#/simulados">Fazer um simulado</a></div></div>`, '#/relatorios');
    return;
  }
  const bar = e.porDisciplina.map(p => ({ rotulo: p.disciplina, valor: p.media, cor: discInfo(p.disciplina).cor, vazio: !p.realizados }));
  const lin = e.evolucao.map(p => ({ rotulo: fmtDataCurta(p.data), valor: p.nota }));
  raiz.innerHTML = layout(`${topo}
    <div class="pagina sobe">
      <div class="duas">
        <section class="card"><h2 class="card-tit">${icon('chart', 'azul-t')} Desempenho por disciplina</h2>${barras(bar)}
          <p class="nota-rodape">${e.porDisciplina.map(p => `${esc(p.disciplina)}: ${p.realizados} simulado(s)`).join(' · ')}</p></section>
        <section class="card"><h2 class="card-tit">${icon('trend', 'verde-t')} Evolução das notas</h2>${linha(lin)}
          <p class="nota-rodape">Últimos ${lin.length} simulados, do mais antigo ao mais recente.</p></section>
      </div>
      <section class="card"><h2 class="card-tit">Histórico de notas</h2>
        <div class="lista-hist">${e.historico.map(itemHistorico).join('')}</div></section>
    </div>`, '#/relatorios');
}
