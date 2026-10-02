function getApiBaseUrl() {
  const isStaticPreview =
    window.location.protocol === "file:" || window.location.port === "4173";

  return isStaticPreview ? "http://localhost:3000" : "";
}

async function checkAuthentication() {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/check-auth`, {
      credentials: "include"
    });

    if (!response.ok) {
      window.location.href = "login.html";
    }
  } catch (error) {
    window.location.href = "login.html";
  }
}

checkAuthentication();

const leadsTableBody = document.getElementById("leadsTableBody");
const statusText = document.getElementById("statusText");
const leadCount = document.getElementById("leadCount");
const refreshButton = document.getElementById("refreshLeads");
const searchInput = document.getElementById("leadSearch");
const openChangePasswordButton = document.getElementById("openChangePassword");
const changePasswordModal = document.getElementById("changePasswordModal");
const closeChangePasswordButton = document.getElementById("closeModal");
const changePasswordForm = document.getElementById("changePasswordForm");
const changePasswordMessage = document.getElementById("changePasswordMessage");
const leadStatuses = ["New", "Contacted", "Joined", "Not Interested"];
let allLeads = [];

function setPasswordMessage(message, type = "error") {
  changePasswordMessage.textContent = message || "";
  changePasswordMessage.className = `form-message ${type}`.trim();
}

function openChangePasswordModal() {
  changePasswordModal.hidden = false;
  setPasswordMessage("");
  changePasswordForm.reset();
  const firstInput = changePasswordForm.querySelector('input[name="currentPassword"]');
  firstInput?.focus();
}

function closeChangePasswordModal() {
  changePasswordModal.hidden = true;
  changePasswordForm.reset();
  setPasswordMessage("");
}

if (openChangePasswordButton) {
  openChangePasswordButton.addEventListener("click", openChangePasswordModal);
}

if (closeChangePasswordButton) {
  closeChangePasswordButton.addEventListener("click", closeChangePasswordModal);
}

if (changePasswordModal) {
  changePasswordModal.addEventListener("click", (event) => {
    if (event.target === changePasswordModal) {
      closeChangePasswordModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !changePasswordModal?.hidden) {
    closeChangePasswordModal();
  }
});

changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(changePasswordForm);
  const currentPassword = String(formData.get("currentPassword") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    setPasswordMessage("Please fill in all password fields.");
    return;
  }

  if (newPassword.length < 8) {
    setPasswordMessage("New password must be at least 8 characters long.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setPasswordMessage("New password and confirm password do not match.");
    return;
  }

  setPasswordMessage("Updating password...");

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/change-password`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        oldPassword: currentPassword,
        newPassword
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to update password.");
    }

    changePasswordForm.reset();
    setPasswordMessage(result.message || "Password updated successfully.", "success");
  } catch (error) {
    setPasswordMessage(error.message || "Unable to update password.");
  }
});

function formatDate(value) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStatusOptions(currentStatus) {
  const normalizedStatus = leadStatuses.includes(currentStatus) ? currentStatus : "New";

  return leadStatuses
    .map((status) => {
      const selected = status === normalizedStatus ? "selected" : "";
      return `<option value="${escapeHtml(status)}" ${selected}>${escapeHtml(status)}</option>`;
    })
    .join("");
}

function renderLeads(leads) {
  leadCount.textContent = leads.length;

  if (!leads.length) {
    statusText.textContent = searchInput.value.trim()
      ? "No leads match your search."
      : "No leads found yet.";
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="muted-cell">No trial registrations have been submitted yet.</td>
      </tr>
    `;
    return;
  }

  statusText.textContent = `Showing ${leads.length} lead${leads.length === 1 ? "" : "s"}.`;
  leadsTableBody.innerHTML = leads
    .map((lead) => {
      const fitnessGoal = lead.fitness_goal || "Not provided";

      return `
        <tr>
          <td>${escapeHtml(lead.id)}</td>
          <td>${escapeHtml(lead.full_name)}</td>
          <td>${escapeHtml(lead.age)}</td>
          <td>${escapeHtml(lead.gender || "Not provided")}</td>
          <td>${escapeHtml(lead.contact_number)}</td>
          <td class="goal-cell">${escapeHtml(fitnessGoal)}</td>
          <td>
            <select class="status-select" data-lead-id="${escapeHtml(lead.id)}" aria-label="Lead status for ${escapeHtml(lead.full_name)}">
              ${renderStatusOptions(lead.lead_status)}
            </select>
          </td>
          <td>${escapeHtml(formatDate(lead.created_at))}</td>
          <td>
            <button class="delete-btn" type="button" data-lead-id="${escapeHtml(lead.id)}" data-lead-name="${escapeHtml(lead.full_name)}">
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderLeads(allLeads);
    return;
  }

  const filteredLeads = allLeads.filter((lead) => {
    const name = String(lead.full_name || "").toLowerCase();
    const contactNumber = String(lead.contact_number || "").toLowerCase();

    return name.includes(query) || contactNumber.includes(query);
  });

  renderLeads(filteredLeads);
}

async function loadLeads() {
  statusText.textContent = "Loading leads...";
  refreshButton.disabled = true;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/leads`, {
      credentials: "include"
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to fetch leads.");
    }

    allLeads = result;
    applySearch();
  } catch (error) {
    leadCount.textContent = "0";
    statusText.textContent = error.message || "Unable to fetch leads.";
    statusText.classList.add("status-error");
    leadsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="muted-cell">Check that the Node server and MySQL database are running.</td>
      </tr>
    `;
  } finally {
    refreshButton.disabled = false;
  }
}

async function updateLeadStatus(leadId, leadStatus) {
  statusText.classList.remove("status-error");
  statusText.textContent = "Updating lead status...";

  const response = await fetch(`${getApiBaseUrl()}/api/leads/${leadId}/status`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ lead_status: leadStatus })
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to update lead status.");
  }

  statusText.textContent = result.message || "Lead status updated successfully.";
  await loadLeads();
}

async function deleteLead(leadId) {
  statusText.classList.remove("status-error");
  statusText.textContent = "Deleting lead...";

  const response = await fetch(`${getApiBaseUrl()}/api/leads/${leadId}`, {
    method: "DELETE",
    credentials: "include"
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to delete lead.");
  }

  statusText.textContent = result.message || "Lead deleted successfully.";
  await loadLeads();
}

refreshButton.addEventListener("click", () => {
  statusText.classList.remove("status-error");
  loadLeads();
});

searchInput.addEventListener("input", applySearch);

leadsTableBody.addEventListener("change", async (event) => {
  const statusSelect = event.target.closest(".status-select");

  if (!statusSelect) return;

  statusSelect.disabled = true;

  try {
    await updateLeadStatus(statusSelect.dataset.leadId, statusSelect.value);
  } catch (error) {
    statusText.textContent = error.message || "Unable to update lead status.";
    statusText.classList.add("status-error");
    statusSelect.disabled = false;
  }
});

leadsTableBody.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest(".delete-btn");

  if (!deleteButton) return;

  const leadName = deleteButton.dataset.leadName || "this lead";
  const confirmed = window.confirm(`Delete ${leadName}? This action cannot be undone.`);

  if (!confirmed) return;

  deleteButton.disabled = true;

  try {
    await deleteLead(deleteButton.dataset.leadId);
  } catch (error) {
    statusText.textContent = error.message || "Unable to delete lead.";
    statusText.classList.add("status-error");
    deleteButton.disabled = false;
  }
});

loadLeads();


const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async () => {
  try {
    await fetch(`${getApiBaseUrl()}/api/logout`, {
      method: "POST",
      credentials: "include"
    });

    window.location.href = "login.html";
  } catch (error) {
    alert("Logout failed.");
  }
});