"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// main.ts - Point d'entrée de l'application SPA
const router_js_1 = require("./router.js");
const auth_js_1 = require("./pages/auth.js");
const game_js_1 = require("./pages/game.js");
class App {
    constructor() {
        this.router = new router_js_1.Router();
        this.initializeApp();
    }
    initializeApp() {
        //def les routes
        this.router.addRoute("/", () => {
            new auth_js_1.AuthPage();
        });
        this.router.addRoute("/auth", () => {
            new auth_js_1.AuthPage();
        });
        this.router.addRoute("/game", () => {
            new game_js_1.GamePage();
        });
        this.router.addRoute("/tournament", () => {
            this.renderPlaceholder("Tournament Page");
        });
        this.router.addRoute("/dashboard", () => {
            this.renderPlaceholder("Dashboard Page");
        });
        // retour et avance a revoir
        window.addEventListener("popstate", () => {
            this.router.navigate(window.location.pathname);
        });
        // start sur auth
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
// DOM a revoir
document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    window.router = app["router"];
});
