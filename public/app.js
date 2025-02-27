function clearCode(codeString) {
  const codeWithoutMetadata = codeString.split("```html").pop().split("```")[0];
  return codeWithoutMetadata;
}

const modelSelect = document.querySelector("#input-container select");
let selectedModel = localStorage.getItem("selectedModel") || "";

let apiKey = localStorage.getItem("openai_api_key");
if (!apiKey) {
  apiKey = prompt("Please enter your OpenAI API key:");
  if(apiKey){
    localStorage.setItem("openai_api_key", apiKey);
  }
}

fetch("/models", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ openai_api_key: apiKey })
})
  .then((response) => response.json())
  .then((data) => {
    const models = data.data.filter(model => model.id.includes('gpt'));
    modelSelect.innerHTML = models
      .map((model) => `<option value="${model.id}"${selectedModel === model.id ? ' selected' : ''}>${model.id}</option>`)
      .join("");
    selectedModel = modelSelect.value; // Update the selected model with the current selection
    localStorage.setItem("selectedModel", selectedModel); // Store the selected model in localStorage

    modelSelect.addEventListener("change", (event) => {
      selectedModel = event.target.value;
      localStorage.setItem("selectedModel", selectedModel); // Update the stored selected model when it changes
    });
  })
  .catch((error) => console.error("Error fetching models:", error));
  
document.getElementById("submit-button").addEventListener("click", function () {
  let apiKey = localStorage.getItem("openai_api_key");
  if (!apiKey) {
    apiKey = prompt("Please enter your OpenAI API key:");
    if(apiKey){
      localStorage.setItem("openai_api_key", apiKey);
    }
  }
  const message = document.getElementById("input-text").value;
  const submitButton = document.getElementById("submit-button");
  const characterCountSpan = document.getElementById("character-count");
  let streamedCharacters = 0;
  submitButton.disabled = true;
  submitButton.textContent = "Loading...";
  fetch("/generate-completion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      openai_api_key: apiKey,
      message: message,
      model: selectedModel,
    }),
  }).then((response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const appIframe = document.getElementById("app");
    const sourceCodeElement = document.querySelector("#source-code code");
    let generatedCode = "";

    function read() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            submitButton.disabled = false;
            submitButton.textContent = "Submit";
            localStorage.setItem("latest_code_generation", generatedCode);
            return;
          }
          let chunk = decoder.decode(value, { stream: true });
          streamedCharacters += chunk.length;
          characterCountSpan.textContent = `Characters streamed: ${streamedCharacters}`;
          generatedCode += chunk;

          const clearedCode = clearCode(generatedCode);
          appIframe.srcdoc = clearedCode;
          sourceCodeElement.textContent = clearedCode;
          sourceCodeElement.dataset.highlighted = "";
          hljs.highlightElement(sourceCodeElement);
          read();
        })
        .catch((error) => {
          console.error("Error:", error);
          submitButton.disabled = false;
          submitButton.textContent = "Submit";
        });
    }

    read();
  });
});


