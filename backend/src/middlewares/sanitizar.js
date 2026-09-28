// Remove chaves iniciadas por "$" ou contendo "." do corpo da requisição,
// bloqueando tentativas de injeção de operadores NoSQL (ex.: {"email": {"$ne": null}}).
function limpar(valor) {
  if (Array.isArray(valor)) return valor.map(limpar);
  if (valor && typeof valor === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(valor)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = limpar(v);
    }
    return out;
  }
  return valor;
}
module.exports = (req, _res, next) => {
  if (req.body) req.body = limpar(req.body);
  next();
};
