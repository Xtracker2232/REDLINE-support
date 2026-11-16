# Bot Stats

Bot Discord en espagnol : tableau de classement configurable (`/stat`) et règlement avec rôle (`/reglement`).

## Commandes

| Commande | Qui | Description |
|---|---|---|
| `/stat` | Tout le monde | Affiche le classement (ou `posicion:3` pour une seule place) |
| `/config` | Admin | Ouvre le panel pour tout configurer (voir ci-dessous) |
| `/reglement` | Admin | Poste le règlement avec le bouton qui donne le rôle `RULES_ROLE_ID` |

### Le panel `/config` (visible seulement par toi)
- **Menu "Elige un puesto"** → ouvre une place :
  - 👤 menu **@** pour choisir le joueur (sa mention et son avatar s'affichent sur le tableau)
  - 🚦 menu d'état : Sin cooldown, No disponible, cooldown 1h/2h/6h/12h/24h/48h (compte à rebours automatique)
  - 📝 **Editar datos** : formulaire nom, rang, host, pays (`ES` → 🇪🇸), image
  - ⬆️⬇️ monter/descendre, 🧹 vider, ◀️▶️ place précédente/suivante, ⬅️ retour
- 🏷️ **Título** : titre et description du tableau
- 📤 **Publicar aquí** : poste le tableau dans le salon actuel, mentionne les joueurs, puis se met à jour tout seul
- 📜 **Reglamento aquí** : poste le règlement dans le salon actuel
- 🗑️ **Vaciar todo** : vide les 10 places (avec confirmation)

## Installation

1. Crée une application sur https://discord.com/developers/applications → **Bot** → *Reset Token*.
2. Invite le bot (remplace `TON_ID` par l'Application ID) :
   `https://discord.com/oauth2/authorize?client_id=TON_ID&permissions=8&scope=bot+applications.commands`
3. Place le rôle du bot **au-dessus** du rôle `1571266194617667614` (Paramètres du serveur → Rôles).

## Railway

1. Mets ce dossier sur un nouveau repo GitHub, puis Railway → **New Project → Deploy from GitHub repo**.
2. **Variables** : `DISCORD_TOKEN`, `GUILD_ID`, `RULES_ROLE_ID=1571266194617667614`.
3. Attache un **Volume** sur `/data` et ajoute `DATA_DIR=/data`, sinon le tableau s'efface à chaque redéploiement.
4. Optionnel : tes emojis `:mtb_top:` etc. Dans Discord, envoie `\:mtb_top:` pour obtenir le code `<:mtb_top:123...>`,
   puis mets-le dans `EMOJI_TOP`, `EMOJI_MIDDLE`, `EMOJI_BOTTOM`. Le bot doit être sur le serveur qui possède ces emojis.

Pas besoin de "Server Members Intent" pour ce bot.
