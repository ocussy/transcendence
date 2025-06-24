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
        this.router.addRoute("/game/tournament", () => {
            new game_js_1.GamePage();
        });
        this.router.addRoute("/game/dashboard", () => {
            new game_js_1.GamePage();
        });
        this.router.addRoute("/game/profile", () => {
            new game_js_1.GamePage();
        });
        // retour et avance a revoir
        window.addEventListener("popstate", () => {
            this.router.navigate(window.location.pathname);
        });
        // start sur auth
        const currentPath = window.location.pathname;
        this.router.navigate(currentPath === "/" ? "/auth" : currentPath);
    }
}
// DOM a revoir
document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    window.router = app["router"];
});
