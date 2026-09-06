/* =========================
   SUPABASE
========================= */

const SUPABASE_URL =
  "https://okbipirfsusciztzstka.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_wp1MJ7xmnJjseGjFtM9PWQ_xQWRh7hW";

let supabaseClient = null;

function initializeSupabase() {
  if (!window.supabase) {
    throw new Error(
      "Supabase library failed to load."
    );
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

  return supabaseClient;
}
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
    const { data: { session } } = await supabaseClient.auth.getSession();
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
    } = await supabaseClient.auth.getSession();
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
   ACCOUNT / AUTH
========================= */

const accountArea =
  document.querySelector(".account-area");

const accountButton =
  document.getElementById("accountButton");

const accountMenu =
  document.getElementById("accountMenu");

const accountEmail =
  document.getElementById("accountEmail");

const loginLink =
  document.getElementById("loginLink");

const signupLink =
  document.getElementById("signupLink");

const accountLogoutButton =
  document.getElementById("accountLogoutButton");

const settingsLogoutButton =
  document.getElementById("logoutButton");

async function updateAccountUI() {
  if (!supabaseClient) return;

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      accountEmail.textContent = "";
      loginLink.classList.remove("hidden");
      signupLink.classList.remove("hidden");
      accountLogoutButton.classList.add("hidden");

      return;
    }

    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    accountEmail.textContent =
      user?.email || "Signed in";

    loginLink.classList.add("hidden");
    signupLink.classList.add("hidden");
    accountLogoutButton.classList.remove("hidden");

  } catch (error) {
    console.error(
      "Account UI error:",
      error
    );
  }
}

accountButton.addEventListener(
  "click",
  () => {
    accountMenu.classList.toggle("hidden");
  }
);

async function logoutUser(button) {
  if (!supabaseClient) return;

  const confirmLogout =
    window.confirm(
      "Are you sure you want to log out?"
    );

  if (!confirmLogout) return;

  if (button) {
    button.disabled = true;
    button.textContent = "Logging out...";
  }

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error(
      "Logout error:",
      error
    );

    if (button) {
      button.disabled = false;
      button.textContent = "Log out";
    }

    return;
  }

  accountMenu.classList.add("hidden");

  if (button) {
    button.disabled = false;
    button.textContent = "Log out";
  }

  await updateAccountUI();
}

accountLogoutButton.addEventListener(
  "click",
  () => {
    logoutUser(accountLogoutButton);
  }
);

settingsLogoutButton.addEventListener(
  "click",
  () => {
    logoutUser(settingsLogoutButton);
  }
);


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

  try {
    initializeSupabase();
  } catch (error) {
    console.error(
      "Supabase initialization error:",
      error
    );
    return;
  }

    async function updateAccountUI() {
  if (!supabaseClient) return;

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {
      publicAuth.classList.add("hidden");
      accountArea.classList.remove("hidden");

      const {
        data: { user }
      } = await supabaseClient.auth.getUser();

      accountEmail.textContent =
        user?.email || "Signed in";

      return;
    }

    publicAuth.classList.remove("hidden");
    accountArea.classList.add("hidden");
    accountMenu.classList.add("hidden");
  } catch (error) {
    console.error(
      "Account UI error:",
      error
    );
  }
     }

  updateDashboardUsage();
  loadRecentCreations();
}

document.addEventListener(
  "DOMContentLoaded",
  initializeDashboard
);
