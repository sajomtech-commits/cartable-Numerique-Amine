// ============================================
// ATELIER DESSIN - TES DESSINS
// Pour ajouter un dessin : copie un bloc, change les infos
// Mets ton image dans /assets/img/ ou colle une URL
// ============================================
const DRAWINGS = [
  {
    id: "001",
    title: "L'Attente",
    album: "Visages",
    technique: "Crayon graphite • 2B-6B",
    annee: "2024",
    format: "A3 • 42×29.7cm",
    image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=600&auto=format&fit=crop",
    desc: "Étude de lumière sur papier bristol. Le regard fuyant, la main en suspension.",
    couleur: "nb"
  },
  {
    id: "002",
    title: "Nocturne #4",
    album: "Encres Nocturnes",
    technique: "Encre de Chine • Pinceau",
    annee: "2024",
    format: "50×65cm",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=600&auto=format&fit=crop",
    desc: "Fusain et encre, travail au lavis. Nuit d'atelier, geste rapide.",
    couleur: "nb"
  },
  {
    id: "003",
    title: "Carnet — Lisbonne",
    album: "Carnet de Voyage",
    technique: "Aquarelle + trait fin",
    annee: "2023",
    format: "A5 • Carnet",
    image: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=600&auto=format&fit=crop",
    desc: "Croquis sur le vif, tram 28, 3 minutes chrono. La ville qui tremble.",
    couleur: "couleur"
  },
  {
    id: "004",
    title: "Mains II",
    album: "Visages",
    technique: "Fusain • estompe",
    annee: "2024",
    format: "A3",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop",
    desc: "Anatomie du geste. La mémoire dans les plis.",
    couleur: "nb"
  },
  {
    id: "005",
    title: "Forêt Intérieure",
    album: "Abstractions",
    technique: "Encre + sel + eau",
    annee: "2023",
    format: "70×50cm",
    image: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=600&auto=format&fit=crop",
    desc: "Tâche contrôlée. Le hasard comme co-auteur.",
    couleur: "nb"
  },
  {
    id: "006",
    title: "Nu allongé — étude",
    album: "Visages",
    technique: "Pierre noire • papier teinté",
    annee: "2024",
    format: "A2",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop",
    desc: "5 poses de 10 minutes. Le corps comme paysage.",
    couleur: "nb"
  },
  {
    id: "007",
    title: "Marché de Marrakech",
    album: "Carnet de Voyage",
    technique: "Feutre + aquarelle",
    annee: "2023",
    format: "A5",
    image: "https://images.unsplash.com/photo-1536924430911-9384fe3469f6?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1536924430911-9384fe3469f6?q=80&w=600&auto=format&fit=crop",
    desc: "Foule, épices, traits lancés sans lever le feutre.",
    couleur: "couleur"
  },
  {
    id: "008",
    title: "Éclat",
    album: "Abstractions",
    technique: "Encre acrylique • soufflé",
    annee: "2024",
    format: "60×60cm",
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=600&auto=format&fit=crop",
    desc: "Explosion contrôlée. Souffle, goutte, gravité.",
    couleur: "couleur"
  },
  {
    id: "009",
    title: "L'ombre portée",
    album: "Encres Nocturnes",
    technique: "Fusain + gomme",
    annee: "2024",
    format: "A3",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop",
    desc: "Dessiner avec la gomme. Faire apparaître la lumière.",
    couleur: "nb"
  },
  {
    id: "010",
    title: "Portrait — Y.",
    album: "Visages",
    technique: "Graphite • 8h de pose",
    annee: "2022",
    format: "A2",
    image: "https://images.unsplash.com/photo-1525909002-1553a86a30b6?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1525909002-1553a86a30b6?q=80&w=600&auto=format&fit=crop",
    desc: "Regard frontal. La patience du trait lent.",
    couleur: "nb"
  },
  {
    id: "011",
    title: "Brume",
    album: "Abstractions",
    technique: "Lav is • papier mouillé",
    annee: "2023",
    format: "50×70cm",
    image: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=600&auto=format&fit=crop",
    desc: "Deux tons, eau, attente. Le papier décide.",
    couleur: "nb"
  },
  {
    id: "012",
    title: "Toits — Porto",
    album: "Carnet de Voyage",
    technique: "Stylo bille • hachures",
    annee: "2023",
    format: "A5",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627505d1a?q=80&w=1200&auto=format&fit=crop",
    thumb: "https://images.unsplash.com/photo-1499856871958-5b9627505d1a?q=80&w=600&auto=format&fit=crop",
    desc: "Vue du pont Luis I. Hachures serrées, vent dans la main.",
    couleur: "nb"
  }
];

const ALBUMS = [
  { id: "Visages", name: "Visages", desc: "Le trait humain", count: 4, cover: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=600&auto=format&fit=crop", color: "#1a1a18" },
  { id: "Encres Nocturnes", name: "Encres Nocturnes", desc: "Noir, lavis & nuit", count: 2, cover: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=600&auto=format&fit=crop", color: "#0f0f0f" },
  { id: "Carnet de Voyage", name: "Carnet de Voyage", desc: "Terrains • 2022-2024", count: 3, cover: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=600&auto=format&fit=crop", color: "#8b7355" },
  { id: "Abstractions", name: "Abstractions", desc: "Tâche, geste, hasard", count: 3, cover: "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=600&auto=format&fit=crop", color: "#c9b896" }
];
