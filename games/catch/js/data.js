/* =========================================================
   PLAY WITH VIZEA — contenu du jeu : campagnes, objets, quiz
   ========================================================= */
window.VZData = {
  // speed = fraction de la hauteur d'écran parcourue par seconde
  levels: [
    {
      name: "Identité Visuelle",
      brief: "Une startup a besoin d'une marque forte. Capte les idées, les likes et les étoiles… et évite les fautes de goût.",
      target: 650, time: 60, spawn: 0.82, speed: [0.26, 0.34], bad: 0.18, pu: 0.06, sway: 0,
      favor: ["idea", "star"],
    },
    {
      name: "Réseaux Sociaux",
      brief: "Lancement sur les réseaux : fais exploser les vues. Attention aux erreurs 404 qui se multiplient !",
      target: 950, time: 60, spawn: 0.66, speed: [0.32, 0.42], bad: 0.24, pu: 0.06, sway: 0.15,
      favor: ["hash", "chart"],
    },
    {
      name: "Publicité & Stratégie",
      brief: "Campagne nationale en cours. Le spam et les bad buzz rôdent : protège la réputation de la marque.",
      target: 1250, time: 60, spawn: 0.54, speed: [0.38, 0.5], bad: 0.28, pu: 0.07, sway: 0.3,
      favor: ["chart", "heart"],
    },
    {
      name: "Création Audiovisuelle",
      brief: "Tournage du spot TV ! Les vues pleuvent, mais les fake news aussi. Garde le cap jusqu'au clap de fin.",
      target: 1550, time: 60, spawn: 0.46, speed: [0.44, 0.58], bad: 0.31, pu: 0.07, sway: 0.45,
      favor: ["play", "star"],
    },
    {
      name: "Solutions IA",
      brief: "Brief final : une campagne boostée à l'IA. Tout va très vite. Deviens viral et entre dans la légende ViZea.",
      target: 1850, time: 65, spawn: 0.38, speed: [0.5, 0.68], bad: 0.34, pu: 0.08, sway: 0.6,
      favor: ["idea", "chart", "star"],
    },
  ],

  good: {
    heart: { label: "Like", pts: 10, w: 26 },
    idea:  { label: "Idée", pts: 15, w: 22 },
    hash:  { label: "Hashtag", pts: 10, w: 22 },
    chart: { label: "KPI", pts: 20, w: 16 },
    play:  { label: "Vue vidéo", pts: 15, w: 18 },
    star:  { label: "Star", pts: 40, w: 6 },
  },
  bad: {
    e404: { label: "Bug 404" },
    spam: { label: "Spam" },
    buzz: { label: "Bad buzz" },
    fake: { label: "Fake news" },
  },
  power: {
    viral:  { label: "Viral x2", w: 30, dur: 7 },
    shield: { label: "Bouclier", w: 25, dur: 8 },
    magnet: { label: "Aimant", w: 25, dur: 7 },
    life:   { label: "+1 Budget", w: 20, dur: 0 },
  },

  // Quiz « Brief Flash » — index 0 = bonne réponse (mélangées à l'affichage)
  quiz: [
    ["Que signifie « CTR » en marketing ?", ["Click-Through Rate (taux de clic)", "Cost To Reach", "Content Traffic Ratio", "Customer Target Rate"]],
    ["Le SEO sert principalement à…", ["Améliorer le référencement naturel d'un site", "Acheter des annonces sponsorisées", "Envoyer des newsletters", "Gérer les avis clients"]],
    ["Une charte graphique définit…", ["Couleurs, typographies et règles d'usage du logo", "Le budget média annuel", "Les tarifs d'une agence", "Le planning des publications"]],
    ["Le symbole ® à côté d'un logo indique…", ["Une marque déposée", "Une marque en cours de création", "Un logo libre de droits", "Une marque rachetée"]],
    ["Quel format vidéo est natif des Reels et de TikTok ?", ["Vertical 9:16", "Horizontal 16:9", "Carré 4:3", "Cinémascope 21:9"]],
    ["Le ROI mesure…", ["Le retour sur investissement", "Le taux de rebond", "Le nombre d'abonnés", "La notoriété spontanée"]],
    ["Un « persona » est…", ["Un profil type semi-fictif du client cible", "Un influenceur payé", "Le logo animé d'une marque", "Un concurrent direct"]],
    ["L'A/B testing consiste à…", ["Comparer deux versions pour garder la plus performante", "Tester un site sur deux navigateurs", "Publier deux fois le même post", "Doubler le budget d'une campagne"]],
    ["Le CPC correspond au…", ["Coût par clic", "Coût par campagne", "Contenu par catégorie", "Client par conversion"]],
    ["Dans le modèle AIDA, le dernier « A » signifie…", ["Action", "Audience", "Analyse", "Achat groupé"]],
    ["Un « call-to-action » c'est…", ["Un élément qui incite à agir (ex : un bouton)", "Un appel téléphonique commercial", "Une publicité radio", "Le slogan d'une marque"]],
    ["Les 4P du marketing mix : Produit, Prix, Place et…", ["Promotion", "Public", "Performance", "Packaging"]],
    ["Le « taux de conversion » mesure…", ["La part des visiteurs qui réalisent l'action visée", "Le nombre de pages vues", "Le temps passé sur le site", "La vitesse de chargement"]],
    ["« UX » signifie…", ["User Experience", "Ultra eXposure", "Unique X-factor", "Universal Index"]],
    ["Quel mode colorimétrique utilise-t-on pour l'impression ?", ["CMJN", "RVB", "HEX", "HSL"]],
    ["Le « storytelling » consiste à…", ["Raconter une histoire pour porter le message d'une marque", "Publier des stories chaque jour", "Écrire les CGV d'un site", "Traduire une campagne"]],
    ["Un « lead » est…", ["Un prospect qui a manifesté un intérêt", "Le chef de projet créatif", "Une bannière publicitaire", "Un client perdu"]],
    ["Le « retargeting » consiste à…", ["Recibler les internautes déjà venus sur un site", "Changer de cible en cours de campagne", "Supprimer les mauvais avis", "Racheter un nom de domaine"]],
    ["Le « reach » d'une publication mesure…", ["Le nombre de personnes uniques touchées", "Le nombre total de likes", "Le nombre de partages", "Le coût de la publication"]],
    ["Un KPI est…", ["Un indicateur clé de performance", "Un logiciel de PAO", "Un type de bannière", "Un réseau social pro"]],
    ["« UGC » désigne…", ["Le contenu généré par les utilisateurs", "Une agence de publicité", "Un format d'image", "Une norme de sécurité"]],
    ["Le « brief créatif » sert à…", ["Cadrer objectifs, cible et message avant de créer", "Facturer le client", "Choisir l'imprimeur", "Présenter l'équipe"]],
    ["« Above the fold » désigne sur un site…", ["La zone visible sans faire défiler", "Le pied de page", "Le menu caché", "Les pages en erreur"]],
    ["En publicité, la modélisation 3D permet surtout de…", ["Visualiser un produit avant même qu'il existe", "Réduire la taille des fichiers", "Remplacer le logo", "Supprimer la post-production"]],
    ["L'IA générative peut aider une agence à…", ["Produire rapidement des variantes de visuels et de textes", "Se passer totalement de stratégie", "Garantir 100 % de conversion", "Supprimer le besoin de brief"]],
    ["Une identité visuelle réussie doit avant tout être…", ["Cohérente et reconnaissable", "Différente sur chaque support", "Changée tous les mois", "Remplie d'effets"]],
    ["Le « taux d'engagement » prend en compte…", ["Les interactions (likes, commentaires, partages)", "Uniquement le nombre d'abonnés", "Le prix de la pub", "Le nombre de posts publiés"]],
    ["Un « moodboard » sert à…", ["Rassembler des inspirations visuelles pour un projet", "Suivre l'humeur des clients", "Calculer le ROI", "Planifier un tournage"]],
  ],
};
