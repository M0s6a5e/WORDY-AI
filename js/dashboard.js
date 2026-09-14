(function(){
  "use strict";

  /* ---------------- APPLICATION DATA ---------------- */
  let projects = [];

  let files = [];

  let templates = [];

  /* ---------------- FREE PLAN LIMITS (frontend only; enforced by backend later) ---------------- */
  const MAX_PROJECTS = 4;
  const DAILY_AI_LIMIT = 2;

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function getAiUsage() {
    try {
      const u = JSON.parse(localStorage.getItem("wordy-ai-usage") || "{}");
      if (u.date !== todayKey()) return { date: todayKey(), count: 0 };
      return u;
    } catch (e) { return { date: todayKey(), count: 0 }; }
  }
  function bumpAiUsage() {
    const u = getAiUsage();
    u.count += 1;
    try { localStorage.setItem("wordy-ai-usage", JSON.stringify(u)); } catch (e) {}
    updateBillingUsage();
    return u.count;
  }
  function aiLeft() { return Math.max(0, DAILY_AI_LIMIT - getAiUsage().count); }
  function updateBillingUsage() {
    const el = document.getElementById("billingUsage");
    if (el) el.textContent = "Free plan usage — Projects: " + projects.length + " / " + MAX_PROJECTS + " • AI files left today: " + aiLeft() + " / " + DAILY_AI_LIMIT + " (resets daily)";
    const cl = document.getElementById("createLimits");
    if (cl) cl.textContent = "Free plan: " + projects.length + " / " + MAX_PROJECTS + " projects • " + aiLeft() + " / " + DAILY_AI_LIMIT + " AI files left today";
  }

  /* ---------------- TOAST NOTIFICATION ---------------- */
  window.toast = function(msg) {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> <span>' + msg + '</span>';
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .25s ease';
      setTimeout(() => t.remove(), 250);
    }, 2800);
  };

  /* ---------------- NAVIGATION / HASH ROUTING ---------------- */
  const views = {
    dashboard: document.getElementById('view-dashboard'),
    files: document.getElementById('view-files'),
    templates: document.getElementById('view-templates'),
    settings: document.getElementById('view-settings'),
    billing: document.getElementById('view-billing')
  };

  const navTitles = {
    dashboard: "Workspace Overview",
    files: "My Files & Library",
    templates: "Template Library",
    settings: "Workspace Settings",
    billing: "Billing & Subscription"
  };

  function switchView(viewKey) {
    if (!views[viewKey]) viewKey = 'dashboard';
    
    // Update active view
    Object.keys(views).forEach(k => {
      views[k].classList.toggle('active', k === viewKey);
    });

    // Update active sidebar nav
    document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewKey);
    });

    // Update Topbar Title
    document.getElementById('pageTitle').textContent = navTitles[viewKey] || "Workspace";
    
    // Update URL hash without scroll jumping
    history.replaceState(null, '', '#' + viewKey);

    // Close mobile drawer if open
    closeMobileDrawer();
  }

  // Sidebar buttons click
  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => switchView(el.dataset.view));
  });

  // User card clicks
  document.getElementById('userCardBtn').addEventListener('click', () => switchView('settings'));

  // Handle URL hash on initial load & popstate
  function handleHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'welcome') {
      switchView('dashboard');
      openWelcome();
      return;
    }
    if (hash && views[hash]) {
      switchView(hash);
    } else {
      switchView('dashboard');
    }
  }
  window.addEventListener('popstate', handleHash);

  /* ---------------- THEME TOGGLE (DARK / LIGHT) ---------------- */
  const htmlEl = document.documentElement;
  const darkThemeSwitch = document.getElementById('darkThemeSwitch');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  function setTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('wordy-theme', theme);
    if (darkThemeSwitch) darkThemeSwitch.checked = (theme === 'dark');
  }

  const savedTheme = localStorage.getItem('wordy-theme') || 'light';
  setTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  if (darkThemeSwitch) {
    darkThemeSwitch.addEventListener('change', (e) => {
      setTheme(e.target.checked ? 'dark' : 'light');
    });
  }

  /* ---------------- MOBILE DRAWER ---------------- */
  const sidebar = document.getElementById('sidebar');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');

  function openMobileDrawer() {
    sidebar.classList.add('open');
    drawerOverlay.classList.add('open');
  }
  function closeMobileDrawer() {
    sidebar.classList.remove('open');
    drawerOverlay.classList.remove('open');
  }
  hamburgerBtn.addEventListener('click', openMobileDrawer);
  drawerOverlay.addEventListener('click', closeMobileDrawer);

  /* ---------------- RENDER PROJECTS ---------------- */
  function renderProjects(filter = 'all', query = '') {
    const grid = document.getElementById('projectsGrid');
    let list = projects.slice();
    
    if (filter !== 'all') list = list.filter(p => p.type === filter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q));
    }

    grid.innerHTML = list.map(p => `
      <article class="project-card" data-id="${p.id}">
        <div class="card-preview ${p.type}">
          ${p.type === 'word' 
            ? '<div class="doc-sheet"><div class="doc-line title"></div><div class="doc-line w80"></div><div class="doc-line w60"></div></div>'
            : '<div class="sheet-grid"><div class="sheet-cell head"></div><div class="sheet-cell head"></div><div class="sheet-cell head"></div><div class="sheet-cell head"></div><div class="sheet-cell"></div><div class="sheet-cell"></div><div class="sheet-cell"></div><div class="sheet-cell"></div></div>'
          }
          <div class="card-badge-type ${p.type}">
            ${p.type === 'word' 
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'
            }
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">${p.title}</div>
          <div class="card-meta">Updated ${p.date} · ${p.size}</div>
          <div class="card-foot">
            <span class="status-pill ${p.status}">
              ${p.status === 'generating' ? '<span class="spinner"></span> Generating...' : '✓ Ready'}
            </span>
            <button class="btn-ghost btn-sm" onclick="event.stopPropagation(); toast('File downloaded ✓')">Download</button>
            <button class="btn-ghost btn-sm" onclick="event.stopPropagation(); deleteProject(${p.id})" aria-label="Delete project" title="Delete project" style="color:var(--red, #C24A3D);">✕</button>
          </div>
        </div>
      </article>
    `).join('');

    if (!list.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--charcoal-soft)"><div style="font-size:40px;margin-bottom:12px">📄</div><div style="font-weight:700;color:var(--charcoal);font-size:16px;margin-bottom:6px">No projects yet</div><div style="font-size:13px">Create your first Word or Excel file with AI to get started.</div></div>';
    }

    // Click card opens the matching creator studio
    grid.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        const p = projects.find(x => x.id === id);
        window.location.href = p.type === 'word' ? 'wordy-ai-word-creator.html' : 'wordy-ai-excel-creator.html';
      });
    });

    document.getElementById('statTotalProjects').textContent = projects.length;
    document.getElementById('countProjects').textContent = projects.length;
    document.getElementById('statWordProjects').textContent = projects.filter(x => x.type === 'word').length;
    document.getElementById('statExcelProjects').textContent = projects.filter(x => x.type === 'excel').length;
  }

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.dataset.filter, document.getElementById('searchProjectsInput').value);
    });
  });

  // Search input
  document.getElementById('searchProjectsInput').addEventListener('input', (e) => {
    const activeFilter = document.querySelector('.filter-chip.active').dataset.filter;
    renderProjects(activeFilter, e.target.value);
  });

  /* ---------------- RENDER FILES ---------------- */
  function renderFiles() {
    const tbody = document.getElementById('filesTableBody');
    tbody.innerHTML = files.map(f => `
      <tr>
        <td>
          <div class="file-name-cell">
            <div class="file-icon-box ${f.type}">
              ${f.type === 'word' 
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'
                : (f.type === 'excel'
                  ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'
                  : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>')
              }
            </div>
            <span>${f.name}</span>
          </div>
        </td>
        <td><span class="topbar-badge" style="text-transform:uppercase;">${f.type}</span></td>
        <td style="color:var(--charcoal-soft);">${f.size}</td>
        <td style="color:var(--charcoal-soft);">${f.date}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="toast('Downloading ${f.name}...')">Download</button>
        </td>
      </tr>
    `).join('');
    if (!files.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px 20px;color:var(--charcoal-soft)"><div style="font-size:36px;margin-bottom:10px">🗂️</div><div style="font-weight:700;color:var(--charcoal);margin-bottom:4px">No files yet</div><div style="font-size:13px">Uploaded and generated files will appear here.</div></td></tr>';
    }
    document.getElementById('countFiles').textContent = files.length;
  }

  /* ---------------- RENDER TEMPLATES ---------------- */
  function renderTemplates() {
    const grid = document.getElementById('templatesGrid');
    grid.innerHTML = templates.map(t => `
      <article class="project-card">
        <div class="card-preview ${t.type}">
          <div class="card-badge-type ${t.type}">
            ${t.type === 'word' 
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'
            }
          </div>
        </div>
        <div class="card-body">
          <div class="topbar-badge" style="width:fit-content; margin-bottom:4px;">${t.category}</div>
          <div class="card-title">${t.title}</div>
          <p style="font-size:13px; color:var(--charcoal-soft);">${t.desc}</p>
          <div class="card-foot">
            <button class="btn btn-primary btn-sm" onclick="useTemplate('${t.title}', '${t.type}')">Use Template →</button>
          </div>
        </div>
      </article>
    `).join('');
    if (!templates.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--charcoal-soft)"><div style="font-size:40px;margin-bottom:12px">▦</div><div style="font-weight:700;color:var(--charcoal);font-size:16px;margin-bottom:6px">No templates available</div><div style="font-size:13px">New templates will be added here soon.</div></div>';
    }
  }

  window.deleteProject = function(id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    if (!window.confirm('Delete "' + p.title + '"? This cannot be undone.')) return;
    projects = projects.filter(x => x.id !== id);
    renderProjects();
    updateBillingUsage();
    toast('Project deleted. You can now create a new one.');
  };

  window.useTemplate = function(title, type) {
    if (projects.length >= MAX_PROJECTS) { toast("Project limit reached (4 / 4). Delete a project to create another."); return; }
    if (aiLeft() <= 0) { toast("Daily AI limit reached (2 / day). Usage resets tomorrow."); return; }
    bumpAiUsage();
    window.location.href = type === 'word' ? 'wordy-ai-word-creator.html' : 'wordy-ai-excel-creator.html';
  };

  /* ---------------- CREATE NEW DOCUMENT MODAL ---------------- */
  const modalCreateDoc = document.getElementById('modalCreateDoc');
  const docPromptTitle = document.getElementById('docPromptTitle');
  const docPromptType = document.getElementById('docPromptType');

  function openCreateModal(defaultType = 'word') {
    docPromptType.value = defaultType;
    docPromptTitle.value = defaultType === 'word' ? 'New Strategic Document' : 'New Financial Workbook';
    updateBillingUsage();
    modalCreateDoc.classList.add('open');
  }

  document.getElementById('topNewDocBtn').addEventListener('click', () => openCreateModal());
  document.getElementById('btnQuickWord').addEventListener('click', () => openCreateModal('word'));
  document.getElementById('btnQuickExcel').addEventListener('click', () => openCreateModal('excel'));
  document.getElementById('navCreateWord').addEventListener('click', () => openCreateModal('word'));
  document.getElementById('navCreateExcel').addEventListener('click', () => openCreateModal('excel'));
  document.getElementById('closeCreateDocBtn').addEventListener('click', () => modalCreateDoc.classList.remove('open'));
  document.getElementById('cancelCreateDocBtn').addEventListener('click', () => modalCreateDoc.classList.remove('open'));

  function createAIProject(title, type) {
    if (projects.length >= MAX_PROJECTS) { toast("Project limit reached (4 / 4). Delete a project to create another."); return; }
    if (aiLeft() <= 0) { toast("Daily AI limit reached (2 / day). Usage resets tomorrow."); return; }
    bumpAiUsage();
    const newId = projects.length + 1;
    const newProject = {
      id: newId,
      title: title || (type === 'word' ? 'Untitled Document' : 'Untitled Spreadsheet'),
      type: type,
      status: 'generating',
      date: 'Just now',
      size: type === 'word' ? '1.2 MB' : '1.8 MB'
    };
    projects.unshift(newProject);
    switchView('dashboard');
    renderProjects();
    updateBillingUsage();
    toast(`AI is building "${newProject.title}"...`);

    // Simulate AI generation stages
    setTimeout(() => {
      newProject.status = 'ready';
      renderProjects();
      updateBillingUsage();
      toast(`"${newProject.title}" is ready ✓ — opening studio…`);
      setTimeout(() => {
        window.location.href = type === 'word' ? 'wordy-ai-word-creator.html' : 'wordy-ai-excel-creator.html';
      }, 900);
    }, 2400);
  }

  document.getElementById('submitCreateDocBtn').addEventListener('click', () => {
    const title = docPromptTitle.value.trim();
    const type = docPromptType.value;
    modalCreateDoc.classList.remove('open');
    createAIProject(title, type);
  });

  /* ---------------- UPLOAD MODAL & REAL FILE READER ---------------- */
  const modalUpload = document.getElementById('modalUpload');
  const dropzoneEl = document.getElementById('dropzoneEl');
  const hiddenFileInput = document.getElementById('hiddenFileInput');
  const uploadQueueList = document.getElementById('uploadQueueList');

  function openUploadModal() { modalUpload.classList.add('open'); }
  document.getElementById('topUploadBtn').addEventListener('click', openUploadModal);
  document.getElementById('btnUploadFileModal').addEventListener('click', openUploadModal);
  document.getElementById('closeUploadBtn').addEventListener('click', () => modalUpload.classList.remove('open'));

  function handleUploadedFiles(fileList) {
    Array.from(fileList).forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      let ftype = 'other';
      if (['doc', 'docx'].includes(ext)) ftype = 'word';
      if (['xls', 'xlsx', 'csv'].includes(ext)) ftype = 'excel';
      if (ext === 'pdf') ftype = 'pdf';

      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.background = 'var(--surface-alt)';
      item.style.borderRadius = '8px';
      item.style.marginBottom = '6px';
      item.style.fontSize = '13px';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.innerHTML = `<span>📄 ${file.name}</span><span style="color:var(--green); font-weight:700;">Uploaded ✓</span>`;
      uploadQueueList.appendChild(item);

      files.unshift({ name: file.name, type: ftype, size: sizeStr, date: 'Just now' });
      renderFiles();
      toast(`Uploaded ${file.name} ✓`);
    });
  }

  hiddenFileInput.addEventListener('change', (e) => handleUploadedFiles(e.target.files));
  dropzoneEl.addEventListener('dragover', (e) => { e.preventDefault(); dropzoneEl.classList.add('dragover'); });
  dropzoneEl.addEventListener('dragleave', () => dropzoneEl.classList.remove('dragover'));
  dropzoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneEl.classList.remove('dragover');
    handleUploadedFiles(e.dataTransfer.files);
  });

  /* ---------------- SETTINGS TABS ---------------- */
  document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      document.querySelectorAll('.settings-tab-content').forEach(c => {
        c.style.display = (c.id === 'tab-' + target) ? 'block' : 'none';
      });
    });
  });

  document.getElementById('btnSaveProfile').addEventListener('click', () => {
    toast('Profile settings saved successfully ✓');
  });

  /* ---------------- WELCOME ONBOARDING (first visit) ---------------- */
  const modalWelcome = document.getElementById('modalWelcome');
  function openWelcome() { if (modalWelcome) modalWelcome.classList.add('open'); }
  function closeWelcome() {
    if (modalWelcome) modalWelcome.classList.remove('open');
    try { localStorage.setItem('wordy-onboarded', '1'); } catch (e) {}
    if (window.location.hash === '#welcome') history.replaceState(null, '', '#dashboard');
  }
  const welcomeSkip = document.getElementById('welcomeSkipBtn');
  if (welcomeSkip) welcomeSkip.addEventListener('click', closeWelcome);
  if (modalWelcome) modalWelcome.addEventListener('click', (e) => { if (e.target === modalWelcome) closeWelcome(); });

  /* ---------------- INITIALIZE ---------------- */
  renderProjects();
  renderFiles();
  renderTemplates();
  updateBillingUsage();
  handleHash();
  try {
    if (!localStorage.getItem('wordy-onboarded') && window.location.hash !== '#welcome') openWelcome();
  } catch (e) {}

})();
