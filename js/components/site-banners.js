import { getActiveBanners, getBannersSectionEnabled } from "../data/site-structure-repository.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBannerCard(banner) {
  const title = escapeHtml(banner.title || "Banner Jarama");
  const imageUrl = escapeHtml(banner.imageUrl || "");
  const targetUrl = String(banner.targetUrl || "").trim();
  const hasLink = Boolean(targetUrl);
  const openInNewTab = Boolean(banner.openInNewTab);

  const content = `
    <div class="brand-banner-card__media">
      <img
        src="${imageUrl}"
        alt="${title}"
        loading="lazy"
        onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=&quot;brand-banner-card__fallback&quot;>Imagen no disponible</div>';"
      />
    </div>
  `;

  if (hasLink) {
    return `
      <a
        class="brand-banner-card"
        href="${escapeHtml(targetUrl)}"
        ${openInNewTab ? 'target="_blank" rel="noopener noreferrer"' : ""}
        aria-label="Abrir banner ${title}"
      >
        ${content}
      </a>
    `;
  }

  return `
    <div class="brand-banner-card" aria-label="${title}">
      ${content}
    </div>
  `;
}

async function mountSiteBanners() {
  const section = document.querySelector("[data-site-banners]");
  const grid = document.querySelector("[data-site-banners-grid]");

  if (!section || !grid) return;

  try {
    const sectionEnabled = await getBannersSectionEnabled();

    if (!sectionEnabled) {
      section.hidden = true;
      return;
    }

    const banners = await getActiveBanners();

    if (!Array.isArray(banners) || !banners.length) {
      section.hidden = true;
      return;
    }

    grid.innerHTML = banners.map(buildBannerCard).join("");
    section.hidden = false;
  } catch (error) {
    console.error("No se pudieron cargar los banners públicos:", error);
    section.hidden = true;
  }
}

document.addEventListener("DOMContentLoaded", mountSiteBanners);

window.JaramaSiteBanners = {
  mountSiteBanners
};