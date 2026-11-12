(function () {
  function showMessage(text, type) {
    const el = document.getElementById("form-message");
    if (!el) return;
    el.textContent = text;
    el.className = "form-message " + (type || "error");
    el.hidden = false;
  }

  async function parseJsonSafe(response) {
    try {
      return await response.json();
    } catch (err) {
      return {};
    }
  }

  // --- Register ---
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        name: registerForm.name.value,
        email: registerForm.email.value,
        password: registerForm.password.value,
      };
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) return showMessage(data.message || "Registration failed", "error");
      window.location.href = "/dashboard";
    });
  }

  // --- Login ---
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = {
        email: loginForm.email.value,
        password: loginForm.password.value,
      };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) return showMessage(data.message || "Login failed", "error");
      window.location.href = "/dashboard";
    });
  }

  // --- Add / edit transaction ---
  const transactionForm = document.getElementById("transaction-form");
  if (transactionForm) {
    transactionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = transactionForm.dataset.id;
      const url = id ? `/api/transactions/${id}` : "/api/transactions";
      const method = id ? "PATCH" : "POST";
      const formData = new FormData(transactionForm);

      const res = await fetch(url, { method, body: formData });
      const data = await parseJsonSafe(res);
      if (!res.ok) return showMessage(data.message || "Could not save transaction", "error");
      window.location.href = `/transactions/${data.transaction._id}`;
    });
  }

  // --- Delete transaction (list + detail pages) ---
  document.querySelectorAll(".delete-transaction").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this transaction? This also removes its attachments.")) return;
      const id = btn.dataset.id;
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await parseJsonSafe(res);
        alert(data.message || "Could not delete transaction");
        return;
      }
      window.location.href = btn.dataset.redirect || "/transactions";
    });
  });

  // --- Delete attachment (detail page) ---
  document.querySelectorAll(".delete-attachment").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this attachment?")) return;
      const transactionId = btn.dataset.transactionId;
      const attachmentId = btn.dataset.attachmentId;
      const res = await fetch(`/api/transactions/${transactionId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await parseJsonSafe(res);
        alert(data.message || "Could not remove attachment");
        return;
      }
      window.location.reload();
    });
  });

  // --- Categories ---
  const categoryForm = document.getElementById("category-form");
  if (categoryForm) {
    categoryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = { name: categoryForm.name.value, type: categoryForm.type.value };
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) return showMessage(data.message || "Could not create category", "error");
      window.location.reload();
    });
  }

  document.querySelectorAll(".delete-category").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this category?")) return;
      const res = await fetch(`/api/categories/${btn.dataset.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await parseJsonSafe(res);
        alert(data.message || "Could not delete category");
        return;
      }
      window.location.reload();
    });
  });

  // Narrow the add/edit transaction category dropdown to match the selected type.
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("categoryId");
  if (typeSelect && categorySelect) {
    const options = Array.from(categorySelect.options);
    const applyFilter = () => {
      let selectedIsHidden = false;
      options.forEach((opt) => {
        if (!opt.value) return;
        opt.hidden = opt.dataset.type && opt.dataset.type !== typeSelect.value;
        if (opt.hidden && opt.selected) selectedIsHidden = true;
      });
      if (selectedIsHidden) categorySelect.value = "";
    };
    typeSelect.addEventListener("change", applyFilter);
    applyFilter();
  }
})();
