// Adaptador para MongoDB (MongoDB Atlas em produção)
const { MongoClient } = require('mongodb');

function wrap(col) {
  return {
    find: (filter = {}, { sort, limit } = {}) => {
      let cur = col.find(filter);
      if (sort) cur = cur.sort(sort);
      if (limit) cur = cur.limit(limit);
      return cur.toArray();
    },
    findOne: filter => col.findOne(filter),
    insertOne: async doc => { await col.insertOne(doc); return doc; },
    updateOne: async (filter, set) => (await col.updateOne(filter, { $set: set })).matchedCount,
    deleteOne: async filter => (await col.deleteOne(filter)).deletedCount,
    countDocuments: filter => col.countDocuments(filter),
  };
}

async function createMongoDb(uri, dbName) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  await db.collection('usuarios').createIndex({ email: 1 }, { unique: true });
  await db.collection('resultados').createIndex({ usuarioId: 1 });
  await db.collection('questoes').createIndex({ disciplinaId: 1 });
  return {
    tipo: 'mongodb',
    collection: name => wrap(db.collection(name)),
    close: () => client.close(),
  };
}
module.exports = { createMongoDb };
