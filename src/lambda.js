import crypto from 'crypto';
import { Probot } from 'probot';
import app from './app.js';
import { loadConfig } from './config.js';

let probot;

function header(headers, name) {
  const lowerName = name.toLowerCase();
  const found = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === lowerName);
  return found && found[1];
}

export function rawBodyFromEvent(event) {
  const body = event.body || '';
  return event.isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
}

export function verifySignature(secret, payload, signature) {
  if (!secret) {
    return true;
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

function getProbot(config) {
  if (!probot) {
    probot = new Probot({
      appId: config.appId,
      privateKey: config.privateKey,
      secret: config.webhookSecret || undefined,
    });
    probot.load(app);
  }

  return probot;
}

export async function handler(event) {
  const config = loadConfig();
  const body = rawBodyFromEvent(event);
  const signature = header(event.headers, 'x-hub-signature-256');

  if (!verifySignature(config.webhookSecret, body, signature)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const name = header(event.headers, 'x-github-event');
  const id = header(event.headers, 'x-github-delivery');
  if (!name || !id) {
    return { statusCode: 400, body: 'Missing GitHub webhook headers' };
  }

  await getProbot(config).receive({ id, name, payload: JSON.parse(body) });
  return { statusCode: 202, body: 'Accepted' };
}
