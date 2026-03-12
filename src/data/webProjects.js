/* ═══════════════════════════════════════════════════════════════
   WEB DESIGN PROJECTS DATA (fallback statique)
   ═══════════════════════════════════════════════════════════════

   Ces données sont utilisées si la collection Firestore "webProjects"
   est vide. Pour gérer les projets web, utilise l'onglet WEB dans /admin.

   Structure d'un projet :
   {
     id: 'w1',
     number: '01',
     order: 0,
     client: 'NOM CLIENT',
     type: 'LANDING PAGE',      // type de projet
     year: '2026',
     url: 'https://...',        // lien live (optionnel)
     description: '...',        // texte court (optionnel)
     images: [url1, url2],      // 2 miniatures 9:16 pour la page listing
     screens: [                 // screens pour la page détail
       { url: '...', type: 'image' },
       { url: '...', type: 'video' },
     ]
   }

   ═══════════════════════════════════════════════════════════════ */

export const WEB_PROJECTS = [
  {
    id: 'w1',
    number: '01',
    order: 0,
    client: 'CLIENT 01',
    type: 'LANDING PAGE',
    year: '2026',
    url: null,
    summary: '',
    description: '',
    images: [null, null],
    screens: [],
  },
  {
    id: 'w2',
    number: '02',
    order: 1,
    client: 'CLIENT 02',
    type: 'E-COMMERCE',
    year: '2026',
    url: null,
    summary: '',
    description: '',
    images: [null, null],
    screens: [],
  },
  {
    id: 'w3',
    number: '03',
    order: 2,
    client: 'CLIENT 03',
    type: 'PORTFOLIO',
    year: '2025',
    url: null,
    summary: '',
    description: '',
    images: [null, null],
    screens: [],
  },
]
