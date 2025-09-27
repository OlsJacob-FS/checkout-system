const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT o.id, o.status, o.total_amount, o.currency, o.created_at,
              s.name as shop_name, s.slug as shop_slug
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       WHERE o.customer_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shop's orders (for shop owners)
router.get('/shop/:shopId', authenticateToken, async (req, res) => {
  try {
    const { shopId } = req.params;

    // Check if user owns the shop
    const shopResult = await query(
      'SELECT id FROM shops WHERE id = $1 AND owner_id = $2',
      [shopId, req.user.id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found or access denied' });
    }

    const result = await query(
      `SELECT o.id, o.status, o.total_amount, o.currency, o.created_at,
              u.first_name, u.last_name, u.email
       FROM orders o
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.shop_id = $1
       ORDER BY o.created_at DESC`,
      [shopId]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Get shop orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order
    const orderResult = await query(
      `SELECT o.*, s.name as shop_name, s.slug as shop_slug,
              u.first_name, u.last_name, u.email
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN users u ON o.customer_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if user has access to this order
    const hasAccess = order.customer_id === req.user.id || 
                     await checkShopOwnership(order.shop_id, req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get order items
    const itemsResult = await query(
      `SELECT oi.quantity, oi.price, p.name, p.sku, p.images
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order: {
        ...order,
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (for shop owners)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get order and check shop ownership
    const orderResult = await query(
      'SELECT shop_id FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const hasAccess = await checkShopOwnership(orderResult.rows[0].shop_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update status
    const result = await query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({
      message: 'Order status updated successfully',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to check shop ownership
async function checkShopOwnership(shopId, userId) {
  const result = await query(
    'SELECT id FROM shops WHERE id = $1 AND owner_id = $2',
    [shopId, userId]
  );
  return result.rows.length > 0;
}

module.exports = router;
