#!/bin/bash
# =====================================================================
# BIBOULAB — mise à jour automatique de l'administration (Django)
#
# Lancé toutes les 5 minutes par une tâche cron cPanel (voir LISEZ-MOI.md,
# « Mise à jour automatique »). Ne fait rien tant que la branche suivie
# par ce clone (main ou preprod) n'a pas bougé sur GitHub ; sinon :
#   1. récupère le nouveau code (git, avance rapide uniquement) ;
#   2. installe les dépendances si backend/requirements.txt a changé ;
#   3. applique les migrations de la base ;
#   4. vérifie la configuration, puis redémarre l'application (Passenger).
# En cas d'échec, l'étape est retentée au passage suivant et l'erreur est
# écrite dans le journal.
#
# Usage :  backend/deployer.sh <python du virtualenv cPanel> [--forcer]
#   ex.    backend/deployer.sh /home/compte/virtualenv/biboulab/backend/3.11/bin/python
# =====================================================================
set -euo pipefail

PY="${1:-}"
if [ -z "$PY" ] || [ ! -x "$PY" ]; then
  echo "Usage : $0 <chemin du python du virtualenv> [--forcer]" >&2
  exit 2
fi
FORCER="${2:-}"

BACKEND="$(cd "$(dirname "$0")" && pwd)"
DEPOT="$(dirname "$BACKEND")"
ETAT="$BACKEND/.deploye"          # dernier commit entièrement déployé
VERROU="$BACKEND/.deploiement.verrou"
journal() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Un seul déploiement à la fois (un passage lent ne doit pas se superposer au suivant)
if ! mkdir "$VERROU" 2>/dev/null; then
  # verrou abandonné depuis plus d'une heure (serveur redémarré en plein déploiement) : on le reprend
  if [ -n "$(find "$VERROU" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
    rmdir "$VERROU" && mkdir "$VERROU"
  else
    exit 0
  fi
fi
trap 'rmdir "$VERROU" 2>/dev/null || true' EXIT

cd "$DEPOT"
BRANCHE="$(git rev-parse --abbrev-ref HEAD)"
git fetch --quiet origin "$BRANCHE"
CIBLE="$(git rev-parse "origin/$BRANCHE")"
DEJA="$(cat "$ETAT" 2>/dev/null || true)"
[ "$CIBLE" = "$DEJA" ] && [ "$FORCER" != "--forcer" ] && exit 0

AVANT="$(git rev-parse HEAD)"
journal "Mise à jour de $BRANCHE : ${AVANT:0:7} → ${CIBLE:0:7}"

# 1. Code : avance rapide uniquement. Une modification faite à la main sur le
#    serveur bloque la mise à jour au lieu d'être écrasée.
if [ "$AVANT" != "$CIBLE" ]; then
  if ! git merge --ff-only --quiet "origin/$BRANCHE"; then
    journal "ÉCHEC : des fichiers ont été modifiés sur le serveur (git status). Mise à jour arrêtée."
    exit 1
  fi
fi

# 2. Dépendances : seulement si la liste a changé depuis le dernier déploiement réussi
#    (ou au tout premier passage).
if [ -z "$DEJA" ] || ! git diff --quiet "$DEJA" "$CIBLE" -- backend/requirements.txt 2>/dev/null; then
  journal "Installation des dépendances"
  "$PY" -m pip install --quiet --disable-pip-version-check -r "$BACKEND/requirements.txt"
fi

# 3. et 4. Base de données et vérification.
#    Les variables de cPanel › Setup Python App ne sont pas transmises aux tâches cron :
#    la clé secrète n'est utile ni aux migrations ni à la vérification, une valeur
#    provisoire suffit ici (l'application en ligne garde la sienne).
cd "$BACKEND"
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-deploiement-sans-cle}"
"$PY" manage.py migrate --noinput
"$PY" manage.py check

mkdir -p tmp
touch tmp/restart.txt            # Passenger redémarre l'application à la prochaine requête
echo "$CIBLE" > "$ETAT"
journal "OK : ${CIBLE:0:7} en ligne"
