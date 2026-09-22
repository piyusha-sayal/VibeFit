/**
 * The legal text is the one place where a sentence can be true on the screen
 * and false in the code. These tests pin the claims that people actually rely
 * on, and pin them to the wording the server uses, so the two cannot drift.
 */
import { describe, expect, it } from '@jest/globals';

import {
  LEGAL_DOCUMENTS, LEGAL_REVIEW_NOTE, PRIVACY_POLICY, TERMS_OF_SERVICE,
} from './legal';

const ALL_TEXT = [PRIVACY_POLICY, TERMS_OF_SERVICE]
  .flatMap((doc) => [doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.body])])
  .join('\n');

describe('both documents', () => {
  it('are reachable by slug', () => {
    expect(Object.keys(LEGAL_DOCUMENTS).sort()).toEqual(['privacy', 'terms']);
    expect(LEGAL_DOCUMENTS.privacy.slug).toBe('privacy');
    expect(LEGAL_DOCUMENTS.terms.slug).toBe('terms');
  });

  it('say plainly that they have had no legal review', () => {
    expect(LEGAL_REVIEW_NOTE.toLowerCase()).toContain('not yet been reviewed');
  });

  it('have a heading and at least one paragraph in every section', () => {
    for (const doc of [PRIVACY_POLICY, TERMS_OF_SERVICE]) {
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const section of doc.sections) {
        expect(section.heading.trim()).not.toBe('');
        expect(section.body.length).toBeGreaterThan(0);
        for (const paragraph of section.body) {
          expect(paragraph.trim()).not.toBe('');
        }
      }
    }
  });

  it('invent no company, address or support contact', () => {
    // Naming an entity that does not exist would be worse than naming none.
    expect(ALL_TEXT).not.toMatch(/\b(Ltd|Limited|LLC|Inc\.|GmbH|Pvt\.)\b/);
    expect(ALL_TEXT).not.toMatch(/\b\d{1,4}\s+\w+\s+(Street|Road|Avenue|Lane)\b/i);
    expect(ALL_TEXT).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('claim no certification or formal compliance', () => {
    expect(ALL_TEXT).not.toMatch(/\b(certified|ISO 27001|SOC 2|fully compliant)\b/i);
  });
});

describe('the privacy policy matches what the code does', () => {
  const text = [PRIVACY_POLICY.intro,
                ...PRIVACY_POLICY.sections.flatMap((s) => [s.heading, ...s.body])]
    .join('\n');

  it('states that photographs are not kept by default', () => {
    expect(text).toContain('not kept by default');
  });

  it('states that withdrawing consent deletes what was kept', () => {
    expect(text.toLowerCase()).toContain('deleted at that moment');
  });

  it('repeats the backup wording the API returns verbatim', () => {
    // backend/services/privacy_service.py: RETENTION_NOTE. If one changes and
    // the other does not, the app and the server disagree about the single
    // claim people are most likely to check.
    expect(text).toContain(
      'Your account and everything in it is removed from the live database ' +
      'immediately, and stored photographs are deleted from object storage ' +
      'as part of the same request. Encrypted infrastructure backups are ' +
      'kept by our database and storage providers on their own rolling ' +
      'schedules and are not searchable per person; deleted data ages out ' +
      'of those backups rather than being removed from them individually.',
    );
  });

  it('does not promise retention the deployment may be unable to provide', () => {
    // backend/services/privacy_service.py refuses to record retention consent
    // when no object storage is configured. The policy has to allow for that,
    // or it describes a build nobody is running.
    expect(text).toContain('the setting is shown as');
    expect(text).toContain('no photograph is kept at all');
  });

  it('promises no erasure from backups', () => {
    expect(text).not.toMatch(/removed from (all|every) backup/i);
  });

  it('repeats the standing product commitments', () => {
    expect(text).toContain('photographs of your body');
    expect(text).toContain('We do not use your photographs to train models.');
    expect(text.toLowerCase()).toContain('we do not score your appearance');
  });
});

describe('the terms match what the product is', () => {
  const text = TERMS_OF_SERVICE.sections
    .flatMap((s) => [s.heading, ...s.body]).join('\n');

  it('does not present illustrations as a try-on or a prediction', () => {
    expect(text).toContain('not a virtual try-on');
    expect(text.toLowerCase()).toContain('not a prediction');
  });

  it('claims no exact shade match', () => {
    expect(text).toContain('do not claim an exact match');
  });

  it('is honest about the free hosting tier', () => {
    expect(text.toLowerCase()).toContain('sleeps when idle');
    expect(text.toLowerCase()).toContain('no promise of uptime');
  });
});
