
(() => {
    // Protection : si déjà défini, on sort
    if (window.RemotePongGame) {
        console.warn("RemotePongGame déjà défini — réutilisation.");
        return;
    }
class RemotePongGame {
    constructor() {
        // Déplacer toutes les variables globales ici
        this.gameStartTime = null;
        this.gameEndTime = null;
        this.gameDurationSeconds = 0;
        this.isGameOver = false;
        this.gameStarted = false;
        this.isWaitingAfterGoal = false;
        this.hasCollidedLeft = false;
        this.hasCollidedRight = false;
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.fontDataGlobal = null;
        this.myText = null;
        this.myText2 = null;
        
        // Variables WebSocket pour le remote
        this.socket = null;
        this.playerId = null;
        this.isPlayer1 = false;
        this.isMaster = false;
        this.gameState = null;
        this.player1Name = null;
        this.player2Name = null;
        this.currentUserName = null;
        // ✅ AJOUTER les logins pour l'enregistrement en BDD
        this.player1Login = null;
        this.player2Login = null;
        
        // Variables Babylon.js
        this.canvas = null;
        this.engine = null;
        this.scene = null;
        this.leftPaddle = null;
        this.rightPaddle = null;
        this.boxes = [];
        this.keys = {};
        
        this.GAME_CONFIG = {
            playWidth: 19,
            playHeight: 3,
            ballSpeed: 0.15,
            ballInitialSpeed: 0.15,
            scoreLimit: 1,
            maxSpeed: 0.6,
            accelerationFactor: 1.01,
            minZ: -4.3,
            maxZ: 4.3,
            ballRadius: 0.15,
            paddleHalfWidth: 0.1,
            paddleHalfDepth: 0.65,
            accelerationOnHit: 1.05
        };
    }

       async connectToServer() {
        try {
            // Récupérer les informations du localStorage (définies par game.ts)
            // const roomId = localStorage.getItem('currentRoomId');
            // const opponentId = localStorage.getItem('opponentId');
            
            // if (!roomId) {
            //     console.error("Pas de roomId trouvé dans localStorage");
            //     return;
            // }

            // Utiliser la socket globale créée par game.ts
            this.socket = window.gameSocket;
            
            if (!this.socket) {
                console.error("Pas de gameSocket trouvée");
                return;
            }

            // Gérer les messages WebSocket
            // Dans connectToServer()
            this.socket.onmessage = (event) => {
                
                try {
                    const data = JSON.parse(event.data);
                    data.isRemote = true; // Indiquer que c'est un message du remote
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error("❌ Erreur parsing message:", error);
                }
            };

            this.socket.onclose = () => {
                console.log("Connexion fermée");
            };

            this.socket.onerror = (error) => {
                console.error("Erreur WebSocket:", error);
            };

            console.log("✅ Connecté au serveur de jeu");
            
        } catch (error) {
            console.error("Erreur connexion serveur:", error);
        }
    }


        // NOUVELLE fonction pour gérer les messages du serveur
    handleServerMessage(data) {
        console.log("📩 Message jeu remote pong reçu:", data.type);
        switch(data.type) {
            case 'waiting_for_opponent':
                // ✅ PREMIER JOUEUR EN ATTENTE
                this.playerId = data.playerId;
                this.isPlayer1 = data.playerSide === 'left';
                this.isMaster = data.playerIndex === 0;
                this.isLeftPlayer = data.isLeftPlayer;
                
                console.log("⏳ En attente du deuxième joueur...", {
                    playerId: this.playerId,
                    isPlayer1: this.isPlayer1,
                    isMaster: this.isMaster
                });
                break;

            case 'game_init':
                // ✅ LES DEUX JOUEURS SONT LÀ - TOUTES LES INFOS SONT COMPLÈTES
                this.playerId = data.playerId;
                this.isPlayer1 = data.playerSide === 'left';
                this.isMaster = data.playerIndex === 0;
                this.gameState = data.gameState;
                this.isLeftPlayer = data.isLeftPlayer;
                
                // ✅ RÉCUPÉRER LES LOGINS ET NOMS (MAINTENANT COMPLETS)
                this.player1Login = data.player1Login;
                this.player2Login = data.player2Login;
                this.player1Name = data.player1Name;
                this.player2Name = data.player2Name;
                this.currentUserName = data.currentUserName;

                console.log("🎮 Les deux joueurs connectés - Démarrage du jeu:", {
                    master: this.isMaster,
                    isLeftPlayer : this.isLeftPlayer,
                    player1: `${this.player1Name} (${this.player1Login})`,
                    player2: `${this.player2Name} (${this.player2Login})`,
                    currentUser: this.currentUserName
                });
                
                // ✅ CRÉER LA SCÈNE IMMÉDIATEMENT
                this.createGameScene();
                break;

            case 'paddle_movement':
                this.updateOpponentPaddle(data);
                break;

            case 'physics_update':
                if (!this.isMaster) {
                    this.updateBallFromServer(data);
                }
                break;

            case 'goal_scored':
                this.handleGoal(data);
                break;

            case 'game_started':
                this.handleGameStart(data);
                break;

            case 'player_disconnected':
                this.handlePlayerDisconnected(data);
                break;

            case 'visual_effect':
                this.handleVisualEffect(data);
                break;

            default:
                console.log("Message non géré:", data);
        }
    }

  async createGameScene() {
        const canvas = document.getElementById("renderCanvas");
        if (!canvas) {
            console.error("Canvas 'renderCanvas' introuvable !");
            return;
        }
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this.scene = new BABYLON.Scene(this.engine);
        
        // Ajouter texture environnementale (comme dans pong.js)
        const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
            "https://playground.babylonjs.com/textures/environment.env",
            this.scene
        );
        this.scene.environmentTexture = hdrTexture;
        this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Caméra (identique à pong.js)
        const camera2 = new BABYLON.ArcRotateCamera(
            "cam2",
            Math.PI / 2 + Math.PI,
            Math.PI / 3,
            20,
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        camera2.lowerRadius = 8;
        camera2.upperRadius = 20;
        camera2.lowerBeta = Math.PI / 6;
        camera2.upperBeta = Math.PI / 2;
        camera2.detachControl(canvas);

        // Sol (identique à pong.js)
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 20, 
            height: 10
        }, this.scene);
        
        const mirrorMat = new BABYLON.PBRMaterial("mirror", this.scene);
        mirrorMat.metallic = 1.0;
        mirrorMat.roughness = 0.1;
        mirrorMat.environmentTexture = hdrTexture;
        mirrorMat.albedoColor = new BABYLON.Color3(0, 0, 0);
        ground.material = mirrorMat;
        this.scene.ground = ground;

        // Paddles (identique à pong.js)
        const paddleOptions = { width: 0.2, height: 0.3, depth: 1.3 };
        this.leftPaddle = BABYLON.MeshBuilder.CreateBox("leftPaddle", paddleOptions, this.scene);
        this.leftPaddle.position.set(this.GAME_CONFIG.playWidth / 2 - 0.2, 0.5, 0);
        this.rightPaddle = BABYLON.MeshBuilder.CreateBox("rightPaddle", paddleOptions, this.scene);
        this.rightPaddle.position.set(-this.GAME_CONFIG.playWidth / 2 + 0.2, 0.5, 0);
        
        // Matériaux des paddles
        const rightMaterial = new BABYLON.PBRMaterial("rightPaddleMat", this.scene);
        rightMaterial.metallic = 1.0;
        rightMaterial.roughness = 0.2;
        rightMaterial.albedoColor = new BABYLON.Color3(0.1, 0.6, 1);
        rightMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.6, 1);
        this.rightPaddle.material = rightMaterial;

        const leftMaterial = new BABYLON.PBRMaterial("leftPaddleMat", this.scene);
        leftMaterial.metallic = 1.0;
        leftMaterial.roughness = 0.2;
        leftMaterial.albedoColor = new BABYLON.Color3(1, 0.1, 0.1);
        leftMaterial.emissiveColor = new BABYLON.Color3(1, 0.1, 0.1);
        this.leftPaddle.material = leftMaterial;
        
        // Balle
        const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.3 }, this.scene);
        ball.position.set(0, 0.5, 0);

        const ballMaterial = new BABYLON.StandardMaterial("ballMat", this.scene);
        ballMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        ball.material = ballMaterial;
        this.scene.ball = ball;
        this.scene.ballVelocity = new BABYLON.Vector3(0, 0, 0);
        
        // Particules d'explosion (identique à pong.js)
        this.scene.explosionSpheres = [];
        for (let i = 0; i < 500; i++) {
            const sphere = BABYLON.MeshBuilder.CreateSphere(`particle${i}`, {
                diameter: 0.2 + Math.random() * 0.4,
                segments: 6
            }, this.scene);
            sphere.isVisible = false;
            this.scene.explosionSpheres.push(sphere);
        }
        
        this.dynamicTexture = new BABYLON.DynamicTexture("dtScore", { width:512, height:256 }, this.scene, false);
        this.dynamicTexture.hasAlpha = true;

        this.createLights(this.scene);
        
        // Reflets (identique à pong.js)
        const reflectionProbe = new BABYLON.ReflectionProbe("probe", 512, this.scene);
        this.boxes.forEach(({ box }) => reflectionProbe.renderList.push(box));

        mirrorMat.reflectionTexture = reflectionProbe.cubeTexture;
        mirrorMat.reflectivityColor = new BABYLON.Color3(1, 1, 1);
        mirrorMat.useMicroSurfaceFromReflectivityMapAlpha = false;

        mirrorMat.reflectivityFresnelParameters = new BABYLON.FresnelParameters();
        mirrorMat.reflectivityFresnelParameters.power = 1;
        
        // Attendre que les deux joueurs soient connectés avant de commencer
        if (this.isMaster) {
            setTimeout(async() => {
                this.sendVisualEffect("countdown", {});
                await this.countdown();
                const direction = Math.random() < 0.5 ? -1 : 1;
                this.scene.ballVelocity.set(
                    this.GAME_CONFIG.ballInitialSpeed * direction,
                    0,
                    (Math.random() - 0.5) * 0.02
                );
                this.gameStarted = true;
                this.startGameTimer();
                this.sendGameStart();
            }, 2000);
        }
        await this.loadFont();
        await this.setupEventListeners();
        await this.startRenderLoop();
        
        console.log("✅ Scène créée et jeu démarré");
    }

    // Event Listeners (adapté pour le remote)
    async setupEventListeners() {
        const keydownHandler = (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            
            if (key === "r" && this.isGameOver) {
                this.restartGame();
            }
            e.preventDefault();
        };
        
        const keyupHandler = (e) => {
            this.keys[e.key.toLowerCase()] = false;
            e.preventDefault();
        };
        
        window.addEventListener("keydown", keydownHandler);
        window.addEventListener("keyup", keyupHandler);
        window.addEventListener("resize", () => this.engine.resize());
    }

    // Boucle de rendu (MODIFIÉE pour le remote)
    async startRenderLoop() {
        this.engine.runRenderLoop(() => {
            if (!this.scene || !this.scene.ball) return;
            
            // Contrôles des paddles (UN SEUL paddle par joueur)
            this.updatePaddleControls();
            
            // Physique - SEULEMENT si je suis le master
            if (this.isMaster && this.gameStarted && !this.isGameOver) {
                this.updateGamePhysics();
                this.sendBallUpdate();
            }
            
            this.scene.render();
        });
    }

    // Contrôles des paddles (NOUVEAU - un paddle par joueur)
    updatePaddleControls() {
        const speed = this.GAME_CONFIG.ballSpeed;
        let moved = false;
        
        if (this.isLeftPlayer) {
            // Player1 (gauche) utilise W et S
            if (this.keys["w"] && this.rightPaddle.position.z + speed <= this.GAME_CONFIG.maxZ) {
                this.rightPaddle.position.z += speed;
                moved = true;
            }
            if (this.keys["s"] && this.rightPaddle.position.z - speed >= this.GAME_CONFIG.minZ) {
                this.rightPaddle.position.z -= speed;
                moved = true;
            }
        } else {
            // Player2 (droite) utilise I et K  
            if (this.keys["i"] && this.leftPaddle.position.z + speed <= this.GAME_CONFIG.maxZ) {
                this.leftPaddle.position.z += speed;
                moved = true;
            }
            if (this.keys["k"] && this.leftPaddle.position.z - speed >= this.GAME_CONFIG.minZ) {
                this.leftPaddle.position.z -= speed;
                moved = true;
            }
        }
        // Envoyer les mouvements au serveur
        if (moved) {
            this.sendPaddleMovement();
        }
    }
    
        // Physique du jeu (SEULEMENT pour le master)
        updateGamePhysics() {
            const ball = this.scene.ball;
            const velocity = this.scene.ballVelocity;
            
            // Fonction pour limiter la vitesse
            const clampVelocity = () => {
                const speed = velocity.length();
                if (speed > this.GAME_CONFIG.maxSpeed) {
                    velocity.scaleInPlace(this.GAME_CONFIG.maxSpeed / speed);
                }
            };
    
            // Mouvement de la balle
            ball.position.addInPlace(velocity);
    
            // Collisions avec les murs
            if (ball.position.z <= this.GAME_CONFIG.minZ || ball.position.z >= this.GAME_CONFIG.maxZ) {
                velocity.z *= -1;
            }
    
            // Reset des flags de collision
            if (ball.position.x < this.leftPaddle.position.x - 1) {
                this.hasCollidedLeft = false;
            }
            if (ball.position.x > this.rightPaddle.position.x + 1) {
                this.hasCollidedRight = false;
            }
    
            // Collisions avec les paddles
            // Paddle gauche
            if (velocity.x > 0 && !this.hasCollidedLeft &&
                Math.abs(ball.position.x - this.leftPaddle.position.x) < this.GAME_CONFIG.paddleHalfWidth + this.GAME_CONFIG.ballRadius &&
                Math.abs(ball.position.z - this.leftPaddle.position.z) < this.GAME_CONFIG.paddleHalfDepth) {
                
                velocity.x = -Math.abs(velocity.x) * this.GAME_CONFIG.accelerationFactor;
                const offset = ball.position.z - this.leftPaddle.position.z;
                velocity.z = offset * 0.1;
                clampVelocity();
                this.playLightWave(3, -1);
                velocity.scaleInPlace(this.GAME_CONFIG.accelerationOnHit);
                this.hasCollidedLeft = true;
    
                this.sendVisualEffect("lightwave", { startIndex: 3, direction: -1 });
            }
    
            // Paddle droit
            if (velocity.x < 0 && !this.hasCollidedRight &&
                Math.abs(ball.position.x - this.rightPaddle.position.x) < this.GAME_CONFIG.paddleHalfWidth + this.GAME_CONFIG.ballRadius &&
                Math.abs(ball.position.z - this.rightPaddle.position.z) < this.GAME_CONFIG.paddleHalfDepth) {
                
                velocity.x = Math.abs(velocity.x) * this.GAME_CONFIG.accelerationFactor;
                const offset = ball.position.z - this.rightPaddle.position.z;
                velocity.z = offset * 0.1;
                clampVelocity();
                this.playLightWave(0, 1);
                velocity.scaleInPlace(this.GAME_CONFIG.accelerationOnHit);
                this.hasCollidedRight = true;
    
                this.sendVisualEffect("lightwave", { startIndex: 0, direction: 1 });
            }
    
            // Gestion des buts
            if (!this.isWaitingAfterGoal && Math.abs(ball.position.x) > this.GAME_CONFIG.playWidth / 2 + 1) {
                let goalScored = false;
                
                if (ball.position.x > 0) {
                    this.scoreLeft++;
                    goalScored = true;
                } else {
                    this.scoreRight++;
                    goalScored = true;
                }
                
                if (goalScored) {
                    this.updateScoreTextMeshes();
                    console.log("But marqué ! Score:", this.scoreLeft, "-", this.scoreRight);
                    this.sendGoalUpdate();
                    // Vérifier la victoire
                    if (this.scoreLeft >= this.GAME_CONFIG.scoreLimit || this.scoreRight >= this.GAME_CONFIG.scoreLimit) {
                        console.log("player 1 name:", this.player1Name);
                        console.log("player 2 name:", this.player2Name);
                        this.endGame();
                        // ✅ SUPPRIMÉ : endGame() s'occupe déjà de l'enregistrement
                        return;
                    }
                    
                    this.playExplosionAnimation();
                    this.resetBallWithDelay();
                }
            }
            
            // Envoyer l'état de la balle aux autres joueurs
            this.sendBallUpdate();
        }
    
        // Envoyer mouvement paddle
        sendPaddleMovement() {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const paddle = this.isLeftPlayer ? this.rightPaddle : this.leftPaddle;
                this.socket.send(JSON.stringify({
                    type: "paddle_movement",
                    position: paddle.position.z,
                    playerSide: this.isLeftPlayer ? 'left' : 'right',
                    playerId: this.playerId,
                    fromPlayer : this.playerId,
                    timestamp: Date.now()
                }));
            }
        }
    
        // Recevoir mouvement paddle adverse
        updateOpponentPaddle(data) {
        // VÉRIFIER que ce n'est PAS notre propre mouvement
        if (data.fromPlayer !== this.playerId) {
            // console.log("data position : ", data.position);
            // LOGIQUE CORRIGÉE : Si je reçois un mouvement "left", ça vient du joueur gauche
            if (data.playerSide === 'left' && !this.isPlayer1) {
                // Je suis Player2 (droite), je reçois un mouvement du Player1 (gauche)
                this.rightPaddle.position.z = data.position;
            } 
            else if (data.playerSide === 'right' && this.isPlayer1) {
                // Je suis Player1 (gauche), je reçois un mouvement du Player2 (droite)
                this.leftPaddle.position.z = data.position;
            }
        }
    }

    // Envoyer état balle (master seulement)
    sendBallUpdate() {
        if (this.isMaster && this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Envoyer à chaque frame, pas seulement lors d'événements
        this.socket.send(JSON.stringify({
            type: "physics_update",
            ball: {
                x: this.scene.ball.position.x,
                y: this.scene.ball.position.y,
                z: this.scene.ball.position.z,
                velocityX: this.scene.ballVelocity.x,
                velocityY: this.scene.ballVelocity.y,
                velocityZ: this.scene.ballVelocity.z
            },
            gameState: {
                gameStarted: this.gameStarted,
                isWaitingAfterGoal: this.isWaitingAfterGoal
            },
            timestamp: Date.now()
        }));
    }
    }

    // Recevoir état balle (non-master seulement)
    updateBallFromServer(data) {
        if (!this.isMaster && this.scene && this.scene.ball && data.ball) {
        // Synchroniser position de la balle
        this.scene.ball.position.x = data.ball.x;
        this.scene.ball.position.y = data.ball.y || 0.5;
        this.scene.ball.position.z = data.ball.z;
        
        // Synchroniser velocité
        this.scene.ballVelocity.x = data.ball.velocityX;
        this.scene.ballVelocity.y = data.ball.velocityY || 0;
        this.scene.ballVelocity.z = data.ball.velocityZ;
        
        // Synchroniser état du jeu
        if (data.gameState) {
            this.gameStarted = data.gameState.gameStarted;
            this.isWaitingAfterGoal = data.gameState.isWaitingAfterGoal;
        }
    }
    }

    // Envoyer goal (master seulement)
    sendGoalUpdate() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "goal_scored",
                scoreLeft: this.scoreLeft,
                scoreRight: this.scoreRight,
                timestamp: Date.now()
            }));
        }
    }

    // Recevoir goal
    handleGoal(data) {
        if (!this.isMaster) {
            this.scoreLeft = data.scoreLeft;
            this.scoreRight = data.scoreRight;
            this.updateScoreTextMeshes();
            
            if (this.scoreLeft >= this.GAME_CONFIG.scoreLimit || this.scoreRight >= this.GAME_CONFIG.scoreLimit) {
                this.endGame();
            }
        }
    }

    sendGameStart() {
    if (this.isMaster && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
            type: "game_started",
            ballVelocity: {
                x: this.scene.ballVelocity.x,
                y: this.scene.ballVelocity.y,
                z: this.scene.ballVelocity.z
            },
            timestamp: Date.now()
        }));
    }
}

handleGameStart(data) {
    if (!this.isMaster) {
        this.gameStarted = true;
        this.startGameTimer();
        
        // ✅ VÉRIFIER que la scène existe avant d'accéder à ballVelocity
        if (this.scene && this.scene.ballVelocity && data.ballVelocity) {
            // Synchroniser la velocité initiale de la balle
            this.scene.ballVelocity.x = data.ballVelocity.x;
            this.scene.ballVelocity.y = data.ballVelocity.y;
            this.scene.ballVelocity.z = data.ballVelocity.z;
        } else {
            console.log("⚠️ Scene pas encore prête pour handleGameStart, sera synchronisé plus tard");
        }
    }
}

    // Fin de partie
    async endGame() {
        this.isGameOver = true;
        this.scene.ball.isVisible = false;
        const winner = this.scoreLeft >= this.GAME_CONFIG.scoreLimit ? "PLAYER 1" : "PLAYER 2";
        console.log("player 1 name:", this.player1Name);
        console.log("player 2 name:", this.player2Name);
        this.stopGameTimer();

        if (this.fontDataGlobal) {
            this.createVictoryText(winner);
        }

        if (this.isMaster) {
            console.log("🎯 Master enregistre le match...");
            await this.saveMatchToDatabase();
            await this.sendGameEnd();
            return ;
        } else {
            console.log("👥 Non-master - pas d'enregistrement");
            await this.sendGameEnd();
            return ;
        }
        
    }

    // ✅ FONCTION pour sauvegarder le match (SEULEMENT pour le master)
    async saveMatchToDatabase() {
        try {
            console.log("💾 Enregistrement du match remote...");
            await GamePage.createMatch("remote", this.scoreLeft, this.scoreRight, this.gameDurationSeconds, this.player1Login, this.player2Login);

        
        } catch (error) {
            console.error("❌ Erreur lors de l'enregistrement du match:", error);

            if (GamePage && GamePage.showProfileAlert) {
                GamePage.showProfileAlert(
                    "profile-alert",
                    "❌ Erreur lors de l'enregistrement du match"
                );
            }
        }
    }

    async sendGameEnd() {
        if (this.engine) {
            this.engine.stopRenderLoop();
        }

        if (this.scene) {
            this.scene.dispose();
        }

        if (this.engine) {
            this.engine.dispose();
        }
        console.log("🎮 Match terminé");
            window.handleRemoteGameMessage({
                type: 'game_ended',
                isRemote: true,
            });
    }

    // Gestion déconnexion
    handlePlayerDisconnected(data) {
        console.log("👋 Gestion de déconnexion côté RemotePong");

        // Nettoyer proprement les ressources du jeu
        if (this.engine) {
            this.engine.stopRenderLoop();
        }

        if (this.scene) {
            this.scene.dispose();
        }

        if (this.engine) {
            this.engine.dispose();
        }

        console.log("isGameOver:", this.isGameOver);    
        if (this.isGameOver) {
            this.sendGameEnd();
            return ;
        }
        // Transférer le message à game.ts pour qu'il gère l'affichage
        if (window.handleRemoteGameMessage) {
            if (!this.isGameOver) {
            window.handleRemoteGameMessage({
                ...(data || {}),
                type: 'player_disconnected',
                isRemote: true,
            });
        }
        }
    }

    // Toutes les autres fonctions (identiques à pong.js)
    startGameTimer() {
        this.gameStartTime = Date.now();
        this.gameEndTime = null;
        this.gameDurationSeconds = 0;
    }

    stopGameTimer() {
        if (this.gameStartTime) {
            this.gameEndTime = Date.now();
            this.gameDurationSeconds = Math.floor((this.gameEndTime - this.gameStartTime) / 1000);
        }
    }

    async loadFont() {
        try {
            const response = await fetch("https://assets.babylonjs.com/fonts/Droid Sans_Regular.json");
            this.fontDataGlobal = await response.json();
            this.createInitialScoreText();
        } catch (error) {
            console.warn("Erreur de chargement de police:", error);
        }
    }

    createInitialScoreText() {
        if (!this.fontDataGlobal) return;
        try {
            this.myText = BABYLON.MeshBuilder.CreateText("myText", this.scoreLeft.toString(), this.fontDataGlobal, {
                size: 5,
                resolution: 32,
                depth: 0.5
            });
            this.myText2 = BABYLON.MeshBuilder.CreateText("myText2", this.scoreRight.toString(), this.fontDataGlobal, {
                size: 5,
                resolution: 32,
                depth: 0.5
            });
            
            const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", this.scene);
            scoreMaterial.metallic = 1.0;
            scoreMaterial.roughness = 0.1;
            scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0);
            scoreMaterial.environmentTexture = this.scene.environmentTexture;
            scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);

            this.myText.material = scoreMaterial;
            this.myText2.material = scoreMaterial;
            this.myText.position.set(-8, 2, 4);
            this.myText2.position.set(8, 2, 4);
        } catch (error) {
            console.warn("Erreur création texte:", error);
        }
    }

    updateScoreTextMeshes() {
        if (!this.fontDataGlobal || !this.myText || !this.myText2) return;
        try {
            this.myText.dispose();
            this.myText2.dispose();
            
            this.myText = BABYLON.MeshBuilder.CreateText("myText", this.scoreLeft.toString(), this.fontDataGlobal, {
                size: 5,
                resolution: 32,
                depth: 0.5
            });
            this.myText2 = BABYLON.MeshBuilder.CreateText("myText2", this.scoreRight.toString(), this.fontDataGlobal, {
                size: 5,
                resolution: 32,
                depth: 0.5
            });
            
            const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", this.scene);
            scoreMaterial.metallic = 1.0;
            scoreMaterial.roughness = 0.1;
            scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0);
            scoreMaterial.environmentTexture = this.scene.environmentTexture;
            scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);
            
            this.myText.material = scoreMaterial;
            this.myText2.material = scoreMaterial;
            this.myText.position.set(-8, 2, 4);
            this.myText2.position.set(8, 2, 4);
        } catch (error) {
            console.warn("Erreur mise à jour score:", error);
        }
    }

    createLights(scene) {
        const colors = [
            new BABYLON.Color3(1.0, 0.1, 0.5),
            new BABYLON.Color3(1.0, 0.1, 0.5),
            new BABYLON.Color3(1.0, 0.1, 0.5),
            new BABYLON.Color3(1.0, 0.1, 0.5)
        ];
        const positions = [
            new BABYLON.Vector3(-8, 5.2, 5),
            new BABYLON.Vector3(-2.7, 5.2, 5),
            new BABYLON.Vector3(2.7, 5.2, 5),
            new BABYLON.Vector3(8, 5.2, 5)
        ];
        
        for (let i = 0; i < 4; i++) {
            const box = BABYLON.MeshBuilder.CreateBox(`lightBox${i}`, {
                width: 4,
                height: 10,
                depth: 0.1
            }, scene);

            const material = new BABYLON.StandardMaterial(`lightMat${i}`, scene);
            material.disableLighting = true;
            material.emissiveColor = colors[i];
            box.material = material;

            box.position = positions[i];

            const pointLight = new BABYLON.RectAreaLight(`pointLight${i}`, new BABYLON.Vector3(0, 0, 0), 6, 6, scene);
            pointLight.parent = box;
            pointLight.diffuse = colors[i];
            pointLight.specular = colors[i];
            pointLight.intensity = 2;
            this.boxes.push({ box, light: pointLight, material });
        }
    }

    playLightWave(startIndex, direction = 1) {
        const delay = 100;
        const color = new BABYLON.Color3(1.0, 0.1, 0.5);

        for (let i = 0; i < Math.min(this.boxes.length, 4); i++) {
            const index = startIndex + i * direction;
            if (index < 0 || index >= this.boxes.length) break;

            setTimeout(() => {
                const { box, light, material } = this.boxes[index];
                if (box && light && material) {
                    box.scaling.setAll(1.2);
                    light.intensity = 3;
                    material.emissiveColor = color;
                    light.diffuse = color;
                    setTimeout(() => {
                        box.scaling.setAll(1);
                        light.intensity = 1;
                    }, delay);
                }
            }, delay * i);
        }
    }

    sendVisualEffect(type, data) {
    if (this.isMaster && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
            type: "visual_effect",
            effectType: type,
            effectData: data,
            timestamp: Date.now()
        }));
    }
}
    handleVisualEffect(data) {
    if (!this.isMaster) {
        switch(data.effectType) {
            case 'lightwave':
                this.playLightWave(data.effectData.startIndex, data.effectData.direction);
                break;
            case 'countdown':
                this.countdown();
                break;
            case 'explosion':
                this.playExplosionAnimationAtPosition(data.effectData.ballPosition);
                break;
        }
    }
}

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async countdown() {
        if (this.boxes.length === 0) return;
        
        const delay = 300;
        const green = new BABYLON.Color3(0.2, 1.0, 0.2);
        const pink = new BABYLON.Color3(1.0, 0.1, 0.5);
        const originalIntensity = 2;
        const highlightIntensity = 4;

        try {
            for (let i = 0; i < this.boxes.length; i++) {
                const { box, light, material } = this.boxes[i];
                
                if (box && light && material) {
                    box.scaling.setAll(1.1);
                    material.emissiveColor = green;
                    light.diffuse = green;
                    light.intensity = highlightIntensity;

                    await this.sleep(delay);

                    box.scaling.setAll(1.0);
                    material.emissiveColor = pink;
                    light.diffuse = pink;
                    light.intensity = originalIntensity;
                }
            }

            for (let i = 0; i < this.boxes.length; i++) {
                const { box, light, material } = this.boxes[i];
                if (box && light && material) {
                    box.scaling.setAll(1.2);
                    material.emissiveColor = green;
                    light.diffuse = green;
                    light.intensity = highlightIntensity;
                }
            }

            await this.sleep(delay);

            for (let i = 0; i < this.boxes.length; i++) {
                const { box, light, material } = this.boxes[i];
                if (box && light && material) {
                    box.scaling.setAll(1.0);
                    material.emissiveColor = pink;
                    light.diffuse = pink;
                    light.intensity = originalIntensity;
                }
            }

            await this.sleep(delay);

        } catch (error) {
            console.warn("Erreur dans countdown:", error);
        }
    }

    playExplosionAnimation() {
        this.isWaitingAfterGoal = true;
        
        if (this.isMaster) {
            this.sendVisualEffect("explosion", {
                ballPosition: {
                    x: this.scene.ball.position.x,
                    y: this.scene.ball.position.y,
                    z: this.scene.ball.position.z
                }
            });
        }
        
        const particlesToUse = Math.min(this.scene.explosionSpheres.length, 20);
        for (let i = 0; i < particlesToUse; i++) {
            const sphere = this.scene.explosionSpheres[i];
            sphere.position.copyFrom(this.scene.ball.position);
            sphere.isVisible = true;
            const dir = new BABYLON.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random(),
                (Math.random() - 0.5) * 2
            ).normalize().scale(0.3 + Math.random() * 0.5);
            
            setTimeout(() => {
                sphere.isVisible = false;
            }, 800);
            
            const animateParticle = () => {
                if (sphere.isVisible) {
                    sphere.position.addInPlace(dir);
                    dir.scaleInPlace(0.98);
                    requestAnimationFrame(animateParticle);
                }
            };
            animateParticle();
        }
    }

    playExplosionAnimationAtPosition(ballPosition) {
    this.isWaitingAfterGoal = true;
    
    const particlesToUse = Math.min(this.scene.explosionSpheres.length, 20);
    for (let i = 0; i < particlesToUse; i++) {
        const sphere = this.scene.explosionSpheres[i];
        
        // ✅ Utiliser la position reçue du master
        sphere.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
        sphere.isVisible = true;
        
        const dir = new BABYLON.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random(),
            (Math.random() - 0.5) * 2
        ).normalize().scale(0.3 + Math.random() * 0.5);
        
        setTimeout(() => {
            sphere.isVisible = false;
        }, 800);
        
        const animateParticle = () => {
            if (sphere.isVisible) {
                sphere.position.addInPlace(dir);
                dir.scaleInPlace(0.98);
                requestAnimationFrame(animateParticle);
            }
        };
        animateParticle();
    }
}

    async resetBallWithDelay() {
        if (!this.scene || !this.scene.ball || !this.scene.ballVelocity) return;
        
        this.scene.ball.position.set(0, 0.5, 0);
        this.scene.ballVelocity.set(0, 0, 0);
        
        if (this.isMaster) {
            this.sendVisualEffect("countdown", {});
        }
        await this.countdown();
        await this.sleep(200);
        
        const direction = Math.random() < 0.5 ? -1 : 1;
        this.scene.ballVelocity.set(
            this.GAME_CONFIG.ballInitialSpeed * direction,
            0,
            (Math.random() - 0.5) * 0.02
        );
        
        this.isWaitingAfterGoal = false;
    }

    createVictoryText(winner) {
        try {
            const victoryText = BABYLON.MeshBuilder.CreateText("victoryText", 
                winner + " WON !", this.fontDataGlobal, {
                size: 1,
                resolution: 32,
                depth: 0.5
            });
            
            victoryText.position.set(0, 4.5, 2);
            
            const textMaterial = new BABYLON.StandardMaterial("victoryMat", this.scene);
            textMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            textMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
            textMaterial.specularPower = 64;
            textMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            victoryText.material = textMaterial;
            
            const restartText = BABYLON.MeshBuilder.CreateText("restartText", 
                "PRESS R TO RESTART", this.fontDataGlobal, {
                size: 0.5,
                resolution: 32,
                depth: 0.2
            });
            
            restartText.position.set(0, 3, 0);
            restartText.material = textMaterial;
            this.scene.victoryText = victoryText;
            this.scene.restartText = restartText;
        } catch (error) {
            console.warn("Erreur création texte victoire:", error);
        }
    }

    restartGame() {
        // Pour le remote, il faudrait signaler au serveur de redémarrer la partie
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: "restart_game",
                timestamp: Date.now()
            }));
        }
    }

    // Initialisation
    async init() {
        await this.connectToServer();
        // Le reste se fait après réception du message game_init
    }
}
    window.RemotePongGame = RemotePongGame;
})();

window.remotePongGameInstance = new window.RemotePongGame();
window.remotePongGameInstance.init();
