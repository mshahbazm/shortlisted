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
  'data:image/jpeg;base64,/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCADmALQDASIAAhEBAxEB/8QAGwABAQADAQEBAAAAAAAAAAAAAAUBAwQGAgf/xAAvEAEAAgIBAwIEBAYDAAAAAAAAAQIDBAUREiEGMRMiQVEUYXGRMjOhsdHwNXKC/8QAFwEBAQEBAAAAAAAAAAAAAAAAAAECA//EABYRAQEBAAAAAAAAAAAAAAAAAAARAf/aAAwDAQACEQMRAD8A/bwHVkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHJye9j4/W+Lki1pme2tax5tP2TfT/I7e7t7dNuIp8Pp0pEdO338ESroi8hu7eTlacfoWpit2d98l469P0hnjN7Zjks2hvzS+Sle+uWkdImPHv+5CrI87h3OT5S+bLx18OHWx27a98dZuocHyNuQ1rzlpFM+K3ZkrH3+5CqQ1Zc+LDbHXLkrS2Se2sTPvJlz4sWTHTJkrW+SelImfNpFbRiZ6RMz9Hnq7HM7uPLs6/wAPXw1mezHkr81oj9YMxK9EI2rzF83B23YwzbNWe2aViZibf489XHs7fM6OtTd2bYLYpmO7D29JrErCvSiNynJ5aW1NfQrWdnZiLRN/atfv/v2asW9vaPI4Nbk7Y8uPP4pkpHTpP2/t+5CrwCKAAAAAAAAxMRPvET9UDgv+d5f/ALx/eVncw3z69seLNbDeenS9Y8wla3B5dfZtmpyGbvvaJv8ALHzfquJrm36X5D1H8DVtGtl18fW2eOvdMePHT/016ePJp8xtamafxGxsYpmufz3e3tP7KvIcRXZ2o2sGfJrbMR0m9PrH5wzx3E01Ni+zlzZNjZtHT4l/pH5QVI5fR1oniOke9clon+jX6Z+bkOXyV/l2zfLP382/y35+Cic+XJp7ebVrlnrelPaVDjtLDoa0YMET2x5mZ97T95N0jk9RX1Y0JptVm97z0xUr/FNvp0TOHrfX5SkczF5270iMF7z1r0+0fn/v6+ltjpe1bWrW1qz1rMx7T+TN6UvNZvWtprPWszHXpP3gqx9I3Mb18mSeO4+O/ayR0vb6Y6/WZV8lZtjtWtpraYmItH0/NAxenL4rWti5HYpa89bTXxM/r5MhqlqYtfh+Ox48mWtKV973np3WlL9T62aMdty2eMurS1Z/DWjpWfaPeJ8+VDFxUTx+XU29jLs1vbr3Xn5q+3t+zkj093xTHs72xm16T4xT4gxHPbLF/U/G55jtpl14mvX6dYt4/q2+qPm2+Lx1/mTm6x+8KXJcZh3sOOszbFfF5x3p4mrTo8PGDbja2djLtZ6x0ra/tUuEVQEaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf//Z'

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
