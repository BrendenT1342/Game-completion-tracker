const form = document.getElementById("game-form");
const nameInput = document.getElementById("game-name");
const addButton = document.getElementById("add-button");
const gameList = document.getElementById("game-list");
const completedList = document.getElementById("completed-list");
const clearButton = document.getElementById("clear-button");

const STORAGE_KEY = "gameCompletionTracker";
const MAX_IMAGE_SIZE = 300; // px, longest side of the saved thumbnail

// ---- Build the image input + preview with JavaScript (no HTML changes needed) ----

const imageInput = document.createElement("input");
imageInput.type = "file";
imageInput.id = "game-image";
imageInput.accept = "image/*";

const imagePreview = document.createElement("img");
imagePreview.id = "image-preview";
imagePreview.alt = "Selected image preview";
imagePreview.hidden = true;

form.append(imageInput, imagePreview);

// Styles for the new elements, injected so styles.css doesn't need editing.
const extraStyles = document.createElement("style");
extraStyles.textContent = `
  #game-form { flex-wrap: wrap; }
  #image-preview, .game-image {
    width: 130px;
    height: 130px;
    object-fit: cover;
    border-radius: 6px;
  }
  #image-preview[hidden] { display: none; }
  .game-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }
  .game-info { display: flex; align-items: center; gap: 0.75rem; }
  .game-actions { display: flex; gap: 0.5rem; }
  .game-actions button { padding: 0.3rem 0.7rem; font-size: 0.9rem; }
  #completed-list .game-info span { text-decoration: line-through; }
`;
document.head.appendChild(extraStyles);

// ---- Data ----

// Each game looks like: { id: 123, name: "Hades", image: "data:image/jpeg;..." | null, completed: false }
let games = loadGames();

function loadGames() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveGames() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch {
    alert(
      "Couldn't save: browser storage is full. Try removing some games or using smaller images.",
    );
  }
}

// ---- Image handling ----

// Shows the chosen image in the form before the game is added.
function showPreview() {
  clearPreview();
  const file = imageInput.files[0];
  if (file) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
  }
}

function clearPreview() {
  if (imagePreview.src) URL.revokeObjectURL(imagePreview.src);
  imagePreview.removeAttribute("src");
  imagePreview.hidden = true;
}

// Shrinks the chosen image and returns it as a small JPEG data URL,
// so many games can fit in localStorage.
function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(
          1,
          MAX_IMAGE_SIZE / Math.max(img.width, img.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas
          .getContext("2d")
          .drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---- Actions ----

async function addGame() {
  const name = nameInput.value.trim();
  if (!name) return;

  let image = null;
  const file = imageInput.files[0];
  if (file) {
    try {
      image = await readImage(file);
    } catch {
      alert(
        "Sorry, that image couldn't be read. The game will be added without one.",
      );
    }
  }

  games.push({ id: Date.now(), name, image, completed: false });
  nameInput.value = "";
  imageInput.value = "";
  clearPreview();
  nameInput.focus();

  saveGames();
  render();
}

function toggleGame(id) {
  const game = games.find((g) => g.id === id);
  if (game) {
    game.completed = !game.completed;
    saveGames();
    render();
  }
}

function removeGame(id) {
  games = games.filter((g) => g.id !== id);
  saveGames();
  render();
}

function clearCompleted() {
  games = games.filter((g) => !g.completed);
  saveGames();
  render();
}

// ---- Rendering ----

function createItem(game) {
  const item = document.createElement("div");
  item.className = "game-item";

  const info = document.createElement("div");
  info.className = "game-info";

  if (game.image) {
    const img = document.createElement("img");
    img.className = "game-image";
    img.src = game.image;
    img.alt = `${game.name} cover`;
    info.appendChild(img);
  }

  const label = document.createElement("span");
  label.textContent = game.name;
  info.appendChild(label);

  const actions = document.createElement("div");
  actions.className = "game-actions";

  const toggleBtn = document.createElement("button");
  toggleBtn.textContent = game.completed ? "Undo" : "Complete";
  toggleBtn.addEventListener("click", () => toggleGame(game.id));

  const removeBtn = document.createElement("button");
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => removeGame(game.id));

  actions.append(toggleBtn, removeBtn);
  item.append(info, actions);
  return item;
}

function render() {
  gameList.innerHTML = "";
  completedList.innerHTML = "";

  const incomplete = games.filter((g) => !g.completed);
  const completed = games.filter((g) => g.completed);

  if (incomplete.length === 0) {
    gameList.textContent = "No incomplete games yet.";
  } else {
    incomplete.forEach((g) => gameList.appendChild(createItem(g)));
  }

  if (completed.length === 0) {
    completedList.textContent = "No completed games yet.";
  } else {
    completed.forEach((g) => completedList.appendChild(createItem(g)));
  }

  clearButton.disabled = completed.length === 0;
}

// ---- Events ----

// Pressing Enter in the text box submits the form, so stop the page reload
// and add the game instead.
form.addEventListener("submit", (e) => {
  e.preventDefault();
  addGame();
});

imageInput.addEventListener("change", showPreview);
addButton.addEventListener("click", addGame);
clearButton.addEventListener("click", clearCompleted);

render();
