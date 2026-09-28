const config = require("./config");
const { connect } = require("./db");
const { criarApp } = require("./app");
const { popular } = require("./seed");

(async () => {
  const db = await connect();
  if (db.tipo === "memoria") {
    await popular({ demo: true });
    console.log(
      "⚠ MONGODB_URI não definido: usando banco em memória com dados de demonstração.",
    );
  }
  criarApp().listen(config.port, "0.0.0.0", () => {
    console.log(
      `Simulado IFMA rodando em http://localhost:${config.port} (banco: ${db.tipo})`,
    );
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
