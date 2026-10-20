(() => {
  "use strict";

  const config = window.VEBORA_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const form = document.querySelector("#leadForm");
  const status = document.querySelector("#formStatus");
  const submit = document.querySelector("#submitLead");
  const planField = document.querySelector("#selectedPlan");
  const menuToggle = document.querySelector("#menuToggle");
  const menu = document.querySelector("#mainNav");
  const projectGrid = document.querySelector("#projectGrid");
  const projectDialog = document.querySelector("#projectDialog");
  const projectDialogContent = document.querySelector("#projectDialogContent");
  const formStartedAt = form?.elements.formStartedAt;
  let isSubmitting = false;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch { return ""; }
  };

  const locale = config.locale?.default;
  if (locale && config.locale?.supported?.includes(locale)) {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }
  document.querySelector("#year").textContent = String(new Date().getFullYear());

  document.querySelectorAll("[data-price]").forEach((element) => {
    const amount = config.pricingUzs?.[element.dataset.price];
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      element.textContent = `от ${new Intl.NumberFormat("ru-RU").format(amount)} сум`;
    } else if (typeof amount === "string" && amount.trim()) {
      element.textContent = amount.trim();
    } else {
      element.textContent = "Стоимость по запросу";
    }
  });

  const visualMarkup = {
    atelier: '<div class="atelier-top" aria-hidden="true"><span>FORM / OBJECTS</span><span>CONCEPT / 01</span></div><div class="atelier-title" aria-hidden="true">Quiet<br><em>forms.</em></div><div class="atelier-vase vase-one" aria-hidden="true"></div><div class="atelier-vase vase-two" aria-hidden="true"></div><div class="atelier-caption" aria-hidden="true">MADE WITH INTENTION</div>',
    cafe: '<div class="cafe-menu" aria-hidden="true">SLOW MORNING<br>GOOD COFFEE</div><div class="coffee-cup" aria-hidden="true"><span></span></div><div class="cafe-bottom" aria-hidden="true">COFFEE SHOP / CONCEPT</div>',
    barber: '<div class="barber-mark" aria-hidden="true">CUT<br><i>THE</i><br>NOISE.</div><div class="barber-circle" aria-hidden="true"></div><div class="barber-small" aria-hidden="true">BARBER<br>STUDIO</div>',
    portrait: '<div class="portrait-kicker" aria-hidden="true">PORTFOLIO / CONCEPT</div><div class="portrait-title" aria-hidden="true">Made<br>to <span>matter.</span></div><div class="portrait-shape" aria-hidden="true"></div><div class="portrait-foot" aria-hidden="true">PERSONAL BRAND / DIGITAL PORTFOLIO</div>'
  };

  function renderProjects() {
    if (!projectGrid || !Array.isArray(config.projects)) return;
    projectGrid.innerHTML = config.projects.map((project, index) => {
      const slug = escapeHtml(project.slug);
      const visual = ["atelier", "cafe", "barber", "portrait"].includes(project.visual) ? project.visual : "atelier";
      const category = escapeHtml(project.category);
      const name = escapeHtml(project.name);
      const description = escapeHtml(project.description);
      const alt = escapeHtml(project.coverAlt);
      return `<div class="col-lg-6 reveal is-visible"><article class="project-card project-${visual}">
        <div class="project-visual ${visual}-visual" role="img" aria-label="${alt}">${visualMarkup[visual]}</div>
        <div class="project-info"><div class="project-copy"><p class="project-category">${category}</p><h3>${name}</h3><p>${description}</p></div>
          <span class="project-status">Concept / Demo</span>
          <button class="project-open" type="button" data-project-slug="${slug}" aria-haspopup="dialog">Разобрать концепцию <i class="bi bi-arrow-up-right" aria-hidden="true"></i></button>
        </div></article></div>`;
    }).join("");
  }
  renderProjects();

  function caseLink(label, value) {
    const href = safeUrl(value);
    if (!href) return `<span class="case-link-unavailable"><strong>${escapeHtml(label)}:</strong> пока не опубликовано</span>`;
    return `<a class="case-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(label)}:</strong> открыть <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>`;
  }

  function openProject(slug) {
    const project = config.projects?.find((item) => item.slug === slug);
    if (!project || !projectDialog || !projectDialogContent) return;
    const list = (items) => Array.isArray(items) ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "";
    const stack = Array.isArray(project.stack) ? project.stack.map((item) => `<span class="tech-chip">${escapeHtml(item)}</span>`).join("") : "";
    projectDialogContent.innerHTML = `
      <p class="eyebrow">${escapeHtml(project.category)} · CONCEPT / DEMO</p>
      <h2 id="projectDialogTitle">${escapeHtml(project.name)}</h2>
      <p class="case-lead">${escapeHtml(project.description)}</p>
      <div class="case-grid">
        <section><h3>Задача концепции</h3><p>${escapeHtml(project.objective)}</p></section>
        <section><h3>Визуальное решение</h3><p>${escapeHtml(project.solution)}</p></section>
        <section><h3>Что реализовано в портфолио</h3><ul>${list(project.features)}</ul></section>
        <section><h3>Технологии этой витрины</h3><div class="tech-list">${stack}</div><p class="case-note">Стек относится к карточке и окну кейса на сайте VEBORA. Отдельный сайт для концепции не собран.</p></section>
      </div>
      <p class="case-honesty">${escapeHtml(project.note)}</p>
      <div class="case-links">${caseLink("Демо", project.demoUrl)}${caseLink("Исходный код", project.sourceUrl)}</div>`;
    projectDialog.showModal();
    projectDialog.querySelector(".case-close").focus();
  }

  projectGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-slug]");
    if (button) openProject(button.dataset.projectSlug);
  });
  projectDialog?.querySelector(".case-close")?.addEventListener("click", () => projectDialog.close());
  projectDialog?.addEventListener("click", (event) => {
    if (event.target === projectDialog) projectDialog.close();
  });

  document.querySelectorAll(".choose-plan").forEach((button) => button.addEventListener("click", () => {
    planField.value = button.dataset.plan;
    document.querySelector("#contact").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth" });
    window.setTimeout(() => document.querySelector("#name").focus({ preventScroll: true }), reduceMotion.matches ? 0 : 350);
  }));

  function makeContactLink(url, label, icon) {
    const link = document.createElement("a");
    link.href = url;
    link.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i> ${escapeHtml(label)}`;
    if (url.startsWith("https:")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    return link;
  }
  const contactLinks = [];
  const github = safeUrl(config.contacts?.github);
  const telegram = safeUrl(config.contacts?.telegram);
  const instagram = safeUrl(config.contacts?.instagram);
  const email = config.contacts?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contacts.email)
    ? `mailto:${config.contacts.email}` : "";
  if (github && new URL(github).hostname === "github.com") contactLinks.push(makeContactLink(github, "GitHub", "bi-github"));
  if (telegram && new URL(telegram).hostname === "t.me") contactLinks.push(makeContactLink(telegram, "Telegram", "bi-telegram"));
  if (instagram && ["instagram.com", "www.instagram.com"].includes(new URL(instagram).hostname)) contactLinks.push(makeContactLink(instagram, "Instagram", "bi-instagram"));
  if (email) contactLinks.push(makeContactLink(email, "Email", "bi-envelope"));
  function renderContactLinks(id, emptyText) {
    const target = document.querySelector(id);
    target.replaceChildren(...(contactLinks.length ? contactLinks.map((link) => link.cloneNode(true)) : [Object.assign(document.createElement("span"), { textContent: emptyText })]));
  }
  renderContactLinks("#contactLinks", "Личные контакты пока не указаны. Отправьте заявку через форму.");
  renderContactLinks("#developerLinks", "Добавьте проверенные контакты в config.js.");
  renderContactLinks("#footerLinks", "Личные контакты не настроены.");

  const finalTelegram = document.querySelector("#finalTelegram");
  if (telegram && new URL(telegram).hostname === "t.me") {
    finalTelegram.href = telegram;
    finalTelegram.target = "_blank";
    finalTelegram.rel = "noopener noreferrer";
  } else {
    finalTelegram.innerHTML = 'Обсудить проект <i class="bi bi-arrow-up-right" aria-hidden="true"></i>';
    finalTelegram.href = "#contact";
  }

  function setMenuOpen(open) {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    menu.classList.toggle("show", open);
  }
  menuToggle.addEventListener("click", () => setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true"));
  document.querySelectorAll("#mainNav .nav-link").forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") setMenuOpen(false);
  });

  document.querySelectorAll(".accordion-button").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      const panel = document.querySelector(button.getAttribute("data-bs-target"));
      const wasOpen = button.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".accordion-button").forEach((otherButton) => {
        otherButton.setAttribute("aria-expanded", "false");
        otherButton.classList.add("collapsed");
        document.querySelector(otherButton.getAttribute("data-bs-target"))?.classList.remove("show");
      });
      if (!wasOpen && panel) {
        button.setAttribute("aria-expanded", "true");
        button.classList.remove("collapsed");
        panel.classList.add("show");
      }
    });
  });

  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    document.querySelectorAll(".reveal:not(.is-visible)").forEach((element) => observer.observe(element));
  } else {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
  }

  const backTop = document.querySelector("#backTop");
  window.addEventListener("scroll", () => backTop.classList.toggle("visible", window.scrollY > 600), { passive: true });
  backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" }));

  form?.addEventListener("input", (event) => {
    if (event.target.matches(".form-control,.form-select")) event.target.classList.remove("is-invalid");
  });

  formStartedAt.value = String(Date.now());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    status.className = "form-status";
    status.textContent = "";
    const required = [...form.querySelectorAll("[required]")];
    const contact = form.elements.contact.value.trim();
    let valid = form.checkValidity();
    required.forEach((field) => {
      if (!field.value.trim()) { field.classList.add("is-invalid"); valid = false; }
      else field.classList.remove("is-invalid");
    });
    const contactField = form.elements.contact;
    if (contact && contact.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      contactField.classList.add("is-invalid");
      valid = false;
      contactField.nextElementSibling.textContent = "Проверьте email или укажите другой способ связи.";
    } else {
      contactField.nextElementSibling.textContent = "Укажите способ связи.";
    }
    if (!valid) {
      status.className = "form-status error";
      status.textContent = "Проверьте поля, отмеченные красным.";
      form.querySelector(":invalid")?.focus();
      return;
    }
    const endpoint = typeof config.leadEndpoint === "string" ? config.leadEndpoint.trim() : "";
    if (!endpoint || !endpoint.startsWith("/api/")) {
      status.className = "form-status error";
      status.textContent = "Форма не настроена: заявка не отправлена.";
      return;
    }

    isSubmitting = true;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submit.innerHTML = 'Отправляем… <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>';
    status.className = "form-status info";
    status.textContent = "Передаём заявку…";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: form.elements.name.value.trim(),
          business: form.elements.business.value.trim(),
          siteType: form.elements.siteType.value,
          budget: form.elements.budget.value.trim(),
          task: form.elements.task.value.trim(),
          contact,
          plan: planField.value,
          website: form.elements.website.value.trim(),
          formStartedAt: Number(formStartedAt.value)
        }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true || result.saved !== true) {
        const error = new Error(result.message || "Не удалось сохранить заявку.");
        error.status = response.status;
        throw error;
      }
      status.className = "form-status success";
      if (result.notificationStatus === "sent") {
        status.textContent = "Заявка сохранена. Уведомление отправлено.";
      } else if (result.notificationStatus === "failed") {
        status.textContent = "Заявка сохранена в базе, но уведомление не отправилось. Мы проверим контакт позже.";
      } else if (result.notificationStatus === "not_configured") {
        status.textContent = "Заявка сохранена в базе. Уведомления Telegram пока не настроены.";
      } else {
        status.textContent = "Заявка сохранена. Спасибо!";
      }
      form.reset();
      planField.value = "";
      formStartedAt.value = String(Date.now());
    } catch (error) {
      status.className = "form-status error";
      if (error.status === 429) status.textContent = "Слишком много попыток. Подождите минуту и попробуйте снова.";
      else if (error.status === 400) status.textContent = "Проверьте данные формы и отправьте ещё раз.";
      else if (error.name === "AbortError") status.textContent = "Сервер не ответил вовремя. Проверьте соединение и попробуйте ещё раз.";
      else status.textContent = "Не удалось подтвердить сохранение заявки. Повторите позже или свяжитесь напрямую.";
    } finally {
      window.clearTimeout(timeout);
      isSubmitting = false;
      form.removeAttribute("aria-busy");
      submit.disabled = false;
      submit.innerHTML = 'Отправить заявку <i class="bi bi-arrow-up-right" aria-hidden="true"></i>';
    }
  });
})();
