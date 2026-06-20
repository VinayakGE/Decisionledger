function normalizeWhitespace(text) {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function detectTitle() {
  const heading = document.querySelector("main h1");
  if (heading?.textContent?.trim()) return heading.textContent.trim();
  return document.title.replace(/\s*-\s*ChatGPT\s*$/i, "").trim() || "ChatGPT Capture";
}

function collectMessages() {
  const nodes = Array.from(document.querySelectorAll("[data-message-author-role]"));
  return nodes
    .map((node) => {
      const role = node.getAttribute("data-message-author-role") || "user";
      const content = normalizeWhitespace(node.innerText || "");
      if (!content) return null;
      return {
        role: role === "assistant" ? "assistant" : role === "system" ? "system" : "user",
        content,
      };
    })
    .filter(Boolean);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "COLLECT_CHATGPT_CONVERSATION") return undefined;

  try {
    const messages = collectMessages();
    if (!messages.length) {
      sendResponse({
        ok: false,
        error: "No ChatGPT messages were found on this page. Open a conversation first.",
      });
      return false;
    }

    sendResponse({
      ok: true,
      payload: {
        title: detectTitle(),
        source_url: window.location.href,
        captured_at: new Date().toISOString(),
        messages,
      },
    });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return false;
});
