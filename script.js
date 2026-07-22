/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

// State
let allProducts = [];
const selectedProductIds = new Set();

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const idx = allProducts.findIndex((p) => p.id === product.id);
      const isSelected = selectedProductIds.has(product.id);
      const selectedClass = isSelected ? " selected" : "";
      return `
    <div class="product-card${selectedClass}" data-id="${product.id}" data-index="${idx}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <button class="info-btn" aria-label="Show description for ${product.name}">i</button>
      <div class="desc-overlay" role="tooltip">${product.description}</div>
    </div>
  `;
    })
    .join("");

  // Attach click handlers to toggle selection
  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    // Clicking the card (not the info button) toggles selection
    card.addEventListener("click", (e) => {
      const isInfo = e.target.closest(".info-btn");
      if (isInfo) return; // info button handles description
      const id = Number(card.dataset.id);
      toggleProductSelection(id);
    });

    // Info button toggles description overlay (useful on mobile)
    const infoBtn = card.querySelector(".info-btn");
    const desc = card.querySelector(".desc-overlay");
    if (infoBtn && desc) {
      infoBtn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        card.classList.toggle("show-desc");
        // If showing, focus the desc for accessibility
        if (card.classList.contains("show-desc")) {
          desc.setAttribute("tabindex", "-1");
          desc.focus();
        }
      });
    }
  });
}

function toggleProductSelection(id) {
  if (selectedProductIds.has(id)) {
    selectedProductIds.delete(id);
  } else {
    selectedProductIds.add(id);
  }

  // Update product card visual state
  const card = productsContainer.querySelector(
    `.product-card[data-id="${id}"]`,
  );
  if (card) card.classList.toggle("selected", selectedProductIds.has(id));

  renderSelectedProducts();
}

function renderSelectedProducts() {
  selectedProductsList.innerHTML = "";

  if (selectedProductIds.size === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    return;
  }

  selectedProductIds.forEach((id) => {
    const p = allProducts.find((x) => x.id === id);
    if (!p) return;
    const item = document.createElement("div");
    item.className = "selected-item";
    item.innerHTML = `
      <div class="selected-name">${p.name}</div>
      <button class="remove-btn" data-id="${p.id}" aria-label="Remove ${p.name}">✕</button>
    `;
    selectedProductsList.appendChild(item);
  });

  // Attach remove handlers
  selectedProductsList.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = Number(btn.dataset.id);
      selectedProductIds.delete(id);
      const card = productsContainer.querySelector(
        `.product-card[data-id="${id}"]`,
      );
      if (card) card.classList.remove("selected");
      renderSelectedProducts();
    });
  });
}

/* ----------------- Generate Routine (send selected products) ----------------- */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProductIds.size === 0) {
    appendMessage(
      "Please select at least one product before generating a routine.",
      "assistant",
    );
    return;
  }

  // Build a concise list of selected products
  const selectedList = Array.from(selectedProductIds)
    .map((id) => {
      const p = allProducts.find((x) => x.id === id);
      return p ? `- ${p.name} (${p.brand})` : "";
    })
    .join("\n");

  const prompt = `Build a personalized skincare routine using these products:\n${selectedList}\n
Provide order of use and short instructions.`;

  // Add to messages and request routine from worker
  messages.push({ role: "user", content: prompt });

  const loading = document.createElement("div");
  loading.className = "chat-message assistant";
  loading.textContent = "Generating routine...";
  chatWindow.appendChild(loading);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    const reply =
      data?.choices?.[0]?.message?.content || "No routine received.";
    messages.push({ role: "assistant", content: reply });
    loading.remove();
    appendMessage(reply, "assistant");
  } catch (err) {
    loading.remove();
    appendMessage(
      "There was an error generating the routine. Try again later.",
      "assistant",
    );
    console.error(err);
  }
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // This handler is replaced by the chat client below.
});

/* ----------------- Chat client (merged from older version) ----------------- */

// Replace this URL with your deployed Cloudflare Worker URL
const workerUrl = "https://lorealbot.travistu8.workers.dev/";

// Conversation history sent to the worker on each request
const messages = [
  {
    role: "system",
    content:
      "You are a L'Oréal assistant that provides only information and only answers questions about L'Oréal products, services, and routines.",
  },
];

function appendMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}`;
  messageDiv.textContent = text;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showWelcomeMessage() {
  chatWindow.innerHTML = "";
  appendMessage(
    "Bonjour! I am your L'Oréal Beauty Advisor. Ask me about products, routines, or skincare recommendations.",
    "assistant",
  );
}

showWelcomeMessage();

/* Handle form submit: send conversation to Cloudflare Worker */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  // Add the user's question to the messages array for context
  messages.push({ role: "user", content: question });

  appendMessage(question, "user");
  userInput.value = "";

  const loadingMessage = document.createElement("div");
  loadingMessage.className = "chat-message assistant";
  loadingMessage.textContent = "Typing...";
  chatWindow.appendChild(loadingMessage);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
    });

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't get a reply from the bot.";

    // Add the bot's reply to the messages array for context
    messages.push({ role: "assistant", content: reply });

    loadingMessage.remove();
    appendMessage(reply, "assistant");
  } catch (error) {
    loadingMessage.remove();
    appendMessage(
      "There was an error connecting to the chatbot. Please try again.",
      "assistant",
    );
    console.error("Chatbot request failed", error);
  }
});
