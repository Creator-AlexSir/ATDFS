import { Navigation } from "./ui.js";
import { initAuth } from "./auth.js";
import { initDashboard } from "./dashboard.js";
import { initJournal } from "./journal.js";
import { initReports } from "./reports.js";

document.addEventListener("DOMContentLoaded", () => {
  Navigation();
  initAuth();
  initDashboard();
  initJournal();
  initReports();
});
