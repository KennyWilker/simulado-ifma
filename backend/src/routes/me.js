const { Router } = require('express');
const config = require('../config');
const { col } = require('../db');
const v = require('../services/validacao');
const { TURMAS } = require('../services/constantes');
const { media, ranking } = require('../services/estatisticas');
const { publico } = require('./auth');

const r = Router();

r.get('/', async (req, res) => {
  res.json(publico(await col('usuarios').findOne({ _id: req.usuario.id })));
});

r.put('/', async (req, res) => {
  const dados = {
    nome: v.texto(req.body.nome, 'nome', { min: 3, max: 80 }),
    telefone: v.telefone(req.body.telefone),
  };
  if (req.usuario.perfil === 'aluno') dados.turma = v.umDe(req.body.turma, 'turma', TURMAS);
  await col('usuarios').updateOne({ _id: req.usuario.id }, dados);
  res.json(publico(await col('usuarios').findOne({ _id: req.usuario.id })));
});

r.get('/estatisticas', async (req, res) => {
  const [meus, disciplinas] = await Promise.all([
    col('resultados').find({ usuarioId: req.usuario.id }, { sort: { dataRealizacao: -1 } }),
    col('disciplinas').find(),
  ]);
  const nomeDisc = Object.fromEntries(disciplinas.map(d => [d._id, d.nome]));
  const seteDias = Date.now() - 7 * 24 * 3600 * 1000;

  // Posição no ranking geral entre alunos que já realizaram simulados
  const [todos, alunos] = await Promise.all([
    col('resultados').find(),
    col('usuarios').find({ perfil: 'aluno' }),
  ]);
  const rank = ranking(todos, alunos);
  const pos = rank.findIndex(x => x.id === req.usuario.id);

  res.json({
    simuladosFeitos: meus.length,
    media: media(meus.map(x => x.nota)),
    questoesResolvidas: meus.reduce((s, x) => s + x.total, 0),
    minutosEstudo: Math.round(meus.reduce((s, x) => s + (x.tempoGastoSeg || 0), 0) / 60),
    semana: { feitos: meus.filter(x => Date.parse(x.dataRealizacao) >= seteDias).length, meta: config.metaSemanal },
    ranking: pos >= 0 ? pos + 1 : null,
    totalRanqueados: rank.length,
    porDisciplina: disciplinas.map(d => {
      const rs = meus.filter(x => x.disciplinaId === d._id);
      return { disciplina: d.nome, media: media(rs.map(x => x.nota)), realizados: rs.length };
    }),
    evolucao: meus.slice(0, 8).reverse().map(x => ({ data: x.dataRealizacao, nota: x.nota, disciplina: nomeDisc[x.disciplinaId] })),
    historico: meus.slice(0, 30).map(x => ({
      id: x._id, titulo: x.titulo, disciplina: nomeDisc[x.disciplinaId] || '—',
      data: x.dataRealizacao, nota: x.nota, acertos: x.acertos, total: x.total,
    })),
  });
});

module.exports = r;
