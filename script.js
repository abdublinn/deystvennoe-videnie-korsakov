/*
  Перед публикацией укажите URL обработчика формы.
  Он должен принимать POST с JSON-полями: name, role, contact, case.
  Если URL пустой, демо-режим скопирует заявку в буфер обмена.
*/
const LANDING_CONFIG = {
  submitEndpoint: ""
};

const header = document.querySelector("[data-header]");
const setHeaderState = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

document.querySelector("[data-year]").textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -30px" });

  revealItems.forEach((item) => revealObserver.observe(item));
}

const accordion = document.querySelector("[data-accordion]");
accordion?.addEventListener("toggle", (event) => {
  if (event.target.tagName !== "DETAILS" || !event.target.open) return;
  accordion.querySelectorAll("details[open]").forEach((details) => {
    if (details !== event.target) details.open = false;
  });
}, true);

const form = document.querySelector("#lead-form");
const status = form?.querySelector(".form-status");

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
  status.classList.add("is-visible");
}

function setFieldInvalid(control, invalid) {
  const wrapper = control.closest(control.type === "checkbox" ? ".consent" : ".field");
  wrapper?.classList.toggle("is-invalid", invalid);
  control.setAttribute("aria-invalid", String(invalid));
}

function validateForm(formData) {
  let valid = true;

  ["name", "contact", "case"].forEach((fieldName) => {
    const control = form.querySelector(`[name="${fieldName}"]`);
    const invalid = !String(formData.get(fieldName) || "").trim();
    setFieldInvalid(control, invalid);
    if (invalid) valid = false;
  });

  const consent = form.querySelector('[name="consent"]');
  const consentInvalid = !formData.get("consent");
  setFieldInvalid(consent, consentInvalid);
  if (consentInvalid) valid = false;

  return valid;
}

form?.addEventListener("input", (event) => {
  setFieldInvalid(event.target, false);
});

form?.addEventListener("focusout", (event) => {
  const control = event.target;
  if (!control.matches("input[required]:not([type='checkbox']), textarea[required]")) return;
  setFieldInvalid(control, !control.value.trim());
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.classList.remove("is-visible", "is-error");

  const formData = new FormData(form);
  if (!validateForm(formData)) {
    showStatus("Проверьте обязательные поля.", true);
    form.querySelector(".is-invalid input, .is-invalid textarea, .consent.is-invalid input")?.focus();
    return;
  }

  const payload = {
    name: formData.get("name").trim(),
    contact: formData.get("contact").trim(),
    case: formData.get("case").trim()
  };

  const submitButton = form.querySelector("button[type='submit']");
  const initialButtonText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");
  submitButton.textContent = "Обрабатываем…";

  try {
    if (LANDING_CONFIG.submitEndpoint) {
      const response = await fetch(LANDING_CONFIG.submitEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showStatus("Спасибо! Заявка отправлена. Мы свяжемся с вами.");
      form.reset();
    } else {
      const applicationText = [
        "Заявка на лабораторию «Действенное видение»",
        `Имя: ${payload.name}`,
        `Контакт: ${payload.contact}`,
        `Кейс: ${payload.case}`
      ].join("\n");
      await navigator.clipboard.writeText(applicationText);
      showStatus("Демо-режим: заявка скопирована. Подключите адрес отправки в script.js перед публикацией.");
    }
  } catch (error) {
    const message = LANDING_CONFIG.submitEndpoint
      ? "Не удалось отправить заявку. Повторите позже."
      : "Браузер не дал скопировать заявку. Подключите адрес отправки в script.js.";
    showStatus(message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
    submitButton.innerHTML = initialButtonText;
  }
});
