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


async function updateDashboardUsage() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      updateUsageItem("voice");
      updateUsageItem("image");
      updateUsageItem("script");
      return;
    }

    const response = await fetch("/api/usage", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load usage.");
    }

    if (data.voice) {
      usageData.voice.used = data.voice.used;
      usageData.voice.limit = data.voice.limit;
    }

    if (data.script) {
      usageData.script.used = data.script.used;
      usageData.script.limit = data.script.limit;
    }

    updateUsageItem("voice");
    updateUsageItem("image");
    updateUsageItem("script");

  } catch (error) {
    console.error("Dashboard usage error:", error);

    updateUsageItem("voice");
    updateUsageItem("image");
    updateUsageItem("script");
  }
      }

async function loadRecentCreations() {
  const recentCreations = document.getElementById("recentCreations");

  if (!recentCreations) return;

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    const response = await fetch("/api/saved-scripts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to load recent creations."
      );
    }

    const scripts = Array.isArray(data)
      ? data
      : data.scripts || [];

    if (!scripts.length) {
      return;
    }

    const recentScripts = scripts.slice(0, 3);

    recentCreations.innerHTML = `
      <div class="recent-list">
        ${recentScripts.map((script) => `
          <a
            href="/scripts.html"
            class="recent-item"
          >
            <div class="recent-item-content">
              <span class="recent-item-type">
                Script
              </span>

              <h3>
                ${escapeHtml(
                  script.title || "Untitled Script"
                )}
              </h3>

              <p>
                ${escapeHtml(
                  script.topic || "Saved script"
                )}
              </p>
            </div>

            <span class="recent-item-arrow">→</span>
          </a>
        `).join("")}
      </div>

      <a
        href="/scripts.html"
        class="view-all-link"
      >
        View all scripts →
      </a>
    `;

  } catch (error) {
    console.error(
      "Recent creations error:",
      error
    );
  }
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
loadRecentCreations();

document.addEventListener("DOMContentLoaded", initializeDashboard);
