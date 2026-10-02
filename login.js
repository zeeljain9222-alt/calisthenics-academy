const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const passwordInput = document.getElementById("passwordInput");
const togglePassword = document.getElementById("togglePassword");

function getApiBaseUrl() {
  const isStaticPreview =
    window.location.protocol === "file:" || window.location.port === "4173";

  return isStaticPreview ? "http://localhost:3000" : "";
}

async function checkExistingSession() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/check-auth`, {
      credentials: "include"
    });

    if (response.ok) {
      window.location.href = "admin.html";
    }
  } catch (error) {
    // The login form remains available when the server is offline.
  }
}

togglePassword.addEventListener("click", () => {
  const isPasswordVisible = passwordInput.type === "text";

  passwordInput.type = isPasswordVisible ? "password" : "text";
  togglePassword.textContent = isPasswordVisible ? "Show" : "Hide";
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.classList.remove("error");
  loginMessage.textContent = "Signing in...";

  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get("username")?.trim(),
    password: formData.get("password")
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    console.log(response);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to log in.");
    }

    loginMessage.textContent = result.message || "Login successful.";
    window.location.href = "admin.html";
  } catch (error) {
    loginMessage.classList.add("error");
    loginMessage.textContent = error.message || "Unable to log in.";
  }
});

checkExistingSession();

