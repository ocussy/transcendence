import { Router } from "./router.js";
import { AuthPage } from "./pages/auth.js";
import { GamePage } from "./pages/game.js";
import "./sus.js";

class App {
  private router: Router;

  constructor() {
    this.router = new Router();
    this.initializeApp();
    
    window.onbeforeunload = () => {
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.close();
      }
    };
  }

  private initializeApp(): void {
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
}
declare global {
  interface Window {
    handleCredentialResponse: (response: any) => void;
    router: Router;
    socket?: WebSocket;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  window.router = app["router"];
});
