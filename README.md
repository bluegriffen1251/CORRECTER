Markdown
# Correcter ✨

A high-performance, dual-engine Chrome extension built for seamless grammar correction, featuring a modern dark-mode Glassmorphism UI and a hybrid architecture supporting both Cloud AI (Gemini API) and offline rule-based processing.

---

## 🚀 Features

* **Hybrid Processing Architecture**: Toggle instantly between **AI Cloud Mode** (powered by Gemini Flash) for deep contextual error correction and **Offline Local Mode** (zero-latency regex heuristics) for quota-free operation.
* **Modern Glassmorphic UI**: Sleek, macOS-inspired frosted glass design featuring live status indicators, smooth transition feedback, and intuitive segmented mode-switching controls.
* **Defensive Error Handling**: Built with robust runtime checks to prevent common extension errors like `"Extension context invalidated"`.
* **Smart Debouncing**: Configurable input latency timers to optimize performance and prevent rapid-fire API call bottlenecks.

---

## 📂 Project Structure

```text
correcter/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker handling API requests & local rules
├── content.js          # DOM observer, text injector, and debounce logic
├── popup.html          # Extension popup dashboard layout
├── popup.css           # Glassmorphism styling and UI components
└── popup.js            # Popup state management and user preference sync
🛠️ Installation & Local Setup
Clone the repository:

Bash
git clone [https://github.com/your-username/correcter.git](https://github.com/your-username/correcter.git)
cd correcter
Configure your API Key:
Open background.js and add your Google AI Studio API key into the API_KEY variable:

JavaScript
const API_KEY = "YOUR_GEMINI_API_KEY_HERE";
Load into Google Chrome:

Open Chrome and navigate to chrome://extensions/.

Enable Developer mode using the toggle in the top-right corner.

Click Load unpacked in the top-left corner.

Select your local correcter project directory.

⚙️ Configuration & Usage
Master Toggle: Click the extension icon in your toolbar to open the dashboard popup. Use the primary toggle to turn real-time checking on or off instantly.

Engine Switcher: Switch between AI Cloud and Offline mode dynamically via the segmented pill toggle inside the popup menu. Preferences are saved automatically using chrome.storage.sync.
