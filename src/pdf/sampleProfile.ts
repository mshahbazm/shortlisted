// A rich dummy profile for rendering sample CVs of every format — used by the
// smoke test (resumePdf.test.ts) and the sample-writer script
// (scripts/render-samples.ts). Not shipped in the extension bundle.

import { Profile } from '../lib/types'

// A tiny placeholder JPEG so the photo box renders on photo formats (Europass /
// Continental). Obviously a swatch, not a real headshot — it only proves layout.
// JPEG on purpose: jsPDF reads JPEG dimensions from the header (instant), whereas
// its Node PNG-decode path is pathologically slow. Real uploaded photos should be
// downscaled + re-encoded to JPEG on upload for the same reason.
const PLACEHOLDER_PHOTO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AfwD/2Q=='

export function sampleProfile(): Profile {
  return {
    identity: {
      firstName: 'Amara',
      lastName: 'Okonkwo',
      email: 'amara.okonkwo@example.com',
      phone: '+31 6 1234 5678',
      location: 'Amsterdam, Netherlands',
      city: 'Amsterdam',
      country: 'NL',
      photo: PLACEHOLDER_PHOTO,
      dateOfBirth: '14 March 1996',
      nationality: 'Nigerian',
    },
    headline: 'Full-Stack Engineer',
    summary:
      'Full-stack engineer with six years building data-heavy web products. I care about clean interfaces, fast APIs, and shipping things people actually use — most recently an internal analytics platform used daily by 400+ staff.',
    highlights: [
      'Cut checkout latency 38% by reworking the payments service',
      'Led a 4-engineer team through a zero-downtime database migration',
      'Mentored three juniors, two now mid-level',
    ],
    industries: ['SaaS', 'FinTech'],
    skills: [
      { name: 'TypeScript', proficiency: 'expert', category: 'primary' },
      { name: 'React', proficiency: 'expert', category: 'primary' },
      { name: 'Node.js', proficiency: 'advanced', category: 'primary' },
      { name: 'PostgreSQL', proficiency: 'advanced' },
      { name: 'AWS', proficiency: 'intermediate' },
      { name: 'Docker', proficiency: 'intermediate' },
      { name: 'GraphQL', proficiency: 'advanced' },
    ],
    work: [
      {
        id: 'w1',
        company: 'Meridian Analytics',
        title: 'Senior Full-Stack Engineer',
        location: 'Amsterdam',
        startMonth: 6,
        startYear: 2022,
        isCurrent: true,
        skills: ['TypeScript', 'React', 'Node.js'],
        highlights: [
          'Built the internal analytics platform now used daily by 400+ staff',
          'Cut checkout latency 38% by reworking the payments service',
          'Introduced end-to-end tests, dropping production incidents by half',
        ],
      },
      {
        id: 'w2',
        company: 'Kordo Logistics',
        title: 'Full-Stack Engineer',
        location: 'Rotterdam',
        startMonth: 1,
        startYear: 2019,
        endMonth: 5,
        endYear: 2022,
        isCurrent: false,
        skills: ['Node.js', 'PostgreSQL'],
        highlights: [
          'Led a 4-engineer team through a zero-downtime database migration',
          'Shipped the customer-facing tracking portal from scratch',
        ],
      },
    ],
    education: [
      {
        id: 'e1',
        school: 'University of Amsterdam',
        degree: 'BSc',
        fieldOfStudy: 'Computer Science',
        startYear: 2015,
        endYear: 2018,
        description: 'Graduated with honours; thesis on distributed caching.',
      },
    ],
    languages: [
      { langCode: 'en', name: 'English', proficiency: 'native_bilingual' },
      { langCode: 'nl', name: 'Dutch', proficiency: 'professional_working' },
      { langCode: 'fr', name: 'French', proficiency: 'limited_working' },
    ],
    certifications: [{ name: 'AWS Certified Developer', issuingOrganization: 'Amazon', year: 2023 }],
    links: {
      website: 'amara.dev',
      github: 'github.com/amara',
      linkedin: 'linkedin.com/in/amara',
    },
    facts: {},
  }
}
