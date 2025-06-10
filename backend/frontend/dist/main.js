import { Router } from "./router.js";
import { AuthPage } from "./pages/auth.js";
import { GamePage } from "./pages/game.js";
class App {
    constructor() {
        this.router = new Router();
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
        this.router.addRoute("/tournament", () => {
            this.renderPlaceholder("Tournament Page");
        });
        this.router.addRoute("/dashboard", () => {
            this.renderPlaceholder("Dashboard Page");
        });
        window.addEventListener("popstate", () => {
            this.router.navigate(window.location.pathname);
        });
        const currentPath = window.location.pathname;
        this.router.navigate(currentPath === "/" ? "/auth" : currentPath);
    }
    renderPlaceholder(pageTitle) {
        const app = document.getElementById("app");
        app.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: white;">
                <h1>${pageTitle}</h1>
                <p>Cette page sera implémentée plus tard</p>
                <button onclick="window.router.navigate('/auth')"
                        style="padding: 1rem; margin-top: 1rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Retour à l'auth
                </button>
            </div>
        `;
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    window.router = app["router"];
});
//# sourceMappingURL=main.js.map