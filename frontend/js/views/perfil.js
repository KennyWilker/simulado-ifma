import { api, sessao } from '../api.js';
import { esc, icon, layout, hero, carregando, erroTela, fmtNota, iniciais, toast, confirmar } from '../ui.js';

export async function perfil(raiz, editando = false) {
  raiz.innerHTML = layout(hero('Perfil') + carregando(), '#/perfil');
  let u, e = null, turmas = [];
  try {
    u = await api('/me');
    if (u.perfil === 'aluno') [e, turmas] = await Promise.all([api('/me/estatisticas'), api('/turmas')]);
    sessao.salvar(null, u);
  } catch (err) { raiz.innerHTML = layout(hero('Perfil') + erroTela(err.message), '#/perfil'); return; }
  const aluno = u.perfil === 'aluno';

  const info = (ic, rot, val) => `<div class="info">${icon(ic)}<span><small>${rot}</small>${esc(val || 'Não informado')}</span></div>`;
  const form = `<form class="form-perfil" id="f" novalidate>
      <label>Nome<input name="nome" value="${esc(u.nome)}" required minlength="3"></label>
      <label>Telefone<input name="telefone" value="${esc(u.telefone)}" placeholder="(99) 99999-9999" inputmode="numeric"></label>
      ${aluno ? `<label>Turma<select name="turma">${turmas.map(t => `<option ${t === u.turma ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}
      <p class="alerta" id="msg" hidden></p>
      <div class="duas-btn"><button type="button" class="btn btn-sec" id="cancelar">Cancelar</button><button class="btn btn-pri">Salvar alterações</button></div>
    </form>`;

  raiz.innerHTML = layout(`${hero('Perfil')}
    <div class="pagina estreita sobe">
      <section class="card perfil-card">
        <div class="avatar grande">${esc(iniciais(u.nome))}</div>
        <h2>${esc(u.nome)}</h2>
        <p class="sub">${aluno ? `Aluno · ${esc(u.turma)}` : 'Professor · A&amp;K Assessoria'}</p>
        ${aluno ? `<div class="mini-stats">
          <div><b>${e.simuladosFeitos}</b><small>Simulados</small></div>
          <div><b>${fmtNota(e.media)}</b><small>Média</small></div>
          <div><b>${e.ranking ? `#${e.ranking}` : '—'}</b><small>Ranking</small></div></div>` : ''}
      </section>
      <section class="card">
        <div class="card-cab"><h2 class="card-tit">Informações pessoais</h2>
          ${editando ? '' : `<button class="btn-link" id="editar">${icon('pen')} Editar</button>`}</div>
        ${editando ? form : `${info('mail', 'E-mail', u.email)}${info('phone', 'Telefone', u.telefone)}
          ${aluno ? info('users', 'Turma', u.turma) : ''}${info('book', 'Instituição', 'A&K Assessoria — preparatório IFMA')}`}
      </section>
      <section class="card menu-lista">
        <button id="sair" class="perigo">${icon('logout')} Sair da conta ${icon('chevron')}</button>
      </section>
    </div>`, '#/perfil');

  raiz.querySelector('#editar')?.addEventListener('click', () => perfil(raiz, true));
  raiz.querySelector('#cancelar')?.addEventListener('click', () => perfil(raiz, false));
  raiz.querySelector('#f')?.addEventListener('submit', async ev => {
    ev.preventDefault();
    const f = ev.target;
    try {
      const novo = await api('/me', { metodo: 'PUT', corpo: { nome: f.nome.value.trim(), telefone: f.telefone.value.trim(), turma: f.turma?.value } });
      sessao.salvar(null, novo);
      toast('Dados atualizados.');
      perfil(raiz, false);
    } catch (err) { const m = raiz.querySelector('#msg'); m.hidden = false; m.textContent = err.message; }
  });
  raiz.querySelector('#sair').addEventListener('click', async () => {
    if (await confirmar({ titulo: 'Sair da conta?', texto: 'Você precisará entrar novamente para acessar os simulados.', ok: 'Sair', perigo: true })) {
      sessao.sair(); location.hash = '#/login';
    }
  });
}
