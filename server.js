// ===========================================================
// SERVIDOR NODE.JS - AGENDAMENTO DE RECURSOS
// ===========================================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
// ➡️ IMPORTAÇÕES PARA TRATAR ARQUIVOS E CAMINHOS
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuração para obter o __dirname no ambiente ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const { Pool } = pkg;

// ===========================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (NEONDB)
// ===========================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("✅ Conectado ao NeonDB com sucesso"))
  .catch((err) => console.error("❌ Erro ao conectar ao banco:", err.message));

// ===========================================================
// CONFIGURAÇÃO DO SERVIDOR EXPRESS
// ===========================================================
const app = express();
app.use(cors());
app.use(express.json());

// ===========================================================
// BLOCO DE ARQUIVOS ESTÁTICOS
// ➡️ O Express.static é ESSENCIAL para servir CSS, JS, imagens, etc.
// 🔴 CORREÇÃO 1: Aponta para a subpasta 'public', conforme o caminho do Live Server.
app.use(express.static(path.join(__dirname, 'public')));
// ===========================================================

// ===========================================================
// ➡️ ROTA RAIZ (/) PARA SERVIR O FRONTEND
// Esta rota garante que o index.html seja entregue quando o usuário acessar /
// ===========================================================
app.get("/", (req, res) => {
  // 🔴 CORREÇÃO 2: Envia o index.html a partir da pasta 'public'.
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ===========================================================
// ROTA DE STATUS DA API (Antiga ROTA 1)
// Rota dedicada para testar se a API está online.
// ===========================================================
app.get("/status", (req, res) => {
  res.send("🚀 API de Agendamentos está online!");
});


// ===========================================================
// ROTA 2 - LISTAR RECURSOS DISPONÍVEIS
// ===========================================================
app.get("/api/recursos", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, descricao FROM recursos ORDER BY id ASC;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar recursos:", err.message);
    res.status(500).json({ error: "Erro ao buscar recursos." });
  }
});

// ===========================================================
// ROTA 3 - LISTAR AGENDAMENTOS POR RECURSO E MÊS
// ===========================================================
app.get("/api/agendamentos/:id_recurso/:ano/:mes", async (req, res) => {
  const { id_recurso, ano, mes } = req.params;

  // datas de início e fim do mês solicitado
  const dataInicio = `${ano}-${mes}-01`;
  const dataFim = `${ano}-${mes}-31`;

  try {
    const queryAgendamentos = `
      SELECT 
        id, 
        id_recurso, 
        professor, 
        turma, 
        data_reserva, 
        horario_reserva
      FROM agendamentos
      WHERE 
        id_recurso = $1 
        AND data_reserva BETWEEN $2 AND $3
      ORDER BY data_reserva ASC, horario_reserva ASC;
    `;

    const agendamentos = await pool.query(queryAgendamentos, [
      id_recurso,
      dataInicio,
      dataFim,
    ]);

    const queryBloqueios = `
      SELECT 
        data, 
        nome, 
        tipo
      FROM bloqueios
      WHERE 
        data >= $1 AND data <= $2
      ORDER BY data ASC;
    `;

    const bloqueios = await pool.query(queryBloqueios, [dataInicio, dataFim]);

    res.json({
      agendamentos: agendamentos.rows,
      bloqueios: bloqueios.rows,
    });
  } catch (err) {
    console.error("Erro ao buscar agendamentos:", err.message);
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

// ===========================================================
// ROTA 4 - ADICIONAR NOVO AGENDAMENTO
// ===========================================================
app.post("/api/agendar", async (req, res) => {
  const { id_recurso, professor, turma, data_reserva, horario_reserva } = req.body;

  if (!id_recurso || !professor || !turma || !data_reserva || !horario_reserva) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }

  try {
    // verifica se já há agendamento no mesmo horário
    const conflito = await pool.query(
      `
      SELECT 1 FROM agendamentos 
      WHERE id_recurso = $1 
      AND data_reserva = $2 
      AND horario_reserva = $3
      LIMIT 1;
    `,
      [id_recurso, data_reserva, horario_reserva]
    );

    if (conflito.rows.length > 0) {
      return res.status(400).json({ error: "Horário já está agendado." });
    }

    // insere o novo agendamento
    await pool.query(
      `
      INSERT INTO agendamentos 
      (id_recurso, professor, turma, data_reserva, horario_reserva) 
      VALUES ($1, $2, $3, $4, $5);
    `,
      [id_recurso, professor, turma, data_reserva, horario_reserva]
    );

    res.status(201).json({ message: "Agendamento realizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao criar agendamento:", err.message);
    res.status(500).json({ error: "Erro ao criar agendamento." });
  }
});

// ===========================================================
// ROTA 5 - BLOQUEIOS (FERIADOS, RECESSOS)
// ===========================================================
app.get("/api/bloqueios", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        data, 
        nome, 
        tipo
      FROM bloqueios
      ORDER BY data ASC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar bloqueios:", err.message);
    res.status(500).json({ error: "Erro ao buscar bloqueios." });
  }
});

// ===========================================================
// INICIALIZAÇÃO DO SERVIDOR
// ===========================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});
