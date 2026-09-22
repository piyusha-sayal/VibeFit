/**
 * The user-facing privacy and terms text.
 *
 * Written to describe what the code actually does, clause by clause, rather
 * than to sound like a policy. Every sentence about photographs, retention,
 * deletion and export corresponds to something implemented and tested — the
 * retention wording is the same sentence the API returns as `retentionNote`,
 * so the app and the server cannot drift apart on the one claim people rely on
 * most.
 *
 * It has had no legal review. It is a truthful starting point for one, and it
 * names no company, no address and no legal entity, because MyLookFit does not
 * yet have them to name.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDocument {
  slug: 'privacy' | 'terms';
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

/** Shown at the top of both documents, so nobody mistakes this for counsel. */
export const LEGAL_REVIEW_NOTE =
  'This document describes how MyLookFit behaves today. It has not yet been ' +
  'reviewed by a lawyer, and it is not a contract with a named company.';

export const PRIVACY_POLICY: LegalDocument = {
  slug: 'privacy',
  title: 'Privacy',
  updated: '22 September 2026',
  intro:
    'MyLookFit analyses a photograph of your face to suggest colours, ' +
    'hairstyles, makeup and clothes. This page says what happens to that ' +
    'photograph, and to everything else the app knows about you.',
  sections: [
    {
      heading: 'Your photograph is not kept by default',
      body: [
        'When you run an analysis, the image is processed and the results are ' +
          'saved to your account. The photograph itself is deleted as soon as ' +
          'the analysis finishes, unless you have turned on “Keep my ' +
          'photographs” under Settings → Privacy.',
        'If you turn that setting off later, the photographs already kept are ' +
          'deleted at that moment. Withdrawing consent is an instruction, not ' +
          'a preference we record for next time.',
        'Keeping a photograph also requires storage the release you are using ' +
          'may not have. Where it is unavailable the setting is shown as ' +
          'unavailable, and no photograph is kept at all. Settings → Privacy ' +
          'states which applies to you.',
      ],
    },
    {
      heading: 'What we never do with a photograph',
      body: [
        'We do not ask for, accept or analyse photographs of your body. Body ' +
          'styling comes from a questionnaire you fill in, and you can decline ' +
          'to categorise your shape at all.',
        'We do not infer your ethnicity, nationality, gender identity or ' +
          'cultural background from an image.',
        'We do not score your appearance or judge whether your features are ' +
          'ideal. The analysis describes; it does not rank.',
        'We do not use your photographs to train models.',
      ],
    },
    {
      heading: 'What else the app stores',
      body: [
        'Your account details, the results of each analysis, your style ' +
          'answers, the looks you save, your collections, goals, guide ' +
          'progress, preferences and the feedback you give on individual items.',
        'All of it belongs to your account and is visible only to you.',
      ],
    },
    {
      heading: 'Taking a copy',
      body: [
        'Settings → Privacy → Export my data produces a JSON file containing ' +
          'everything on your account. Photographs are listed rather than ' +
          'included; you manage those on the same screen.',
        'The export never contains your password, any authentication token, or ' +
          'anything belonging to another person.',
      ],
    },
    {
      heading: 'Deleting your account',
      body: [
        'Settings → Account → Delete account removes your profile, every ' +
          'analysis and its results, any photograph still stored, your saved ' +
          'looks, drafts, collections, goals, journey, guide progress, ' +
          'preferences and feedback.',
        'You will be asked to type a confirmation phrase and to prove who you ' +
          'are again. This cannot be undone, and nothing can be recovered ' +
          'afterwards.',
      ],
    },
    {
      heading: 'Backups',
      body: [
        'Your account and everything in it is removed from the live database ' +
          'immediately, and stored photographs are deleted from object storage ' +
          'as part of the same request. Encrypted infrastructure backups are ' +
          'kept by our database and storage providers on their own rolling ' +
          'schedules and are not searchable per person; deleted data ages out ' +
          'of those backups rather than being removed from them individually.',
        'We say this plainly rather than promising an immediate erasure we ' +
          'could not carry out.',
      ],
    },
    {
      heading: 'Who else sees it',
      body: [
        'Sign-in is handled by Google Firebase Authentication. The database is ' +
          'hosted on Neon and the application on Render. Those providers process ' +
          'data on our behalf in order to run the service.',
        'We do not sell your data and we do not share it for advertising.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  slug: 'terms',
  title: 'Terms',
  updated: '22 September 2026',
  intro:
    'MyLookFit is a styling tool. These terms describe what it offers and ' +
    'what it does not.',
  sections: [
    {
      heading: 'What the recommendations are',
      body: [
        'Suggestions, based on rules applied to what the app can measure and ' +
          'to what you tell it about your preferences. They are a starting ' +
          'point for your own judgement, not an expert opinion about you.',
        'The illustrations are drawings. They show a style; they are not a ' +
          'photograph of you, not a virtual try-on, and not a prediction of ' +
          'what a real haircut or colour will look like on your hair.',
      ],
    },
    {
      heading: 'Not professional advice',
      body: [
        'Nothing in MyLookFit is medical, dermatological or cosmetic advice. ' +
          'Speak to a professional before acting on anything that affects your ' +
          'skin or hair health.',
      ],
    },
    {
      heading: 'Products and shades',
      body: [
        'Where a shade family or a fabric is mentioned it describes a ' +
          'direction, not a specific product. We do not claim an exact match ' +
          'to any brand’s shade, and we do not quote prices or availability.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'Keep your sign-in details to yourself. You are responsible for what ' +
          'happens on your account.',
        'You can delete your account at any time from Settings → Account.',
      ],
    },
    {
      heading: 'Availability',
      body: [
        'MyLookFit runs on a free hosting tier. The service sleeps when idle ' +
          'and the first request after that can take around a minute. We make ' +
          'no promise of uptime.',
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
};
