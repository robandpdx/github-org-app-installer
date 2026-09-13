import crypto from 'crypto';
import { rawBodyFromEvent, verifySignature } from '../src/lambda.js';

test('verifies GitHub sha256 webhook signatures when a secret is configured', () => {
  const body = JSON.stringify({ action: 'created' });
  const signature = `sha256=${crypto.createHmac('sha256', 'secret').update(body).digest('hex')}`;

  expect(verifySignature('secret', body, signature)).toBe(true);
  expect(verifySignature('secret', body)).toBe(false);
  expect(verifySignature('secret', body, 'sha256=bad')).toBe(false);
});

test('allows unsigned webhooks when no secret is configured', () => {
  expect(verifySignature('', JSON.stringify({ action: 'created' }))).toBe(true);
});

test('decodes base64 API Gateway request bodies', () => {
  expect(rawBodyFromEvent({ body: Buffer.from('payload').toString('base64'), isBase64Encoded: true })).toBe('payload');
});
