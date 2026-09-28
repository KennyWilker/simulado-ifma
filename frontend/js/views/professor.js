import { api } from '../api.js';
import { esc, icon, layout, hero, carregando, erroTela, discInfo, fmtNota, LETRAS, toast, confirmar } from '../ui.js';
import { barras } from '../charts.js';

const NIVEIS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const falha = (raiz, rota, titulo, err) => { raiz.innerHTML = layout(hero(titulo) + erroTela(err.message), rota); };

// ---------------- Painel administrativo (acompanhamento das turmas) ----------------
export async function painel(raiz, turma = '') {
  const topo = hero('Painel da coordenação', 'Desempenho geral das turmas');
  raiz.innerHTML = layout(topo + carregando(), '#/prof/painel');
  let p;
  try { p = await api(`/admin/painel${turma ? `?turma=${encodeURIComponent(turma)}` : ''}`); } catch (err) { return falha(raiz, '#/prof/painel', 'Painel da coordenação', err); }
  const t = p.totais;
  raiz.innerHTML = layout(`${topo}
    <div class="pagina sobe">
      <label class="filtro-sel">${icon('users')}<select id="turma" aria-label="Filtrar por turma">
        <option value="">Todas as turmas</option>${p.turmas.map(x => `<option ${x === turma ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <section class="stats">
        <div class="stat"><span class="stat-ic azul">${icon('users')}</span><b>${t.alunos}</b><small>Alunos cadastrados</small></div>
        <div class="stat"><span class="stat-ic verde">${icon('check')}</span><b>${t.alunosAtivos}</b><small>Já fizeram simulado</small></div>
        <div class="stat"><span class="stat-ic roxo">${icon('file')}</span><b>${t.simuladosRealizados}</b><small>Simulados realizados</small></div>
        <div class="stat"><span class="stat-ic laranja">${icon('trophy')}</span><b>${fmtNota(t.mediaGeral)}</b><small>Média geral</small></div>
      </section>
      <div class="duas">
        <section class="card"><h2 class="card-tit">${icon('chart', 'azul-t')} Média por disciplina</h2>
          ${barras(p.porDisciplina.map(d => ({ rotulo: d.disciplina, valor: d.media, cor: discInfo(d.disciplina).cor, vazio: !d.realizados })))}</section>
        <section class="card"><h2 class="card-tit">${icon('users', 'azul-t')} Comparativo entre turmas</h2>
          <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Turma</th><th>Alunos</th><th>Simulados</th><th>Média</th></tr></thead>
          <tbody>${p.porTurma.map(x => `<tr class="${x.turma === turma ? 'destaque' : ''}"><td>${esc(x.turma)}</td><td>${x.alunos}</td><td>${x.realizados}</td><td><b>${fmtNota(x.media)}</b></td></tr>`).join('')}</tbody></table></div></section>
      </div>
      <div class="duas">
        <section class="card"><h2 class="card-tit">${icon('trophy', 'laranja-t')} Ranking de alunos</h2>
          ${p.ranking.length ? `<ol class="ranking">${p.ranking.map(a => `<li><span class="pos">${p.ranking.indexOf(a) + 1}</span>
            <span class="rk-nome">${esc(a.nome)}<small>${esc(a.turma)} · ${a.realizados} simulado(s)</small></span><b>${fmtNota(a.media)}</b></li>`).join('')}</ol>`
            : '<p class="vazio">Nenhum aluno desta seleção fez simulados ainda.</p>'}</section>
        <section class="card"><h2 class="card-tit">${icon('alert', 'vermelho-t')} Questões com menor taxa de acerto</h2>
          ${p.questoesCriticas.length ? `<ul class="criticas">${p.questoesCriticas.map(q => `<li>
            <div class="taxa ${q.taxaAcerto < 50 ? 'baixa' : ''}"><b>${q.taxaAcerto}%</b><small>acerto</small></div>
            <span>${esc(q.enunciado)}<small>${esc(q.disciplina)} · ${q.respostas} respostas</small></span></li>`).join('')}</ul>`
            : '<p class="vazio">Sem respostas registradas ainda.</p>'}
          <p class="nota-rodape">Use esta lista para decidir quais conteúdos revisar em sala.</p></section>
      </div>
    </div>`, '#/prof/painel');
  raiz.querySelector('#turma').addEventListener('change', ev => painel(raiz, ev.target.value));
}

// ---------------- Banco de questões ----------------
export async function questoes(raiz, filtro = { disc: '', busca: '' }) {
  const topo = hero('Banco de questões', 'Cadastre e organize as questões dos simulados',
    '<a class="btn btn-claro" href="#/prof/questoes/nova">' + icon('plus') + ' Nova questão</a>');
  raiz.innerHTML = layout(topo + carregando(), '#/prof/questoes');
  let disc, lista;
  try {
    const qs = new URLSearchParams({ ...(filtro.disc ? { disciplinaId: filtro.disc } : {}), ...(filtro.busca ? { busca: filtro.busca } : {}) });
    [disc, lista] = await Promise.all([api('/disciplinas'), api(`/questoes?${qs}`)]);
  } catch (err) { return falha(raiz, '#/prof/questoes', 'Banco de questões', err); }
  const nomeDisc = Object.fromEntries(disc.map(d => [d.id, d.nome]));
  raiz.innerHTML = layout(`${topo}
    <div class="pagina sobe">
      <div class="barra-filtros">
        <div class="chips">${[['', 'Todas'], ...disc.map(d => [d.id, d.nome])].map(([id, n]) =>
          `<button class="chip ${id === filtro.disc ? 'ativo' : ''}" data-d="${id}" aria-pressed="${id === filtro.disc}">${esc(n)}</button>`).join('')}</div>
        <form id="fb" class="busca">${icon('search')}<input name="b" type="search" placeholder="Buscar no enunciado" value="${esc(filtro.busca)}" aria-label="Buscar questões"></form>
      </div>
      <p class="contagem">${lista.length} questão(ões)</p>
      ${lista.length ? lista.map(q => {
        const d = discInfo(nomeDisc[q.disciplinaId]);
        return `<article class="card q-item">
          <div class="tags"><span class="tag ${d.cor}">${esc(nomeDisc[q.disciplinaId])}</span><span class="tag">${NIVEIS[q.nivel]}</span>
            ${q.emUso ? `<span class="tag neutra">em ${q.emUso} simulado(s)</span>` : ''}</div>
          <p class="q-enun">${esc(q.enunciado)}</p>
          <p class="q-resp">Resposta: <b>${LETRAS[q.respostaCorreta]}) ${esc(q.alternativas[q.respostaCorreta])}</b></p>
          <div class="q-acoes"><a class="btn btn-sec mini" href="#/prof/questoes/${esc(q.id)}">${icon('pen')} Editar</a>
            <button class="btn btn-perigo-sec mini" data-excluir="${esc(q.id)}">${icon('trash')} Excluir</button></div>
        </article>`;
      }).join('') : '<div class="card vazio">Nenhuma questão encontrada. Ajuste o filtro ou cadastre uma nova questão.</div>'}
    </div>`, '#/prof/questoes');
  raiz.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => questoes(raiz, { ...filtro, disc: b.dataset.d })));
  raiz.querySelector('#fb').addEventListener('submit', ev => { ev.preventDefault(); questoes(raiz, { ...filtro, busca: ev.target.b.value.trim() }); });
  raiz.querySelectorAll('[data-excluir]').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: 'Excluir questão?', texto: 'Esta ação não pode ser desfeita.', ok: 'Excluir', perigo: true }))) return;
    try { await api(`/questoes/${b.dataset.excluir}`, { metodo: 'DELETE' }); toast('Questão excluída.'); questoes(raiz, filtro); }
    catch (err) { toast(err.message, 'erro'); }
  }));
}

export async function questaoForm(raiz, id) {
  const titulo = id ? 'Editar questão' : 'Nova questão';
  raiz.innerHTML = layout(hero(titulo) + carregando(), '#/prof/questoes');
  let disc, q = { disciplinaId: '', enunciado: '', alternativas: ['', '', '', ''], respostaCorreta: null, nivel: 'medio', explicacao: '' };
  try {
    disc = await api('/disciplinas');
    if (id) {
      q = (await api('/questoes')).find(x => x.id === id);
      if (!q) throw new Error('Questão não encontrada.');
    }
  } catch (err) { return falha(raiz, '#/prof/questoes', titulo, err); }
  raiz.innerHTML = layout(`${hero(titulo, 'Todos os campos são validados também no servidor')}
    <div class="pagina estreita sobe">
      <form class="card form" id="f" novalidate>
        <div class="duas-col">
          <label>Disciplina<select name="disciplinaId"><option value="">Selecione</option>
            ${disc.map(d => `<option value="${d.id}" ${d.id === q.disciplinaId ? 'selected' : ''}>${esc(d.nome)}</option>`).join('')}</select></label>
          <label>Nível<select name="nivel">${Object.entries(NIVEIS).map(([k, v]) => `<option value="${k}" ${k === q.nivel ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <label>Enunciado<textarea name="enunciado" rows="4" maxlength="2000" placeholder="Digite o enunciado da questão">${esc(q.enunciado)}</textarea></label>
        <fieldset><legend>Alternativas <small>marque a correta</small></legend>
          ${q.alternativas.map((a, i) => `<div class="alt-ed"><label class="radio-correta" title="Marcar como correta">
            <input type="radio" name="correta" value="${i}" ${q.respostaCorreta === i ? 'checked' : ''}><span>${LETRAS[i]}</span></label>
            <input name="alt${i}" value="${esc(a)}" maxlength="500" placeholder="Alternativa ${LETRAS[i]}" aria-label="Alternativa ${LETRAS[i]}"></div>`).join('')}
        </fieldset>
        <label>Explicação da resposta (opcional)<textarea name="explicacao" rows="3" maxlength="1000" placeholder="Aparece para o aluno no gabarito comentado">${esc(q.explicacao)}</textarea></label>
        <ul class="erros" id="erros" hidden></ul>
        <div class="duas-btn"><a class="btn btn-sec" href="#/prof/questoes">Cancelar</a><button class="btn btn-pri" id="salvar">Salvar questão</button></div>
      </form>
    </div>`, '#/prof/questoes');
  const f = raiz.querySelector('#f');
  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const dados = {
      disciplinaId: f.disciplinaId.value, nivel: f.nivel.value, enunciado: f.enunciado.value.trim(),
      alternativas: q.alternativas.map((_, i) => f[`alt${i}`].value.trim()),
      respostaCorreta: f.correta.value === '' ? null : Number(f.correta.value), explicacao: f.explicacao.value.trim(),
    };
    const erros = [];
    if (!dados.disciplinaId) erros.push('Selecione a disciplina.');
    if (dados.enunciado.length < 10) erros.push('O enunciado deve ter pelo menos 10 caracteres.');
    if (dados.alternativas.some(a => !a)) erros.push('Preencha todas as alternativas.');
    if (dados.alternativas.every(Boolean) && new Set(dados.alternativas.map(a => a.toLowerCase())).size !== dados.alternativas.length) erros.push('Existem alternativas repetidas.');
    if (dados.respostaCorreta === null) erros.push('Marque qual alternativa é a correta.');
    const caixa = raiz.querySelector('#erros');
    caixa.hidden = !erros.length;
    caixa.innerHTML = erros.map(e => `<li>${esc(e)}</li>`).join('');
    if (erros.length) return caixa.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      await api(id ? `/questoes/${id}` : '/questoes', { metodo: id ? 'PUT' : 'POST', corpo: dados });
      toast(id ? 'Questão atualizada.' : 'Questão cadastrada.');
      location.hash = '#/prof/questoes';
    } catch (err) { caixa.hidden = false; caixa.innerHTML = `<li>${esc(err.message)}</li>`; }
  });
}

// ---------------- Montagem de simulados ----------------
export async function simuladosProf(raiz) {
  const topo = hero('Simulados', 'Monte simulados a partir do banco de questões',
    '<a class="btn btn-claro" href="#/prof/simulados/novo">' + icon('plus') + ' Novo simulado</a>');
  raiz.innerHTML = layout(topo + carregando(), '#/prof/simulados');
  let lista;
  try { lista = await api('/simulados'); } catch (err) { return falha(raiz, '#/prof/simulados', 'Simulados', err); }
  raiz.innerHTML = layout(`${topo}
    <div class="pagina sobe"><div class="grade-sim">
      ${lista.length ? lista.map(s => {
        const d = discInfo(s.disciplina?.nome);
        return `<article class="card sim ${s.ativo ? '' : 'inativo'}">
          <span class="sim-ic ${d.cor}">${icon(d.icone)}</span>
          <div class="sim-corpo">
            <div class="sim-topo"><div><h2>${esc(s.titulo)}</h2><p class="sim-tit">${esc(s.disciplina?.nome)}</p></div>
              <label class="interruptor" title="Visível para os alunos"><input type="checkbox" data-ativo="${esc(s.id)}" ${s.ativo ? 'checked' : ''}><span></span><small>${s.ativo ? 'Ativo' : 'Inativo'}</small></label></div>
            <p class="sim-meta">${icon('file')} ${s.qtdQuestoes} questões <span>${icon('clock')} ${s.tempoLimite} min</span></p>
            <div class="q-acoes"><a class="btn btn-sec mini" href="#/prof/simulados/${esc(s.id)}">${icon('pen')} Editar</a>
              <button class="btn btn-perigo-sec mini" data-excluir="${esc(s.id)}">${icon('trash')} Excluir</button></div>
          </div></article>`;
      }).join('') : '<div class="card vazio">Nenhum simulado criado. Use “Novo simulado” para montar o primeiro.</div>'}
    </div></div>`, '#/prof/simulados');
  raiz.querySelectorAll('[data-ativo]').forEach(c => c.addEventListener('change', async () => {
    try { await api(`/simulados/${c.dataset.ativo}/ativo`, { metodo: 'PATCH', corpo: { ativo: c.checked } }); toast(c.checked ? 'Simulado visível para os alunos.' : 'Simulado ocultado dos alunos.'); simuladosProf(raiz); }
    catch (err) { c.checked = !c.checked; toast(err.message, 'erro'); }
  }));
  raiz.querySelectorAll('[data-excluir]').forEach(b => b.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: 'Excluir simulado?', texto: 'Os resultados já registrados pelos alunos são mantidos no histórico.', ok: 'Excluir', perigo: true }))) return;
    try { await api(`/simulados/${b.dataset.excluir}`, { metodo: 'DELETE' }); toast('Simulado excluído.'); simuladosProf(raiz); }
    catch (err) { toast(err.message, 'erro'); }
  }));
}

export async function simuladoForm(raiz, id) {
  const titulo = id ? 'Editar simulado' : 'Novo simulado';
  raiz.innerHTML = layout(hero(titulo) + carregando(), '#/prof/simulados');
  let disc, banco, s = { titulo: '', disciplinaId: '', questoesIds: [], tempoLimite: 30, ativo: true };
  try {
    [disc, banco] = await Promise.all([api('/disciplinas'), api('/questoes')]);
    if (id) {
      const x = (await api('/simulados')).find(y => y.id === id);
      if (!x) throw new Error('Simulado não encontrado.');
      s = { ...x, disciplinaId: x.disciplina.id };
    }
  } catch (err) { return falha(raiz, '#/prof/simulados', titulo, err); }
  const sel = new Set(s.questoesIds);
  raiz.innerHTML = layout(`${hero(titulo, 'Escolha a disciplina e selecione as questões')}
    <div class="pagina estreita sobe">
      <form class="card form" id="f" novalidate>
        <label>Título<input name="titulo" value="${esc(s.titulo)}" maxlength="100" placeholder="Ex.: Simulado 2 – Português"></label>
        <div class="duas-col">
          <label>Disciplina<select name="disciplinaId"><option value="">Selecione</option>
            ${disc.map(d => `<option value="${d.id}" ${d.id === s.disciplinaId ? 'selected' : ''}>${esc(d.nome)}</option>`).join('')}</select></label>
          <label>Tempo limite (minutos)<input name="tempo" type="number" min="5" max="240" value="${s.tempoLimite}"></label>
        </div>
        <fieldset><legend>Questões <small id="cont"></small></legend>
          <button type="button" class="btn-link" id="todas">Selecionar todas</button>
          <div class="lista-check" id="lista"></div></fieldset>
        <ul class="erros" id="erros" hidden></ul>
        <div class="duas-btn"><a class="btn btn-sec" href="#/prof/simulados">Cancelar</a><button class="btn btn-pri">Salvar simulado</button></div>
      </form></div>`, '#/prof/simulados');
  const f = raiz.querySelector('#f');
  const desenharLista = () => {
    const doDisc = banco.filter(q => q.disciplinaId === f.disciplinaId.value);
    for (const qid of [...sel]) if (!doDisc.some(q => q.id === qid)) sel.delete(qid);
    raiz.querySelector('#lista').innerHTML = !f.disciplinaId.value ? '<p class="vazio">Selecione a disciplina para ver as questões.</p>'
      : doDisc.length ? doDisc.map(q => `<label class="check-q"><input type="checkbox" value="${q.id}" ${sel.has(q.id) ? 'checked' : ''}>
        <span>${esc(q.enunciado)}<small>${NIVEIS[q.nivel]}</small></span></label>`).join('')
      : '<p class="vazio">Não há questões desta disciplina. Cadastre questões primeiro.</p>';
    raiz.querySelectorAll('#lista input').forEach(c => c.addEventListener('change', () => { c.checked ? sel.add(c.value) : sel.delete(c.value); contar(); }));
    contar();
  };
  const contar = () => { raiz.querySelector('#cont').textContent = `${sel.size} selecionada(s)`; };
  f.disciplinaId.addEventListener('change', desenharLista);
  raiz.querySelector('#todas').addEventListener('click', () => {
    raiz.querySelectorAll('#lista input').forEach(c => { c.checked = true; sel.add(c.value); }); contar();
  });
  desenharLista();
  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const dados = { titulo: f.titulo.value.trim(), disciplinaId: f.disciplinaId.value, tempoLimite: Number(f.tempo.value), questoesIds: [...sel], ativo: s.ativo };
    const erros = [];
    if (dados.titulo.length < 3) erros.push('Informe um título com pelo menos 3 caracteres.');
    if (!dados.disciplinaId) erros.push('Selecione a disciplina.');
    if (!Number.isInteger(dados.tempoLimite) || dados.tempoLimite < 5 || dados.tempoLimite > 240) erros.push('O tempo deve ficar entre 5 e 240 minutos.');
    if (!dados.questoesIds.length) erros.push('Selecione pelo menos uma questão.');
    const caixa = raiz.querySelector('#erros');
    caixa.hidden = !erros.length; caixa.innerHTML = erros.map(e => `<li>${esc(e)}</li>`).join('');
    if (erros.length) return;
    try {
      await api(id ? `/simulados/${id}` : '/simulados', { metodo: id ? 'PUT' : 'POST', corpo: dados });
      toast(id ? 'Simulado atualizado.' : 'Simulado criado.');
      location.hash = '#/prof/simulados';
    } catch (err) { caixa.hidden = false; caixa.innerHTML = `<li>${esc(err.message)}</li>`; }
  });
}
