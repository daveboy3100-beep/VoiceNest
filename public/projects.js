const createProjectButton =
  document.getElementById("createProjectButton");

const projectsList =
  document.getElementById("projectsList");

console.log("VoiceNest Projects loaded");
createProjectButton.addEventListener(
  "click",
  () => {
    console.log("Create Project clicked");
  }
);
document.addEventListener(
  "DOMContentLoaded",
  () => {
    console.log("Projects page ready");
  }
);
