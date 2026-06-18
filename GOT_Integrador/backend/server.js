// backend/server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'ferreteria_secret_key_2024';

// ============ CONFIGURACIÓN ============
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ CONEXIÓN A LA BD ============
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Fati2401!',
  database: 'FERRETERIA_DB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ═══════════════════════════════════════════════
//  CONFIGURACIÓN DE EMAIL - GMAIL
// ═══════════════════════════════════════════════
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'fatimaagazzoni@gmail.com',
    pass: 'xnde vijb ahiu xrfy'
  }
};

const transporter = nodemailer.createTransport(emailConfig);

async function sendOrderEmail(orderData, supplierEmail, supplierName) {
  console.log('📧 Preparando email para:', supplierEmail);
  try {
    const itemsHtml = orderData.items.map((item, idx) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${item.productName || 'Producto'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.cantidad}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.precio_unitario.toFixed(2)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.cantidad * item.precio_unitario).toFixed(2)}</td>
      </tr>
    `).join('');
    const total = orderData.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; border-bottom: 2px solid #7B2CBF; padding-bottom: 20px; margin-bottom: 20px;">
            <h1 style="color: #7B2CBF; font-size: 28px; margin: 0;">Orden de Compra</h1>
            <p style="color: #666; font-size: 16px; margin: 8px 0 0 0;">N° ${orderData.numero_orden}</p>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <p style="color: #666; font-size: 12px; margin: 0;">PROVEEDOR</p>
              <p style="font-weight: bold; margin: 4px 0 0 0;">${supplierName}</p>
              <p style="color: #666; margin: 2px 0 0 0; font-size: 14px;">${supplierEmail}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #666; font-size: 12px; margin: 0;">FECHA</p>
              <p style="font-weight: bold; margin: 4px 0 0 0;">${new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #7B2CBF; color: white;">
                <th style="padding: 10px 12px; text-align: left;">#</th>
                <th style="padding: 10px 12px; text-align: left;">Producto</th>
                <th style="padding: 10px 12px; text-align: center;">Cantidad</th>
                <th style="padding: 10px 12px; text-align: right;">Precio Unit.</th>
                <th style="padding: 10px 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">Total Estimado</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #7B2CBF;">$${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px;">
            Este pedido fue generado automáticamente desde el sistema de inventario. Por favor, confirmar disponibilidad.
          </div>
        </div>
      </div>
    `;
    const mailOptions = {
      from: `"Ferretería" <${emailConfig.auth.user}>`,
      to: supplierEmail,
      subject: `📋 Orden de Compra N° ${orderData.numero_orden}`,
      html: html
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado a:', supplierEmail);
    return { success: true, messageId: info.messageId, previewUrl: null };
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════
//  STRATEGY PATTERN - MOTOR DE URGENCIA
// ═══════════════════════════════════════════════

const urgencyStrategies = {
  construccion: (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (ratio < 0.3) return { nivel: 'CRITICO', factor: 1.0 };
    if (ratio < 0.6) return { nivel: 'ALTO', factor: 0.7 };
    if (ratio < 0.8) return { nivel: 'MEDIO', factor: 0.4 };
    return { nivel: 'BAJO', factor: 0.1 };
  },
  herramientas: (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (ratio < 0.2) return { nivel: 'CRITICO', factor: 1.0 };
    if (ratio < 0.5) return { nivel: 'ALTO', factor: 0.8 };
    if (ratio < 0.7) return { nivel: 'MEDIO', factor: 0.5 };
    return { nivel: 'BAJO', factor: 0.2 };
  },
  electricidad: (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (ratio < 0.4) return { nivel: 'CRITICO', factor: 1.0 };
    if (ratio < 0.7) return { nivel: 'ALTO', factor: 0.9 };
    if (ratio < 0.9) return { nivel: 'MEDIO', factor: 0.6 };
    return { nivel: 'BAJO', factor: 0.3 };
  },
  pinturas: (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (ratio < 0.25) return { nivel: 'CRITICO', factor: 1.0 };
    if (ratio < 0.5) return { nivel: 'ALTO', factor: 0.75 };
    if (ratio < 0.75) return { nivel: 'MEDIO', factor: 0.4 };
    return { nivel: 'BAJO', factor: 0.15 };
  },
  adhesivos: (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (ratio < 0.35) return { nivel: 'CRITICO', factor: 1.0 };
    if (ratio < 0.6) return { nivel: 'ALTO', factor: 0.8 };
    if (ratio < 0.85) return { nivel: 'MEDIO', factor: 0.5 };
    return { nivel: 'BAJO', factor: 0.25 };
  },
  default: (stockActual, stockMinimo) => {
    const ratio = stockActual / stockMinimo;
    if (ratio < 0.3) return { nivel: 'CRITICO', factor: 1.0 };
    if (ratio < 0.6) return { nivel: 'ALTO', factor: 0.7 };
    if (ratio < 0.8) return { nivel: 'MEDIO', factor: 0.4 };
    return { nivel: 'BAJO', factor: 0.1 };
  }
};

const categoryStrategyMap = {
  'Materiales de Construcción': 'construccion',
  'Herramientas': 'herramientas',
  'Electricidad': 'electricidad',
  'Pinturas': 'pinturas',
  'Adhesivos': 'adhesivos'
};

function getUrgencyStrategy(category) {
  const strategyKey = categoryStrategyMap[category] || 'default';
  return urgencyStrategies[strategyKey];
}

function calcularUrgencia(producto) {
  const strategy = getUrgencyStrategy(producto.categoria);
  const resultado = strategy(producto.stock_actual, producto.stock_minimo);
  return {
    productoId: producto.idProducto,
    nombre: producto.nombre,
    categoria: producto.categoria,
    stockActual: producto.stock_actual,
    stockMinimo: producto.stock_minimo,
    nivelUrgencia: resultado.nivel,
    factorUrgencia: resultado.factor,
    cantidadRecomendada: Math.round((producto.stock_minimo - producto.stock_actual) * resultado.factor + producto.stock_minimo * 0.5)
  };
}

// ═══════════════════════════════════════════════
//  AUTH - AUTENTICACIÓN JWT
// ═══════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  const { email, nombre, password, rol } = req.body;
  try {
    const [existing] = await pool.query('SELECT idUsuario FROM tblusuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO tblusuarios (email, nombre, password, rol) VALUES (?, ?, ?, ?)',
      [email, nombre, hashedPassword, rol || 'vendedor']
    );
    const token = jwt.sign(
      { id: result.insertId, email, rol: rol || 'vendedor' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: result.insertId, email, nombre, rol: rol || 'vendedor' }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`🔑 Intento de login: ${email}`);
  try {
    const [users] = await pool.query('SELECT * FROM tblusuarios WHERE email = ? AND activo = 1', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign(
      { id: user.idUsuario, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log(`✅ Login exitoso: ${email}`);
    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.idUsuario, email: user.email, nombre: user.nombre, rol: user.rol }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT idUsuario, email, nombre, rol FROM tblusuarios WHERE idUsuario = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ============================================================
//  RUTA RAÍZ
// ============================================================
app.get('/', (req, res) => {
  res.json({ message: '🚀 API FERRETERIA funcionando', status: 'online', database: 'FERRETERIA_DB', version: '2.0.0' });
});

// ============================================================
//  1. DASHBOARD
// ============================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const [totalProducts] = await pool.query('SELECT COUNT(*) as total FROM tblproductos WHERE activo = 1');
    const [totalSuppliers] = await pool.query('SELECT COUNT(*) as total FROM tblproveedores WHERE activo = 1');
    const [totalOrders] = await pool.query('SELECT COUNT(*) as total FROM tblordenes_compra');
    const [lowStock] = await pool.query('SELECT COUNT(*) as total FROM tblproductos WHERE stock_actual <= stock_minimo AND activo = 1');
    const [pendingOrders] = await pool.query("SELECT COUNT(*) as total FROM tblordenes_compra WHERE estado = 'enviada'");
    const [pendingPayments] = await pool.query("SELECT COUNT(*) as total FROM tblcomprobantes WHERE estado = 'pending'");
    const [todayMovements] = await pool.query(`SELECT COUNT(*) as total FROM tblmovimientos_stock WHERE DATE(fecha) = CURDATE()`);
    res.json({
      totalProducts: totalProducts[0].total || 0,
      totalSuppliers: totalSuppliers[0].total || 0,
      totalOrders: totalOrders[0].total || 0,
      lowStock: lowStock[0].total || 0,
      pendingOrders: pendingOrders[0].total || 0,
      pendingPayments: pendingPayments[0].total || 0,
      todayMovements: todayMovements[0].total || 0
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  2. PRODUCTOS
// ============================================================
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.idProducto as id, p.nombre as name, p.categoria as category, p.precio as price,
        p.stock_actual as currentStock, p.stock_minimo as minStock, p.unidad as unit,
        p.codigo_barras as barcode, p.imagen_url as imageUrl, p.proveedor_id as supplierId,
        p.activo, p.creado_en, p.actualizado_en, pr.nombre as supplierName
      FROM tblproductos p
      LEFT JOIN tblproveedores pr ON p.proveedor_id = pr.idProveedor
      WHERE p.activo = 1
      ORDER BY p.nombre
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/low-stock', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.idProducto as id, p.nombre as name, p.categoria as category,
        p.stock_actual as currentStock, p.stock_minimo as minStock, p.unidad as unit,
        p.precio as price, pr.nombre as supplierName
      FROM tblproductos p
      LEFT JOIN tblproveedores pr ON p.proveedor_id = pr.idProveedor
      WHERE p.stock_actual <= p.stock_minimo AND p.activo = 1
      ORDER BY p.stock_actual ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos bajo stock:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/urgency', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT idProducto, nombre, categoria, stock_actual, stock_minimo FROM tblproductos WHERE activo = 1`);
    const productosConUrgencia = rows.map(producto => calcularUrgencia(producto));
    const ordenUrgencia = { 'CRITICO': 0, 'ALTO': 1, 'MEDIO': 2, 'BAJO': 3 };
    productosConUrgencia.sort((a, b) => ordenUrgencia[a.nivelUrgencia] - ordenUrgencia[b.nivelUrgencia]);
    res.json({
      total: productosConUrgencia.length,
      productos: productosConUrgencia,
      resumen: {
        critico: productosConUrgencia.filter(p => p.nivelUrgencia === 'CRITICO').length,
        alto: productosConUrgencia.filter(p => p.nivelUrgencia === 'ALTO').length,
        medio: productosConUrgencia.filter(p => p.nivelUrgencia === 'MEDIO').length,
        bajo: productosConUrgencia.filter(p => p.nivelUrgencia === 'BAJO').length
      }
    });
  } catch (error) {
    console.error('Error al calcular urgencia:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/critical', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT idProducto, nombre, categoria, stock_actual, stock_minimo FROM tblproductos WHERE activo = 1 AND stock_actual <= stock_minimo * 0.3`);
    res.json(rows.map(producto => calcularUrgencia(producto)));
  } catch (error) {
    console.error('Error al obtener productos críticos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { name, category, price, currentStock, minStock, unit, barcode, imageUrl, supplierId } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO tblproductos (nombre, categoria, precio, stock_actual, stock_minimo, unidad, codigo_barras, imagen_url, proveedor_id, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, category, price, currentStock || 0, minStock || 5, unit || 'u.', barcode, imageUrl, supplierId]
    );
    res.json({ id: String(result.insertId), message: 'Producto creado exitosamente' });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, currentStock, minStock, unit, barcode, imageUrl, supplierId } = req.body;
  try {
    await pool.query(
      `UPDATE tblproductos SET nombre=?, categoria=?, precio=?, stock_actual=?, stock_minimo=?, unidad=?, codigo_barras=?, imagen_url=?, proveedor_id=? WHERE idProducto=?`,
      [name, category, price, currentStock, minStock, unit, barcode, imageUrl, supplierId, id]
    );
    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE tblproductos SET activo = 0 WHERE idProducto = ?', [id]);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { cantidad, tipo, motivo } = req.body;
  try {
    const [product] = await pool.query('SELECT stock_actual FROM tblproductos WHERE idProducto = ?', [id]);
    if (product.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const stockActual = product[0].stock_actual;
    let nuevoStock = stockActual;
    let tipoMovimiento = 'AJUSTE';
    if (tipo === 'ENTRADA') { nuevoStock = stockActual + cantidad; tipoMovimiento = 'ENTRADA'; }
    else if (tipo === 'SALIDA') {
      if (stockActual < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
      nuevoStock = stockActual - cantidad; tipoMovimiento = 'SALIDA';
    }
    await pool.query('UPDATE tblproductos SET stock_actual = ? WHERE idProducto = ?', [nuevoStock, id]);
    await pool.query(
      `INSERT INTO tblmovimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) 
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, tipoMovimiento, cantidad, stockActual, nuevoStock, motivo || 'Movimiento manual']
    );
    res.json({ message: 'Stock actualizado', stock_anterior: stockActual, stock_nuevo: nuevoStock });
  } catch (error) {
    console.error('Error al actualizar stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  3. PROVEEDORES
// ============================================================
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT idProveedor as id, nombre, razon_social as razonSocial, ruc, email, telefono,
        direccion, direccion_fiscal as direccionFiscal, banco, bank_name as bankName,
        tipo_cuenta as tipoCuenta, numero_cuenta as numeroCuenta,
        cbu, cvu, alias, titular_cuenta as titularCuenta, cuit_titular as cuitTitular, activo, creado_en
      FROM tblproveedores WHERE activo = 1 ORDER BY nombre
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  const { nombre, razonSocial, ruc, email, telefono, direccion, direccionFiscal, banco, bankName, tipoCuenta, numeroCuenta, cbu, cvu, alias, titularCuenta, cuitTitular } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO tblproveedores (nombre, razon_social, ruc, email, telefono, direccion, direccion_fiscal,
        banco, bank_name, tipo_cuenta, numero_cuenta, cbu, cvu, alias, titular_cuenta, cuit_titular, activo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [nombre, razonSocial, ruc, email, telefono, direccion, direccionFiscal, banco, bankName, tipoCuenta, numeroCuenta, cbu, cvu, alias, titularCuenta, cuitTitular]
    );
    res.json({ id: String(result.insertId), message: 'Proveedor creado exitosamente' });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, razonSocial, ruc, email, telefono, direccion, direccionFiscal, banco, bankName, tipoCuenta, numeroCuenta, cbu, cvu, alias, titularCuenta, cuitTitular } = req.body;
  try {
    await pool.query(
      `UPDATE tblproveedores SET nombre=?, razon_social=?, ruc=?, email=?, telefono=?, direccion=?, direccion_fiscal=?,
        banco=?, bank_name=?, tipo_cuenta=?, numero_cuenta=?, cbu=?, cvu=?, alias=?,
        titular_cuenta=?, cuit_titular=? WHERE idProveedor=?`,
      [nombre, razonSocial, ruc, email, telefono, direccion, direccionFiscal, banco, bankName, tipoCuenta, numeroCuenta, cbu, cvu, alias, titularCuenta, cuitTitular, id]
    );
    res.json({ message: 'Proveedor actualizado' });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE tblproveedores SET activo = 0 WHERE idProveedor = ?', [id]);
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  4. MOVIMIENTOS DE STOCK
// ============================================================
app.get('/api/movements', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.idMovimiento as id, m.producto_id as productId, m.tipo as type, m.cantidad as quantity,
        m.fecha as date, m.motivo as reason, m.stock_anterior, m.stock_nuevo, p.nombre as productName
      FROM tblmovimientos_stock m
      LEFT JOIN tblproductos p ON m.producto_id = p.idProducto
      ORDER BY m.fecha DESC LIMIT 50
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/movements', async (req, res) => {
  const { productId, type, quantity, date, reason } = req.body;
  try {
    const [product] = await pool.query('SELECT stock_actual FROM tblproductos WHERE idProducto = ?', [productId]);
    if (product.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const stockActual = product[0].stock_actual;
    let nuevoStock = stockActual;
    let tipoMovimiento = type.toUpperCase();
    if (type === 'entrada') nuevoStock = stockActual + quantity;
    else if (type === 'salida') {
      if (stockActual < quantity) return res.status(400).json({ error: 'Stock insuficiente' });
      nuevoStock = stockActual - quantity;
    }
    await pool.query('UPDATE tblproductos SET stock_actual = ? WHERE idProducto = ?', [nuevoStock, productId]);
    const [result] = await pool.query(
      `INSERT INTO tblmovimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, fecha, usuario_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [productId, tipoMovimiento, quantity, stockActual, nuevoStock, reason, date || new Date()]
    );
    res.json({ id: String(result.insertId), message: 'Movimiento registrado' });
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  5. ÓRDENES DE COMPRA
// ============================================================
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.idOrden as id, o.numero_orden as orderNumber, o.proveedor_id as supplierId,
        p.nombre as supplierName, o.metodo_pago as paymentMethod, o.cuotas as installments,
        o.tipo_cambio as exchangeRate, o.total_estimado as total, o.estado as status,
        o.notas as notes, o.fecha_creacion as date
      FROM tblordenes_compra o
      LEFT JOIN tblproveedores p ON o.proveedor_id = p.idProveedor
      ORDER BY o.fecha_creacion DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/purchase-orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [order] = await pool.query(`
      SELECT o.idOrden as id, o.numero_orden as orderNumber, o.proveedor_id as supplierId,
        p.nombre as supplierName, o.metodo_pago as paymentMethod, o.cuotas as installments,
        o.tipo_cambio as exchangeRate, o.total_estimado as total, o.estado as status,
        o.notas as notes, o.fecha_creacion as date
      FROM tblordenes_compra o
      LEFT JOIN tblproveedores p ON o.proveedor_id = p.idProveedor
      WHERE o.idOrden = ?
    `, [id]);
    const [details] = await pool.query(`
      SELECT d.idDetalle, d.producto_id as productId, pr.nombre as productName,
        d.cantidad_pedida as quantity, d.precio_unitario as estimatedPrice, d.subtotal
      FROM tbldetalle_orden d
      LEFT JOIN tblproductos pr ON d.producto_id = pr.idProducto
      WHERE d.orden_id = ?
    `, [id]);
    res.json({ ...order[0], items: details });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/purchase-orders', async (req, res) => {
  console.log('📦 POST /api/purchase-orders recibido');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  const { proveedor_id, metodo_pago, cuotas, tipo_cambio, total_estimado, notas, productos } = req.body;
  if (!proveedor_id) {
    return res.status(400).json({ error: 'proveedor_id es requerido' });
  }
  if (!productos || productos.length === 0) {
    return res.status(400).json({ error: 'productos es requerido' });
  }
  try {
    const [lastOrder] = await pool.query('SELECT MAX(CAST(SUBSTRING(numero_orden, 4) AS UNSIGNED)) as max FROM tblordenes_compra');
    const nextNumber = (lastOrder[0].max || 0) + 1;
    const numero_orden = `OC-${String(nextNumber).padStart(4, '0')}`;
    console.log(`📦 Número de orden generado: ${numero_orden}`);
    const [result] = await pool.query(
      `INSERT INTO tblordenes_compra (numero_orden, proveedor_id, metodo_pago, cuotas, tipo_cambio, total_estimado, estado, notas) 
      VALUES (?, ?, ?, ?, ?, ?, 'enviada', ?)`,
      [numero_orden, proveedor_id, metodo_pago || 'efectivo', cuotas || 1, tipo_cambio || 1, total_estimado || 0, notas || null]
    );
    const ordenId = result.insertId;
    console.log(`📦 Orden insertada con ID: ${ordenId}`);
    if (productos && productos.length > 0) {
      for (const item of productos) {
        await pool.query(
          `INSERT INTO tbldetalle_orden (orden_id, producto_id, cantidad_pedida, precio_unitario, subtotal) 
          VALUES (?, ?, ?, ?, ?)`,
          [ordenId, item.producto_id, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]
        );
        console.log(`📦 Detalle insertado: producto ${item.producto_id}, cantidad ${item.cantidad}`);
      }
    }
    console.log(`✅ Orden ${numero_orden} creada exitosamente`);
    res.status(201).json({ id: String(ordenId), numero_orden: numero_orden, message: 'Orden creada exitosamente' });
  } catch (error) {
    console.error('❌ Error al crear orden:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/purchase-orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    await pool.query('UPDATE tblordenes_compra SET estado = ? WHERE idOrden = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ordenes/:id/enviar-email', async (req, res) => {
  const { id } = req.params;
  try {
    const [order] = await pool.query(`
      SELECT o.*, p.nombre as proveedor_nombre, p.email as proveedor_email
      FROM tblordenes_compra o
      LEFT JOIN tblproveedores p ON o.proveedor_id = p.idProveedor
      WHERE o.idOrden = ?
    `, [id]);
    if (order.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    const orderData = order[0];
    const [details] = await pool.query(`
      SELECT d.*, pr.nombre as productName
      FROM tbldetalle_orden d
      LEFT JOIN tblproductos pr ON d.producto_id = pr.idProducto
      WHERE d.orden_id = ?
    `, [id]);
    if (!orderData.proveedor_email) {
      return res.status(400).json({ error: 'El proveedor no tiene email registrado' });
    }
    const emailResult = await sendOrderEmail(
      {
        numero_orden: orderData.numero_orden,
        items: details.map(d => ({ productName: d.productName || 'Producto', cantidad: d.cantidad_pedida, precio_unitario: d.precio_unitario }))
      },
      orderData.proveedor_email,
      orderData.proveedor_nombre
    );
    res.json({ success: true, message: `Email enviado a ${orderData.proveedor_email}`, previewUrl: emailResult.previewUrl, messageId: emailResult.messageId });
  } catch (error) {
    console.error('Error al enviar email:', error);
    res.status(500).json({ error: error.message, message: 'Error al enviar el email' });
  }
});

// ============================================================
//  6. COMPROBANTES (Vouchers)
// ============================================================
app.get('/api/vouchers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.idComprobante as id, c.tipo as type, c.numero as number, c.numero_interno as internalNumber,
        c.proveedor_id as supplierId, p.nombre as supplierName, c.orden_id as purchaseOrderId,
        c.fecha_emision as issueDate, c.fecha_venc as dueDate, c.iva_monto as ivaAmount,
        c.total, c.estado as status, c.adjunto_url as attachmentUrl, c.adjunto_nombre as attachmentName, c.creado_en
      FROM tblcomprobantes c
      LEFT JOIN tblproveedores p ON c.proveedor_id = p.idProveedor
      ORDER BY c.creado_en DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener comprobantes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  const { type, number, supplierId, purchaseOrderId, issueDate, dueDate, ivaAmount, total, status, attachmentUrl, attachmentName, items } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO tblcomprobantes (tipo, numero, proveedor_id, orden_id, fecha_emision, fecha_venc, iva_monto, total, estado, adjunto_url, adjunto_nombre) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [type, number, supplierId, purchaseOrderId, issueDate, dueDate, ivaAmount || 0, total, status || 'pending', attachmentUrl, attachmentName]
    );
    const comprobanteId = result.insertId;
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO tbldetalle_comprobante (comprobante_id, producto_id, descripcion, cantidad, precio_unitario, iva_porcentaje) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [comprobanteId, item.productId, item.description, item.quantity, item.unitPrice, item.ivaPercent || 21]
        );
      }
    }
    res.json({ id: String(comprobanteId), message: 'Comprobante creado exitosamente' });
  } catch (error) {
    console.error('Error al crear comprobante:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  7. PAGOS
// ============================================================
app.get('/api/payments', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pg.idPago as id, pg.comprobante_id as voucherId, pg.proveedor_id as supplierId,
        p.nombre as supplierName, pg.orden_id as purchaseOrderId, pg.monto as amount,
        pg.fecha_pago as paymentDate, pg.metodo as method, pg.banco_origen as bankOrigin,
        pg.numero_transfer as transferNumber, pg.referencia as reference,
        pg.adjunto_url as attachmentUrl, pg.adjunto_nombre as attachmentName,
        c.numero as voucherNumber, o.numero_orden as orderNumber
      FROM tblpagos pg
      LEFT JOIN tblproveedores p ON pg.proveedor_id = p.idProveedor
      LEFT JOIN tblcomprobantes c ON pg.comprobante_id = c.idComprobante
      LEFT JOIN tblordenes_compra o ON pg.orden_id = o.idOrden
      ORDER BY pg.creado_en DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  const { voucherId, supplierId, purchaseOrderId, amount, paymentDate, method, bankOrigin, transferNumber, reference, attachmentUrl, attachmentName } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO tblpagos (comprobante_id, proveedor_id, orden_id, monto, fecha_pago, metodo, banco_origen, numero_transfer, referencia, adjunto_url, adjunto_nombre) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [voucherId, supplierId, purchaseOrderId, amount, paymentDate, method, bankOrigin, transferNumber, reference, attachmentUrl, attachmentName]
    );
    if (voucherId) {
      await pool.query('UPDATE tblcomprobantes SET estado = "paid" WHERE idComprobante = ?', [voucherId]);
    }
    res.json({ id: String(result.insertId), message: 'Pago registrado exitosamente' });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  8. CATEGORÍAS
// ============================================================
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT idCategoria as id, nombre as name FROM tblcategorias ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  9. REPORTES
// ============================================================
app.get('/api/reports/stock-value', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.categoria as category, SUM(p.stock_actual * p.precio) as value, COUNT(*) as count
      FROM tblproductos p WHERE p.activo = 1 GROUP BY p.categoria
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener valor de stock:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/supplier-balance', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.idProveedor as id, p.nombre,
        COALESCE(SUM(c.total), 0) as totalPurchases,
        COALESCE(SUM(pg.monto), 0) as totalPaid,
        COALESCE(SUM(c.total) - SUM(pg.monto), 0) as pending
      FROM tblproveedores p
      LEFT JOIN tblcomprobantes c ON p.idProveedor = c.proveedor_id AND c.estado != 'cancelled'
      LEFT JOIN tblpagos pg ON p.idProveedor = pg.proveedor_id
      WHERE p.activo = 1
      GROUP BY p.idProveedor
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener balance de proveedores:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
//  MANEJO DE ERRORES 404
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', message: `La ruta ${req.method} ${req.url} no existe` });
});

// ============================================================
//  INICIAR SERVIDOR
// ============================================================
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor FERRETERIA corriendo en http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponibles:\n`);
  console.log(`   POST /api/auth/login          → Login`);
  console.log(`   POST /api/auth/register       → Registro`);
  console.log(`   GET  /api/auth/profile        → Perfil (protegido)`);
  console.log(`   GET  /                        → Bienvenida`);
  console.log(`   GET  /api/dashboard           → Estadísticas`);
  console.log(`   GET  /api/products            → Listar productos`);
  console.log(`   POST /api/products            → Crear producto`);
  console.log(`   PUT  /api/products/:id        → Actualizar producto`);
  console.log(`   DELETE /api/products/:id      → Eliminar producto`);
  console.log(`   GET  /api/products/low-stock  → Productos bajo stock`);
  console.log(`   GET  /api/products/urgency    → Motor de Urgencia`);
  console.log(`   GET  /api/products/critical   → Productos críticos`);
  console.log(`   PUT  /api/products/:id/stock  → Actualizar stock`);
  console.log(`   GET  /api/suppliers           → Listar proveedores`);
  console.log(`   POST /api/suppliers           → Crear proveedor`);
  console.log(`   PUT  /api/suppliers/:id       → Actualizar proveedor`);
  console.log(`   DELETE /api/suppliers/:id     → Eliminar proveedor`);
  console.log(`   GET  /api/movements           → Listar movimientos`);
  console.log(`   POST /api/movements           → Crear movimiento`);
  console.log(`   GET  /api/purchase-orders     → Listar órdenes`);
  console.log(`   POST /api/purchase-orders     → Crear orden`);
  console.log(`   GET  /api/purchase-orders/:id → Detalle de orden`);
  console.log(`   GET  /api/vouchers            → Listar comprobantes`);
  console.log(`   POST /api/vouchers            → Crear comprobante`);
  console.log(`   GET  /api/payments            → Listar pagos`);
  console.log(`   POST /api/payments            → Registrar pago`);
  console.log(`   GET  /api/categories          → Listar categorías`);
  console.log(`   GET  /api/reports/stock-value → Valor de stock por categoría`);
  console.log(`   GET  /api/reports/supplier-balance → Balance de proveedores`);
  console.log(`   POST /api/ordenes/:id/enviar-email → Enviar email de orden\n`);
});
