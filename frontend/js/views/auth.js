import { api, sessao } from '../api.js';
import { esc, icon, toast } from '../ui.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const casca = conteudo => `<div class="auth"><section class="auth-card">
  <div class="auth-logo">${icon('book')}</div><h1>Simulado IFMA</h1>${conteudo}</section></div>`;

const campo = ({ id, rotulo, tipo = 'text', ic, ph = '', auto = '', extra = '' }) => `
  <div class="campo"><label for="${id}">${rotulo}</label>
    <div class="entrada">${icon(ic)}<input id="${id}" name="${id}" type="${tipo}" placeholder="${ph}" autocomplete="${auto}" ${extra}>
    ${tipo === 'password' ? `<button type="button" class="ver-senha" data-alvo="${id}" aria-label="Mostrar senha">${icon('eye')}</button>` : ''}</div>
    <small class="erro-campo" id="${id}-erro"></small></div>`;

// Remove a mensagem de erro do campo assim que o usuário volta a digitar
function limparAoDigitar(raiz) {
  raiz.querySelectorAll('input, select').forEach(inp => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
    const el = raiz.querySelector(`#${inp.id}-erro`);
    if (el) { el.textContent = ''; inp.removeAttribute('aria-invalid'); }
  }));
}
function ligarSenhas(raiz) {
  limparAoDigitar(raiz);
  raiz.querySelectorAll('.ver-senha').forEach(b => b.addEventListener('click', () => {
    const inp = raiz.querySelector(`#${b.dataset.alvo}`);
    inp.type = inp.type === 'password' ? 'text' : 'password';
    b.setAttribute('aria-label', inp.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
  }));
}
function erroCampo(raiz, id, msg) {
  const el = raiz.querySelector(`#${id}-erro`);
  el.textContent = msg || '';
  raiz.querySelector(`#${id}`).setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}
async function enviando(botao, fn) {
  const txt = botao.textContent;
  botao.disabled = true; botao.innerHTML = '<span class="spinner mini"></span> Aguarde…';
  try { await fn(); } finally { botao.disabled = false; botao.textContent = txt; }
}
const destinoInicial = u => (u.perfil === 'professor' ? '#/prof/painel' : '#/inicio');

// ---------------- Login ----------------
export function login(raiz) {
  raiz.innerHTML = casca(`<p class="auth-sub">Entre na sua conta</p>
    <form novalidate id="f">
      ${campo({ id: 'email', rotulo: 'E-mail', tipo: 'email', ic: 'mail', ph: 'seu@email.com', auto: 'email' })}
      ${campo({ id: 'senha', rotulo: 'Senha', tipo: 'password', ic: 'lock', ph: '••••••••', auto: 'current-password' })}
      <p class="alerta" id="msg" hidden></p>
      <button class="btn btn-pri bloco" id="entrar">Entrar</button>
      <a class="btn btn-sec bloco" href="#/cadastro">Criar conta</a>
      <a class="link-centro" href="#/recuperar">Esqueci minha senha</a>
    </form>`);
  ligarSenhas(raiz);
  const f = raiz.querySelector('#f');
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const email = f.email.value.trim(), senha = f.senha.value;
    const ok = [erroCampo(raiz, 'email', !email ? 'Informe o e-mail.' : !EMAIL_RE.test(email) ? 'E-mail inválido.' : ''),
      erroCampo(raiz, 'senha', !senha ? 'Informe a senha.' : '')].every(Boolean);
    if (!ok) return;
    const msg = raiz.querySelector('#msg');
    await enviando(raiz.querySelector('#entrar'), async () => {
      try {
        const r = await api('/auth/login', { metodo: 'POST', corpo: { email, senha } });
        sessao.salvar(r.token, r.usuario);
        location.hash = destinoInicial(r.usuario);
      } catch (err) { msg.hidden = false; msg.textContent = err.message; }
    });
  });
}

// ---------------- Cadastro ----------------
export async function cadastro(raiz) {
  let turmas = [];
  try { turmas = await api('/turmas'); } catch { /* exibido abaixo */ }
  raiz.innerHTML = casca(`<p class="auth-sub">Crie sua conta de aluno</p>
    <form novalidate id="f">
      ${campo({ id: 'nome', rotulo: 'Nome completo', ic: 'user', ph: 'Seu nome', auto: 'name' })}
      ${campo({ id: 'email', rotulo: 'E-mail', tipo: 'email', ic: 'mail', ph: 'seu@email.com', auto: 'email' })}
      ${campo({ id: 'telefone', rotulo: 'Telefone (opcional)', tipo: 'tel', ic: 'phone', ph: '(99) 99999-9999', auto: 'tel', extra: 'inputmode="numeric" maxlength="15"' })}
      <div class="campo"><label for="turma">Turma</label>
        <div class="entrada">${icon('users')}<select id="turma" name="turma"><option value="">Selecione sua turma</option>
        ${turmas.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><small class="erro-campo" id="turma-erro"></small></div>
      ${campo({ id: 'senha', rotulo: 'Senha', tipo: 'password', ic: 'lock', ph: 'Crie uma senha', auto: 'new-password' })}
      <ul class="regras" id="regras"><li data-r="tam">Pelo menos 8 caracteres</li><li data-r="let">Uma letra</li><li data-r="num">Um número</li></ul>
      ${campo({ id: 'confirma', rotulo: 'Confirmar senha', tipo: 'password', ic: 'lock', ph: 'Repita a senha', auto: 'new-password' })}
      <p class="alerta" id="msg" hidden></p>
      <button class="btn btn-pri bloco" id="criar">Criar conta</button>
      <a class="link-centro" href="#/login">Já tenho conta — entrar</a>
    </form>`);
  ligarSenhas(raiz);
  const f = raiz.querySelector('#f');
  const regras = s => ({ tam: s.length >= 8, let: /[A-Za-z]/.test(s), num: /\d/.test(s) });
  f.senha.addEventListener('input', () => {
    const r = regras(f.senha.value);
    raiz.querySelectorAll('#regras li').forEach(li => li.classList.toggle('ok', r[li.dataset.r]));
  });
  // Máscara de telefone (99) 99999-9999
  f.telefone.addEventListener('input', () => {
    const d = f.telefone.value.replace(/\D/g, '').slice(0, 11);
    f.telefone.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
      : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const dados = { nome: f.nome.value.trim(), email: f.email.value.trim(), telefone: f.telefone.value.trim(), turma: f.turma.value, senha: f.senha.value };
    const r = regras(dados.senha);
    const ok = [
      erroCampo(raiz, 'nome', dados.nome.length < 3 ? 'Informe seu nome completo.' : ''),
      erroCampo(raiz, 'email', !EMAIL_RE.test(dados.email) ? 'Informe um e-mail válido.' : ''),
      erroCampo(raiz, 'telefone', dados.telefone && dados.telefone.replace(/\D/g, '').length < 10 ? 'Telefone incompleto.' : ''),
      erroCampo(raiz, 'turma', !dados.turma ? 'Selecione sua turma.' : ''),
      erroCampo(raiz, 'senha', !(r.tam && r.let && r.num) ? 'A senha não atende aos requisitos.' : ''),
      erroCampo(raiz, 'confirma', f.confirma.value !== dados.senha ? 'As senhas não coincidem.' : ''),
    ].every(Boolean);
    if (!ok) { raiz.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const msg = raiz.querySelector('#msg');
    await enviando(raiz.querySelector('#criar'), async () => {
      try {
        const resp = await api('/auth/cadastro', { metodo: 'POST', corpo: dados });
        sessao.salvar(resp.token, resp.usuario);
        toast('Conta criada. Bons estudos!');
        location.hash = '#/inicio';
      } catch (err) { msg.hidden = false; msg.textContent = err.message; }
    });
  });
}

// ---------------- Recuperação de senha ----------------
export function recuperar(raiz) {
  raiz.innerHTML = casca(`<p class="auth-sub">Recupere o acesso à sua conta</p>
    <form novalidate id="f1">
      <p class="dica">Informe o e-mail cadastrado. Você receberá um código de 8 caracteres válido por 15 minutos.</p>
      ${campo({ id: 'email', rotulo: 'E-mail', tipo: 'email', ic: 'mail', ph: 'seu@email.com', auto: 'email' })}
      <button class="btn btn-pri bloco" id="b1">Enviar código</button>
    </form>
    <form novalidate id="f2" hidden>
      <p class="dica" id="dica2"></p>
      ${campo({ id: 'codigo', rotulo: 'Código', ic: 'lock', ph: 'Ex.: 3FA9C21B', extra: 'maxlength="8" autocapitalize="characters"' })}
      ${campo({ id: 'nova', rotulo: 'Nova senha', tipo: 'password', ic: 'lock', ph: 'Letras e números, 8+', auto: 'new-password' })}
      <p class="alerta" id="msg2" hidden></p>
      <button class="btn btn-pri bloco" id="b2">Redefinir senha</button>
    </form>
    <a class="link-centro" href="#/login">Voltar para o login</a>`);
  ligarSenhas(raiz);
  const f1 = raiz.querySelector('#f1'), f2 = raiz.querySelector('#f2');
  let email = '';
  f1.addEventListener('submit', async e => {
    e.preventDefault();
    email = f1.email.value.trim();
    if (!erroCampo(raiz, 'email', !EMAIL_RE.test(email) ? 'Informe um e-mail válido.' : '')) return;
    await enviando(raiz.querySelector('#b1'), async () => {
      try {
        const r = await api('/auth/recuperar', { metodo: 'POST', corpo: { email } });
        f1.hidden = true; f2.hidden = false;
        raiz.querySelector('#dica2').textContent = r.codigoDev
          ? `Ambiente de testes: o envio de e-mail ainda não está ativo. Seu código é ${r.codigoDev}.`
          : r.mensagem;
        f2.codigo.focus();
      } catch (err) { erroCampo(raiz, 'email', err.message); }
    });
  });
  f2.addEventListener('submit', async e => {
    e.preventDefault();
    const codigo = f2.codigo.value.trim(), novaSenha = f2.nova.value;
    const ok = [erroCampo(raiz, 'codigo', codigo.length !== 8 ? 'O código tem 8 caracteres.' : ''),
      erroCampo(raiz, 'nova', novaSenha.length < 8 || !/[A-Za-z]/.test(novaSenha) || !/\d/.test(novaSenha) ? 'Use 8+ caracteres com letras e números.' : '')].every(Boolean);
    if (!ok) return;
    await enviando(raiz.querySelector('#b2'), async () => {
      try {
        await api('/auth/redefinir', { metodo: 'POST', corpo: { email, codigo, novaSenha } });
        toast('Senha redefinida. Entre com a nova senha.');
        location.hash = '#/login';
      } catch (err) { const m = raiz.querySelector('#msg2'); m.hidden = false; m.textContent = err.message; }
    });
  });
}
