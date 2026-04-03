import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const tossSecretKey = process.env.TOSS_SECRET_KEY;
const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;

app.post('/api/payments/toss/create-checkout', async (req, res) => {
  if (!tossSecretKey) return res.status(500).json({ error: 'TOSS_SECRET_KEY is not configured' });

  const { priceId, amount, orderId, orderName, customerName, successUrl, failUrl } = req.body;
  const tossUrl = 'https://api.tosspayments.com/v1/payments';

  try {
    const response = await axios.post(
      tossUrl,
      {
        amount,
        orderId,
        orderName,
        customerName,
        successUrl,
        failUrl,
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('toss create-checkout error', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
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

app.listen(3000, () => {
  console.log('Payment backend running on http://localhost:3000');
});
