const { Router } = require('express');
const crypto = require('node:crypto');
const { col } = require('../db');
const v = require('../services/validacao');
const { HttpError } = require('../middlewares/erros');

const r = Router(); // montado com autenticar + exigirPerfil('professor')

async function validarQuestao(body) {
  const disciplina = await col('disciplinas').findOne({ _id: v.texto(body.disciplinaId, 'disciplina', { max: 64 }) });
  if (!disciplina) throw new HttpError(400, 'Selecione uma disciplina válida.');
  if (!Array.isArray(body.alternativas) || body.alternativas.length < 4 || body.alternativas.length > 5) {
    throw new HttpError(400, 'A questão deve ter de 4 a 5 alternativas.');
  }
  const alternativas = body.alternativas.map((a, i) =>
    v.texto(a, `alternativa ${String.fromCharCode(65 + i)}`, { max: 500 }));
  if (new Set(alternativas.map(a => a.toLowerCase())).size !== alternativas.length) {
    throw new HttpError(400, 'Existem alternativas repetidas.');
  }
  return {
    disciplinaId: disciplina._id,
    enunciado: v.texto(body.enunciado, 'enunciado', { min: 10, max: 2000 }),
    alternativas,
    respostaCorreta: v.inteiro(body.respostaCorreta, 'resposta correta', 0, alternativas.length - 1),
    nivel: v.umDe(body.nivel, 'nível', ['facil', 'medio', 'dificil']),
    explicacao: v.texto(body.explicacao, 'explicação', { obrigatorio: false, max: 1000 }),
  };
}

r.get('/', async (req, res) => {
  const filtro = typeof req.query.disciplinaId === 'string' && req.query.disciplinaId
    ? { disciplinaId: req.query.disciplinaId } : {};
  let lista = await col('questoes').find(filtro, { sort: { criadaEm: -1 } });
  const busca = typeof req.query.busca === 'string' ? req.query.busca.trim().toLowerCase() : '';
  if (busca) lista = lista.filter(q => q.enunciado.toLowerCase().includes(busca));
  const simulados = await col('simulados').find();
  res.json(lista.map(q => ({
    ...q, id: q._id,
    emUso: simulados.filter(s => s.questoesIds.includes(q._id)).length,
  })));
});

r.post('/', async (req, res) => {
  const dados = await validarQuestao(req.body);
  const q = await col('questoes').insertOne({
    _id: crypto.randomUUID(), ...dados, autorId: req.usuario.id, criadaEm: new Date().toISOString(),
  });
  res.status(201).json({ ...q, id: q._id });
});

r.put('/:id', async (req, res) => {
  if (!(await col('questoes').findOne({ _id: req.params.id }))) throw new HttpError(404, 'Questão não encontrada.');
  const dados = await validarQuestao(req.body);
  await col('questoes').updateOne({ _id: req.params.id }, { ...dados, atualizadaEm: new Date().toISOString() });
  const q = await col('questoes').findOne({ _id: req.params.id });
  res.json({ ...q, id: q._id });
});

r.delete('/:id', async (req, res) => {
  const simulados = await col('simulados').find();
  const usando = simulados.filter(s => s.questoesIds.includes(req.params.id));
  if (usando.length) {
    throw new HttpError(409, `Esta questão está em ${usando.length} simulado(s). Remova-a dos simulados antes de excluir.`);
  }
  if (!(await col('questoes').deleteOne({ _id: req.params.id }))) throw new HttpError(404, 'Questão não encontrada.');
  res.status(204).end();
});

module.exports = r;
