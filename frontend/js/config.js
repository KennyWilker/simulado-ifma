// Endereço da API.
// - Local (backend servindo o frontend): '/api'
// - Produção (frontend na Vercel, backend no Render): troque pela URL do Render, ex.:
//   'https://simulado-ifma-api.onrender.com/api'
const PRODUCAO = "/api";
const local = ["localhost", "127.0.0.1"].includes(location.hostname);
export const API_URL =
  local && location.port !== "5500"
    ? "/api"
    : local
      ? "http://localhost:3000/api"
      : PRODUCAO;
