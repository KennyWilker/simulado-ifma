const config = require('../config');
const { createMemoryDb } = require('./memory');
const { createMongoDb } = require('./mongo');

let db = null;
async function connect() {
  db = config.mongoUri ? await createMongoDb(config.mongoUri, config.dbName) : createMemoryDb();
  return db;
}
function getDb() {
  if (!db) throw new Error('Banco de dados não inicializado.');
  return db;
}
function setDb(novo) { db = novo; }
const col = name => getDb().collection(name);
module.exports = { connect, getDb, setDb, col };
