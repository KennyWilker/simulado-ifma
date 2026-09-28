const { Router } = require('express');
const { col } = require('../db');
const { TURMAS } = require('../services/constantes');
const { media, agrupar, ranking } = require('../services/estatisticas');

const r = Router(); // montado com autenticar + exigirPerfil('professor')

r.get('/painel', async (req, res) => {
  const turma = TURMAS.includes(req.query.turma) ? req.query.turma : null;
  const [alunosTodos, resTodos, disciplinas, questoes] = await Promise.all([
    col('usuarios').find({ perfil: 'aluno' }), col('resultados').find(),
    col('disciplinas').find(), col('questoes').find(),
  ]);
  const alunos = turma ? alunosTodos.filter(a => a.turma === turma) : alunosTodos;
  const idsAlunos = new Set(alunos.map(a => a._id));
  const resultados = resTodos.filter(x => idsAlunos.has(x.usuarioId));
  const ativos = new Set(resultados.map(x => x.usuarioId));

  // Taxa de acerto por questão: aponta conteúdos que precisam de revisão em sala
  const stats = new Map();
  for (const x of resultados) for (const d of x.detalhes || []) {
    const s = stats.get(d.questaoId) || { respostas: 0, acertos: 0 };
    s.respostas++; if (d.acertou) s.acertos++;
    stats.set(d.questaoId, s);
  }
  const nomeDisc = Object.fromEntries(disciplinas.map(d => [d._id, d.nome]));
  const questoesCriticas = questoes
    .filter(q => stats.has(q._id))
    .map(q => ({
      id: q._id, enunciado: q.enunciado, disciplina: nomeDisc[q.disciplinaId],
      respostas: stats.get(q._id).respostas,
      taxaAcerto: Math.round((stats.get(q._id).acertos / stats.get(q._id).respostas) * 100),
    }))
    .sort((a, b) => a.taxaAcerto - b.taxaAcerto)
    .slice(0, 5);

  const turmaDoAluno = Object.fromEntries(alunosTodos.map(a => [a._id, a.turma]));
  const porTurmaRes = agrupar(resTodos.map(x => ({ ...x, turmaAtual: turmaDoAluno[x.usuarioId] })), 'turmaAtual');
  res.json({
    turma, turmas: TURMAS,
    totais: {
      alunos: alunos.length, alunosAtivos: ativos.size, simuladosRealizados: resultados.length,
      mediaGeral: media(resultados.map(x => x.nota)),
    },
    porDisciplina: disciplinas.map(d => {
      const rs = resultados.filter(x => x.disciplinaId === d._id);
      return { disciplina: d.nome, media: media(rs.map(x => x.nota)), realizados: rs.length };
    }),
    porTurma: TURMAS.map(t => {
      const rs = porTurmaRes.get(t) || [];
      return { turma: t, alunos: alunosTodos.filter(a => a.turma === t).length, realizados: rs.length, media: media(rs.map(x => x.nota)) };
    }),
    ranking: ranking(resultados, alunos).slice(0, 10),
    questoesCriticas,
  });
});
module.exports = r;
