const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all products for a shop
router.get('/shop/:shopId', optionalAuth, async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 20, category, search } = req.query;

    let whereClause = 'WHERE p.shop_id = $1 AND p.is_active = true';
    let params = [shopId];
    let paramCount = 1;

    if (category) {
      paramCount++;
      whereClause += ` AND c.slug = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const offset = (page - 1) * limit;
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    const result = await query(
      `SELECT p.id, p.name, p.description, p.price, p.compare_price, p.sku, p.inventory,
              p.images, p.is_digital, p.created_at, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      products: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
              s.name as shop_name, s.slug as shop_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN shops s ON p.shop_id = s.id
       WHERE p.id = $1 AND p.is_active = true AND s.is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create product
router.post('/', authenticateToken, [
  body('shopId').isInt(),
  body('name').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }),
  body('comparePrice').optional().isFloat({ min: 0 }),
  body('sku').optional().trim(),
  body('inventory').optional().isInt({ min: 0 }),
  body('categoryId').optional().isInt(),
  body('isDigital').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      shopId, name, description, price, comparePrice, sku, inventory = 0,
      categoryId, isDigital = false
    } = req.body;

    // Check if user owns the shop
    const shopResult = await query(
      'SELECT id FROM shops WHERE id = $1 AND owner_id = $2 AND is_active = true',
      [shopId, req.user.id]
    );

    if (shopResult.rows.length === 0) {
      return res.status(404).json({ message: 'Shop not found or access denied' });
    }

    // Create product
    const result = await query(
      `INSERT INTO products (shop_id, category_id, name, description, price, compare_price, sku, inventory, is_digital)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [shopId, categoryId, name, description, price, comparePrice, sku, inventory, isDigital]
    );

    res.status(201).json({
      message: 'Product created successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, [
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('comparePrice').optional().isFloat({ min: 0 }),
  body('sku').optional().trim(),
  body('inventory').optional().isInt({ min: 0 }),
  body('categoryId').optional().isInt(),
  body('isDigital').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Check if user owns the product's shop
    const productResult = await query(
      `SELECT p.id, s.owner_id FROM products p
       JOIN shops s ON p.shop_id = s.id
       WHERE p.id = $1 AND s.owner_id = $2`,
      [id, req.user.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = ['name', 'description', 'price', 'compare_price', 'sku', 'inventory', 'category_id', 'is_digital'];
    
    for (const [key, value] of Object.entries(updateData)) {
      const dbKey = key === 'categoryId' ? 'category_id' : 
                   key === 'comparePrice' ? 'compare_price' :
                   key === 'isDigital' ? 'is_digital' : key;
      
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updateFields.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await query(
      `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the product's shop
    const productResult = await query(
      `SELECT p.id FROM products p
       JOIN shops s ON p.shop_id = s.id
       WHERE p.id = $1 AND s.owner_id = $2`,
      [id, req.user.id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // Soft delete product
    await query(
      'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories
router.get('/categories/all', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, slug, description FROM categories ORDER BY name'
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
