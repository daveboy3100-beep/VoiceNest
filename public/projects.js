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
function createProjectCard(project) {
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

      const existingMenu =
        projectCard.querySelector(
          ".project-options-menu"
        );

      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const projectOptionsMenu =
        document.createElement("div");

      projectOptionsMenu.className =
        "project-options-menu";
const renameProjectButton =
  document.createElement("button");

renameProjectButton.type = "button";
renameProjectButton.textContent =
  "Rename project";
renameProjectButton.className =
  "rename-project-button";

renameProjectButton.addEventListener(
  "click",
  (menuEvent) => {
    menuEvent.stopPropagation();

    const newProjectName =
      window.prompt(
        "Rename project:",
        project.name
      );

    if (newProjectName === null) {
      return;
    }

    const trimmedProjectName =
      newProjectName.trim();

    if (!trimmedProjectName) {
      return;
    }

    const currentProjects =
      JSON.parse(
        localStorage.getItem(
          PROJECTS_STORAGE_KEY
        )
      ) || [];

    const updatedProjects =
      currentProjects.map(
        (savedProject) => {
          if (savedProject.id !== project.id) {
            return savedProject;
          }

          return {
            ...savedProject,
            name: trimmedProjectName
          };
        }
      );

    localStorage.setItem(
      PROJECTS_STORAGE_KEY,
      JSON.stringify(updatedProjects)
    );

    project.name =
      trimmedProjectName;

    const projectTitle =
      projectCard.querySelector("h2");

    if (projectTitle) {
      projectTitle.textContent =
        trimmedProjectName;
    }
  }
);
      const deleteProjectButton =
        document.createElement("button");

      deleteProjectButton.type = "button";
      deleteProjectButton.textContent =
        "Delete project";
      deleteProjectButton.className =
        "delete-project-button";

      deleteProjectButton.addEventListener(
        "click",
        (menuEvent) => {
          menuEvent.stopPropagation();

          const confirmDelete =
            window.confirm(
              `Delete "${project.name}"?`
            );

          if (!confirmDelete) {
            return;
          }

          const currentProjects =
            JSON.parse(
              localStorage.getItem(
                PROJECTS_STORAGE_KEY
              )
            ) || [];

          const updatedProjects =
            currentProjects.filter(
              (savedProject) =>
                savedProject.id !== project.id
            );

          localStorage.setItem(
            PROJECTS_STORAGE_KEY,
            JSON.stringify(updatedProjects)
          );

          projectCard.remove();

          if (emptyState) {
            emptyState.style.display =
              updatedProjects.length === 0
                ? "block"
                : "none";
          }
        }
      );

      projectOptionsMenu.appendChild(
  renameProjectButton
);

projectOptionsMenu.appendChild(
  deleteProjectButton
);

      projectCard.appendChild(
        projectOptionsMenu
      );
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

  return projectCard;
    }
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
      createProjectCard(project);

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
  createProjectCard(newProject);

projectsList.appendChild(
  projectCard
);

if (emptyState) {
  emptyState.style.display = "none";
}

        

    
closeProjectModalHandler();
  }
);
