(() => {
  "use strict";
  const config = window.VEBORA_CONFIG || {contacts:{},pricing:{},leadEndpoint:"/api/leads"};
  const form = document.querySelector("#leadForm");
  const status = document.querySelector("#formStatus");
  const submit = document.querySelector("#submitLead");
  const planField = document.querySelector("#selectedPlan");
  const menuToggle = document.querySelector("#menuToggle");
  const menu = document.querySelector("#mainNav");
  const safeUrl = (value, allowed) => {
    try { const url = new URL(value); return allowed.includes(url.protocol) ? url.href : ""; } catch { return ""; }
  };

  document.querySelector("#year").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-price]").forEach((el) => {
    const value = config.pricing?.[el.dataset.price];
    if (typeof value === "string" && value.trim()) el.textContent = value;
  });
  document.querySelectorAll(".choose-plan").forEach((button) => button.addEventListener("click", () => {
    planField.value = button.dataset.plan;
    document.querySelector("#contact").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    window.setTimeout(() => document.querySelector("#name").focus({preventScroll:true}), 350);
  }));

  const contactLinks = [];
  const telegram = safeUrl(config.contacts?.telegram, ["https:"]);
  const instagram = safeUrl(config.contacts?.instagram, ["https:"]);
  const email = safeUrl(config.contacts?.email ? `mailto:${config.contacts.email}` : "", ["mailto:"]);
  if (telegram && new URL(telegram).hostname === "t.me") contactLinks.push(`<a href="${telegram}" target="_blank" rel="noopener noreferrer"><i class="bi bi-telegram"></i> Telegram</a>`);
  if (instagram && ["instagram.com", "www.instagram.com"].includes(new URL(instagram).hostname)) contactLinks.push(`<a href="${instagram}" target="_blank" rel="noopener noreferrer"><i class="bi bi-instagram"></i> Instagram</a>`);
  if (email) contactLinks.push(`<a href="${email}"><i class="bi bi-envelope"></i> Email</a>`);
  const emptyMessage = "Контакты ещё не настроены. Укажите ссылку или адрес в config.js.";
  document.querySelector("#contactLinks").innerHTML = contactLinks.join("") || `<span>${emptyMessage}</span>`;
  document.querySelector("#footerLinks").innerHTML = contactLinks.join("") || `<span class="footer-muted">Настройте контакты в config.js</span>`;
  const finalTelegram = document.querySelector("#finalTelegram");
  if (telegram && new URL(telegram).hostname === "t.me") { finalTelegram.href = telegram; finalTelegram.target = "_blank"; finalTelegram.rel = "noopener noreferrer"; }
  else {
    finalTelegram.innerHTML = 'Обсудить проект <i class="bi bi-arrow-up-right"></i>';
    finalTelegram.href = "#leadForm";
  }

  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuToggle.setAttribute("aria-label", expanded ? "Открыть меню" : "Закрыть меню");
    menu.classList.toggle("show", !expanded);
  });
  document.querySelectorAll("#mainNav .nav-link").forEach((link) => link.addEventListener("click", () => {
    menu.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть меню");
  }));
  document.querySelectorAll(".accordion-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".accordion-button").forEach((button) => button.addEventListener("click", () => {
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
  }));

  const observer = "IntersectionObserver" in window ? new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); obs.unobserve(entry.target); } });
  }, {threshold:.12, rootMargin:"0px 0px -30px 0px"}) : null;
  document.querySelectorAll(".reveal").forEach((el) => observer ? observer.observe(el) : el.classList.add("is-visible"));

  const backTop = document.querySelector("#backTop");
  window.addEventListener("scroll", () => backTop.classList.toggle("visible", window.scrollY > 600), {passive:true});
  backTop.addEventListener("click", () => window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
  form.addEventListener("input", (event) => {
    if (event.target.matches(".form-control,.form-select")) event.target.classList.remove("is-invalid");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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
      contactField.classList.add("is-invalid"); valid = false;
      contactField.nextElementSibling.textContent = "Проверьте email или укажите другой способ связи.";
    } else contactField.nextElementSibling.textContent = "Укажите способ связи.";
    if (!valid) {
      status.className = "form-status error";
      status.textContent = "Проверьте поля, отмеченные красным.";
      form.querySelector(":invalid")?.focus();
      return;
    }
    const endpoint = typeof config.leadEndpoint === "string" ? config.leadEndpoint.trim() : "";
    if (!endpoint || !endpoint.startsWith("/api/")) {
      status.className = "form-status info";
      status.textContent = "Форма заполнена. Для передачи заявки нужен backend: сейчас данные никуда не отправлены. Можно настроить прямой контакт в config.js.";
      return;
    }
    submit.disabled = true;
    submit.innerHTML = 'Отправляем… <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>';
    status.className = "form-status info";
    status.textContent = "Передаём заявку…";
    try {
      const response = await fetch(endpoint, {
        method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({name:form.elements.name.value.trim(),business:form.elements.business.value.trim(),siteType:form.elements.siteType.value,budget:form.elements.budget.value.trim(),task:form.elements.task.value.trim(),contact,plan:planField.value})
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success !== true) throw new Error("Server did not confirm submission");
      status.className = "form-status success";
      status.textContent = "Заявка отправлена. Спасибо!";
      form.reset(); planField.value = "";
    } catch {
      status.className = "form-status error";
      status.textContent = "Не удалось передать заявку. Попробуйте позже или свяжитесь напрямую.";
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Отправить заявку <i class="bi bi-arrow-up-right"></i>';
    }
  });
})();
