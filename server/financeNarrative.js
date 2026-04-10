const extractResponseText = (payload) => {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const textParts = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join('\n').trim();
};

const isEnglishLocale = (locale = 'ko') => String(locale || 'ko').toLowerCase().startsWith('en');

const buildFallbackNarrative = ({ query, result, locale = 'ko' }) => {
  const firstDoc = result?.documents?.[0];
  if (!firstDoc) {
    return isEnglishLocale(locale)
      ? `I prepared guidance for your question: "${query}".`
      : `질문 "${query}"에 맞는 안내를 준비했어요.`;
  }

  const firstAction = Array.isArray(firstDoc.next_actions) && firstDoc.next_actions.length > 0
    ? firstDoc.next_actions[0]
    : (isEnglishLocale(locale) ? 'Please check the official process through the links below.' : '링크를 통해 공식 절차를 확인해 주세요.');

  if (isEnglishLocale(locale)) {
    return `I understood this as a '${result.predicted_intent}' question. First, ${firstAction} Then review the required documents and proceed through the official links below.`;
  }

  return `${result.predicted_intent} 관련 질문으로 이해했어요. 먼저 ${firstAction} 필요한 서류를 확인한 뒤 아래 바로가기에서 신청/발급 절차를 진행해 보세요.`;
};

export const generateFinanceNarrative = async ({
  query,
  result,
  openAiApiKey,
  model = 'gpt-4o-mini',
  locale = 'ko',
}) => {
  if (!openAiApiKey) {
    return buildFallbackNarrative({ query, result, locale });
  }

  const primaryDoc = result?.documents?.[0] || null;
  const promptPayload = {
    query,
    predicted_intent: result?.predicted_intent,
    confidence: result?.confidence,
    primary_guide: primaryDoc
      ? {
          title: primaryDoc.title,
          content: primaryDoc.content,
          required_documents: primaryDoc.required_documents || [],
          next_actions: primaryDoc.next_actions || [],
          links: primaryDoc.links || [],
        }
      : null,
  };

  const systemPrompt = isEnglishLocale(locale)
    ? [
        'You are a youth finance coach.',
        'Use only facts from the JSON and write 2-4 natural sentences.',
        'Mention only institutions, links, documents, and steps that appear in JSON.',
        'Do not invent conditions, names, or amounts.',
        'Use clear, friendly English.',
      ].join(' ')
    : [
        '너는 한국 청년 대상 금융 코치다.',
        '아래 JSON의 사실만 사용해 2~4문장으로 자연스럽게 설명하라.',
        '링크/기관/서류/절차는 JSON에 있는 내용만 언급하라.',
        '새 제도명, 금액, 조건을 만들어내지 마라.',
        '친근하지만 과장 없는 톤으로 작성하라.',
        '반드시 한국어로 작성하라.',
      ].join(' ');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: JSON.stringify(promptPayload, null, 2) }],
        },
      ],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    return buildFallbackNarrative({ query, result, locale });
  }

  const generated = extractResponseText(payload);
  if (!generated) {
    return buildFallbackNarrative({ query, result, locale });
  }

  return generated;
};
