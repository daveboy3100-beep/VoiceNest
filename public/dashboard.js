// =========================================================
// VOICENEST DASHBOARD
// =========================================================

// =========================================================
// USAGE CONFIGURATION
// =========================================================

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


// =========================================================
// UPDATE USAGE ITEM
// =========================================================

function updateUsageItem(type) {

  const data = usageData[type];

  if (!data) {
    return;
  }


  // -------------------------------------------------------
  // Unlimited usage
  // -------------------------------------------------------

  if (data.limit === null) {
    return;
  }


  const usedElement =
    document.getElementById(
      `${type}Used`
    );

  const limitElement =
    document.getElementById(
      `${type}Limit`
    );

  const progressElement =
    document.getElementById(
      `${type}Progress`
    );

  const remainingElement =
    document.getElementById(
      `${type}Remaining`
    );


  if (
    !usedElement ||
    !limitElement ||
    !progressElement ||
    !remainingElement
  ) {
    return;
  }


  // -------------------------------------------------------
  // Update numbers
  // -------------------------------------------------------

  usedElement.textContent =
    data.used;

  limitElement.textContent =
    data.limit;


  // -------------------------------------------------------
  // Calculate progress
  // -------------------------------------------------------

  const percentage =
    Math.min(
      (data.used / data.limit) * 100,
      100
    );


  progressElement.style.width =
    `${percentage}%`;


  // -------------------------------------------------------
  // Remaining generations
  // -------------------------------------------------------

  const remaining =
    Math.max(
      data.limit - data.used,
      0
    );


  remainingElement.textContent =
    remaining === 1
      ? "1 remaining"
      : `${remaining} remaining`;


  // -------------------------------------------------------
  // Limit reached
  // -------------------------------------------------------

  if (data.used >= data.limit) {

    remainingElement.textContent =
      "Daily limit reached";

    progressElement.style.width =
      "100%";

  }

}


// =========================================================
// UPDATE ALL USAGE
// =========================================================

function updateDashboardUsage() {

  updateUsageItem("voice");

  updateUsageItem("image");

  updateUsageItem("script");

}


// =========================================================
// INITIALIZE DASHBOARD
// =========================================================

function initializeDashboard() {

  updateDashboardUsage();

}


// =========================================================
// START
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  initializeDashboard
);
