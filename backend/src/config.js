// Configurações lidas de variáveis de ambiente (credenciais nunca ficam no código-fonte)
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}

module.exports = {
  isTest,
  isProd,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || '',          // vazio => banco em memória (desenvolvimento/testes)
  dbName: process.env.DB_NAME || 'simulado_ifma',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-altere-em-producao',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:5500')
    .split(',').map(s => s.trim()),
  serveFrontend: process.env.SERVE_FRONTEND !== 'false', // serve a pasta ../frontend no modo local
  toleranciaEnvioSeg: 60,                               // tolerância de rede ao enviar após o fim do tempo
  metaSemanal: 5,
  bcryptRounds: isTest ? 4 : 10,
};
