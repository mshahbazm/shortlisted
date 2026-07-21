import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Réglages',
  hint: 'Le remplissage fonctionne sans configuration. Votre compte débloque l’IA — import du CV, adaptation, scores de compatibilité.',

  languageTitle: 'Langue',
  languageAuto: 'Auto (langue du navigateur)',

  accountIntro:
    'Connectez-vous avec votre e-mail pour débloquer l’IA et garder vos données dans votre compte. Gratuit : 10 crédits. Pro (9 $/mois) : 100 crédits par mois. Un CV adapté ≈ 1 crédit.',
  emailPlaceholder: 'vous@exemple.com',
  sendCode: 'Envoyez-moi un code',
  sending: 'Envoi…',
  codeSent: 'Code envoyé — vérifiez votre e-mail.',
  codeLabel: 'Le code à 6 chiffres reçu par e-mail',
  codePlaceholder: '123456',
  signIn: 'Se connecter',
  checking: 'Vérification…',
  resendCode: 'Renvoyer le code',
  signedIn: 'Connecté.',
  checkCredits: 'Voir mes crédits',
  planFree: 'Gratuit',
  planPro: 'Pro',
  signOutDevice: 'Se déconnecter sur cet appareil',

  backupTitle: 'Sauvegarde',
  backupSummary: 'tout exporter / importer',
  exportJson: 'Exporter en JSON',
  importJson: 'Importer un JSON',
  imported: 'Importé.',
  importFailed: (msg: string) => `Échec de l’import : ${msg}`,

  detectOn: 'activé — tous les sites',
  detectOff: 'désactivé — sites d’emploi connus uniquement',
  detectHint:
    'Shortlisted repère les formulaires de candidature sur tous les sites et apparaît quand il en reconnaît un. L’analyse se fait sur votre ordinateur et rien n’est envoyé. Désactivez pour le limiter aux sites d’emploi que nous gérons directement.',
  detectToggle: 'Reconnaître les formulaires de candidature sur tout site',

  serverTitle: 'Serveur cloud',
  serverDevHint:
    'Ceci est une version de développement non empaquetée : elle utilise votre serveur local. Ne le changez que si votre serveur est ailleurs.',
  serverProdHint:
    'Connecté à Shortlisted Cloud. Laissez vide, sauf si on vous a demandé de pointer ailleurs.',
  serverUrlLabel: 'URL du serveur',
  serverReset: 'Utiliser la valeur par défaut',
  creditsLeft: 'Crédits restants',
  creditsOf: 'sur',
  goPro: 'Passer à Pro — 100 crédits par mois',
  proFoot: '9 $ par mois. Un CV adapté ou une évaluation coûte 1 crédit. Remplir des formulaires est toujours gratuit.',
  whereILook: 'Où je cherche des formulaires',
}
