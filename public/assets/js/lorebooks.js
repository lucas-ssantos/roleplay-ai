let lorebookModal;
let deleteModal;
let deletePendingId = null;

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
  await loadSidebar();

  lorebookModal = new bootstrap.Modal(document.getElementById('lorebookModal'));
  deleteModal   = new bootstrap.Modal(document.getElementById('deleteModal'));

  document.getElementById('delete-confirm-btn').addEventListener('click', confirmDelete);

  document.getElementById('lorebookModal').addEventListener('hidden.bs.modal', resetForm);

  loadLorebooks();
});

// ── Load & render grid ────────────────────────────────────────────────────────

async function loadLorebooks() {
  try {
    const res  = await fetch('/api/lorebooks');
    const data = await res.json();
    if (!data.ok) throw new Error(data.message);
    renderGrid(data.lorebooks);
  } catch (err) {
    document.getElementById('lorebook-grid').innerHTML =
      `<div class="col-12"><p class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>${err.message}</p></div>`;
  }
}

function renderGrid(lorebooks) {
  const grid = document.getElementById('lorebook-grid');
  grid.innerHTML = '';

  if (!lorebooks.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="glass-card card p-4 text-center text-secondary">
          <i class="bi bi-journal-text fs-2 mb-2 opacity-50"></i>
          <p class="mb-0">Nenhum lorebook criado ainda. Crie um para adicionar contexto ao roleplay.</p>
        </div>
      </div>`;
    return;
  }

  lorebooks.forEach(lb => {
    const col = document.createElement('div');
    col.className = 'col';

    const keywords = lb.keywords
      ? lb.keywords.split(',').map(k => `<span class="lb-keyword">${escHtml(k.trim())}</span>`).join('')
      : '<span class="lb-keyword lb-keyword-always"><i class="bi bi-infinity"></i> Sempre ativo</span>';

    col.innerHTML = `
      <div class="card glass-card lb-card h-100">
        <div class="card-body d-flex flex-column gap-2">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <h5 class="lb-title mb-0">${escHtml(lb.title)}</h5>
            <div class="lb-actions flex-shrink-0">
              <button class="lb-btn lb-btn-edit" title="Editar" onclick="openEditModal('${lb.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="lb-btn lb-btn-delete" title="Excluir" onclick="openDeleteModal('${lb.id}', '${escAttr(lb.title)}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <div class="lb-keywords-row">${keywords}</div>
          <p class="lb-preview flex-grow-1 mb-0">${escHtml(lb.content)}</p>
          ${lb.insertion_order ? `<div class="lb-order">ordem ${lb.insertion_order}</div>` : ''}
        </div>
      </div>`;

    grid.appendChild(col);
  });
}

// ── Create modal ──────────────────────────────────────────────────────────────

function openCreateModal() {
  resetForm();
  document.getElementById('lorebookModalLabel').textContent = 'Novo lorebook';
  lorebookModal.show();
}

// ── Edit modal ────────────────────────────────────────────────────────────────

async function openEditModal(id) {
  resetForm();
  document.getElementById('lorebookModalLabel').textContent = 'Editar lorebook';

  try {
    const res  = await fetch(`/api/lorebooks/${id}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message);

    const lb = data.lorebook;
    document.getElementById('lb-id').value       = lb.id;
    document.getElementById('lb-title').value    = lb.title    || '';
    document.getElementById('lb-keywords').value = lb.keywords || '';
    document.getElementById('lb-content').value  = lb.content  || '';
    document.getElementById('lb-order').value    = lb.insertion_order ?? 0;

    lorebookModal.show();
  } catch (err) {
    showError(err.message);
  }
}

// ── Save (create or update) ───────────────────────────────────────────────────

async function saveLorebook() {
  const id      = document.getElementById('lb-id').value;
  const title   = document.getElementById('lb-title').value.trim();
  const keywords = document.getElementById('lb-keywords').value.trim();
  const content  = document.getElementById('lb-content').value.trim();
  const order    = document.getElementById('lb-order').value;

  clearError();
  if (!title)   { showError('Título é obrigatório.'); return; }
  if (!content) { showError('Conteúdo é obrigatório.'); return; }

  const btn = document.getElementById('lb-save-btn');
  btn.disabled = true;

  try {
    const body = { title, keywords: keywords || null, content, insertion_order: Number(order) };
    const url    = id ? `/api/lorebooks/${id}` : '/api/lorebooks';
    const method = id ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message);

    lorebookModal.hide();
    loadLorebooks();
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

function openDeleteModal(id, title) {
  deletePendingId = id;
  document.getElementById('delete-lb-title').textContent = title;
  deleteModal.show();
}

async function confirmDelete() {
  if (!deletePendingId) return;
  const id = deletePendingId;
  deletePendingId = null;
  deleteModal.hide();

  try {
    const res  = await fetch(`/api/lorebooks/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.ok) throw new Error(data.message);
    loadLorebooks();
  } catch (err) {
    alert(`Erro ao excluir: ${err.message}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetForm() {
  document.getElementById('lb-id').value       = '';
  document.getElementById('lb-title').value    = '';
  document.getElementById('lb-keywords').value = '';
  document.getElementById('lb-content').value  = '';
  document.getElementById('lb-order').value    = '0';
  clearError();
}

function showError(msg) {
  const el = document.getElementById('lb-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError() {
  const el = document.getElementById('lb-error');
  el.textContent = '';
  el.style.display = 'none';
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
