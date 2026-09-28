const jwt = require('jsonwebtoken');
const config = require('../config');
const { col } = require('../db');
const { HttpError } = require('./erros');

// Verifica o token JWT enviado no cabeçalho Authorization: Bearer <token>
async function autenticar(req, _res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) throw new HttpError(401, 'Faça login para continuar.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Sessão expirada ou inválida. Faça login novamente.');
  }
  // O perfil é relido do banco: um token antigo não mantém permissões removidas
  const usuario = await col('usuarios').findOne({ _id: payload.sub });
  if (!usuario) throw new HttpError(401, 'Usuário não encontrado.');
  req.usuario = { id: usuario._id, perfil: usuario.perfil, nome: usuario.nome, turma: usuario.turma };
  next();
}

// Controle de acesso baseado em perfil (RBAC)
const exigirPerfil = (...perfis) => (req, _res, next) => {
  if (!perfis.includes(req.usuario.perfil)) {
    throw new HttpError(403, 'Seu perfil não tem permissão para esta ação.');
  }
  next();
};

function gerarToken(usuario) {
  return jwt.sign({ sub: usuario._id, perfil: usuario.perfil }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}
module.exports = { autenticar, exigirPerfil, gerarToken };
