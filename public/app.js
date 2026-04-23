/* ── app.js — Portifólio Logic ──────────────────────────────── */

// ── State ─────────────────────────────────────────────────────
const state = {
  isLoggedIn: false,
  user: null,
  activeTab: "home",
  activeDash: null,
  pendingDeleteId: null,
  reports: [
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
    },
  ],
};

// ── DOM Refs ──────────────────────────────────────────────────
const btnLogin       = document.getElementById("btn-login");
const btnLogout      = document.getElementById("btn-logout");
const tabAdminBtn    = document.getElementById("tab-admin-btn");
const modalLogin     = document.getElementById("modal-login");
const modalConfirm   = document.getElementById("modal-confirm");
const modalEdit      = document.getElementById("modal-edit");
const loginForm      = document.getElementById("login-form");
const addForm        = document.getElementById("add-form");
const editForm       = document.getElementById("edit-form");
const dashList       = document.getElementById("dash-list");
const dashLock       = document.getElementById("dash-lock");
const dashArea       = document.getElementById("dash-area");
const dashIframe     = document.getElementById("dash-iframe");
const dashPlaceholder    = document.getElementById("dash-placeholder");
const dashActiveTitle    = document.getElementById("dash-active-title");
const dashOpenLink       = document.getElementById("dash-open-link");
const tabLockIcon        = document.getElementById("tab-lock-icon");
const adminTbody         = document.getElementById("admin-tbody");
const adminEmpty         = document.getElementById("admin-empty");
const adminCount         = document.getElementById("admin-count");
const adminSearch        = document.getElementById("admin-search");
const adminFilterSel     = document.getElementById("admin-filter");
const addMsg             = document.getElementById("add-msg");

// ── Tab System ────────────────────────────────────────────────
function activateTab(name) {
  state.activeTab = name;
  document.querySelectorAll(".tab-nav__btn").forEach((btn) => {
    const isActive = btn.dataset.tab === name;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const isActive = panel.id === `tab-${name}`;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });
  if (name === "dashboards") refreshDashView();
  if (name === "admin")      renderAdminTable();
  if (name === "home")       setupCounters();
}

document.querySelectorAll("[data-tab]").forEach((el) => {
  el.addEventListener("click", () => {
    const tab = el.dataset.tab;
    if (!tab) return;
    if ((tab === "dashboards" || tab === "admin") && !state.isLoggedIn) {
      openModal(modalLogin);
      return;
    }
    activateTab(tab);
  });
});

// ── Dashboards ────────────────────────────────────────────────
function refreshDashView() {
  if (state.isLoggedIn) {
    dashLock.classList.add("hidden");
    dashArea.classList.remove("hidden");
    renderDashList();
  } else {
    dashLock.classList.remove("hidden");
    dashArea.classList.add("hidden");
  }
}

const CAT_ICONS = { financeiro:"📊", comercial:"💼", operacional:"⚙️", rh:"👥" };

function renderDashList() {
  if (!state.reports.length) {
    dashList.innerHTML = `<li style="padding:.5rem;font-size:.8rem;color:var(--text-3)">Nenhum dashboard publicado.</li>`;
    return;
  }
  dashList.innerHTML = state.reports.map((r) => `
    <li class="dash-item ${state.activeDash === r.id ? "active" : ""}"
        data-id="${r.id}" role="button" tabindex="0" aria-label="${r.title}">
      <span class="dash-item__icon">${CAT_ICONS[r.cat] || "📋"}</span>
      <div class="dash-item__info">
        <span class="dash-item__name" title="${r.title}">${r.title}</span>
        <span class="dash-item__cat">${r.cat}</span>
      </div>
    </li>
  `).join("");

  dashList.querySelectorAll(".dash-item").forEach((item) => {
    const open = () => loadDash(parseInt(item.dataset.id, 10));
    item.addEventListener("click", open);
    item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") open(); });
  });
}

function loadDash(id) {
  const report = state.reports.find((r) => r.id === id);
  if (!report) return;
  state.activeDash = id;
  dashActiveTitle.textContent = report.title;
  dashOpenLink.href = report.embedUrl || "#";

  if (report.embedUrl) {
    dashPlaceholder.classList.add("hidden");
    dashIframe.classList.remove("hidden");
    dashIframe.src = report.embedUrl;
  } else {
    dashIframe.classList.add("hidden");
    dashPlaceholder.classList.remove("hidden");
    dashPlaceholder.innerHTML = `
      <span class="dash-placeholder__icon">📊</span>
      <p><strong>${report.title}</strong></p>
      <p style="font-size:.8rem;color:var(--text-3);margin-top:.25rem">URL embed não configurada ainda.</p>
    `;
  }
  renderDashList();
}

// ── Admin Table ───────────────────────────────────────────────
function renderAdminTable() {
  const search = adminSearch.value.toLowerCase();
  const filter = adminFilterSel.value;

  const filtered = state.reports.filter((r) => {
    const matchCat    = filter === "all" || r.cat === filter;
    const matchSearch = r.title.toLowerCase().includes(search) || r.desc.toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  adminCount.textContent = `${filtered.length} registro${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    adminTbody.innerHTML = "";
    adminEmpty.classList.remove("hidden");
    return;
  }
  adminEmpty.classList.add("hidden");

  adminTbody.innerHTML = filtered.map((r) => `
    <tr>
      <td title="${r.title}">${r.title}</td>
      <td><span class="cat-pill">${r.cat}</span></td>
      <td>${r.date}</td>
      <td class="url-cell" title="${r.embedUrl || "—"}">${r.embedUrl || "—"}</td>
      <td class="actions-cell">
        <button class="btn btn--ghost btn--icon" data-edit="${r.id}" title="Editar">✏️ Editar</button>
        <button class="btn btn--danger btn--icon" data-del="${r.id}" title="Excluir">🗑 Excluir</button>
      </td>
    </tr>
  `).join("");

  // Edit
  adminTbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(parseInt(btn.dataset.edit, 10)));
  });
  // Delete
  adminTbody.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => openConfirmDelete(parseInt(btn.dataset.del, 10)));
  });
}

adminSearch.addEventListener("input",  renderAdminTable);
adminFilterSel.addEventListener("change", renderAdminTable);

// ── Add Dashboard ─────────────────────────────────────────────
addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("a-title").value.trim();
  const cat   = document.getElementById("a-cat").value;
  const url   = document.getElementById("a-url").value.trim();
  const desc  = document.getElementById("a-desc").value.trim();

  document.getElementById("a-err-title").textContent = "";
  if (!title) {
    document.getElementById("a-err-title").textContent = "Título é obrigatório.";
    return;
  }

  const colors = ["#F59E0B","#38BDF8","#34D399","#A78BFA","#EF4444","#F59E0B","#38BDF8"];
  const now = new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

  state.reports.unshift({
    id: Date.now(), title, cat,
    desc: desc || "Dashboard publicado pelo administrador.",
    date: now, color: colors, embedUrl: url,
  });

  renderDashList();
  renderAdminTable();
  addForm.reset();
  showAddMsg("Dashboard publicado com sucesso!", "success");
});

function showAddMsg(text, type) {
  addMsg.textContent = text;
  addMsg.className = `add-msg ${type}`;
  setTimeout(() => { addMsg.className = "add-msg hidden"; addMsg.textContent = ""; }, 3000);
}

// ── Delete ────────────────────────────────────────────────────
function openConfirmDelete(id) {
  const report = state.reports.find((r) => r.id === id);
  if (!report) return;
  state.pendingDeleteId = id;
  document.getElementById("confirm-msg").textContent = `"${report.title}" será removido permanentemente.`;
  openModal(modalConfirm);
}

document.getElementById("confirm-ok").addEventListener("click", () => {
  if (state.pendingDeleteId === null) return;
  state.reports = state.reports.filter((r) => r.id !== state.pendingDeleteId);
  if (state.activeDash === state.pendingDeleteId) {
    state.activeDash = null;
    dashActiveTitle.textContent = "—";
    dashIframe.classList.add("hidden");
    dashPlaceholder.classList.remove("hidden");
    dashPlaceholder.innerHTML = `<span class="dash-placeholder__icon">📊</span><p>Selecione um dashboard ao lado.</p>`;
  }
  state.pendingDeleteId = null;
  renderDashList();
  renderAdminTable();
  closeModal(modalConfirm);
});

document.getElementById("confirm-cancel").addEventListener("click", () => {
  state.pendingDeleteId = null;
  closeModal(modalConfirm);
});
document.getElementById("confirm-backdrop").addEventListener("click", () => {
  state.pendingDeleteId = null;
  closeModal(modalConfirm);
});

// ── Edit ──────────────────────────────────────────────────────
function openEditModal(id) {
  const report = state.reports.find((r) => r.id === id);
  if (!report) return;
  document.getElementById("edit-id").value  = id;
  document.getElementById("e-title").value  = report.title;
  document.getElementById("e-cat").value    = report.cat;
  document.getElementById("e-url").value    = report.embedUrl || "";
  document.getElementById("e-desc").value   = report.desc || "";
  openModal(modalEdit);
}

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id    = parseInt(document.getElementById("edit-id").value, 10);
  const title = document.getElementById("e-title").value.trim();
  const cat   = document.getElementById("e-cat").value;
  const url   = document.getElementById("e-url").value.trim();
  const desc  = document.getElementById("e-desc").value.trim();

  const idx = state.reports.findIndex((r) => r.id === id);
  if (idx === -1) return;

  state.reports[idx] = { ...state.reports[idx], title, cat, embedUrl: url, desc };

  // If this was the active dashboard, update the embed
  if (state.activeDash === id) loadDash(id);

  renderDashList();
  renderAdminTable();
  closeModal(modalEdit);
});

document.getElementById("edit-close").addEventListener("click",    () => closeModal(modalEdit));
document.getElementById("edit-backdrop").addEventListener("click", () => closeModal(modalEdit));

// ── Modal helpers ─────────────────────────────────────────────
function openModal(modal)  { modal.classList.add("open"); }
function closeModal(modal) { modal.classList.remove("open"); }

btnLogin.addEventListener("click", () => openModal(modalLogin));
document.getElementById("modal-close").addEventListener("click",    () => closeModal(modalLogin));
document.getElementById("modal-backdrop").addEventListener("click", () => closeModal(modalLogin));
document.getElementById("lock-login-btn").addEventListener("click", () => openModal(modalLogin));
document.getElementById("hero-login-btn").addEventListener("click", () => openModal(modalLogin));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal(modalLogin);
    closeModal(modalConfirm);
    closeModal(modalEdit);
  }
});

// ── Toggle password ───────────────────────────────────────────
document.getElementById("toggle-pw").addEventListener("click", () => {
  const pw = document.getElementById("password");
  const isText = pw.type === "text";
  pw.type = isText ? "password" : "text";
  document.getElementById("toggle-pw").textContent = isText ? "👁" : "🙈";
});

// ── Login ─────────────────────────────────────────────────────
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("err-email").textContent = "";
  document.getElementById("err-pw").textContent    = "";

  const email = document.getElementById("email").value.trim();
  const pw    = document.getElementById("password").value.trim();
  let valid   = true;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    document.getElementById("err-email").textContent = "Informe um e-mail válido.";
    valid = false;
  }
  if (!pw || pw.length < 4) {
    document.getElementById("err-pw").textContent = "Senha com mínimo 4 caracteres.";
    valid = false;
  }
  if (!valid) return;

  const btn = document.getElementById("btn-submit");
  btn.textContent = "Entrando…";
  btn.disabled = true;

  setTimeout(() => {
    state.isLoggedIn = true;
    state.user = { email };
    closeModal(modalLogin);
    updateAuthUI();
    // If user was waiting on dashboards tab, refresh it
    if (state.activeTab === "dashboards") refreshDashView();
    btn.textContent = "Entrar";
    btn.disabled = false;
    loginForm.reset();
  }, 900);
});

// ── Logout ────────────────────────────────────────────────────
btnLogout.addEventListener("click", () => {
  state.isLoggedIn = false;
  state.user = null;
  state.activeDash = null;
  updateAuthUI();
  activateTab("home");
});

function updateAuthUI() {
  if (state.isLoggedIn) {
    const name = state.user.email.split("@")[0];
    btnLogin.classList.add("hidden");
    btnLogout.classList.remove("hidden");
    btnLogout.textContent = `👤 ${name}  ·  Sair`;
    tabAdminBtn.classList.remove("hidden");
    tabLockIcon.textContent = "✓";
    tabLockIcon.style.color = "var(--green)";
  } else {
    btnLogin.classList.remove("hidden");
    btnLogout.classList.add("hidden");
    tabAdminBtn.classList.add("hidden");
    tabLockIcon.textContent = "🔒";
    tabLockIcon.style.color = "";
    // If on admin or dashboards, go home
    if (state.activeTab === "admin" || state.activeTab === "dashboards") {
      activateTab("home");
    }
  }
}

// ── Counter Animation ─────────────────────────────────────────
function setupCounters() {
  document.querySelectorAll(".stat-num").forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const target   = parseInt(el.dataset.target, 10);
    const step     = target / (1400 / 16);
    let current    = 0;
    const update = () => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current);
      if (current < target) requestAnimationFrame(update);
      else el.textContent = target;
    };
    update();
  });
}

// ── Init ──────────────────────────────────────────────────────
setupCounters();
