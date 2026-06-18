/**
 * barcodeRouter.js
 * Endpoint dedicado para búsqueda de productos por código de barras.
 * Se monta en server.js como: app.use('/api/products', barcodeRouter)
 *
 * GET /api/products/barcode/:code
 *   → 200  { id, name, category, price, currentStock, minStock, unit, barcode }
 *   → 400  { error: 'Formato de código inválido. Se requieren al menos 13 dígitos.' }
 *   → 404  { error: 'Producto no encontrado para el código XXXX' }
 *   → 500  { error: <mensaje de BD> }
 */

const express = require('express');
const router  = express.Router();

// Inyección de pool para que los tests puedan pasar un mock
let _pool = null;
function setPool(pool) { _pool = pool; }

/**
 * Valida que el código tenga al menos 13 dígitos numéricos.
 * EAN-13 / UPC-A son los formatos estándar para ferretería.
 */
function isValidBarcodeFormat(code) {
  return typeof code === 'string' && /^\d{13,}$/.test(code.trim());
}

router.get('/barcode/:code', async (req, res) => {
  const { code } = req.params;

  // ── Validación de formato ──
  if (!isValidBarcodeFormat(code)) {
    return res.status(400).json({
      error: 'Formato de código inválido. Se requieren al menos 13 dígitos numéricos.'
    });
  }

  try {
    const [rows] = await _pool.query(
      `SELECT p.idProducto AS id, p.nombre AS name, p.categoria AS category,
              p.precio AS price, p.stock_actual AS currentStock,
              p.stock_minimo AS minStock, p.unidad AS unit,
              p.codigo_barras AS barcode, pr.nombre AS supplierName
       FROM tblproductos p
       LEFT JOIN tblproveedores pr ON p.proveedor_id = pr.idProveedor
       WHERE p.codigo_barras = ? AND p.activo = 1
       LIMIT 1`,
      [code.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: `Producto no encontrado para el código ${code}`
      });
    }

    return res.status(200).json(rows[0]);

  } catch (err) {
    console.error('Error en búsqueda por barcode:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool, isValidBarcodeFormat };
