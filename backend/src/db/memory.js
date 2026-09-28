// Adaptador em memória com a mesma interface usada do driver MongoDB.
// Usado quando MONGODB_URI não está definido (execução local e testes automatizados).
function match(doc, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v) && '$in' in v) return v.$in.includes(doc[k]);
    return doc[k] === v;
  });
}
const clone = o => (o == null ? o : structuredClone(o));

class MemoryCollection {
  constructor() { this.docs = []; }
  async find(filter = {}, { sort, limit } = {}) {
    let out = this.docs.filter(d => match(d, filter));
    if (sort) {
      const [[campo, dir]] = Object.entries(sort);
      out = [...out].sort((a, b) => (a[campo] > b[campo] ? 1 : a[campo] < b[campo] ? -1 : 0) * dir);
    }
    if (limit) out = out.slice(0, limit);
    return out.map(clone);
  }
  async findOne(filter) { return clone(this.docs.find(d => match(d, filter)) || null); }
  async insertOne(doc) { this.docs.push(clone(doc)); return clone(doc); }
  async updateOne(filter, set) {
    const d = this.docs.find(x => match(x, filter));
    if (!d) return 0;
    Object.assign(d, clone(set));
    return 1;
  }
  async deleteOne(filter) {
    const i = this.docs.findIndex(d => match(d, filter));
    if (i < 0) return 0;
    this.docs.splice(i, 1);
    return 1;
  }
  async countDocuments(filter) { return this.docs.filter(d => match(d, filter)).length; }
}

function createMemoryDb() {
  const cols = {};
  return {
    tipo: 'memoria',
    collection: name => (cols[name] ||= new MemoryCollection()),
    async close() {},
  };
}
module.exports = { createMemoryDb };
