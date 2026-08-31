// =========================================================
// SUPABASE CONNECTION
// =========================================================

const SUPABASE_URL =
  "https://okbipirfsusciztzstka.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_wp1MJ7xmnJjseGjFtM9PWQ_xQWRh7hW";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );



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
async (event) => {

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


    // =========================================================
// CREATE SUPABASE ACCOUNT
// =========================================================

signupButton.disabled = true;

signupButton.textContent =
  "Creating account...";

showMessage(
  "Creating your VoiceNest account..."
);


const {
  data,
  error
} = await supabaseClient.auth.signUp({
  email: email,
  password: password
});


if (error) {

  showMessage(
    error.message
  );

  signupButton.disabled = false;

  signupButton.textContent =
    "Create account";

  return;

}


// =========================================================
// SUCCESS
// =========================================================

signupButton.disabled = false;

signupButton.textContent =
  "Account created";


if (
  data.user &&
  data.session
) {

  showMessage(
    "Account created successfully. Redirecting..."
  );

  setTimeout(() => {

    window.location.href =
      "/dashboard.html";

  }, 1000);

} else {

  showMessage(
    "Account created! Please check your email to verify your account."
  );

        }

  }
);
