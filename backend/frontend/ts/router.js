"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
// pour SPA
class Router {
    constructor() {
        this.routes = new Map();
        this.currentPath = "";
    }
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }
    //navigue vers une nouvelle page (sans rechargement a revoir)
    navigate(path) {
        if (this.currentPath === path) {
            return;
        }
        const handler = this.routes.get(path);
        if (handler) {
            // maj sans recharger la page a rvoir aussi
            if (window.location.pathname !== path) {
                window.history.pushState({}, "", path);
            }
            this.currentPath = path;
            handler();
            console.log(`🚀 Navigated to: ${path}`);
        }
        else {
            console.warn(`⚠️ Route not found: ${path}`);
            this.navigate("/auth");
        }
    }
    getCurrentPath() {
        return this.currentPath;
    }
    hasRoute(path) {
        return this.routes.has(path);
    }
    //revenir en arriere
    goBack() {
        window.history.back();
    }
    //avancer
    goForward() {
        window.history.forward();
    }
}
exports.Router = Router;
