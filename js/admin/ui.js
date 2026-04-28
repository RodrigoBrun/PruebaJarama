document.addEventListener("DOMContentLoaded", () => {
  const shell = document.querySelector(".admin-shell");
  const sidebar = document.querySelector("[data-admin-sidebar]");
  const overlay = document.querySelector("[data-admin-overlay]");
  const openButtons = document.querySelectorAll("[data-admin-sidebar-toggle]");
  const closeButtons = document.querySelectorAll("[data-admin-sidebar-close]");

  if (!shell || !sidebar) return;

  const openSidebar = () => {
    shell.classList.add("is-sidebar-open");
    document.body.classList.add("admin-drawer-open");
  };

  const closeSidebar = () => {
    shell.classList.remove("is-sidebar-open");
    document.body.classList.remove("admin-drawer-open");
  };

  openButtons.forEach((button) => button.addEventListener("click", openSidebar));
  closeButtons.forEach((button) => button.addEventListener("click", closeSidebar));
  overlay?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) closeSidebar();
  });
});
