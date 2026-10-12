"use strict";

const PRODUCT = {
  currency: "EUR",
  defaultCapacity: 20,
  capacities: [5, 10, 15, 20, 25],
  dimensionsByCapacity: {
    5: { d2: 260, s2: 160, v1: 150, weight: "do potwierdzenia" },
    6: { d2: 310, s2: 160, v1: 150, weight: "do potwierdzenia" },
    8: { d2: 300, s2: 210, v1: 150, weight: "do potwierdzenia" },
    9: { d2: 340, s2: 210, v1: 150, weight: "do potwierdzenia" },
    10: { d2: 285, s2: 210, v1: 200, weight: "do potwierdzenia" },
    12: { d2: 340, s2: 210, v1: 200, weight: "do potwierdzenia" },
    15: { d2: 410, s2: 210, v1: 200, weight: "do potwierdzenia" },
    20: { d2: 550, s2: 210, v1: 200, weight: "270 kg" },
  },
  images: [
    {
      src: "assets/images/tank-gallery-1.png",
      alt: "Perspektywiczny widok prostokątnego zbiornika retencyjnego",
    },
    {
      src: "assets/images/tank-gallery-2.png",
      alt: "Przedni widok prostokątnego zbiornika retencyjnego z włazem rewizyjnym",
    },
    {
      src: "assets/images/tank-gallery-3.png",
      alt: "Widok z góry na zbiornik i właz rewizyjny",
    },
    {
      src: "assets/images/tank-gallery-4.png",
      alt: "Detal włazu rewizyjnego i pokrywy na górze zbiornika",
    },
    {
      src: "assets/images/tank-gallery-5.png",
      alt: "Przekrój zbiornika z konstrukcją wewnętrzną i wzmocnieniami",
    },
  ],
  options: {
    revisionHeight: [
      { label: "30 cm", surcharge: 0 },
      { label: "40 cm", surcharge: 15 },
      { label: "50 cm", surcharge: 30 },
      { label: "60 cm", surcharge: 45 },
      { label: "70 cm", surcharge: 60 },
      { label: "80 cm", surcharge: 75 },
      { label: "90 cm", surcharge: 90 },
      { label: "100 cm", surcharge: 105 },
      { label: "110 cm", surcharge: 120 },
      { label: "120 cm", surcharge: 135 },
      { label: "130 cm", surcharge: 150 },
    ],
    lid: [
      { label: "Pokrywa nieobciążeniowa", surcharge: 0 },
      { label: "Pokrywa obciążeniowa do 200 kg CZARNA", surcharge: 100 },
      { label: "Pokrywa obciążeniowa do 200 kg ZIELONA", surcharge: 126 },
      { label: "Pokrywa obciążeniowa do 200 kg PIASKOWO-SZARA", surcharge: 126 },
      { label: "Pokrywa zamykana", surcharge: 110 },
    ],
    filterBasket: [
      { label: "Bez kosza filtracyjnego", surcharge: 0 },
      { label: "Z koszem filtracyjnym", surcharge: 130 },
    ],
    inletDiameter: [
      { label: "DN 110", surcharge: 0 },
      { label: "DN 125", surcharge: 55 },
      { label: "DN 160", surcharge: 95 },
    ],
    overflow: [
      { label: "Bez przelewu", surcharge: 0 },
      { label: "Przelew DN 110", surcharge: 85 },
      { label: "Przelew DN 160", surcharge: 135 },
    ],
    pumpPreparation: [
      { label: "Bez przygotowania", surcharge: 0 },
      { label: "Przepust kablowy", surcharge: 45 },
      { label: "Przygotowanie pod pompę zanurzeniową", surcharge: 210 },
    ],
    anchoring: [
      { label: "Bez zestawu kotwiącego", surcharge: 0 },
      { label: "Zestaw kotwiący Standard", surcharge: 160 },
      { label: "Zestaw kotwiący Plus", surcharge: 260 },
    ],
    shaftExtension: [
      { label: "Bez przedłużenia", surcharge: 0 },
      { label: "Przedłużenie +20 cm", surcharge: 75 },
      { label: "Przedłużenie +40 cm", surcharge: 130 },
    ],
  },
};

const moneyFormatter = new Intl.NumberFormat("sk-SK", {
  style: "currency",
  currency: PRODUCT.currency,
  maximumFractionDigits: 2,
});

let quantity = 1;
let galleryIndex = 0;
let galleryLayer = 0;
let galleryAnimating = false;
let selectedCapacity = PRODUCT.defaultCapacity;
let lastDefaultMessage = "";
let customSelectGlobalListenersBound = false;

const getElement = (selector) => document.querySelector(selector);
const getElements = (selector) => Array.from(document.querySelectorAll(selector));

function getSelectedConfiguration() {
  return getElements("[data-config]").map((select) => {
    const option = select.selectedOptions[0];
    const label = option?.dataset.label || option?.textContent || "";
    return {
      name: select.name,
      label,
      surcharge: Number(select.value || 0),
    };
  });
}

function populateConfigurator() {
  const capacitySelect = getElement("[data-capacity-select]");
  if (capacitySelect) {
    PRODUCT.capacities.forEach((capacity) => {
      const item = document.createElement("option");
      item.value = String(capacity);
      item.textContent = `${capacity} m³ / ${capacity * 1000} l`;
      item.selected = capacity === PRODUCT.defaultCapacity;
      capacitySelect.append(item);
    });
  }

  Object.entries(PRODUCT.options).forEach(([key, options]) => {
    const select = getElement(`[data-config="${key}"]`);
    if (!select) return;

    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = String(option.surcharge);
      item.dataset.label = option.label;
      item.textContent = option.label;
      select.append(item);
    });
  });
}

function getCapacityLabel(capacity = selectedCapacity) {
  return `${capacity} m³ / ${(capacity * 1000).toLocaleString("pl-PL")} l`;
}

function getInquiryMessage(capacity = selectedCapacity) {
  return `Interesuje mnie zbiornik retencyjny ${capacity * 1000} l. Proszę o przygotowanie oferty cenowej wraz z dostawą.`;
}

function getDimensionText(capacity = selectedCapacity) {
  const dimensions = PRODUCT.dimensionsByCapacity[capacity];
  if (!dimensions) {
    return {
      length: "Długość zewnętrzna D2: do potwierdzenia",
      width: "Szerokość zewnętrzna S2: do potwierdzenia",
      height: "Wysokość płaszcza V1: do potwierdzenia",
      dimensions: "dokładne wymiary zostaną potwierdzone dla wybranego modelu",
      weight: "do potwierdzenia",
    };
  }

  return {
    length: `Długość zewnętrzna D2: ${dimensions.d2} cm`,
    width: `Szerokość zewnętrzna S2: ${dimensions.s2} cm`,
    height: `Wysokość płaszcza V1: ${dimensions.v1} cm`,
    dimensions: `długość zewnętrzna ${dimensions.d2} cm, szerokość zewnętrzna ${dimensions.s2} cm, wysokość płaszcza ${dimensions.v1} cm`,
    weight: dimensions.weight,
  };
}

function calculateSelectedSurcharge() {
  return getSelectedConfiguration().reduce((total, option) => total + option.surcharge, 0) * quantity;
}

function setTextContent(selector, text) {
  const el = getElement(selector);
  if (el) el.textContent = text;
}

function updatePrice() {
  const capacitySelect = getElement("[data-capacity-select]");
  selectedCapacity = Number(capacitySelect?.value || PRODUCT.defaultCapacity);
  const capacityLiters = selectedCapacity * 1000;
  const capacityText = `${capacityLiters.toLocaleString("pl-PL")} l`;
  const title = `Zbiornik retencyjny ${capacityText}`;
  const dimensions = getDimensionText();

  setTextContent("#productTitle", title);
  setTextContent("#heroCapacity", capacityText);
  setTextContent(
    "#specsIntro",
    `Podstawowe dane techniczne dla prostokątnego samonośnego zbiornika retencyjnego o pojemności ${selectedCapacity} m3.`,
  );
  setTextContent("#specCapacity", capacityText);
  setTextContent("#specWeight", dimensions.weight);
  setTextContent("#specDimensions", dimensions.dimensions);
  setTextContent("#miniCapacity", getCapacityLabel());
  setTextContent("#miniLength", dimensions.length);
  setTextContent("#miniWidth", dimensions.width);
  setTextContent("#miniHeight", dimensions.height);

  setTextContent("#grossPrice", "do uzgodnienia");
  setTextContent("#netPrice", "Ofertę cenową przygotujemy po wysłaniu zapytania.");
  setTextContent("#quantityOutput", String(quantity));

  const formQuantity = getElement('#inquiryForm input[name="quantity"]');
  if (formQuantity) formQuantity.value = String(quantity);

  const configurationInput = getElement("#configurationInput");
  if (configurationInput) {
    const options = getSelectedConfiguration()
      .map((option) => `${option.name}: ${option.label}`)
      .join("; ");
    configurationInput.value = `Pojemność: ${getCapacityLabel()}; Liczba sztuk: ${quantity}; ${options}`;
  }

  const message = getElement("#inquiryMessage");
  if (message) {
    const nextDefaultMessage = getInquiryMessage();
    if (!message.value.trim() || message.value === lastDefaultMessage) {
      message.value = nextDefaultMessage;
    }
    lastDefaultMessage = nextDefaultMessage;
  }
}

function getGalleryLayers() {
  return getElements("[data-gallery-layer]");
}

function syncGalleryThumbs() {
  getElements("[data-gallery-index]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.galleryIndex) === galleryIndex);
  });
}

function setGalleryImage(index) {
  const nextIndex = (index + PRODUCT.images.length) % PRODUCT.images.length;
  if (nextIndex === galleryIndex) return;

  const image = PRODUCT.images[nextIndex];
  const layers = getGalleryLayers();
  if (layers.length < 2) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const currentLayer = layers.find(l => l.classList.contains("is-visible")) || layers[0];
  const nextLayer = layers.find(l => l !== currentLayer) || layers[1];

  galleryIndex = nextIndex;
  syncGalleryThumbs();

  if (reducedMotion) {
    currentLayer.src = image.src;
    currentLayer.alt = image.alt;
    currentLayer.classList.add("is-visible");
    nextLayer.classList.remove("is-visible");
    return;
  }

  nextLayer.src = image.src;
  nextLayer.alt = image.alt;

  nextLayer.classList.add("is-visible");
  currentLayer.classList.remove("is-visible");
}

function initGallery() {
  getElement("[data-gallery-prev]")?.addEventListener("click", () => setGalleryImage(galleryIndex - 1));
  getElement("[data-gallery-next]")?.addEventListener("click", () => setGalleryImage(galleryIndex + 1));

  getElements("[data-gallery-index]").forEach((button) => {
    button.addEventListener("click", () => setGalleryImage(Number(button.dataset.galleryIndex)));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setGalleryImage(galleryIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setGalleryImage(galleryIndex + 1);
      }
    });
  });
}

function initMenu() {
  const toggle = getElement("[data-menu-toggle]");
  const nav = getElement("[data-nav]");
  const contact = getElement(".header-contact");

  toggle?.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    nav?.classList.toggle("is-open", !isOpen);
    contact?.classList.toggle("is-open", !isOpen);
  });

  nav?.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;
    toggle?.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    contact?.classList.remove("is-open");
  });
}

function initQuantity() {
  getElement("[data-qty-minus]")?.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1);
    updatePrice();
  });

  getElement("[data-qty-plus]")?.addEventListener("click", () => {
    quantity += 1;
    updatePrice();
  });

  getElements("[data-config]").forEach((select) => select.addEventListener("change", updatePrice));
  getElement("[data-capacity-select]")?.addEventListener("change", updatePrice);
}

function initAccordion() {
  getElements(".accordion-item button").forEach((button) => {
    const item = button.closest(".accordion-item");
    const panel = button.nextElementSibling;
    if (!item || !panel) return;

    button.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";

      if (expanded) {
        button.setAttribute("aria-expanded", "false");
        panel.setAttribute("aria-hidden", "true");
        item.classList.remove("is-expanded");
        return;
      }

      getElements(".accordion-item.is-expanded").forEach((openItem) => {
        if (openItem === item) return;
        const openButton = openItem.querySelector("button");
        const openPanel = openItem.querySelector(".accordion-panel");
        openButton?.setAttribute("aria-expanded", "false");
        openPanel?.setAttribute("aria-hidden", "true");
        openItem.classList.remove("is-expanded");
      });

      button.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      item.classList.add("is-expanded");
    });
  });
}

function closeAllCustomSelects(except) {
  getElements(".custom-select.is-open").forEach((wrap) => {
    if (wrap === except) return;
    wrap.classList.remove("is-open");
    wrap.querySelector(".custom-select-trigger")?.setAttribute("aria-expanded", "false");
    wrap.querySelector(".custom-select-list")?.setAttribute("hidden", "");
  });
}

function initCustomSelects() {
  const selects = getElements(".configurator select");
  if (!selects.length) return;

  selects.forEach((select) => {
    if (select.closest(".custom-select")) return;

    const wrap = document.createElement("div");
    wrap.className = "custom-select";
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add("custom-select-native");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const list = document.createElement("ul");
    list.className = "custom-select-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    wrap.append(trigger, list);

    const syncTrigger = () => {
      const option = select.selectedOptions[0];
      trigger.textContent = option?.textContent || "";
      list.querySelectorAll(".custom-select-option").forEach((item) => {
        const isSelected = item.dataset.value === select.value;
        item.classList.toggle("is-selected", isSelected);
        item.setAttribute("aria-selected", String(isSelected));
      });
    };

    const buildOptions = () => {
      list.replaceChildren();
      Array.from(select.options).forEach((option) => {
        const item = document.createElement("li");
        item.className = "custom-select-option";
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          syncTrigger();
          wrap.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          list.hidden = true;
        });
        list.append(item);
      });
      syncTrigger();
    };

    buildOptions();

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !wrap.classList.contains("is-open");
      closeAllCustomSelects(willOpen ? wrap : null);
      wrap.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      list.hidden = !willOpen;
    });

    select.addEventListener("change", syncTrigger);
  });

  if (customSelectGlobalListenersBound) return;
  customSelectGlobalListenersBound = true;

  document.addEventListener("click", (event) => {
    if (event.target.closest(".custom-select")) return;
    closeAllCustomSelects();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllCustomSelects();
  });
}

function initCursorFx() {
  const root = getElement("[data-cursor-fx]");
  if (!root) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (prefersReduced || coarsePointer) return;

  root.hidden = false;
  document.body.classList.add("has-cursor-fx");

  const glow = root.querySelector(".cursor-fx__glow");
  const ring = root.querySelector(".cursor-fx__ring");
  const dot = root.querySelector(".cursor-fx__dot");
  if (!glow || !ring || !dot) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let glowX = mouseX;
  let glowY = mouseY;
  let ringX = mouseX;
  let ringY = mouseY;
  let dotX = mouseX;
  let dotY = mouseY;
  let rafId = 0;

  const setPos = (el, x, y) => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const tick = () => {
    glowX += (mouseX - glowX) * 0.06;
    glowY += (mouseY - glowY) * 0.06;
    ringX += (mouseX - ringX) * 0.14;
    ringY += (mouseY - ringY) * 0.14;
    dotX += (mouseX - dotX) * 0.35;
    dotY += (mouseY - dotY) * 0.35;

    setPos(glow, glowX, glowY);
    setPos(ring, ringX, ringY);
    setPos(dot, dotX, dotY);
    rafId = requestAnimationFrame(tick);
  };

  document.addEventListener(
    "mousemove",
    (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    "mouseover",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest("a, button, .custom-select-trigger, input, textarea, select, label");
      root.classList.toggle("is-hover", Boolean(interactive));
    },
    { passive: true },
  );

  rafId = requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else rafId = requestAnimationFrame(tick);
  });
}

function initSmoothScroll() {
  getElements("[data-scroll]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) return;
      const target = getElement(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initHeaderScroll() {
  const header = getElement("[data-header]");
  if (!header) return;

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initScrollReveal() {
  const revealEls = getElements(".reveal");
  if (!revealEls.length) return;

  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -48px 0px" },
  );

  revealEls.forEach((el) => observer.observe(el));
}

function getFormPayload(form) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    location: String(data.get("location") || "").trim(),
    quantity: Number(data.get("quantity") || 1),
    configuration: String(data.get("configuration") || "").trim(),
    message: String(data.get("message") || "").trim(),
    consent: data.get("consent") === "on",
    website: String(data.get("website") || "").trim(),
  };
}

function showSuccessModal() {
  const modal = getElement("#successModal");
  if (!modal) return;

  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector(".success-modal-close")?.focus();
}

function hideSuccessModal() {
  const modal = getElement("#successModal");
  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function initSuccessModal() {
  getElements("[data-modal-close]").forEach((control) => {
    control.addEventListener("click", hideSuccessModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSuccessModal();
  });
}

function initInquiryForm() {
  const form = getElement("#inquiryForm");
  const message = getElement("#formMessage");
  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "form-message";

    if (!form.reportValidity()) return;

    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = "Wysyłanie zapytania...";

    try {
      await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getFormPayload(form)),
      });
    } catch (error) {
      console.warn("Nie udało się potwierdzić wysłania zapytania w tym podglądzie.", error);
    } finally {
      message.textContent = "Formularz został wysłany.";
      message.classList.add("is-success");
      showSuccessModal();
      form.reset();
      quantity = 1;
      updatePrice();
      submit.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateConfigurator();
  initCustomSelects();
  initMenu();
  initGallery();
  initQuantity();
  initAccordion();
  initSmoothScroll();
  initHeaderScroll();
  initScrollReveal();
  initCursorFx();
  initSuccessModal();
  initInquiryForm();
  updatePrice();
  getElement("#year").textContent = String(new Date().getFullYear());
});

const PRODUCTS_DATABASE = {
  "zbiorniki-retencyjne": {
    title: "Zbiorniki retencyjne NEO",
    subtitle: "Samonośny plastikowy zbiornik na wodę deszczową",
    lead: "Profesjonalne zbiorniki na wodę deszczową i ścieki, dostosowane do indywidualnych potrzeb.",
    props: ["Pojemność 1 - 20 m³", "Konstrukcja samonośna", "100% szczelny materiał", "Dostawa na terenie Polski"],
    badge: "HIT SEZONU",
    images: [
      { src: "assets/images/tank-gallery-1.png", alt: "Widok 1" },
      { src: "assets/images/tank-gallery-2.png", alt: "Widok 2" },
      { src: "assets/images/tank-gallery-3.png", alt: "Widok 3" },
      { src: "assets/images/tank-gallery-4.png", alt: "Widok 4" },
      { src: "assets/images/tank-gallery-5.png", alt: "Widok 5" }
    ],
    options: [
      { name: "Pojemność zbiornika", values: ["5 000 l", "10 000 l", "15 000 l", "20 000 l"] },
      { name: "Wysokość komina rewizyjnego", values: ["30 cm", "50 cm", "80 cm", "100 cm"] },
      { name: "Pokrywa", values: ["Nieobciążeniowa", "Obciążeniowa zielona", "Obciążeniowa czarna"] },
      { name: "Kosz filtracyjny", values: ["Bez kosza", "Z koszem filtracyjnym"] }
    ]
  },
  "nadre": {
    baseTitle: "Nádrže",
    subtitle: "Uniwersalne zbiorniki plastikowe",
    lead: "Uniwersalne zbiorniki plastikowe o różnym przeznaczeniu przemysłowym i domowym.",
    props: ["Wysoka odporność", "Indywidualne wykonanie", "Atesty i normy", "Dostawa w Polsce"],
    images: [
      { src: "assets/images/product-8-2.jpg", alt: "Nádrže" },
      { src: "assets/images/product-8.png", alt: "Nádrže" },
      { src: "assets/images/product-8-3.jpg", alt: "Nádrže" }
    ],
    options: [
      { name: "Pojemność nádrže", values: ["1 000 l", "3 000 l", "5 000 l", "10 000 l"] },
      { name: "Przeznaczenie", values: ["Woda deszczowa", "Ścieki", "Chemia / Przemysł"] }
    ]
  },
  "poklopy": {
    baseTitle: "Poklopy",
    subtitle: "Pokrywy i włazy z tworzywa sztucznego",
    lead: "Wytrzymałe pokrywy i włazy rewizywne o różnej klasie obciążenia.",
    props: ["Odporność na UV", "Antypoślizgowa powierzchnia", "Wkręty zabezpieczające", "Różne kolory"],
    images: [
      { src: "assets/images/product-9.jpg", alt: "Poklopy" },
      { src: "assets/images/product-9-2.jpg", alt: "Poklopy" },
      { src: "assets/images/product-9-3.jpg", alt: "Poklopy" }
    ],
    options: [
      { name: "Klasa obciążenia", values: ["Nieobciążeniowa (A15)", "Obciążeniowa do 200 kg", "Samochodowa (B125)"] },
      { name: "Średnica", values: ["Ø 600 mm", "Ø 650 mm", "Ø 800 mm"] }
    ]
  },
  "vsakovaci-blok-compact": {
    baseTitle: "Vsakovaci blok Compact",
    subtitle: "Kompaktowe bloki do rozsączania wód",
    lead: "Modułowe bloki do podziemnej retencji i powolnego rozsączania wody deszczowej w gruncie.",
    props: ["Wysoka pojemność (97%)", "Łatwy montaż modułowy", "Duża wytrzymałość", "Geowłóknina w zestawie"],
    images: [
      { src: "assets/images/product-10.jpg", alt: "Vsakovaci blok Compact" },
      { src: "assets/images/product-10-2.jpg", alt: "Vsakovaci blok Compact" }
    ],
    options: [
      { name: "Pojemność bloku", values: ["150 l", "300 l", "600 l"] },
      { name: "Klasa obciążenia", values: ["Ruch pieszy", "Ruch osobowy"] }
    ]
  },
  "separatory": {
    title: "Separatory",
    subtitle: "Urządzenia do separacji substancji ropopochodnych i tłuszczów",
    lead: "Skuteczne oddzielanie substancji ropopochodnych i tłuszczów w systemach kanalizacyjnych.",
    props: ["Przepływ 1.5 - 20 l/s", "Zintegrowany osadnik", "Zgodność z normą PN-EN 858", "Atest higieniczny"],
    images: [
      { src: "assets/images/product-1.png", alt: "Separator 1" },
      { src: "assets/images/product-1-2.png", alt: "Separator 2" },
      { src: "assets/images/product-1-3.png", alt: "Separator 3" },
      { src: "assets/images/product-1-4.png", alt: "Separator 4" }
    ],
    options: [
      { name: "Typ separatora", values: ["Koalescencyjny (ropopochodne)", "Tłuszczowy", "Osadnikowy"] },
      { name: "Przepływ nominalny", values: ["1.5 l/s", "3 l/s", "6 l/s", "10 l/s", "15 l/s"] },
      { name: "Średnica przyłącza", values: ["DN 110", "DN 160", "DN 200"] }
    ]
  },
  "klapy-zwrotne": {
    title: "Klapy zwrotne",
    subtitle: "Zamknięcia przeciwzalewowe",
    lead: "Ochrona przed cofaniem się ścieków i wody deszczowej z instalacji zewnętrznych.",
    props: ["Montaż na rurze", "Odporność na korozję", "Automatyczne działanie", "Łatwy przegląd"],
    images: [
      { src: "assets/images/product-2.png", alt: "Klapa zwrotna" }
    ],
    options: [
      { name: "Średnica rury (DN)", values: ["DN 110", "DN 125", "DN 160", "DN 200", "DN 250"] },
      { name: "Liczba klap", values: ["Jednoklapowa", "Dwuklapowa"] }
    ]
  },
  "drut-spawalniczy": {
    title: "Drut spawalniczy",
    subtitle: "Spoiwo do spawania tworzyw sztucznych",
    lead: "Wysokiej jakości drut do profesjonalnego łączenia tworzyw sztucznych (PE, PP).",
    props: ["Czysty polimer PP/PE", "Stabilność termiczna", "Wysoka wytrzymałość spoiny", "Różne profile"],
    images: [
      { src: "assets/images/product-3.png", alt: "Drut spawalniczy" },
      { src: "assets/images/product-3-2.png", alt: "Drut spawalniczy 2" },
      { src: "assets/images/product-3-3.jpg", alt: "Drut spawalniczy 3" }
    ],
    options: [
      { name: "Materiał tworzywa", values: ["PP-H (Polipropylen)", "PE-HD (Polietylen)", "PVC-U"] },
      { name: "Kształt profilu", values: ["Okrągły Ø 3 mm", "Okrągły Ø 4 mm", "Trójkątny 5x3 mm"] },
      { name: "Waga opakowania", values: ["Szpula 2 kg", "Szpula 5 kg", "Wiązka 10 kg"] }
    ]
  },
  "studnie": {
    title: "Studnie tworzywowe",
    subtitle: "Studzienki kanalizacyjne, wodomierzowe i drenażowe",
    lead: "Trwałe studnie wodomierzowe, kanalizacyjne i drenażowe wykonane z tworzyw.",
    props: ["100% szczelność", "Kompaktowa waga", "Możliwość docięcia", "Wysoka odporność"],
    images: [
      { src: "assets/images/product-4.jpg", alt: "Studnia" },
      { src: "assets/images/product-4-2.jpg", alt: "Studnia" },
      { src: "assets/images/product-4-3.jpg", alt: "Studnia" }
    ],
    options: [
      { name: "Przeznaczenie", values: ["Wodomierzowa", "Kanalizacyjna rewizyjna", "Drenażowa / Chłonna"] },
      { name: "Średnica korpusu", values: ["DN 400", "DN 600", "DN 800", "DN 1000"] },
      { name: "Wysokość studni", values: ["1.0 m", "1.5 m", "2.0 m", "2.5 m"] }
    ]
  },
  "rury-strukturalne": {
    title: "Rury strukturalne spiralnie zwijane",
    subtitle: "Systemy rurociągów dużej średnicy",
    lead: "Wytrzymałe rury do budowy nowych sieci, zbiorników i renowacji przewodów.",
    props: ["Wysoka sztywność SN", "Gładka powierzchnia wewn.", "Odporność ścierna", "Łączenie przez spawanie"],
    badge: "HIT CENOWY",
    images: [
      { src: "assets/images/product-5.jpg", alt: "Rura strukturalna" },
    ],
    options: [
      { name: "Średnica wewnętrzna (ID)", values: ["300 mm", "500 mm", "800 mm", "1000 mm", "1200 mm"] },
      { name: "Klasa sztywności", values: ["SN 2 kN/m²", "SN 4 kN/m²", "SN 8 kN/m²"] }
    ]
  },
  "ksztaltki": {
    title: "Kształtki i połączenia",
    subtitle: "Elementy łączeniowe tworzywowe",
    lead: "Kolana, trójniki, redukcje i inne elementy dopasowane do systemów rurociągów.",
    props: ["Wykonanie z PE/PP", "Zgrzewanie / Spawanie", "Gwarancja szczelności", "Dowolne kąty"],
    images: [
      { src: "assets/images/product-6.jpg", alt: "Kształtka" },
      { src: "assets/images/product-6-2.jpg", alt: "Kształtka" },
      { src: "assets/images/product-6-3.jpg", alt: "Kształtka" }
    ],
    options: [
      { name: "Rodzaj elementu", values: ["Kolano 45°", "Kolano 90°", "Trójnik 90°", "Redukcja"] },
      { name: "Średnica nominalna", values: ["DN 110", "DN 160", "DN 200", "DN 250", "DN 315"] }
    ]
  },
  "plyty-pe-pp": {
    title: "Płyty z PE i PP",
    subtitle: "Płyty konstrukcyjne i tworzywowe",
    lead: "Płyty z polietylenu i polipropylenu o wszechstronnym zastosowaniu przemysłowym.",
    props: ["Gładka lub radełkowana", "Odporność chemiczna", "Ochrona UV", "Łatwa obróbka"],
    images: [
      { src: "assets/images/product-7.jpg", alt: "Płyta PE/PP" },
      { src: "assets/images/product-7-2.jpg", alt: "Płyta PE/PP" },
      { src: "assets/images/product-7-3.jpg", alt: "Płyta PE/PP" }
    ],
    options: [
      { name: "Gatunek tworzywa", values: ["PE 100", "PP-H", "PP-C"] },
      { name: "Grubość płyty", values: ["5 mm", "10 mm", "15 mm", "20 mm"] },
      { name: "Format arkusza", values: ["2000 x 1000 mm", "3000 x 1500 mm"] }
    ]
  }
};

let currentProductImages = [];
let currentGalleryIndex = 0;
function parseLitersFromCapacityLabel(label) {
  const digits = String(label || "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function syncProductTitleFromConfigurator(productKey, productData) {
  const titleElem = document.getElementById("productTitle");
  const form = document.querySelector("#produkt .configurator");
  if (!titleElem || !productData) return;

  const baseTitle = productData.title || productData.baseTitle || "Produkt";

  if (productKey === "zbiorniki-retencyjne") {
    const capacitySelect = form?.querySelector('[data-product-option="Pojemność zbiornika"]');
    const capacityLabel = capacitySelect?.selectedOptions[0]?.textContent || "";
    const liters = parseLitersFromCapacityLabel(capacityLabel);
    titleElem.textContent = liters ? `Zbiorniki retencyjne NEO ${liters} L` : baseTitle;
    return;
  }

  titleElem.textContent = baseTitle;
}

function bindConfiguratorTitleSync(productKey, productData, form) {
  if (!form) return;
  form.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      syncProductTitleFromConfigurator(productKey, productData);
    });
  });
}

function setupProductGallery(images) {
  currentProductImages = images || [];
  currentGalleryIndex = 0;

  const slides = document.querySelectorAll(".gallery-slide");
  const thumbsContainer = document.querySelector(".gallery-thumbs");

  if (!slides.length || !currentProductImages.length) return;

  slides[0].src = currentProductImages[0].src;
  slides[0].alt = currentProductImages[0].alt || "";
  slides[0].classList.add("is-visible");

  if (slides[1]) {
    slides[1].src = currentProductImages[1] ? currentProductImages[1].src : currentProductImages[0].src;
    slides[1].alt = currentProductImages[1] ? currentProductImages[1].alt : "";
    slides[1].classList.remove("is-visible");
  }

  if (thumbsContainer) {
    thumbsContainer.innerHTML = "";
    currentProductImages.forEach((imgObj, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `thumb ${idx === 0 ? "is-active" : ""}`;
      btn.dataset.galleryIndex = String(idx);
      btn.setAttribute("aria-label", `Pokaż zdjęcie ${idx + 1}`);

      const img = document.createElement("img");
      img.src = imgObj.src;
      img.alt = "";
      img.width = 118;
      img.height = 86;

      btn.appendChild(img);
      thumbsContainer.appendChild(btn);

      btn.addEventListener("click", () => showGallerySlide(idx));
    });
  }
}

function showGallerySlide(index) {
  if (!currentProductImages.length) return;
  currentGalleryIndex = (index + currentProductImages.length) % currentProductImages.length;

  const slides = document.querySelectorAll(".gallery-slide");
  const thumbs = document.querySelectorAll(".gallery-thumbs .thumb");

  if (slides.length >= 2) {
    const visibleSlide = document.querySelector(".gallery-slide.is-visible") || slides[0];
    const nextSlide = visibleSlide === slides[0] ? slides[1] : slides[0];

    nextSlide.src = currentProductImages[currentGalleryIndex].src;
    nextSlide.alt = currentProductImages[currentGalleryIndex].alt || "";

    nextSlide.classList.add("is-visible");
    visibleSlide.classList.remove("is-visible");
  }

  thumbs.forEach((t, i) => {
    t.classList.toggle("is-active", i === currentGalleryIndex);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const catalogCards = document.querySelectorAll("[data-product-select]");
  const productSection = document.getElementById("produkt");
  const configuratorForm = productSection ? productSection.querySelector(".configurator") : null;
  const tankSpecsSection = document.getElementById("tankSpecificSection");

  document.querySelector("[data-gallery-prev]")?.addEventListener("click", () => {
    showGallerySlide(currentGalleryIndex - 1);
  });
  document.querySelector("[data-gallery-next]")?.addEventListener("click", () => {
    showGallerySlide(currentGalleryIndex + 1);
  });

  catalogCards.forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.productSelect;
      const data = PRODUCTS_DATABASE[key];

      if (!data || !productSection) return;

      catalogCards.forEach(c => c.classList.remove("is-active"));
      card.classList.add("is-active");

      const titleElem = document.getElementById("productTitle");
      const subtitleElem = productSection.querySelector(".subtitle");
      const leadElem = productSection.querySelector(".lead");

      if (subtitleElem) subtitleElem.textContent = data.subtitle;
      if (leadElem) leadElem.textContent = data.lead;

      const propsGrid = productSection.querySelector(".property-grid");
      if (propsGrid && data.props) {
        propsGrid.innerHTML = data.props.map(p => `<span>${p}</span>`).join("");
      }

      if (tankSpecsSection) {
        if (key === "zbiorniki-retencyjne") {
          tankSpecsSection.removeAttribute("hidden");
        } else {
          tankSpecsSection.setAttribute("hidden", "true");
        }
      }

      if (configuratorForm) {
        configuratorForm.innerHTML = "";
        
        data.options.forEach((opt) => {
          const label = document.createElement("label");
          label.textContent = opt.name;
          
          const select = document.createElement("select");
          select.dataset.productOption = opt.name;
          opt.values.forEach((val) => {
            const option = document.createElement("option");
            option.value = val;
            option.textContent = val;
            select.appendChild(option);
          });
          
          label.appendChild(select);
          configuratorForm.appendChild(label);
        });

        syncProductTitleFromConfigurator(key, data);
        initCustomSelects();
        bindConfiguratorTitleSync(key, data, configuratorForm);

        const qtyDiv = document.createElement("div");
        qtyDiv.className = "quantity";
        qtyDiv.innerHTML = `
          <span>Liczba sztuk</span>
          <div class="quantity-controls">
            <button type="button" data-qty-minus>-</button>
            <output id="quantityOutput">1</output>
            <button type="button" data-qty-plus>+</button>
          </div>
        `;
        configuratorForm.appendChild(qtyDiv);

        const badgeElem = productSection.querySelector(".badge-promo-flag");
        if (badgeElem) {
          if (data.badge) {
            badgeElem.textContent = data.badge;
            badgeElem.style.display = "inline-block";
          } else {
            badgeElem.style.display = "none";
          }
        }

        qtyDiv.querySelector("[data-qty-minus]")?.addEventListener("click", () => {
          const out = qtyDiv.querySelector("#quantityOutput");
          if (out) out.textContent = String(Math.max(1, Number(out.textContent) - 1));
        });
        qtyDiv.querySelector("[data-qty-plus]")?.addEventListener("click", () => {
          const out = qtyDiv.querySelector("#quantityOutput");
          if (out) out.textContent = String(Number(out.textContent) + 1);
        });
      }

      setupProductGallery(data.images);

      productSection.removeAttribute("hidden");

      productSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const yearElem = document.getElementById("year");
  if (yearElem) {
    yearElem.textContent = String(new Date().getFullYear());
  }
});
