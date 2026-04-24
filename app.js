/* ── app.js — Portifólio Logic ──────────────────────────────── */

// ── State ─────────────────────────────────────────────────────
const state = {
  isLoggedIn: false,
  user: null,
  activeTab: "home",
  activeDash: null,
  pendingDeleteId: null,
  reports: [],
  users: [],
  activeUserIdForPerms: null,
};

async function fetchDashboards() {
  try {
    const res = await fetch("/api/dashboards");
    state.reports = await res.json();
  } catch (err) { console.error(err); }
}

async function fetchUsers() {
  if (!state.user?.isAdmin) return;
  try {
    const res = await fetch("/api/users");
    state.users = await res.json();
  } catch (err) { console.error(err); }
}

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

const adminUserTbody     = document.getElementById("admin-user-tbody");
const adminUserEmpty     = document.getElementById("admin-user-empty");
const adminUserCount     = document.getElementById("admin-user-count");
const btnAddUser         = document.getElementById("btn-add-user");
const modalUser          = document.getElementById("modal-user");
const userForm           = document.getElementById("user-form");
const modalPerms         = document.getElementById("modal-perms");
const permsList          = document.getElementById("perms-list");
const btnSavePerms       = document.getElementById("btn-save-perms");

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
  if (name === "admin") {
    fetchDashboards().then(renderAdminTable);
    if (state.user?.isAdmin) fetchUsers().then(renderUserTable);
  }
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
addForm.addEventListener("submit", async (e) => {
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

  const payload = { title, cat, desc: desc || "Dashboard publicado pelo administrador.", date: now, color: colors, embedUrl: url };
  
  try {
    const res = await fetch("/api/dashboards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await fetchDashboards();
      renderDashList();
      renderAdminTable();
      addForm.reset();
      showAddMsg("Dashboard publicado com sucesso!", "success");
    }
  } catch(err) { console.error(err); }
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

document.getElementById("confirm-ok").addEventListener("click", async () => {
  if (state.pendingDeleteId === null) return;
  
  try {
    await fetch(`/api/dashboards/${state.pendingDeleteId}`, { method: "DELETE" });
    await fetchDashboards();
    
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
  } catch(err) { console.error(err); }
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
loginForm.addEventListener("submit", async (e) => {
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

  try {
    const res = await fetch("/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pw })
    });
    
    if (res.ok) {
      const data = await res.json();
      state.isLoggedIn = true;
      state.user = data.user;
      state.reports = data.dashboards;
      
      closeModal(modalLogin);
      updateAuthUI();
      if (state.activeTab === "dashboards") refreshDashView();
      if (state.activeTab === "admin") {
        renderAdminTable();
        if (state.user.isAdmin) {
          await fetchUsers();
          renderUserTable();
        }
      }
      loginForm.reset();
    } else {
      document.getElementById("err-pw").textContent = "Credenciais inválidas.";
    }
  } catch (err) {
    document.getElementById("err-pw").textContent = "Erro de conexão.";
  } finally {
    btn.textContent = "Entrar";
    btn.disabled = false;
  }
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

// ── Users & Permissions (Admin) ───────────────────────────────

function renderUserTable() {
  if (!state.user?.isAdmin) return;
  adminUserCount.textContent = `${state.users.length} usuário${state.users.length !== 1 ? "s" : ""}`;

  if (!state.users.length) {
    adminUserTbody.innerHTML = "";
    adminUserEmpty.classList.remove("hidden");
    return;
  }
  adminUserEmpty.classList.add("hidden");

  adminUserTbody.innerHTML = state.users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.area}</td>
      <td><span class="user-type ${u.isAdmin ? 'admin' : ''}">${u.isAdmin ? 'Admin' : 'Padrão'}</span></td>
      <td class="actions-cell">
        ${!u.isAdmin ? `<button class="btn btn--ghost btn--icon" data-perms="${u.id}" title="Permissões">🔑 Acessos</button>` : ''}
        ${!u.isAdmin ? `<button class="btn btn--danger btn--icon" data-deluser="${u.id}" title="Excluir">🗑 Excluir</button>` : ''}
      </td>
    </tr>
  `).join("");

  adminUserTbody.querySelectorAll("[data-perms]").forEach(btn => {
    btn.addEventListener("click", () => openPermsModal(parseInt(btn.dataset.perms, 10)));
  });
  adminUserTbody.querySelectorAll("[data-deluser]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.dataset.deluser, 10);
      if (confirm("Tem certeza que deseja excluir este usuário?")) {
        await fetch(`/api/users/${id}`, { method: "DELETE" });
        await fetchUsers();
        renderUserTable();
      }
    });
  });
}

if (btnAddUser) {
  btnAddUser.addEventListener("click", () => openModal(modalUser));
  document.getElementById("user-close").addEventListener("click", () => closeModal(modalUser));
  document.getElementById("user-backdrop").addEventListener("click", () => closeModal(modalUser));

  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("u-name").value.trim();
    const email = document.getElementById("u-email").value.trim();
    const password = document.getElementById("u-password").value.trim();
    const area = document.getElementById("u-area").value;
    
    if (!name || !email || !password) return alert("Preencha todos os campos.");

    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, area })
    });
    if (res.ok) {
      await fetchUsers();
      renderUserTable();
      closeModal(modalUser);
      userForm.reset();
    }
  });
}

async function openPermsModal(userId) {
  state.activeUserIdForPerms = userId;
  const user = state.users.find(u => u.id === userId);
  document.getElementById("perms-sub").textContent = `Defina acessos para ${user.name}`;
  
  // Buscar todas as permissoes deste usuario
  const res = await fetch(`/api/permissions/${userId}`);
  const userDashIds = await res.json();
  
  // Precisamos listar todos os dashboards do banco
  // O admin tem state.reports completo
  permsList.innerHTML = state.reports.map(r => `
    <label class="perm-item">
      <input type="checkbox" value="${r.id}" ${userDashIds.includes(r.id) ? 'checked' : ''} />
      <div class="perm-item__info">
        <span class="perm-item__title">${r.title}</span>
        <span class="perm-item__cat">${r.cat}</span>
      </div>
    </label>
  `).join("");
  
  openModal(modalPerms);
}

if (btnSavePerms) {
  document.getElementById("perms-close").addEventListener("click", () => closeModal(modalPerms));
  document.getElementById("perms-backdrop").addEventListener("click", () => closeModal(modalPerms));

  btnSavePerms.addEventListener("click", async () => {
    const checked = Array.from(permsList.querySelectorAll("input:checked")).map(i => parseInt(i.value, 10));
    
    const res = await fetch("/api/permissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: state.activeUserIdForPerms, dashboardIds: checked })
    });
    
    if (res.ok) {
      closeModal(modalPerms);
      alert("Permissões salvas!");
    }
  });
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
