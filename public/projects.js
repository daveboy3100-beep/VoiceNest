const createProjectButton =
  document.getElementById("createProjectButton");

const projectsList =
  document.getElementById("projectsList");
const emptyState =
  projectsList.querySelector(".empty-state");
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
const PROJECTS_STORAGE_KEY =
  "voicenest_projects";
function openProjectModal() {
  createProjectModal.classList.remove("hidden");
  createProjectModal.setAttribute("aria-hidden", "false");

  projectNameInput.value = "";
projectDescriptionInput.value = "";

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

function loadProjects() {
  const projects =
    JSON.parse(
      localStorage.getItem(
        PROJECTS_STORAGE_KEY
      )
    ) || [];
if (emptyState) {
  emptyState.style.display =
    projects.length === 0
      ? "block"
      : "none";
}
  projects.forEach(
    (project) => {
      const projectCard =
  document.createElement("article");

projectCard.className =
  "project-card";

const projectCardHeader =
  document.createElement("div");

projectCardHeader.className =
  "project-card-header";

const projectTitle =
  document.createElement("h2");

projectTitle.textContent =
  project.name;

const projectMenuButton =
  document.createElement("button");

projectMenuButton.type = "button";
projectMenuButton.className =
  "project-menu-button";
projectMenuButton.setAttribute(
  "aria-label",
  "Project options"
);
projectMenuButton.textContent = "⋮";
projectMenuButton.addEventListener(
  "click",
  (event) => {
    event.stopPropagation();
  }
);
projectCardHeader.appendChild(
  projectTitle
);

projectCardHeader.appendChild(
  projectMenuButton
);

projectCard.appendChild(
  projectCardHeader
);

if (project.description) {
  const projectDescription =
    document.createElement("p");

  projectDescription.textContent =
    project.description;

  projectCard.appendChild(
    projectDescription
  );
  }
      projectCard.addEventListener(
        "click",
        () => {
          const projectParams =
            new URLSearchParams({
              id: project.id,
              name: project.name,
              description: project.description
            });

          window.location.href =
            `/project.html?${projectParams.toString()}`;
        }
      );

      

      projectsList.appendChild(
        projectCard
      );
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Projects page ready");
    loadProjects();
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
const projects =
  JSON.parse(
    localStorage.getItem(
      PROJECTS_STORAGE_KEY
    )
  ) || [];

const newProject = {
  id: Date.now().toString(),
  name: projectName,
  description: projectDescription
};

projects.push(newProject);

localStorage.setItem(
  PROJECTS_STORAGE_KEY,
  JSON.stringify(projects)
);
    const projectCard =
  document.createElement("article");

projectCard.className =
  "project-card";
projectCard.addEventListener(
  "click",
  () => {
    const projectParams =
      new URLSearchParams({
        name: projectName,
        description: projectDescription
      });

    window.location.href =
      `/project.html?${projectParams.toString()}`;
  }
);

projectsList.appendChild(
  projectCard
);

closeProjectModalHandler();
  }
);
