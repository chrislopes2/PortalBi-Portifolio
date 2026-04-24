const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'db.json');

const defaultData = {
  users: [
    {
      id: 1,
      name: "Administrador",
      email: "cristhofermaciel3@gmail.com",
      password: "1234",
      area: "TI",
      isAdmin: true
    }
  ],
  dashboards: [
    {
      id: 1, title: "Receita vs Meta 2025", cat: "financeiro",
      desc: "Acompanhamento mensal de receita bruta, líquida e atingimento de metas por BU.",
      date: "Abr 2025",
      color: ["#F59E0B","#FBBF24","#F59E0B","#EF4444","#F59E0B","#34D399","#38BDF8"],
      embedUrl: "",
    },
    {
      id: 2, title: "Pipeline Comercial", cat: "comercial",
      desc: "Funil de vendas com conversão por etapa, ticket médio e forecast.",
      date: "Abr 2025",
      color: ["#38BDF8","#0EA5E9","#38BDF8","#7DD3FC","#38BDF8","#0EA5E9","#38BDF8"],
      embedUrl: "",
    },
    {
      id: 3, title: "Headcount & Turnover", cat: "rh",
      desc: "Distribuição de colaboradores por área, evolução e índice de turnover.",
      date: "Mar 2025",
      color: ["#34D399","#10B981","#34D399","#6EE7B7","#10B981","#34D399","#059669"],
      embedUrl: "",
    },
    {
      id: 4, title: "OEE — Linha de Produção", cat: "operacional",
      desc: "Eficiência global de equipamentos por turno, linha e tipo de parada.",
      date: "Abr 2025",
      color: ["#A78BFA","#8B5CF6","#A78BFA","#C4B5FD","#8B5CF6","#A78BFA","#7C3AED"],
      embedUrl: "",
    },
    {
      id: 5, title: "DRE Gerencial", cat: "financeiro",
      desc: "Demonstração de resultado com drill por centro de custo vs orçamento.",
      date: "Abr 2025",
      color: ["#F59E0B","#EF4444","#F59E0B","#FBBF24","#F59E0B","#EF4444","#F59E0B"],
      embedUrl: "",
    },
    {
      id: 6, title: "NPS & Satisfação", cat: "comercial",
      desc: "Net Promoter Score por canal, segmento e tendência dos últimos 12 meses.",
      date: "Mar 2025",
      color: ["#38BDF8","#34D399","#38BDF8","#34D399","#F59E0B","#38BDF8","#34D399"],
      embedUrl: "",
    }
  ],
  permissions: {
    "1": [1, 2, 3, 4, 5, 6] // Admin has access to all initially
  }
};

function readDB() {
  if (!fs.existsSync(dbPath)) {
    writeDB(defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao ler DB:", err);
    return defaultData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Erro ao escrever DB:", err);
  }
}

module.exports = {
  readDB,
  writeDB
};
