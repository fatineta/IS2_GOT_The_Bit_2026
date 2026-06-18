// src/services/api.ts
const API_URL = 'http://localhost:3001/api';

export const api = {
  // ═══════════════════════════════════════════════
  //  AUTH - AUTENTICACIÓN
  // ═══════════════════════════════════════════════
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al iniciar sesión');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  register: async (email: string, nombre: string, password: string, rol?: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre, password, rol })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al registrar');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // ═══════════════════════════════════════════════
  //  1. DASHBOARD
  // ═══════════════════════════════════════════════
  getDashboard: async () => {
    const res = await fetch(`${API_URL}/dashboard`);
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  2. PRODUCTOS
  // ═══════════════════════════════════════════════
  getProducts: async () => {
    const res = await fetch(`${API_URL}/products`);
    return res.json();
  },

  getProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`);
    return res.json();
  },

  createProduct: async (data: any) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateProduct: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  updateStock: async (id: number, data: { cantidad: number; tipo: 'ENTRADA' | 'SALIDA'; motivo?: string }) => {
    const res = await fetch(`${API_URL}/products/${id}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getLowStock: async () => {
    const res = await fetch(`${API_URL}/products/low-stock`);
    return res.json();
  },

  getUrgencyProducts: async () => {
    const res = await fetch(`${API_URL}/products/urgency`);
    return res.json();
  },

  getCriticalProducts: async () => {
    const res = await fetch(`${API_URL}/products/critical`);
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  3. PROVEEDORES
  // ═══════════════════════════════════════════════
  getSuppliers: async () => {
    const res = await fetch(`${API_URL}/suppliers`);
    return res.json();
  },

  getSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`);
    return res.json();
  },

  createSupplier: async (data: any) => {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateSupplier: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteSupplier: async (id: string) => {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  4. MOVIMIENTOS DE STOCK
  // ═══════════════════════════════════════════════
  getMovements: async () => {
    const res = await fetch(`${API_URL}/movements`);
    return res.json();
  },

  createMovement: async (data: any) => {
    const res = await fetch(`${API_URL}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  5. ÓRDENES DE COMPRA
  // ═══════════════════════════════════════════════
  getPurchaseOrders: async () => {
    const res = await fetch(`${API_URL}/purchase-orders`);
    return res.json();
  },

  getPurchaseOrder: async (id: string) => {
    const res = await fetch(`${API_URL}/purchase-orders/${id}`);
    return res.json();
  },

  createPurchaseOrder: async (data: any) => {
    console.log('📦 Enviando orden al backend:', data);
    const res = await fetch(`${API_URL}/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al crear la orden');
    }
    const result = await res.json();
    console.log('✅ Orden creada:', result);
    return result;
  },

  updatePurchaseOrderStatus: async (id: string, estado: string) => {
    const res = await fetch(`${API_URL}/purchase-orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    return res.json();
  },

  sendOrderEmail: async (orderId: string) => {
    console.log(`📧 Enviando email para orden ${orderId}...`);
    const res = await fetch(`${API_URL}/ordenes/${orderId}/enviar-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al enviar email');
    }
    const data = await res.json();
    console.log('📧 Email enviado:', data);
    return data;
  },

  // ═══════════════════════════════════════════════
  //  6. COMPROBANTES (Vouchers)
  // ═══════════════════════════════════════════════
  getVouchers: async () => {
    const res = await fetch(`${API_URL}/vouchers`);
    return res.json();
  },

  createVoucher: async (data: any) => {
    const res = await fetch(`${API_URL}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  7. PAGOS
  // ═══════════════════════════════════════════════
  getPayments: async () => {
    const res = await fetch(`${API_URL}/payments`);
    return res.json();
  },

  createPayment: async (data: any) => {
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  8. CATEGORÍAS
  // ═══════════════════════════════════════════════
  getCategories: async () => {
    const res = await fetch(`${API_URL}/categories`);
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  9. REPORTES
  // ═══════════════════════════════════════════════
  getStockValueReport: async () => {
    const res = await fetch(`${API_URL}/reports/stock-value`);
    return res.json();
  },

  getSupplierBalanceReport: async () => {
    const res = await fetch(`${API_URL}/reports/supplier-balance`);
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  10. USUARIOS
  // ═══════════════════════════════════════════════
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`);
    return res.json();
  },

  // ═══════════════════════════════════════════════
  //  11. LEGACY
  // ═══════════════════════════════════════════════
  getSales: async () => {
    const res = await fetch(`${API_URL}/sales`);
    return res.json();
  },

  createSale: async (data: any) => {
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  confirmarOrden: async (data: any) => {
    const res = await fetch(`${API_URL}/ordenes/confirmar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
