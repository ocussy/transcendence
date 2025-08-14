
# Lancer avec --build (par défaut : make)
.DEFAULT_GOAL := up
 
# Lancer les conteneurs avec build
up:
	docker compose up --build

# Arrêter les conteneurs sans supprimer les volumes
down:
	docker compose down

# Arrêter les conteneurs et supprimer les volumes
prune:
	docker compose down -v

# Redémarrer le projet proprement (down puis up)
restart: down up

# Rebuild sans lancer
build:
	docker compose build

# Voir les conteneurs actifs
ps:
	docker compose ps

# Accès shell à un service : make sh SERVICE=web
sh:
	docker compose exec $(SERVICE) sh

# Nettoyer les images non utilisées
clean-images:
	docker image prune -f

# Nettoyer les volumes non utilisés (hors projet)
clean-volumes:
	docker volume prune -f

re :
	docker compose restart

