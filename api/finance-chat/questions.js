import { getYouthCoreQuestions } from '../../server/financeAssistant.js';
import { applyCors, cleanText } from '../_security.js';

export default async function handler(req, res) {
  if (!applyCors(req, res, ['GET'])) {
    return;
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const locale = cleanText(req.query?.locale || 'ko', 8);
    return res.status(200).json({ questions: getYouthCoreQuestions(locale) });
  } catch (error) {
    console.error('finance-chat questions api error', error);
    return res.status(500).json({ error: 'failed to load youth core questions' });
  }
}
