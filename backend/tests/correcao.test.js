const { test } = require('node:test');
const assert = require('node:assert/strict');
const { corrigir } = require('../src/services/correcao');

const Q = [
  { _id: 'q1', respostaCorreta: 1 }, { _id: 'q2', respostaCorreta: 0 },
  { _id: 'q3', respostaCorreta: 3 }, { _id: 'q4', respostaCorreta: 2 },
];

test('CT-U01 todas corretas resultam em nota 10', () => {
  const r = corrigir(Q, Q.map(q => ({ questaoId: q._id, alternativa: q.respostaCorreta })));
  assert.deepEqual([r.acertos, r.total, r.nota], [4, 4, 10]);
});

test('CT-U02 nenhuma resposta resulta em nota 0 e questões em branco contam como erro', () => {
  const r = corrigir(Q, []);
  assert.equal(r.nota, 0);
  assert.ok(r.detalhes.every(d => d.marcada === null && !d.acertou));
});

test('CT-U03 nota proporcional com arredondamento de uma casa (2 de 3 = 6,7)', () => {
  const r = corrigir(Q.slice(0, 3), [
    { questaoId: 'q1', alternativa: 1 }, { questaoId: 'q2', alternativa: 0 }, { questaoId: 'q3', alternativa: 0 },
  ]);
  assert.equal(r.nota, 6.7);
});

test('CT-U04 correção é determinística (mesmas respostas, mesmo resultado)', () => {
  const resp = [{ questaoId: 'q1', alternativa: 1 }, { questaoId: 'q3', alternativa: 2 }];
  assert.deepEqual(corrigir(Q, resp), corrigir(Q, resp));
});

test('CT-U05 ignora questões estranhas, respostas duplicadas e valores inválidos', () => {
  const r = corrigir(Q, [
    { questaoId: 'q1', alternativa: 0 }, { questaoId: 'q1', alternativa: 1 }, // vale a primeira (errada)
    { questaoId: 'intrusa', alternativa: 0 },
    { questaoId: 'q2', alternativa: '0' }, // string não é aceita
    null,
  ]);
  assert.equal(r.acertos, 0);
  assert.equal(r.total, 4);
});
