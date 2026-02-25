# Portfolio Maël Auzenet - React + Vite + Tailwind

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## 📁 Structure du projet

```
portfolio-react/
├── public/
│   ├── fonts/
│   │   └── ppneuemontreal-medium.otf
│   └── img/
│       └── [toutes les images des projets]
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Controls.jsx
│   │   ├── ProjectCard.jsx
│   │   ├── ProjectGrid.jsx
│   │   ├── Modal.jsx
│   │   └── index.js
│   ├── data/
│   │   └── projects.js     ← FICHIER PRINCIPAL POUR GÉRER LES PROJETS
│   ├── pages/
│   │   ├── Home.jsx
│   │   └── About.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## ➕ Ajouter un nouveau projet

1. **Ajoute tes images** dans `public/img/`
   - Format recommandé : PNG ou JPG
   - 4 images par projet (main + 3 variants)

2. **Modifie `src/data/projects.js`** et ajoute un objet :

```javascript
{
    id: 13,                    // ID unique
    number: "13",              // Numéro affiché
    category: "music",         // "music", "sportif" ou "event"
    client: "NOM CLIENT",      // Nom du client
    software: "PHOTOSHOP",     // Logiciel utilisé
    date: "2026",              // Année
    images: [
        "/img/projet-13-main.png",      // Image principale
        "/img/projet-13-v1.png",        // Variant 1
        "/img/projet-13-v2.png",        // Variant 2
        "/img/projet-13-v3.png"         // Variant 3
    ]
}
```

3. **C'est tout !** Le projet apparaîtra automatiquement dans la grille.

## 🎨 Modifier les catégories

Dans `src/data/projects.js`, modifie le tableau `CATEGORIES` :

```javascript
export const CATEGORIES = [
  { id: 'all', label: 'ALL' },
  { id: 'sportif', label: 'SPORTIF' },
  { id: 'event', label: 'EVENT' },
  { id: 'music', label: 'MUSIC' },
  { id: 'web', label: 'WEB' }  // Nouvelle catégorie
]
```

## 🔧 Personnalisation

### Couleurs et styles
Modifie `tailwind.config.js` pour changer :
- Couleurs
- Polices
- Espacements
- Transitions

### Contenu de la page About
Modifie `src/pages/About.jsx` directement.

### Footer
Modifie `src/components/Footer.jsx` pour les infos de copyright.

## 🌐 Déploiement

### Vercel (recommandé)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload le dossier "dist" sur Netlify
```

### GitHub Pages
```bash
npm run build
# Configure le déploiement depuis le dossier "dist"
```

---

Made with ❤️ by Sordulo
