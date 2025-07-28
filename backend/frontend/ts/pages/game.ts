import { socket } from "./auth.js";
import { tryConnectWebSocketIfAuthenticated } from "./auth.js";
import { verifyToken } from "./auth.js";

//interface pour le dashboard
interface MatchStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  currentStreak: number;
  ranking: number | null;
}

interface MatchHistory {
  id: number;
  player1: string;
  player2: string;
  opponent: string;
  result: "WIN" | "LOSS" | "DRAW";
  score1: number;
  score2: number;
  mode: string;
  duration: number;
  formatted_date: string;
}

export class GamePage {
  private currentSection: string = "tournament";
  private currentUser: any = null; // Ajouté pour stocker les données utilisateur
  private friendsList: any[] = [];
  private currentMatchId: number | null = null;

  constructor() {
    verifyToken(); // Vérifie le token JWT à l'initialisation
    this.render();
    this.attachEvents();
    this.handleBrowserNavigation();

    (window as any).gamePageInstance = this; // ✅ AJOUTEZ cette ligne

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

  ////////////////////////////////////////////////DASHBOARD////////////////////////////////////////////
  private async loadDashboardData(): Promise<void> {
    try {
      await this.loadUserStats();
      await this.loadMatchHistory();
      await this.loadPerformanceData();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }

  private async loadUserStats(): Promise<void> {
    try {
      const response = await fetch("/stats", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch stats");

      const stats: MatchStats = await response.json();

      this.updateStatsCards(stats);
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  }

  private updateStatsCards(stats: MatchStats): void {
    const totalGamesCard = document.querySelector(
      ".grid .bg-gray-900:nth-child(1) .text-3xl.font-mono.font-bold.text-blue-400",
    );
    if (totalGamesCard) {
      totalGamesCard.textContent = stats.totalGames.toString();
    }

    const victoriesCard = document.querySelector(
      ".grid .bg-gray-900:nth-child(2) .text-3xl.font-mono.font-bold.text-green-400",
    );
    if (victoriesCard) {
      victoriesCard.textContent = stats.totalWins.toString();
    }

    const winRateCard = document.querySelector(
      ".grid .bg-gray-900:nth-child(3) .text-3xl.font-mono.font-bold.text-amber-400",
    );
    if (winRateCard) {
      winRateCard.textContent = `${stats.winRate}%`;
    }

    const rankingCard = document.querySelector(
      ".grid .bg-gray-900:nth-child(4) .text-3xl.font-mono.font-bold.text-purple-400",
    );
    if (rankingCard) {
      rankingCard.textContent = stats.ranking ? `#${stats.ranking}` : "#--";
    }

    const streakCard = document.querySelector(
      ".space-y-4 .text-3xl.font-bold.text-green-400",
    );
    if (streakCard) {
      streakCard.textContent = stats.currentStreak.toString();
    }
  }

  private async loadMatchHistory(): Promise<void> {
    try {
      const response = await fetch("/match-history?limit=5", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch match history");

      const matches: MatchHistory[] = await response.json();

      const tbody = document.querySelector("#section-dashboard tbody");
      if (!tbody) return;

      if (matches.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="py-8 text-center text-gray-500 font-mono">
              No matches played yet
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = matches
        .map(
          (match: MatchHistory) => `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
          <td class="py-3 px-4 text-white">${this.escapeHtml(match.opponent)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded text-xs ${this.getResultClass(match.result)}">
              ${match.result}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-300">${match.score1 || 0} - ${match.score2 || 0}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded text-xs ${this.getModeClass(match.mode)}">
              ${(match.mode || "normal").toUpperCase()}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-400">${this.formatDate(match.formatted_date)}</td>
          <td class="py-3 px-4 text-gray-500">${this.formatDuration(match.duration)}</td>
        </tr>
      `,
        )
        .join("");
    } catch (error) {
      console.error("Error loading match history:", error);
      this.showMatchHistoryError();
    }
  }

  private getResultClass(result: string): string {
    switch (result) {
      case "WIN":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "LOSS":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "DRAW":
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    }
  }

  private getModeClass(mode: string): string {
    switch (mode?.toLowerCase()) {
      case "remote":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      case "ai":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "local":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    }
  }

  private formatDate(dateString: string): string {
    if (!dateString) return "--";

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString();
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return "--";

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}m ${secs}s`;
  }

  private escapeHtml(text: string): string {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private showMatchHistoryError(): void {
    const tbody = document.querySelector("#section-dashboard tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-red-400 font-mono">
            $ error: failed to load match history
          </td>
        </tr>
      `;
    }
  }

  private async loadPerformanceData(): Promise<void> {
    try {
      const response = await fetch("/stats/performance", {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch performance data");

      const performanceData = await response.json();
      if (performanceData.length > 0) {
        this.updatePerformanceChart(performanceData);
      } else {
        this.showNoPerformanceData();
      }
    } catch (error) {
      console.error("Error loading performance data:", error);
      this.showNoPerformanceData();
    }
  }

  private updatePerformanceChart(data: any[]): void {
    const svg = document.getElementById(
      "performance-chart",
    ) as SVGElement | null;
    const placeholder = document.getElementById("chart-placeholder");

    if (!svg) return;

    if (placeholder) {
      placeholder.style.display = "none";
    }
    const maxWinRate = Math.max(...data.map((d) => d.winRate), 100);
    const points = data
      .map((d, index) => {
        const x = 5 + (index * 90) / Math.max(data.length - 1, 1);
        const y = 95 - (d.winRate / maxWinRate) * 90;
        return `${x},: MatchHistory[] = await response.json();

      const tbody = document.querySelector("#section-dashboard tbody");
      if (!tbody) r${y}`;
      })
      .join(" ");

    svg.innerHTML = `
      <polyline
        fill="none"
        stroke="#3b82f6"
        stroke-width="0.8"
        points="${points}"
      />
      ${data
        .map((d, index) => {
          const x = 5 + (index * 90) / Math.max(data.length - 1, 1);
          const y = 95 - (d.winRate / maxWinRate) * 90;
          return `<circle cx="${x}" cy="${y}" r="1" fill="#3b82f6"/>`;
        })
        .join("")}
    `;
  }

  private showNoPerformanceData(): void {
    const placeholder = document.getElementById("chart-placeholder");
    if (placeholder) {
      placeholder.style.display = "flex";
      placeholder.innerHTML = `
        <div class="text-center text-gray-600">
          <div class="font-mono text-sm">--No recent data--</div>
          <p class="font-mono text-xs mt-1 opacity-70">Play matches to see performance trends</p>
        </div>
      `;
    }
  }

  ////////////////////////////////////////////////FIN DASH////////////////////////////////////////////

  ///////////////////////////////////////////////avatar//////////////////////////////////////////////
  private extractSeedFromUrl(url: string): string {
    if (!url || !url.includes("seed=")) return "coco";
    const match = url.match(/seed=([^&]*)/);
    return match ? decodeURIComponent(match[1]) : "coco";
  }

  private rebuildUrlWithSeed(originalUrl: string, newSeed: string): string {
    if (!originalUrl || !originalUrl.includes("seed=")) return originalUrl;
    return originalUrl.replace(
      /seed=([^&]*)/,
      `seed=${encodeURIComponent(newSeed)}`,
    );
  }
  ///////////////////////////////////////////////avatar//////////////////////////////////////////////

  //////////////////////////////////////////////creation match///////////////////////////////////////

  private async createMatch(mode: string): Promise<number | null> {
    try {
      const response = await fetch("/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          mode: mode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create match: ${response.status}`);
      }

      const data = await response.json();

      this.currentMatchId = data.id;
      this.showProfileAlert(
        "profile-success",
        `$ match-${mode} initialized`,
        "success",
      );

      return data.id;
    } catch (error) {
      this.showProfileAlert(
        "profile-alert",
        `$ error: failed to create ${mode} match`,
      );
      return null;
    }
  }
  //////////////////////////////////////////////creation match///////////////////////////////////////

  private async loadUserProfile(): Promise<void> {
    try {
      const res = await fetch("/user", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Not authenticated");
      tryConnectWebSocketIfAuthenticated();
      const data = await res.json();

      this.currentUser = data.user || data;

      const user = this.currentUser;

      const usernameInput = document.getElementById(
        "profile-username",
      ) as HTMLInputElement;
      const emailInput = document.getElementById(
        "profile-email",
      ) as HTMLInputElement;
      const aliasInput = document.getElementById(
        "profile-alias",
      ) as HTMLInputElement;
      const avatarImg = document.getElementById(
        "user-avatar",
      ) as HTMLImageElement;
      const avatarSeedInput = document.getElementById(
        "profile-avatar-seed",
      ) as HTMLInputElement;
      const twoFAToggle = document.getElementById(
        "profile-2fa",
      ) as HTMLInputElement;

      if (usernameInput) usernameInput.value = user.login || "";
      if (emailInput) emailInput.value = user.email || "";
      if (aliasInput) aliasInput.value = user.alias || user.login || "";
      if (avatarImg && user.avatarUrl) avatarImg.src = user.avatarUrl;
      if (avatarSeedInput && user.avatarUrl) {
        avatarSeedInput.value = this.extractSeedFromUrl(user.avatarUrl);
      }
      if (twoFAToggle) twoFAToggle.checked = !!user.secure_auth;

      if (data.auth_provider === "google") {
        this.disableGoogleOnlyFields();
      }
      this.update2FAStatus(data.secure_auth || false);
      this.updateProfileDisplay();
      this.updateAuthBadge(data.auth_provider || "local");
      this.loadFriends();
    } catch (err) {
      console.error("Erreur chargement profil:", err);
      window.router.navigate("/auth");
    }
  }

  private disableGoogleOnlyFields(): void {
    const usernameInput = document.getElementById(
      "profile-username",
    ) as HTMLInputElement;
    const emailInput = document.getElementById(
      "profile-email",
    ) as HTMLInputElement;

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

    const saveBasicBtn = document.getElementById(
      "save-basic-btn",
    ) as HTMLButtonElement;
    if (saveBasicBtn) {
      saveBasicBtn.textContent = "save";
    }

    const passwordSection = document.querySelector(
      ".bg-gray-900:has(#profile-new-password)",
    );
    if (passwordSection) {
      passwordSection.classList.add("hidden");
    }

    const securitySection = document.querySelector(
      ".bg-gray-900:has(#profile-2fa)",
    );
    if (securitySection) {
      securitySection.classList.add("hidden");
    }
  }
  private updateAuthBadge(authProvider: string): void {
    const authBadge = document.getElementById("auth-provider-badge");
    if (authBadge) {
      authBadge.textContent = `${authProvider} auth`;
    }
  }

  private update2FAStatus(isEnabled: boolean): void {
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

  private updateProfileDisplay(): void {
    if (!this.currentUser) return;

    const displayName = document.getElementById("profile-display-name");
    const displayEmail = document.getElementById("profile-display-email");

    if (displayName) displayName.textContent = this.currentUser.login;
    if (displayEmail) displayEmail.textContent = this.currentUser.email;
  }

  private async loadFriends(): Promise<void> {
    try {
      const response = await fetch("/friends", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        this.friendsList = data || [];
        this.renderFriendsSection();
      } else {
        console.error("Failed to load friends");
        this.friendsList = [];
        this.renderFriendsSection();
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      this.friendsList = [];
      this.renderFriendsSection();
    }
  }

  private async addFriend(username: string): Promise<void> {
    if (!username.trim()) {
      this.showProfileAlert("profile-alert", "Username is required");
      return;
    }

    try {
      const response = await fetch("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ friend: username.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showProfileAlert(
          "profile-success",
          `Friend ${username} added successfully!`,
          "success",
        );
        await this.loadFriends();
        const input = document.getElementById(
          "add-friend-input",
        ) as HTMLInputElement;
        if (input) input.value = "";
      } else {
        this.showProfileAlert(
          "profile-alert",
          data.error || "Failed to add friend",
        );
      }
    } catch (error) {
      this.showProfileAlert("profile-alert", "Network error");
      console.error("Add friend error:", error);
    }
  }

  private async removeFriend(username: string): Promise<void> {
    if (!confirm(`Remove ${username} from your friends?`)) {
      return;
    }

    try {
      const response = await fetch("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ friend: username }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showProfileAlert(
          "profile-success",
          `Friend ${username} removed`,
          "success",
        );
        await this.loadFriends();
      } else {
        this.showProfileAlert(
          "profile-alert",
          data.error || "Failed to remove friend",
        );
      }
    } catch (error) {
      this.showProfileAlert("profile-alert", "Network error");
      console.error("Remove friend error:", error);
    }
  }

  private renderFriendsSection(): void {
    const container = document.getElementById("friends-list-container");
    if (!container) return;

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
      .map(
        (friend) => `
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img
                src="${friend.avatarUrl}"
                alt="${friend.login}"
                class="w-12 h-12 rounded-full border-2 border-gray-600"
                onerror="this.src='https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${friend.login}'"
              >
              <!-- Indicateur de statut en ligne -->
              <div class="absolute -bottom-1 -right-1 w-4 h-4 ${friend.online ? "bg-green-500" : "bg-gray-500"} rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <div class="font-mono font-bold text-white text-sm">${friend.login}</div>
              </div>
              <div class="font-mono text-xs text-gray-400">
                ${friend.games_played === 0 ? "No matches" : `${friend.games_won}% win rate • ${friend.games_played} games`}
              </div>
            </div>
          </div>
          <button
            class="text-red-400 hover:text-red-300 p-2 hover:bg-gray-700 rounded text-sm transition-colors"
            onclick="if(window.gamePageInstance) window.gamePageInstance.removeFriend('${friend.login}')"
            title="Remove friend"
          >
            ×
          </button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  private render(): void {
    const app = document.getElementById("app")!;

    app.innerHTML = `
            <!-- Background avec effets -->
            <div class="min-h-screen bg-black text-white relative overflow-x-hidden">

            <!-- Alerts TOUJOURS visibles en haut de la fenêtre -->
            <div id="profile-alert" class="hidden fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] p-4 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm max-w-md backdrop-blur-sm shadow-xl"></div>
            <div id="profile-success" class="hidden fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] p-4 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm max-w-md backdrop-blur-sm shadow-xl"></div>

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

                                <button id="remote-game-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-green-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[REMOTE]</div>
                                    <div class="font-bold text-white">$ remote-match</div>
                                    <div class="text-sm text-gray-400">online.opponent</div>
                                </button>
                            </div>
                        </div>

                        <!-- Tournament Management -->
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
                                                            </select>
                                                            <button id="tournament" class="py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-mono font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
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
                                data.statistics
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> performance analytics
                            </p>
                        </div>

                        <!-- Stats Cards Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <!-- Total Games -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-blue-400 mb-2">--</div>
                                    <div class="text-sm font-mono text-gray-400">TOTAL GAMES</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">matches.exe</div>
                                </div>
                            </div>

                            <!-- Wins -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-green-400 mb-2">--</div>
                                    <div class="text-sm font-mono text-gray-400">VICTORIES</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">win.count</div>
                                </div>
                            </div>

                            <!-- Win Rate -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-amber-400 mb-2">--%</div>
                                    <div class="text-sm font-mono text-gray-400">WIN RATE</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">efficiency</div>
                                </div>
                            </div>

                            <!-- Ranking -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #8b5cf6, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-purple-400 mb-2">#--</div>
                                    <div class="text-sm font-mono text-gray-400">RANKING</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">leaderboard</div>
                                </div>
                            </div>
                        </div>

                        <!-- Performance Overview -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <!-- Performance Trend -->
                            <div class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <h3 class="font-mono font-bold text-lg text-blue-400 mb-4">$ performance --trend</h3>

                                <!-- Chart Area -->
                                <div class="h-48 bg-black border border-gray-700 rounded-lg p-4 relative">
                                    <!-- Grid Lines -->
                                    <div class="absolute inset-0 p-4">
                                        <div class="w-full h-full relative">
                                            <!-- Horizontal grid lines -->
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 20%;"></div>
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 40%;"></div>
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 60%;"></div>
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 80%;"></div>

                                            <!-- Vertical grid lines -->
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 14%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 28%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 42%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 56%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 70%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 84%;"></div>
                                        </div>
                                    </div>

                                    <!-- SVG vide pour être rempli plus tard -->
                                    <svg id="performance-chart" class="w-full h-full absolute inset-0 p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <!-- Sera rempli par JavaScript -->
                                    </svg>

                                    <!-- Message d'attente -->
                                    <div id="chart-placeholder" class="absolute inset-0 flex items-center justify-center">
                                        <div class="text-center text-gray-600">
                                            <div class="font-mono text-sm">--No data yet--</div>
                                            <p class="font-mono text-xs mt-1 opacity-70">Play matches to see trends</p>
                                        </div>
                                    </div>

                                    <!-- Labels -->
                                    <div class="absolute bottom-2 left-4 font-mono text-xs text-gray-500">7d ago</div>
                                    <div class="absolute bottom-2 right-4 font-mono text-xs text-gray-500">today</div>
                                    <div class="absolute top-2 right-4 font-mono text-xs text-blue-400">performance %</div>
                                </div>
                            </div>

                            <!-- Quick Stats -->
                            <div class="space-y-4">
                                <!-- Win Streak -->
                                <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                    <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <div class="font-mono text-sm text-gray-400">CURRENT STREAK</div>
                                            <div class="font-mono text-3xl font-bold text-green-400">--</div>
                                        </div>
                                        <div class="text-green-400 opacity-60">
                                            <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="font-mono text-xs text-gray-600 mt-2">wins.consecutive</div>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Matches -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #8b5cf6, transparent);"></div>
                            <h3 class="font-mono font-bold text-lg text-purple-400 mb-6">$ match-history --recent</h3>

                            <div class="overflow-x-auto">
                                <table class="w-full font-mono text-sm">
                                    <thead>
                                        <tr class="border-b border-gray-700">
                                            <th class="text-left py-3 px-4 text-gray-400">OPPONENT</th>
                                            <th class="text-left py-3 px-4 text-gray-400">RESULT</th>
                                            <th class="text-left py-3 px-4 text-gray-400">SCORE</th>
                                            <th class="text-left py-3 px-4 text-gray-400">MODE</th>
                                            <th class="text-left py-3 px-4 text-gray-400">DATE</th>
                                            <th class="text-left py-3 px-4 text-gray-400">DURATION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colspan="6" class="py-8 text-center text-gray-500 font-mono">
                                                <div class="text-lg">[LOADING...]</div>
                                                <p class="text-xs mt-1">Fetching match history...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- View More Button -->
                            <div class="mt-4 text-center">
                                <button class="font-mono text-sm text-gray-400 hover:text-blue-400 transition-colors duration-200 border border-gray-700 px-4 py-2 rounded-lg hover:border-blue-500">
                                    $ load-more --matches
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Section Profile AMÉLIORÉE -->
                    <div id="section-profile" class="section hidden">
                      <div class="text-center mb-8">
                        <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                          data.config
                        </h2>
                        <p class="font-mono text-gray-500 opacity-80">
                          <span class="text-blue-500">></span> account settings
                        </p>
                      </div>
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
                                <label class="block font-mono text-sm text-gray-400 mb-2">alias</label>
                                <input type="text"
                                      id="profile-alias"
                                      placeholder="your gaming alias"
                                      class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <p class="font-mono text-xs text-gray-500 mt-1">display name for tournaments</p>
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">avatar seed</label>
                                <input type="text"
                                      id="profile-avatar-seed"
                                      placeholder="coco"
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

  private attachEvents(): void {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const section = (e.target as HTMLElement).dataset.section!;
        this.showSection(section);
      });
    });

    document.getElementById("logout-btn")!.addEventListener("click", () => {
      this.handleLogout();
    });

    document.getElementById("local-game-btn")!.addEventListener("click", () => {
      this.startGame("local");
    });

    document.getElementById("ai-game-btn")!.addEventListener("click", () => {
      this.startGame("ai");
    });
    document
      .getElementById("remote-game-btn")!
      .addEventListener("click", () => {
        this.startGame("remote");
      });

    document.getElementById("tournament")?.addEventListener("click", () => {
      this.showTournamentPopup();
    });

    this.attachProfileEvents();
  }

  private attachProfileEvents(): void {
    document
      .getElementById("profile-avatar-seed")
      ?.addEventListener("input", (e) => {
        const seed = (e.target as HTMLInputElement).value;
        if (this.currentUser?.avatarUrl) {
          const newUrl = this.rebuildUrlWithSeed(
            this.currentUser.avatarUrl,
            seed,
          );
          const preview = document.getElementById(
            "user-avatar",
          ) as HTMLImageElement;
          if (preview) {
            preview.src = newUrl;
          }
        }
      });

    document
      .getElementById("avatar-edit-btn")
      ?.addEventListener("click", () => {
        document.getElementById("profile-avatar-url")?.focus();
      });

    document.getElementById("profile-2fa")?.addEventListener("change", (e) => {
      const isEnabled = (e.target as HTMLInputElement).checked;
      const statusElement = document.getElementById("2fa-toggle-status");
      if (statusElement) {
        statusElement.textContent = isEnabled ? "enabled" : "disabled";
        statusElement.className = `font-mono text-sm mr-3 ${isEnabled ? "text-green-400" : "text-gray-400"}`;
      }
    });

    document.getElementById("save-basic-btn")?.addEventListener("click", () => {
      this.saveBasicInfo();
    });

    document
      .getElementById("save-password-btn")
      ?.addEventListener("click", () => {
        this.savePassword();
      });

    document
      .getElementById("save-security-btn")
      ?.addEventListener("click", () => {
        this.saveSecurity();
      });

    document.getElementById("add-friend-btn")?.addEventListener("click", () => {
      const input = document.getElementById(
        "add-friend-input",
      ) as HTMLInputElement;
      if (input) {
        this.addFriend(input.value);
      }
    });
    document
      .getElementById("add-friend-input")
      ?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const input = e.target as HTMLInputElement;
          this.addFriend(input.value);
        }
      });
  }

  private async saveBasicInfo(): Promise<void> {
    if (!this.currentUser) return;

    const username = (
      document.getElementById("profile-username") as HTMLInputElement
    ).value.trim();
    const email = (
      document.getElementById("profile-email") as HTMLInputElement
    ).value.trim();
    const alias = (
      document.getElementById("profile-alias") as HTMLInputElement
    ).value.trim();
    const avatarSeed = (
      document.getElementById("profile-avatar-seed") as HTMLInputElement
    ).value.trim();
    const avatarUrl = avatarSeed
      ? this.rebuildUrlWithSeed(this.currentUser.avatarUrl, avatarSeed)
      : this.currentUser.avatarUrl;
    const btn = document.getElementById("save-basic-btn") as HTMLButtonElement;

    this.hideProfileAlerts();

    if (!username || !email) {
      this.showProfileAlert(
        "profile-alert",
        "$ error: username and email are required",
      );
      return;
    }

    btn.textContent = "saving...";
    btn.disabled = true;

    try {
      const updateData: any = {};

      if (username !== this.currentUser.login) updateData.login = username;
      if (email !== this.currentUser.email) updateData.email = email;
      if (alias !== (this.currentUser.alias || this.currentUser.login))
        updateData.alias = alias;
      if (avatarUrl !== this.currentUser.avatarUrl)
        updateData.avatarUrl = avatarUrl;

      if (Object.keys(updateData).length === 0) {
        this.showProfileAlert("profile-alert", "$ no changes to save");
        btn.textContent = "save";
        btn.disabled = false;
        return;
      }

      const response = await fetch("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        this.showProfileAlert(
          "profile-success",
          "$ basic information updated successfully",
          "success",
        );
        Object.assign(this.currentUser, updateData);
        this.updateProfileDisplay();

        btn.textContent = "saved ✓";
        btn.style.backgroundColor = "#10b981";
        setTimeout(() => {
          btn.textContent = "save";
          btn.style.backgroundColor = "";
          btn.disabled = false;
        }, 2000);
      } else {
        this.showProfileAlert(
          "profile-alert",
          `$ ${data.error || "update failed"}`,
        );
        btn.textContent = "save";
        btn.disabled = false;
      }
    } catch (error) {
      this.showProfileAlert("profile-alert", "$ network error");
      btn.textContent = "save";
      btn.disabled = false;
      console.error("Update error:", error);
    }
  }

  private async savePassword(): Promise<void> {
    const newPassword = (
      document.getElementById("profile-new-password") as HTMLInputElement
    ).value;
    const confirmPassword = (
      document.getElementById("profile-confirm-password") as HTMLInputElement
    ).value;
    const btn = document.getElementById(
      "save-password-btn",
    ) as HTMLButtonElement;

    this.hideProfileAlerts();

    if (!newPassword || !confirmPassword) {
      this.showProfileAlert(
        "profile-alert",
        "$ error: both password fields are required",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showProfileAlert("profile-alert", "$ error: passwords do not match");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      this.showProfileAlert(
        "profile-alert",
        "$ error: password must be at least 8 characters with uppercase, lowercase, number and special character",
      );
      return;
    }

    btn.textContent = "updating...";
    btn.disabled = true;

    try {
      const response = await fetch("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showProfileAlert(
          "profile-success",
          "$ password updated successfully",
          "success",
        );
        (
          document.getElementById("profile-new-password") as HTMLInputElement
        ).value = "";
        (
          document.getElementById(
            "profile-confirm-password",
          ) as HTMLInputElement
        ).value = "";

        btn.textContent = "updated ✓";
        btn.style.backgroundColor = "#10b981";
        setTimeout(() => {
          btn.textContent = "update";
          btn.style.backgroundColor = "";
          btn.disabled = false;
        }, 2000);
      } else {
        this.showProfileAlert(
          "profile-alert",
          `$ ${data.error || "password update failed"}`,
        );
        btn.textContent = "update";
        btn.disabled = false;
      }
    } catch (error) {
      this.showProfileAlert("profile-alert", "$ network error");
      btn.textContent = "update";
      btn.disabled = false;
      console.error("Password update error:", error);
    }
  }

  private async saveSecurity(): Promise<void> {
    const isEnabled = (
      document.getElementById("profile-2fa") as HTMLInputElement
    ).checked;
    const btn = document.getElementById(
      "save-security-btn",
    ) as HTMLButtonElement;

    this.hideProfileAlerts();

    btn.textContent = "$ applying...";
    btn.disabled = true;

    try {
      const response = await fetch("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ secure_auth: isEnabled }),
      });

      const data = await response.json();

      if (response.ok) {
        this.showProfileAlert(
          "profile-success",
          `$ 2FA ${isEnabled ? "enabled" : "disabled"} successfully`,
          "success",
        );
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
      } else {
        this.showProfileAlert(
          "profile-alert",
          `$ ${data.error || "2FA update failed"}`,
        );
        if (this.currentUser) {
          (document.getElementById("profile-2fa") as HTMLInputElement).checked =
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
    } catch (error) {
      this.showProfileAlert("profile-alert", "$ network error");
      btn.textContent = "$ apply security settings";
      btn.disabled = false;
      console.error("2FA update error:", error);
    }
  }

  private showProfileAlert(
    id: string,
    message: string,
    type: string = "error",
  ): void {
    const alert = document.getElementById(id);
    if (alert) {
      alert.textContent = message;
      alert.classList.remove("hidden");

      alert.style.transform = "translate(-50%, -20px)";
      alert.style.opacity = "-0";

      setTimeout(() => {
        alert.style.transform = "translate(-50%, 0)";
        alert.style.opacity = "1";
        alert.style.transition = "all 0.3s ease-out";
      }, 10);

      setTimeout(() => this.hideProfileAlert(id), 2000);
    }
  }

  private hideProfileAlert(id: string): void {
    const alert = document.getElementById(id);
    if (alert && !alert.classList.contains("hidden")) {
      alert.style.transform = "translate(-50%, -20px)";
      alert.style.opacity = "0";

      setTimeout(() => {
        alert.classList.add("hidden");
        alert.style.transform = "";
        alert.style.opacity = "";
        alert.style.transition = "";
      }, 300);
    }
  }

  private hideProfileAlerts(): void {
    this.hideProfileAlert("profile-alert");
    this.hideProfileAlert("profile-success");
  }

  private handleBrowserNavigation(): void {
    window.addEventListener("popstate", (event) => {
      const path = window.location.pathname;

      if (path === "/") {
        window.router.navigate("/");
        return;
      }

      if (path.startsWith("/game")) {
        if (path === "/game") {
          this.showSectionWithoutPush("tournament");
        } else if (path.startsWith("/game/")) {
          const section = path.replace("/game/", "");
          if (["tournament", "dashboard", "profile"].includes(section)) {
            this.showSectionWithoutPush(section);
          } else {
            this.showSectionWithoutPush("tournament");
          }
        }
      }
    });

    const currentPath = window.location.pathname;
    if (currentPath.startsWith("/game/")) {
      const section = currentPath.replace("/game/", "");
      if (["tournament", "dashboard", "profile"].includes(section)) {
        this.currentSection = section;
      }
    } else if (currentPath === "/game") {
      this.currentSection = "tournament";
    }
  }

  private showSectionWithoutPush(sectionName: string): void {
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.add("hidden");
    });

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("bg-blue-500", "text-white");
      btn.classList.add("text-gray-400");
    });

    document
      .getElementById(`section-${sectionName}`)!
      .classList.remove("hidden");

    const activeBtn = document.querySelector(
      `[data-section="${sectionName}"]`,
    )!;
    activeBtn.classList.remove("text-gray-400");
    activeBtn.classList.add("bg-blue-500", "text-white");

    this.currentSection = sectionName;
    console.log(`Section active (browser nav): ${sectionName}`);
    if (sectionName === "dashboard") {
      this.loadDashboardData();
    } else if (sectionName === "profile") {
      this.loadUserProfile();
    }
  }

  private showSection(sectionName: string): void {
    if (this.currentSection === sectionName) {
      return;
    }
    document.querySelectorAll(".section").forEach((section) => {
      section.classList.add("hidden");
    });

    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("bg-blue-500", "text-white");
      btn.classList.add("text-gray-400");
    });

    document
      .getElementById(`section-${sectionName}`)!
      .classList.remove("hidden");

    const activeBtn = document.querySelector(
      `[data-section="${sectionName}"]`,
    )!;
    activeBtn.classList.remove("text-gray-400");
    activeBtn.classList.add("bg-blue-500", "text-white");

    const newUrl = `/game/${sectionName}`;
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ section: sectionName }, "", newUrl);
    }

    this.currentSection = sectionName;
    if (sectionName === "profile") {
      this.loadUserProfile();
    }
    if (sectionName === "dashboard") {
      this.loadDashboardData();
    }
  }

  ///////////////////////////////////////////game//////////////////////////////////////

  private startGame(mode: "local" | "ai" | "remote"): void {
    const canvasDiv = document.getElementById("game-canvas")!;

    let controlsHTML = "";

    if (mode === "local") {
      controlsHTML = `
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono">[PONG]</div>
          <p class="font-mono mb-6">pong.exe ready</p>
          <p class="font-mono text-blue-400 mb-8">local mode initialized</p>

          <!-- Contrôles Local -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-auto mb-6">
            <h3 class="font-mono text-white font-bold mb-4">$ controls --local</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="text-left">
                <div class="font-mono text-blue-400 font-bold mb-2">PLAYER 1</div>
                <div class="font-mono text-gray-300">W - move up</div>
                <div class="font-mono text-gray-300">S - move down</div>
              </div>
              <div class="text-left">
                <div class="font-mono text-purple-400 font-bold mb-2">PLAYER 2</div>
                <div class="font-mono text-gray-300">I - move up</div>
                <div class="font-mono text-gray-300">K - move down</div>
              </div>
            </div>
          </div>

          <button id="start-local-game" class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-mono font-bold rounded-lg transition-colors">
            $ start-game
          </button>
        </div>
      `;
    } else if (mode === "ai") {
      controlsHTML = `
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono">[PONG]</div>
          <p class="font-mono mb-6">pong.exe ready</p>
          <p class="font-mono text-purple-400 mb-8">ai mode initialized</p>

          <!-- Contrôles AI -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-auto mb-6">
            <h3 class="font-mono text-white font-bold mb-4">$ controls --ai</h3>
            <div class="text-center">
              <div class="font-mono text-blue-400 font-bold mb-3">PLAYER vs AI</div>
              <div class="font-mono text-gray-300 mb-2">🖱️ Mouse - control paddle</div>
              <div class="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                <div class="font-mono text-purple-400 text-sm">AI opponent active</div>
              </div>
            </div>
          </div>

          <button id="start-ai-game" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-mono font-bold rounded-lg transition-colors">
            $ start-game
          </button>
        </div>
      `;
    } else if (mode === "remote") {
      controlsHTML = `
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono">[PONG]</div>
          <p class="font-mono mb-6">pong.exe ready</p>
          <p class="font-mono text-green-400 mb-8">remote mode selected ᯤ</p>

          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-auto mb-6">
            <div class="space-y-4">
              <button id="create-room" class="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-mono font-bold rounded-lg transition-colors">
                $--create room
              </button>
              <button id="join-room" class="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-mono font-bold rounded-lg transition-colors">
                $--join room
              </button>
            </div>
            </div>
          </div>
        </div>
      `;
    }

    canvasDiv.innerHTML = controlsHTML;

    if (mode == "local" || mode == "ai") {
      const startButton = document.getElementById(`start-${mode}-game`);
      if (startButton) {
        startButton.addEventListener("click", () => {
          this.launchGame(mode);
        });
      }
    } else if (mode === "remote") {
      const createRoomBtn = document.getElementById("create-room");
      const joinRoomBtn = document.getElementById("join-room");

      if (createRoomBtn) {
        createRoomBtn.addEventListener("click", () => {
          this.showProfileAlert(
            "profile-alert",
            "$ create: feature not implemented yet",
          );
        });
      }

      if (joinRoomBtn) {
        joinRoomBtn.addEventListener("click", () => {
          this.showProfileAlert(
            "profile-alert",
            "$ join: feature not implemented yet",
          );
        });
      }
    }
  }

  private async launchGame(mode: "local" | "ai" | "remote"): Promise<void> {
    // POST = creation match
    if (mode === "local" || mode === "ai") {
      const matchId = await this.createMatch(mode);
      if (!matchId) {
        console.error("Failed to create match, aborting game start");
        return;
      }
    }
    //remote a ajouter plus tard

    const canvasDiv = document.getElementById("game-canvas")!;
    canvasDiv.innerHTML = `<canvas id="renderCanvas" class="w-full h-full" tabindex="0"></canvas>`;

    const oldScript = document.getElementById("pong-script");
    if (oldScript) oldScript.remove();

    let scriptSrc = "../../pong/pong.js";
    if (mode === "ai") scriptSrc = "../../pong/pov.js";
    if (mode === "remote") scriptSrc = "../../pong/pong.js"; //ou jsp quoi

    const script = document.createElement("script");
    script.id = "pong-script";
    script.src = scriptSrc;
    script.async = true;

    canvasDiv.appendChild(script);

    console.log(`Game ${mode} started`);
  }
  ///////////////////////////////////////////game//////////////////////////////////////

  //////////////////////////////////////////tournois//////////////////////////////////////
  private showTournamentPopup(): void {
    const nameInput = document.querySelector(
      'input[placeholder="tournament_name"]',
    ) as HTMLInputElement;
    const playersSelect = document.querySelector("select") as HTMLSelectElement;

    if (!nameInput || !playersSelect) {
      this.showProfileAlert(
        "profile-alert",
        "$ error: form elements not found",
      );
      return;
    }

    const tournamentName = nameInput.value.trim();
    const maxPlayersText = playersSelect.value;
    const maxPlayers = parseInt(maxPlayersText.split(".")[0]);

    if (!tournamentName) {
      this.showProfileAlert(
        "profile-alert",
        "$ error: tournament name required",
      );
      return;
    }

    this.createTournamentPopup(tournamentName, maxPlayers);
  }

  private createTournamentPopup(
    tournamentName: string,
    maxPlayers: number,
  ): void {
    const existingPopup = document.getElementById("tournament-popup");
    if (existingPopup) {
      existingPopup.remove();
    }

    let aliasFields = "";
    for (let i = 1; i <= maxPlayers; i++) {
      const isCurrentUser = i === 1;
      const placeholder = isCurrentUser
        ? this.currentUser?.alias || this.currentUser?.login || "Your alias"
        : `Player ${i}`;
      const value = isCurrentUser
        ? this.currentUser?.alias || this.currentUser?.login || ""
        : "";

      aliasFields += `
        <div class="mb-4">
          <label class="block font-mono text-sm text-gray-400 mb-2">
            Player ${i} ${isCurrentUser ? "(You)" : ""}
          </label>
          <input
            type="text"
            id="player-${i}-alias"
            value="${value}"
            placeholder="${placeholder}"
            ${isCurrentUser ? "readonly" : ""}
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isCurrentUser ? "opacity-75 cursor-not-allowed" : ""}"
          >
        </div>
      `;
    }

    const popup = document.createElement("div");
    popup.id = "tournament-popup";
    popup.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]";

    popup.innerHTML = `
      <div class="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full mx-4 relative">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-mono text-xl font-bold text-yellow-400">$ setup-tournament</h3>
          <button id="close-popup" class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <!-- Tournament Info -->
        <div class="mb-6 p-4 bg-gray-800 rounded-lg">
          <div class="font-mono text-white font-bold">${tournamentName}</div>
          <div class="font-mono text-gray-400 text-sm">${maxPlayers} players tournament</div>
        </div>

        <!-- Alias Fields -->
        <div class="mb-6 max-h-64 overflow-y-auto">
          ${aliasFields}
        </div>

        <!-- Buttons -->
        <div class="flex gap-4">
          <button id="cancel-tournament" class="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-mono rounded-lg transition-colors">
            $ cancel
          </button>
          <button id="create-tournament" class="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-mono font-bold rounded-lg transition-colors">
            $ create
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    document.getElementById("close-popup")?.addEventListener("click", () => {
      popup.remove();
    });

    document
      .getElementById("cancel-tournament")
      ?.addEventListener("click", () => {
        popup.remove();
      });

    document
      .getElementById("create-tournament")
      ?.addEventListener("click", () => {
        this.handleCreateTournamentFromPopup(tournamentName, maxPlayers);
        popup.remove();
      });

    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.remove();
      }
    });
  }

  private async handleCreateTournamentFromPopup(
    tournamentName: string,
    maxPlayers: number,
  ): Promise<void> {
    const players: string[] = [];

    for (let i = 1; i <= maxPlayers; i++) {
      const aliasInput = document.getElementById(
        `player-${i}-alias`,
      ) as HTMLInputElement;
      if (aliasInput) {
        const alias = aliasInput.value.trim();
        if (!alias) {
          this.showProfileAlert(
            "profile-alert",
            `$ error: Player ${i} alias is required`,
          );
          return;
        }
        players.push(alias);
      }
    }

    const uniqueAliases = new Set(players);
    if (uniqueAliases.size !== players.length) {
      this.showProfileAlert(
        "profile-alert",
        "$ error: all aliases must be unique",
      );
      return;
    }

    try {
      console.log(
        ` creating tournament: ${tournamentName} with players:`,
        players,
      );
      // POST du tournoi
      const response = await fetch("/tournament", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: tournamentName,
          max_players: maxPlayers,
          players: players,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Tournament creation failed:", errorText);
        this.showProfileAlert(
          "profile-alert",
          `$ error: failed to create tournament`,
        );
        return;
      }

      const data = await response.json();
      console.log(" Tournament created:", data);

      this.showProfileAlert(
        "profile-success",
        `$ tournament "${tournamentName}" created`,
        "success",
      );

      const nameInput = document.querySelector(
        'input[placeholder="tournament_name"]',
      ) as HTMLInputElement;
      if (nameInput) nameInput.value = "";

      this.showTournamentRules(tournamentName, players, data);
    } catch (error) {
      console.error(" Error creating tournament:", error);
      this.showProfileAlert("profile-alert", `$ error: network error`);
    }
  }

  private showTournamentRules(
    tournamentName: string,
    players: string[],
    tournamentData: any,
  ): void {
    const canvasDiv = document.getElementById("game-canvas")!;

    const displayName =
      tournamentName.length > 25
        ? tournamentName.substring(0, 25) + "..."
        : tournamentName;

    canvasDiv.innerHTML = `
      <div class="text-center text-white h-[500px] flex flex-col p-6 overflow-hidden">
        <!-- Header -->
        <div class="mb-4 flex-shrink-0">
          <div class="text-3xl mb-2 font-mono text-yellow-400">[TOURNOI]</div>
          <h2 class="font-mono text-xl font-bold mb-1" title="${tournamentName}">${displayName}</h2>
          <p class="font-mono text-gray-400">${players.length} participants • </p>
        </div>

        <!-- Contenu scrollable -->
        <div class="flex-1 overflow-auto min-h-0 space-y-6">

          <!-- Liste des participants -->
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 class="font-mono text-blue-400 font-bold mb-4 text-center">$ participants</h3>
            <div class="grid grid-cols-2 gap-3">
              ${players
                .map(
                  (player, index) => `
                <div class="bg-gray-800 border ${index === 0 ? "border-green-500" : "border-gray-600"} rounded px-3 py-2 font-mono text-sm">
                  <span class="text-gray-400">${index + 1}.</span>
                  <span class="${index === 0 ? "text-green-400 font-bold" : "text-white"}">${player}</span>
                  ${index === 0 ? '<span class="text-green-400 text-xs"> (Vous)</span>' : ""}
                </div>
              `,
                )
                .join("")}
            </div>
          </div>

          <!-- Règles du tournoi -->
          <div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 class="font-mono text-purple-400 font-bold mb-4 text-center">$ règles</h3>
            <div class="text-left space-y-2 font-mono text-sm text-gray-300">
              <div class="flex items-start gap-2">
                <span class="text-yellow-400">•</span>
                <span>Tournoi à élimination directe</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-yellow-400">•</span>
                <span>Premier à 7 points gagne le match</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-yellow-400">•</span>
                <span>Les matchs se jouent en tour par tour</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-yellow-400">•</span>
                <span>Le vainqueur passe au tour suivant</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-yellow-400">•</span>
                <span>Le perdant est éliminé définitivement</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-yellow-400">•</span>
                <span>Le dernier joueur restant remporte le tournoi</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Bouton pour commencer -->
        <div class="mt-4 flex-shrink-0">
          <button id="start-tournament" class="w-full max-w-sm mx-auto px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-mono font-bold rounded-lg transition-colors block">
            $ START TOURNAMENT
          </button>
        </div>
      </div>
    `;

    document
      .getElementById("start-tournament")
      ?.addEventListener("click", () => {
        //FAIRE POSt match
        this.showProfileAlert(
          "profile-success",
          "$ post match a faire",
          "success",
        );
        console.log("Starting tournament with data:", tournamentData);
      });
  }
  ///////////////////////////////////////////tournois//////////////////////////////////////

  private async handleLogout(): Promise<void> {
    if (confirm("$ logout: Are you sure you want to exit?")) {
      console.log("Logging out...");
      try {
        await fetch("/auth/signout", {
          method: "GET",
          credentials: "include",
        });
      } catch (err) {
        console.error("Logout failed:", err);
      }
      if (window.socket) {
        window.socket.close();
        console.log("Socket closed, redirecting to home...");
      } else {
        console.log("No active socket to close.");
      }
      setTimeout(() => {
        window.router.navigate("/");
      }, 500);
    }
  }
}
