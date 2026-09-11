chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkGrammar") {
    // Check which engine the user preferred in settings
    chrome.storage.local.get({ engine: "ai", apiKey: "" }, async (items) => {
      try {
        let matches = [];
        
          if (items.engine === "local") {
          // Fast local offline heuristic check (zero API usage / quota-free)
          matches = checkTextLocally(request.text);
          } else if (items.engine === "google") {
            // Use LanguageTool public API
            matches = await checkTextWithLanguageTool(request.text);
          } else {
            // Cloud AI Check (Gemini). API key is read from storage (user-provided)
            matches = await checkTextWithGemini(request.text, items.apiKey);
        }

        sendResponse({ success: true, issues: matches });
      } catch (error) {
        console.error("[Correcter] Processing Error:", error);
        sendResponse({ success: false, error: error.message });
      }
    });

    return true; // Keep message channel open for async response
  }
});

// Simple instant offline pattern matching engine
function checkTextLocally(text) {
  const issues = [];
  
  // Example offline rule checks (can be expanded easily)
  const commonMistakes = [
    { target: /\bi\b/g, correction: "I", message: "Pronoun 'i' should be capitalized." },
    { target: /\bteh\b/gi, correction: "the", message: "Common typo for 'the'." },
    { target: /\bcant\b/gi, correction: "can't", message: "Missing apostrophe in contraction." },
    { target: /\bseperate\b/gi, correction: "separate", message: "Common spelling mistake." }
  ];

  commonMistakes.forEach(rule => {
    let match;
    while ((match = rule.target.exec(text)) !== null) {
      issues.push({
        offset: match.index,
        length: match[0].length,
        message: rule.message,
        replacements: [{ value: rule.correction }]
      });
    }
  });

  return issues;
}

// LanguageTool public API integration (no API key required for basic usage)
async function checkTextWithLanguageTool(text) {
  const url = 'https://api.languagetool.org/v2/check';

  const form = new URLSearchParams();
  form.append('text', text);
  form.append('language', 'en-US');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });

  if (!response.ok) {
    let errBody = null;
    try { errBody = await response.json(); } catch (e) { /* ignore */ }
    const errMsg = errBody && errBody.message ? errBody.message : response.statusText;
    throw new Error(`LanguageTool API Error: ${response.status} ${errMsg}`);
  }

  const data = await response.json();

  if (!data.matches) return [];

  return data.matches.map(m => {
    const replacements = (m.replacements || []).map(r => ({ value: r.value }));
    const mistakeText = text.substring(m.offset, m.offset + m.length);
    return {
      offset: m.offset,
      length: m.length,
      mistake: mistakeText,
      message: m.message || (m.rule && m.rule.description) || 'Possible issue',
      replacements: replacements
    };
  });
}

async function checkTextWithGemini(text, apiKey) {
  if (!apiKey) {
    throw new Error("Missing API key for Gemini AI. Please set an API key in extension settings.");
  }

  // Clean URL without the query parameter
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;

  const prompt = `You are an expert grammar and spelling checker. Analyze this text: "${text}"
  Return ONLY a JSON array of errors. Do not use markdown blocks. Just the raw array.
  Format: [{"mistake": "the wrong word", "correction": "the right word", "message": "Why it's wrong"}]
  If there are absolutely no errors, return [].`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    })
  });

    // Check HTTP-level errors
  if (!response.ok) {
    let errBody = null;
    try { errBody = await response.json(); } catch (e) { /* ignore */ }
    const errMsg = errBody && errBody.error && errBody.error.message ? errBody.error.message : response.statusText;
    throw new Error(`API Error: ${response.status} ${errMsg}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`API Error: ${data.error.message}`);
  }

  if (!data.candidates || !data.candidates[0]) {
    throw new Error("API Limit reached or unexpected response.");
  }

  let aiText = data.candidates[0].content.parts[0].text.trim();

  if (aiText.startsWith("```")) {
    aiText = aiText.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(aiText);
  } catch (err) {
    throw new Error("Invalid JSON returned from AI: " + err.message + " - Response snippet: " + aiText.slice(0, 200));
  }

  return parsed.map(err => {
    const lowerText = text.toLowerCase();
    const offset = lowerText.indexOf(err.mistake.toLowerCase());

    if (offset === -1) return null;

    // Support multiple suggested replacements if present
    const replacements = [];
    if (err.correction) replacements.push({ value: err.correction });
    if (Array.isArray(err.alternatives)) err.alternatives.forEach(a => replacements.push({ value: a }));
    if (Array.isArray(err.corrections)) err.corrections.forEach(a => replacements.push({ value: a }));

    return {
      offset: offset,
      length: err.mistake.length,
      mistake: err.mistake,
      message: err.message,
      replacements: replacements
    };
  }).filter(issue => issue !== null);
}

// Inject content script into existing tabs on install so users don't need to refresh
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (!tab.id || !tab.url) return;
        if (!tab.url.startsWith('http')) return;
        try {
          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: ['content.js']
          });
        } catch (e) {
          // ignore injection errors for tabs where scripts can't be injected
        }
      });
    });
  } catch (e) {
    // ignore
  }
});