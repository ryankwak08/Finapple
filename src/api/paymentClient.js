import { supabase } from '@/lib/supabase';
import { BACKEND_URL } from '@/lib/backendUrl';
import { buildAppUrl } from '@/lib/appBaseUrl';
export const PREMIUM_MONTHLY_PRICE = 9900;
export const SURVIVAL_COIN_PACK_PRICE = 2900;
export const COIN_PACK_AMOUNT = 10;

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

export const createSurvivalCoinPackOrderId = () => {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `survival_coinpack_${Date.now()}_${randomPart}`;
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
        successUrl: buildAppUrl('/premium/success?provider=toss'),
        failUrl: buildAppUrl('/premium/fail?provider=toss'),
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

export const createKcpBillingAuthSession = async ({ amount, orderId, orderName, customerName, customerEmail }) => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('로그인 세션을 찾지 못했습니다. 다시 로그인해주세요.');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/kcp/create-billing-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        accessToken: data.session.access_token,
        successUrl: buildAppUrl('/premium/success?provider=kcp'),
        failUrl: buildAppUrl('/premium/fail?provider=kcp'),
      }),
    });

    const payload = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload?.error || `KCP 결제창 생성 실패 (${response.status})`);
    }

    if (!payload?.checkoutUrl || !payload?.formData) {
      throw new Error('KCP 결제창 정보를 받지 못했습니다.');
    }

    return {
      success: true,
      checkoutUrl: payload.checkoutUrl,
      formData: payload.formData,
    };
  } catch (requestError) {
    console.error('KCP billing auth create error:', requestError);
    return { success: false, error: requestError.message };
  }
};

export const submitKcpCheckoutForm = ({ checkoutUrl, formData }) => {
  if (!checkoutUrl || typeof formData !== 'object' || !formData) {
    throw new Error('KCP 결제 요청 데이터가 올바르지 않습니다.');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = checkoutUrl;
  form.style.display = 'none';

  Object.entries(formData).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
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

export const createTossSurvivalCoinCheckoutSession = async ({ orderId, orderName, customerName, customerEmail }) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/toss/create-survival-coin-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: SURVIVAL_COIN_PACK_PRICE,
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl: buildAppUrl('/survival?coinCheckout=success&provider=toss'),
        failUrl: buildAppUrl('/survival?coinCheckout=fail&provider=toss'),
      }),
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(data?.error || `코인 결제창 생성 실패 (${response.status})`);
    }

    if (data?.checkoutUrl) {
      return { success: true, url: data.checkoutUrl };
    }

    throw new Error('토스 결제창 URL을 받지 못했습니다.');
  } catch (error) {
    console.error('Toss coin checkout error:', error);
    return { success: false, error: error.message };
  }
};

export const confirmTossSurvivalCoinPayment = async ({ paymentKey, orderId, amount }) => {
  const response = await fetch(`${BACKEND_URL}/api/payments/toss/confirm-survival-coin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: Number(amount),
    }),
  });

  const result = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(result?.error || `코인 결제 승인에 실패했습니다. (${response.status})`);
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
        approval_url: buildAppUrl('/premium/success?provider=kakao'),
        fail_url: buildAppUrl('/premium/fail?provider=kakao'),
        cancel_url: buildAppUrl('/premium/cancel?provider=kakao'),
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
