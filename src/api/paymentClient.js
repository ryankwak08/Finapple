// 토스페이 및 카카오페이 결제 클라이언트
// 백엔드가 http://localhost:3000 에서 실행 중이어야 함

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const createTossCheckoutSession = async ({ amount, orderId, orderName, customerName }) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/toss/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId,
        orderName,
        customerName,
        successUrl: `${window.location.origin}/premium/success?paymentKey={paymentKey}&orderId={orderId}`,
        failUrl: `${window.location.origin}/premium/fail`,
      }),
    });
    const data = await response.json();
    if (data.nextRedirectUrl) {
      return { success: true, url: data.nextRedirectUrl };
    }
    return data;
  } catch (error) {
    console.error('Toss checkout error:', error);
    return { success: false, error: error.message };
  }
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
        approval_url: `${window.location.origin}/premium/success`,
        fail_url: `${window.location.origin}/premium/fail`,
        cancel_url: `${window.location.origin}/premium`,
      }),
    });
    const data = await response.json();
    if (data.next_redirect_pc_url) {
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
  amount: 9900,
  message: 'FINAPPLE_PREMIUM',
});

