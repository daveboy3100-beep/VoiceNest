const usageData = {
  voice: {
    used: 0,
    limit: 5
  },
  image: {
    used: 0,
    limit: 3
  },
  script: {
    used: 0,
    limit: 5
  },
  prompt: {
    used: 0,
    limit: null
  }
};


/* =========================
   USAGE
========================= */

function updateUsageItem(type) {
  const data = usageData[type];

  if (!data) return;

  const usedElement = document.getElementById(`${type}Used`);
  const limitElement = document.getElementById(`${type}Limit`);
  const progressElement = document.getElementById(`${type}Progress`);
  const remainingElement = document.getElementById(`${type}Remaining`);

  if (!usedElement || !limitElement || !progressElement || !remainingElement) {
    return;
  }

  usedElement.textContent = data.used;

  if (data.limit === null) {
    limitElement.textContent = "Unlimited";
    progressElement.style.width = "0%";
    remainingElement.textContent = "Unlimited";
    return;
  }

  limitElement.textContent = data.limit;

  const percentage = Math.min(
    (data.used / data.limit) * 100,
    100
  );

  progressElement.style.width = `${percentage}%`;

  const remaining = Math.max(
    data.limit - data.used,
    0
  );

  remainingElement.textContent = `${remaining} remaining`;
}


function updateDashboardUsage() {
  updateUsageItem("voice");
  updateUsageItem("image");
  updateUsageItem("script");
}


/* =========================
   DASHBOARD NAVIGATION
========================= */

const navItems = document.querySelectorAll(".nav-item[data-view]");
const views = document.querySelectorAll(".view[data-view-section]");


function showView(viewName) {
  views.forEach((view) => {
    const isActive = view.dataset.viewSection === viewName;

    view.classList.toggle("active", isActive);
    view.hidden = !isActive;
  });

  navItems.forEach((item) => {
    const isActive = item.dataset.view === viewName;

    item.classList.toggle("active", isActive);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const viewName = item.dataset.view;

    if (!viewName) return;

    showView(viewName);
  });
});


/* =========================
   INITIALIZE
========================= */

function initializeDashboard() {
  showView("home");
  updateDashboardUsage();
}


document.addEventListener("DOMContentLoaded", initializeDashboard);
