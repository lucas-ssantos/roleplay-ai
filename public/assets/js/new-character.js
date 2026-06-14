const form     = document.getElementById('character-form');
const msgError = document.getElementById('msg-error');
const msgOk    = document.getElementById('msg-success');

function showError(text) {
  msgError.textContent = text;
  msgError.style.display = 'block';
  msgOk.style.display = 'none';
}

function showSuccess(text) {
  msgOk.textContent = text;
  msgOk.style.display = 'block';
  msgError.style.display = 'none';
}

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  msgError.style.display = 'none';
  msgOk.style.display = 'none';

  const name        = document.getElementById('name').value.trim();
  const scenario    = document.getElementById('scenario').value.trim();
  const description = document.getElementById('description').value.trim();
  const personality = document.getElementById('personality').value.trim();
  const firstMessage = document.getElementById('first_message').value.trim();
  const avatarLink  = document.getElementById('avatar_link').value.trim();
  const avatarFile  = document.getElementById('avatar_upload').files[0];

  if (!name) { showError('O nome do personagem é obrigatório.'); return; }
  if (!avatarFile && !avatarLink) { showError('Envie uma imagem ou informe um link de avatar.'); return; }

  const body = { name, scenario, description, personality, first_message: firstMessage };

  if (avatarFile) {
    body.avatar_upload   = await readFileAsBase64(avatarFile);
    body.avatar_filename = avatarFile.name;
  } else {
    body.avatar_link = avatarLink;
  }

  try {
    const response = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) throw new Error(result.message || 'Falha ao salvar personagem.');

    showSuccess('Personagem criado com sucesso! Redirecionando...');
    setTimeout(() => { window.location.href = `/chat/${result.id}`; }, 1200);
  } catch (err) {
    showError(err.message || 'Erro ao salvar personagem.');
  }
}

window.addEventListener('load', async () => {
  await loadSidebar();
  form.addEventListener('submit', handleSubmit);
});
