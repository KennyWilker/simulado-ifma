const { Router } = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { col } = require('../db');
const v = require('../services/validacao');
const { TURMAS } = require('../services/constantes');
const { HttpError } = require('../middlewares/erros');
const { gerarToken } = require('../middlewares/auth');

const r = Router();

// Limita tentativas de login/recuperação para dificultar ataques de força bruta
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

const publico = u => ({
  id: u._id, nome: u.nome, email: u.email, perfil: u.perfil,
  telefone: u.telefone || '', turma: u.turma || '', dataCadastro: u.dataCadastro,
});

r.post('/cadastro', async (req, res) => {
  const nome = v.texto(req.body.nome, 'nome', { min: 3, max: 80 });
  const email = v.email(req.body.email);
  const senha = v.senha(req.body.senha);
  const telefone = v.telefone(req.body.telefone);
  const turma = v.umDe(req.body.turma, 'turma', TURMAS);

  if (await col('usuarios').findOne({ email })) {
    throw new HttpError(409, 'Já existe uma conta com este e-mail.');
  }
  // O perfil NUNCA vem do corpo da requisição: cadastro público cria apenas alunos
  const usuario = await col('usuarios').insertOne({
    _id: crypto.randomUUID(), nome, email, telefone, turma,
    senhaHash: await bcrypt.hash(senha, config.bcryptRounds),
    perfil: 'aluno', dataCadastro: new Date().toISOString(),
  });
  res.status(201).json({ token: gerarToken(usuario), usuario: publico(usuario) });
});

r.post('/login', limitador, async (req, res) => {
  const email = v.email(req.body.email);
  if (typeof req.body.senha !== 'string' || !req.body.senha) throw new HttpError(400, 'Informe a senha.');
  const usuario = await col('usuarios').findOne({ email });
  // Mesma mensagem para e-mail inexistente e senha errada (não revela quais e-mails existem)
  if (!usuario || !(await bcrypt.compare(req.body.senha, usuario.senhaHash))) {
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  res.json({ token: gerarToken(usuario), usuario: publico(usuario) });
});

const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');

r.post('/recuperar', limitador, async (req, res) => {
  const email = v.email(req.body.email);
  const usuario = await col('usuarios').findOne({ email });
  const resposta = { mensagem: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.' };
  if (usuario) {
    const codigo = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 caracteres
    await col('usuarios').updateOne({ _id: usuario._id }, {
      resetHash: hashToken(codigo),
      resetExpira: Date.now() + 15 * 60 * 1000,
    });
    // MVP: sem provedor de e-mail. Fora de produção o código é devolvido para permitir o teste do fluxo.
    if (!config.isProd) resposta.codigoDev = codigo;
    else console.log(`[recuperação] código gerado para ${email}`);
  }
  res.json(resposta);
});

r.post('/redefinir', limitador, async (req, res) => {
  const email = v.email(req.body.email);
  const codigo = v.texto(req.body.codigo, 'código', { max: 20 }).toUpperCase();
  const senha = v.senha(req.body.novaSenha, 'nova senha');
  const usuario = await col('usuarios').findOne({ email });
  if (!usuario || !usuario.resetHash || usuario.resetExpira < Date.now() || usuario.resetHash !== hashToken(codigo)) {
    throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.');
  }
  await col('usuarios').updateOne({ _id: usuario._id }, {
    senhaHash: await bcrypt.hash(senha, config.bcryptRounds), resetHash: null, resetExpira: null,
  });
  res.json({ mensagem: 'Senha redefinida. Entre com a nova senha.' });
});

module.exports = { router: r, publico };
