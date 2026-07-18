import type { tLocale } from '../en'

export const onboarding: tLocale['onboarding'] = {
  back: '← Retour',
  welcomeLoginLink: 'Vous avez déjà un compte ? Connectez-vous',
  loginTitle: 'Bon retour.',
  loginLead: 'Saisissez votre e-mail — nous vous enverrons un code à 6 chiffres.',

  welcomeTitle: 'Objectif : la shortlist.',
  welcomeLead:
    'Parlez-nous de vous une seule fois. Ensuite, chaque candidature se remplit toute seule — vous relisez et vous cliquez sur envoyer.',
  importCvTitle: 'Importer mon CV',
  importCvSub: 'Importez ou collez votre CV — l\'IA en fait votre profil. ~1 minute.',
  startBlankTitle: 'Partir de zéro',
  startBlankSub: 'Saisissez vos infos à la main dans l’onglet Profil.',

  pasteTitle: 'Votre CV, s’il vous plaît.',
  pasteLead: 'Importez le PDF, ou collez le texte.',
  uploadPdf: 'Importer un PDF',
  uploadAgain: 'Reçu ✓ — choisir un autre PDF',
  uploadSubIdle: 'L\'IA le lit et construit votre profil.',
  charsRead: (n: number) => `${n.toLocaleString('fr-FR')} caractères lus`,
  readingCv: 'Lecture de votre CV…',
  readingCloudSub: 'Extraction de votre profil — un instant.',
  pastePlaceholder: '…ou collez le texte de votre CV ici.',
  buildProfile: 'Créer mon profil',
  reviewTitle: 'C’est bien ça ?',
  reviewLead: (roles: number, skills: number) =>
    `${roles} poste${roles > 1 ? 's' : ''} et ${skills} compétences trouvés. Corrigez ce qui cloche — le reste sera modifiable plus tard.`,
  looksRight: 'C’est bon',

  answersTitle: 'Trois questions posées à chaque candidature.',
  answersLead: 'Répondez une fois ici, plus jamais sur une candidature.',
  salaryLabel: 'Prétentions salariales',
  salaryPlaceholder: '« 4 000 €/mois » ou « À discuter »',
  noticeLabel: 'Quand pouvez-vous commencer ?',
  noticePlaceholder: '« Immédiatement » ou « Préavis de 2 semaines »',
  sponsorshipLabel: 'Besoin d’un sponsoring de visa ?',
  sponsorshipPlaceholder: '« Non — prestataire à distance »',
  continue: 'Continuer',

  verifyTitle: 'Dernière étape — vérifiez votre e-mail.',
  verifyLead:
    'Un code et c’est réglé : votre profil sauvegardé, vos crédits IA gratuits débloqués, et votre page de profil shortlisted gratuite quand vous la voudrez.',
  emailPlaceholder: 'vous@exemple.com',
  sendCode: 'Envoyer le code',
  sending: 'Envoi…',
  inboxTitle: 'Vérifiez votre boîte mail.',
  inboxLead: (email: string) =>
    `Nous avons envoyé un code à 6 chiffres à ${email}. Saisissez-le ici et c’est fini — ouvrez ensuite n’importe quelle offre et cliquez sur « Remplir cette candidature ».`,
  codeLabel: 'Code',
  codePlaceholder: '123456',
  verifyStart: 'Vérifier et démarrer',
  checking: 'Vérification…',
  resendCode: 'Renvoyer le code',
  changeEmail: 'Changer d’e-mail',
}
