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
  projectParams.get("name");

const projectDescriptionText =
  projectParams.get("description");
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
