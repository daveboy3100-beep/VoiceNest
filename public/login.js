// Supabase configuration
const SUPABASE_URL = "https://okbipirfsusciztzstka.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wp1MJ7xmnJjseGjFtM9PWQ_xQWRh7hW";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// Elements
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");
const loginButton = document.getElementById("login-button");
const authMessage = document.getElementById("auth-message");

// Show / hide password
togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";
});

// Display authentication messages
function showMessage(message, type = "error") {
    authMessage.textContent = message;

    if (type === "success") {
        authMessage.style.color = "#72e6a5";
    } else {
        authMessage.style.color = "#ff7777";
    }
}

// Login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    authMessage.textContent = "";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showMessage(error.message);
            return;
        }

        if (!data.user) {
            showMessage("Login failed. Please try again.");
            return;
        }

        if (!data.user.email_confirmed_at) {
            await supabaseClient.auth.signOut();

            showMessage(
                "Please verify your email before logging in."
            );

            return;
        }

        showMessage("Login successful!", "success");

        setTimeout(() => {
            window.location.href = "/dashboard.html";
        }, 700);

    } catch (error) {
        console.error("Login error:", error);
        showMessage("Something went wrong. Please try again.");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log in";
    }
});
