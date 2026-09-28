const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { novoAmbiente, auth } = require('./helpers');

let amb, simMat;
before(async () => {
  amb = await novoAmbiente();
  const lista = await amb.api().get('/api/simulados').set(auth(amb.aluno));
  simMat = lista.body.find(s => s.titulo === 'Simulado 1 – Matemática');
});

test('CT-10 aluno vê apenas simulados ativos de Matemática e Português', async () => {
  const r = await amb.api().get('/api/simulados').set(auth(amb.aluno));
  assert.equal(r.status, 200);
  assert.ok(r.body.every(s => s.ativo && ['Matemática', 'Português'].includes(s.disciplina.nome)));
});

test('CT-11 questões enviadas ao aluno NÃO contêm o gabarito', async () => {
  const r = await amb.api().post(`/api/simulados/${simMat.id}/iniciar`).set(auth(amb.aluno));
  assert.equal(r.status, 201);
  assert.equal(r.body.questoes.length, 10);
  assert.ok(!JSON.stringify(r.body).includes('respostaCorreta'));
});

test('CT-12 ao reabrir o simulado a mesma tentativa é retomada (sem perder o tempo/progresso)', async () => {
  const a = await amb.api().post(`/api/simulados/${simMat.id}/iniciar`).set(auth(amb.aluno));
  const b = await amb.api().post(`/api/simulados/${simMat.id}/iniciar`).set(auth(amb.aluno));
  assert.equal(a.body.tentativaId, b.body.tentativaId);
  assert.equal(a.body.expiraEm, b.body.expiraEm);
});

test('CT-13 correção automática calcula a nota e devolve o gabarito', async () => {
  const t = await amb.api().post(`/api/simulados/${simMat.id}/iniciar`).set(auth(amb.aluno));
  const questoes = await amb.col('questoes').find({ _id: { $in: t.body.questoes.map(q => q.id) } });
  const gab = Object.fromEntries(questoes.map(q => [q._id, q.respostaCorreta]));
  // acerta as 7 primeiras e erra as 3 últimas
  const respostas = t.body.questoes.map((q, i) => ({ questaoId: q.id, alternativa: i < 7 ? gab[q.id] : (gab[q.id] + 1) % 4 }));
  const r = await amb.api().post(`/api/tentativas/${t.body.tentativaId}/enviar`).set(auth(amb.aluno)).send({ respostas });
  assert.equal(r.status, 201);
  assert.deepEqual([r.body.acertos, r.body.total, r.body.nota], [7, 10, 7]);
  assert.equal(r.body.gabarito.length, 10);

  const dup = await amb.api().post(`/api/tentativas/${t.body.tentativaId}/enviar`).set(auth(amb.aluno)).send({ respostas });
  assert.equal(dup.status, 409); // não é possível reenviar para melhorar a nota
});

test('CT-14 o resultado aparece nas estatísticas e no histórico do aluno', async () => {
  const r = await amb.api().get('/api/me/estatisticas').set(auth(amb.aluno));
  assert.equal(r.body.simuladosFeitos, 1);
  assert.equal(r.body.media, 7);
  assert.equal(r.body.questoesResolvidas, 10);
  assert.equal(r.body.historico[0].disciplina, 'Matemática');
  assert.equal(r.body.ranking, 1);
});

test('CT-15 aluno não consegue enviar tentativa de outro aluno', async () => {
  const t = await amb.api().post(`/api/simulados/${simMat.id}/iniciar`).set(auth(amb.aluno));
  const outro = (await amb.api().post('/api/auth/cadastro').send({
    nome: 'Outro Aluno', email: 'outro@email.com', senha: 'Senha1234', turma: 'Turma C – Noite',
  })).body.token;
  const r = await amb.api().post(`/api/tentativas/${t.body.tentativaId}/enviar`).set(auth(outro)).send({ respostas: [] });
  assert.equal(r.status, 404);
});

test('CT-16 envio após o fim do tempo (mais tolerância) é recusado pelo servidor', async () => {
  const t = await amb.api().post(`/api/simulados/${simMat.id}/iniciar`).set(auth(amb.aluno));
  // simula que o simulado começou há 2 horas
  await amb.col('tentativas').updateOne({ _id: t.body.tentativaId }, {
    inicio: new Date(Date.now() - 7200000).toISOString(), expiraEm: new Date(Date.now() - 5400000).toISOString(),
  });
  const r = await amb.api().post(`/api/tentativas/${t.body.tentativaId}/enviar`).set(auth(amb.aluno)).send({ respostas: [] });
  assert.equal(r.status, 422);
});

test('CT-17 aluno não acessa o resultado de outro aluno', async () => {
  const [res] = await amb.col('resultados').find();
  const outro = await amb.login('outro@email.com', 'Senha1234');
  assert.equal((await amb.api().get(`/api/resultados/${res._id}`).set(auth(outro))).status, 404);
  assert.equal((await amb.api().get(`/api/resultados/${res._id}`).set(auth(amb.aluno))).status, 200);
});
