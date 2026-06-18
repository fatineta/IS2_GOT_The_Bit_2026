// src/app/components/Payments.tsx
import { useState, useRef, useEffect } from 'react';
import { Search, X, FileText, FileSpreadsheet, AlertCircle, Paperclip, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react';
import { Supplier } from './SupplierList';
import { Voucher } from './Vouchers';
import { PurchaseOrder } from './PurchaseOrders';
import { api } from '../../services/api';

export type PaymentMethodType = 'transfer' | 'cash' | 'debit' | 'credit' | 'cuenta-corriente-ars' | 'cuenta-corriente-usd';

export interface Payment {
  id: string;
  voucherId: string;
  supplierId: string;
  supplierName?: string;
  purchaseOrderId?: string;
  amount: number;
  paymentDate: string;
  bankOrigin: string;
  transferNumber: string;
  reference: string;
  method: PaymentMethodType;
  attachmentUrl?: string;
  attachmentName?: string;
  voucherNumber?: string;
  orderNumber?: string;
}

const METHOD_LABELS: Record<PaymentMethodType, { label: string; badgeClass: string }> = {
  transfer: { label: 'Transferencia', badgeClass: 'bg-blue-900/40 text-blue-300' },
  cash: { label: 'Efectivo', badgeClass: 'bg-green-900/40 text-green-300' },
  debit: { label: 'Débito', badgeClass: 'bg-cyan-900/40 text-cyan-300' },
  credit: { label: 'Crédito', badgeClass: 'bg-orange-900/40 text-orange-300' },
  'cuenta-corriente-ars': { label: 'Cta Cte $', badgeClass: 'bg-purple-900/40 text-purple-300' },
  'cuenta-corriente-usd': { label: 'Cta Cte USD', badgeClass: 'bg-yellow-900/40 text-yellow-300' },
};

const GENERATES_DEBT_METHODS: PaymentMethodType[] = ['transfer', 'credit', 'cuenta-corriente-ars', 'cuenta-corriente-usd'];

const BANK_OPTIONS = [
  { group: 'Bancos', options: ['Banco Nación', 'Banco Provincia', 'BBVA', 'Santander', 'Galicia', 'HSBC', 'Macro', 'ICBC'] },
  { group: 'Billeteras virtuales', options: ['Mercado Pago', 'Ualá', 'Naranja X', 'Personal Pay', 'Cuenta DNI'] },
  { group: 'Otro', options: ['Otro'] },
];

interface PaymentsProps {
  suppliers: Supplier[];
  vouchers: Voucher[];
  payments: Payment[];
  purchaseOrders: PurchaseOrder[];
  onCreatePayment: (payment: Omit<Payment, 'id'>) => void;
  onUpdatePayments?: (payments: Payment[]) => void;
}

export default function Payments({ 
  suppliers: initialSuppliers, 
  vouchers: initialVouchers, 
  payments: initialPayments, 
  purchaseOrders: initialPurchaseOrders, 
  onCreatePayment,
  onUpdatePayments
}: PaymentsProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [searchPending, setSearchPending] = useState('');
  const [searchCompleted, setSearchCompleted] = useState('');
  const [filterBank, setFilterBank] = useState('all');
  const [filterSupplierCompleted, setFilterSupplierCompleted] = useState('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formBankOrigin, setFormBankOrigin] = useState('');
  const [formTransferNumber, setFormTransferNumber] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string | undefined>();
  const [formAttachmentName, setFormAttachmentName] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  // Cargar datos desde el backend
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersData, vouchersData, paymentsData, ordersData] = await Promise.all([
        api.getSuppliers(),
        api.getVouchers(),
        api.getPayments(),
        api.getPurchaseOrders()
      ]);

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

      const mappedOrders = ordersData.map((o: any) => ({
        id: String(o.id),
        orderNumber: o.orderNumber,
        supplierId: String(o.supplierId),
        supplierName: o.supplierName,
        date: o.date,
        items: o.items || [],
        notes: o.notes || '',
        status: o.status || 'sent',
        paymentMethod: o.paymentMethod,
        installments: o.installments,
        exchangeRate: o.exchangeRate,
        total: o.total
      }));

      setSuppliers(mappedSuppliers);
      setVouchers(mappedVouchers);
      setPayments(mappedPayments);
      setPurchaseOrders(mappedOrders);

      if (onUpdatePayments) {
        onUpdatePayments(mappedPayments);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setSaveMessage({ type: 'error', text: '❌ Error al cargar datos. Usando datos locales.' });
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.nombre || 'Desconocido';
  const getSupplier = (id: string) => suppliers.find(s => s.id === id);
  const getOcNumber = (id: string) => purchaseOrders.find(o => o.id === id)?.orderNumber || '—';

  const getSupplierDestination = (supplierId: string) => {
    const s = getSupplier(supplierId);
    if (!s) return null;
    return s.cbu || s.cvu || s.alias || null;
  };

  const calculateTotal = (items: Voucher['items']) =>
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 + item.ivaPercent / 100), 0);

  const getOrderPaymentMethod = (purchaseOrderId?: string): PaymentMethodType | undefined => {
    if (!purchaseOrderId) return undefined;
    return purchaseOrders.find(o => o.id === purchaseOrderId)?.paymentMethod as PaymentMethodType | undefined;
  };

  const pendingVouchers = vouchers.filter(v => {
    const generatesDebt = ['invoice-a', 'invoice-b', 'invoice-c', 'debit-note'].includes(v.type);
    if (!generatesDebt || (v.status !== 'pending' && v.status !== 'overdue')) return false;
    const orderMethod = getOrderPaymentMethod(v.purchaseOrderId);
    if (orderMethod && !GENERATES_DEBT_METHODS.includes(orderMethod)) return false;
    return true;
  });

  const isOverdue = (v: Voucher) =>
    v.status === 'pending' && !!v.dueDate && new Date(v.dueDate) < new Date();

  const getDaysUntilDue = (v: Voucher) => {
    if (!v.dueDate) return null;
    return Math.ceil((new Date(v.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const totalPending = pendingVouchers.reduce((s, v) => s + calculateTotal(v.items), 0);
  const overdueVouchers = pendingVouchers.filter(isOverdue);
  const totalOverdue = overdueVouchers.reduce((s, v) => s + calculateTotal(v.items), 0);
  const dueThisWeek = pendingVouchers.filter(v => { const d = getDaysUntilDue(v); return d !== null && d >= 0 && d <= 7; });
  const totalDueThisWeek = dueThisWeek.reduce((s, v) => s + calculateTotal(v.items), 0);
  const now = new Date();
  const totalPaidThisMonth = payments
    .filter(p => { const d = new Date(p.paymentDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, p) => s + p.amount, 0);

  const filteredPending = pendingVouchers.filter(v => {
    const term = searchPending.toLowerCase();
    return !term || v.number.toLowerCase().includes(term) || getSupplierName(v.supplierId).toLowerCase().includes(term);
  });

  const filteredCompleted = payments.filter(p => {
    const v = vouchers.find(v => v.id === p.voucherId);
    const term = searchCompleted.toLowerCase();
    const matchesSearch = !term || getSupplierName(p.supplierId).toLowerCase().includes(term) ||
      p.transferNumber?.toLowerCase().includes(term) || (v && v.number.toLowerCase().includes(term));
    const matchesBank = filterBank === 'all' || p.bankOrigin === filterBank;
    const matchesSupplier = filterSupplierCompleted === 'all' || p.supplierId === filterSupplierCompleted;
    return matchesSearch && matchesBank && matchesSupplier;
  });

  const handleOpenModal = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setFormAmount(calculateTotal(voucher.items).toFixed(2));
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormBankOrigin('');
    setFormTransferNumber('');
    setFormAttachmentUrl(undefined);
    setFormAttachmentName(undefined);
    setSaveMessage(null);
    setShowModal(true);
  };

  const handleCopyDestination = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormAttachmentUrl(URL.createObjectURL(file));
    setFormAttachmentName(file.name);
  };

  const handleConfirm = async () => {
    if (!selectedVoucher || !formAmount || !formDate || !formTransferNumber || !formBankOrigin) {
      setSaveMessage({ type: 'error', text: '❌ Completá todos los campos obligatorios' });
      return;
    }

    setLoading(true);
    setSaveMessage(null);

    try {
      const paymentData = {
        voucherId: selectedVoucher.id,
        supplierId: selectedVoucher.supplierId,
        purchaseOrderId: selectedVoucher.purchaseOrderId,
        amount: parseFloat(formAmount),
        paymentDate: formDate,
        bankOrigin: formBankOrigin,
        transferNumber: formTransferNumber,
        reference: '',
        method: 'transfer' as PaymentMethodType,
        attachmentUrl: formAttachmentUrl,
        attachmentName: formAttachmentName,
      };

      await api.createPayment(paymentData);
      
      const updatedPayments = await api.getPayments();
      const mappedPayments = updatedPayments.map((p: any) => ({
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
      
      setPayments(mappedPayments);
      if (onUpdatePayments) {
        onUpdatePayments(mappedPayments);
      }

      setSaveMessage({ type: 'success', text: '✅ Pago registrado exitosamente' });
      
      const updatedVoucher = vouchers.find(v => v.id === selectedVoucher.id);
      if (updatedVoucher) {
        updatedVoucher.status = 'paid';
        setVouchers(vouchers.map(v => v.id === selectedVoucher.id ? updatedVoucher : v));
      }

      onCreatePayment(paymentData);

      setTimeout(() => {
        setShowModal(false);
        setSelectedVoucher(null);
        setSaveMessage(null);
        loadData();
      }, 1500);

    } catch (error: any) {
      console.error('Error al registrar pago:', error);
      setSaveMessage({ type: 'error', text: `❌ Error: ${error.message || 'Intenta nuevamente'}` });
    } finally {
      setLoading(false);
    }
  };

  const allBanksInPayments = [...new Set(payments.map(p => p.bankOrigin).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Pagos a Proveedores</h2>
          <p className="text-muted-foreground text-sm">Gestiona los pagos por transferencia bancaria</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition text-sm"
          disabled={loading}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </div>

      {saveMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total pendiente</div>
          <div className="text-2xl font-semibold">${totalPending.toLocaleString('es-AR')}</div>
          <div className="text-xs text-muted-foreground mt-1">{pendingVouchers.length} comprobante{pendingVouchers.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-card border border-red-800/50 rounded-lg p-4">
          <div className="text-sm text-red-400 mb-1 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Vencidos
          </div>
          <div className="text-2xl font-semibold text-red-400">${totalOverdue.toLocaleString('es-AR')}</div>
          <div className="text-xs text-muted-foreground mt-1">{overdueVouchers.length} comprobante{overdueVouchers.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-card border border-yellow-800/50 rounded-lg p-4">
          <div className="text-sm text-yellow-400 mb-1">A vencer esta semana</div>
          <div className="text-2xl font-semibold text-yellow-400">${totalDueThisWeek.toLocaleString('es-AR')}</div>
          <div className="text-xs text-muted-foreground mt-1">{dueThisWeek.length} comprobante{dueThisWeek.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-card border border-green-800/50 rounded-lg p-4">
          <div className="text-sm text-green-400 mb-1">Pagado este mes</div>
          <div className="text-2xl font-semibold text-green-400">${totalPaidThisMonth.toLocaleString('es-AR')}</div>
        </div>
      </div>

      {/* Cuentas a pagar */}
      <div className="mb-10">
        <h3 className="text-lg font-semibold mb-4">Cuentas a pagar</h3>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar por N° comprobante o proveedor..."
            value={searchPending} onChange={e => setSearchPending(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
        </div>
        {filteredPending.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-muted-foreground">No hay cuentas pendientes de pago</div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-border bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Proveedor</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">N° comprobante</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Orden vinculada</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Vencimiento</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide text-right">Importe</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map(v => {
                    const overdue = isOverdue(v);
                    const days = getDaysUntilDue(v);
                    const dueSoon = days !== null && days >= 0 && days <= 7;
                    const typeLabels: Record<string, string> = {
                      'invoice-a': 'Factura A', 'invoice-b': 'Factura B',
                      'invoice-c': 'Factura C', 'debit-note': 'Nota de Débito',
                    };
                    return (
                      <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                        <td className="px-4 py-3 text-sm">{getSupplierName(v.supplierId)}</td>
                        <td className="px-4 py-3 font-mono text-sm">{v.number}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{typeLabels[v.type] || v.type}</td>
                        <td className="px-4 py-3">
                          {v.purchaseOrderId
                            ? <span className="inline-flex px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-mono">{getOcNumber(v.purchaseOrderId)}</span>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-sm ${overdue ? 'text-red-400 font-semibold' : dueSoon ? 'text-yellow-400 font-semibold' : 'text-muted-foreground'}`}>
                          {v.dueDate ? (
                            <>
                              {new Date(v.dueDate).toLocaleDateString('es-AR')}
                              {overdue && <span className="ml-2 text-xs">(Vencido)</span>}
                              {dueSoon && !overdue && <span className="ml-2 text-xs">(En {days} días)</span>}
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-right">${calculateTotal(v.items).toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleOpenModal(v)}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm">
                            Pagar
                          </button>
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

      {/* Pagos realizados */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Pagos realizados</h3>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted transition text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> Exportar PDF
            </button>
            <button className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-muted transition text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar proveedor, comprobante o N° transferencia..."
              value={searchCompleted} onChange={e => setSearchCompleted(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
          </div>
          <select value={filterSupplierCompleted} onChange={e => setFilterSupplierCompleted(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
            <option value="all">Todos los proveedores</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select value={filterBank} onChange={e => setFilterBank(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
            <option value="all">Todos los bancos / billeteras</option>
            {allBanksInPayments.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {filteredCompleted.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-muted-foreground">No hay pagos realizados</div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead className="border-b border-border bg-muted/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Proveedor</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Método</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Comprobante</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Orden</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide text-right">Importe</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">N° transferencia</th>
                    <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Comprobante</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompleted.map(payment => {
                    const voucher = vouchers.find(v => v.id === payment.voucherId);
                    return (
                      <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                        <td className="px-4 py-3 text-sm">{payment.supplierName || getSupplierName(payment.supplierId)}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const m = METHOD_LABELS[payment.method] || { label: payment.method, badgeClass: 'bg-muted text-muted-foreground' };
                            return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.badgeClass}`}>{m.label}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{payment.voucherNumber || (voucher ? voucher.number : '—')}</td>
                        <td className="px-4 py-3">
                          {payment.purchaseOrderId
                            ? <span className="inline-flex px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-mono">{payment.orderNumber || getOcNumber(payment.purchaseOrderId)}</span>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString('es-AR')}</td>
                        <td className="px-4 py-3 font-semibold text-right">${payment.amount.toLocaleString('es-AR')}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{payment.bankOrigin || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{payment.transferNumber || '—'}</td>
                        <td className="px-4 py-3">
                          {payment.attachmentUrl ? (
                            <button onClick={() => setPreviewUrl(payment.attachmentUrl!)}
                              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm" title={payment.attachmentName}>
                              <Paperclip className="w-4 h-4" /> Ver
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-900/40 text-yellow-300 rounded-full text-xs">
                              <AlertTriangle className="w-3 h-3" /> Sin comprobante
                            </span>
                          )}
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

      {/* Attachment Preview */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-3xl w-full">
            <button onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-lg transition">
              <X className="w-6 h-6" />
            </button>
            <img src={previewUrl} alt="Comprobante bancario"
              className="w-full rounded-lg max-h-[80vh] object-contain bg-white"
              onError={() => { window.open(previewUrl, '_blank'); setPreviewUrl(null); }} />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && selectedVoucher && (() => {
        const supplier = getSupplier(selectedVoucher.supplierId);
        const destination = getSupplierDestination(selectedVoucher.supplierId);
        const ocNumber = selectedVoucher.purchaseOrderId ? getOcNumber(selectedVoucher.purchaseOrderId) : null;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Registrar Pago</h3>
                <button onClick={() => { setShowModal(false); setSelectedVoucher(null); setSaveMessage(null); }} className="p-2 hover:bg-muted rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {saveMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    saveMessage.type === 'success' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' 
                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                  }`}>
                    {saveMessage.text}
                  </div>
                )}

                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Datos del pago</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs mb-0.5">Proveedor</div>
                      <div className="font-medium">{supplier?.nombre}</div>
                    </div>
                    {ocNumber && (
                      <div>
                        <div className="text-muted-foreground text-xs mb-0.5">Orden de compra</div>
                        <span className="font-mono text-primary text-sm">{ocNumber}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-xs mb-0.5">Comprobante vinculado</div>
                      <div className="font-mono text-sm">{selectedVoucher.number} — ${calculateTotal(selectedVoucher.items).toLocaleString('es-AR')}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-lg p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Destino de la transferencia</div>
                  {destination ? (
                    <div className="space-y-2">
                      {supplier?.bankName && (
                        <div className="text-sm"><span className="text-muted-foreground">Banco / Billetera: </span>{supplier.bankName}</div>
                      )}
                      {supplier?.titularCuenta && (
                        <div className="text-sm"><span className="text-muted-foreground">Titular: </span>{supplier.titularCuenta}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 font-mono text-sm bg-background border border-border rounded px-3 py-2 select-all">
                          {destination}
                        </div>
                        <button
                          onClick={() => handleCopyDestination(destination)}
                          className="p-2 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground"
                          title="Copiar"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {supplier?.cbu && <div className="text-xs text-muted-foreground">CBU</div>}
                      {!supplier?.cbu && supplier?.cvu && <div className="text-xs text-muted-foreground">CVU</div>}
                      {!supplier?.cbu && !supplier?.cvu && supplier?.alias && <div className="text-xs text-muted-foreground">Alias</div>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-400 text-sm">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Este proveedor no tiene datos bancarios registrados. Completalos en la sección <strong>Proveedores</strong>.</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Datos de la transferencia</div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha del pago <span className="text-destructive">*</span></label>
                      <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Monto pagado <span className="text-destructive">*</span></label>
                      <input type="number" min="0" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Banco / Billetera origen <span className="text-destructive">*</span></label>
                    <select value={formBankOrigin} onChange={e => setFormBankOrigin(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Seleccionar banco u origen</option>
                      {BANK_OPTIONS.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">N° de comprobante de transferencia <span className="text-destructive">*</span></label>
                    <input type="text" value={formTransferNumber} onChange={e => setFormTransferNumber(e.target.value)}
                      placeholder="El número que genera el banco / billetera"
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adjuntar comprobante bancario <span className="text-destructive">*</span></label>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full px-4 py-2.5 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      {formAttachmentName || 'Subir captura del home banking o billetera'}
                    </button>
                    {formAttachmentUrl && (
                      <div className="mt-2 flex items-center justify-between text-sm text-green-400">
                        <span className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" />{formAttachmentName}</span>
                        <button onClick={() => { setFormAttachmentUrl(undefined); setFormAttachmentName(undefined); }}>
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
                <button 
                  onClick={() => { setShowModal(false); setSelectedVoucher(null); setSaveMessage(null); }} 
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirm} 
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Guardando...' : 'Confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}