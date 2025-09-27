const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Create shop
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim(),
  body('slug').trim().isLength({ min: 1, max: 200 }).matches(/^[a-z0-9-]+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, slug } = req.body;

    // Check if slug is unique
    const existingShop = await query(
      'SELECT id FROM shops WHERE slug = $1',
      [slug]
    );

    if (existingShop.rows.length > 0) {
      return res.status(400).json({ message: 'Shop slug already exists' });
    }

    // Create shop
    const result = await query(
      `INSERT INTO shops (owner_id, name, description, slug)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, slug, logo_url, banner_url, is_active, created_at`,
      [req.user.id, name, description, slug]
    );

    res.status(201).json({
      message: 'Shop created successfully',
      shop: result.rows[0]
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's shops
router.get('/my-shops', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description, slug, logo_url, banner_url, is_active, created_at
       FROM shops WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ shops: result.rows });
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shop by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await query(
      `SELECT s.id, s.name, s.description, s.slug, s.logo_url, s.banner_url, s.is_active, s.created_at,
              u.first_name, u.last_name
       FROM shops s
       JOIN users u ON s.owner_id = u.id
       WHERE s.slug = $1 AND s.is_active = true`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const shop = result.rows[0];

    // Get products count
    const productsCount = await query(
      'SELECT COUNT(*) as count FROM products WHERE shop_id = $1 AND is_active = true',
      [shop.id]
    );

    res.json({
      shop: {
        ...shop,
        ownerName: `${shop.first_name} ${shop.last_name}`,
        productsCount: parseInt(productsCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update shop
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    // Check if user owns the shop
    const shopResult = await query(
      'SELECT id FROM shops WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found or access denied' });
    }

    // Update shop
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE shops SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Shop updated successfully',
      shop: result.rows[0]
    });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete shop
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the shop
    const shopResult = await query(
      'SELECT id FROM shops WHERE id = $1 AND owner_id = $2',
      [id, req.user.id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found or access denied' });
    }

    // Soft delete shop
    await query(
      'UPDATE shops SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;