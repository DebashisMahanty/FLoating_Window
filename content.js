const WIDGET_ID = "ai-interview-copilot";

if (!document.getElementById(WIDGET_ID)) {
  const widget = document.createElement("div");
  widget.id = WIDGET_ID;
  widget.innerHTML = `
    <div class="header">
      <span>AI Interview Copilot</span>
      <span class="status" data-status>Idle</span>
    </div>
    <div class="content">
      <div class="controls">
        <button class="mic-on" data-mic-on>Mic ON</button>
        <button class="mic-off" data-mic-off>Mic OFF</button>
      </div>
      <div>
        <div class="label">Live Transcript</div>
        <div class="panel" data-transcript>Waiting for input...</div>
      </div>
      <button class="generate" data-generate>Generate Answer</button>
      <div>
        <div class="label">Suggested Answer</div>
        <div class="panel" data-answer>Suggestions will appear here.</div>
      </div>
      <div class="error" data-error></div>
      <div class="footer">
        <span>Drag header to move</span>
        <button class="link-button" data-open-settings>API Settings</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(widget);

  const transcriptEl = widget.querySelector("[data-transcript]");
  const answerEl = widget.querySelector("[data-answer]");
  const errorEl = widget.querySelector("[data-error]");
  const statusEl = widget.querySelector("[data-status]");
  const micOnBtn = widget.querySelector("[data-mic-on]");
  const micOffBtn = widget.querySelector("[data-mic-off]");
  const generateBtn = widget.querySelector("[data-generate]");
  const openSettingsBtn = widget.querySelector("[data-open-settings]");
  const header = widget.querySelector(".header");

  let recognition = null;
  let listening = false;
  let finalTranscript = "";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setError("Web Speech API is not supported in this browser.");
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setError(message) {
    errorEl.textContent = message;
  }

  function clearError() {
    errorEl.textContent = "";
  }

  function updateTranscript(text) {
    transcriptEl.textContent = text || "Waiting for input...";
  }

  function updateAnswer(text) {
    answerEl.textContent = text || "Suggestions will appear here.";
  }

  function initRecognition() {
    if (!SpeechRecognition) {
      return null;
    }
    const instance = new SpeechRecognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = "en-US";
    instance.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += `${result[0].transcript.trim()} `;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      updateTranscript(`${finalTranscript}${interimTranscript}`.trim());
    };
    instance.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setStatus("Error");
    };
    instance.onend = () => {
      if (listening) {
        instance.start();
      }
    };
    return instance;
  }

  function startListening() {
    clearError();
    if (!SpeechRecognition) {
      return;
    }
    if (!recognition) {
      recognition = initRecognition();
    }
    if (!recognition) {
      return;
    }
    if (listening) {
      return;
    }
    finalTranscript = "";
    updateTranscript("");
    try {
      recognition.start();
      listening = true;
      setStatus("Listening");
    } catch (error) {
      setError("Microphone permission is required to start listening.");
      setStatus("Idle");
    }
  }

  function stopListening() {
    if (recognition && listening) {
      recognition.stop();
    }
    listening = false;
    setStatus("Idle");
  }

  micOnBtn.addEventListener("click", () => {
    startListening();
  });

  micOffBtn.addEventListener("click", () => {
    stopListening();
  });

  generateBtn.addEventListener("click", async () => {
    clearError();
    const transcript = transcriptEl.textContent.trim();
    if (!transcript || transcript === "Waiting for input...") {
      setError("Add a transcript before generating an answer.");
      return;
    }
    updateAnswer("Generating...");
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GENERATE_ANSWER",
        payload: { transcript }
      });
      if (!response || !response.ok) {
        throw new Error(response?.error || "Failed to generate answer.");
      }
      updateAnswer(response.data);
    } catch (error) {
      setError(error.message || "Network error while generating answer.");
      updateAnswer("");
    }
  });

  openSettingsBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_SETTINGS" });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "OPEN_SETTINGS_TAB") {
      window.open(message.payload.url, "_blank");
    }
  });

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  header.addEventListener("mousedown", (event) => {
    isDragging = true;
    const rect = widget.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) {
      return;
    }
    widget.style.left = `${event.clientX - dragOffsetX}px`;
    widget.style.top = `${event.clientY - dragOffsetY}px`;
    widget.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = "";
    }
  });
}
