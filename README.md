# Bot Stats

Bot Discord en espagnol : tableau de classement configurable (`/stat`) et règlement avec rôle (`/reglement`).

## Commandes

| Commande | Qui | Description |
|---|---|---|
| `/stat` | Tout le monde | Affiche le classement (ou `posicion:3` pour une seule place) |
| `/stat-config editar` | Admin | Modifie une place : joueur, nom, rang, host, état, cooldown, pays, image |
| `/stat-config quitar` | Admin | Vide une place |
| `/stat-config mover` | Admin | Échange deux places |
| `/stat-config titulo` | Admin | Change le titre / la description du tableau |
| `/stat-config publicar` | Admin | Poste le tableau dans un salon : il se met à jour tout seul |
| `/stat-config vaciar` | Admin | Vide tout le tableau |
| `/reglement` | Admin | Poste le règlement avec le bouton qui donne le rôle `RULES_ROLE_ID` |

Astuces pour `editar` :
- écris `-` dans un champ pour l'effacer ;
- `pais` accepte un code (`ES`, `FR`, `MX`) → 🇪🇸 🇫🇷 🇲🇽 ;
- `cooldown_horas:2` met "En cooldown" avec un compte à rebours, et repasse en "Sin cooldown" tout seul.

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
