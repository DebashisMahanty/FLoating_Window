const apiKeyInput = document.getElementById("api-key");
const saveButton = document.getElementById("save-key");
const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#fca5a5" : "#22c55e";
}

async function loadKey() {
  const result = await chrome.storage.sync.get(["openaiApiKey"]);
  if (result.openaiApiKey) {
    apiKeyInput.value = result.openaiApiKey;
  }
}

saveButton.addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setStatus("Please enter a valid API key.", true);
    return;
  }
  await chrome.storage.sync.set({ openaiApiKey: key });
  setStatus("API key saved.");
});

loadKey().catch(() => setStatus("Failed to load API key.", true));
