// tracing script.js
// Adds detailed console logging for submit lifecycle to help debug flicker/reload issues

document.addEventListener('DOMContentLoaded', () => {
  const generateForm = document.getElementById('generate-form');
  const generateBtn = document.getElementById('generateBtn');
  const usernameInput = document.getElementById('username');
  const apiNameInput = document.getElementById('apiName');
  const statusEl = document.getElementById('status');

  const resultContainer = document.getElementById('result-container');
  const resId = document.getElementById('res-id');
  const resUsername = document.getElementById('res-username');
  const resApiName = document.getElementById('res-apiName');
  const resApiKey = document.getElementById('res-apiKey');
  const resApiSecret = document.getElementById('res-apiSecret');
  const resCreatedAt = document.getElementById('res-createdAt');

  if (!generateForm) {
    console.error('Form #generate-form not found');
    return;
  }

  function generateDummyCredentials(username, apiName) {
    const id = 'id-' + Math.random().toString(36).slice(2, 10);
    const apiKey = Math.random().toString(36).slice(2, 18);
    const apiSecret = btoa(Math.random().toString(36).slice(2, 22));
    return {
      id,
      username,
      apiName,
      apiKey,
      apiSecret,
      createdAt: new Date().toISOString()
    };
  }

  // helper to safely preview JSON for logs
  function preview(obj, maxLen = 400) {
    try {
      const s = JSON.stringify(obj);
      return s.length > maxLen ? s.slice(0, maxLen) + '...'( ) : s; // intentional short preview
    } catch (e) {
      return String(obj);
    }
  }

  let submitCounter = 0;

  async function onSubmit(event) {
    const submitId = ++submitCounter;
    console.log(`[submit:${submitId}] submit event received`);

    // prevent the browser from submitting the form and reloading
    event.preventDefault();
    event.stopPropagation();

    const username = usernameInput.value.trim();
    const apiName = apiNameInput.value.trim();

    console.log(`[submit:${submitId}] inputs: username="${username}", apiName="${apiName}"`);

    statusEl.textContent = 'Generating... 🚀';
    generateBtn.disabled = true;

    let data = null;

    try {
      console.log(`[submit:${submitId}] attempting fetch to backend /api/keys`);
      const response = await fetch('http://localhost:3000/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name: apiName })  // Changed: use 'name' field for /api/keys endpoint
      });

      console.log(`[submit:${submitId}] fetch completed, status=${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error (${response.status}): ${errorText}`);
      }

      data = await response.json();
      console.log(`[submit:${submitId}] received backend response:`, data);

      // Normalize response: ensure apiName and apiSecret are set
      if (data.data) {
        data = {
          ...data.data,
          apiName: data.data.name,  // Backend uses 'name', UI expects 'apiName'
          apiSecret: data.data.secret || 'N/A',  // Placeholder if not in response
        };
      }
      console.log(`[submit:${submitId}] normalized data:`, data);

    } catch (err) {
      console.error(`[submit:${submitId}] fetch failed (no fallback):`, err);
      statusEl.textContent = `Error: ${err.message}`;
      generateBtn.disabled = false;
      return;  // Exit early on error — no fallback
    }

    // update UI 
    try {
      console.log(`[submit:${submitId}] updating UI with data`);
      statusEl.textContent = '';
      resId.textContent = data.id || '';
      resUsername.textContent = data.username || '';
      resApiName.textContent = data.apiName || '';
      resApiKey.textContent = data.apiKey || data.key || '';
      resApiSecret.textContent = data.apiSecret || '';
      resCreatedAt.textContent = data.createdAt ? new Date(data.createdAt).toLocaleString('id-ID') : '';

      resultContainer.style.display = 'block';
      resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

      console.log(`[submit:${submitId}] UI updated and result visible`);

    } catch (err) {
      console.error(`[submit:${submitId}] Error updating UI:`, err);
      statusEl.textContent = 'Terjadi kesalahan saat menampilkan hasil.';
    } finally {
      generateBtn.disabled = false;
      console.log(`[submit:${submitId}] submit handler finished`);
    }
  }

  generateForm.addEventListener('submit', onSubmit);

  // Use event delegation so copy buttons always work
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy');
    if (!btn) return;
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;
    const el = document.getElementById(targetId);
    const textToCopy = el ? el.textContent : '';
    if (!textToCopy) return;

    console.log('copy button clicked, target=', targetId, 'value=', textToCopy);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Tersalin!';
        setTimeout(() => btn.textContent = original, 2000);
      }).catch(err => {
        console.error('Gagal menyalin:', err);
      });
    } else {
      // older fallback
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        const original = btn.textContent;
        btn.textContent = 'Tersalin!';
        setTimeout(() => btn.textContent = original, 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(ta);
    }
  });

});
