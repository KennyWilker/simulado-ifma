const { Router } = require('express');
const crypto = require('node:crypto');
const config = require('../config');
const { col } = require('../db');
const { HttpError } = require('../middlewares/erros');
const { corrigir } = require('../services/correcao');

const r = Router(); // montado com autenticar + exigirPerfil('aluno')

// Monta o gabarito comentado a partir das questões atuais
async function gabarito(detalhes) {
  const questoes = await col('questoes').find({ _id: { $in: detalhes.map(d => d.questaoId) } });
  const porId = Object.fromEntries(questoes.map(q => [q._id, q]));
  return detalhes.map(d => ({
    ...d,
    enunciado: porId[d.questaoId]?.enunciado || '(questão removida do banco)',
    alternativas: porId[d.questaoId]?.alternativas || [],
    explicacao: porId[d.questaoId]?.explicacao || '',
  }));
}

r.post('/:id/enviar', async (req, res) => {
  const t = await col('tentativas').findOne({ _id: req.params.id });
  // Tentativa de outro aluno é tratada como inexistente (não revela IDs válidos)
  if (!t || t.usuarioId !== req.usuario.id) throw new HttpError(404, 'Tentativa não encontrada.');
  if (t.status !== 'aberta') {
    throw new HttpError(409, 'Este simulado já foi enviado.', { resultadoId: t.resultadoId });
  }
  const agora = Date.now();
  if (agora > Date.parse(t.expiraEm) + config.toleranciaEnvioSeg * 1000) {
    await col('tentativas').updateOne({ _id: t._id }, { status: 'expirada' });
    throw new HttpError(422, 'O tempo deste simulado terminou e as respostas não foram enviadas a tempo.');
  }
  if (!Array.isArray(req.body.respostas) || req.body.respostas.length > 200) {
    throw new HttpError(400, 'Formato de respostas inválido.');
  }
  const simulado = await col('simulados').findOne({ _id: t.simuladoId });
  const questoes = await col('questoes').find({ _id: { $in: t.questoesIds } });
  const ordem = new Map(t.questoesIds.map((id, i) => [id, i]));
  questoes.sort((a, b) => ordem.get(a._id) - ordem.get(b._id));

  const resultado = corrigir(questoes, req.body.respostas);
  const usuario = await col('usuarios').findOne({ _id: req.usuario.id });
  const doc = await col('resultados').insertOne({
    _id: crypto.randomUUID(), usuarioId: req.usuario.id, turma: usuario.turma || '',
    simuladoId: t.simuladoId, disciplinaId: simulado?.disciplinaId, titulo: simulado?.titulo || 'Simulado',
    respostasAluno: resultado.detalhes.map(d => ({ questaoId: d.questaoId, alternativa: d.marcada })),
    detalhes: resultado.detalhes, acertos: resultado.acertos, total: resultado.total, nota: resultado.nota,
    tempoGastoSeg: Math.min(Math.round((agora - Date.parse(t.inicio)) / 1000), (simulado?.tempoLimite || 0) * 60 || Infinity),
    dataRealizacao: new Date(agora).toISOString(),
  });
  await col('tentativas').updateOne({ _id: t._id }, { status: 'enviada', resultadoId: doc._id });

  res.status(201).json({
    resultadoId: doc._id, titulo: doc.titulo, nota: doc.nota, acertos: doc.acertos, total: doc.total,
    tempoGastoSeg: doc.tempoGastoSeg, gabarito: await gabarito(doc.detalhes),
  });
});

module.exports = { router: r, gabarito };
