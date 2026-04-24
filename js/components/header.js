document.addEventListener("DOMContentLoaded", () => {
  const infoBtn = document.querySelector("[data-open-info]");
  const infoModal = document.querySelector("[data-info-modal]");
  const infoCloseTriggers = document.querySelectorAll("[data-close-info]");

  if (!infoBtn || !infoModal) return;

  const openModal = () => {
    infoModal.classList.add("is-visible");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    infoModal.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
  };

  infoBtn.addEventListener("click", openModal);

  infoCloseTriggers.forEach(el => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && infoModal.classList.contains("is-visible")) {
      closeModal();
    }
  });
});