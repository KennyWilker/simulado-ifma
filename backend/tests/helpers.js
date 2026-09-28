process.env.NODE_ENV = 'test';
const request = require('supertest');
const { setDb, col } = require('../src/db');
const { createMemoryDb } = require('../src/db/memory');
const { criarApp } = require('../src/app');
const { popular } = require('../src/seed');

// Cada suíte recebe um banco em memória novo e populado (testes independentes)
async function novoAmbiente() {
  setDb(createMemoryDb());
  await popular({ demo: false });
  const app = criarApp();
  const api = () => request(app);
  const login = async (email, senha) => (await api().post('/api/auth/login').send({ email, senha })).body.token;
  const professor = await login('professor@simuladoifma.com', 'Professor123');
  const cad = await api().post('/api/auth/cadastro').send({
    nome: 'Aluno Teste', email: 'aluno.teste@email.com', senha: 'Senha1234', turma: 'Turma A – Manhã',
  });
  return { app, api, login, professor, aluno: cad.body.token, alunoId: cad.body.usuario.id, col };
}
const auth = t => ({ Authorization: `Bearer ${t}` });
module.exports = { novoAmbiente, auth };
