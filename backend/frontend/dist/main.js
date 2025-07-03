import { Router } from "./router.js";
import { AuthPage } from "./pages/auth.js";
import { GamePage } from "./pages/game.js";
class App {
    constructor() {
        this.router = new Router();
        this.verifyToken();
        this.initializeApp();
    }
    initializeApp() {
        this.router.addRoute("/", () => {
            new AuthPage();
        });
        this.router.addRoute("/auth", () => {
            new AuthPage();
        });
        this.router.addRoute("/game", () => {
            new GamePage();
        });
        this.router.addRoute("/game/tournament", () => {
            new GamePage();
        });
        this.router.addRoute("/game/dashboard", () => {
            new GamePage();
        });
        this.router.addRoute("/game/profile", () => {
            new GamePage();
        });
        window.addEventListener("popstate", () => {
            this.router.navigate(window.location.pathname);
        });
        const currentPath = window.location.pathname;
        this.router.navigate(currentPath === "/" ? "/auth" : currentPath);
    }
    async verifyToken() {
        const token = localStorage.getItem("token");
        if (!token)
            return;
        console.log("🔍 Vérification du token JWT...");
        try {
            const res = await fetch("/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok)
                throw new Error("Token invalide");
            const data = await res.json();
            console.log("✅ Utilisateur connecté :", data.user);
        }
        catch (err) {
            console.error("❌ Erreur vérification token :", err);
        }
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    window.router = app["router"];
});
//# sourceMappingURL=main.js.map