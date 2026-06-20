const DEFAULT_BACKEND_URL = "http://localhost:8000";

const backendUrlInput = document.getElementById("backendUrl");
const captureButton = document.getElementById("captureButton");
const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#ff8f8f" : "#9da9b8";
}

async function loadBackendUrl() {
  const stored = await chrome.storage.sync.get(["decisionledgerBackendUrl"]);
  backendUrlInput.value = stored.decisionledgerBackendUrl || DEFAULT_BACKEND_URL;
}

async function saveBackendUrl(url) {
  await chrome.storage.sync.set({ decisionledgerBackendUrl: url });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function requestConversation(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: "COLLECT_CHATGPT_CONVERSATION" });
}

async function postCapture(baseUrl, payload) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/capture/chatgpt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { detail: raw };
    }
  }
  if (!response.ok) {
    throw new Error(data.detail || response.statusText || "Capture failed");
  }
  return data;
}

captureButton.addEventListener("click", async () => {
  captureButton.disabled = true;
  setStatus("Capturing current conversation…");

  try {
    const backendUrl = backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
    await saveBackendUrl(backendUrl);

    const tab = await getActiveTab();
    if (!tab?.id) throw new Error("No active tab found.");

    const result = await requestConversation(tab.id);
    if (!result?.ok) throw new Error(result?.error || "Could not read this ChatGPT conversation.");

    const capture = await postCapture(backendUrl, result.payload);
    setStatus(`Captured successfully. Source #${capture.source_id} is processing.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    captureButton.disabled = false;
  }
});

loadBackendUrl().catch(() => {
  backendUrlInput.value = DEFAULT_BACKEND_URL;
});
