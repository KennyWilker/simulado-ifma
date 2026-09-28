const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { novoAmbiente, auth } = require('./helpers');

let amb;
before(async () => { amb = await novoAmbiente(); });

test('CT-01 cadastro válido cria aluno e devolve token', async () => {
  const r = await amb.api().post('/api/auth/cadastro').send({
    nome: 'Maria Teste', email: 'Maria@Email.com ', senha: 'Abcdef12', telefone: '(99) 98888-0000', turma: 'Turma B – Tarde',
  });
  assert.equal(r.status, 201);
  assert.ok(r.body.token);
  assert.equal(r.body.usuario.email, 'maria@email.com');
  assert.equal(r.body.usuario.perfil, 'aluno');
  assert.equal(r.body.usuario.senhaHash, undefined);
});

test('CT-02 cadastro com e-mail já existente é recusado (409)', async () => {
  const r = await amb.api().post('/api/auth/cadastro').send({
    nome: 'Outro', email: 'aluno.teste@email.com', senha: 'Senha1234', turma: 'Turma A – Manhã',
  });
  assert.equal(r.status, 409);
});

test('CT-03 senha fraca e campos inválidos são recusados no servidor (400)', async () => {
  const base = { nome: 'Fulano', email: 'f@email.com', senha: 'Senha1234', turma: 'Turma A – Manhã' };
  for (const alt of [{ senha: '123' }, { senha: 'somenteletras' }, { email: 'invalido' }, { nome: '' }, { turma: 'Turma Z' }]) {
    const r = await amb.api().post('/api/auth/cadastro').send({ ...base, ...alt });
    assert.equal(r.status, 400, JSON.stringify(alt));
  }
});

test('CT-04 cadastro público não permite escolher perfil de professor', async () => {
  const r = await amb.api().post('/api/auth/cadastro').send({
    nome: 'Invasor', email: 'invasor@email.com', senha: 'Senha1234', turma: 'Turma A – Manhã', perfil: 'professor',
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.usuario.perfil, 'aluno');
});

test('CT-05 login correto devolve token; senha errada devolve 401 com mensagem genérica', async () => {
  const ok = await amb.api().post('/api/auth/login').send({ email: 'aluno.teste@email.com', senha: 'Senha1234' });
  assert.equal(ok.status, 200);
  const erro = await amb.api().post('/api/auth/login').send({ email: 'aluno.teste@email.com', senha: 'errada123' });
  const inexistente = await amb.api().post('/api/auth/login').send({ email: 'nao@existe.com', senha: 'errada123' });
  assert.equal(erro.status, 401);
  assert.equal(erro.body.erro, inexistente.body.erro);
});

test('CT-06 tentativa de injeção NoSQL no login é bloqueada', async () => {
  const r = await amb.api().post('/api/auth/login').send({ email: { $ne: null }, senha: { $ne: null } });
  assert.equal(r.status, 400);
  assert.equal(r.body.token, undefined);
});

test('CT-07 rotas protegidas exigem token válido', async () => {
  assert.equal((await amb.api().get('/api/me')).status, 401);
  assert.equal((await amb.api().get('/api/me').set(auth('token.falso.123'))).status, 401);
  assert.equal((await amb.api().get('/api/me').set(auth(amb.aluno))).status, 200);
});

test('CT-08 senha é armazenada somente como hash bcrypt', async () => {
  const u = await amb.col('usuarios').findOne({ email: 'aluno.teste@email.com' });
  assert.equal(u.senha, undefined);
  assert.match(u.senhaHash, /^\$2[aby]\$/);
});

test('CT-09 recuperação de senha: código válido redefine, código errado é recusado', async () => {
  const pedido = await amb.api().post('/api/auth/recuperar').send({ email: 'aluno.teste@email.com' });
  assert.equal(pedido.status, 200);
  const errado = await amb.api().post('/api/auth/redefinir').send({ email: 'aluno.teste@email.com', codigo: 'XXXXXXXX', novaSenha: 'NovaSenha9' });
  assert.equal(errado.status, 400);
  const certo = await amb.api().post('/api/auth/redefinir').send({ email: 'aluno.teste@email.com', codigo: pedido.body.codigoDev, novaSenha: 'NovaSenha9' });
  assert.equal(certo.status, 200);
  assert.ok(await amb.login('aluno.teste@email.com', 'NovaSenha9'));
  const reuso = await amb.api().post('/api/auth/redefinir').send({ email: 'aluno.teste@email.com', codigo: pedido.body.codigoDev, novaSenha: 'Outra12345' });
  assert.equal(reuso.status, 400); // código de uso único
});
