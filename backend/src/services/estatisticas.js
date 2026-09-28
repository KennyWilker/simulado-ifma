const media = arr => (arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10 : 0);

// Agrupa resultados por uma chave e calcula média/quantidade
function agrupar(resultados, chave) {
  const g = new Map();
  for (const r of resultados) {
    const k = r[chave];
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(r);
  }
  return g;
}

// Ranking de alunos pela média das notas (desempate: mais simulados realizados)
function ranking(resultados, usuarios) {
  const porAluno = agrupar(resultados, 'usuarioId');
  return usuarios
    .filter(u => porAluno.has(u._id))
    .map(u => {
      const rs = porAluno.get(u._id);
      return { id: u._id, nome: u.nome, turma: u.turma, media: media(rs.map(r => r.nota)), realizados: rs.length };
    })
    .sort((a, b) => b.media - a.media || b.realizados - a.realizados);
}
module.exports = { media, agrupar, ranking };
