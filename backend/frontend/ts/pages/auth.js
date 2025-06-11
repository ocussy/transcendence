"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthPage = void 0;
class AuthPage {
    constructor() {
        this.render();
        this.attachEvents();
        this.initializeGoogleAuth();
    }
    render() {
        const app = document.getElementById("app");
        app.innerHTML = `
            <!-- Background avec effets (équivalent de votre CSS) -->
            <div class="min-h-screen bg-black text-white flex items-center justify-center p-8 relative overflow-x-hidden">

                <!-- Background animated gradients -->
                <div class="fixed inset-0 -z-10 animate-pulse">
                    <div class="absolute w-full h-full bg-gradient-radial from-blue-500/10 via-transparent to-transparent" style="background: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full bg-gradient-radial from-purple-500/10 via-transparent to-transparent" style="background: radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full bg-gradient-radial from-green-500/10 via-transparent to-transparent" style="background: radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);"></div>
                </div>

                <!-- Container principal -->
                <div class="w-full max-w-md relative z-10">

                    <!-- Header -->
                    <div class="text-center mb-8">
                        <h1 class="font-mono text-5xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                            transcendence<span class="inline-block w-0.5 h-8 bg-blue-500 ml-1 animate-pulse"></span>
                        </h1>
                        <p class="font-mono text-gray-500 opacity-80">
                            <span class="text-blue-500">></span> initialize session
                        </p>
                    </div>

                    <!-- Tab Navigation -->
                    <div class="mb-8">
                        <div class="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
                            <button class="tab-button flex-1 py-3 px-4 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-800 hover:text-white focus:outline-none"
                                    data-tab="signin" id="signin-tab">
                                $ sign-in
                            </button>
                            <button class="tab-button flex-1 py-3 px-4 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-800 hover:text-white focus:outline-none"
                                    data-tab="signup" id="signup-tab">
                                $ sign-up
                            </button>
                        </div>
                    </div>

                    <!-- Sign In Tab -->
                    <div id="signin" class="tab-content">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 mb-6 relative overflow-hidden backdrop-blur-sm">
                            <!-- Top gradient line -->
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <!-- Alerts -->
                            <div id="signin-alert" class="hidden p-4 mb-6 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm"></div>
                            <div id="signin-success" class="hidden p-4 mb-6 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm"></div>

                            <!-- Form -->
                            <div class="mb-5">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    login / email
                                </label>
                                <input type="text"
                                       id="signin-login"
                                       placeholder="username or user@domain.com"
                                       autocomplete="username"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <div class="mb-8">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    password
                                </label>
                                <input type="password"
                                       id="signin-password"
                                       placeholder="••••••••"
                                       autocomplete="current-password"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <button id="signinBtn" class="group relative w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none rounded-lg font-mono font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none overflow-hidden">
                                <span class="relative z-10">$ authenticate</span>
                                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div class="relative text-center my-8 text-gray-500 font-mono text-sm">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-800"></div>
                            </div>
                            <span class="relative bg-black px-6">// </span>
                        </div>

                        <!-- Google Sign-In -->
                        <div class="flex justify-center mt-4">
                            <div class="g_id_signin"
                                 data-type="standard"
                                 data-size="large"
                                 data-theme="filled_black"
                                 data-text="continue_with"
                                 data-shape="rectangular"
                                 data-logo_alignment="left"
                                 data-width="100%">
                            </div>
                        </div>
                    </div>

                    <!-- Sign Up Tab -->
                    <div id="signup" class="tab-content hidden">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 mb-6 relative overflow-hidden backdrop-blur-sm">
                            <!-- Top gradient line -->
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <!-- Alerts -->
                            <div id="signup-alert" class="hidden p-4 mb-6 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm"></div>
                            <div id="signup-success" class="hidden p-4 mb-6 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm"></div>

                            <!-- Form -->
                            <div class="mb-5">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    username
                                </label>
                                <input type="text"
                                       id="signup-login"
                                       placeholder="choose a username"
                                       autocomplete="username"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <div class="mb-5">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    email
                                </label>
                                <input type="email"
                                       id="signup-email"
                                       placeholder="user@domain.com"
                                       autocomplete="email"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <div class="mb-8">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    password
                                </label>
                                <input type="password"
                                       id="signup-password"
                                       placeholder="••••••••"
                                       autocomplete="new-password"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <button id="signupBtn" class="group relative w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none rounded-lg font-mono font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none overflow-hidden">
                                <span class="relative z-10">$ create-account</span>
                                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div class="relative text-center my-8 text-gray-500 font-mono text-sm">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-800"></div>
                            </div>
                            <span class="relative bg-black px-6">//</span>
                        </div>

                        <!-- Google Sign-In -->
                        <div class="flex justify-center mt-4">
                            <div class="g_id_signin"
                                 data-type="standard"
                                 data-size="large"
                                 data-theme="filled_black"
                                 data-text="continue_with"
                                 data-shape="rectangular"
                                 data-logo_alignment="left"
                                 data-width="100%">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    attachEvents() {
        // tab switch
        document.querySelectorAll(".tab-button").forEach((button) => {
            button.addEventListener("click", () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
        //signin
        document.getElementById("signinBtn").addEventListener("click", () => {
            this.handleSignIn();
        });
        //signup
        document.getElementById("signupBtn").addEventListener("click", () => {
            this.handleSignUp();
        });
        // key navigation(pour passer dune case a lautre juste avec entree)
        this.setupKeyboardNavigation();
        // def tab
        this.switchTab("signin");
    }
    switchTab(tabName) {
        document.querySelectorAll(".tab-button").forEach((b) => {
            b.classList.remove("bg-blue-500", "text-white", "shadow-lg", "shadow-blue-500/30");
            b.classList.add("text-gray-400");
        });
        document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.add("hidden"));
        //buton actif
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        activeButton.classList.remove("text-gray-400");
        activeButton.classList.add("bg-blue-500", "text-white", "shadow-lg", "shadow-blue-500/30");
        document.getElementById(tabName).classList.remove("hidden");
        //change de tab = clear alertes
        this.hideAllAlerts();
    }
    handleSignIn() {
        return __awaiter(this, void 0, void 0, function* () {
            const login = document.getElementById("signin-login").value.trim();
            const password = document.getElementById("signin-password").value;
            const btn = document.getElementById("signinBtn");
            this.hideAllAlerts();
            if (!login || !password) {
                this.showAlert("signin-alert", "$ error: missing credentials");
                return;
            }
            btn.textContent = "$ authenticating...";
            btn.disabled = true;
            try {
                const response = yield fetch("/auth/signin", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "credentials": "include", // pour envoyer les cookies
                    },
                    body: JSON.stringify({
                        givenLogin: login,
                        password,
                    }),
                });
                const data = yield response.json();
                if (response.ok) {
                    btn.textContent = "$ success";
                    btn.style.background = "#10b981";
                    this.showAlert("signin-success", `$ welcome back, ${data.login}!`, "success");
                    console.log("Authentication successful ✅", data);
                    // JWT (a faire)
                    // if (data.token) {
                    //   localStorage.setItem("authToken", data.token);
                    // }
                    // spa allez au jeu apres connexion
                    setTimeout(() => {
                        window.router.navigate("/game");
                    }, 1000);
                }
                else {
                    this.showAlert("signin-alert", `$ ${data.error || "authentication failed"}`);
                    this.resetButton(btn, "$ authenticate");
                }
            }
            catch (error) {
                this.showAlert("signin-alert", "$ network error");
                this.resetButton(btn, "$ authenticate");
                console.error("Network error:", error);
            }
        });
    }
    //insciprtion
    handleSignUp() {
        return __awaiter(this, void 0, void 0, function* () {
            const login = document.getElementById("signup-login").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value;
            const btn = document.getElementById("signupBtn");
            this.hideAllAlerts();
            if (!login || !email || !password) {
                this.showAlert("signup-alert", "$ error: all fields required");
                return;
            }
            btn.textContent = "$ creating account...";
            btn.disabled = true;
            try {
                const response = yield fetch("/auth/signup", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ login, email, password }),
                });
                const data = yield response.json();
                if (response.ok) {
                    btn.textContent = "$ account created";
                    btn.style.background = "#10b981";
                    this.showAlert("signup-success", `$ account created for ${login}! switching to sign-in...`, "success");
                    console.log("Account created successfully ✅", data);
                    // 2 sec = switch
                    setTimeout(() => {
                        this.switchTab("signin");
                        document.getElementById("signin-login").value =
                            login;
                    }, 2000);
                }
                else {
                    this.showAlert("signup-alert", `$ ${data.error || "registration failed"}`);
                    this.resetButton(btn, "$ create-account");
                }
            }
            catch (error) {
                this.showAlert("signup-alert", "$ network error");
                this.resetButton(btn, "$ create-account");
                console.error("Network error:", error);
            }
        });
    }
    //google auth
    initializeGoogleAuth() {
        // DOM pret = google
        setTimeout(() => {
            if (window.google && window.google.accounts) {
                window.google.accounts.id.initialize({
                    client_id: "1560847651-b31pkjflds74sb9s6g1s3enpo71bd5kn.apps.googleusercontent.com",
                    callback: window.handleCredentialResponse,
                });
                const signinButton = document.querySelector("#signin .g_id_signin");
                const signupButton = document.querySelector("#signup .g_id_signin");
                if (signinButton) {
                    window.google.accounts.id.renderButton(signinButton, {
                        type: "standard",
                        size: "large",
                        theme: "filled_black",
                        text: "continue_with",
                        shape: "rectangular",
                        logo_alignment: "left",
                        width: "100%",
                    });
                }
                if (signupButton) {
                    window.google.accounts.id.renderButton(signupButton, {
                        type: "standard",
                        size: "large",
                        theme: "filled_black",
                        text: "continue_with",
                        shape: "rectangular",
                        logo_alignment: "left",
                        width: "100%",
                    });
                }
            }
            else {
                // Google pas charge, recommance
                setTimeout(() => this.initializeGoogleAuth(), 500);
            }
        }, 100);
        //callback
        window.handleCredentialResponse = (response) => {
            const id_token = response.credential;
            const isSignup = !document
                .getElementById("signup")
                .classList.contains("hidden");
            console.log("Google authentication:", isSignup ? "signup" : "signin");
            fetch("/auth/signup/google", {
                method: "POST",
                headers: { "Content-Type": "application/json",
                    "credentials": "include", // pour envoyer les cookies
                },
                body: JSON.stringify({ token: id_token }),
            })
                .then((res) => res.json())
                .then((data) => {
                const alertId = isSignup ? "signup-success" : "signin-success";
                const message = isSignup
                    ? `$ google account created for ${data.login}!`
                    : `$ welcome back, ${data.login}!`;
                if (!data || data.error) {
                    const alertIdErr = isSignup ? "signup-alert" : "signin-alert";
                    this.showAlert(alertIdErr, `$ ${(data === null || data === void 0 ? void 0 : data.error) || "google authentication failed"}`);
                    return;
                }
                this.showAlert(alertId, message, "success");
                console.log("Google authentication successful ✅", data);
                //go jeu quand c bon
                setTimeout(() => {
                    window.router.navigate("/game");
                }, 1000);
            })
                .catch((err) => {
                const alertId = isSignup ? "signup-alert" : "signin-alert";
                this.showAlert(alertId, "$ google authentication failed");
                console.error("Google authentication error ❌", err);
            });
        };
    }
    //entree pour nav entre ligne mais si passwd alors essaye de se co
    setupKeyboardNavigation() {
        document
            .getElementById("signin-login")
            .addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("signin-password").focus();
            }
        });
        document
            .getElementById("signin-password")
            .addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("signinBtn").click();
            }
        });
        document
            .getElementById("signup-login")
            .addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("signup-email").focus();
            }
        });
        document
            .getElementById("signup-email")
            .addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("signup-password").focus();
            }
        });
        document
            .getElementById("signup-password")
            .addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("signupBtn").click();
            }
        });
    }
    showAlert(id, message, type = "error") {
        const alert = document.getElementById(id);
        alert.textContent = message;
        alert.classList.remove("hidden");
        if (type === "success") {
            setTimeout(() => this.hideAlert(id), 3000);
        }
    }
    hideAlert(id) {
        document.getElementById(id).classList.add("hidden");
    }
    hideAllAlerts() {
        document.querySelectorAll(".alert").forEach((alert) => {
            alert.classList.add("hidden");
        });
    }
    resetButton(btn, originalText) {
        btn.textContent = originalText;
        btn.style.background = "";
        btn.disabled = false;
    }
}
exports.AuthPage = AuthPage;
