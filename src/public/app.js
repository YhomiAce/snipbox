// Copy buttons: <button data-copy-target="#selector">
document.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-copy-target]") : null;
  if (!button) return;
  const target = document.querySelector(button.getAttribute("data-copy-target"));
  if (!target) return;
  const text = "value" in target ? target.value : target.textContent;
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied!";
  } catch {
    button.textContent = "Copy failed";
  }
  setTimeout(() => (button.textContent = label), 1500);
});
