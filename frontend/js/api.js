import { API_URL } from './config.js';

const CHAVE_TOKEN = 'sifma.token';
const CHAVE_USUARIO = 'sifma.usuario';

export const sessao = {
  get token() { return localStorage.getItem(CHAVE_TOKEN); },
  get usuario() {
    try { return JSON.parse(localStorage.getItem(CHAVE_USUARIO)); } catch { return null; }
  },
  salvar(token, usuario) {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  },
  sair() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  },
};

export class ErroApi extends Error {
  constructor(mensagem, status, dados) { super(mensagem); this.status = status; this.dados = dados; }
}

// Wrapper do fetch: injeta o token, aplica timeout e traduz erros de rede
// Timeout longo: no plano gratuito do Render o servidor pode levar até ~1 minuto para "acordar"
export async function api(caminho, { metodo = 'GET', corpo, timeout = 75000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let resp;
  try {
    resp = await fetch(API_URL + caminho, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(sessao.token ? { Authorization: `Bearer ${sessao.token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: ctrl.signal,
    });
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Verifique sua internet e tente novamente.', 0);
  } finally {
    clearTimeout(t);
  }
  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 401 && sessao.token) {
      sessao.sair();
      location.hash = '#/login';
    }
    throw new ErroApi(dados.erro || `Erro ${resp.status}`, resp.status, dados);
  }
  return dados;
}

// Acorda o servidor assim que o site abre e avisa o usuário se a primeira resposta demorar
export function acordarServidor(avisar) {
  const t = setTimeout(avisar, 3000);
  fetch(API_URL + '/health').catch(() => {}).finally(() => clearTimeout(t));
}
