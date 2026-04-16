// This file handles memory (localStorage) for the whole app

// Save a value
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Load a value
function load(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// Delete a value
function remove(key) {
  localStorage.removeItem(key);
}

console.log("app.js loaded ✓");