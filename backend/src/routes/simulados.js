const { Router } = require('express');
const crypto = require('node:crypto');
const { col } = require('../db');
const v = require('../services/validacao');
const { HttpError } = require('../middlewares/erros');
const { exigirPerfil } = require('../middlewares/auth');

const r = Router(); // montado com autenticar

// Remove o gabarito antes de enviar a questão ao navegador do aluno
const semGabarito = q => ({ id: q._id, enunciado: q.enunciado, alternativas: q.alternativas });

r.get('/', async (req, res) => {
  const professor = req.usuario.perfil === 'professor';
  const [simulados, disciplinas, meus] = await Promise.all([
    col('simulados').find(professor ? {} : { ativo: true }, { sort: { criadoEm: -1 } }),
    col('disciplinas').find(),
    professor ? [] : col('resultados').find({ usuarioId: req.usuario.id }),
  ]);
  const disc = Object.fromEntries(disciplinas.map(d => [d._id, { id: d._id, nome: d.nome }]));
  res.json(simulados.map(s => {
    const feitos = meus.filter(x => x.simuladoId === s._id);
    return {
      id: s._id, titulo: s.titulo, disciplina: disc[s.disciplinaId], tempoLimite: s.tempoLimite,
      qtdQuestoes: s.questoesIds.length, ativo: s.ativo,
      ...(professor ? { questoesIds: s.questoesIds }
        : { vezesFeitas: feitos.length, melhorNota: feitos.length ? Math.max(...feitos.map(x => x.nota)) : null }),
    };
  }));
});

// ---------- Aluno: iniciar/retomar tentativa ----------
r.post('/:id/iniciar', exigirPerfil('aluno'), async (req, res) => {
  const simulado = await col('simulados').findOne({ _id: req.params.id });
  if (!simulado || !simulado.ativo) throw new HttpError(404, 'Simulado não encontrado ou indisponível.');

  // Se já existe tentativa aberta e dentro do prazo, ela é retomada (sem perda de progresso)
  const abertas = await col('tentativas').find({ usuarioId: req.usuario.id, simuladoId: simulado._id, status: 'aberta' });
  let tentativa = abertas.find(t => Date.parse(t.expiraEm) > Date.now());
  if (!tentativa) {
    const inicio = new Date();
    tentativa = await col('tentativas').insertOne({
      _id: crypto.randomUUID(), usuarioId: req.usuario.id, simuladoId: simulado._id,
      questoesIds: simulado.questoesIds, status: 'aberta',
      inicio: inicio.toISOString(),
      expiraEm: new Date(inicio.getTime() + simulado.tempoLimite * 60000).toISOString(),
    });
  }
  const questoes = await col('questoes').find({ _id: { $in: tentativa.questoesIds } });
  const ordem = new Map(tentativa.questoesIds.map((id, i) => [id, i]));
  questoes.sort((a, b) => ordem.get(a._id) - ordem.get(b._id));
  const disciplina = await col('disciplinas').findOne({ _id: simulado.disciplinaId });

  res.status(201).json({
    tentativaId: tentativa._id, titulo: simulado.titulo, disciplina: disciplina?.nome,
    inicio: tentativa.inicio, expiraEm: tentativa.expiraEm, agora: new Date().toISOString(),
    questoes: questoes.map(semGabarito),
  });
});

// ---------- Professor: montar simulados ----------
async function validarSimulado(body) {
  const disciplina = await col('disciplinas').findOne({ _id: v.texto(body.disciplinaId, 'disciplina', { max: 64 }) });
  if (!disciplina) throw new HttpError(400, 'Selecione uma disciplina válida.');
  if (!Array.isArray(body.questoesIds) || body.questoesIds.length < 1 || body.questoesIds.length > 60) {
    throw new HttpError(400, 'Selecione de 1 a 60 questões.');
  }
  const ids = [...new Set(body.questoesIds.filter(x => typeof x === 'string'))];
  const questoes = await col('questoes').find({ _id: { $in: ids } });
  if (questoes.length !== ids.length) throw new HttpError(400, 'Alguma questão selecionada não existe mais.');
  if (questoes.some(q => q.disciplinaId !== disciplina._id)) {
    throw new HttpError(400, 'Todas as questões devem ser da disciplina do simulado.');
  }
  return {
    titulo: v.texto(body.titulo, 'título', { min: 3, max: 100 }),
    disciplinaId: disciplina._id,
    questoesIds: ids,
    tempoLimite: v.inteiro(body.tempoLimite, 'tempo limite (min)', 5, 240),
    ativo: body.ativo !== false,
  };
}

r.post('/', exigirPerfil('professor'), async (req, res) => {
  const s = await col('simulados').insertOne({
    _id: crypto.randomUUID(), ...(await validarSimulado(req.body)),
    autorId: req.usuario.id, criadoEm: new Date().toISOString(),
  });
  res.status(201).json({ ...s, id: s._id });
});

r.put('/:id', exigirPerfil('professor'), async (req, res) => {
  if (!(await col('simulados').findOne({ _id: req.params.id }))) throw new HttpError(404, 'Simulado não encontrado.');
  await col('simulados').updateOne({ _id: req.params.id }, await validarSimulado(req.body));
  const s = await col('simulados').findOne({ _id: req.params.id });
  res.json({ ...s, id: s._id });
});

r.patch('/:id/ativo', exigirPerfil('professor'), async (req, res) => {
  if (typeof req.body.ativo !== 'boolean') throw new HttpError(400, 'Informe ativo: true ou false.');
  if (!(await col('simulados').updateOne({ _id: req.params.id }, { ativo: req.body.ativo }))) {
    throw new HttpError(404, 'Simulado não encontrado.');
  }
  res.json({ id: req.params.id, ativo: req.body.ativo });
});

r.delete('/:id', exigirPerfil('professor'), async (req, res) => {
  if (!(await col('simulados').deleteOne({ _id: req.params.id }))) throw new HttpError(404, 'Simulado não encontrado.');
  res.status(204).end();
});

module.exports = r;
