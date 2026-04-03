import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const tossSecretKey = process.env.TOSS_SECRET_KEY;
const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PREMIUM_PRICE = 9900;
const PORT = process.env.PORT || 3000;

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'finapple-payments' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/payments/toss/create-checkout', async (req, res) => {
  if (!tossSecretKey) {
    return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });
  }

  const { amount, orderId, orderName, customerName, customerEmail, successUrl, failUrl } = req.body;

  if (amount !== PREMIUM_PRICE) {
    return res.status(400).json({ error: 'Unexpected premium amount' });
  }

  if (!orderId || !String(orderId).startsWith('premium_monthly_')) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  try {
    const response = await axios.post(
      'https://api.tosspayments.com/v1/payments',
      {
        method: 'CARD',
        amount,
        orderId,
        orderName,
        customerName,
        customerEmail,
        successUrl,
        failUrl,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.json({
      success: true,
      checkoutUrl: response.data?.checkout?.url,
    });
  } catch (error) {
    console.error('toss create-checkout error', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      code: error.response?.data?.code || null,
    });
  }
});

app.post('/api/payments/toss/confirm', async (req, res) => {
  if (!tossSecretKey) {
    return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin is not configured' });
  }

  const { paymentKey, orderId, amount, accessToken } = req.body;

  if (!paymentKey || !orderId || !amount || !accessToken) {
    return res.status(400).json({ error: 'paymentKey, orderId, amount, accessToken are required' });
  }

  if (Number(amount) !== PREMIUM_PRICE) {
    return res.status(400).json({ error: 'Unexpected premium amount' });
  }

  if (!String(orderId).startsWith('premium_monthly_')) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ error: 'Invalid Supabase session' });
    }

    const tossResponse = await axios.post(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        paymentKey,
        orderId,
        amount: Number(amount),
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `confirm-${orderId}`,
        },
      }
    );

    const existingMetadata = authData.user.user_metadata || {};
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: {
        ...existingMetadata,
        is_premium: true,
        premium_plan: 'monthly',
        premium_updated_at: new Date().toISOString(),
        premium_payment_key: paymentKey,
        premium_order_id: orderId,
      },
    });

    if (updateError) {
      throw updateError;
    }

    return res.json({
      success: true,
      payment: tossResponse.data,
    });
  } catch (error) {
    console.error('toss confirm error', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message,
      code: error.response?.data?.code || null,
    });
  }
});

app.post('/api/payments/kakao/create-checkout', async (req, res) => {
  if (!kakaoAdminKey) return res.status(500).json({ error: 'KAKAO_ADMIN_KEY is not configured' });

  const { cid, partner_order_id, partner_user_id, item_name, quantity, total_amount, tax_free_amount, approval_url, fail_url, cancel_url } = req.body;
  try {
    const response = await axios.post(
      'https://kapi.kakao.com/v1/payment/ready',
      new URLSearchParams({
        cid,
        partner_order_id,
        partner_user_id,
        item_name,
        quantity,
        total_amount,
        vat_amount: tax_free_amount || 0,
        tax_free_amount: tax_free_amount || 0,
        approval_url,
        fail_url,
        cancel_url,
      }),
      {
        headers: {
          Authorization: `KakaoAK ${kakaoAdminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('kakao create-checkout error', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Payment backend running on port ${PORT}`);
});
