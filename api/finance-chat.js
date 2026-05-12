import { buildFinanceChatResponse } from '../server/financeAssistant.js';
import { generateFinanceNarrative } from '../server/financeNarrative.js';
import { applyCors, checkRateLimit, cleanText } from './_security.js';

const parseOwnedDocuments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 20)
    .map((item) => String(item || '').trim())
    .map((item) => item.slice(0, 80))
    .filter(Boolean);
};

export default async function handler(req, res) {
  if (!applyCors(req, res, ['POST'])) {
    return;
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkRateLimit(req, res, { key: 'finance-chat', limit: 30, windowMs: 60_000 })) {
    return;
  }

  const query = cleanText(req.body?.query, 800);
  const locale = cleanText(req.body?.locale || req.query?.locale || 'ko', 8);
  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  try {
    const ownedDocuments = parseOwnedDocuments(req.body?.owned_documents);
    const response = buildFinanceChatResponse({
      query,
      ownedDocuments,
      locale,
    });
    const assistantMessage = await generateFinanceNarrative({
      query,
      result: response,
      openAiApiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      locale,
    });
    return res.status(200).json({
      ...response,
      assistant_message: assistantMessage,
    });
  } catch (error) {
    console.error('finance-chat api error', error);
    return res.status(500).json({ error: 'finance chat failed' });
  }
}
