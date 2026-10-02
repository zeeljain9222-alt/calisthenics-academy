// Main site JavaScript for Virar Calisthenics Academy
// Handles: mobile nav toggle, reveal animations, gallery lightbox,
// FAQ toggles, free trial form submission, and footer year.

// Helper: determine API base URL (works in file preview or deployed server)
function getApiBaseUrl() {
  const isStaticPreview = window.location.protocol === "file:" || window.location.port === "4173";
  return isStaticPreview ? "http://localhost:3000" : "";
}

// -----------------------------
// Mobile navigation toggle
// -----------------------------
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the mobile menu when a link is clicked
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// -----------------------------
// Reveal-on-scroll animations
// -----------------------------
const revealElements = document.querySelectorAll(".reveal");

if ('IntersectionObserver' in window && revealElements.length) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach((el) => revealObserver.observe(el));
} else {
  // Fallback: show all reveals if IntersectionObserver is not supported
  revealElements.forEach((el) => el.classList.add("visible"));
}

// -----------------------------
// Gallery lightbox
// -----------------------------
const galleryButtons = document.querySelectorAll(".gallery-item");
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox?.querySelector("img");
const lightboxClose = lightbox?.querySelector(".lightbox-close");

function openLightbox(src, alt) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt || "Gallery preview";
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  // Trap focus briefly by focusing close button
  setTimeout(() => lightboxClose?.focus(), 50);
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
}

galleryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const full = btn.dataset.full;
    const img = btn.querySelector("img");
    const alt = img?.alt || "Gallery preview";

    if (full) openLightbox(full, alt);
  });
});

if (lightbox) {
  lightbox.addEventListener("click", (e) => {
    // Close when clicking backdrop or close button
    if (e.target === lightbox || e.target === lightboxClose) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      closeLightbox();
    }
  });
}

// -----------------------------
// FAQ accordion toggles
// -----------------------------
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  item.setAttribute("aria-expanded", "false");

  item.addEventListener("click", () => {
    const isActive = item.classList.toggle("active");
    item.setAttribute("aria-expanded", String(isActive));
  });
});

// -----------------------------
// Free trial form submission
// -----------------------------
const trialForm = document.getElementById("trialForm");
const trialMessage = document.getElementById("trialMessage");

if (trialForm) {
  trialForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear previous message
    trialMessage.classList.remove("error");
    trialMessage.textContent = "Submitting...";

    const submitButton = trialForm.querySelector("button[type=submit]");
    submitButton.disabled = true;

    const formData = new FormData(trialForm);
    const payload = {
      fullName: String(formData.get("name") || "").trim(),
      age: Number(formData.get("age") || 0),
      gender: String(formData.get("gender") || "").trim(),
      contactNumber: String(formData.get("phone") || "").trim(),
      goal: String(formData.get("goal") || "").trim()
    };

    // Basic client-side validation
    if (!payload.fullName || !payload.age || !payload.contactNumber) {
      trialMessage.classList.add("error");
      trialMessage.textContent = "Please provide your name, age, and contact number.";
      submitButton.disabled = false;
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/book-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error((result && result.message) || "Unable to submit request.");
      }

      trialForm.reset();
      trialMessage.classList.remove("error");
      trialMessage.textContent = result?.message || "Trial request submitted. We'll contact you soon.";
    } catch (err) {
      trialMessage.classList.add("error");
      trialMessage.textContent = err.message || "Submission failed. Please try again later.";
    } finally {
      submitButton.disabled = false;
    }
  });
}

// -----------------------------
// Footer year update
// -----------------------------
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// End of script.js
