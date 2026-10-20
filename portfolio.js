(() => {
  "use strict";

  const cards = document.querySelectorAll(".tilt-card");
  const dialog = document.getElementById("detail-dialog");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogCopy = document.getElementById("dialog-copy");
  const glow = document.querySelector(".cursor-glow");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function resetTilt(card) {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--shine-x", "50%");
    card.style.setProperty("--shine-y", "50%");
  }

  function openCard(card) {
    dialogTitle.textContent = card.dataset.title;
    dialogCopy.textContent = card.dataset.detail;
    dialog.showModal();
  }

  for (const card of cards) {
    card.addEventListener("pointermove", event => {
      if (reduceMotion.matches || event.pointerType === "touch") return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty("--rx", `${(0.5 - y) * 9}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
      card.style.setProperty("--shine-x", `${x * 100}%`);
      card.style.setProperty("--shine-y", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => resetTilt(card));
    card.addEventListener("focus", () => {
      card.style.setProperty("--lift", "-4px");
    });
    card.addEventListener("blur", () => {
      card.style.setProperty("--lift", "0px");
      resetTilt(card);
    });
    card.addEventListener("click", event => {
      if (event.target.closest("a")) return;
      openCard(card);
    });
    card.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && event.target === card) {
        event.preventDefault();
        openCard(card);
      }
    });
  }

  document.addEventListener("pointermove", event => {
    if (reduceMotion.matches || !glow) return;
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
})();
