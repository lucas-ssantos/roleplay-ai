const statusEl    = document.getElementById('status');
const tableListEl = document.getElementById('table-list');
const recordsEl   = document.getElementById('records-container');
let currentTable  = null;

async function fetchTables() {
  const res = await fetch('/api/viewdb/tables');
  return res.json();
}

async function fetchRecords(table) {
  const res = await fetch(`/api/viewdb/records?table=${encodeURIComponent(table)}`);
  return res.json();
}

function renderTables(tables) {
  if (!tables.length) {
    tableListEl.innerHTML = '<p class="text-secondary small">Nenhuma tabela encontrada.</p>';
    return;
  }

  tableListEl.innerHTML = tables.map((t) => `
    <button class="table-item" data-table="${t.name}">
      <div>
        <div class="fw-semibold" style="font-size:.9rem;">${t.name}</div>
        <div class="text-secondary" style="font-size:.78rem;">${t.count} registro${t.count !== 1 ? 's' : ''}</div>
      </div>
      <span class="record-count">${t.count}</span>
    </button>
  `).join('');

  tableListEl.querySelectorAll('.table-item').forEach((btn) => {
    btn.addEventListener('click', () => loadTable(btn.dataset.table));
  });
}

function renderRecords(data) {
  if (!data.ok) {
    recordsEl.innerHTML = `<div class="alert-glass-error"><i class="bi bi-exclamation-triangle me-1"></i>${data.message}</div>`;
    return;
  }

  if (!data.columns.length) {
    recordsEl.innerHTML = '<p class="text-secondary small">Nenhum registro encontrado.</p>';
    return;
  }

  recordsEl.innerHTML = `
    <div class="text-secondary small mb-3">
      Mostrando até 25 de <strong class="text-light">${data.total}</strong> registros em <strong class="text-info">${data.table}</strong>
    </div>
    <div class="table-responsive">
      <table class="table table-hover table-sm">
        <thead>
          <tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.rows.map(row =>
            `<tr>${row.map(cell =>
              `<td title="${cell === null ? 'NULL' : String(cell)}">
                 ${cell === null ? '<span class="text-secondary">NULL</span>' : String(cell)}
               </td>`
            ).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function loadTable(table) {
  currentTable = table;
  statusEl.textContent = `Carregando ${table}…`;

  tableListEl.querySelectorAll('.table-item').forEach((btn) => {
    btn.classList.toggle('active-table', btn.dataset.table === table);
  });

  recordsEl.innerHTML = `
    <div class="d-flex align-items-center gap-2 text-secondary small py-3">
      <div class="spinner-border spinner-border-sm text-info" role="status"></div>
      Carregando registros…
    </div>
  `;

  const data = await fetchRecords(table);
  renderRecords(data);
  statusEl.textContent = '';
}

async function init() {
  try {
    const data = await fetchTables();
    if (!data.ok) throw new Error(data.message || 'Erro ao carregar tabelas');

    statusEl.textContent = '';
    renderTables(data.tables);

    if (data.tables.length) {
      loadTable(data.tables[0].name);
    } else {
      statusEl.textContent = 'Nenhuma tabela disponível.';
    }
  } catch (err) {
    statusEl.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>${err.message}</span>`;
    tableListEl.innerHTML = '';
  }
}

window.addEventListener('load', async () => {
  await loadSidebar();
  init();
});
