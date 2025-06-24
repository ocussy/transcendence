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
exports.GamePage = void 0;
class GamePage {
    constructor() {
        this.currentSection = "tournament";
        this.currentUser = null; // Ajouté pour stocker les données utilisateur
        this.friendsList = [];
        this.render();
        this.attachEvents();
        this.handleBrowserNavigation();
        window.gamePageInstance = this; // ✅ AJOUTEZ cette ligne
        // Récupérer la section depuis l'URL AVANT de la définir
        const currentPath = window.location.pathname;
        let targetSection = "tournament"; // défaut
        if (currentPath.startsWith("/game/")) {
            const section = currentPath.replace("/game/", "");
            if (["tournament", "dashboard", "profile"].includes(section)) {
                targetSection = section;
            }
        }
        // Afficher la section sans modifier l'URL
        this.showSectionWithoutPush(targetSection);
    }
    loadUserProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch("/user", { credentials: "include" });
                if (!res.ok)
                    throw new Error("Not authenticated");
                const user = yield res.json();
                // Stocker les données utilisateur
                this.currentUser = user;
                // Remplir tous les champs du profil
                const usernameInput = document.getElementById("profile-username");
                const emailInput = document.getElementById("profile-email");
                const languageSelect = document.getElementById("profile-language");
                const avatarImg = document.getElementById("user-avatar");
                const avatarUrlInput = document.getElementById("profile-avatar-url");
                const twoFAToggle = document.getElementById("profile-2fa");
                if (usernameInput)
                    usernameInput.value = user.login || "";
                if (emailInput)
                    emailInput.value = user.email || "";
                if (languageSelect)
                    languageSelect.value = user.language || "fr";
                if (avatarImg && user.avatarUrl)
                    avatarImg.src = user.avatarUrl;
                if (avatarUrlInput)
                    avatarUrlInput.value = user.avatarUrl || "";
                if (twoFAToggle)
                    twoFAToggle.checked = user.secure_auth || false;
                // Gestion des comptes Google
                if (user.auth_provider === "google") {
                    this.disableGoogleOnlyFields();
                }
                // Mettre à jour le statut 2FA et l'affichage
                this.update2FAStatus(user.secure_auth || false);
                this.updateProfileDisplay();
                this.updateAuthBadge(user.auth_provider || "local");
                this.loadFriends();
            }
            catch (err) {
                console.error("Erreur chargement profil:", err);
                window.router.navigate("/auth");
            }
        });
    }
    disableGoogleOnlyFields() {
        // Désactiver username et email
        const usernameInput = document.getElementById("profile-username");
        const emailInput = document.getElementById("profile-email");
        if (usernameInput) {
            usernameInput.disabled = true;
            usernameInput.classList.add("opacity-50", "cursor-not-allowed");
            usernameInput.title = "Username cannot be changed for Google accounts";
        }
        if (emailInput) {
            emailInput.disabled = true;
            emailInput.classList.add("opacity-50", "cursor-not-allowed");
            emailInput.title = "Email cannot be changed for Google accounts";
        }
        // Désactiver le bouton "save basic"
        const saveBasicBtn = document.getElementById("save-basic-btn");
        if (saveBasicBtn) {
            saveBasicBtn.textContent = "save";
        }
        //  Masquer complètement la section mot de passe
        const passwordSection = document.querySelector(".bg-gray-900:has(#profile-new-password)");
        if (passwordSection) {
            passwordSection.classList.add("hidden");
        }
        //  Masquer complètement la section 2FA
        const securitySection = document.querySelector(".bg-gray-900:has(#profile-2fa)");
        if (securitySection) {
            securitySection.classList.add("hidden");
        }
    }
    //  Nouvelle méthode à ajouter dans votre classe
    updateAuthBadge(authProvider) {
        const authBadge = document.getElementById("auth-provider-badge");
        if (authBadge) {
            authBadge.textContent = `${authProvider} auth`;
        }
    }
    update2FAStatus(isEnabled) {
        const statusElement = document.getElementById("2fa-status");
        const toggleStatusElement = document.getElementById("2fa-toggle-status");
        if (statusElement) {
            statusElement.textContent = isEnabled ? "enabled" : "disabled";
            statusElement.className = `font-mono text-sm ${isEnabled ? "text-green-400" : "text-gray-400"}`;
        }
        if (toggleStatusElement) {
            toggleStatusElement.textContent = isEnabled ? "enabled" : "disabled";
            toggleStatusElement.className = `font-mono text-sm mr-3 ${isEnabled ? "text-green-400" : "text-gray-400"}`;
        }
    }
    updateProfileDisplay() {
        if (!this.currentUser)
            return;
        const displayName = document.getElementById("profile-display-name");
        const displayEmail = document.getElementById("profile-display-email");
        if (displayName)
            displayName.textContent = this.currentUser.login;
        if (displayEmail)
            displayEmail.textContent = this.currentUser.email;
    }
    loadFriends() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch("/friends", {
                    credentials: "include",
                });
                if (response.ok) {
                    const data = yield response.json();
                    this.friendsList = data.friend || [];
                    this.renderFriendsSection();
                }
                else {
                    console.error("Failed to load friends");
                    this.friendsList = [];
                    this.renderFriendsSection();
                }
            }
            catch (error) {
                console.error("Error loading friends:", error);
                this.friendsList = [];
                this.renderFriendsSection();
            }
        });
    }
    addFriend(username) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!username.trim()) {
                this.showProfileAlert("profile-alert", "Username is required");
                return;
            }
            try {
                const response = yield fetch("/user", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ friend: username.trim() }),
                });
                const data = yield response.json();
                if (response.ok) {
                    this.showProfileAlert("profile-success", `Friend ${username} added successfully!`, "success");
                    // Recharger la liste
                    yield this.loadFriends();
                    // Clear input
                    const input = document.getElementById("add-friend-input");
                    if (input)
                        input.value = "";
                }
                else {
                    this.showProfileAlert("profile-alert", data.error || "Failed to add friend");
                }
            }
            catch (error) {
                this.showProfileAlert("profile-alert", "Network error");
                console.error("Add friend error:", error);
            }
        });
    }
    removeFriend(username) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!confirm(`Remove ${username} from your friends?`)) {
                return;
            }
            try {
                const response = yield fetch("/user", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ friend: username }),
                });
                const data = yield response.json();
                if (response.ok) {
                    this.showProfileAlert("profile-success", `Friend ${username} removed`, "success");
                    yield this.loadFriends();
                }
                else {
                    this.showProfileAlert("profile-alert", data.error || "Failed to remove friend");
                }
            }
            catch (error) {
                this.showProfileAlert("profile-alert", "Network error");
                console.error("Remove friend error:", error);
            }
        });
    }
    renderFriendsSection() {
        const container = document.getElementById("friends-list-container");
        if (!container)
            return;
        if (this.friendsList.length === 0) {
            container.innerHTML = `
        <div class="text-center py-4 text-gray-500 font-mono">
          <div class="text-lg mb-1">[EMPTY]</div>
          <p class="text-xs">No friends yet</p>
        </div>
      `;
            return;
        }
        container.innerHTML = this.friendsList
            .map((friend) => `
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <img
              src="${friend.avatarUrl}"
              alt="${friend.login}"
              class="w-8 h-8 rounded-full border border-gray-600"
              onerror="this.src='https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${friend.login}'"
            >
            <div>
              <div class="font-mono font-bold text-white text-xs">${friend.login}</div>
              <div class="font-mono text-xs text-gray-400">
                ${friend.totalMatches === 0 ? "No matches" : `${friend.winrate}% • ${friend.totalMatches}m`}
              </div>
            </div>
          </div>
          <button
            class="text-red-400 hover:text-red-300 p-1 hover:bg-gray-700 rounded text-xs"
            onclick="if(window.gamePageInstance) window.gamePageInstance.removeFriend('${friend.login}')"
          >
            ×
          </button>
        </div>
      </div>
    `)
            .join("");
    }
    render() {
        const app = document.getElementById("app");
        app.innerHTML = `
            <!-- Background avec effets -->
            <div class="min-h-screen bg-black text-white relative overflow-x-hidden">

                <!-- Background gradients -->
                <div class="fixed inset-0 -z-10 animate-pulse">
                    <div class="absolute w-full h-full" style="background: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full" style="background: radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full" style="background: radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);"></div>
                </div>

                <!-- Header -->
                <header class="bg-gray-900 border-b border-gray-800 p-6 relative overflow-hidden backdrop-blur-sm">
                    <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                    <div class="flex justify-between items-center max-w-6xl mx-auto">
                        <h1 class="font-mono text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                            transcendence<span class="inline-block w-0.5 h-8 bg-blue-500 ml-1 animate-pulse"></span>
                        </h1>

                        <!-- Navigation -->
                        <div class="flex bg-gray-800 border border-gray-700 rounded-lg p-1 -ml-32">
                            <button class="nav-btn py-3 px-5 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none whitespace-nowrap"
                                    data-section="tournament">
                                $ match
                            </button>
                            <button class="nav-btn py-3 px-5 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none whitespace-nowrap"
                                    data-section="dashboard">
                                $ dashboard
                            </button>
                            <button class="nav-btn py-3 px-5 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none whitespace-nowrap"
                                    data-section="profile">
                                $ profile
                            </button>
                        </div>

                        <button id="logout-btn" class="font-mono text-sm text-gray-400 hover:text-red-400 transition-colors duration-200">
                            $ logout
                        </button>
                    </div>
                </header>

                <!-- Container principal -->
                <div class="w-full max-w-6xl mx-auto p-8 relative z-10">

                    <!-- Section Tournament -->
                    <div id="section-tournament" class="section hidden">
                        <div class="text-center mb-8">
                            <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                                match.system
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> manage competitions
                            </p>
                        </div>

                        <!-- Pong Canvas -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div id="game-canvas" class="w-full h-[500px] bg-black border border-gray-700 rounded-lg flex items-center justify-center relative">
                                <div class="text-center text-gray-500">
                                    <div class="text-6xl mb-4 font-mono">[PONG]</div>
                                    <p class="font-mono">pong.exe ready</p>
                                    <p class="font-mono text-sm text-gray-600 mt-2">select mode to initialize</p>
                                </div>
                            </div>

                            <!-- Game Controls -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <button id="local-game-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-blue-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[LOCAL]</div>
                                    <div class="font-bold text-white">$ local-match</div>
                                    <div class="text-sm text-gray-400">same.keyboard</div>
                                </button>

                                <button id="ai-game-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-purple-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[AI]</div>
                                    <div class="font-bold text-white">$ ai-opponent</div>
                                    <div class="text-sm text-gray-400">bot.challenge</div>
                                </button>

                                <button id="tournament-start-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-yellow-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[TOURNAMENT]</div>
                                    <div class="font-bold text-white">$ new-tournament</div>
                                    <div class="text-sm text-gray-400">bracket.init</div>
                                </button>
                            </div>
                        </div>

                        <!-- Tournament Management - VERSION SIMPLIFIÉE -->
                                                <div class="grid grid-cols-1 gap-6">
                                                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                                        <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                                        <h3 class="font-mono font-bold text-lg mb-4 text-yellow-400">$ create-tournament</h3>
                                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <input type="text" placeholder="tournament_name"
                                                                   class="px-4 py-3 border border-gray-700 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                                            <select class="px-4 py-3 border border-gray-700 rounded-lg font-mono bg-gray-800 text-white focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                                                <option>4.players</option>
                                                                <option>8.players</option>
                                                                <option>16.players</option>
                                                            </select>
                                                            <button class="py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-mono font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
                                                                $ initialize-tournament
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                    </div>

                    <!-- Section Dashboard -->
                    <div id="section-dashboard" class="section hidden">
                        <div class="text-center mb-8">
                            <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                                user.statistics
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> performance data
                            </p>
                        </div>

                        <!-- Empty State -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div class="text-gray-500">
                                <div class="text-6xl mb-4 font-mono">[STATS]</div>
                                <div class="font-mono text-lg mb-2">No statistics available</div>
                                <div class="font-mono text-sm text-gray-600">// a faire</div>
                            </div>
                        </div>
                    </div>

                    <!-- Section Profile AMÉLIORÉE -->
                    <div id="section-profile" class="section hidden">
                      <div class="text-center mb-8">
                        <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                          user.config
                        </h2>
                        <p class="font-mono text-gray-500 opacity-80">
                          <span class="text-blue-500">></span> account settings
                        </p>
                      </div>

                      <!-- Alerts -->
                      <div id="profile-alert" class="hidden p-4 mb-6 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm max-w-4xl mx-auto"></div>
                      <div id="profile-success" class="hidden p-4 mb-6 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm max-w-4xl mx-auto"></div>

                      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <!-- Left Column - Avatar, Info & Friends -->
                        <div class="lg:col-span-1 space-y-6">

                          <!-- User Info Card -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div class="text-center">
                              <div class="relative inline-block mb-4">
                                <div class="w-24 h-24 bg-gray-800 border-2 border-gray-700 rounded-full mx-auto flex items-center justify-center overflow-hidden">
                                  <img id="user-avatar"
                                       alt="User Avatar"
                                       class="w-full h-full object-cover"
                                       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                  <span class="text-4xl font-mono text-gray-500 hidden">[USER]</span>
                                </div>
                                <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors" id="avatar-edit-btn">
                                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                  </svg>
                                </div>
                              </div>

                              <h3 id="profile-display-name" class="font-mono text-xl font-bold text-white mb-1">Loading...</h3>
                              <p id="profile-display-email" class="font-mono text-sm text-gray-400 mb-4">Loading...</p>

                              <!-- Status Badges -->
                              <div class="flex justify-center gap-2">
                                <span id="auth-provider-badge" class="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono rounded-full">
                                  local auth
                                </span>
                                <span class="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono rounded-full">
                                  2FA <span id="2fa-status">loading...</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <!-- Friends Management Card -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #8b5cf6, transparent);"></div>

                            <h3 class="font-mono font-bold text-lg text-purple-400 mb-4">$ friends --manage</h3>

                            <!-- Add Friend -->
                            <div class="mb-4">
                              <div class="flex gap-2">
                                <input
                                  type="text"
                                  id="add-friend-input"
                                  placeholder="username"
                                  class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded font-mono text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                <button
                                  id="add-friend-btn"
                                  class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-mono text-sm rounded transition-colors"
                                >
                                  add
                                </button>
                              </div>
                            </div>

                            <!-- Friends List -->
                            <div>
                              <h4 class="font-mono text-white font-medium mb-3 text-sm">Your Friends</h4>
                              <div id="friends-list-container" class="max-h-60 overflow-y-auto">
                                <!-- Friends will be rendered here -->
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Right Column - Edit Forms -->
                        <div class="lg:col-span-2 space-y-6">

                          <!-- Basic Information -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div class="flex items-center justify-between mb-6">
                              <h3 class="font-mono font-bold text-lg text-blue-400">$ edit --basic-info</h3>
                              <button id="save-basic-btn" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-mono text-sm rounded-lg transition-colors">
                                save
                              </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">username</label>
                                <input type="text"
                                       id="profile-username"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">email</label>
                                <input type="email"
                                       id="profile-email"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">language</label>
                                <select id="profile-language"
                                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                  <option value="fr">🇫🇷 Français</option>
                                  <option value="en">🇺🇸 English</option>
                                </select>
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">avatar URL</label>
                                <input type="url"
                                       id="profile-avatar-url"
                                       placeholder="https://example.com/avatar.jpg"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              </div>
                            </div>
                          </div>

                          <!-- Password Change -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>

                            <div class="flex items-center justify-between mb-6">
                              <h3 class="font-mono font-bold text-lg text-amber-400">$ change --password</h3>
                              <button id="save-password-btn" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-mono text-sm rounded-lg transition-colors">
                                update
                              </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">new password</label>
                                <input type="password"
                                       id="profile-new-password"
                                       placeholder="••••••••"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                                <p class="font-mono text-xs text-gray-500 mt-1">min 8 chars, uppercase, lowercase, number, special char</p>
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">confirm password</label>
                                <input type="password"
                                       id="profile-confirm-password"
                                       placeholder="••••••••"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                              </div>
                            </div>
                          </div>

                          <!-- Security Settings -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>

                            <h3 class="font-mono font-bold text-lg text-green-400 mb-6">$ security --config</h3>

                            <div class="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-4">
                              <div>
                                <h4 class="font-mono text-white font-medium mb-1">Two-Factor Authentication</h4>
                                <p class="font-mono text-sm text-gray-400">Add an extra layer of security to your account</p>
                              </div>
                              <div class="flex items-center">
                                <span id="2fa-toggle-status" class="font-mono text-sm text-gray-400 mr-3">disabled</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox"
                                         id="profile-2fa"
                                         class="sr-only peer">
                                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                              </div>
                            </div>

                            <button id="save-security-btn" class="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-mono rounded-lg transition-colors">
                              $ apply security settings
                            </button>
                          </div>

                        </div>
                      </div>
                    </div>
        `;
        this.loadUserProfile();
    }
    attachEvents() {
        // passer dune section a lautre
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });
        // logout
        document.getElementById("logout-btn").addEventListener("click", () => {
            this.handleLogout();
        });
        // les gamemode
        document.getElementById("local-game-btn").addEventListener("click", () => {
            this.startGame("local");
        });
        document.getElementById("ai-game-btn").addEventListener("click", () => {
            this.startGame("ai");
        });
        document
            .getElementById("tournament-start-btn")
            .addEventListener("click", () => {
            this.startGame("tournament");
        });
        // Ajouter les événements du profil
        this.attachProfileEvents();
    }
    attachProfileEvents() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        // Avatar URL preview
        (_a = document
            .getElementById("profile-avatar-url")) === null || _a === void 0 ? void 0 : _a.addEventListener("input", (e) => {
            const url = e.target.value;
            const preview = document.getElementById("user-avatar");
            if (url) {
                preview.src = url;
            }
        });
        // Avatar edit button
        (_b = document
            .getElementById("avatar-edit-btn")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
            var _a;
            (_a = document.getElementById("profile-avatar-url")) === null || _a === void 0 ? void 0 : _a.focus();
        });
        // 2FA toggle visual update
        (_c = document.getElementById("profile-2fa")) === null || _c === void 0 ? void 0 : _c.addEventListener("change", (e) => {
            const isEnabled = e.target.checked;
            const statusElement = document.getElementById("2fa-toggle-status");
            if (statusElement) {
                statusElement.textContent = isEnabled ? "enabled" : "disabled";
                statusElement.className = `font-mono text-sm mr-3 ${isEnabled ? "text-green-400" : "text-gray-400"}`;
            }
        });
        // Save buttons
        (_d = document.getElementById("save-basic-btn")) === null || _d === void 0 ? void 0 : _d.addEventListener("click", () => {
            this.saveBasicInfo();
        });
        (_e = document
            .getElementById("save-password-btn")) === null || _e === void 0 ? void 0 : _e.addEventListener("click", () => {
            this.savePassword();
        });
        (_f = document
            .getElementById("save-security-btn")) === null || _f === void 0 ? void 0 : _f.addEventListener("click", () => {
            this.saveSecurity();
        });
        (_g = document.getElementById("add-friend-btn")) === null || _g === void 0 ? void 0 : _g.addEventListener("click", () => {
            const input = document.getElementById("add-friend-input");
            if (input) {
                this.addFriend(input.value);
            }
        });
        (_h = document
            .getElementById("add-friend-input")) === null || _h === void 0 ? void 0 : _h.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const input = e.target;
                this.addFriend(input.value);
            }
        });
    }
    saveBasicInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentUser)
                return;
            const username = document.getElementById("profile-username").value.trim();
            const email = document.getElementById("profile-email").value.trim();
            const language = document.getElementById("profile-language").value;
            const avatarUrl = document.getElementById("profile-avatar-url").value.trim();
            const btn = document.getElementById("save-basic-btn");
            this.hideProfileAlerts();
            if (!username || !email) {
                this.showProfileAlert("profile-alert", "$ error: username and email are required");
                return;
            }
            btn.textContent = "saving...";
            btn.disabled = true;
            try {
                const updateData = {};
                if (username !== this.currentUser.login)
                    updateData.login = username;
                if (email !== this.currentUser.email)
                    updateData.email = email;
                if (language !== this.currentUser.language)
                    updateData.language = language;
                if (avatarUrl !== this.currentUser.avatarUrl)
                    updateData.avatarUrl = avatarUrl;
                if (Object.keys(updateData).length === 0) {
                    this.showProfileAlert("profile-alert", "$ no changes to save");
                    btn.textContent = "save";
                    btn.disabled = false;
                    return;
                }
                const response = yield fetch("/user", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(updateData),
                });
                const data = yield response.json();
                if (response.ok) {
                    this.showProfileAlert("profile-success", "$ basic information updated successfully", "success");
                    // Update current user data and display
                    Object.assign(this.currentUser, updateData);
                    this.updateProfileDisplay();
                    btn.textContent = "saved ✓";
                    btn.style.backgroundColor = "#10b981";
                    setTimeout(() => {
                        btn.textContent = "save";
                        btn.style.backgroundColor = "";
                        btn.disabled = false;
                    }, 2000);
                }
                else {
                    this.showProfileAlert("profile-alert", `$ ${data.error || "update failed"}`);
                    btn.textContent = "save";
                    btn.disabled = false;
                }
            }
            catch (error) {
                this.showProfileAlert("profile-alert", "$ network error");
                btn.textContent = "save";
                btn.disabled = false;
                console.error("Update error:", error);
            }
        });
    }
    savePassword() {
        return __awaiter(this, void 0, void 0, function* () {
            const newPassword = document.getElementById("profile-new-password").value;
            const confirmPassword = document.getElementById("profile-confirm-password").value;
            const btn = document.getElementById("save-password-btn");
            this.hideProfileAlerts();
            if (!newPassword || !confirmPassword) {
                this.showProfileAlert("profile-alert", "$ error: both password fields are required");
                return;
            }
            if (newPassword !== confirmPassword) {
                this.showProfileAlert("profile-alert", "$ error: passwords do not match");
                return;
            }
            // Basic password validation
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                this.showProfileAlert("profile-alert", "$ error: password must be at least 8 characters with uppercase, lowercase, number and special character");
                return;
            }
            btn.textContent = "updating...";
            btn.disabled = true;
            try {
                const response = yield fetch("/user", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ password: newPassword }),
                });
                const data = yield response.json();
                if (response.ok) {
                    this.showProfileAlert("profile-success", "$ password updated successfully", "success");
                    // Clear password fields
                    document.getElementById("profile-new-password").value = "";
                    document.getElementById("profile-confirm-password").value = "";
                    btn.textContent = "updated ✓";
                    btn.style.backgroundColor = "#10b981";
                    setTimeout(() => {
                        btn.textContent = "update";
                        btn.style.backgroundColor = "";
                        btn.disabled = false;
                    }, 2000);
                }
                else {
                    this.showProfileAlert("profile-alert", `$ ${data.error || "password update failed"}`);
                    btn.textContent = "update";
                    btn.disabled = false;
                }
            }
            catch (error) {
                this.showProfileAlert("profile-alert", "$ network error");
                btn.textContent = "update";
                btn.disabled = false;
                console.error("Password update error:", error);
            }
        });
    }
    saveSecurity() {
        return __awaiter(this, void 0, void 0, function* () {
            const isEnabled = document.getElementById("profile-2fa").checked;
            const btn = document.getElementById("save-security-btn");
            this.hideProfileAlerts();
            btn.textContent = "$ applying...";
            btn.disabled = true;
            try {
                const response = yield fetch("/user", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({ secure_auth: isEnabled }),
                });
                const data = yield response.json();
                if (response.ok) {
                    this.showProfileAlert("profile-success", `$ 2FA ${isEnabled ? "enabled" : "disabled"} successfully`, "success");
                    if (this.currentUser) {
                        this.currentUser.secure_auth = isEnabled;
                    }
                    this.update2FAStatus(isEnabled);
                    btn.textContent = "$ applied ✓";
                    btn.style.backgroundColor = "#10b981";
                    setTimeout(() => {
                        btn.textContent = "$ apply security settings";
                        btn.style.backgroundColor = "";
                        btn.disabled = false;
                    }, 2000);
                }
                else {
                    this.showProfileAlert("profile-alert", `$ ${data.error || "2FA update failed"}`);
                    // Revert toggle
                    if (this.currentUser) {
                        document.getElementById("profile-2fa").checked =
                            this.currentUser.secure_auth;
                        const statusElement = document.getElementById("2fa-toggle-status");
                        if (statusElement) {
                            statusElement.textContent = this.currentUser.secure_auth
                                ? "enabled"
                                : "disabled";
                            statusElement.className = `font-mono text-sm mr-3 ${this.currentUser.secure_auth ? "text-green-400" : "text-gray-400"}`;
                        }
                    }
                    btn.textContent = "$ apply security settings";
                    btn.disabled = false;
                }
            }
            catch (error) {
                this.showProfileAlert("profile-alert", "$ network error");
                btn.textContent = "$ apply security settings";
                btn.disabled = false;
                console.error("2FA update error:", error);
            }
        });
    }
    showProfileAlert(id, message, type = "error") {
        const alert = document.getElementById(id);
        if (alert) {
            alert.textContent = message;
            alert.classList.remove("hidden");
            if (type === "success") {
                setTimeout(() => this.hideProfileAlert(id), 4000);
            }
        }
    }
    hideProfileAlert(id) {
        const alert = document.getElementById(id);
        if (alert) {
            alert.classList.add("hidden");
        }
    }
    hideProfileAlerts() {
        this.hideProfileAlert("profile-alert");
        this.hideProfileAlert("profile-success");
    }
    //bouton retour avant a revoir
    handleBrowserNavigation() {
        window.addEventListener("popstate", (event) => {
            const path = window.location.pathname;
            if (path === "/") {
                // retour auth
                window.router.navigate("/");
                return;
            }
            // ✅ Gestion de /game ET /game/section
            if (path.startsWith("/game")) {
                if (path === "/game") {
                    // /game seul = retour au tournament par défaut
                    this.showSectionWithoutPush("tournament");
                }
                else if (path.startsWith("/game/")) {
                    // /game/section = afficher la section
                    const section = path.replace("/game/", "");
                    if (["tournament", "dashboard", "profile"].includes(section)) {
                        this.showSectionWithoutPush(section);
                    }
                    else {
                        this.showSectionWithoutPush("tournament");
                    }
                }
            }
        });
        // detection depuis url
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/game/")) {
            const section = currentPath.replace("/game/", "");
            if (["tournament", "dashboard", "profile"].includes(section)) {
                this.currentSection = section;
            }
        }
        else if (currentPath === "/game") {
            // ✅ Ajouter cette condition pour /game seul
            this.currentSection = "tournament";
        }
    }
    // afficher section sans push dans historique
    showSectionWithoutPush(sectionName) {
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.add("hidden");
        });
        // desactive les boutons nav
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.classList.remove("bg-blue-500", "text-white");
            btn.classList.add("text-gray-400");
        });
        document
            .getElementById(`section-${sectionName}`)
            .classList.remove("hidden");
        // active bouton nav
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        activeBtn.classList.remove("text-gray-400");
        activeBtn.classList.add("bg-blue-500", "text-white");
        this.currentSection = sectionName;
        console.log(`Section active (browser nav): ${sectionName}`);
    }
    // Supprimer l'ancienne fonction handleAvatarUpload car maintenant l'avatar se gère via URL
    showSection(sectionName) {
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.add("hidden");
        });
        // desactive boutons nav
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.classList.remove("bg-blue-500", "text-white");
            btn.classList.add("text-gray-400");
        });
        document
            .getElementById(`section-${sectionName}`)
            .classList.remove("hidden");
        // active bouton nav
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        activeBtn.classList.remove("text-gray-400");
        activeBtn.classList.add("bg-blue-500", "text-white");
        //maj url
        const newUrl = `/game/${sectionName}`;
        if (window.location.pathname !== newUrl) {
            window.history.pushState({ section: sectionName }, "", newUrl);
        }
        this.currentSection = sectionName;
        console.log(`Section active: ${sectionName}`);
        if (sectionName === "profile") {
            this.loadUserProfile();
        }
    }
    startGame(mode) {
        console.log(`Starting ${mode} game...`);
        const canvasDiv = document.getElementById("game-canvas");
        canvasDiv.innerHTML = `<canvas id="renderCanvas" class="w-full h-full" tabindex="0"></canvas>`;
        // Supprimer un éventuel script déjà chargé
        const oldScript = document.getElementById("pong-script");
        if (oldScript)
            oldScript.remove();
        // Choisir le script selon le mode
        let scriptSrc = "../../pong/pong.js"; // par défaut
        if (mode === "ai")
            scriptSrc = "../../pong/pov.js";
        if (mode === "tournament")
            scriptSrc = "../../pong/newPov.js";
        // Charger le script choisi
        const script = document.createElement("script");
        script.id = "pong-script";
        script.src = scriptSrc;
        script.async = true;
        canvasDiv.appendChild(script);
    }
    handleLogout() {
        return __awaiter(this, void 0, void 0, function* () {
            if (confirm("$ logout: Are you sure you want to exit?")) {
                console.log("Logging out...");
                try {
                    yield fetch("/auth/signout", {
                        method: "GET",
                        credentials: "include",
                    });
                }
                catch (err) {
                    console.error("Logout failed:", err);
                }
                setTimeout(() => {
                    window.router.navigate("/");
                }, 500);
            }
        });
    }
}
exports.GamePage = GamePage;
