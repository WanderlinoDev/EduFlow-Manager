// ===========================================================
// SCRIPT PRINCIPAL - AGENDAMENTO DE RECURSOS ESCOLARES (FINAL)
// ===========================================================

// HORÁRIOS PADRÃO
const HORARIOS = [
  "07:00-07:50", "07:50-08:40", "08:40-09:30", "Recreio",
  "09:45-10:35", "10:35-11:25", "11:25-12:15", "Almoço",
  "13:15-14:05", "14:05-14:55", "14:55-15:45","Intervalo","16:00-17:00", "18:00 - 18:50",
  "18:50 - 19:40", "19:40 - 20:30", "Recreio", "20:45 - 21:35", "21:35 - 22:25"
];

// BLOQUEIOS FIXOS POR RECURSO
const regrasPorRecurso = {
  // 🔹 Regras de bloqueio para o Laboratório
  Laboratorio: [
    { diaSemana: 1, horario: "14:05-14:55" },
    { diaSemana: 1, horario: "14:55-15:45" },

    { diaSemana: 2, horario: "07:50-08:40" },
    { diaSemana: 2, horario: "08:40-09:30" },
    { diaSemana: 2, horario: "09:45-10:35" },
    { diaSemana: 2, horario: "10:35-11:25" },
    { diaSemana: 2, horario: "13:15-14:05" },
    { diaSemana: 2, horario: "14:05-14:55" },

    { diaSemana: 3, horario: "08:40-09:30" },
    { diaSemana: 3, horario: "09:45-10:35" },
    { diaSemana: 3, horario: "11:25-12:15" },
    { diaSemana: 3, horario: "13:15-14:05" },
    { diaSemana: 3, horario: "14:05-14:55" },
    { diaSemana: 3, horario: "14:55-15:45" },

    { diaSemana: 4, horario: "11:25-12:15" },
    { diaSemana: 4, horario: "13:15-14:05" },
    { diaSemana: 4, horario: "14:05-14:55" },

    { diaSemana: 5, horario: "11:25-12:15" },
    { diaSemana: 5, horario: "13:15-14:05" }
  ],

  // 🔹 Projetor (nenhum bloqueio fixo)
  Projetor: []
};

// NOMES DOS DIAS E MESES
const NOMES_DIAS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const NOME_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

let anoVisualizado = new Date().getFullYear();
let mesVisualizado = new Date().getMonth();
let dataSelecionada = null;
let recursoAtual = "Laboratorio";
let bloqueiosCalendario = {};
let agendamentosDoDia = [];
let horarioSelecionado = null;

const API_URL = "http://localhost:3000/api";

// ===========================================================
// FUNÇÕES DE APOIO
// ===========================================================
function formatarData(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function atualizarTituloCalendario() {
  document.getElementById("mes-ano-atual").textContent =
    `${NOME_MESES[mesVisualizado]} de ${anoVisualizado}`;
}

// ✅ NOVO: Função para obter o ID do recurso selecionado
function getIdRecursoAtual() {
    const recurso = RECURSOS_DISPONIVEIS.find(r => r.nome === recursoAtual);
    // Retorna o ID do recurso ou um fallback (ex: 1)
    return recurso ? recurso.id : 1; 
}


// ===========================================================
// BLOQUEIOS E RECURSOS
// ===========================================================
async function carregarBloqueios() {
  try {
    const res = await fetch(`${API_URL}/bloqueios`);
    if (!res.ok) throw new Error("Falha ao carregar bloqueios do banco.");
    const dados = await res.json();

    bloqueiosCalendario = {};
    dados.forEach(b => {
      const dataISO = b.data.split("T")[0];
      bloqueiosCalendario[dataISO] = {
        data: dataISO,
        nome: b.nome || "Bloqueio",
        tipo: b.tipo || "FERIADO_NACIONAL"
      };
    });
  } catch (erro) {
    // MOCK DE FERIADOS E RECESSOS
    const MOCK = [
      { data: "2025-10-12", nome: "Feriado Nacional", tipo: "FERIADO_NACIONAL" },
      { data: "2025-10-13", nome: "Recesso Escolar", tipo: "RECESSO" }
    ];
    MOCK.forEach(b => bloqueiosCalendario[b.data] = b);
  }
}

const RECURSOS_MOCK = [
  { id: 1, nome: "Laboratorio", descricao: "Laboratório de Informática" },
  { id: 2, nome: "Projetor", descricao: "Projetor portátil" }
];
let RECURSOS_DISPONIVEIS = [];

async function carregarRecursos() {
  const container = document.getElementById("recurso-selector");
  container.innerHTML = '<p class="text-sm text-gray-500">Carregando recursos...</p>';

  try {
    const res = await fetch(`${API_URL}/recursos`);
    if (!res.ok) throw new Error();
    RECURSOS_DISPONIVEIS = await res.json();
  } catch {
    RECURSOS_DISPONIVEIS = RECURSOS_MOCK;
  }
  renderizarRecursos();
}

function renderizarRecursos() {
  const container = document.getElementById("recurso-selector");
  
  container.innerHTML = ''; 
  
  RECURSOS_DISPONIVEIS.forEach(recurso => {
    const ativo = recurso.nome === recursoAtual;
    const label = document.createElement("label");
    label.className = `inline-flex items-center cursor-pointer p-3 rounded-xl shadow-sm ${ativo ? "bg-[#003366] text-[#FFD700]" : "bg-white text-gray-700"}`;
    label.innerHTML = `<input type='radio' name='recurso' value='${recurso.nome}' ${ativo ? "checked" : ""} class='hidden'><span class='ml-2 font-medium'>${recurso.nome}</span>`;
    label.querySelector("input").addEventListener("change", e => selecionarRecurso(e.target.value));
    container.appendChild(label);
  });
}

async function selecionarRecurso(recurso) {
  recursoAtual = recurso;
  renderizarRecursos();
  renderizarTabela();
  // Quando o recurso muda, se houver um dia selecionado, recarregar os dados para ele.
  if (dataSelecionada) {
      await carregarAgendamentos(recursoAtual, dataSelecionada);
      mostrarHorariosDoDia(new Date(dataSelecionada));
  }
}

// ===========================================================
// CALENDÁRIO
// ===========================================================
function renderizarTabela() {
  atualizarTituloCalendario();
  const container = document.getElementById("dias-do-mes");
  container.innerHTML = "";

  const primeiroDia = new Date(anoVisualizado, mesVisualizado, 1);
  const ultimoDia = new Date(anoVisualizado, mesVisualizado + 1, 0);
  const offset = primeiroDia.getDay();

  for (let i = 0; i < offset; i++) {
    const cel = document.createElement("div");
    cel.className = "dia-celula vazio";
    container.appendChild(cel);
  }

  for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
    const dataAtual = new Date(anoVisualizado, mesVisualizado, dia);
    const dataStr = formatarData(dataAtual);
    const cel = document.createElement("div");
    cel.className = "dia-celula";
    cel.dataset.data = dataStr;

    const bloqueio = bloqueiosCalendario[dataStr];
    const isFimDeSemana = [0,6].includes(dataAtual.getDay());

    if (isFimDeSemana) cel.classList.add("fim-semana");
    if (bloqueio) {
      if (bloqueio.tipo === "FERIADO_NACIONAL") cel.classList.add("feriado-dia-inteiro");
      if (bloqueio.tipo === "RECESSO") cel.classList.add("recesso-dia-inteiro");
    }

    if (isFimDeSemana || bloqueio) {
      cel.style.cursor = "not-allowed";
    } else {
      cel.addEventListener("click", () => selecionarDia(dataAtual, dataStr));
    }

    cel.innerHTML = `<span class="font-bold text-lg">${dia}</span>
      ${bloqueio ? `<div class="text-xs">${bloqueio.nome}</div>` : ""}`;
    container.appendChild(cel);
  }
}

// ===========================================================
// SELECIONAR DIA
// ===========================================================
async function selecionarDia(dateObj, dateStr) {
  dataSelecionada = dateStr;
  document.querySelectorAll(".dia-celula").forEach(c => c.classList.remove("selecionado"));
  const cel = document.querySelector(`.dia-celula[data-data="${dateStr}"]`);
  if (cel) cel.classList.add("selecionado");
  await carregarAgendamentos(recursoAtual, dateStr);
  mostrarHorariosDoDia(dateObj);
}

// ===========================================================
// AGENDAMENTOS
// ===========================================================
async function carregarAgendamentos(recurso, data) {
  try {
    const ano = data.split("-")[0];
    const mes = data.split("-")[1];
    
    // ✅ CORREÇÃO CHAVE: Pega o ID do recurso atual para enviar à API
    const idRecurso = getIdRecursoAtual(); 
    
    const res = await fetch(`${API_URL}/agendamentos/${idRecurso}/${ano}/${mes}`); 
    const dados = await res.json();
    
    // CORREÇÃO DE DATA: Compara apenas a parte da data (YYYY-MM-DD).
    agendamentosDoDia = dados.agendamentos.filter(a => a.data_reserva.split("T")[0] === data);
    
  } catch {
    agendamentosDoDia = [];
  }
}

// ===========================================================
// HORÁRIOS DO DIA
// ===========================================================
function mostrarHorariosDoDia(dateObj) {
  const container = document.getElementById("detalhe-container");
  container.classList.remove("hidden");
  document.getElementById("dia-detalhe").textContent =
    `${dateObj.getDate()} de ${NOME_MESES[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;

  const lista = document.getElementById("horarios-lista");
  lista.innerHTML = "";

  const diaSemana = dateObj.getDay();
  const nomeRecurso = recursoAtual.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos
  const bloqueiosFixos = regrasPorRecurso[nomeRecurso] || [];


  HORARIOS.forEach(horario => {
    const item = document.createElement("div");

    // CORREÇÃO FINAL NO SCRIPT.JS (FUNÇÃO mostrarHorariosDoDia)
    if (horario.includes("Recreio") || horario.includes("Almoço") || horario.includes("Intervalo")) {
      // Deixe apenas as classes de layout e a classe 'intervalo'
      item.className = "p-2 rounded-md text-center intervalo"; 
      item.textContent = horario;
      lista.appendChild(item);
      return;
    }
// ...

    const bloqueadoFixo = bloqueiosFixos.some(r => r.diaSemana === diaSemana && r.horario === horario);
    const bloqueioDia = bloqueiosCalendario[dataSelecionada];
    const agendamentoInfo = agendamentosDoDia.find(a => a.horario_reserva === horario);
    const ocupadoBanco = !!agendamentoInfo;

    if (bloqueadoFixo || bloqueioDia || ocupadoBanco) {
      item.className = "p-2 border rounded-md text-center ocupado";
      item.textContent = `${horario} - Reservado`; 
      
      const detalhe = document.createElement("div");
      detalhe.className = "agendamento-info-detalhe";

      if (agendamentoInfo) {
          detalhe.textContent = `${agendamentoInfo.professor} (${agendamentoInfo.turma})`;
      } else if (bloqueioDia) {
          detalhe.textContent = `Bloqueio: ${bloqueioDia.nome}`;
      } else if (bloqueadoFixo) {
          detalhe.textContent = `Bloqueio Fixo do ${recursoAtual}`;
      }
      
      item.appendChild(detalhe); 
    } else {
      item.className = "p-2 border rounded-md text-center livre";
      item.textContent = `${horario} - Livre - CLIQUE PARA AGENDAR`;
      item.addEventListener("click", () => abrirModalAgendamento(horario));
    }
    lista.appendChild(item);
  });
}

// ===========================================================
// MODAL DE AGENDAMENTO
// ===========================================================
function abrirModalAgendamento(horario) {
  horarioSelecionado = horario;
  document.getElementById("modal-reserva").classList.remove("hidden");
  document.getElementById("modal-recurso-nome").textContent = recursoAtual;
  document.getElementById("modal-data").textContent = dataSelecionada;
  document.getElementById("modal-horario").textContent = horario;
}
function fecharModal() {
  document.getElementById("modal-reserva").classList.add("hidden");
  document.getElementById("form-agendamento").reset();
}

document.getElementById("form-agendamento").addEventListener("submit", async e => {
  e.preventDefault();
  const professor = document.getElementById("professor-nome").value.trim();
  const turma = document.getElementById("turma-nome").value.trim();
  if (!professor || !turma) return alert("Preencha todos os campos!");

  // ✅ CORREÇÃO: Pega o ID do recurso atual para a reserva
  const idRecurso = getIdRecursoAtual();
  
  const body = { id_recurso: idRecurso, professor, turma, data_reserva: dataSelecionada, horario_reserva: horarioSelecionado };
  
  try {
    const res = await fetch(`${API_URL}/agendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error();
    alert("✅ Agendamento realizado com sucesso!");
    fecharModal();
    // Recarrega agendamentos e atualiza a visualização após sucesso
    await carregarAgendamentos(recursoAtual, dataSelecionada); 
    mostrarHorariosDoDia(new Date(dataSelecionada));
  } catch {
    alert("Erro de conexão com o servidor!");
  }
});

// ===========================================================
// INICIALIZAÇÃO
// ===========================================================
document.addEventListener("DOMContentLoaded", async () => {
  await carregarBloqueios();
  await carregarRecursos();
  renderizarTabela();
  document.getElementById("btn-anterior").addEventListener("click", () => { mesVisualizado--; if (mesVisualizado < 0) { mesVisualizado = 11; anoVisualizado--; } renderizarTabela(); });
  document.getElementById("btn-proximo").addEventListener("click", () => { mesVisualizado++; if (mesVisualizado > 11) { mesVisualizado = 0; anoVisualizado++; } renderizarTabela(); });
});