# 🚗 ValetApp v2 — Scénario complet

## Flux exact implémenté

### 1. Voiturier scanne la carte QR du client
- Ouvre la caméra → pointe vers la carte QR physique
- Le QR encode l'URL : `http://votre-app/client/ticket/QR-001`
- La webapp s'ouvre automatiquement sur `/client/ticket/QR-001`

### 2. Voiturier saisit les infos du véhicule
- Marque, couleur, immatriculation
- **Enregistre la position GPS du parking** (bouton géoloc)
- Crée la mission → remet la carte QR au client

### 3. Voiturier stationne le véhicule
- Clique "Véhicule stationné ✓"
- **Notification au client** : "🅿️ Votre véhicule est bien stationné"

### 4. Client scanne sa carte au départ
- Caméra → QR code → page web avec ses infos véhicule
- Voit l'**emplacement GPS du parking sur la carte**
- Clique "Récupérer mon véhicule"

### 5. Tous les voituriers reçoivent la notification
- **Tous les voituriers** voient la demande avec son urgent
- Le premier qui clique "J'accepte cette mission" la prend
- La demande **disparaît automatiquement** chez les autres (SSE)

### 6. Voiturier accepté va chercher le véhicule
- Voit les infos + position GPS du parking
- Active le GPS → sa position est partagée avec le client en temps réel
- Carte Leaflet live chez le client
- Clique "Je suis arrivé" → notification client

### 7. Voiturier scanne le QR pour clôturer
- Caméra → QR de la carte rendue par le client
- Mission terminée
- **Écran de remerciement** chez le client + carte QR disponible

---

## Démarrage

```bash
# Terminal 1 — Backend (zéro install)
cd backend
node src/index.js

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Ou build tout-en-un :
```bash
cd frontend && npm run build
cd ../backend && node src/index.js
# Tout sur http://localhost:3001
```

## Comptes de test

| Voiturier | Téléphone |
|-----------|-----------|
| Mohammed Alami | +212611223344 |
| Fatima Zahra | +212622334455 |
| Youssef Bennani | +212633445566 |

Le code OTP s'affiche dans la console du backend (en production : envoi SMS).

## Cartes QR disponibles
QR-001 à QR-010 — toutes disponibles au démarrage.

Pour tester le scan, générez un QR code avec n'importe quel générateur en ligne
encodant l'URL : `http://localhost:5173/client/ticket/QR-001`

## Notifications temps réel (SSE)

| Événement | Déclencheur | Destinataire |
|-----------|-------------|--------------|
| Véhicule stationné | Voiturier clique "Stationné" | Client |
| Demande récupération | Client clique "Récupérer" | **Tous les voituriers** |
| Mission prise | Un voiturier accepte | **Tous les autres** (disparaît) |
| Voiturier en route | Statut "accepted" | Client |
| GPS update | Voiturier en déplacement (5s) | Client (carte live) |
| Véhicule arrivé | Voiturier clique "Arrivé" | Client (redirect auto) |
| Mission terminée | Scan QR clôture | Client (écran merci) |
