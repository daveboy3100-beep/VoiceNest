const createProjectButton =
  document.getElementById("createProjectButton");

const projectsList =
  document.getElementById("projectsList");
const createProjectModal =
  document.getElementById("createProjectModal");

const modalBackdrop =
  document.getElementById("modalBackdrop");

const closeProjectModal =
  document.getElementById("closeProjectModal");

const cancelProjectButton =
  document.getElementById("cancelProjectButton");

const createProjectForm =
  document.getElementById("createProjectForm");

const projectNameInput =
  document.getElementById("projectName");
const projectDescriptionInput =
  document.getElementById("projectDescription");
function openProjectModal() {
  createProjectModal.classList.remove("hidden");
  createProjectModal.setAttribute("aria-hidden", "false");

  projectNameInput.value = "";
  projectNameInput.focus();
}

function closeProjectModalHandler() {
  createProjectModal.classList.add("hidden");
  createProjectModal.setAttribute("aria-hidden", "true");
}
createProjectButton.addEventListener(
  "click",
  openProjectModal
);

closeProjectModal.addEventListener(
  "click",
  closeProjectModalHandler
);

cancelProjectButton.addEventListener(
  "click",
  closeProjectModalHandler
);

modalBackdrop.addEventListener(
  "click",
  closeProjectModalHandler
);

console.log("VoiceNest Projects loaded");

document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Projects page ready");
  }
);
createProjectForm.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    const projectName =
      projectNameInput.value.trim();
const projectDescription =
  projectDescriptionInput.value.trim();
    if (!projectName) {
      return;
    }

    const projectCard =
  document.createElement("article");

projectCard.className =
  "project-card";
projectCard.addEventListener(
  "click",
  () => {
    console.log(
      "Project opened:",
      projectName
    );
  }
);
projectCard.innerHTML = `
  <h2>${projectName}</h2>

  ${
    projectDescription
      ? `<p>${projectDescription}</p>`
      : ""
  }
`;
projectsList.appendChild(
  projectCard
);

closeProjectModalHandler();
  }
);
