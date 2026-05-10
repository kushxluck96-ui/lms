const pool = require('../config/database');
const crypto = require('crypto');
require('dotenv').config();

// Subscription plans
const PLANS = {
  monthly: { amount: 999, label: 'Monthly Plan', duration_days: 30 },
  yearly: { amount: 8999, label: 'Yearly Plan', duration_days: 365 },
};

// ==========================================
// INITIATE PAYMENT
// ==========================================
const initiatePayment = async (req, res) => {
  try {
    const { plan, gateway } = req.body;
    const user_id = req.user.id;

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    if (!['esewa', 'khalti'].includes(gateway)) {
      return res.status(400).json({ error: 'Invalid payment gateway' });
    }

    const selectedPlan = PLANS[plan];
    const transaction_id = `LMS-${Date.now()}-${user_id.substring(0, 8)}`;

    // Store pending payment
    await pool.query(
      `INSERT INTO payments (user_id, amount, currency, gateway, gateway_transaction_id, status)
       VALUES ($1, $2, 'NPR', $3, $4, 'pending')`,
      [user_id, selectedPlan.amount, gateway, transaction_id]
    );

    if (gateway === 'esewa') {
      // eSewa payment data
      const esewaData = {
        amount: selectedPlan.amount,
        tax_amount: 0,
        total_amount: selectedPlan.amount,
        transaction_uuid: transaction_id,
        product_code: process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST',
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: `${process.env.BACKEND_URL}/api/v1/payments/esewa/success`,
        failure_url: `${process.env.FRONTEND_URL}/dashboard/student?payment=failed`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
      };

      // Generate signature
      const message = `total_amount=${esewaData.total_amount},transaction_uuid=${esewaData.transaction_uuid},product_code=${esewaData.product_code}`;
      const signature = crypto
        .createHmac('sha256', process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q')
        .update(message)
        .digest('base64');

      esewaData.signature = signature;

      return res.json({
        gateway: 'esewa',
        payment_url: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
        form_data: esewaData,
        transaction_id,
        plan,
        amount: selectedPlan.amount,
      });
    }

    if (gateway === 'khalti') {
      // Khalti payment initiation
      const khaltiPayload = {
        return_url: `${process.env.BACKEND_URL}/api/v1/payments/khalti/success`,
        website_url: process.env.FRONTEND_URL || 'http://localhost:3000',
        amount: selectedPlan.amount * 100, // Khalti uses paisa
        purchase_order_id: transaction_id,
        purchase_order_name: selectedPlan.label,
        customer_info: {
          name: req.user.full_name,
          email: req.user.email,
        },
      };

      const khaltiRes = await fetch('https://a.khalti.com/api/v2/epayment/initiate/', {
        method: 'POST',
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(khaltiPayload),
      });

      const khaltiData = await khaltiRes.json();

      if (khaltiData.payment_url) {
        return res.json({
          gateway: 'khalti',
          payment_url: khaltiData.payment_url,
          pidx: khaltiData.pidx,
          transaction_id,
          plan,
          amount: selectedPlan.amount,
        });
      } else {
        return res.status(400).json({ error: 'Khalti initiation failed', details: khaltiData });
      }
    }
  } catch (err) {
    console.error('Initiate payment error:', err);
    res.status(500).json({ error: 'Server error initiating payment' });
  }
};

// ==========================================
// ESEWA SUCCESS CALLBACK
// ==========================================
const esewaSuccess = async (req, res) => {
  try {
    const { data } = req.query;

    if (!data) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
    }

    // Decode base64 response
    const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    const { transaction_uuid, total_amount, status } = decoded;

    if (status !== 'COMPLETE') {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
    }

    // Find the pending payment
    const payment = await pool.query(
      `SELECT p.*, u.id as user_id FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.gateway_transaction_id = $1 AND p.status = 'pending'`,
      [transaction_uuid]
    );

    if (payment.rows.length === 0) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
    }

    const { user_id, amount } = payment.rows[0];

    // Determine plan from amount
    const plan = amount <= 999 ? 'monthly' : 'yearly';
    const duration = PLANS[plan].duration_days;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Activate subscription
    await activateSubscription(user_id, plan, 'esewa', expiresAt);

    // Mark payment complete
    await pool.query(
      `UPDATE payments SET status = 'completed' WHERE gateway_transaction_id = $1`,
      [transaction_uuid]
    );

    console.log(`✅ eSewa payment verified for user ${user_id}`);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=success&plan=${plan}`);
  } catch (err) {
    console.error('eSewa success error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
  }
};

// ==========================================
// KHALTI SUCCESS CALLBACK
// ==========================================
const khaltiSuccess = async (req, res) => {
  try {
    const { pidx, transaction_id, status } = req.query;

    if (status !== 'Completed') {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
    }

    // Verify with Khalti
    const verifyRes = await fetch('https://a.khalti.com/api/v2/epayment/lookup/', {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    const verifyData = await verifyRes.json();

    if (verifyData.status !== 'Completed') {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
    }

    // Find the pending payment
    const payment = await pool.query(
      `SELECT * FROM payments WHERE gateway_transaction_id = $1 AND status = 'pending'`,
      [transaction_id]
    );

    if (payment.rows.length === 0) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
    }

    const { user_id, amount } = payment.rows[0];
    const plan = amount <= 999 ? 'monthly' : 'yearly';
    const duration = PLANS[plan].duration_days;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    await activateSubscription(user_id, plan, 'khalti', expiresAt);

    await pool.query(
      `UPDATE payments SET status = 'completed' WHERE gateway_transaction_id = $1`,
      [transaction_id]
    );

    console.log(`✅ Khalti payment verified for user ${user_id}`);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=success&plan=${plan}`);
  } catch (err) {
    console.error('Khalti success error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/student?payment=failed`);
  }
};

// ==========================================
// HELPER — Activate subscription
// ==========================================
const activateSubscription = async (user_id, plan, gateway, expiresAt) => {
  // Cancel existing active subscriptions
  await pool.query(
    `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
     WHERE user_id = $1 AND status = 'active'`,
    [user_id]
  );

  // Create new subscription
  const sub = await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, started_at, expires_at, payment_gateway)
     VALUES ($1, $2, 'active', NOW(), $3, $4)
     RETURNING *`,
    [user_id, plan, expiresAt, gateway]
  );

  // Send notification
 // Send notification
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, 'info')`,
      [
        user_id,
        '🎉 Subscription Activated!',
        `Your ${plan} plan is now active until ${expiresAt.toLocaleDateString()}. Enjoy full access!`,
      ]
    );
  } catch (e) {
    console.error('Notification error:', e);
  }

  return sub.rows[0];
};

// ==========================================
// GET SUBSCRIPTION STATUS
// ==========================================
const getSubscription = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    res.json({ subscription: result.rows[0] || null });
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==========================================
// GET PAYMENT HISTORY
// ==========================================
const getPaymentHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, amount, currency, gateway, status, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ payments: result.rows });
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==========================================
// ADMIN — All payments
// ==========================================
const getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.amount, p.currency, p.gateway, p.status, p.created_at,
              u.full_name, u.email
       FROM payments p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );

    const totalRevenue = result.rows
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.json({ payments: result.rows, total_revenue: totalRevenue });
  } catch (err) {
    console.error('Get all payments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  initiatePayment,
  esewaSuccess,
  khaltiSuccess,
  getSubscription,
  getPaymentHistory,
  getAllPayments,
};