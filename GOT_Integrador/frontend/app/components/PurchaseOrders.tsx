// src/app/components/PurchaseOrders.tsx
import { useState, useRef, useEffect } from 'react';
import { Search, X, Eye, CheckCircle, ClipboardList, Download, FileText, PackageCheck, Loader2, Send } from 'lucide-react';
import { Product } from '../App';
import { Supplier } from './SupplierList';
import PaymentMethod from './ReorderList';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../../services/api';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName?: string;
  date: string;
  items: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    estimatedPrice: number;
  }>;
  notes: string;
  status: 'sent' | 'received' | 'cancelled';
  paymentMethod?: 'PaymentMethod';
  installments?: number;
  exchangeRate?: number;
  total?: number;
}

interface PurchaseOrdersProps {
  products: Product[];
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  onCreateOrder?: (order: Omit<PurchaseOrder, 'id' | 'orderNumber'>) => PurchaseOrder;
  onUpdateOrder: (order: PurchaseOrder) => void;
  onUpdateProducts: (updates: Array<{ productId: string; quantityReceived: number }>) => void;
  onLoadInvoice?: (orderId: string) => void;
}

export default function PurchaseOrders({
  products,
  suppliers,
  orders: initialOrders,
  onUpdateOrder,
  onUpdateProducts,
  onLoadInvoice,
}: PurchaseOrdersProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'received' | 'cancelled'>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [docTax, setDocTax] = useState('');
  const [docShipping, setDocShipping] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ orderId: string; success: boolean; message: string } | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  // Receive modal state
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>({});
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
  const [receptionObs, setReceptionObs] = useState('');
  const [receiveToast, setReceiveToast] = useState<string | null>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);

  // Sincronizar con props
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // ── RECARGAR ÓRDENES ──
  const refreshOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error al recargar órdenes:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── ENVIAR EMAIL AL PROVEEDOR ──
  const handleSendEmail = async (order: PurchaseOrder) => {
    setSendingEmail(order.id);
    setEmailStatus(null);
    
    try {
      // Buscar el proveedor
      const supplier = suppliers.find(s => s.id === order.supplierId);
      if (!supplier) {
        throw new Error('Proveedor no encontrado');
      }
      
      // Construir el cuerpo del email (HTML)
      const total = order.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);
      const itemsList = order.items.map((item, idx) => {
        const product = products.find(p => p.id === item.productId);
        return `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${product?.name || 'Producto'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.estimatedPrice.toFixed(2)}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.quantity * item.estimatedPrice).toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; border-bottom: 2px solid #7B2CBF; padding-bottom: 20px; margin-bottom: 20px;">
              <h1 style="color: #7B2CBF; font-size: 28px; margin: 0;">Orden de Compra</h1>
              <p style="color: #666; font-size: 16px; margin: 8px 0 0 0;">N° ${order.orderNumber}</p>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
              <div>
                <p style="color: #666; font-size: 12px; margin: 0;">PROVEEDOR</p>
                <p style="font-weight: bold; margin: 4px 0 0 0;">${supplier.nombre}</p>
                <p style="color: #666; margin: 2px 0 0 0; font-size: 14px;">${supplier.email}</p>
                <p style="color: #666; margin: 2px 0 0 0; font-size: 14px;">${supplier.telefono}</p>
              </div>
              <div style="text-align: right;">
                <p style="color: #666; font-size: 12px; margin: 0;">FECHA</p>
                <p style="font-weight: bold; margin: 4px 0 0 0;">${new Date(order.date).toLocaleDateString('es-ES')}</p>
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
              <tbody>
                ${itemsList}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">Total Estimado</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #7B2CBF;">$${total.toFixed(2)}</td>
                </tr>
                ${order.notes ? `
                <tr>
                  <td colspan="5" style="padding: 12px; color: #666; font-style: italic; border-top: 1px solid #e5e7eb;">
                    <strong>Notas:</strong> ${order.notes}
                  </td>
                </tr>
                ` : ''}
              </tfoot>
            </table>

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px;">
              Este pedido fue generado automáticamente. Por favor, confirmar disponibilidad.
            </div>
          </div>
        </div>
      `;

      // Simular envío de email (en producción, llamar a un endpoint real)
      // Por ahora, mostramos un mensaje de éxito simulado
      // En producción, usarías: await api.sendOrderEmail(order.id)
      
      // Simulación de envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setEmailStatus({
        orderId: order.id,
        success: true,
        message: `✅ Email enviado a ${supplier.email}`
      });
      
    } catch (error: any) {
      setEmailStatus({
        orderId: order.id,
        success: false,
        message: `❌ Error: ${error.message || 'No se pudo enviar el email'}`
      });
    } finally {
      setSendingEmail(null);
      // Ocultar mensaje después de 5 segundos
      setTimeout(() => {
        if (emailStatus?.orderId === order.id) {
          setEmailStatus(null);
        }
      }, 5000);
    }
  };

  // ── REGISTRAR RECEPCIÓN ──
  const handleConfirmReceive = async () => {
    if (!receiveOrder) return;
    
    setReceiveLoading(true);
    try {
      const updates = receiveOrder.items.map(item => ({
        productId: item.productId,
        quantityReceived: parseInt(receivedQty[item.productId] || '0', 10) || 0,
      })).filter(u => u.quantityReceived > 0);

      // 1. Actualizar stock en el backend
      for (const update of updates) {
        await api.updateStock(parseInt(update.productId), {
          cantidad: update.quantityReceived,
          tipo: 'ENTRADA',
          motivo: `Recepción de OC ${receiveOrder.orderNumber}${receptionObs ? ` - ${receptionObs}` : ''}`
        });
      }

      // 2. Actualizar estado de la orden
      await api.updatePurchaseOrderStatus(receiveOrder.id, 'received');
      
      // 3. Actualizar localmente
      const updatedOrder = { ...receiveOrder, status: 'received' as const };
      onUpdateOrder(updatedOrder);
      onUpdateProducts(updates);
      
      // 4. Recargar órdenes
      await refreshOrders();

      const count = updates.length;
      setReceiveToast(`✅ Entrada registrada. Stock actualizado para ${count} producto${count !== 1 ? 's' : ''}.`);
      setTimeout(() => setReceiveToast(null), 5000);
      setReceiveOrder(null);
      
    } catch (error: any) {
      console.error('Error al registrar recepción:', error);
      alert(`❌ Error al registrar entrada: ${error.message || 'Intenta nuevamente'}`);
    } finally {
      setReceiveLoading(false);
    }
  };

  const getStatusBadgeClass = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
      case 'received':
        return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
    }
  };

  const getStatusText = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'sent': return 'Enviada';
      case 'received': return 'Mercadería recibida';
      case 'cancelled': return 'Cancelada';
    }
  };

  const getSupplier = (supplierId: string) => suppliers.find(s => s.id === supplierId);
  const getSupplierName = (supplierId: string) => getSupplier(supplierId)?.nombre || 'Desconocido';
  const getProductName = (productId: string) => products.find(p => p.id === productId)?.name || 'Desconocido';
  const getProduct = (productId: string) => products.find(p => p.id === productId);

  const calculateOrderTotal = (items: PurchaseOrder['items']) =>
    items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0);

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSupplier = supplierFilter === 'all' || order.supplierId === supplierFilter;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSupplierName(order.supplierId).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSupplier && matchesSearch;
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getOrderTitle = (order: PurchaseOrder) =>
    `Orden de Compra — ${formatDate(order.date)}`;

  const handleOpenView = (order: PurchaseOrder) => {
    setDocTax('');
    setDocShipping('');
    setDocNotes(order.notes || '');
    setViewOrder(order);
  };

  const handleDownloadPDF = async () => {
    if (!docRef.current || !viewOrder) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(docRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${viewOrder.orderNumber}.pdf`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleOpenReceive = (order: PurchaseOrder) => {
    const initQty: Record<string, string> = {};
    order.items.forEach(item => {
      initQty[item.productId] = String(item.quantity);
    });
    setReceivedQty(initQty);
    setReceptionDate(new Date().toISOString().split('T')[0]);
    setReceptionObs('');
    setReceiveOrder(order);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Receive Toast */}
      {receiveToast && (
        <div className="fixed top-20 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{receiveToast}</span>
          <button onClick={() => setReceiveToast(null)} className="p-1 hover:bg-green-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Órdenes de Compra</h2>
          <p className="text-muted-foreground text-sm">
            Las órdenes se generan automáticamente al confirmar un pedido desde Reposición
          </p>
        </div>
        <button
          onClick={refreshOrders}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition text-sm"
          disabled={loading}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 mt-5 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por N° de orden o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', 'sent', 'received', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                statusFilter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border hover:bg-muted'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'sent' ? 'Enviadas' : f === 'received' ? 'Recibidas' : 'Canceladas'}
            </button>
          ))}
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todos los proveedores</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>{supplier.nombre}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="text-muted-foreground">No hay órdenes de compra registradas</div>
          <div className="text-sm text-muted-foreground mt-1">
            Las órdenes se crean desde la pantalla de Reposición
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">N° Orden</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Título</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Productos</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Total estimado</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Estado</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const total = calculateOrderTotal(order.items);
                  return (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                      <td className="px-4 py-3 font-mono text-sm">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-sm">{getOrderTitle(order)}</td>
                      <td className="px-4 py-3">{getSupplierName(order.supplierId)}</td>
                      <td className="px-4 py-3 text-center">{order.items.length}</td>
                      <td className="px-4 py-3 font-semibold">
                        ${total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${getStatusBadgeClass(order.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenView(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/70 rounded-lg text-sm transition"
                          >
                            <Eye className="w-4 h-4" />
                            Ver
                          </button>
                          
                          {/* Botón Enviar Email - solo para órdenes enviadas */}
                          {order.status === 'sent' && (
                            <button
                              onClick={() => handleSendEmail(order)}
                              disabled={sendingEmail === order.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition disabled:opacity-50"
                            >
                              {sendingEmail === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              Enviar Email
                            </button>
                          )}
                          
                          {/* Mensaje de estado del email */}
                          {emailStatus?.orderId === order.id && (
                            <span className={`text-xs ${emailStatus.success ? 'text-green-500' : 'text-red-500'}`}>
                              {emailStatus.message}
                            </span>
                          )}
                          
                          {/* Botón Registrar Entrada */}
                          {order.status === 'sent' && (
                            <button
                              onClick={() => handleOpenReceive(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition"
                            >
                              <PackageCheck className="w-4 h-4" />
                              Registrar entrada
                            </button>
                          )}
                          
                          {order.status === 'received' && onLoadInvoice && (
                            <button
                              onClick={() => onLoadInvoice(order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-lg text-sm transition"
                            >
                              <FileText className="w-4 h-4" />
                              Cargar factura
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {receiveOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl my-4">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold">Registrar entrada de mercadería</h3>
                <p className="text-sm text-muted-foreground">{receiveOrder.orderNumber} — {getSupplierName(receiveOrder.supplierId)}</p>
              </div>
              <button onClick={() => setReceiveOrder(null)} className="p-2 hover:bg-muted rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Products */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">Cantidades recibidas</h4>
                <div className="space-y-3">
                  {receiveOrder.items.map(item => {
                    const product = getProduct(item.productId);
                    return (
                      <div key={item.productId} className="flex items-center gap-4 bg-muted/30 rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{getProductName(item.productId)}</div>
                          <div className="text-xs text-muted-foreground">
                            Pedido: {item.quantity} {product?.unit || 'u.'} · Stock actual: {product?.currentStock ?? '?'} {product?.unit || 'u.'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground whitespace-nowrap">Recibido:</label>
                          <input
                            type="number"
                            min="0"
                            value={receivedQty[item.productId] ?? item.quantity}
                            onChange={e => setReceivedQty(prev => ({ ...prev, [item.productId]: e.target.value }))}
                            disabled={receiveLoading}
                            className="w-20 px-2 py-1 bg-card border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary text-right"
                          />
                          <span className="text-sm text-muted-foreground">{product?.unit || 'u.'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reception date */}
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de recepción</label>
                <input
                  type="date"
                  value={receptionDate}
                  onChange={e => setReceptionDate(e.target.value)}
                  disabled={receiveLoading}
                  className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-sm font-medium mb-1">Observaciones <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <textarea
                  value={receptionObs}
                  onChange={e => setReceptionObs(e.target.value)}
                  rows={2}
                  placeholder="Ej: Llegaron 2 unidades dañadas, faltó 1 caja..."
                  disabled={receiveLoading}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                />
              </div>
            </div>

            <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setReceiveOrder(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition"
                disabled={receiveLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReceive}
                disabled={receiveLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {receiveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PackageCheck className="w-4 h-4" />
                )}
                {receiveLoading ? 'Procesando...' : 'Confirmar recepción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Modal - Mantiene la misma estructura */}
      {viewOrder && (() => {
        const supplier = getSupplier(viewOrder.supplierId);
        const subtotal = calculateOrderTotal(viewOrder.items);
        const tax = parseFloat(docTax) || 0;
        const shipping = parseFloat(docShipping) || 0;
        const total = subtotal + tax + shipping;

        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-card border border-border rounded-xl w-full max-w-4xl my-4">
              {/* Modal header */}
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                <h3 className="text-lg font-semibold">{getOrderTitle(viewOrder)}</h3>
                <button onClick={() => setViewOrder(null)} className="p-2 hover:bg-muted rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document area */}
              <div className="p-6 overflow-y-auto max-h-[75vh]">
                <div ref={docRef} className="bg-white text-gray-900 rounded-lg p-8 shadow-sm">
                  {/* Doc header */}
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <div className="text-2xl font-bold text-purple-700">Ferretería</div>
                      <div className="text-gray-500 text-sm mt-1">Sistema de Inventario</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-800 uppercase tracking-wide">Orden de Compra</div>
                      <div className="text-gray-500 text-sm mt-1">
                        Fecha: {formatDate(viewOrder.date)}
                      </div>
                      <div className="text-gray-500 text-sm">
                        N° {viewOrder.orderNumber}
                      </div>
                    </div>
                  </div>

                  {/* Supplier / Send to */}
                  <div className="grid grid-cols-2 gap-8 mb-8 border-t border-b border-gray-200 py-6">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Proveedor</div>
                      {supplier ? (
                        <div className="space-y-1 text-sm">
                          <div className="font-semibold text-gray-800">{supplier.razonSocial || supplier.nombre}</div>
                          <div className="text-gray-600">{supplier.email}</div>
                          <div className="text-gray-600">{supplier.telefono}</div>
                          <div className="text-gray-600">{supplier.direccionFiscal || supplier.direccion}</div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm">Proveedor no encontrado</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Enviar a</div>
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold text-gray-800">Mi Ferretería</div>
                        <div className="text-gray-600">Dirección del local</div>
                        <div className="text-gray-600">Ciudad, País</div>
                      </div>
                    </div>
                  </div>

                  {/* Products table */}
                  <table className="w-full mb-6">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600 text-sm">
                        <th className="text-left px-3 py-2 font-semibold">#</th>
                        <th className="text-left px-3 py-2 font-semibold">Descripción</th>
                        <th className="text-center px-3 py-2 font-semibold">Cantidad</th>
                        <th className="text-right px-3 py-2 font-semibold">Precio unit.</th>
                        <th className="text-right px-3 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 text-sm">{getProductName(item.productId)}</td>
                          <td className="px-3 py-2 text-sm text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-sm text-right">${item.estimatedPrice.toLocaleString()}</td>
                          <td className="px-3 py-2 text-sm text-right font-medium">${(item.quantity * item.estimatedPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end mb-6">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span>${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Impuesto</span>
                        <input
                          type="number"
                          min="0"
                          value={docTax}
                          onChange={e => setDocTax(e.target.value)}
                          placeholder="0"
                          className="w-24 text-right border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 text-gray-800"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Envío</span>
                        <input
                          type="number"
                          min="0"
                          value={docShipping}
                          onChange={e => setDocShipping(e.target.value)}
                          placeholder="0"
                          className="w-24 text-right border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 text-gray-800"
                        />
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-2 font-bold text-base">
                        <span>TOTAL</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Comentarios o instrucciones especiales</div>
                    <textarea
                      value={docNotes}
                      onChange={e => setDocNotes(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
                      placeholder="Instrucciones adicionales para el proveedor..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setViewOrder(null)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#C77DFF] hover:bg-[#b56aee] text-white rounded-lg transition disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {isGeneratingPDF ? 'Generando...' : 'Descargar como PDF'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}