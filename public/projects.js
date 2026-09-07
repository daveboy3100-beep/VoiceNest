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

  projects.forEach(
    (project) => {
      const projectCard =
        document.createElement("article");

      projectCard.className =
        "project-card";

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

      projectCard.innerHTML = `
        <h2>${project.name}</h2>

        ${
          project.description
            ? `<p>${project.description}</p>`
            : ""
        }
      `;

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
