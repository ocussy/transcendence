# Variables
DOCKER_COMPOSE = docker compose

# Lancer avec --build (par défaut : make)
.DEFAULT_GOAL := up
 
# Lancer les conteneurs avec build
up:
	$(DOCKER_COMPOSE) up --build

# Arrêter les conteneurs sans supprimer les volumes
down:
	$(DOCKER_COMPOSE) down

# Arrêter les conteneurs et supprimer les volumes
prune:
	$(DOCKER_COMPOSE) down -v

# Redémarrer le projet proprement (down puis up)
restart: down up

# Rebuild sans lancer
build:
	$(DOCKER_COMPOSE) build

# Voir les conteneurs actifs
ps:
	$(DOCKER_COMPOSE) ps

# Accès shell à un service : make sh SERVICE=web
sh:
	$(DOCKER_COMPOSE) exec $(SERVICE) sh

# Nettoyer les images non utilisées
clean-images:
	docker image prune -f

# Nettoyer les volumes non utilisés (hors projet)
clean-volumes:
	docker volume prune -f
