const projectTitle =
  document.getElementById("projectTitle");

const projectDescription =
  document.getElementById("projectDescription");
const projectParams =
  new URLSearchParams(
    window.location.search
  );
const projectId =
  projectParams.get("id");
const projectName =
  currentProject
    ? currentProject.name
    : projectParams.get("name");

const projectDescription =
  currentProject
    ? currentProject.description
    : projectParams.get("description");
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
if (projectName) {
  projectTitle.textContent =
    projectName;
}

if (projectDescriptionText) {
  projectDescription.textContent =
    projectDescriptionText;
} else {
  projectDescription.textContent =
    "Your project workspace.";
}
console.log("VoiceNest Project Workspace loaded");

document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Project workspace ready");
  }
);
