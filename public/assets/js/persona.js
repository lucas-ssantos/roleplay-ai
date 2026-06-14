const form        = document.getElementById('persona-form');
const msgError    = document.getElementById('msg-error');
const loadingEl   = document.getElementById('loading-state');
const pageTitle   = document.getElementById('page-title');
const pageDesc    = document.getElementById('page-description');

async function fetchPersona() {
  const response = await fetch('/api/persona');
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Falha ao carregar a persona');
  return (await response.json()).persona;
}

async function initializePage() {
  try {
    const persona = await fetchPersona();
    loadingEl.style.display = 'none';

    if (persona) {
      pageTitle.textContent = 'Editar persona';
      pageDesc.textContent  = 'Atualize os dados da sua persona quando desejar.';
      document.getElementById('name').value        = persona.name        || '';
      document.getElementById('description').value = persona.description || '';
      document.getElementById('avatar_url').value  = persona.avatar_url  || '';
      await loadSidebar();
    } else {
      loadingEl.style.display = 'none';
    }
  } catch (err) {
    loadingEl.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>${err.message}</span>`;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  msgError.style.display = 'none';

  const data = {
    name:        document.getElementById('name').value.trim(),
    description: document.getElementById('description').value.trim(),
    avatar_url:  document.getElementById('avatar_url').value.trim() || null,
  };

  if (!data.name || !data.description) {
    msgError.textContent = 'Por favor, preencha o nome e a descrição.';
    msgError.style.display = 'block';
    return;
  }

  try {
    const response = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'Falha ao salvar persona');
    window.location.href = '/';
  } catch (err) {
    msgError.textContent = err.message || 'Erro ao salvar persona. Tente novamente.';
    msgError.style.display = 'block';
  }
});

window.addEventListener('load', initializePage);
