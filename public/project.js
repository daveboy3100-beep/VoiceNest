const projectTitle =
  document.getElementById("projectTitle");

const projectDescription =
  document.getElementById("projectDescription");
const projectParams =
  new URLSearchParams(
    window.location.search
  );

const projectName =
  projectParams.get("name");

const projectDescriptionText =
  projectParams.get("description");
console.log("VoiceNest Project Workspace loaded");

document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Project workspace ready");
  }
);
