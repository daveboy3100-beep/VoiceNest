const projectTitle =
  document.getElementById("projectTitle");

const projectDescriptionElement =
  document.getElementById("projectDescription");

const projectParams =
  new URLSearchParams(
    window.location.search
  );

const projectId =
  projectParams.get("id");

const PROJECTS_STORAGE_KEY =
  "voicenest_projects";

const projects =
  JSON.parse(
    localStorage.getItem(
      PROJECTS_STORAGE_KEY
    )
  ) || [];

const currentProject =
  projects.find(
    (project) =>
      project.id === projectId
  );
const currentProjectId =
  currentProject
    ? currentProject.id
    : null;
function getCurrentProject() {
  if (!currentProjectId) {
    return null;
  }

  return currentProject;
}
let projectScript = null;
if (!currentProject) {
  projectTitle.textContent =
    "Project not found";

  projectDescriptionElement.textContent =
    "This project does not exist or may have been deleted.";
}
const projectName =
  currentProject
    ? currentProject.name
    : null;

const projectDescription =
  currentProject
    ? currentProject.description
    : null;
if (projectName) {
  projectTitle.textContent =
    projectName;
}

if (projectDescription) {
  projectDescriptionElement.textContent =
    projectDescription;
} else {
  projectDescriptionElement.textContent =
    "Your project workspace.";
} 
console.log("VoiceNest Project Workspace loaded");

document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Project workspace ready");
  }
);
