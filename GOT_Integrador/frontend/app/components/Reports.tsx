// src/app/components/Reports.tsx
import { useState, useEffect, Fragment } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Product } from '../App';
import { Supplier } from './SupplierList';
import { Voucher } from './Vouchers';
import { Payment } from './Payments';
import { api } from '../../services/api';

interface ReportsProps {
  products: Product[];
  suppliers: Supplier[];
  vouchers: Voucher[];
  payments: Payment[];
}

const CHART_COLORS = ['#C77DFF', '#9D4EDD', '#DA70D6', '#B794F4', '#E0BBE4'];

export default function Reports({
  products: initialProducts,
  suppliers: initialSuppliers,
  vouchers: initialVouchers,
  payments: initialPayments,
}: ReportsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  
  const [activeTab, setActiveTab] = useState<'expenses' | 'stock' | 'suppliers' | 'liquidity'>('expenses');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedSuppliers, setExpandedSuppliers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── DATOS REALES DEL BACKEND ──
  const [stockValueData, setStockValueData] = useState<Array<{ category: string; value: number; count: number }>>([]);
  const [supplierBalanceData, setSupplierBalanceData] = useState<Array<{ id: string; nombre: string; totalPurchases: number; totalPaid: number; pending: number }>>([]);

  // ── CARGAR DATOS ──
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar datos en paralelo
      const [productsData, suppliersData, vouchersData, paymentsData, stockValue, supplierBalance] = await Promise.all([
        api.getProducts(),
        api.getSuppliers(),
        api.getVouchers(),
        api.getPayments(),
        api.getStockValueReport(),
        api.getSupplierBalanceReport()
      ]);

      // Mapear productos
      const mappedProducts = productsData.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        price: p.price,
        currentStock: p.currentStock,
        minStock: p.minStock,
        unit: p.unit || 'u.',
        barcode: p.barcode,
        imageUrl: p.imageUrl,
        supplierId: p.supplierId ? String(p.supplierId) : undefined
      }));

      // Mapear proveedores
      const mappedSuppliers = suppliersData.map((s: any) => ({
        id: String(s.id),
        nombre: s.nombre,
        email: s.email,
        telefono: s.telefono,
        direccion: s.direccion,
        ruc: s.ruc,
        razonSocial: s.razonSocial || s.razon_social,
        direccionFiscal: s.direccionFiscal || s.direccion_fiscal,
        banco: s.banco,
        tipoCuenta: s.tipoCuenta || 'Corriente',
        numeroCuenta: s.numeroCuenta || s.numero_cuenta || '',
        cbu: s.cbu,
        cvu: s.cvu,
        alias: s.alias,
        bankName: s.bankName || s.bank_name,
        titularCuenta: s.titularCuenta || s.titular_cuenta,
        cuitTitular: s.cuitTitular || s.cuit_titular
      }));

      // Mapear comprobantes
      const mappedVouchers = vouchersData.map((v: any) => ({
        id: String(v.id),
        type: v.type || 'invoice-a',
        number: v.number,
        supplierId: String(v.supplierId),
        issueDate: v.issueDate,
        dueDate: v.dueDate,
        items: v.items || [],
        ivaAmount: v.ivaAmount || 0,
        status: v.status || 'pending',
        purchaseOrderId: v.purchaseOrderId ? String(v.purchaseOrderId) : undefined,
        attachmentUrl: v.attachmentUrl,
        attachmentName: v.attachmentName
      }));

      // Mapear pagos
      const mappedPayments = paymentsData.map((p: any) => ({
        id: String(p.id),
        voucherId: p.voucherId ? String(p.voucherId) : '',
        supplierId: String(p.supplierId),
        supplierName: p.supplierName,
        purchaseOrderId: p.purchaseOrderId ? String(p.purchaseOrderId) : undefined,
        amount: p.amount,
        paymentDate: p.paymentDate,
        bankOrigin: p.bankOrigin || '',
        transferNumber: p.transferNumber || '',
        reference: p.reference || '',
        method: p.method || 'transfer',
        attachmentUrl: p.attachmentUrl,
        attachmentName: p.attachmentName,
        voucherNumber: p.voucherNumber,
        orderNumber: p.orderNumber
      }));

      setProducts(mappedProducts);
      setSuppliers(mappedSuppliers);
      setVouchers(mappedVouchers);
      setPayments(mappedPayments);
      setStockValueData(stockValue || []);
      setSupplierBalanceData(supplierBalance || []);

    } catch (error) {
      console.error('Error al cargar datos para reportes:', error);
      setError('Error al cargar los datos. Usando datos locales.');
      // Fallback: usar datos de props
      setProducts(initialProducts);
      setSuppliers(initialSuppliers);
      setVouchers(initialVouchers);
      setPayments(initialPayments);
      // Generar datos de stock desde productos
      const stockByCategory = initialProducts.reduce((acc, product) => {
        const value = product.currentStock * product.price;
        acc[product.category] = (acc[product.category] || 0) + value;
        return acc;
      }, {} as Record<string, number>);
      setStockValueData(Object.entries(stockByCategory).map(([category, value]) => ({
        category,
        value: Math.round(value),
        count: initialProducts.filter(p => p.category === category).length
      })));
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  // ── CALCULAR DATOS PARA EGRESOS ──
  // Agrupar comprobantes por mes y categoría
  const getExpensesData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const categories = ['Fijaciones', 'Pinturas', 'Herramientas', 'Electricidad', 'Adhesivos'];
    
    // Inicializar datos por mes
    const data = months.map(month => {
      const row: any = { month };
      categories.forEach(cat => { row[cat] = 0; });
      return row;
    });

    // Procesar comprobantes
    vouchers.forEach(v => {
      const date = new Date(v.issueDate);
      const month = date.getMonth();
      if (date.getFullYear() === selectedYear) {
        v.items.forEach(item => {
          // Buscar la categoría del producto
          const product = products.find(p => p.id === item.productId);
          const category = product?.category || 'Otros';
          // Buscar categoría en la lista o usar 'Otros'
          const catKey = categories.includes(category) ? category : 'Otros';
          // Si no existe la columna 'Otros', agregarla
          if (!data[month][catKey] && catKey === 'Otros') {
            // Asegurar que la columna existe
            if (!data[month].hasOwnProperty(catKey)) {
              data[month][catKey] = 0;
            }
          }
          const total = item.quantity * item.unitPrice;
          data[month][catKey] = (data[month][catKey] || 0) + total;
        });
      }
    });

    return data;
  };

  const expensesData = getExpensesData();
  const totalExpenses = expensesData.reduce((sum, month) => {
    let total = 0;
    Object.keys(month).forEach(key => {
      if (key !== 'month') total += month[key] || 0;
    });
    return sum + total;
  }, 0);

  // ── CALCULAR DATOS PARA LIQUIDEZ ──
  const getLiquidityData = () => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Inicializar datos
    const data = months.map(month => ({
      month,
      ingresos: 0,
      egresos: 0
    }));

    // Procesar pagos (ingresos - en realidad son egresos para la ferretería, pero los mostramos como salida)
    payments.forEach(p => {
      const date = new Date(p.paymentDate);
      const month = date.getMonth();
      if (date.getFullYear() === selectedYear) {
        data[month].egresos += p.amount;
      }
    });

    // Procesar comprobantes como egresos adicionales
    vouchers.forEach(v => {
      const date = new Date(v.issueDate);
      const month = date.getMonth();
      if (date.getFullYear() === selectedYear) {
        const total = v.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        data[month].egresos += total;
      }
    });

    // Calcular ingresos estimados (ventas - como no tenemos ventas, usamos un cálculo aproximado)
    // En una implementación real, esto vendría de una tabla de ventas
    data.forEach(d => {
      // Estimación: ingresos = egresos * 1.3 (30% de margen)
      d.ingresos = Math.round(d.egresos * 1.3);
    });

    return data;
  };

  const liquidityData = getLiquidityData();
  const totalIncome = liquidityData.reduce((sum, m) => sum + m.ingresos, 0);
  const totalExpensesLiq = liquidityData.reduce((sum, m) => sum + m.egresos, 0);
  const totalProfit = totalIncome - totalExpensesLiq;
  const avgMonthlyProfit = totalProfit / 12;

  // ── CALCULAR VALOR DE STOCK ──
  const calculateStockValue = (product: Product) => product.currentStock * product.price;
  const totalStockValue = products.reduce((sum, p) => sum + calculateStockValue(p), 0);

  const stockByCategory = products.reduce((acc, product) => {
    const value = calculateStockValue(product);
    acc[product.category] = (acc[product.category] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const stockPieData = Object.entries(stockByCategory).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // ── OBTENER SALDO DE PROVEEDORES ──
  const getSupplierBalance = (supplierId: string) => {
    const supplierVouchers = vouchers.filter(v => v.supplierId === supplierId);
    const totalPurchases = supplierVouchers.reduce((sum, v) => {
      return sum + v.items.reduce((itemSum, item) => itemSum + (item.quantity * item.unitPrice), 0);
    }, 0);

    const supplierPayments = payments.filter(p => p.supplierId === supplierId);
    const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPurchases,
      totalPaid,
      pending: totalPurchases - totalPaid,
      vouchers: supplierVouchers,
    };
  };

  const supplierBalances = suppliers.map(supplier => ({
    supplier,
    ...getSupplierBalance(supplier.id),
  }));

  const toggleSupplier = (supplierId: string) => {
    setExpandedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-700 dark:text-yellow-300">{error}</p>
          <button 
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Reintentar
          </button>
        </div>
        {/* Mostrar datos parciales */}
        <div className="text-muted-foreground text-sm">Mostrando datos disponibles...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Reportes</h2>
          <p className="text-muted-foreground">Análisis y reportes del negocio</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition text-sm"
          disabled={loading}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Egresos
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'stock'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Stock
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Proveedores
        </button>
        <button
          onClick={() => setActiveTab('liquidity')}
          className={`px-4 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'liquidity'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Liquidez
        </button>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total egresos del período</div>
                <div className="text-3xl font-semibold">${totalExpenses.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">Basado en {vouchers.length} comprobantes</span>
              </div>
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Año:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Egresos mensuales por categoría</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expensesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {Object.keys(expensesData[0] || {}).filter(key => key !== 'month').map((category, index) => (
                  <Bar key={category} dataKey={category} stackId="a" fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Categoría</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Total egresos</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">% del total</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(expensesData[0] || {})
                  .filter(key => key !== 'month')
                  .map(category => {
                    const total = expensesData.reduce((sum, month) => sum + (month[category] || 0), 0);
                    const count = expensesData.filter(month => (month[category] || 0) > 0).length;
                    return (
                      <tr key={category} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{category}</td>
                        <td className="px-4 py-3">${total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {totalExpenses > 0 ? ((total / totalExpenses) * 100).toFixed(1) : 0}%
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{count} meses</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="text-sm text-muted-foreground mb-1">Valor total del inventario</div>
            <div className="text-3xl font-semibold">${totalStockValue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Basado en {products.length} productos
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Distribución del valor del stock por categoría</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Products Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="border-b border-border bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Producto</th>
                    <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Categoría</th>
                    <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Stock actual</th>
                    <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Stock mínimo</th>
                    <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Precio</th>
                    <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Valor total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => {
                    const isBelowMin = product.currentStock < product.minStock;
                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-border last:border-0 ${
                          isBelowMin ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                        <td className={`px-4 py-3 ${isBelowMin ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                          {product.currentStock} {product.unit}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {product.minStock} {product.unit}
                        </td>
                        <td className="px-4 py-3">${product.price.toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold">
                          ${calculateStockValue(product).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium w-10"></th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Total compras</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Total pagado</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Saldo pendiente</th>
                </tr>
              </thead>
              <tbody>
                {supplierBalances.map(({ supplier, totalPurchases, totalPaid, pending, vouchers: supplierVouchers }) => (
                  <Fragment key={supplier.id}>
                    <tr
                      onClick={() => toggleSupplier(supplier.id)}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        {expandedSuppliers.includes(supplier.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{supplier.nombre}</td>
                      <td className="px-4 py-3">${totalPurchases.toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400">
                        ${totalPaid.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${pending > 10000 ? 'text-red-600 dark:text-red-400' : ''}`}>
                            ${pending.toLocaleString()}
                          </span>
                          {pending > 10000 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs">
                              Alerta
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedSuppliers.includes(supplier.id) && supplierVouchers.length > 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-muted/20">
                          <div className="ml-8 space-y-2">
                            <div className="text-sm font-medium mb-2">Comprobantes vinculados:</div>
                            {supplierVouchers.map(voucher => {
                              const voucherTotal = voucher.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                              return (
                                <div key={voucher.id} className="flex items-center justify-between text-sm bg-card border border-border rounded px-3 py-2">
                                  <span className="font-mono">{voucher.number}</span>
                                  <span className="text-muted-foreground">
                                    {new Date(voucher.issueDate).toLocaleDateString('es-ES')}
                                  </span>
                                  <span className="font-medium">${voucherTotal.toLocaleString()}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    voucher.status === 'paid'
                                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                                  }`}>
                                    {voucher.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liquidity Tab */}
      {activeTab === 'liquidity' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Total ingresos</div>
              <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                ${totalIncome.toLocaleString()}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Total egresos</div>
              <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
                ${totalExpensesLiq.toLocaleString()}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Ganancia estimada</div>
              <div className="text-2xl font-semibold text-primary">
                ${totalProfit.toLocaleString()}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Promedio mensual</div>
              <div className="text-2xl font-semibold">
                ${avgMonthlyProfit.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Ingresos vs Egresos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={liquidityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} name="Ingresos" />
                <Line type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} name="Egresos" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Mes</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Ingresos</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Egresos</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Ganancia</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {liquidityData.map((data, index) => {
                  const profit = data.ingresos - data.egresos;
                  const accumulated = liquidityData
                    .slice(0, index + 1)
                    .reduce((sum, d) => sum + (d.ingresos - d.egresos), 0);

                  return (
                    <tr key={data.month} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{data.month}</td>
                      <td className="px-4 py-3 text-green-600 dark:text-green-400">
                        ${data.ingresos.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-red-600 dark:text-red-400">
                        ${data.egresos.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${
                        profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        ${accumulated.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}