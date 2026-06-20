# Decisionledger Browser Extension

Minimal Chrome extension for Phase 1 capture.

## Load locally

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `/home/runner/work/Decisionledger/Decisionledger/browser-extension`

## Use it

1. Open a ChatGPT conversation on `chatgpt.com`
2. Click the **Decisionledger Capture** extension
3. Confirm the backend URL (default: `http://localhost:8000`)
4. Click **Capture Current Chat**

The extension sends structured conversation payloads to `POST /capture/chatgpt`, which reuses the existing extraction and persistence pipeline.
