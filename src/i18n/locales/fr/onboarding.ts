import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  // No-CV guided builder
  buildTitle: 'Créons ton profil ensemble.',
  buildLead: "Choisis où tu en es — les questions s'adaptent.",
  buildStartingTitle: 'Je débute',
  buildStartingSub: "En études, ou à la recherche d'un premier emploi.",
  buildWorkingTitle: "J'ai déjà travaillé",
  buildWorkingSub: "Je n'ai simplement jamais eu besoin d'un CV.",
  buildCv: 'Créer mon CV',
  probeNext: 'Suivant',
  probeTitle: 'Quelques questions rapides.',
  probeLead: 'Réponds à ce que tu peux : ça renforce ton CV. Passe celles qui ne collent pas.',
  talkStartingTitle: "Qu'as-tu fait ?",
  talkStartingLead:
    'Un projet, du bénévolat, un club, un job étudiant : tout compte. Écris tout ici — ça devient ton CV.',
  talkStartingPlaceholder:
    "ex. Projet de fin d'études : j'ai créé une appli pour trouver des salles de travail libres sur le campus. J'ai écrit le backend et animé nos points hebdomadaires.",
  talkWorkingTitle: 'Ton poste le plus récent.',
  talkWorkingLead:
    'Où tu as travaillé, ce que tu faisais, ce dont tu es fier : écris librement — ça devient ton CV.',
  talkWorkingPlaceholder:
    "ex. J'ai dirigé une équipe de 6 personnes chez Kordo Logistics pendant 3 ans. J'ai revu le planning des week-ends pour ne plus être en sous-effectif, et formé les nouveaux.",
  talkCountNeed: (n: number, min: number) => `${n} / ${min} caractères — encore un peu`,
  talkCountReady: 'Plus tu partages, meilleur sera ton CV — projets, réussites, tout.',
  back: 'Retour',
  skip: 'Passer',
  welcomeLoginLink: 'Vous avez déjà un compte ? Connectez-vous',
  loginTitle: 'Bon retour.',
  loginLead: 'Saisissez votre e-mail — nous vous enverrons un code à 6 chiffres.',

  welcomeTitle: 'Objectif : la shortlist.',
  welcomeLead:
    'Créez votre profil professionnel une seule fois. Shortlisted réutilise vos informations et vos réponses dans vos candidatures. Vous vérifiez tout avant l’envoi.',
  importCvTitle: 'J’ai un CV',
  importCvSub: 'Importez ou collez votre CV — l\'IA en fait votre profil. ~1 minute.',
  startBlankTitle: 'Je n’ai pas de CV',
  startBlankSub: 'Pas de souci — on vous aide à construire votre profil et un CV soigné une fois à l’intérieur.',

  pasteTitle: 'Votre CV, s’il vous plaît.',
  pasteLead: 'Importez le PDF, ou collez le texte.',
  uploadPdf: 'Importer un PDF',
  uploadSubIdle: 'L\'IA le lit et construit votre profil.',
  readingCv: 'Lecture de votre CV…',
  readingCloudSub: 'Extraction de votre profil — un instant.',
  buildingTitle: 'Préparation de votre profil…',
  buildingLead: 'Presque fini — quelques secondes.',
  pastePlaceholder: '…ou collez le texte de votre CV ici.',
  buildProfile: 'Créer mon profil',
  reviewTitle: 'C’est bien ça ?',
  reviewLead: (roles: number, skills: number) =>
    `${roles} poste${roles > 1 ? 's' : ''} et ${skills} compétences trouvés. Corrigez ce qui cloche — le reste sera modifiable plus tard.`,
  looksRight: 'C’est bon',

  answersTitle: 'Quelques infos rapides.',
  jobTypeLabel: 'Que recherches-tu ?',
  jobTypePlaceholder: 'Temps plein, stage, freelance…',
  answersLead: 'Répondez une fois ici, plus jamais sur une candidature.',
  salaryLabel: 'Prétentions salariales',
  salaryPlaceholder: '« 4 000 €/mois » ou « À discuter »',
  noticeLabel: 'Quand pouvez-vous commencer ?',
  noticePlaceholder: '« Immédiatement » ou « Préavis de 2 semaines »',
  sponsorshipLabel: 'Besoin d’un sponsoring de visa ?',
  sponsorshipPlaceholder: '« Non — prestataire à distance »',
  continue: 'Continuer',

  verifyTitle: 'Créez votre compte.',
  verifyLead:
    'Un code et c’est réglé — vos données dans votre compte et vos crédits IA gratuits débloqués.',
  emailPlaceholder: 'vous@exemple.com',
  sendCode: 'Envoyer le code',
  sending: 'Envoi…',
  inboxTitle: 'Vérifiez votre boîte mail.',
  inboxLead: (email: string) =>
    `Nous avons envoyé un code à 6 chiffres à ${email}. Saisissez-le ci-dessous pour terminer.`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Vérifier et démarrer',
  checking: 'Vérification…',
  resendCode: 'Renvoyer le code',
  changeEmail: 'Changer d’e-mail',
}
