// ==========================================
// 1. DEBOUNCE FUNCTION
// ==========================================
function debounce(func, delay = 400) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// ==========================================
// 2. VISUAL FEEDBACK (Glassmorphic Error Box & Sleek Buttons)
// ==========================================
function highlightErrors(targetElement, issues) {
  const existingBox = document.getElementById('correcter-error-box');
  if (existingBox) existingBox.remove();

  if (!issues || issues.length === 0) {
    targetElement.style.border = '';
    return;
  }

  // Normalize current text and filter out issues that no longer exist
  const currentText = targetElement.value || targetElement.innerText || '';
  const validIssues = issues.map(issue => {
    const idx = findIssueIndex(currentText, issue);
    if (idx === -1) return null;
    return Object.assign({}, issue, { offset: idx, length: issue.length || (issue.mistake ? String(issue.mistake).length : 0) });
  }).filter(i => i !== null);

  if (validIssues.length === 0) {
    targetElement.style.border = '';
    return;
  }

  // Modern accent border for target element
  targetElement.style.border = '2px solid #ef4444';

  const rect = targetElement.getBoundingClientRect();
  const errorBox = document.createElement('div');
  errorBox.id = 'correcter-error-box';

  // Floating Glassmorphism Container Styling (refined)
  errorBox.style.cssText = `
    position: absolute;
    top: ${rect.bottom + window.scrollY + 8}px;
    left: ${rect.left + window.scrollX}px;
    background: rgba(2,6,23,0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 8px 28px rgba(2,6,23,0.6);
    color: #e6eef8;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 260px;
    max-width: 420px;
    line-height: 1.4;
  `;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.title = 'Close';
  closeBtn.style.cssText = 'position:absolute; right:8px; top:6px; background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:14px;';
  closeBtn.addEventListener('click', () => { errorBox.remove(); targetElement.style.border = ''; });
  errorBox.appendChild(closeBtn);

  validIssues.forEach(issue => {
    // 1. Calculate the mistake word (prefer explicit `mistake` if provided)
    const text = targetElement.value || targetElement.innerText || '';
    const errorWord = (issue.mistake && String(issue.mistake)) || text.substring(issue.offset, issue.offset + issue.length) || '';
    
    // 2. Container for individual error item
    const mistakeLine = document.createElement('div');
    mistakeLine.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    `;

    mistakeLine.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <span style="color: #ff7b7b; font-weight: 700;">❌ ${escapeHtml(errorWord)}</span>
      </div>
      <div style="color: #9aa9bb; font-size: 12px; font-style: italic;">${escapeHtml(issue.message)}</div>
    `;
    
    // 3. Sleek Interactive Button Creation (show multiple suggestions)
    if (issue.replacements && issue.replacements.length > 0) {
      const suggestionsContainer = document.createElement('div');
      suggestionsContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;';

      issue.replacements.forEach((rep, idx) => {
        const suggestion = rep && rep.value ? rep.value : '';
        if (!suggestion) return;

        const btn = document.createElement('button');
        btn.textContent = idx === 0 ? `💡 Best: ${suggestion}` : `✳️ Alt: ${suggestion}`;
        btn.style.cssText = `
          background: ${idx === 0 ? 'linear-gradient(90deg,#06b6d4,#7c3aed)' : 'rgba(255,255,255,0.04)'};
          color: ${idx === 0 ? 'white' : '#cde6ff'};
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          transition: transform 0.12s ease, filter 0.12s ease;
        `;

        btn.onmouseover = () => { btn.style.transform = 'translateY(-2px)'; btn.style.filter = 'brightness(1.02)'; };
        btn.onmouseout = () => { btn.style.transform = 'translateY(0)'; btn.style.filter = 'none'; };

        btn.addEventListener('click', () => {
          applyReplacement(targetElement, issue, suggestion);
          errorBox.remove();
        });

        suggestionsContainer.appendChild(btn);
      });

      mistakeLine.appendChild(suggestionsContainer);
    } else {
      mistakeLine.innerHTML += '<span style="color: #64748b; font-size: 11px;">No auto-suggestion available</span>';
    }
    
    errorBox.appendChild(mistakeLine);
  });

  document.body.appendChild(errorBox);
}

// Utility: escape HTML for safe insertion
function escapeHtml(s) {
  return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// Apply replacement robustly (handles inputs, textareas and contentEditable)
function applyReplacement(targetElement, issue, suggestion) {
  const isInputLike = targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT';
  let currentText = targetElement.value || targetElement.innerText || '';

  const original = (issue.mistake && String(issue.mistake)) || currentText.substring(issue.offset || 0, (issue.offset || 0) + (issue.length || 0));

  // Try to locate the original text near the provided offset
  let foundIndex = -1;
  if (original) {
    try {
      foundIndex = currentText.toLowerCase().indexOf(original.toLowerCase(), Math.max(0, issue.offset || 0));
    } catch (e) {
      foundIndex = -1;
    }
  }

  // If not found at offset, search within a small window around the offset
  if (foundIndex === -1 && typeof issue.offset === 'number') {
    const start = Math.max(0, (issue.offset || 0) - 60);
    const end = Math.min(currentText.length, (issue.offset || 0) + 60 + (issue.length || 0));
    const windowText = currentText.substring(start, end);
    if (original) {
      const localIndex = windowText.toLowerCase().indexOf(original.toLowerCase());
      if (localIndex !== -1) foundIndex = start + localIndex;
    }
  }

  // If still not found, try a best-effort fuzzy match: find the first occurrence of the first 3 chars
  if (foundIndex === -1 && original && original.length >= 3) {
    const token = original.substring(0, 3).toLowerCase();
    const idx = currentText.toLowerCase().indexOf(token);
    if (idx !== -1) foundIndex = idx;
  }

  // Final fallback to provided offset
  if (foundIndex === -1 && typeof issue.offset === 'number') {
    foundIndex = Math.max(0, Math.min(currentText.length, issue.offset));
  }

  // Build new text
  const before = currentText.substring(0, foundIndex);
  const after = currentText.substring(foundIndex + (issue.length || original.length || 0));
  const newText = before + suggestion + after;

  if (isInputLike) {
    targetElement.value = newText;
    // place caret after inserted suggestion
    const caretPos = foundIndex + suggestion.length;
    try {
      targetElement.setSelectionRange(caretPos, caretPos);
    } catch (e) {}
    targetElement.focus();
  } else {
    // For contentEditable, replace innerText and try to focus at end of replacement
    targetElement.innerText = newText;
    targetElement.focus();
    // move caret to after replacement
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const range = document.createRange();
      if (targetElement.childNodes.length > 0) {
        const node = targetElement.childNodes[0];
        const pos = Math.min(node.textContent.length, foundIndex + suggestion.length);
        range.setStart(node, pos);
      } else {
        range.setStart(targetElement, 0);
      }
      range.collapse(true);
      sel.addRange(range);
    }
  }

  // Notify input observers
  targetElement.dispatchEvent(new Event('input', { bubbles: true }));
  // clear visual border
  targetElement.style.border = '';
}

// Robust finder used to verify whether an issue still exists in the text
function findIssueIndex(currentText, issue) {
  const original = (issue.mistake && String(issue.mistake)) || (typeof issue.offset === 'number' ? currentText.substring(issue.offset, (issue.offset || 0) + (issue.length || 0)) : '');
  if (!original) return -1;

  // Try exact match at offset
  if (typeof issue.offset === 'number') {
    const atOffset = currentText.substring(issue.offset, issue.offset + (issue.length || original.length));
    if (atOffset && atOffset.toLowerCase() === original.toLowerCase()) return issue.offset;
  }

  // Search from offset forward
  let idx = currentText.toLowerCase().indexOf(original.toLowerCase(), Math.max(0, issue.offset || 0));
  if (idx !== -1) return idx;

  // Search nearby window
  if (typeof issue.offset === 'number') {
    const start = Math.max(0, (issue.offset || 0) - 60);
    const end = Math.min(currentText.length, (issue.offset || 0) + 60 + (issue.length || original.length));
    const windowText = currentText.substring(start, end);
    const localIndex = windowText.toLowerCase().indexOf(original.toLowerCase());
    if (localIndex !== -1) return start + localIndex;
  }

  // Fallback: find first occurrence of first few chars
  if (original.length >= 3) {
    const token = original.substring(0, 3).toLowerCase();
    const tIdx = currentText.toLowerCase().indexOf(token);
    if (tIdx !== -1) return tIdx;
  }

  return -1;
}

// ==========================================
// 3. INPUT EVENT LISTENER WITH API LOGIC & SAFEGUARDS
// ==========================================
const handleInput = debounce((event) => {
  const target = event.target;
  const isTextarea = target.tagName === 'TEXTAREA';
  const isInput = target.tagName === 'INPUT';
  const isContentEditable = target.isContentEditable;

  if (!isTextarea && !isInput && !isContentEditable) {
    return;
  }

  const text = target.value || target.innerText || '';
  
  if (text.trim().length === 0) {
    target.style.border = '';
    return;
  }

  // Safety check: ensure extension context & storage are active
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    console.warn("[Correcter] Extension context reloaded. Please refresh the web page.");
    return;
  }

  // Check if extension is toggled ON before calling API
  chrome.storage.local.get({ enabled: true }, (items) => {
    if (!items.enabled) return;

    if (!chrome.runtime || !chrome.runtime.sendMessage) return;

    chrome.runtime.sendMessage(
      { action: "checkGrammar", text: text },
      (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.success) {
          highlightErrors(target, response.issues);
        }
      }
    );
  });
});

// ==========================================
// 4. ATTACH THE INSTANT-CLEAR EVENT LISTENER 
// ==========================================
document.addEventListener("input", (event) => {
  // Instantly remove the box and border when typing starts
  const existingBox = document.getElementById('correcter-error-box');
  if (existingBox) existingBox.remove();
  
  if (event.target.style) {
    event.target.style.border = '';
  }

  // Start the 1-second delay for the API check
  handleInput(event);
});