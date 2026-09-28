const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { novoAmbiente, auth } = require('./helpers');

let amb, disc;
const questaoValida = () => ({
  disciplinaId: disc.find(d => d.nome === 'Matemática').id,
  enunciado: 'Quanto é 7 × 8?', alternativas: ['54', '56', '58', '64'], respostaCorreta: 1, nivel: 'facil',
});
before(async () => {
  amb = await novoAmbiente();
  disc = (await amb.api().get('/api/disciplinas').set(auth(amb.professor))).body;
});

test('CT-18 RBAC: aluno não acessa o cadastro de questões nem o painel (403)', async () => {
  assert.equal((await amb.api().post('/api/questoes').set(auth(amb.aluno)).send(questaoValida())).status, 403);
  assert.equal((await amb.api().get('/api/questoes').set(auth(amb.aluno))).status, 403);
  assert.equal((await amb.api().get('/api/admin/painel').set(auth(amb.aluno))).status, 403);
  assert.equal((await amb.api().post('/api/simulados').set(auth(amb.aluno)).send({})).status, 403);
});

test('CT-19 professor cadastra, edita e lista questões', async () => {
  const c = await amb.api().post('/api/questoes').set(auth(amb.professor)).send(questaoValida());
  assert.equal(c.status, 201);
  const e = await amb.api().put(`/api/questoes/${c.body.id}`).set(auth(amb.professor))
    .send({ ...questaoValida(), enunciado: 'Quanto é 8 × 7?' });
  assert.equal(e.status, 200);
  assert.equal(e.body.enunciado, 'Quanto é 8 × 7?');
  const l = await amb.api().get('/api/questoes?busca=8 × 7').set(auth(amb.professor));
  assert.equal(l.body.length, 1);
});

test('CT-20 questões inválidas são recusadas (400)', async () => {
  const casos = [
    { alternativas: ['1', '2', '3'] },                // menos de 4 alternativas
    { alternativas: ['1', '1', '2', '3'] },           // alternativas repetidas
    { respostaCorreta: 7 },                           // gabarito fora do intervalo
    { disciplinaId: 'inexistente' },                  // disciplina inválida
    { enunciado: 'curto' },                           // enunciado muito curto
    { nivel: 'impossivel' },
  ];
  for (const alt of casos) {
    const r = await amb.api().post('/api/questoes').set(auth(amb.professor)).send({ ...questaoValida(), ...alt });
    assert.equal(r.status, 400, JSON.stringify(alt));
  }
});

test('CT-21 não é possível excluir questão usada em simulado (409); questão livre é excluída', async () => {
  const [emUso] = (await amb.api().get('/api/questoes').set(auth(amb.professor))).body.filter(q => q.emUso > 0);
  assert.equal((await amb.api().delete(`/api/questoes/${emUso.id}`).set(auth(amb.professor))).status, 409);
  const livre = await amb.api().post('/api/questoes').set(auth(amb.professor)).send({ ...questaoValida(), enunciado: 'Quanto é 9 × 9?' });
  assert.equal((await amb.api().delete(`/api/questoes/${livre.body.id}`).set(auth(amb.professor))).status, 204);
});

test('CT-22 professor monta simulado; questões de outra disciplina são recusadas', async () => {
  const qs = (await amb.api().get('/api/questoes').set(auth(amb.professor))).body;
  const mat = disc.find(d => d.nome === 'Matemática').id;
  const idsMat = qs.filter(q => q.disciplinaId === mat).slice(0, 5).map(q => q.id);
  const idPor = qs.find(q => q.disciplinaId !== mat).id;
  const ok = await amb.api().post('/api/simulados').set(auth(amb.professor))
    .send({ titulo: 'Simulado 2 – Matemática', disciplinaId: mat, questoesIds: idsMat, tempoLimite: 20 });
  assert.equal(ok.status, 201);
  const misto = await amb.api().post('/api/simulados').set(auth(amb.professor))
    .send({ titulo: 'Misto', disciplinaId: mat, questoesIds: [...idsMat, idPor], tempoLimite: 20 });
  assert.equal(misto.status, 400);
  // desativado, deixa de aparecer para o aluno
  await amb.api().patch(`/api/simulados/${ok.body.id}/ativo`).set(auth(amb.professor)).send({ ativo: false });
  const doAluno = (await amb.api().get('/api/simulados').set(auth(amb.aluno))).body;
  assert.ok(!doAluno.some(s => s.id === ok.body.id));
});

test('CT-23 painel administrativo apresenta indicadores por turma e disciplina', async () => {
  const r = await amb.api().get('/api/admin/painel').set(auth(amb.professor));
  assert.equal(r.status, 200);
  assert.equal(r.body.porTurma.length, 3);
  assert.deepEqual(r.body.porDisciplina.map(d => d.disciplina).sort(), ['Matemática', 'Português']);
});

test('CT-24 desempenho: 100 requisições de listagem com tempo médio abaixo de 200 ms', async () => {
  const ini = performance.now();
  for (let i = 0; i < 100; i++) await amb.api().get('/api/simulados').set(auth(amb.aluno));
  const medio = (performance.now() - ini) / 100;
  console.log(`   tempo médio por requisição: ${medio.toFixed(1)} ms`);
  assert.ok(medio < 200);
});
