import type { tLocale } from '../en'

export const settings: tLocale['settings'] = {
  title: 'Réglages',
  hint: 'Le remplissage fonctionne sans configuration. Votre compte débloque l’IA — import du CV, adaptation, scores de compatibilité.',

  languageTitle: 'Langue',
  languageAuto: 'Auto (langue du navigateur)',

  accountTitle: 'Compte',
  notSignedIn: 'non connecté',
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
  signedInAs: (email: string) => `Connecté en tant que ${email}`,
  checkCredits: 'Voir mes crédits',
  usageLine: (plan: string, used: number, limit: number, monthly: boolean) =>
    `${plan} · ${used} crédit${used > 1 ? 's' : ''} utilisé${used > 1 ? 's' : ''} sur ${limit}${monthly ? ' ce mois-ci' : ' (au total)'}`,
  planFree: 'Gratuit',
  planPro: 'Pro',
  signOutDevice: 'Se déconnecter sur cet appareil',

  backupTitle: 'Sauvegarde',
  backupSummary: 'tout exporter / importer',
  exportJson: 'Exporter en JSON',
  importJson: 'Importer un JSON',
  imported: 'Importé.',
  importFailed: (msg: string) => `Échec de l’import : ${msg}`,

  cloudServerTitle: 'Serveur cloud',
  cloudServerDefault: (url: string) => `${url} (par défaut)`,
  cloudServerLabel: (url: string) =>
    `URL personnalisée — laissez vide pour la valeur par défaut (${url})`,

  rulesTitle: 'Les règles',
  rulesSummary: 'pas d’envoi auto, pas de mensonges',
  rulesBody:
    'C’est vous qui cliquez sur envoyer — toujours. Les CAPTCHA sont pour vous. L’adaptation du CV ne fait que réorganiser ce qui est vrai — elle ne peut inventer ni compétences ni expérience.',
}
