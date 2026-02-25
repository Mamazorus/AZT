/* ═══════════════════════════════════════════════════════════════
   PROJECTS DATA
   ═══════════════════════════════════════════════════════════════
   
   Pour ajouter un projet, ajoutez un objet avec :
   - id: identifiant unique (nombre)
   - number: numéro affiché (ex: "01")
   - category: "music", "sportif", "event"
   - client: nom du client
   - software: logiciel utilisé
   - date: année
   - images: tableau de 4 URLs (main + 3 variants)
   
   Exemple :
   {
       id: 13,
       number: "13",
       category: "music",
       client: "NOM CLIENT",
       software: "PHOTOSHOP",
       date: "2026",
       images: [
           "/img/projet-13/main.jpg",
           "/img/projet-13/variant-1.jpg",
           "/img/projet-13/variant-2.jpg",
           "/img/projet-13/variant-3.jpg"
       ]
   }
   
   ═══════════════════════════════════════════════════════════════ */

export const PROJECTS = [
  {
    id: 1,
    number: "01",
    category: "music",
    client: "KEN CARSON",
    software: "PHOTOSHOP",
    date: "2026",
    images: [
      "/img/ken1.png",
      "/img/ken2.png",
      "/img/ken3.png",
      "/img/ken4.png"
    ]
  },
  {
    id: 2,
    number: "02",
    category: "music",
    client: "La Fève",
    software: "PHOTOSHOP",
    date: "2026",
    images: [
      "/img/feve1.png",
      "/img/feve2.png",
      "/img/feve3.png",
      "/img/feve4.png"
    ]
  },
  {
    id: 3,
    number: "03",
    category: "music",
    client: "Jeune Morty",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/morty1.png",
      "/img/morty2.png",
      "/img/morty3.png",
      "/img/morty4.png"
    ]
  },
  {
    id: 4,
    number: "04",
    category: "music",
    client: "Bedry",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/bedry1.png",
      "/img/bedry2.png",
      "/img/bedry3.png",
      "/img/bedry4.png"
    ]
  },
  {
    id: 5,
    number: "05",
    category: "event",
    client: "Undercover",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/undercover1.png",
      "/img/undercover2.png",
      "/img/undercover3.png",
      "/img/undercover4.png"
    ]
  },
  {
    id: 6,
    number: "06",
    category: "music",
    client: "Playboi Carti",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/carti1.png",
      "/img/carti2.png",
      "/img/carti3.png",
      "/img/carti4.png"
    ]
  },
  {
    id: 7,
    number: "07",
    category: "music",
    client: "63KLUF",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/kluf1.png",
      "/img/kluf2.png",
      "/img/kluf3.png",
      "/img/kluf4.png"
    ]
  },
  {
    id: 8,
    number: "08",
    category: "music",
    client: "Meller",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/meller1.png",
      "/img/meller2.png",
      "/img/meller3.png",
      "/img/meller4.png"
    ]
  },
  {
    id: 9,
    number: "09",
    category: "sportif",
    client: "Lesley Ugochukwu",
    software: "PHOTOSHOP",
    date: "2026",
    images: [
      "/img/burnley_utd1.png",
      "/img/burnley_utd2.png",
      "/img/burnley_utd3.png",
      "/img/burnley_utd4.png"
    ]
  },
  {
    id: 10,
    number: "10",
    category: "sportif",
    client: "Lesley Ugochukwu",
    software: "PHOTOSHOP",
    date: "2026",
    images: [
      "/img/burnley_millwall1.png",
      "/img/burnley_millwall2.png",
      "/img/burnley_millwall3.png",
      "/img/burnley_millwall4.png"
    ]
  },
  {
    id: 11,
    number: "11",
    category: "sportif",
    client: "Lesley Ugochukwu",
    software: "PHOTOSHOP",
    date: "2026",
    images: [
      "/img/burnley_liverpool1.png",
      "/img/burnley_liverpool2.png",
      "/img/burnley_liverpool3.png",
      "/img/burnley_liverpool4.png"
    ]
  },
  {
    id: 12,
    number: "12",
    category: "music",
    client: "Jolagreen23",
    software: "PHOTOSHOP",
    date: "2025",
    images: [
      "/img/jola1.png",
      "/img/jola2.png",
      "/img/jola3.png",
      "/img/jola4.png"
    ]
  }
]

// Catégories disponibles
export const CATEGORIES = [
  { id: 'all', label: 'ALL' },
  { id: 'sportif', label: 'SPORTIF' },
  { id: 'event', label: 'EVENT' },
  { id: 'music', label: 'MUSIC' }
]

// Options de grille
export const GRID_OPTIONS = [1, 2, 3, 6]
