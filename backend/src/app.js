const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const sanitizar = require('./middlewares/sanitizar');
const { tratarErros, HttpError } = require('./middlewares/erros');
const { autenticar, exigirPerfil } = require('./middlewares/auth');
const { col, getDb } = require('./db');

function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render/Vercel ficam atrás de proxy (necessário para o rate limit)

  app.use(helmet({
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: config.isProd ? [] : null }, // permite http://localhost
    },
  }));
  app.use(cors({
    origin: (origem, cb) => cb(null, !origem || config.frontendUrl.includes(origem)),
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizar);

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok', banco: getDb().tipo }));
  api.get('/turmas', (_req, res) => res.json(require('./services/constantes').TURMAS));
  api.use('/auth', require('./routes/auth').router);

  api.use(autenticar); // tudo abaixo exige login
  api.get('/disciplinas', async (_req, res) => {
    const ds = await col('disciplinas').find({}, { sort: { nome: 1 } });
    res.json(ds.map(d => ({ id: d._id, nome: d.nome, descricao: d.descricao })));
  });
  api.use('/me', require('./routes/me'));
  api.use('/simulados', require('./routes/simulados'));
  api.use('/tentativas', exigirPerfil('aluno'), require('./routes/tentativas').router);
  api.use('/resultados', require('./routes/resultados'));
  api.use('/questoes', exigirPerfil('professor'), require('./routes/questoes'));
  api.use('/admin', exigirPerfil('professor'), require('./routes/admin'));
  api.use((_req, _res) => { throw new HttpError(404, 'Rota não encontrada.'); });

  app.use('/api', api);

  // Modo local: o próprio backend serve o frontend (em produção o frontend fica na Vercel)
  if (config.serveFrontend && !config.isTest) {
    app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
  }
  app.use(tratarErros);
  return app;
}
module.exports = { criarApp };
