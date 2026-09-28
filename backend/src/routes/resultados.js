const { Router } = require('express');
const { col } = require('../db');
const { HttpError } = require('../middlewares/erros');
const { gabarito } = require('./tentativas');

const r = Router(); // montado com autenticar

r.get('/:id', async (req, res) => {
  const x = await col('resultados').findOne({ _id: req.params.id });
  const podeVer = x && (x.usuarioId === req.usuario.id || req.usuario.perfil === 'professor');
  if (!podeVer) throw new HttpError(404, 'Resultado não encontrado.');
  res.json({
    resultadoId: x._id, titulo: x.titulo, nota: x.nota, acertos: x.acertos, total: x.total,
    tempoGastoSeg: x.tempoGastoSeg, data: x.dataRealizacao, gabarito: await gabarito(x.detalhes),
  });
});
module.exports = r;
