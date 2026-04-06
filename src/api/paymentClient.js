import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';
export const PREMIUM_MONTHLY_PRICE = 9900;

const normalizeAbsoluteUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Support env values like "my-app.vercel.app" by defaulting to HTTPS.
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const getAppBaseUrl = () => normalizeAbsoluteUrl(import.meta.env.VITE_APP_BASE_URL) || window.location.origin;

const parseJsonResponse = async (response) => {
  const rawText = await response.text();
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    const preview = rawText.slice(0, 160);
    throw new Error(preview ? `서버 응답을 해석하지 못했습니다: ${preview}` : '서버 응답을 해석하지 못했습니다.');
  }
};

export const createPremiumOrderId = () => {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `premium_monthly_${Date.now()}_${randomPart}`;
};

export const createTossCheckoutSession = async ({ amount, orderId, orderName, customerName, customerEmail }) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/toss/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl: `${getAppBaseUrl()}/premium/success?provider=toss`,
        failUrl: `${getAppBaseUrl()}/premium/fail?provider=toss`,
      }),
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.error || `결제창 생성 실패 (${response.status})`);
    }

    if (data?.checkoutUrl) {
      return { success: true, url: data.checkoutUrl };
    }

    throw new Error('토스 결제창 URL을 받지 못했습니다.');
  } catch (error) {
    console.error('Toss checkout error:', error);
    return { success: false, error: error.message };
  }
};

export const confirmTossPayment = async ({ paymentKey, orderId, amount }) => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다. 다시 로그인해주세요.');
  }

  const response = await fetch(`${BACKEND_URL}/api/payments/toss/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: Number(amount),
      accessToken: data.session.access_token,
    }),
  });

  const result = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(result?.error || `결제 승인에 실패했습니다. (${response.status})`);
  }

  return result;
};

export const createKakaoCheckoutSession = async ({ itemName, quantity, totalAmount, customerName }) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/kakao/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cid: import.meta.env.VITE_KAKAO_CID || 'TC0ONETIME',
        partner_order_id: `order_${Date.now()}`,
        partner_user_id: customerName,
        item_name: itemName,
        quantity,
        total_amount: totalAmount,
        tax_free_amount: 0,
        approval_url: `${window.location.origin}/premium/success?provider=kakao`,
        fail_url: `${window.location.origin}/premium/fail?provider=kakao`,
        cancel_url: `${window.location.origin}/premium/cancel?provider=kakao`,
      }),
    });
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.error || `카카오 결제창 생성 실패 (${response.status})`);
    }

    if (data?.next_redirect_pc_url) {
      return { success: true, url: data.next_redirect_pc_url };
    }

    return data;
  } catch (error) {
    console.error('Kakao checkout error:', error);
    return { success: false, error: error.message };
  }
};

export const getBankTransferInstructions = () => ({
  bankName: '국민은행',
  accountNumber: '123456-01-234567',
  accountHolder: '파인애플 학습센터',
  amount: PREMIUM_MONTHLY_PRICE,
  message: 'FINAPPLE_PREMIUM',
});
