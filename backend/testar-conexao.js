require("dotenv").config();
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Conectado ao MongoDB");
    return mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Erro na conexão:", err.message);
    process.exit(1);
  });
