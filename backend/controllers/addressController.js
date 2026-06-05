const db = require('../db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * GET /api/users/addresses
 * Returns all non-deleted saved addresses for the authenticated user.
 */
const getAddresses = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User not found', 404);

    const result = await db.query(`
      SELECT id, label, flat_house, floor, address, area, landmark,
             city, state, pincode, latitude, longitude, is_default,
             created_at, updated_at
      FROM user_location
      WHERE user_id = $1
        AND (is_deleted = false OR is_deleted IS NULL)
      ORDER BY is_default DESC, created_at DESC
    `, [req.internalUserId]);

    return successResponse(res, { addresses: result.rows });
  } catch (error) {
    console.error('[AddressController] getAddresses error:', error.message);
    return errorResponse(res, 'Failed to fetch addresses', 500);
  }
};

/**
 * POST /api/users/addresses
 * Saves a new address. Clears any existing default if is_default = true.
 */
const addAddress = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User not found', 404);

    const {
      latitude, longitude, address, city, state, pincode,
      label, flat_house, floor, area, landmark, is_default
    } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'latitude and longitude are required', 400);
    }

    // Clear other defaults if this is the new default
    if (is_default) {
      await db.query(
        `UPDATE user_location SET is_default = false WHERE user_id = $1`,
        [req.internalUserId]
      );
    }

    const result = await db.query(`
      INSERT INTO user_location (
        user_id, latitude, longitude, address, city, state, pincode,
        label, flat_house, floor, area, landmark, is_default, is_deleted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false)
      RETURNING *
    `, [
      req.internalUserId,
      latitude, longitude,
      address || null,
      city || null,
      state || null,
      pincode || null,
      label || 'other',
      flat_house || null,
      floor || null,
      area || null,
      landmark || null,
      !!is_default,
    ]);

    return successResponse(res, { success: true, address: result.rows[0] }, 201);
  } catch (error) {
    console.error('[AddressController] addAddress error:', error.message);
    return errorResponse(res, 'Failed to save address', 500);
  }
};

/**
 * PUT /api/users/addresses/:id
 * Updates an existing address. Clears other defaults if is_default = true.
 */
const editAddress = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User not found', 404);

    const { id } = req.params;
    const {
      latitude, longitude, address, city, state, pincode,
      label, flat_house, floor, area, landmark, is_default
    } = req.body;

    // Verify ownership
    const own = await db.query(
      `SELECT id FROM user_location WHERE id = $1 AND user_id = $2 AND (is_deleted = false OR is_deleted IS NULL)`,
      [id, req.internalUserId]
    );
    if (own.rows.length === 0) return errorResponse(res, 'Address not found', 404);

    if (is_default) {
      await db.query(
        `UPDATE user_location SET is_default = false WHERE user_id = $1 AND id != $2`,
        [req.internalUserId, id]
      );
    }

    const result = await db.query(`
      UPDATE user_location SET
        latitude    = COALESCE($1, latitude),
        longitude   = COALESCE($2, longitude),
        address     = COALESCE($3, address),
        city        = COALESCE($4, city),
        state       = COALESCE($5, state),
        pincode     = COALESCE($6, pincode),
        label       = COALESCE($7, label),
        flat_house  = COALESCE($8, flat_house),
        floor       = COALESCE($9, floor),
        area        = COALESCE($10, area),
        landmark    = COALESCE($11, landmark),
        is_default  = COALESCE($12, is_default),
        updated_at  = NOW()
      WHERE id = $13 AND user_id = $14
      RETURNING *
    `, [
      latitude ?? null, longitude ?? null,
      address ?? null, city ?? null, state ?? null, pincode ?? null,
      label ?? null, flat_house ?? null, floor ?? null,
      area ?? null, landmark ?? null,
      is_default !== undefined ? is_default : null,
      id, req.internalUserId,
    ]);

    return successResponse(res, { success: true, address: result.rows[0] });
  } catch (error) {
    console.error('[AddressController] editAddress error:', error.message);
    return errorResponse(res, 'Failed to update address', 500);
  }
};

/**
 * DELETE /api/users/addresses/:id
 * Soft-deletes an address.
 */
const deleteAddress = async (req, res) => {
  try {
    if (!req.internalUserId) return errorResponse(res, 'User not found', 404);

    const { id } = req.params;

    await db.query(
      `UPDATE user_location SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, req.internalUserId]
    );

    return successResponse(res, { success: true });
  } catch (error) {
    console.error('[AddressController] deleteAddress error:', error.message);
    return errorResponse(res, 'Failed to delete address', 500);
  }
};

module.exports = {
  getAddresses,
  addAddress,
  editAddress,
  deleteAddress,
};
