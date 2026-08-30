// =========================================================
// VOICENEST SIGN UP
// =========================================================

const signupForm =
  document.getElementById("signupForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const confirmPasswordInput =
  document.getElementById("confirmPassword");

const signupButton =
  document.getElementById("signupButton");

const signupMessage =
  document.getElementById("signupMessage");


// =========================================================
// MESSAGE
// =========================================================

function showMessage(message) {

  signupMessage.textContent =
    message;

}


// =========================================================
// SIGN UP
// =========================================================

signupForm.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();


    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    const confirmPassword =
      confirmPasswordInput.value;


    // -------------------------------------------------------
    // CHECK EMAIL
    // -------------------------------------------------------

    if (!email) {

      showMessage(
        "Please enter your email address."
      );

      emailInput.focus();

      return;

    }


    // -------------------------------------------------------
    // CHECK PASSWORD
    // -------------------------------------------------------

    if (!password) {

      showMessage(
        "Please enter a password."
      );

      passwordInput.focus();

      return;

    }


    // -------------------------------------------------------
    // PASSWORD LENGTH
    // -------------------------------------------------------

    if (password.length < 6) {

      showMessage(
        "Your password must be at least 6 characters."
      );

      passwordInput.focus();

      return;

    }


    // -------------------------------------------------------
    // CONFIRM PASSWORD
    // -------------------------------------------------------

    if (!confirmPassword) {

      showMessage(
        "Please confirm your password."
      );

      confirmPasswordInput.focus();

      return;

    }


    // -------------------------------------------------------
    // PASSWORD MATCH
    // -------------------------------------------------------

    if (password !== confirmPassword) {

      showMessage(
        "Passwords do not match."
      );

      confirmPasswordInput.focus();

      return;

    }


    // -------------------------------------------------------
    // TEMPORARY SUCCESS
    // -------------------------------------------------------

    showMessage(
      "Everything looks good. Ready to create your account."
    );

  }
);
