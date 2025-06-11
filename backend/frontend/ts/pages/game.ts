export class GamePage {
  private currentSection: string = "tournament";

  constructor() {
    this.render();
    this.attachEvents();
    this.handleBrowserNavigation();

    // trouve url ou set url par defaut
    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/game/")) {
      const section = currentPath.replace("/game/", "");
      if (["tournament", "dashboard", "profile"].includes(section)) {
        this.showSection(section);
      } else {
        this.showSection("tournament");
      }
    } else {
      this.showSection("tournament");
    }
  }

  private render(): void {
    const app = document.getElementById("app")!;

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
                                tournament.system
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> manage competitions
                            </p>
                        </div>

                        <!-- Pong Canvas -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div id="game-canvas" class="w-full h-96 bg-black border border-gray-700 rounded-lg flex items-center justify-center relative">
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

                        <!-- Tournament Management -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <h3 class="font-mono font-bold text-lg mb-4 text-blue-400">$ active-tournaments</h3>
                                <div class="text-center py-8">
                                    <div class="text-gray-500 font-mono text-sm">No active tournaments</div>
                                    <div class="text-gray-600 font-mono text-xs mt-2">// a faire</div>
                                </div>
                            </div>

                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <h3 class="font-mono font-bold text-lg mb-4 text-yellow-400">$ create-tournament</h3>
                                <div class="space-y-4">
                                    <input type="text" placeholder="tournament_name"
                                           class="w-full px-4 py-3 border border-gray-700 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                    <select class="w-full px-4 py-3 border border-gray-700 rounded-lg font-mono bg-gray-800 text-white focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                        <option>4.players</option>
                                        <option>8.players</option>
                                        <option>16.players</option>
                                    </select>
                                    <button class="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-mono font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
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

                    <!-- Section Profile -->
                    <div id="section-profile" class="section hidden">
                        <div class="text-center mb-8">
                            <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                                user.config
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> account settings
                            </p>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-8 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <h3 class="font-mono font-bold text-lg mb-6 text-blue-400">$ user.data</h3>
                                <div class="space-y-5">
                                    <div>
                                        <label class="block font-mono text-sm text-gray-400 mb-2">username</label>
                                        <input type="text" id="profile-username" value="a venir avec jwt" readonly
                                               class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-gray-400 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                    </div>
                                    <div>
                                        <label class="block font-mono text-sm text-gray-400 mb-2">email.address</label>
                                        <input type="email" id="profile-email" value="a venir avec jwt" readonly
                                               class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-gray-400 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                    </div>
                                    <button class="group relative px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none rounded-lg font-mono font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 overflow-hidden">
                                        <span class="relative z-10">$ save.changes</span>
                                        <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                                    </button>
                                </div>
                            </div>

                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-8 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <h3 class="font-mono font-bold text-lg mb-6 text-purple-400">$ avatar.sys</h3>
                                <div class="text-center">
                                    <div class="w-32 h-32 bg-gray-800 border border-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center overflow-hidden">
                                        <img id="user-avatar" src="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=default"
                                             alt="User Avatar"
                                             class="w-full h-full object-cover"
                                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                        <span class="text-4xl font-mono hidden">[USER]</span>
                                    </div>
                                    <button id="upload-avatar-btn" class="px-4 py-2 bg-purple-500 text-white font-mono text-sm rounded hover:bg-purple-600 transition-colors">
                                        $ upload.new
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
  }

  private attachEvents(): void {
    // passer dune section a lautre
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const section = (e.target as HTMLElement).dataset.section!;
        this.showSection(section);
      });
    });

    // logout
    document.getElementById("logout-btn")!.addEventListener("click", () => {
      this.handleLogout();
    });

    // les gamemode
    document.getElementById("local-game-btn")!.addEventListener("click", () => {
      this.startGame("local");
    });

    document.getElementById("ai-game-btn")!.addEventListener("click", () => {
      this.startGame("ai");
    });

    document
      .getElementById("tournament-start-btn")!
      .addEventListener("click", () => {
        this.startGame("tournament");
      });

    // upload avatar
    document
      .getElementById("upload-avatar-btn")!
      .addEventListener("click", () => {
        this.handleAvatarUpload();
      });
  }
  //load jwt a revoir
  // private async loadUserProfile(): Promise<void> {
  //   try {
  //     // Essayer l'API d'abord
  //     const response = await fetch("/api/user/profile", {
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  //       },
  //     });

  //     if (response.ok) {
  //       const userData = await response.json();
  //       this.updateProfileData(userData);
  //       return;
  //     }
  //   } catch (error) {
  //     console.log("API not ready, trying JWT data:", error);
  //   }

  //   const token = localStorage.getItem("authToken");
  //   if (token) {
  //     try {
  //       const payload = JSON.parse(atob(token.split(".")[1]));

  //       const userData = {
  //         login: payload.login,
  //         email: payload.email,
  //         avatarUrl: payload.avatarUrl,
  //       };

  //       if (userData.login) {
  //         this.updateProfileData(userData);
  //       }
  //     } catch (error) {
  //       console.log("JWT decode failed:", error);
  //     }
  //   }
  // }

  //set les data user apres les avoir load (a rvoir)
  // private updateProfileData(userData: any): void {
  //   const avatarImg = document.getElementById(
  //     "user-avatar",
  //   ) as HTMLImageElement;
  //   if (avatarImg && userData.avatarUrl) {
  //     avatarImg.src = userData.avatarUrl;
  //   }

  //   const usernameInput = document.getElementById(
  //     "profile-username",
  //   ) as HTMLInputElement;
  //   const emailInput = document.getElementById(
  //     "profile-email",
  //   ) as HTMLInputElement;

  //   if (usernameInput && userData.login) {
  //     usernameInput.value = userData.login;
  //   }
  //   if (emailInput && userData.email) {
  //     emailInput.value = userData.email;
  //   }
  // }

  //bouton retour avant a revoir
  private handleBrowserNavigation(): void {
    window.addEventListener("popstate", (event) => {
      const path = window.location.pathname;

      if (path === "/") {
        // retour auth
        window.router.navigate("/");
        return;
      }

      if (path.startsWith("/game/")) {
        // dans le hub
        const section = path.replace("/game/", "");
        if (["tournament", "dashboard", "profile"].includes(section)) {
          this.showSectionWithoutPush(section);
        } else {
          this.showSectionWithoutPush("tournament");
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
  }

  // afficher section sans push dans historique
  private showSectionWithoutPush(sectionName: string): void {
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.add("hidden");
    });

    // desactive les boutons nav
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("bg-blue-500", "text-white");
      btn.classList.add("text-gray-400");
    });

    document
      .getElementById(`section-${sectionName}`)!
      .classList.remove("hidden");

    // active bouton nav
    const activeBtn = document.querySelector(
      `[data-section="${sectionName}"]`,
    )!;
    activeBtn.classList.remove("text-gray-400");
    activeBtn.classList.add("bg-blue-500", "text-white");

    this.currentSection = sectionName;
    console.log(`Section active (browser nav): ${sectionName}`);
  }

  //uplosdad avatar (a faire)
  private handleAvatarUpload(): void {
    console.log("Avatar upload clicked");
    alert("Upload d'avatar - a faire");
  }

  private showSection(sectionName: string): void {
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.add("hidden");
    });

    // desactive boutons nav
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("bg-blue-500", "text-white");
      btn.classList.add("text-gray-400");
    });

    document
      .getElementById(`section-${sectionName}`)!
      .classList.remove("hidden");

    // active bouton nav
    const activeBtn = document.querySelector(
      `[data-section="${sectionName}"]`,
    )!;
    activeBtn.classList.remove("text-gray-400");
    activeBtn.classList.add("bg-blue-500", "text-white");

    //maj url
    const newUrl = `/game/${sectionName}`;
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ section: sectionName }, "", newUrl);
    }

    this.currentSection = sectionName;
    console.log(`Section active: ${sectionName}`);
  }

  private startGame(mode: "local" | "ai" | "tournament"): void {
    console.log(`Starting ${mode} game...`);

    const canvas = document.getElementById("game-canvas")!;
    canvas.innerHTML = `
            <div class="w-full h-full bg-black rounded flex items-center justify-center">
                <div class="text-center text-white">
                    <div class="font-mono text-2xl mb-4">[${mode.toUpperCase()}_MODE.EXE]</div>
                    <div class="font-mono text-gray-400 mb-4">a faire</div>
                    <div class="font-mono text-sm text-gray-500">// adem</div>
                    <button onclick="this.parentElement.parentElement.innerHTML='<div class=&quot;text-center text-gray-500&quot;><div class=&quot;text-6xl mb-4 font-mono&quot;>[PONG]</div><p class=&quot;font-mono&quot;>pong.exe ready</p><p class=&quot;font-mono text-sm text-gray-600 mt-2&quot;>select mode to initialize</p></div>'"
                            class="mt-6 px-4 py-2 bg-red-500 text-white rounded font-mono text-sm hover:bg-red-600 transition-colors">
                        $ terminate
                    </button>
                </div>
            </div>
        `;
  }

  private handleLogout(): void {
    if (confirm("$ logout: Are you sure you want to exit?")) {
      console.log("Logging out...");
      setTimeout(() => {
        window.router.navigate("/");
      }, 500);
    }
  }
}

// trop de repetion
