// Get references to DOM elements
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectedBtn = document.getElementById("clearSelected");
 
// State
let allProducts = [];
let productsLoaded = false; // becomes true after the first successful fetch
 
//The key used to save selections in localStorage. Prefixed so it doesn't
//collide with any other project's storage if this ever ends up hosted on
//the same domain as another class project.
const SELECTED_PRODUCTS_KEY = "lorealRoutineBuilderSelectedIds";
 
//Reads previously-saved product IDs back out of localStorage.
//Returns an empty array if nothing was saved yet, or if what's saved
//isn't valid JSON (so a corrupted value can't crash the page).
function loadSelectedIdsFromStorage() {
  try {
    const saved = localStorage.getItem(SELECTED_PRODUCTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error("Could not read saved selections", err);
    return [];
  }
}
 
//Saves the current selection to localStorage so it survives a page reload
function saveSelectedIdsToStorage() {
  try {
    localStorage.setItem(
      SELECTED_PRODUCTS_KEY,
      JSON.stringify(Array.from(selectedProductIds)),
    );
  } catch (err) {
    console.error("Could not save selections", err);
  }
}
 
//Restore whatever was selected before the last reload
const selectedProductIds = new Set(loadSelectedIdsFromStorage());
 
//Show initial placeholder until user selects a category
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;
 
//Load product data from JSON file
async function loadProducts() {
  if (productsLoaded) return allProducts;
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  productsLoaded = true;
  return allProducts;
}
 
//Create HTML for displaying product cards
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
      <button class="info-btn" type="button" aria-label="Show description for ${product.name}" aria-expanded="false">i</button>
      <div class="desc-overlay" role="tooltip">${product.description}</div>
    </div>
  `;
    })
    .join("");
 
  //Attach click handlers to toggle selection + description overlay
  productsContainer.querySelectorAll(".product-card").forEach((card) => {
    //Tapping/clicking the card itself (not the info button) toggles selection
    card.addEventListener("click", (e) => {
      const isInfo = e.target.closest(".info-btn");
      if (isInfo) return; // the info button has its own handler below
      const id = Number(card.dataset.id);
      toggleProductSelection(id);
    });
 
    //The info button is what makes descriptions work on mobile: phones
    //don't have a mouse ":hover" state, so tapping "i" is the only way
    //to see the description on a touchscreen.
    const infoBtn = card.querySelector(".info-btn");
    const desc = card.querySelector(".desc-overlay");
    if (infoBtn && desc) {
      infoBtn.addEventListener("click", (ev) => {
        ev.stopPropagation(); // don't also trigger the card's select handler
        const wasOpen = card.classList.contains("show-desc");
 
        //Only one description should be open at a time, so close any others
        closeAllDescriptions();
 
        if (!wasOpen) {
          card.classList.add("show-desc");
          infoBtn.setAttribute("aria-expanded", "true");
          desc.setAttribute("tabindex", "-1");
          desc.focus();
        }
      });
    }
  });
}
 
//Closes every open description overlay and resets its button's state
function closeAllDescriptions() {
  productsContainer
    .querySelectorAll(".product-card.show-desc")
    .forEach((card) => {
      card.classList.remove("show-desc");
      const btn = card.querySelector(".info-btn");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
}
 
//Tapping/clicking anywhere outside a product card closes any open description
//(without this, a description opened by tapping "i" on mobile would stay
//stuck open with no way to dismiss it except tapping that same button again)
document.addEventListener("click", (e) => {
  if (!e.target.closest(".product-card")) {
    closeAllDescriptions();
  }
});
 
function toggleProductSelection(id) {
  if (selectedProductIds.has(id)) {
    selectedProductIds.delete(id);
  } else {
    selectedProductIds.add(id);
  }
 
  //Update product card visual state
  const card = productsContainer.querySelector(
    `.product-card[data-id="${id}"]`,
  );
  if (card) card.classList.toggle("selected", selectedProductIds.has(id));
 
  renderSelectedProducts();
}
 
function renderSelectedProducts() {
  //Keep localStorage in sync every time the selected list changes -
  //every path that mutates selectedProductIds ends up calling this function,
  //so this is the one place we need to save.
  saveSelectedIdsToStorage();
 
  selectedProductsList.innerHTML = "";
 
  if (selectedProductIds.size === 0) {
    selectedProductsList.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    clearSelectedBtn.disabled = true;
    return;
  }
 
  clearSelectedBtn.disabled = false;
 
  selectedProductIds.forEach((id) => {
    const p = allProducts.find((x) => x.id === id);
    if (!p) return;
    const item = document.createElement("div");
    item.className = "selected-item";
    item.innerHTML = `
      <div class="selected-name">${p.name}</div>
      <button class="remove-btn" type="button" data-id="${p.id}" aria-label="Remove ${p.name}">✕</button>
    `;
    selectedProductsList.appendChild(item);
  });
 
  //Attach remove handlers
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
 
//Clear all selections at once
clearSelectedBtn.addEventListener("click", () => {
  selectedProductIds.clear();
 
  //Un-mark any currently visible cards
  productsContainer
    .querySelectorAll(".product-card.selected")
    .forEach((card) => card.classList.remove("selected"));
 
  renderSelectedProducts();
});
 
//Filter and display products when category changes
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;
 
  //filter() creates a new array containing only products
  //where the category matches what the user selected
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );
 
  displayProducts(filteredProducts);
});
 
/* ----------------- Chat client ----------------- */
 
//Replace this URL with your deployed Cloudflare Worker URL
const workerUrl = "https://lorealbot.travistu8.workers.dev/";
 
//Conversation history sent to the worker on each request.
//OpenAI is stateless, so we keep pushing every new message onto this
//array and send the whole thing each time so follow-up questions have context.
const messages = [
  {
    role: "system",
    content:
      "You are a beauty and skincare assistant for L'Oréal Groupe. L'Oréal Groupe is the parent company behind many brands, including L'Oréal Paris, CeraVe, Garnier, Vichy, La Roche-Posay, Lancôme, Kiehl's, Kérastase, Maybelline, Redken, SkinCeuticals, Urban Decay, Yves Saint Laurent, and other L'Oréal Groupe brands. Only answer questions about the routine you've built for the user, these brands' products and services, or general topics like skincare, haircare, makeup, and fragrance. Politely decline anything unrelated.",
  },
];
 
//Adds a message bubble to the chat window and returns the element,
//so callers can remove it later (used for the "Typing..." placeholder). */
function appendMessage(text, sender, isLoading = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}${isLoading ? " loading" : ""}`;
  messageDiv.textContent = text;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageDiv;
}
 
function showWelcomeMessage() {
  chatWindow.innerHTML = "";
  appendMessage(
    "Bonjour! I am your L'Oréal Beauty Advisor. Ask me about products, routines, or skincare recommendations.",
    "assistant",
  );
}
 
showWelcomeMessage();
 
//On page load, fetch the product catalog right away (rather than waiting
//for the user to pick a category) and render the Selected Products list.
//We need the catalog loaded so any IDs restored from localStorage can be
//turned back into actual product names instead of just sitting there as
//numbers with nothing to show. */
(async function restoreSelectedProductsOnLoad() {
  await loadProducts();
  renderSelectedProducts();
})();
 
/* ----------------- Generate Routine (send selected products) ----------------- */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProductIds.size === 0) {
    appendMessage(
      "Please select at least one product before generating a routine.",
      "assistant",
    );
    return;
  }
 
  //Collect only the selected products, then pull out just the fields the
  //AI needs: name, brand, category, and description
  const selectedProductsData = Array.from(selectedProductIds)
    .map((id) => allProducts.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
    }));
 
  const prompt = `Build a personalized routine using the JSON data for these selected products:\n${JSON.stringify(selectedProductsData, null, 2)}\n\nProvide the order of use and short instructions for each step.`;
 
  messages.push({ role: "user", content: prompt });
 
  //Disable the button while the request is in flight so a second tap
  //(easy to do by accident on a touchscreen) can't fire a duplicate request
  generateRoutineBtn.disabled = true;
  const loading = appendMessage("Generating routine...", "assistant", true);
 
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
 
    if (!res.ok) {
      throw new Error(`Worker responded with status ${res.status}`);
    }
 
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
  } finally {
    generateRoutineBtn.disabled = false;
  }
});
 
//Handle chat form submit: send conversation to Cloudflare Worker
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
 
  const question = userInput.value.trim();
  if (!question) return;
 
  //Add the user's question to the messages array for context
  messages.push({ role: "user", content: question });
 
  appendMessage(question, "user");
  userInput.value = "";
 
  //Same double-submit guard as the routine button above
  sendBtn.disabled = true;
  const loadingMessage = appendMessage("Typing...", "assistant", true);
 
  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
    });
 
    if (!response.ok) {
      throw new Error(`Worker responded with status ${response.status}`);
    }
 
    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't get a reply from the bot.";
 
    //Add the bot's reply to the messages array for context
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
  } finally {
    sendBtn.disabled = false;
  }
});
