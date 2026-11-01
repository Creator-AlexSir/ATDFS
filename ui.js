export function Navigation() {
  document.addEventListener("click", (e) => {
    let clickedButton = e.target.closest(".nav-item");
    if (!clickedButton) return;
    let targetID = clickedButton.dataset.tab;
    document
      .querySelector(".tab-content:not(.hidden)")
      ?.classList.add("hidden");
    document.querySelector("#" + targetID)?.classList.remove("hidden");
    document.querySelector(".nav-item.active")?.classList.remove("active");
    clickedButton.classList.add("active");
  });
}
