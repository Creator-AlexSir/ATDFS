// Разграничение доступа по роли (SR-04).
// Менеджер по продажам — только просмотр, руководитель — может утверждать цену.
const READONLY_ROLES = ["manager", "security"];
const APPROVE_ROLE = "head";

let currentRole = "analyst";

export function getCurrentRole() {
  return currentRole;
}

function applyRole() {
  const adjustButton = document.getElementById("adjust-price");
  const approveButton = document.getElementById("approve-price");
  if (!adjustButton || !approveButton) return;

  adjustButton.classList.toggle(
    "hidden",
    READONLY_ROLES.includes(currentRole),
  );
  approveButton.classList.toggle("hidden", currentRole !== APPROVE_ROLE);
}

export function initAuth() {
  const select = document.getElementById("role-select");
  if (!select) return;

  currentRole = select.value || "analyst";
  applyRole();

  select.addEventListener("change", () => {
    currentRole = select.value;
    applyRole();
  });
}
