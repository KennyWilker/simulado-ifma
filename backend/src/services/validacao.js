// Validações do lado do servidor (a validação do navegador nunca é suficiente sozinha)
const { HttpError } = require('../middlewares/erros');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONE_RE = /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/;

function texto(valor, campo, { min = 1, max = 500, obrigatorio = true } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    if (obrigatorio) throw new HttpError(400, `O campo "${campo}" é obrigatório.`);
    return '';
  }
  if (typeof valor !== 'string') throw new HttpError(400, `O campo "${campo}" deve ser um texto.`);
  const v = valor.trim();
  if (v.length < min) throw new HttpError(400, `O campo "${campo}" deve ter pelo menos ${min} caracteres.`);
  if (v.length > max) throw new HttpError(400, `O campo "${campo}" deve ter no máximo ${max} caracteres.`);
  return v;
}

function email(valor) {
  const v = texto(valor, 'e-mail', { max: 120 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw new HttpError(400, 'Informe um e-mail válido.');
  return v;
}

function senha(valor, campo = 'senha') {
  if (typeof valor !== 'string') throw new HttpError(400, `O campo "${campo}" é obrigatório.`);
  if (valor.length < 8 || !/[A-Za-z]/.test(valor) || !/\d/.test(valor)) {
    throw new HttpError(400, 'A senha deve ter pelo menos 8 caracteres, com letras e números.');
  }
  if (valor.length > 72) throw new HttpError(400, 'A senha deve ter no máximo 72 caracteres.');
  return valor;
}

function telefone(valor) {
  const v = texto(valor, 'telefone', { obrigatorio: false, max: 20 });
  if (v && !TELEFONE_RE.test(v)) throw new HttpError(400, 'Informe o telefone no formato (99) 99999-9999.');
  return v;
}

function inteiro(valor, campo, min, max) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `O campo "${campo}" deve ser um número inteiro entre ${min} e ${max}.`);
  }
  return n;
}

function umDe(valor, campo, opcoes) {
  if (!opcoes.includes(valor)) throw new HttpError(400, `Valor inválido para "${campo}".`);
  return valor;
}

module.exports = { texto, email, senha, telefone, inteiro, umDe };
