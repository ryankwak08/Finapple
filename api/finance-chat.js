import { buildFinanceChatResponse } from '../server/financeAssistant.js';
import { generateFinanceNarrative } from '../server/financeNarrative.js';

const parseOwnedDocuments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = String(req.body?.query || '').trim();
  const locale = String(req.body?.locale || req.query?.locale || 'ko');
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
