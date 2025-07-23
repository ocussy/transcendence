import { socket } from "./auth.js";
import { tryConnectWebSocketIfAuthenticated} from "./auth.js";
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
      case "tournament":
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
        return `${x},${y}`;
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
      const languageSelect = document.getElementById(
        "profile-language",
      ) as HTMLSelectElement;
      const avatarImg = document.getElementById(
        "user-avatar",
      ) as HTMLImageElement;
      const avatarUrlInput = document.getElementById(
        "profile-avatar-url",
      ) as HTMLInputElement;
      const twoFAToggle = document.getElementById(
        "profile-2fa",
      ) as HTMLInputElement;

      if (usernameInput) usernameInput.value = user.login || "";
      if (emailInput) emailInput.value = user.email || "";
      if (languageSelect) languageSelect.value = user.language || "fr";
      if (avatarImg && user.avatarUrl) avatarImg.src = user.avatarUrl;
      if (avatarUrlInput) avatarUrlInput.value = user.avatarUrl || "";
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
                ${friend.games_played === 0 ? "No matches" : `${friend.games_won}% • ${friend.games_played}m`}
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
    `,
      )
      .join("");
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
      .getElementById("tournament-start-btn")!
      .addEventListener("click", () => {
        this.startGame("tournament");
      });

    this.attachProfileEvents();
  }

  private attachProfileEvents(): void {
    document
      .getElementById("profile-avatar-url")
      ?.addEventListener("input", (e) => {
        const url = (e.target as HTMLInputElement).value;
        const preview = document.getElementById(
          "user-avatar",
        ) as HTMLImageElement;
        if (url) {
          preview.src = url;
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
    const language = (
      document.getElementById("profile-language") as HTMLSelectElement
    ).value;
    const avatarUrl = (
      document.getElementById("profile-avatar-url") as HTMLInputElement
    ).value.trim();
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

      if (type === "success") {
        setTimeout(() => this.hideProfileAlert(id), 4000);
      }
    }
  }

  private hideProfileAlert(id: string): void {
    const alert = document.getElementById(id);
    if (alert) {
      alert.classList.add("hidden");
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

  private startGame(mode: "local" | "ai" | "tournament"): void {
    const canvasDiv = document.getElementById("game-canvas")!;
    canvasDiv.innerHTML = `<canvas id="renderCanvas" class="w-full h-full" tabindex="0"></canvas>`;

    const oldScript = document.getElementById("pong-script");
    if (oldScript) oldScript.remove();

    let scriptSrc = "../../pong/pong.js";
    if (mode === "ai") scriptSrc = "../../pong/pov.js";
    if (mode === "tournament") scriptSrc = "../../pong/newPov.js";

    const script = document.createElement("script");
    script.id = "pong-script";
    script.src = scriptSrc;
    script.async = true;
    canvasDiv.appendChild(script);
  }

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
