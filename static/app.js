/**
 * app.js — Main application logic
 * Manages: sidebar, chats list, projects, search, modals, settings, theme.
 * All data persists in localStorage per user.
 */

"use strict";

const App = (() => {

  /* ── State ──────────────────────────────────────────────────── */
  let currentUser    = null;
  let activeChatId   = null;
  let sidebarOpen    = true;
  let _collapsedSections = {};

  /* ── Storage keys ───────────────────────────────────────────── */
  const key = (suffix) => `ca_${currentUser.id}_${suffix}`;

  /* ── Data helpers ───────────────────────────────────────────── */
  function getData(suffix, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key(suffix)) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function setData(suffix, value) {
    localStorage.setItem(key(suffix), JSON.stringify(value));
  }

  /* ── Chats ──────────────────────────────────────────────────── */
  function getChats()              { return getData('chats', []); }
  function saveChats(chats)        { setData('chats', chats); }
  function getChatById(id)         { return getChats().find(c => c.id === id) || null; }

  function createChat(title, projectId = null) {
    const chat = {
      id:        'ch_' + Date.now(),
      title:     title || 'New Chat',
      projectId: projectId || null,
      messages:  [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const chats = getChats();
    chats.unshift(chat);
    saveChats(chats);
    return chat;
  }

  function updateChat(chatId, updates) {
    const chats = getChats();
    const idx   = chats.findIndex(c => c.id === chatId);
    if (idx !== -1) {
      chats[idx] = { ...chats[idx], ...updates, updatedAt: new Date().toISOString() };
      saveChats(chats);
      return chats[idx];
    }
    return null;
  }

  function deleteChat(chatId) {
    const chats = getChats().filter(c => c.id !== chatId);
    saveChats(chats);
    if (activeChatId === chatId) {
      activeChatId = null;
      showWelcome();
    }
    renderSidebar();
  }

  function addMessage(chatId, role, content) {
    const chats = getChats();
    const idx   = chats.findIndex(c => c.id === chatId);
    if (idx === -1) return;
    const msg = { id: 'm_' + Date.now(), role, content, timestamp: new Date().toISOString() };
    chats[idx].messages.push(msg);
    chats[idx].updatedAt = new Date().toISOString();
    // Move to top
    const updated = chats.splice(idx, 1)[0];
    chats.unshift(updated);
    saveChats(chats);
    return msg;
  }

  /* ── Projects ───────────────────────────────────────────────── */
  function getProjects()        { return getData('projects', []); }
  function saveProjects(p)      { setData('projects', p); }
  function getProjectById(id)   { return getProjects().find(p => p.id === id) || null; }

  function createProjectRecord(name, desc = '') {
    const project = {
      id:          'pr_' + Date.now(),
      name:        name.trim(),
      description: desc.trim(),
      createdAt:   new Date().toISOString(),
    };
    const projects = getProjects();
    projects.unshift(project);
    saveProjects(projects);
    return project;
  }

  function assignChatToProject(chatId, projectId) {
    updateChat(chatId, { projectId });
    renderSidebar();
    toast('Chat saved to project!');
  }

  /* ── Artifacts ──────────────────────────────────────────────── */
  function getArtifacts()    { return getData('artifacts', []); }
  function saveArtifact(artifact) {
    const artifacts = getArtifacts();
    artifacts.unshift(artifact);
    setData('artifacts', artifacts);
    renderArtifacts();
  }

  /* ── Render Sidebar ─────────────────────────────────────────── */
  function renderSidebar() {
    renderChatsList();
    renderProjectsList();
    renderArtifacts();
  }

  function renderChatsList() {
    const el    = document.getElementById('chatsList');
    if (!el) return;
    const chats = getChats().filter(c => !c.projectId);

    if (!chats.length) {
      el.innerHTML = '<p class="empty-note">No chats yet</p>';
      return;
    }

    el.innerHTML = chats.slice(0, 20).map(c => `
      <div class="chat-item ${activeChatId === c.id ? 'active' : ''}" 
           onclick="App.openChat('${c.id}')" data-id="${c.id}">
        <span class="chat-item-title">${esc(c.title)}</span>
        <button class="chat-item-del" onclick="event.stopPropagation(); App.deleteChat('${c.id}')" title="Delete">✕</button>
      </div>
    `).join('');
  }

  function renderProjectsList() {
    const el = document.getElementById('projectsList');
    if (!el) return;
    const projects = getProjects();
    const allChats = getChats();

    if (!projects.length) {
      el.innerHTML = '<p class="empty-note">No projects yet</p>';
      return;
    }

    el.innerHTML = projects.map(p => {
      const projChats = allChats.filter(c => c.projectId === p.id);
      const isOpen    = !_collapsedSections['proj_' + p.id];
      return `
        <div class="project-item">
          <div class="project-row ${isOpen ? 'active' : ''}" onclick="App.toggleProject('${p.id}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
            <span class="project-caret ${isOpen ? 'open' : ''}">▶</span>
          </div>
          ${isOpen ? `
          <div class="project-chats">
            ${projChats.length
              ? projChats.map(c => `
                <div class="chat-item ${activeChatId === c.id ? 'active' : ''}"
                     onclick="App.openChat('${c.id}')">
                  <span class="chat-item-title">${esc(c.title)}</span>
                  <button class="chat-item-del" onclick="event.stopPropagation(); App.deleteChat('${c.id}')" title="Delete">✕</button>
                </div>`).join('')
              : '<p class="empty-note">No chats in this project</p>'
            }
          </div>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderArtifacts() {
    const el        = document.getElementById('artifactsList');
    if (!el) return;
    const artifacts = getArtifacts();
    if (!artifacts.length) {
      el.innerHTML = '<p class="empty-note">Generated code appears here</p>';
      return;
    }
    el.innerHTML = artifacts.slice(0, 10).map(a => `
      <div class="chat-item" onclick="App.viewArtifact('${a.id}')">
        <span class="chat-item-title">⚙ ${esc(a.title)}</span>
      </div>
    `).join('');
  }

  /* ── Chat UI ────────────────────────────────────────────────── */
  function showWelcome() {
    document.getElementById('welcomeScreen').style.display = '';
    document.getElementById('chatThread').style.display    = 'none';
    activeChatId = null;
    renderSidebar();
  }

  function openChat(chatId) {
    const chat = getChatById(chatId);
    if (!chat) return;

    activeChatId = chatId;

    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('chatThread').style.display    = '';

    // Header
    document.getElementById('chatThreadTitle').textContent = chat.title;
    const badge = document.getElementById('chatProjectBadge');
    if (chat.projectId) {
      const proj = getProjectById(chat.projectId);
      badge.textContent  = proj ? proj.name : 'Project';
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }

    // Render messages
    const area = document.getElementById('messagesArea');
    area.innerHTML = '';
    chat.messages.forEach(msg => {
      if (msg.role === 'user') {
        appendUserMessage(msg.content, false);
      } else {
        appendBotMessage(msg.content, false);
      }
    });
    area.scrollTop = area.scrollHeight;

    renderSidebar();
    document.getElementById('promptInput').focus();
  }

  function appendUserMessage(text, save = true) {
    if (save && activeChatId) addMessage(activeChatId, 'user', text);

    const area = document.getElementById('messagesArea');
    const user = Auth.current();
    const initials = (user?.name || 'U')[0].toUpperCase();

    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `
      <div class="msg-avatar">${initials}</div>
      <div class="msg-body">
        <div class="msg-sender">${esc(user?.name || 'You')}</div>
        <div class="msg-content">${esc(text)}</div>
      </div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function appendBotMessage(content, save = true) {
    if (save && activeChatId) addMessage(activeChatId, 'assistant', content);

    const area = document.getElementById('messagesArea');
    const div  = document.createElement('div');
    div.className = 'msg bot';
    div.innerHTML = `
      <div class="msg-avatar">⚙</div>
      <div class="msg-body">
        <div class="msg-sender">CRUD Architect</div>
        <div class="msg-content">${content}</div>
      </div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function appendTypingIndicator() {
    const area = document.getElementById('messagesArea');
    const div  = document.createElement('div');
    div.className = 'msg bot';
    div.id = 'typingIndicator';
    div.innerHTML = `
      <div class="msg-avatar">⚙</div>
      <div class="msg-body">
        <div class="msg-sender">CRUD Architect</div>
        <div class="msg-content">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  /* ── Section toggle ─────────────────────────────────────────── */
  function toggleSection(sectionId) {
    const body    = document.getElementById(sectionId);
    const chevron = document.getElementById(sectionId + 'Chevron');
    if (!body) return;
    const closed = body.classList.toggle('closed');
    if (chevron) chevron.classList.toggle('closed', closed);
    _collapsedSections[sectionId] = closed;
  }

  function toggleProject(projectId) {
    const k      = 'proj_' + projectId;
    _collapsedSections[k] = !_collapsedSections[k];
    renderProjectsList();
  }

  /* ── Sidebar collapse ───────────────────────────────────────── */
  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sb = document.getElementById('sidebar');
    const sc = document.getElementById('sidebarCollapsed');
    sb.classList.toggle('collapsed', !sidebarOpen);
    if (sc) sc.style.display = sidebarOpen ? 'none' : '';
  }

  /* ── New chat ───────────────────────────────────────────────── */
  function startNewChat() {
    showWelcome();
    document.getElementById('promptInput').focus();
  }

  /* ── Save to project modal ──────────────────────────────────── */
  function saveToProject() {
    if (!activeChatId) return;
    const projects = getProjects();
    const list = document.getElementById('saveProjectList');
    if (!projects.length) {
      list.innerHTML = '<p class="empty-note">No projects yet. Create one first.</p>';
    } else {
      list.innerHTML = projects.map(p => `
        <div class="save-project-item" onclick="App.assignToProject('${p.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <div>
            <div style="font-size:14px;font-weight:500">${esc(p.name)}</div>
            ${p.description ? `<div style="font-size:12px;color:var(--text3)">${esc(p.description)}</div>` : ''}
          </div>
        </div>`).join('');
    }
    openModal('saveProjectModal');
  }

  function assignToProject(projectId) {
    assignChatToProject(activeChatId, projectId);
    closeModal('saveProjectModal');
    const proj = getProjectById(projectId);
    const badge = document.getElementById('chatProjectBadge');
    if (proj) { badge.textContent = proj.name; badge.style.display = ''; }
  }

  /* ── Project creation ───────────────────────────────────────── */
  function openCreateProject() {
    document.getElementById('projectNameInput').value = '';
    document.getElementById('projectDescInput').value = '';
    closeModal('saveProjectModal');
    openModal('newProjectModal');
    setTimeout(() => document.getElementById('projectNameInput').focus(), 100);
  }

  function confirmCreateProject() {
    const name = document.getElementById('projectNameInput').value.trim();
    const desc = document.getElementById('projectDescInput').value.trim();
    if (!name) { toast('Please enter a project name.'); return; }
    createProjectRecord(name, desc);
    closeModal('newProjectModal');
    renderSidebar();
    toast(`Project "${name}" created!`);
  }

  /* ── Search ─────────────────────────────────────────────────── */
  function openSearch() {
    openModal('searchModal');
    setTimeout(() => { document.getElementById('searchInput').focus(); }, 100);
    runSearch('');
  }

  function runSearch(query) {
    const q       = query.toLowerCase().trim();
    const results = document.getElementById('searchResults');
    const chats   = getChats();

    const matches = q
      ? chats.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.messages.some(m => String(m.content).toLowerCase().includes(q))
        )
      : chats.slice(0, 8);

    if (!matches.length) {
      results.innerHTML = `<div class="search-empty">${q ? 'No results found.' : 'Start typing to search…'}</div>`;
      return;
    }

    results.innerHTML = matches.map(c => {
      const proj = c.projectId ? getProjectById(c.projectId) : null;
      return `
        <div class="search-result-item" onclick="App.openChat('${c.id}'); closeModal('searchModal')">
          <div class="search-result-title">${esc(c.title)}</div>
          <div class="search-result-meta">${proj ? '📁 ' + esc(proj.name) + ' · ' : ''}${c.messages.length} message${c.messages.length !== 1 ? 's' : ''} · ${formatDate(c.updatedAt)}</div>
        </div>`;
    }).join('');
  }

  /* ── Settings / customize ───────────────────────────────────── */
  function openSettings() {
    const user = Auth.current();
    document.getElementById('displayNameInput').value = user?.name || '';
    document.getElementById('apiKeyInput').value      = localStorage.getItem('ca_api_key') || '';
    closeUserMenu();
    openModal('settingsModal');
  }

  function saveSettings() {
    const name   = document.getElementById('displayNameInput').value.trim();
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (name) {
      Auth.updateName(name);
      document.getElementById('userName').textContent = name;
      document.getElementById('userAvatar').textContent = name[0].toUpperCase();
    }
    if (apiKey) localStorage.setItem('ca_api_key', apiKey);
    closeModal('settingsModal');
    toast('Settings saved!');
  }

  function openCustomize() {
    const user  = Auth.current();
    const theme = user?.settings?.theme || 'light';
    document.getElementById('themeLight').classList.toggle('active', theme === 'light');
    document.getElementById('themeDark').classList.toggle('active', theme === 'dark');
    document.getElementById('codeLangSelect').value = user?.settings?.codeLang || 'python';
    openModal('customizeModal');
  }

  function saveCustomize() {
    const theme    = document.getElementById('themeLight').classList.contains('active') ? 'light' : 'dark';
    const codeLang = document.getElementById('codeLangSelect').value;
    Auth.updateSettings({ theme, codeLang });
    applyTheme(theme);
    closeModal('customizeModal');
    toast('Preferences saved!');
  }

  function setTheme(t) {
    document.getElementById('themeLight').classList.toggle('active', t === 'light');
    document.getElementById('themeDark').classList.toggle('active', t === 'dark');
  }

  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
  }

  /* ── User menu ──────────────────────────────────────────────── */
  function toggleUserMenu() {
    const dd = document.getElementById('userDropdown');
    dd.style.display = dd.style.display === 'none' ? '' : 'none';
  }
  function closeUserMenu() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.style.display = 'none';
  }

  /* ── Artifact viewer ────────────────────────────────────────── */
  function viewArtifact(id) {
    const artifact = getArtifacts().find(a => a.id === id);
    if (!artifact) return;
    toast('Artifact: ' + artifact.title);
  }

  /* ── Utility ────────────────────────────────────────────────── */
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000)  return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return d.toLocaleDateString();
  }

  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init(user) {
    currentUser = user;

    // Apply saved theme
    applyTheme(user.settings?.theme || 'light');

    // Populate user info
    document.getElementById('userName').textContent  = user.name;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').textContent = user.name[0].toUpperCase();

    // Render sidebar
    renderSidebar();

    // Close user menu on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sidebar-user') && !e.target.closest('.user-dropdown')) {
        closeUserMenu();
      }
    });

    // Auto-resize textarea
    const ta = document.getElementById('promptInput');
    if (ta) ta.addEventListener('input', () => autoResize(ta));
  }

  /* ── Exports ────────────────────────────────────────────────── */
  return {
    init,
    // Chat
    openChat, startNewChat, deleteChat,
    appendUserMessage, appendBotMessage,
    appendTypingIndicator, removeTypingIndicator,
    createChat, updateChat, getChatById, getChats,
    addMessage,
    // Projects
    createProjectRecord, openCreateProject,
    confirmCreateProject, assignToProject,
    saveToProject, getProjectById,
    toggleProject,
    // Artifacts
    saveArtifact,
    // UI
    toggleSection, toggleSidebar, showWelcome,
    toggleUserMenu, openSettings, saveSettings,
    openCustomize, saveCustomize, setTheme,
    openSearch, runSearch,
    renderSidebar,
    // Utils
    esc, formatDate,
    // Access active chat
    getActiveChatId: () => activeChatId,
    setActiveChatId: (id) => { activeChatId = id; },
  };

})();

/* ── Global helpers (called from HTML onclick) ──────────────── */
function toggleSidebar()        { App.toggleSidebar(); }
function startNewChat()         { App.startNewChat(); }
function toggleSection(id)      { App.toggleSection(id); }
function createProject()        { App.openCreateProject(); }
function confirmCreateProject() { App.confirmCreateProject(); }
function saveToProject()        { App.saveToProject(); }
function openSearch()           { App.openSearch(); }
function runSearch(v)           { App.runSearch(v); }
function openSettings()         { App.openSettings(); }
function saveSettings()         { App.saveSettings(); }
function openCustomize()        { App.openCustomize(); }
function saveCustomize()        { App.saveCustomize(); }
function setTheme(t)            { App.setTheme(t); }
function toggleUserMenu()       { App.toggleUserMenu(); }

function openModal(id)  {
  document.getElementById(id).style.display = '';
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function toast(msg, duration = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), duration);
}
