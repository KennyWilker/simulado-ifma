// Serviço de correção automática. Função pura: as mesmas respostas sempre geram o mesmo resultado.
// questoes: [{ _id, respostaCorreta }]  respostas: [{ questaoId, alternativa }]
function corrigir(questoes, respostas = []) {
  const marcadas = new Map();
  for (const r of Array.isArray(respostas) ? respostas : []) {
    if (!r || typeof r.questaoId !== 'string') continue;
    if (!Number.isInteger(r.alternativa)) continue;
    if (!marcadas.has(r.questaoId)) marcadas.set(r.questaoId, r.alternativa); // vale a primeira ocorrência
  }
  const detalhes = questoes.map(q => {
    const marcada = marcadas.has(q._id) ? marcadas.get(q._id) : null;
    return { questaoId: q._id, marcada, correta: q.respostaCorreta, acertou: marcada === q.respostaCorreta };
  });
  const acertos = detalhes.filter(d => d.acertou).length;
  const total = questoes.length;
  const nota = total ? Math.round((acertos / total) * 100) / 10 : 0; // escala 0–10, uma casa decimal
  return { acertos, total, nota, detalhes };
}
module.exports = { corrigir };
