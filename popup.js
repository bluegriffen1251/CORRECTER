document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const statusBadge = document.getElementById("statusBadge");
  const statusText = document.getElementById("statusText");
  const segmentButtons = document.querySelectorAll(".segment-btn");
  const engineFooterText = document.getElementById("engineFooterText");

  // 1. Load saved states from storage
  chrome.storage.local.get({ enabled: true, engine: "ai", apiKey: "" }, (items) => {
    const isEnabled = items.enabled !== false;
    if (toggle) toggle.checked = isEnabled;
    updateStatusUI(isEnabled);
    setActiveEngineUI(items.engine);

    // Populate API key field if present
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) apiKeyInput.value = items.apiKey || '';
  });

  // 2. Handle master toggle change
  if (toggle) {
    toggle.addEventListener("change", (event) => {
      const isEnabled = event.target.checked;
      chrome.storage.local.set({ enabled: isEnabled }, () => {
        updateStatusUI(isEnabled);
      });
    });
  }

  // 3. Handle Engine mode selection (AI vs Local)
  segmentButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const selectedEngine = e.target.getAttribute("data-engine");
      
      segmentButtons.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      chrome.storage.local.set({ engine: selectedEngine }, () => {
        setActiveEngineUI(selectedEngine);
      });
    });
  });

  function updateStatusUI(enabled) {
    if (!statusBadge || !statusText) return;
    if (enabled) {
      statusBadge.classList.remove("disabled");
      statusText.textContent = "Active";
    } else {
      statusBadge.classList.add("disabled");
      statusText.textContent = "Paused";
    }
  }

  function setActiveEngineUI(engine) {
    segmentButtons.forEach(b => {
      if (b.getAttribute("data-engine") === engine) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

    if (engine === "ai") {
      engineFooterText.textContent = "Powered by Gemini AI Engine";
    } else if (engine === "google") {
      engineFooterText.textContent = "Using LanguageTool public API";
    } else {
      engineFooterText.textContent = "Running Offline (Local Mode)";
    }
  }

  // API key save/clear handlers
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
  const apiHelpLink = document.getElementById('apiHelpLink');

  if (saveApiKeyBtn && apiKeyInput) {
    saveApiKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      chrome.storage.local.set({ apiKey: key }, () => {
        saveApiKeyBtn.textContent = 'Saved';
        setTimeout(() => (saveApiKeyBtn.textContent = 'Save'), 1200);
      });
    });
  }

  if (clearApiKeyBtn) {
    clearApiKeyBtn.addEventListener('click', () => {
      chrome.storage.local.set({ apiKey: '' }, () => {
        if (apiKeyInput) apiKeyInput.value = '';
        clearApiKeyBtn.textContent = 'Cleared';
        setTimeout(() => (clearApiKeyBtn.textContent = 'Clear'), 1200);
      });
    });
  }

  if (apiHelpLink) {
    apiHelpLink.addEventListener('click', (e) => {
      e.preventDefault();
      const url = 'https://cloud.google.com/docs/authentication/api-keys';
      if (chrome && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
    });
  }
});