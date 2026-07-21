/*
  Для статического GitHub Pages используем внешний form relay.
  Если URL пустой, форма откроет предзаполненное письмо на адрес получателя.
*/
const LANDING_CONFIG = {
  submitEndpoint: "https://formsubmit.co/ajax/skorsakov.spb@gmail.com",
  recipientEmail: "skorsakov.spb@gmail.com"
};

const FORM_RELAY_META = {
  subject: "Кейс-заявка — Действенное видение",
  source: "Лендинг Сергея Корсакова",
  template: "table"
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

function getRelayErrorMessage(rawMessage) {
  const message = String(rawMessage || "");

  if (/needs Activation|Activate Form/i.test(message)) {
    return "Форма подключена, но адрес ещё не подтверждён. Сергею нужно открыть письмо от FormSubmit и нажать Activate Form, после чего заявки начнут уходить автоматически.";
  }

  if (/open this page through a web server/i.test(message)) {
    return "Локальная проверка relay доступна только через опубликованный сайт. На боевом URL форма уже подключена; для полноценной проверки используйте live-страницу.";
  }

  return "Не удалось отправить заявку. Повторите позже.";
}

function openMailDraft(payload) {
  if (!LANDING_CONFIG.recipientEmail) return false;

  const lines = [
    "Заявка на кейс-сессию «Действенное видение»",
    "",
    `Имя: ${payload.name}`,
    `Контакт: ${payload.contact}`,
    "",
    "Описание кейса:",
    payload.case
  ];

  const mailto = new URL(`mailto:${LANDING_CONFIG.recipientEmail}`);
  mailto.searchParams.set("subject", "Кейс-заявка — Действенное видение");
  mailto.searchParams.set("body", lines.join("\n"));
  window.location.href = mailto.toString();
  return true;
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

  const relayPayload = {
    name: payload.name,
    contact: payload.contact,
    case: payload.case,
    _subject: FORM_RELAY_META.subject,
    _template: FORM_RELAY_META.template,
    _cc: LANDING_CONFIG.recipientEmail,
    project: FORM_RELAY_META.source
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
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(relayPayload)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === "false") {
        throw new Error(result?.message || `HTTP ${response.status}`);
      }
      showStatus("Спасибо! Заявка отправлена Сергею. Он получит её без открытия почтового клиента.");
      form.reset();
    } else {
      const mailDraftOpened = openMailDraft(payload);
      if (!mailDraftOpened) throw new Error("Recipient email is not configured");
      showStatus("Открыли письмо на skorsakov.spb@gmail.com. Проверьте текст и нажмите отправить.");
    }
  } catch (error) {
    const message = LANDING_CONFIG.submitEndpoint
      ? getRelayErrorMessage(error?.message)
      : "Не удалось открыть письмо. Свяжитесь с нами по адресу skorsakov.spb@gmail.com.";
    showStatus(message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
    submitButton.innerHTML = initialButtonText;
  }
});
