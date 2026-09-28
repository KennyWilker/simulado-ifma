class HttpError extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

function tratarErros(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido na requisição.' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    erro: status >= 500 ? 'Erro interno no servidor. Tente novamente.' : err.message,
    ...(err.detalhes ? { detalhes: err.detalhes } : {}),
  });
}
module.exports = { HttpError, tratarErros };
