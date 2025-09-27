const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/create-payment-intent', optionalAuth, async (req, res) => {
  try {
    const { items, shopId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    // Get shop information
    const shopResult = await query(
      'SELECT stripe_account_id FROM shops WHERE id = $1 AND is_active = true',
      [shopId]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const shop = shopResult.rows[0];

    // Calculate total amount
    let totalAmount = 0;
    const lineItems = [];

    for (const item of items) {
      const productResult = await query(
        'SELECT price, name FROM products WHERE id = $1 AND shop_id = $2 AND is_active = true',
        [item.productId, shopId]
      );

      if (productResult.rows.length === 0) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }

      const product = productResult.rows[0];
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
          },
          unit_amount: Math.round(product.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        shopId: shopId.toString(),
        customerId: req.user ? req.user.id.toString() : 'guest',
        items: JSON.stringify(items)
      },
      ...(shop.stripe_account_id && {
        stripeAccount: shop.stripe_account_id
      })
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// Handle successful payment
router.post('/payment-success', async (req, res) => {
  try {
    const { paymentIntentId, customerInfo } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    const { shopId, customerId, items } = paymentIntent.metadata;

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (customer_id, shop_id, stripe_payment_intent_id, status, total_amount, shipping_address, billing_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        customerId !== 'guest' ? customerId : null,
        shopId,
        paymentIntentId,
        'completed',
        paymentIntent.amount / 100,
        JSON.stringify(customerInfo.shipping || {}),
        JSON.stringify(customerInfo.billing || {})
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items
    const parsedItems = JSON.parse(items);
    for (const item of parsedItems) {
      const productResult = await query(
        'SELECT price FROM products WHERE id = $1',
        [item.productId]
      );

      if (productResult.rows.length > 0) {
        await query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [orderId, item.productId, item.quantity, productResult.rows[0].price]
        );

        // Update inventory
        await query(
          'UPDATE products SET inventory = inventory - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
    }

    res.json({
      message: 'Order created successfully',
      orderId
    });
  } catch (error) {
    console.error('Payment success error:', error);
    res.status(500).json({ message: 'Failed to process payment success' });
  }
});

// Webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
