const $ = selector => document.querySelector(selector);
let user = null;
const categories = { geral: 'Geral', duvidas: 'Dúvidas', teorias: 'Teorias', missoes: 'Missões' };
const types = { principal: 'Principal', secundaria: 'Secundária', atividade: 'Atividade' };
const characters = { lucia: 'Lucia', jason: 'Jason', dupla: 'Lucia e Jason', outros: 'Outros' };
const completed = new Set();
function el(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function link(content, href, className) { const a = el('a', content, className); a.href = href; return a; }
function notice(message, error = false) {
  const node = $('#page-status'); node.textContent = message; node.hidden = false;
  node.toggleAttribute('data-error', error); node.setAttribute('role', error ? 'alert' : 'status');
}
async function api(path, options = {}) {
  let response;
  try { response = await fetch(`/api/${path}`, { ...options, credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } }); }
  catch { throw new Error('Não foi possível conectar. Verifique sua conexão e tente novamente.'); }
  if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Esta área da comunidade ainda está sendo preparada. Tente novamente mais tarde.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
function action(button, callback) {
  button.addEventListener('click', async event => {
    event.preventDefault(); button.disabled = true;
    try { await callback(); } catch (error) { notice(error.message, true); } finally { button.disabled = false; }
  });
}
function formAction(form, callback) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type=submit]'); submit.disabled = true;
    try { await callback(new FormData(form)); } catch (error) { notice(error.message, true); } finally { submit.disabled = false; }
  });
}
function memberVisibility() {
  document.querySelectorAll('[data-member]').forEach(node => { node.hidden = !user; });
  document.querySelectorAll('[data-guest]').forEach(node => { node.hidden = !!user; });
  document.querySelectorAll('.nav-account').forEach(node => { node.textContent = user ? 'Minha conta' : 'Entrar'; });
}
function empty(container, content) { container.replaceChildren(el('p', content, 'empty-state')); }
function metadata(record, label) {
  const result = el('div', undefined, 'publication-meta');
  if (label) result.append(el('span', label, 'tag'));
  if (record.nickname) result.append(el('span', record.nickname));
  if (record.created_at) result.append(el('time', new Date(record.created_at * 1000).toLocaleDateString('pt-BR')));
  return result;
}
function spoiler(content, label = 'Contém spoilers — revelar conteúdo') {
  const details = el('details', undefined, 'spoiler-box'); details.append(el('summary', label), content); return details;
}
function reportControl(kind, targetId) {
  const details = el('details', undefined, 'report-form'); details.append(el('summary', 'Denunciar publicação'));
  const form = el('form', undefined, 'stack-form'); const textarea = el('textarea');
  textarea.id = `report-${kind}-${targetId}`; textarea.name = 'reason'; textarea.required = true; textarea.minLength = 5; textarea.maxLength = 500; textarea.rows = 3;
  const label = el('label', 'Motivo da denúncia'); label.htmlFor = textarea.id;
  const submit = el('button', 'Enviar denúncia', 'btn'); submit.type = 'submit'; form.append(label, textarea, submit);
  formAction(form, async data => { await api('reports', { method: 'POST', body: JSON.stringify({ kind, target_id: targetId, reason: data.get('reason') }) }); form.reset(); details.open = false; notice('Denúncia enviada para análise. Obrigado por ajudar a comunidade.'); });
  details.append(form); return details;
}
function publicationActions(record, kind) {
  const controls = el('div', undefined, 'publication-actions');
  if (!user) return controls;
  controls.append(reportControl(kind, record.id));
  if (user.id === record.user_id || user.admin) {
    const remove = el('button', 'Remover publicação', 'text-button'); remove.type = 'button';
    action(remove, async () => {
      if (!confirm('Remover esta publicação da comunidade?')) return;
      await api(`${kind === 'topic' ? 'topics' : 'replies'}/${record.id}`, { method: 'DELETE' });
      if (kind === 'topic') location.assign('forum.html'); else await loadReplies(true);
    }); controls.append(remove);
  }
  return controls;
}

// Account. The Google script is loaded only on the login page, after configuration is available.
async function accountPage() {
  $('#login-panel').hidden = !!user; $('#account-panel').hidden = !user;
  if (user) {
    $('#nickname').value = user.nickname; $('#account-id').textContent = user.accountId;
    formAction($('#nickname-form'), async data => {
      ({ user } = await api('profile', { method: 'PATCH', body: JSON.stringify({ nickname: data.get('nickname') }) })); notice('Apelido atualizado.');
    });
    action($('#logout'), async () => { await api('logout', { method: 'POST' }); location.assign('conta.html'); });
    action($('#copy-account-id'), async () => {
      try { await navigator.clipboard.writeText(user.accountId); notice('Identificador copiado.'); }
      catch { notice('Selecione e copie o identificador exibido acima.'); }
    });
    if (user.admin) { $('#admin-panel').hidden = false; setupAdmin(); await Promise.all([loadAdminMissions(true), loadReports()]); }
    return;
  }
  if (new URLSearchParams(location.search).has('erro')) notice('Não foi possível confirmar o acesso com Google. Tente entrar novamente.', true);
  const config = await api('config');
  if (!config.loginReady) { $('#google-login').replaceChildren(el('p', 'O acesso à comunidade está em preparação. Em breve você poderá entrar com sua conta Google.', 'muted')); return; }
  const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client?hl=pt-BR'; script.async = true;
  script.onerror = () => { $('#google-login').replaceChildren(el('p', 'Não foi possível carregar o acesso com Google. Atualize a página ou verifique os bloqueios do navegador.', 'muted')); };
  script.onload = () => {
    $('#google-login').replaceChildren();
    google.accounts.id.initialize({ client_id: config.clientId, nonce: config.nonce, ux_mode: 'redirect', login_uri: `${location.origin}/api/auth/google`, auto_select: false });
    google.accounts.id.renderButton($('#google-login'), { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR', width: Math.min(320, $('#google-login').clientWidth) });
  };
  document.head.append(script);
}

let topicsNext = null; let repliesNext = null; let activeTopic = null;
async function loadTopics(reset) {
  const container = $('#topics'); const params = new URLSearchParams(new FormData($('#topic-filter')));
  if (!params.get('category')) params.delete('category');
  if (!reset && topicsNext) params.set('before', topicsNext);
  const data = await api(`topics?${params}`);
  if (reset) container.replaceChildren();
  if (!data.items.length && reset) empty(container, data.ready === false ? 'A comunidade está em preparação. As conversas aparecerão aqui quando o acesso for liberado.' : 'Nenhuma conversa nesta categoria. Que tal iniciar a primeira?');
  for (const item of data.items) {
    const article = el('article', undefined, 'topic-row'); article.append(metadata(item, categories[item.category]));
    const title = el('h2'); title.append(link(item.title, `forum.html?topico=${item.id}`));
    article.append(item.spoiler ? spoiler(title, 'Tópico com spoilers — revelar título') : title); container.append(article);
  }
  topicsNext = data.next; $('#topics-more').hidden = !topicsNext;
}
async function loadReplies(reset) {
  const data = await api(`topics/${activeTopic}/replies${!reset && repliesNext ? `?after=${repliesNext}` : ''}`); const container = $('#replies');
  if (reset) container.replaceChildren();
  if (!data.items.length && reset) empty(container, 'Esta conversa ainda não tem respostas.');
  for (const item of data.items) {
    const article = el('article', undefined, 'reply-card'); article.append(metadata(item));
    const body = el('p', item.body, 'publication-body'); article.append(item.spoiler ? spoiler(body) : body, publicationActions(item, 'reply')); container.append(article);
  }
  repliesNext = data.next; $('#replies-more').hidden = !repliesNext;
}
async function forumPage() {
  const topicId = new URLSearchParams(location.search).get('topico');
  if (topicId) {
    if (!/^\d{1,12}$/.test(topicId)) throw new Error('Tópico não encontrado.');
    activeTopic = Number(topicId); $('#forum-list-view').hidden = true; $('#forum-topic-view').hidden = false;
    const { topic } = await api(`topics/${activeTopic}`);
    const article = el('article', undefined, 'surface'); article.append(metadata(topic, categories[topic.category]));
    const content = el('div'); content.append(el('h2', topic.title), el('p', topic.body, 'publication-body'));
    article.append(content, publicationActions(topic, 'topic')); $('#topic-detail').append(article);
    if (topic.spoiler) {
      const view = $('#forum-topic-view'); const conversation = el('div');
      [...view.children].slice(1).forEach(node => conversation.append(node));
      view.append(spoiler(conversation, 'Esta conversa contém spoilers — revelar tópico e respostas'));
    }
    await loadReplies(true); action($('#replies-more'), () => loadReplies(false));
    formAction($('#reply-form'), async data => {
      await api(`topics/${activeTopic}/replies`, { method: 'POST', body: JSON.stringify({ body: data.get('body'), spoiler: data.has('spoiler') }) });
      $('#reply-form').reset(); await loadReplies(true); notice('Resposta publicada. Se houver muitas respostas, use “Carregar mais respostas” para encontrá-la.');
    });
  } else {
    await loadTopics(true); action($('#topics-more'), () => loadTopics(false));
    formAction($('#topic-filter'), () => loadTopics(true));
    formAction($('#topic-form'), async data => {
      const record = await api('topics', { method: 'POST', body: JSON.stringify({ title: data.get('title'), category: data.get('category'), body: data.get('body'), spoiler: data.has('spoiler') }) });
      location.assign(`forum.html?topico=${record.id}`);
    });
  }
}

let missionsNext = null;
function progressText() { $('#mission-progress').textContent = `${completed.size} ${completed.size === 1 ? 'missão concluída' : 'missões concluídas'}. Seu progresso fica salvo na sua conta.`; }
function completionControl(missionId) {
  const label = el('label', undefined, 'check'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = completed.has(missionId);
  label.append(checkbox, el('span', 'Marcar como concluída'));
  checkbox.addEventListener('change', async () => {
    const wasComplete = completed.has(missionId); const desired = checkbox.checked; checkbox.disabled = true;
    try { await api(`progress/${missionId}`, { method: 'PUT', body: JSON.stringify({ completed: desired }) }); if (desired) completed.add(missionId); else completed.delete(missionId); progressText(); }
    catch (error) { checkbox.checked = wasComplete; notice(error.message, true); } finally { checkbox.disabled = false; }
  }); return label;
}
async function missionGuide(id, container, details) {
  try {
    const { mission } = await api(`missions/${id}`);
    const guide = el('div', undefined, 'mission-details');
    const facts = el('dl');
    for (const [key, value] of [['Personagem', characters[mission.character]], ['Região', mission.region], ['Recompensas', mission.rewards]]) {
      if (!value) continue; const row = el('div'); row.append(el('dt', key), el('dd', value)); facts.append(row);
    }
    guide.append(facts, el('h3', 'OBJETIVOS E GUIA'), el('p', mission.body, 'publication-body'));
    if (mission.source_url) { const source = link('Consultar fonte do guia ↗', mission.source_url, 'subtle-link'); source.target = '_blank'; source.rel = 'noopener noreferrer'; guide.append(source); }
    container.replaceChildren(guide); details.dataset.loaded = 'true';
  } catch (error) { container.replaceChildren(el('p', error.message, 'muted')); }
}
async function loadMissions(reset) {
  const params = new URLSearchParams(new FormData($('#mission-filter')));
  [...params].forEach(([key, value]) => { if (!value) params.delete(key); });
  if (!reset && missionsNext) params.set('before', missionsNext);
  const data = await api(`missions?${params}`); const container = $('#missions'); if (reset) container.replaceChildren();
  if (!data.items.length && reset) empty(container, params.size ? 'Nenhuma missão corresponde a esta busca.' : 'O catálogo está sendo preparado. As missões serão adicionadas com fontes e guias verificados.');
  for (const mission of data.items) {
    const card = el('article', undefined, 'mission-card');
    const content = el('div'); content.append(metadata({}, types[mission.type]), el('h2', mission.title), el('p', mission.summary, 'publication-body'));
    const details = el('details', undefined, 'spoiler-box'); const loading = el('div', undefined, 'mission-details');
    loading.append(el('p', 'Carregando guia…', 'muted')); details.append(el('summary', 'Ver objetivos e guia'), loading);
    details.addEventListener('toggle', async () => { if (details.open && !details.dataset.loaded && !details.dataset.loading) { details.dataset.loading = 'true'; await missionGuide(mission.id, loading, details); delete details.dataset.loading; } });
    content.append(details); if (user) content.append(completionControl(mission.id));
    card.append(mission.spoiler ? spoiler(content, 'Missão com spoilers — revelar detalhes') : content); container.append(card);
  }
  missionsNext = data.next; $('#missions-more').hidden = !missionsNext;
}
async function missionsPage() {
  if (user) { const progress = await api('progress'); progress.completed.forEach(id => completed.add(id)); progressText(); }
  await loadMissions(true); formAction($('#mission-filter'), () => loadMissions(true)); action($('#missions-more'), () => loadMissions(false));
}

let adminMissionsNext = null;
async function loadAdminMissions(reset) {
  const data = await api(`admin/missions${!reset && adminMissionsNext ? `?before=${adminMissionsNext}` : ''}`); const container = $('#admin-missions'); if (reset) container.replaceChildren();
  if (!data.items.length && reset) empty(container, 'Nenhuma missão cadastrada. Use o formulário para criar um rascunho.');
  for (const mission of data.items) {
    const article = el('article', undefined, 'admin-item'); article.append(el('h4', mission.title), el('p', mission.published ? 'Publicada' : 'Rascunho', 'muted'));
    const edit = el('button', 'Editar missão', 'btn'); edit.type = 'button';
    action(edit, async () => {
      const { mission: record } = await api(`admin/missions/${mission.id}`); const form = $('#mission-editor');
      for (const [key, value] of Object.entries(record)) { const input = form.elements.namedItem(key); if (!input) continue; if (input.type === 'checkbox') input.checked = !!value; else input.value = value; }
      form.closest('details').open = true; $('#mission-title').focus();
    }); article.append(edit); container.append(article);
  }
  adminMissionsNext = data.next; $('#admin-missions-more').hidden = !adminMissionsNext;
}
async function loadReports() {
  const data = await api('admin/reports'); const container = $('#admin-reports'); container.replaceChildren();
  if (!data.items.length) empty(container, 'Nenhuma denúncia pendente.');
  for (const report of data.items) {
    const article = el('article', undefined, 'admin-item'); article.append(el('h4', report.kind === 'topic' ? 'Denúncia de tópico' : 'Denúncia de resposta'), el('p', `Motivo: ${report.reason}`, 'publication-body'));
    if (report.title) article.append(el('p', report.title, 'publication-body')); article.append(el('p', report.body || 'Publicação indisponível.', 'publication-body'));
    const controls = el('div', undefined, 'form-actions');
    for (const [value, name] of [['resolve', 'Encerrar denúncia'], ['hide', 'Ocultar publicação'], ['block', 'Suspender autor']]) {
      const button = el('button', name, 'btn'); button.type = 'button';
      action(button, async () => { if (!confirm(`Confirmar: ${name.toLowerCase()}?`)) return; await api(`admin/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ action: value }) }); await loadReports(); notice('Denúncia analisada.'); }); controls.append(button);
    }
    article.append(controls); container.append(article);
  }
}
function setupAdmin() {
  const form = $('#mission-editor');
  formAction(form, async data => {
    const missionId = data.get('id'); const body = Object.fromEntries(data); delete body.id; body.spoiler = data.has('spoiler'); body.published = data.has('published');
    await api(`admin/missions${missionId ? `/${missionId}` : ''}`, { method: missionId ? 'PATCH' : 'POST', body: JSON.stringify(body) }); form.reset(); form.elements.id.value = ''; await loadAdminMissions(true); notice('Missão salva.');
  });
  form.addEventListener('reset', () => { form.elements.id.value = ''; });
  action($('#admin-missions-more'), () => loadAdminMissions(false)); action($('#refresh-reports'), loadReports);
}

try {
  ({ user } = await api('me')); memberVisibility();
  if (document.body.dataset.page === 'conta') await accountPage();
  if (document.body.dataset.page === 'forum') await forumPage();
  if (document.body.dataset.page === 'missoes') await missionsPage();
} catch (error) {
  notice(error.message, true);
  for (const selector of ['#topics', '#missions', '#google-login']) { const node = $(selector); if (node) empty(node, 'Não foi possível carregar esta área. Atualize a página para tentar novamente.'); }
}
