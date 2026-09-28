// Popula o banco com disciplinas, professor, banco de questões e simulados iniciais.
// Uso com MongoDB: MONGODB_URI=... SEED_PROFESSOR_SENHA=... npm run seed
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { col, connect, getDb } = require('./db');
const { corrigir } = require('./services/correcao');

const id = () => crypto.randomUUID();

const MAT = [
  ['Qual é o resultado de 15 + 8 × 2?', ['46', '31', '30', '23'], 1, 'facil', 'A multiplicação vem antes da adição: 8 × 2 = 16 e 15 + 16 = 31.'],
  ['Uma camisa custava R$ 80,00 e teve desconto de 25%. Qual é o novo preço?', ['R$ 60,00', 'R$ 55,00', 'R$ 65,00', 'R$ 70,00'], 0, 'facil', '25% de 80 é 20; 80 − 20 = 60.'],
  ['Qual é a solução da equação 3x − 7 = 11?', ['x = 4', 'x = 5', 'x = 6', 'x = 7'], 2, 'facil', '3x = 18, logo x = 6.'],
  ['Um retângulo tem 12 cm de comprimento e 5 cm de largura. Qual é a sua área?', ['17 cm²', '34 cm²', '60 cm²', '120 cm²'], 2, 'facil', 'Área = comprimento × largura = 12 × 5 = 60 cm².'],
  ['Qual é o valor de 2³ + √49?', ['12', '13', '14', '15'], 3, 'medio', '2³ = 8 e √49 = 7; 8 + 7 = 15.'],
  ['Em uma turma de 40 alunos, 3/8 são meninos. Quantas meninas há na turma?', ['15', '20', '24', '25'], 3, 'medio', '3/8 de 40 = 15 meninos; 40 − 15 = 25 meninas.'],
  ['Qual fração é equivalente a 0,75?', ['3/5', '7/10', '3/4', '4/5'], 2, 'facil', '0,75 = 75/100 = 3/4.'],
  ['Um carro percorre 240 km com 20 litros de combustível. Quantos litros ele gasta para percorrer 360 km?', ['25 litros', '28 litros', '30 litros', '32 litros'], 2, 'medio', 'O carro faz 12 km/L; 360 ÷ 12 = 30 litros.'],
  ['A soma dos ângulos internos de qualquer triângulo é igual a:', ['90°', '180°', '270°', '360°'], 1, 'facil', 'Em todo triângulo, a soma dos ângulos internos é 180°.'],
  ['Qual é o mínimo múltiplo comum (MMC) de 12 e 18?', ['36', '24', '6', '72'], 0, 'medio', '12 = 2²·3 e 18 = 2·3²; MMC = 2²·3² = 36.'],
  ['Se 5 operários constroem um muro em 12 dias, em quantos dias 6 operários constroem o mesmo muro?', ['10 dias', '14 dias', '8 dias', '9 dias'], 0, 'dificil', 'Grandezas inversamente proporcionais: 5 × 12 = 60; 60 ÷ 6 = 10 dias.'],
  ['A média aritmética dos números 6, 8, 7 e 9 é:', ['7', '7,5', '8', '6,5'], 1, 'facil', '(6 + 8 + 7 + 9) ÷ 4 = 30 ÷ 4 = 7,5.'],
];
const POR = [
  ['Assinale a palavra acentuada pela mesma regra de "lâmpada".', ['sofá', 'lápis', 'música', 'herói'], 2, 'medio', '"Lâmpada" e "música" são proparoxítonas, e todas as proparoxítonas são acentuadas.'],
  ['Na frase "Os alunos estudaram bastante para a prova", o sujeito é:', ['bastante', 'a prova', 'Os alunos', 'estudaram'], 2, 'facil', 'Quem estudou? "Os alunos" — esse é o sujeito da oração.'],
  ['Assinale a alternativa em que o uso da crase está correto.', ['Fui à escola ontem.', 'Ele começou à estudar.', 'Entreguei o livro à ele.', 'Vou à pé para casa.'], 0, 'medio', 'Quem vai, vai "a" algum lugar + "a escola" = "à escola". Não há crase antes de verbo, pronome pessoal ou palavra masculina.'],
  ['Qual é o plural correto de "cidadão"?', ['cidadões', 'cidadães', 'cidadãos', 'cidadaos'], 2, 'facil', 'O plural de "cidadão" é "cidadãos".'],
  ['Em "Ela estava cansada, mas continuou trabalhando", a conjunção "mas" expressa ideia de:', ['adição', 'oposição', 'conclusão', 'explicação'], 1, 'facil', '"Mas" é conjunção adversativa: indica oposição entre as ideias.'],
  ['Qual alternativa apresenta um antônimo de "efêmero"?', ['passageiro', 'breve', 'duradouro', 'rápido'], 2, 'medio', '"Efêmero" significa passageiro; o oposto é "duradouro".'],
  ['Assinale a frase de acordo com a norma-padrão quanto à concordância verbal.', ['Fazem dois anos que me mudei.', 'Houveram muitos problemas.', 'Faz dois anos que me mudei.', 'Existe muitas dúvidas.'], 2, 'dificil', '"Fazer" indicando tempo decorrido é impessoal e fica no singular: "Faz dois anos".'],
  ['Na expressão "coração de pedra", há uma figura de linguagem chamada:', ['metáfora', 'hipérbole', 'eufemismo', 'onomatopeia'], 0, 'medio', 'Há uma comparação implícita entre o coração e a pedra (dureza, frieza): metáfora.'],
  ['Qual das palavras abaixo é um substantivo abstrato?', ['mesa', 'saudade', 'cadeira', 'livro'], 1, 'facil', '"Saudade" nomeia um sentimento, que depende de um ser para existir: substantivo abstrato.'],
  ['Em "Por que você faltou?", a forma "por que" está correta porque:', ['inicia uma pergunta direta com sentido de "por qual motivo"', 'aparece no fim da frase', 'equivale ao "porque" explicativo', 'funciona como substantivo'], 0, 'medio', 'Em perguntas, com sentido de "por qual motivo", usa-se "por que" separado e sem acento.'],
  ['Qual palavra está escrita corretamente?', ['excessão', 'exceção', 'esceção', 'exseção'], 1, 'facil', 'A grafia correta é "exceção".'],
  ['O tipo textual que tem como principal objetivo convencer o leitor é o:', ['narrativo', 'descritivo', 'dissertativo-argumentativo', 'injuntivo'], 2, 'facil', 'O texto dissertativo-argumentativo defende um ponto de vista para convencer o leitor.'],
];

async function popular({ demo = false } = {}) {
  if (await col('disciplinas').countDocuments({})) return; // já populado
  const agora = new Date().toISOString();
  const mat = { _id: id(), nome: 'Matemática', descricao: 'Aritmética, álgebra, geometria e razão/proporção' };
  const por = { _id: id(), nome: 'Português', descricao: 'Gramática, interpretação e produção textual' };
  await col('disciplinas').insertOne(mat);
  await col('disciplinas').insertOne(por);

  const senhaProf = process.env.SEED_PROFESSOR_SENHA || 'Professor123';
  const prof = {
    _id: id(), nome: 'Carlos Mendes', email: 'professor@simuladoifma.com', telefone: '(99) 98888-1111',
    senhaHash: await bcrypt.hash(senhaProf, config.bcryptRounds), perfil: 'professor', dataCadastro: agora,
  };
  await col('usuarios').insertOne(prof);

  const criarQuestoes = async (lista, disc) => {
    const ids = [];
    for (const [enunciado, alternativas, respostaCorreta, nivel, explicacao] of lista) {
      const q = { _id: id(), disciplinaId: disc._id, enunciado, alternativas, respostaCorreta, nivel, explicacao, autorId: prof._id, criadaEm: agora };
      await col('questoes').insertOne(q);
      ids.push(q._id);
    }
    return ids;
  };
  const qMat = await criarQuestoes(MAT, mat);
  const qPor = await criarQuestoes(POR, por);

  const simulados = [
    { titulo: 'Simulado 1 – Matemática', disciplinaId: mat._id, questoesIds: qMat.slice(0, 10), tempoLimite: 30 },
    { titulo: 'Simulado 1 – Português', disciplinaId: por._id, questoesIds: qPor.slice(0, 10), tempoLimite: 30 },
    { titulo: 'Revisão rápida – Matemática', disciplinaId: mat._id, questoesIds: [qMat[0], qMat[4], qMat[10]], tempoLimite: 10 },
  ].map(s => ({ _id: id(), ...s, ativo: true, autorId: prof._id, criadoEm: agora }));
  for (const s of simulados) await col('simulados').insertOne(s);

  if (!demo) return;

  // ---- Dados de demonstração (apenas no banco em memória) ----
  const alunos = [
    ['João Silva', 'joao.silva@aluno.com', 'Turma A – Manhã', 0.78],
    ['Maria Souza', 'maria.souza@aluno.com', 'Turma A – Manhã', 0.88],
    ['Rafael Alves', 'rafael.alves@aluno.com', 'Turma A – Manhã', 0.55],
    ['Pedro Lima', 'pedro.lima@aluno.com', 'Turma B – Tarde', 0.65],
    ['Ana Beatriz Costa', 'ana.costa@aluno.com', 'Turma B – Tarde', 0.82],
    ['Lucas Rocha', 'lucas.rocha@aluno.com', 'Turma C – Noite', 0.6],
    ['Camila Santos', 'camila.santos@aluno.com', 'Turma C – Noite', 0.72],
  ];
  const hashAluno = await bcrypt.hash('Aluno1234', config.bcryptRounds);
  let semente = 42;
  const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
  const todasQ = await col('questoes').find();

  for (const [i, [nome, email, turma, habilidade]] of alunos.entries()) {
    const u = { _id: id(), nome, email, turma, telefone: `(99) 9${8700 + i}-43${10 + i}`, senhaHash: hashAluno, perfil: 'aluno', dataCadastro: agora };
    await col('usuarios').insertOne(u);
    const qtd = 3 + Math.floor(aleatorio() * 4);
    for (let k = 0; k < qtd; k++) {
      const s = simulados[k % 2];
      const questoes = s.questoesIds.map(qid => todasQ.find(q => q._id === qid));
      const dificuldade = s.disciplinaId === por._id ? 0.05 : 0;
      const progresso = k * 0.03; // alunos melhoram ao longo das semanas
      const respostas = questoes.map(q => ({
        questaoId: q._id,
        alternativa: aleatorio() < habilidade + progresso - dificuldade - (q.nivel === 'dificil' ? 0.25 : 0)
          ? q.respostaCorreta : (q.respostaCorreta + 1) % q.alternativas.length,
      }));
      const c = corrigir(questoes, respostas);
      const dias = (qtd - k) * 5 - 2;
      await col('resultados').insertOne({
        _id: id(), usuarioId: u._id, turma, simuladoId: s._id, disciplinaId: s.disciplinaId, titulo: s.titulo,
        respostasAluno: respostas, detalhes: c.detalhes, acertos: c.acertos, total: c.total, nota: c.nota,
        tempoGastoSeg: 900 + Math.floor(aleatorio() * 800),
        dataRealizacao: new Date(Date.now() - dias * 86400000).toISOString(),
      });
    }
  }
}

if (require.main === module) {
  (async () => {
    await connect();
    if (getDb().tipo === 'memoria') {
      console.log('ATENÇÃO: MONGODB_URI não definido. Nada foi gravado no MongoDB Atlas. Confira o arquivo .env.');
      return;
    }
    const jaTinha = await col('disciplinas').countDocuments({});
    await popular({ demo: false });
    console.log(jaTinha ? 'O banco já estava populado; nada foi alterado.'
      : 'Banco populado no MongoDB Atlas: 2 disciplinas, 24 questões, 3 simulados e o professor professor@simuladoifma.com.');
    await getDb().close();
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { popular };
