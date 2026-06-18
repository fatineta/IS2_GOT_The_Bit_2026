/**
 * test/barcode.endpoint.test.js
 *
 * Tests para GET /api/products/barcode/:code
 *
 * Casos cubiertos:
 *   BC-01  Código válido EAN-13 existente en BD          → 200 + producto
 *   BC-02  Código válido EAN-13 NO registrado en BD      → 404 + mensaje
 *   BC-03  Código con menos de 13 dígitos                → 400 + mensaje
 *   BC-04  Código con caracteres no numéricos            → 400 + mensaje
 *   BC-05  Código vacío / solo espacios                  → 400 + mensaje
 *   BC-06  Error de base de datos                        → 500 + mensaje
 *   BC-07  Estructura completa del objeto de respuesta   → campos requeridos
 */

const express    = require('express');
const request    = require('supertest');
const { router, setPool, isValidBarcodeFormat } = require('../barcodeRouter');

// ─────────────────────────────────────────────────────────────────────────────
// Setup: app de Express mínima para montar el router
// ─────────────────────────────────────────────────────────────────────────────
function buildApp(mockPool) {
  setPool(mockPool);
  const app = express();
  app.use(express.json());
  app.use('/api/products', router);
  return app;
}

// Producto real de ejemplo (tomado del seed de FERRETERIA_DB.sql)
const PRODUCTO_TORNILLOS = {
  id:           1,
  name:         'Tornillos 6×50mm',
  category:     'Fijaciones',
  price:        0.15,
  currentStock: 5,
  minStock:     20,
  unit:         'u.',
  barcode:      '7790001234560',
  supplierName: 'Ferretería Industrial S.A.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para mock del pool de MySQL
// ─────────────────────────────────────────────────────────────────────────────
const mockPoolFound = {
  query: jest.fn().mockResolvedValue([[PRODUCTO_TORNILLOS]]),
};

const mockPoolNotFound = {
  query: jest.fn().mockResolvedValue([[]]),
};

const mockPoolError = {
  query: jest.fn().mockRejectedValue(new Error('ER_NO_SUCH_TABLE: tblproductos no existe')),
};

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 1: validación de formato (unit — sin red)
// ─────────────────────────────────────────────────────────────────────────────
describe('isValidBarcodeFormat — validación de formato', () => {
  it('acepta EAN-13 (13 dígitos exactos)', () => {
    expect(isValidBarcodeFormat('7790001234560')).toBe(true);
  });

  it('acepta EAN-14 o UPC extendido (14+ dígitos)', () => {
    expect(isValidBarcodeFormat('07790001234560')).toBe(true);
  });

  it('rechaza código con 12 dígitos (UPC-A sin el dígito EAN)', () => {
    expect(isValidBarcodeFormat('779000123456')).toBe(false);
  });

  it('rechaza código con 8 dígitos (EAN-8)', () => {
    expect(isValidBarcodeFormat('77900012')).toBe(false);
  });

  it('rechaza código con letras', () => {
    expect(isValidBarcodeFormat('7790ABC234560')).toBe(false);
  });

  it('rechaza código vacío', () => {
    expect(isValidBarcodeFormat('')).toBe(false);
  });

  it('rechaza código con solo espacios', () => {
    expect(isValidBarcodeFormat('             ')).toBe(false);
  });

  it('rechaza undefined / null', () => {
    expect(isValidBarcodeFormat(undefined)).toBe(false);
    expect(isValidBarcodeFormat(null)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 2: BC-01 — código válido existente → 200
// ─────────────────────────────────────────────────────────────────────────────
describe('BC-01 | GET /api/products/barcode/:code — código válido existente', () => {
  let app;

  beforeEach(() => {
    mockPoolFound.query.mockClear();
    app = buildApp(mockPoolFound);
  });

  it('responde con status 200', async () => {
    await request(app)
      .get('/api/products/barcode/7790001234560')
      .expect(200);
  });

  it('devuelve el producto con los campos esperados', async () => {
    const res = await request(app)
      .get('/api/products/barcode/7790001234560')
      .expect(200);

    expect(res.body).toMatchObject({
      id:           PRODUCTO_TORNILLOS.id,
      name:         PRODUCTO_TORNILLOS.name,
      category:     PRODUCTO_TORNILLOS.category,
      price:        PRODUCTO_TORNILLOS.price,
      currentStock: PRODUCTO_TORNILLOS.currentStock,
      minStock:     PRODUCTO_TORNILLOS.minStock,
      unit:         PRODUCTO_TORNILLOS.unit,
      barcode:      PRODUCTO_TORNILLOS.barcode,
    });
  });

  it('realiza la consulta SQL con el código correcto', async () => {
    await request(app).get('/api/products/barcode/7790001234560');

    expect(mockPoolFound.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mockPoolFound.query.mock.calls[0];
    expect(params[0]).toBe('7790001234560');
    expect(sql).toMatch(/codigo_barras = \?/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 3: BC-02 — código válido NO registrado → 404
// ─────────────────────────────────────────────────────────────────────────────
describe('BC-02 | GET /api/products/barcode/:code — código válido no registrado', () => {
  let app;

  beforeEach(() => {
    mockPoolNotFound.query.mockClear();
    app = buildApp(mockPoolNotFound);
  });

  it('responde con status 404', async () => {
    await request(app)
      .get('/api/products/barcode/9990000000001')
      .expect(404);
  });

  it('devuelve mensaje descriptivo de no encontrado', async () => {
    const res = await request(app)
      .get('/api/products/barcode/9990000000001')
      .expect(404);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/9990000000001/);
    expect(res.body.error).toMatch(/no encontrado/i);
  });

  it('sigue consultando la BD (el formato era válido)', async () => {
    await request(app).get('/api/products/barcode/9990000000001');
    expect(mockPoolNotFound.query).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 4: BC-03 — código con menos de 13 dígitos → 400
// ─────────────────────────────────────────────────────────────────────────────
describe('BC-03 | GET /api/products/barcode/:code — código con menos de 13 dígitos', () => {
  let app;

  beforeEach(() => {
    mockPoolFound.query.mockClear();
    app = buildApp(mockPoolFound);
  });

  const codosCortos = [
    ['12 dígitos',  '779000123456'],
    ['8 dígitos',   '77900012'],
    ['1 dígito',    '7'],
    ['0 dígitos',   ''],
  ];

  codosCortos.forEach(([desc, code]) => {
    it(`rechaza ${desc} con status 400`, async () => {
      const url = code ? `/api/products/barcode/${code}` : '/api/products/barcode/ ';
      const res = await request(app).get(url);
      expect(res.status).toBe(400);
    });
  });

  it('devuelve mensaje de error sobre formato', async () => {
    const res = await request(app)
      .get('/api/products/barcode/123456789012') // 12 dígitos
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/13/);        // menciona los 13 dígitos
    expect(res.body.error).toMatch(/inválido/i);
  });

  it('NO consulta la BD cuando el formato es inválido', async () => {
    await request(app).get('/api/products/barcode/123456789012');
    expect(mockPoolFound.query).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 5: BC-04 — código con caracteres no numéricos → 400
// ─────────────────────────────────────────────────────────────────────────────
describe('BC-04 | GET /api/products/barcode/:code — caracteres no numéricos', () => {
  let app;

  beforeEach(() => {
    mockPoolFound.query.mockClear();
    app = buildApp(mockPoolFound);
  });

  const casosAlfanumericos = [
    ['con letras',          '7790ABC234560'],
    ['con guiones',         '779-000-1234560'],
    ['con espacios internos','779 0001234560'],
    ['con caracteres especiales', '779$001234560!'],
  ];

  casosAlfanumericos.forEach(([desc, code]) => {
    it(`rechaza código ${desc} con 400`, async () => {
      const res = await request(app)
        .get(`/api/products/barcode/${encodeURIComponent(code)}`);
      expect(res.status).toBe(400);
    });
  });

  it('no realiza consulta SQL en ningún caso de formato inválido', async () => {
    await request(app).get('/api/products/barcode/7790ABC234560');
    expect(mockPoolFound.query).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 6: BC-06 — error de base de datos → 500
// ─────────────────────────────────────────────────────────────────────────────
describe('BC-06 | GET /api/products/barcode/:code — error de base de datos', () => {
  let app;

  beforeEach(() => {
    mockPoolError.query.mockClear();
    app = buildApp(mockPoolError);
  });

  it('responde con status 500', async () => {
    await request(app)
      .get('/api/products/barcode/7790001234560')
      .expect(500);
  });

  it('devuelve el mensaje de error de la BD', async () => {
    const res = await request(app)
      .get('/api/products/barcode/7790001234560')
      .expect(500);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/ER_NO_SUCH_TABLE/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 7: BC-07 — contrato de respuesta completa
// ─────────────────────────────────────────────────────────────────────────────
describe('BC-07 | Contrato de respuesta — todos los campos requeridos', () => {
  let app;

  beforeEach(() => {
    app = buildApp(mockPoolFound);
  });

  const camposRequeridos = ['id', 'name', 'category', 'price', 'currentStock', 'minStock', 'unit', 'barcode'];

  camposRequeridos.forEach(campo => {
    it(`la respuesta 200 incluye el campo "${campo}"`, async () => {
      const res = await request(app)
        .get('/api/products/barcode/7790001234560')
        .expect(200);
      expect(res.body).toHaveProperty(campo);
    });
  });
});
