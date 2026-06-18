// src/app/components/ReorderList.tsx
import { useState, useEffect } from 'react';
import {
  ChevronLeft, FileText, FileSpreadsheet, Send, X,
  AlertTriangle, CheckCircle, Banknote, Building2,
  CreditCard, DollarSign, ChevronRight, Loader2, Mail,
  History, Clock, Check
} from 'lucide-react';
import { Product, StockStatus } from '../App';
import { Supplier } from './SupplierList';
import { api } from '../../services/api';
import { PurchaseOrder } from './PurchaseOrders';

interface ReorderListProps {
  products: Product[];
  suppliers: Supplier[];
  getStockStatus: (product: Product) => StockStatus;
  onNavigateBack: () => void;
  onStockUpdate?: (productId: string, newStock: number) => void;
  onCreateOrder?: (order: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => PurchaseOrder;
  onSendOrder?: (order: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => Promise<PurchaseOrder>;
  sentOrders?: PurchaseOrder[];
  onRefreshSentOrders?: () => void;
  onUpdateSentOrders?: (orders: PurchaseOrder[]) => void;
}

type PaymentMethod =
  | 'efectivo'
  | 'transferencia'
  | 'debito'
  | 'credito'
  | 'cuenta_corriente_pesos'
  | 'cuenta_corriente_dolares';

interface ProductoSeleccionado {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  price: number;
  supplierId?: string;
  supplierName?: string;
  cantidadAPedir: number;
  urgencia?: {
    nivel: string;
    factor: number;
    cantidadRecomendada: number;
  };
}

interface UrgencyProduct {
  productoId: number;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  nivelUrgencia: string;
  factorUrgencia: number;
  cantidadRecomendada: number;
}

interface UrgencyResponse {
  total: number;
  productos: UrgencyProduct[];
  resumen: {
    critico: number;
    alto: number;
    medio: number;
    bajo: number;
  };
}

type ModalStep = 'productos' | 'pago' | 'confirmar';

export default function ReorderList({
  products,
  suppliers,
  getStockStatus,
  onNavigateBack,
  onStockUpdate,
  onCreateOrder,
  onSendOrder,
  sentOrders = [],
  onRefreshSentOrders,
  onUpdateSentOrders,
}: ReorderListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductoSeleccionado[]>([]);
  const [modalStep, setModalStep] = useState<ModalStep | null>(null);
  const [metodoPago, setMetodoPago] = useState<PaymentMethod | null>(null);
  const [cuotas, setCuotas] = useState(1);
  const [tipoCambio, setTipoCambio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    id: string;
    numero_orden: string;
    message: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [reorderProducts, setReorderProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [urgencyMap, setUrgencyMap] = useState<Record<string, { nivel: string; factor: number; cantidadRecomendada: number }>>({});

  const [activeTab, setActiveTab] = useState<'reorden' | 'sent'>('reorden');
  const [localSentOrders, setLocalSentOrders] = useState<PurchaseOrder[]>(sentOrders);

  useEffect(() => {
    setLocalSentOrders(sentOrders);
  }, [sentOrders]);

  useEffect(() => {
    loadLowStockProducts();
  }, []);

  // ── CARGAR PRODUCTOS CON URGENCIA (CORREGIDO) ──
  const loadLowStockProducts = async (): Promise<void> => {
    setLoadingProducts(true);
    try {
      const data: UrgencyResponse = await api.getUrgencyProducts();
      
      const urgencyMapData: Record<string, { nivel: string; factor: number; cantidadRecomendada: number }> = {};
      data.productos.forEach((p: UrgencyProduct) => {
        urgencyMapData[String(p.productoId)] = {
          nivel: p.nivelUrgencia,
          factor: p.factorUrgencia,
          cantidadRecomendada: p.cantidadRecomendada
        };
      });
      setUrgencyMap(urgencyMapData);

      const mappedProducts: Product[] = data.productos.map((p: UrgencyProduct) => {
        const fullProduct = products.find((pr: Product) => pr.id === String(p.productoId));
        return {
          id: String(p.productoId),
          name: p.nombre,
          category: p.categoria,
          price: fullProduct?.price || 0,
          currentStock: p.stockActual,
          minStock: p.stockMinimo,
          unit: fullProduct?.unit || 'u.',
          supplierId: fullProduct?.supplierId,
          barcode: fullProduct?.barcode,
          imageUrl: fullProduct?.imageUrl,
        };
      });

      // ⭐ Ordenar TODOS los productos por urgencia (de CRITICO a BAJO)
      const ordenNiveles: Record<string, number> = { 
        'CRITICO': 0, 
        'ALTO': 1, 
        'MEDIO': 2, 
        'BAJO': 3 
      };
      
      const productosOrdenados = [...mappedProducts].sort((a: Product, b: Product) => {
        const nivelA = urgencyMapData[a.id]?.nivel || 'BAJO';
        const nivelB = urgencyMapData[b.id]?.nivel || 'BAJO';
        return (ordenNiveles[nivelA] ?? 99) - (ordenNiveles[nivelB] ?? 99);
      });
      
      setReorderProducts(productosOrdenados);
      
    } catch (error) {
      console.error('Error al cargar productos con urgencia:', error);
      const fallback: Product[] = products.filter((p: Product) => {
        const status = getStockStatus(p);
        return status === 'critico' || status === 'bajo';
      });
      setReorderProducts(fallback);
    } finally {
      setLoadingProducts(false);
    }
  };

  const getSupplier = (supplierId?: string): Supplier | undefined =>
    suppliers.find((s: Supplier) => s.id === supplierId);

  const toggleProduct = (product: Product): void => {
    setSelectedProducts((prev: ProductoSeleccionado[]) => {
      const exists = prev.find((p: ProductoSeleccionado) => p.id === product.id);
      if (exists) return prev.filter((p: ProductoSeleccionado) => p.id !== product.id);
      
      const supplier = getSupplier(product.supplierId);
      const urgency = urgencyMap[product.id];
      
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          currentStock: product.currentStock,
          minStock: product.minStock,
          price: product.price,
          supplierId: product.supplierId,
          supplierName: supplier?.nombre,
          cantidadAPedir: urgency?.cantidadRecomendada || (product.minStock - product.currentStock > 0
            ? product.minStock - product.currentStock
            : 1),
          urgencia: urgency
        },
      ];
    });
  };

  const updateCantidad = (id: string, cantidad: number): void => {
    setSelectedProducts((prev: ProductoSeleccionado[]) =>
      prev.map((p: ProductoSeleccionado) => (p.id === id ? { ...p, cantidadAPedir: Math.max(1, cantidad) } : p))
    );
  };

  const totalEstimado: number = selectedProducts.reduce(
    (acc: number, p: ProductoSeleccionado) => acc + p.cantidadAPedir * p.price,
    0
  );

  const proveedorId: string | undefined = selectedProducts[0]?.supplierId;
  const proveedor: Supplier | undefined = getSupplier(proveedorId);

  // ── CONFIRMAR Y ENVIAR PEDIDO ──
  const handleConfirmar = async (): Promise<void> => {
    if (!metodoPago) {
      setError('Seleccioná un método de pago');
      return;
    }
    if (!proveedorId) {
      setError('Los productos seleccionados no tienen un proveedor asignado');
      return;
    }
    
    setLoading(true);
    setError(null);
    setEmailSent(false);
    setEmailPreviewUrl(null);
    setEmailError(null);

    try {
      const orderNumber = `OC-${String(Date.now()).slice(-4)}`;
      const newOrder: PurchaseOrder = {
        supplierId: proveedorId,
        date: new Date().toISOString(),
        items: selectedProducts.map((p) => ({
          productId: p.id,
          quantity: p.cantidadAPedir,
          estimatedPrice: p.price,
        })),
        notes: '',
        status: 'sent' as const,
        paymentMethod: metodoPago as string,
        installments: metodoPago === 'credito' ? cuotas : 1,
        exchangeRate: metodoPago === 'cuenta_corriente_dolares' && tipoCambio ? parseFloat(tipoCambio) : undefined,
        id: `local-${Date.now()}`,
        orderNumber: orderNumber,
      };

      setLocalSentOrders((prev: PurchaseOrder[]) => [...prev, newOrder]);
      
      setResultado({
        id: newOrder.id,
        numero_orden: orderNumber,
        message: 'Pedido enviado exitosamente'
      });
      setModalStep('confirmar');
      setSuccessMessage(`✅ Pedido ${orderNumber} enviado exitosamente`);
      
      setSelectedProducts([]);
      await loadLowStockProducts();

      const body = {
        proveedor_id: parseInt(proveedorId),
        metodo_pago: metodoPago,
        cuotas: metodoPago === 'credito' ? cuotas : 1,
        tipo_cambio: metodoPago === 'cuenta_corriente_dolares' && tipoCambio ? parseFloat(tipoCambio) : null,
        total_estimado: totalEstimado,
        productos: selectedProducts.map((p) => ({
          producto_id: parseInt(p.id),
          cantidad: p.cantidadAPedir,
          precio_unitario: p.price,
        })),
      };

      try {
        const result = await api.createPurchaseOrder(body);
        console.log('📦 Orden guardada en backend:', result);
        
        if (result.id) {
          const updatedOrder = { ...newOrder, id: result.id, orderNumber: result.numero_orden || orderNumber };
          setLocalSentOrders((prev: PurchaseOrder[]) => prev.map((o: PurchaseOrder) => o.id === newOrder.id ? updatedOrder : o));
          if (onUpdateSentOrders) {
            onUpdateSentOrders(localSentOrders);
          }
        }
      } catch (err) {
        console.error('⚠️ Error al guardar en backend:', err);
      }

      if (proveedor?.email) {
        setEmailSending(true);
        api.sendOrderEmail(newOrder.id)
          .then((emailResult) => {
            console.log('📧 Email enviado:', emailResult);
            setEmailSent(true);
            setEmailPreviewUrl(emailResult.previewUrl || null);
          })
          .catch((emailErr) => {
            console.error('❌ Error al enviar email:', emailErr);
            setEmailError(emailErr.message || 'No se pudo enviar el email');
          })
          .finally(() => setEmailSending(false));
      } else {
        setEmailError('El proveedor no tiene email registrado');
      }

      if (metodoPago === 'efectivo' || metodoPago === 'debito') {
        for (const p of selectedProducts) {
          onStockUpdate?.(p.id, p.currentStock + p.cantidadAPedir);
        }
      }
      
      if (onRefreshSentOrders) {
        onRefreshSentOrders();
      }
      
    } catch (err: any) {
      console.error('❌ Error al enviar pedido:', err);
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (): Promise<void> => {
    if (!resultado?.id) return;
    
    setEmailSending(true);
    setEmailError(null);
    
    try {
      const emailResult = await api.sendOrderEmail(resultado.id);
      setEmailSent(true);
      setEmailPreviewUrl(emailResult.previewUrl || null);
      setSuccessMessage(`✅ Email reenviado exitosamente`);
    } catch (err: any) {
      console.error('❌ Error al reenviar email:', err);
      setEmailError(err.message || 'No se pudo reenviar el email');
    } finally {
      setEmailSending(false);
    }
  };

  const cerrarModal = (): void => {
    setModalStep(null);
    setMetodoPago(null);
    setCuotas(1);
    setTipoCambio('');
    setError(null);
    setResultado(null);
    setEmailSent(false);
    setEmailPreviewUrl(null);
    setEmailError(null);
  };

  const exportCSV = (): void => {
    const rows: (string | number)[][] = [
      ['Producto', 'Stock actual', 'Stock mínimo', 'Urgencia', 'Cantidad recomendada', 'Precio unitario', 'Subtotal'],
      ...reorderProducts.map((p: Product) => {
        const urgency = urgencyMap[p.id];
        const cantidad = urgency?.cantidadRecomendada || (p.minStock - p.currentStock > 0 ? p.minStock - p.currentStock : 0);
        return [
          p.name,
          p.currentStock,
          p.minStock,
          urgency?.nivel || 'Normal',
          cantidad,
          p.price,
          cantidad * p.price,
        ];
      }),
    ];
    const csv: string = rows.map((r: (string | number)[]) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reposicion.csv';
    a.click();
  };

  const exportPDF = (): void => {
    window.print();
  };

  const paymentMethods = [
    { id: 'efectivo' as PaymentMethod, label: 'Efectivo', desc: 'Se paga al momento de la entrega.', icon: <Banknote className="w-5 h-5" />, color: 'text-green-400' },
    { id: 'transferencia' as PaymentMethod, label: 'Transferencia bancaria', desc: 'CBU / CVU / Alias del proveedor.', icon: <Building2 className="w-5 h-5" />, color: 'text-blue-400' },
    { id: 'debito' as PaymentMethod, label: 'Tarjeta de débito', desc: 'Pago inmediato.', icon: <CreditCard className="w-5 h-5" />, color: 'text-purple-400' },
    { id: 'credito' as PaymentMethod, label: 'Tarjeta de crédito', desc: 'Pago diferido.', icon: <CreditCard className="w-5 h-5" />, color: 'text-orange-400' },
    { id: 'cuenta_corriente_pesos' as PaymentMethod, label: 'Cuenta corriente en $', desc: 'Deuda en pesos.', icon: <FileText className="w-5 h-5" />, color: 'text-yellow-400' },
    { id: 'cuenta_corriente_dolares' as PaymentMethod, label: 'Cuenta corriente en USD', desc: 'Deuda en dólares.', icon: <DollarSign className="w-5 h-5" />, color: 'text-emerald-400' },
  ];

  if (loadingProducts) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onNavigateBack} className="p-2 hover:bg-muted rounded-lg transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Reposición</h1>
            <p className="text-sm text-muted-foreground">
              {reorderProducts.length} productos necesitan reposición
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted flex items-center gap-2 text-sm transition">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportCSV} className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted flex items-center gap-2 text-sm transition">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={loadLowStockProducts} className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted flex items-center gap-2 text-sm transition">
            🔄 Actualizar
          </button>
          {selectedProducts.length > 0 && (
            <button
              onClick={() => setModalStep('productos')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 text-sm font-medium transition"
            >
              <Send className="w-4 h-4" />
              Enviar pedido ({selectedProducts.length})
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-border px-4">
        <button
          onClick={() => setActiveTab('reorden')}
          className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
            activeTab === 'reorden'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Productos a reordenar ({reorderProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
            activeTab === 'sent'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Check className="w-4 h-4 inline mr-2" />
          Pedidos enviados ({localSentOrders.length})
        </button>
      </div>

      {/* TAB: REORDEN */}
      {activeTab === 'reorden' && (
        <>
          <div className="p-4 border-b border-border">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {successMessage && (
            <div className="mx-4 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-green-500/20 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {reorderProducts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Todo el stock está en niveles aceptables</p>
                <p className="text-sm mt-1">No hay productos que necesiten reposición</p>
              </div>
            ) : (
              reorderProducts
                .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((product) => {
                  const status = getStockStatus(product);
                  const urgency = urgencyMap[product.id];
                  const isSelected = selectedProducts.some((p) => p.id === product.id);
                  const selData = selectedProducts.find((p) => p.id === product.id);
                  const supplier = getSupplier(product.supplierId);

                  const urgencyColor = urgency?.nivel === 'CRITICO' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : urgency?.nivel === 'ALTO' 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      : '';

                  return (
                    <div
                      key={product.id}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? `border-primary bg-primary/10 ${urgencyColor}`
                          : `border-border bg-card hover:border-primary/50 ${urgencyColor}`
                      }`}
                      onClick={() => toggleProduct(product)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground truncate">{product.name}</span>
                            {urgency && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                urgency.nivel === 'CRITICO' ? 'bg-red-500/20 text-red-400' :
                                urgency.nivel === 'ALTO' ? 'bg-yellow-500/20 text-yellow-400' :
                                urgency.nivel === 'MEDIO' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {urgency.nivel} (x{urgency.factor.toFixed(1)})
                              </span>
                            )}
                            {supplier && (
                              <span className="text-xs text-muted-foreground">{supplier.nombre}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Stock: {product.currentStock} / Mínimo: {product.minStock}
                            {urgency?.cantidadRecomendada && (
                              <span className="ml-2 text-xs text-primary">
                                Recomendado: {urgency.cantidadRecomendada} uds.
                              </span>
                            )}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-xs text-muted-foreground">Cantidad:</label>
                            <input
                              type="number"
                              min={1}
                              value={selData?.cantidadAPedir ?? 1}
                              onChange={(e) => updateCantidad(product.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </>
      )}

      {/* TAB: PEDIDOS ENVIADOS */}
      {activeTab === 'sent' && (
        <div className="flex-1 overflow-y-auto p-4">
          {localSentOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium">No hay pedidos enviados</p>
              <p className="text-sm mt-1">Los pedidos confirmados aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localSentOrders.map((order) => {
                const supplier = getSupplier(order.supplierId);
                const total = order.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);
                return (
                  <div key={order.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-semibold text-primary">{order.orderNumber}</span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                            <Check className="w-3 h-3" />
                            Enviado
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {supplier?.nombre || 'Proveedor desconocido'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.date).toLocaleDateString('es-AR')} • {order.items.length} productos
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {order.items.slice(0, 3).map((item, idx) => {
                            const product = products.find(p => p.id === item.productId);
                            return (
                              <span key={idx} className="inline-block px-2 py-0.5 bg-muted/50 rounded text-xs">
                                {product?.name || 'Producto'} x{item.quantity}
                              </span>
                            );
                          })}
                          {order.items.length > 3 && (
                            <span className="inline-block px-2 py-0.5 text-xs text-muted-foreground">
                              +{order.items.length - 3} más
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">${total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{order.paymentMethod}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALES... */}
      {modalStep === 'productos' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Revisar pedido</h2>
              <button onClick={cerrarModal} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground flex-1 truncate">{p.name}</span>
                  <span className="text-sm text-muted-foreground">{p.cantidadAPedir} u. × ${p.price.toFixed(2)}</span>
                  <span className="text-sm font-medium text-foreground w-24 text-right">${(p.cantidadAPedir * p.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-border space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Proveedor</span>
                <span className="text-foreground font-medium">{proveedor?.nombre ?? 'Sin proveedor asignado'}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span className="text-muted-foreground">Total estimado</span>
                <span className="text-foreground">${totalEstimado.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setModalStep('pago')}
                disabled={!proveedor}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                Elegir método de pago <ChevronRight className="w-4 h-4" />
              </button>
              {!proveedor && (
                <p className="text-xs text-muted-foreground text-center">Asigná un proveedor a los productos seleccionados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {modalStep === 'pago' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Método de pago</h2>
                <p className="text-sm text-muted-foreground">¿Cómo vas a pagar este pedido?</p>
              </div>
              <button onClick={() => setModalStep('productos')} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-2">
              {paymentMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetodoPago(m.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                    metodoPago === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className={`mt-0.5 ${m.color}`}>{m.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
              {metodoPago === 'credito' && (
                <div className="mt-3 p-3 bg-background rounded-xl border border-border">
                  <label className="text-sm text-muted-foreground block mb-2">Cantidad de cuotas</label>
                  <select
                    value={cuotas}
                    onChange={(e) => setCuotas(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {[1, 3, 6, 12, 18].map((c) => (
                      <option key={c} value={c}>{c} {c === 1 ? 'cuota' : 'cuotas'}</option>
                    ))}
                  </select>
                </div>
              )}
              {metodoPago === 'cuenta_corriente_dolares' && (
                <div className="mt-3 p-3 bg-background rounded-xl border border-border">
                  <label className="text-sm text-muted-foreground block mb-2">Tipo de cambio (USD → ARS)</label>
                  <input
                    type="number"
                    placeholder="Ej: 1250"
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {tipoCambio && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ${totalEstimado.toFixed(2)} ARS ≈ USD {(totalEstimado / parseFloat(tipoCambio)).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
            {error && (
              <div className="mx-5 mb-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="p-5 border-t border-border flex gap-3">
              <button
                onClick={() => setModalStep('productos')}
                className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!metodoPago || loading}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Enviando...' : 'Confirmar y enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalStep === 'confirmar' && resultado && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Pedido {resultado.numero_orden} enviado</h2>
            <p className="text-sm text-muted-foreground">{resultado.message}</p>
            
            <div className="mt-4 p-4 bg-muted/30 rounded-lg text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email al proveedor
                </span>
                {emailSending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : emailSent ? (
                  <span className="text-green-400 text-sm">✅ Enviado</span>
                ) : emailError ? (
                  <span className="text-red-400 text-sm">❌ Error</span>
                ) : (
                  <span className="text-yellow-400 text-sm">⏳ Pendiente</span>
                )}
              </div>
              {emailSent && emailPreviewUrl && (
                <div className="text-sm">
                  <a href={emailPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    📧 Ver email (Ethereal)
                  </a>
                </div>
              )}
              {emailError && (
                <div className="text-sm text-red-400">
                  <p>{emailError}</p>
                  <button
                    onClick={handleResendEmail}
                    disabled={emailSending}
                    className="mt-1 text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    {emailSending ? 'Reenviando...' : '🔄 Reenviar email'}
                  </button>
                </div>
              )}
              {!emailSent && !emailError && !emailSending && proveedor?.email && (
                <button
                  onClick={handleResendEmail}
                  className="w-full mt-1 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm transition"
                >
                  📧 Enviar email ahora
                </button>
              )}
            </div>

            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm">
              <span className="text-muted-foreground">Total:</span>{' '}
              <span className="font-semibold">${totalEstimado.toFixed(2)}</span>
              <br />
              <span className="text-muted-foreground">Método de pago:</span>{' '}
              <span className="font-medium">{paymentMethods.find(m => m.id === metodoPago)?.label || metodoPago}</span>
              <br />
              <span className="text-muted-foreground">Proveedor:</span>{' '}
              <span className="font-medium">{proveedor?.nombre}</span>
            </div>
            
            <button
              onClick={cerrarModal}
              className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}