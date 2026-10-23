export function bindAssistant({ t, esc, modelId }) {
  const form = document.querySelector('#assistantForm');
  if (!form || form.dataset.bound === 'true') return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.querySelector('#assistantInput');
    const text = input?.value?.trim() || '';
    if (!text) return;
    const box = document.querySelector('#assistantMessages');
    if (!box) return;
    box.insertAdjacentHTML('beforeend', `<div class="chat-bubble user">${esc(text)}</div>`);
    if (input) input.value = '';
    box.insertAdjacentHTML('beforeend', `<div class="chat-bubble ai" id="thinking">${esc(t('assistant.thinking'))}</div>`);
    box.scrollTop = box.scrollHeight;
    try {
      const result = await miniappsAI.callModel({
        modelId,
        messages: [
          { role: 'system', content: 'أنت مساعد تشغيلي عربي داخل نظام الفرسان ((قافطــ)) لإدارة أمن المواقع. أجب باختصار وبشكل عملي، ولا تخترع بيانات غير موجودة.' },
          { role: 'user', content: text },
        ],
        timeoutMs: 30000,
      });
      const answer = miniappsAI.extractText(result) || t('assistant.error');
      const thinking = document.querySelector('#thinking');
      if (thinking) thinking.textContent = answer;
    } catch {
      const thinking = document.querySelector('#thinking');
      if (thinking) thinking.textContent = t('assistant.error');
    }
    box.scrollTop = box.scrollHeight;
  });
}
