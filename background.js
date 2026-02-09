const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_ANSWER") {
    generateAnswer(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({ ok: false, error: error.message || "Request failed" })
      );
    return true;
  }
  if (message.type === "OPEN_SETTINGS") {
    const url = chrome.runtime.getURL("popup.html");
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});

async function getApiKey() {
  const result = await chrome.storage.sync.get(["openaiApiKey"]);
  return result.openaiApiKey;
}

async function generateAnswer({ transcript }) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("Missing OpenAI API key. Add it in the extension settings.");
  }

  const prompt = `You are an interview assistant. Provide concise bullet point suggestions that answer the interview question.\nQuestion: ${transcript}`;

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: "You are a helpful interview copilot." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "OpenAI request failed");
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error("No response from OpenAI.");
  }

  return message;
}
