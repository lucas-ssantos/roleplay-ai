let presetsData = {};
const form       = document.getElementById('settings-form');
const feedbackEl = document.getElementById('feedback-msg');

function showFeedback(text, isError = false) {
  feedbackEl.className = isError ? 'alert-glass-error' : 'alert-glass-success';
  feedbackEl.innerHTML = `<i class="bi bi-${isError ? 'exclamation-triangle' : 'check-circle'} me-2"></i>${text}`;
  feedbackEl.style.display = 'block';
  if (!isError) setTimeout(() => { feedbackEl.style.display = 'none'; }, 4000);
}

async function loadPresets() {
  try {
    const res  = await fetch('/api/presets');
    const data = await res.json();
    if (data.ok && data.presets) {
      presetsData = data.presets;
      renderPresets();
    }
  } catch { showFeedback('Erro ao carregar presets.', true); }
}

async function loadConfig() {
  try {
    const res  = await fetch('/api/config');
    const data = await res.json();
    if (data.ok && data.config) fillForm(data.config);
  } catch { /* silent */ }
}

function fillForm(config) {
  document.getElementById('model').value          = config.model          || '';
  document.getElementById('temperature').value    = config.temperature    ?? '';
  document.getElementById('top_p').value          = config.top_p          ?? '';
  document.getElementById('top_k').value          = config.top_k          ?? '';
  document.getElementById('min_p').value          = config.min_p          ?? '';
  document.getElementById('tfs_z').value          = config.tfs_z          ?? '';
  document.getElementById('repeat_penalty').value = config.repeat_penalty ?? '';
  document.getElementById('repeat_last_n').value  = config.repeat_last_n  ?? '';
  document.getElementById('context_size').value      = config.context_size      ?? '';
  document.getElementById('num_ctx_messages').value  = config.num_ctx_messages  ?? '';
  document.getElementById('min_tokens').value        = config.min_tokens        ?? '';
  document.getElementById('max_tokens').value     = config.max_tokens     ?? '';
  document.getElementById('stream').value         = config.stream ? '1' : '0';
  document.getElementById('seed').value           = config.seed           ?? '';
  if (config.stop) {
    document.getElementById('stop').value =
      Array.isArray(config.stop) ? config.stop.join(', ') : config.stop;
  }
}

function loadPreset(key) {
  const preset = presetsData[key];
  if (!preset?.config) return showFeedback('Erro ao carregar preset.', true);
  fillForm(preset.config);
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
  showFeedback(`Preset "${preset.name}" carregado.`);
}

function renderPresets() {
  const el = document.getElementById('presets');
  el.innerHTML = Object.entries(presetsData).map(([key, p]) => `
    <div class="col-12 col-sm-4">
      <button type="button" class="preset-btn" data-preset="${key}" onclick="loadPreset('${key}')">
        <strong>${p.name}</strong>
        <small>${p.desc}</small>
      </button>
    </div>
  `).join('');
}

async function handleSubmit(e) {
  e.preventDefault();
  feedbackEl.style.display = 'none';

  const stopStr = document.getElementById('stop').value.trim();
  const stop = stopStr.split(',').map(s => s.trim()).filter(Boolean);

  const config = {
    model:          document.getElementById('model').value.trim(),
    temperature:    parseFloat(document.getElementById('temperature').value)    || null,
    top_p:          parseFloat(document.getElementById('top_p').value)          || null,
    top_k:          parseInt(document.getElementById('top_k').value)            || null,
    min_p:          parseFloat(document.getElementById('min_p').value)          || null,
    tfs_z:          parseFloat(document.getElementById('tfs_z').value)          || null,
    repeat_penalty: parseFloat(document.getElementById('repeat_penalty').value) || null,
    repeat_last_n:  parseInt(document.getElementById('repeat_last_n').value)    || null,
    context_size:     parseInt(document.getElementById('context_size').value)     || null,
    num_ctx_messages: parseInt(document.getElementById('num_ctx_messages').value) || null,
    min_tokens:       parseInt(document.getElementById('min_tokens').value)       || null,
    max_tokens:     parseInt(document.getElementById('max_tokens').value)       || null,
    stream:         parseInt(document.getElementById('stream').value)           || null,
    seed:           parseInt(document.getElementById('seed').value)             || -1,
    stop,
  };

  try {
    const res    = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.message || 'Erro ao salvar.');
    showFeedback('Configuração salva com sucesso!');
  } catch (err) {
    showFeedback(err.message || 'Erro ao salvar configuração.', true);
  }
}

window.addEventListener('load', async () => {
  await loadSidebar();
  await Promise.all([loadPresets(), loadConfig()]);
  form.addEventListener('submit', handleSubmit);

  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(
    (el) => new bootstrap.Tooltip(el)
  );
});
