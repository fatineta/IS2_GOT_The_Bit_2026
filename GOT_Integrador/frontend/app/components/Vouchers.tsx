import { useState, useRef, useEffect } from 'react';
import { Plus, Search, X, Trash2, Paperclip, FileText } from 'lucide-react';
import { Product } from '../App';
import { Supplier } from './SupplierList';
import { PurchaseOrder } from './PurchaseOrders';

export type VoucherType = 'invoice-a' | 'invoice-b' | 'invoice-c' | 'credit-note' | 'debit-note' | 'remito';
export type VoucherStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Voucher {
  id: string;
  type: VoucherType;
  number: string;
  supplierId: string;
  issueDate: string;
  dueDate?: string;
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    ivaPercent: number;
  }>;
  ivaAmount: number;
  status: VoucherStatus;
  purchaseOrderId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

interface VouchersProps {
  products: Product[];
  suppliers: Supplier[];
  vouchers: Voucher[];
  purchaseOrders: PurchaseOrder[];
  onCreateVoucher: (voucher: Omit<Voucher, 'id'>) => void;
  initialPurchaseOrderId?: string;
}

const TYPE_META: Record<VoucherType, { label: string; badgeClass: string }> = {
  'invoice-a':   { label: 'Factura A',       badgeClass: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' },
  'invoice-b':   { label: 'Factura B',       badgeClass: 'bg-green-900/40 text-green-300 border border-green-700' },
  'invoice-c':   { label: 'Factura C',       badgeClass: 'bg-blue-900/40 text-blue-300 border border-blue-700' },
  'credit-note': { label: 'Nota de Crédito', badgeClass: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700' },
  'debit-note':  { label: 'Nota de Débito',  badgeClass: 'bg-orange-900/40 text-orange-300 border border-orange-700' },
  'remito':      { label: 'Remito',          badgeClass: 'bg-muted/80 text-muted-foreground border border-border' },
};

const STATUS_META: Record<VoucherStatus, { label: string; badgeClass: string }> = {
  pending:   { label: 'Pendiente de pago', badgeClass: 'bg-yellow-900/40 text-yellow-300' },
  paid:      { label: 'Pagado',            badgeClass: 'bg-green-900/40 text-green-300' },
  overdue:   { label: 'Vencido',           badgeClass: 'bg-red-900/40 text-red-300' },
  cancelled: { label: 'Anulado',           badgeClass: 'bg-muted/60 text-muted-foreground' },
};

const IVA_OPTIONS = [0, 10.5, 21, 27];
const GENERATES_DEBT: VoucherType[] = ['invoice-a', 'invoice-b', 'invoice-c', 'debit-note'];

export default function Vouchers({
  products,
  suppliers,
  vouchers,
  purchaseOrders,
  onCreateVoucher,
  initialPurchaseOrderId,
}: VouchersProps) {
  const [showModal, setShowModal] = useState(!!initialPurchaseOrderId);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | VoucherType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | VoucherStatus>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [ocFilter, setOcFilter] = useState('all');
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null);

  const [formType, setFormType] = useState<VoucherType>('invoice-a');
  const [formNumber, setFormNumber] = useState(`COMP-${String(vouchers.length + 1).padStart(4, '0')}`);
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formOcId, setFormOcId] = useState(initialPurchaseOrderId || '');
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formItems, setFormItems] = useState<Voucher['items']>([]);
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string | undefined>();
  const [formAttachmentName, setFormAttachmentName] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPurchaseOrderId) {
      const oc = purchaseOrders.find(o => o.id === initialPurchaseOrderId);
      if (oc) {
        setFormSupplierId(oc.supplierId);
        setFormOcId(oc.id);
        setFormItems(oc.items.map(item => ({
          productId: item.productId,
          description: products.find(p => p.id === item.productId)?.name || '',
          quantity: item.quantity,
          unitPrice: item.estimatedPrice,
          ivaPercent: 21,
        })));
      }
    }
  }, [initialPurchaseOrderId]);

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.nombre || 'Desconocido';
  const getOcNumber = (id: string) => purchaseOrders.find(o => o.id === id)?.orderNumber || id;

  const isOverdue = (v: Voucher) =>
    v.status === 'pending' && !!v.dueDate && new Date(v.dueDate) < new Date();

  const effectiveStatus = (v: Voucher): VoucherStatus =>
    isOverdue(v) ? 'overdue' : v.status;

  const calculateSubtotal = (items: Voucher['items']) =>
    items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const calculateIva = (items: Voucher['items']) =>
    items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.ivaPercent / 100), 0);

  const calculateTotal = (items: Voucher['items']) =>
    calculateSubtotal(items) + calculateIva(items);

  const ocOptions = purchaseOrders.filter(o =>
    !formSupplierId || o.supplierId === formSupplierId
  );

  const filteredVouchers = vouchers.filter(v => {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    if (supplierFilter !== 'all' && v.supplierId !== supplierFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue' && !isOverdue(v)) return false;
      if (statusFilter !== 'overdue' && effectiveStatus(v) !== statusFilter) return false;
    }
    if (ocFilter !== 'all' && v.purchaseOrderId !== ocFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!v.number.toLowerCase().includes(term) && !getSupplierName(v.supplierId).toLowerCase().includes(term)) return false;
    }
    return true;
  });

  const handleOcSelect = (ocId: string) => {
    setFormOcId(ocId);
    if (!ocId) return;
    const oc = purchaseOrders.find(o => o.id === ocId);
    if (!oc) return;
    setFormSupplierId(oc.supplierId);
    setFormItems(oc.items.map(item => ({
      productId: item.productId,
      description: products.find(p => p.id === item.productId)?.name || '',
      quantity: item.quantity,
      unitPrice: item.estimatedPrice,
      ivaPercent: 21,
    })));
  };

  const handleAddItem = () => {
    setFormItems(prev => [...prev, { productId: '', description: '', quantity: 1, unitPrice: 0, ivaPercent: 21 }]);
  };

  const handleRemoveItem = (i: number) => {
    setFormItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleUpdateItem = (i: number, field: string, value: any) => {
    setFormItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === 'productId') {
        const p = products.find(p => p.id === value);
        if (p) { next[i].description = p.name; next[i].unitPrice = p.price; }
      }
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormAttachmentUrl(URL.createObjectURL(file));
    setFormAttachmentName(file.name);
  };

  const handleSave = () => {
    if (!formNumber || !formSupplierId || formItems.length === 0) {
      alert('Completá el número de comprobante, el proveedor y al menos un item');
      return;
    }
    if (GENERATES_DEBT.includes(formType) && !formDueDate) {
      alert('Ingresá la fecha de vencimiento de pago');
      return;
    }
    onCreateVoucher({
      type: formType,
      number: formNumber,
      supplierId: formSupplierId,
      issueDate: formIssueDate,
      dueDate: formDueDate || undefined,
      items: formItems,
      ivaAmount: calculateIva(formItems),
      status: 'pending',
      purchaseOrderId: formOcId || undefined,
      attachmentUrl: formAttachmentUrl,
      attachmentName: formAttachmentName,
    });
    resetForm();
  };

  const resetForm = () => {
    setFormType('invoice-a');
    setFormNumber('');
    setFormSupplierId('');
    setFormOcId('');
    setFormIssueDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormItems([]);
    setFormAttachmentUrl(undefined);
    setFormAttachmentName(undefined);
    setShowModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Comprobantes de Compra</h2>
          <p className="text-muted-foreground text-sm">Facturas y documentos recibidos de proveedores</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Cargar comprobante
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por N° o proveedor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
          <option value="all">Todos los tipos</option>
          {(Object.keys(TYPE_META) as VoucherType[]).map(t => (
            <option key={t} value={t}>{TYPE_META[t].label}</option>
          ))}
        </select>
        <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
          <option value="all">Todos los proveedores</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
          <option value="all">Todos los estados</option>
          {(Object.keys(STATUS_META) as VoucherStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select value={ocFilter} onChange={e => setOcFilter(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
          <option value="all">Todas las órdenes</option>
          {purchaseOrders.map(o => <option key={o.id} value={o.id}>{o.orderNumber}</option>)}
        </select>
      </div>

      {/* Table */}
      {filteredVouchers.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="text-muted-foreground font-medium">No hay comprobantes de compra registrados</div>
          <div className="text-sm text-muted-foreground mt-1">Los comprobantes se cargan al recibir una factura del proveedor</div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">N° comprobante</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Proveedor</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Orden</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Emisión</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Vencimiento</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide text-right">IVA</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide text-right">Total</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map(v => {
                  const st = effectiveStatus(v);
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setDetailVoucher(v)}
                      className={`border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition ${st === 'overdue' ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_META[v.type].badgeClass}`}>
                          {TYPE_META[v.type].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{v.number}</td>
                      <td className="px-4 py-3 text-sm">{getSupplierName(v.supplierId)}</td>
                      <td className="px-4 py-3">
                        {v.purchaseOrderId
                          ? <span className="inline-flex px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-mono">{getOcNumber(v.purchaseOrderId)}</span>
                          : <span className="text-muted-foreground text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(v.issueDate).toLocaleDateString('es-AR')}</td>
                      <td className={`px-4 py-3 text-sm ${st === 'overdue' ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                        {v.dueDate ? new Date(v.dueDate).toLocaleDateString('es-AR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-muted-foreground">${v.ivaAmount.toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">${calculateTotal(v.items).toLocaleString('es-AR')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${STATUS_META[st].badgeClass}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {STATUS_META[st].label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {detailVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-end z-50">
          <div className="absolute inset-0" onClick={() => setDetailVoucher(null)} />
          <div className="relative bg-card border-l border-border w-full md:w-[520px] h-full overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{TYPE_META[detailVoucher.type].label} — {detailVoucher.number}</div>
                <div className="text-sm text-muted-foreground">{getSupplierName(detailVoucher.supplierId)}</div>
              </div>
              <button onClick={() => setDetailVoucher(null)} className="p-2 hover:bg-muted rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Estado</div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${STATUS_META[effectiveStatus(detailVoucher)].badgeClass}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {STATUS_META[effectiveStatus(detailVoucher)].label}
                  </span>
                </div>
                {detailVoucher.purchaseOrderId && (
                  <div>
                    <div className="text-muted-foreground mb-1">Orden vinculada</div>
                    <span className="font-mono text-primary">{getOcNumber(detailVoucher.purchaseOrderId)}</span>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground mb-1">Fecha emisión</div>
                  <div>{new Date(detailVoucher.issueDate).toLocaleDateString('es-AR')}</div>
                </div>
                {detailVoucher.dueDate && (
                  <div>
                    <div className="text-muted-foreground mb-1">Vencimiento</div>
                    <div className={isOverdue(detailVoucher) ? 'text-red-400 font-semibold' : ''}>
                      {new Date(detailVoucher.dueDate).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Items</div>
                <div className="space-y-2">
                  {detailVoucher.items.map((item, idx) => (
                    <div key={idx} className="bg-muted/30 rounded-lg px-3 py-2 text-sm">
                      <div className="font-medium">{item.description || products.find(p => p.id === item.productId)?.name || item.productId}</div>
                      <div className="flex justify-between text-muted-foreground mt-1">
                        <span>{item.quantity} × ${item.unitPrice.toLocaleString('es-AR')} + IVA {item.ivaPercent}%</span>
                        <span className="font-medium text-foreground">
                          ${(item.quantity * item.unitPrice * (1 + item.ivaPercent / 100)).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>${calculateSubtotal(detailVoucher.items).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>IVA</span><span>${detailVoucher.ivaAmount.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>Total con IVA</span>
                  <span className="text-primary">${calculateTotal(detailVoucher.items).toLocaleString('es-AR')}</span>
                </div>
              </div>
              {detailVoucher.attachmentUrl && (
                <div>
                  <div className="text-sm font-medium mb-2">Comprobante adjunto</div>
                  <button
                    onClick={() => window.open(detailVoucher.attachmentUrl, '_blank')}
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Paperclip className="w-4 h-4" />
                    {detailVoucher.attachmentName || 'Ver archivo'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Voucher Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-semibold">Cargar comprobante de compra</h3>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo <span className="text-destructive">*</span></label>
                  <select value={formType} onChange={e => setFormType(e.target.value as VoucherType)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    {(Object.keys(TYPE_META) as VoucherType[]).map(t => (
                      <option key={t} value={t}>{TYPE_META[t].label}</option>
                    ))}
                  </select>
                  {formType === 'credit-note' && <p className="text-xs text-yellow-400 mt-1">Reduce el saldo pendiente con el proveedor</p>}
                  {formType === 'debit-note' && <p className="text-xs text-orange-400 mt-1">Aumenta el saldo pendiente con el proveedor</p>}
                  {formType === 'remito' && <p className="text-xs text-muted-foreground mt-1">No genera deuda — solo confirma recepción física</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">N° comprobante <span className="text-destructive">*</span></label>
                  <input type="text" value={formNumber} onChange={e => setFormNumber(e.target.value)}
                    placeholder="0001-00012345"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                  <p className="text-xs text-muted-foreground mt-1">Número generado automáticamente. Reemplazarlo con el número de la factura recibida.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Proveedor <span className="text-destructive">*</span></label>
                  <select value={formSupplierId} onChange={e => { setFormSupplierId(e.target.value); setFormOcId(''); }}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Orden de compra vinculada (opcional)</label>
                  <select value={formOcId} onChange={e => handleOcSelect(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Sin vincular</option>
                    {ocOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.orderNumber} — {getSupplierName(o.supplierId)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de emisión <span className="text-destructive">*</span></label>
                  <input type="date" value={formIssueDate} onChange={e => setFormIssueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                {GENERATES_DEBT.includes(formType) && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Fecha de vencimiento <span className="text-destructive">*</span></label>
                    <input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                    <p className="text-xs text-muted-foreground mt-1">Fecha límite de pago según la factura del proveedor.</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Items <span className="text-destructive">*</span></label>
                  <button onClick={handleAddItem} className="text-sm text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Agregar item
                  </button>
                </div>
                {formItems.length === 0 ? (
                  <div className="bg-muted/20 border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
                    Seleccioná una OC para pre-cargar o agregá items manualmente
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr className="text-left text-xs">
                            <th className="px-3 py-2 font-medium">Descripción</th>
                            <th className="px-3 py-2 font-medium w-20">Cant.</th>
                            <th className="px-3 py-2 font-medium w-28">Precio unit.</th>
                            <th className="px-3 py-2 font-medium w-24">IVA %</th>
                            <th className="px-3 py-2 font-medium w-28 text-right">Subtotal c/IVA</th>
                            <th className="px-3 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-border last:border-0">
                              <td className="px-3 py-2">
                                <input type="text" value={item.description}
                                  onChange={e => handleUpdateItem(idx, 'description', e.target.value)}
                                  placeholder="Descripción"
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="1" value={item.quantity}
                                  onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" step="0.01" value={item.unitPrice}
                                  onChange={e => handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                              </td>
                              <td className="px-3 py-2">
                                <select value={item.ivaPercent}
                                  onChange={e => handleUpdateItem(idx, 'ivaPercent', parseFloat(e.target.value))}
                                  className="w-full px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                  {IVA_OPTIONS.map(v => <option key={v} value={v}>{v}%</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-medium">
                                ${(item.quantity * item.unitPrice * (1 + item.ivaPercent / 100)).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2">
                                <button onClick={() => handleRemoveItem(idx)} className="p-1 hover:bg-destructive/10 text-destructive rounded">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-muted/20 border-t border-border px-4 py-3 flex justify-end">
                      <div className="space-y-1 text-sm min-w-[200px]">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>${calculateSubtotal(formItems).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>IVA</span>
                          <span>${calculateIva(formItems).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t border-border pt-1">
                          <span>Total con IVA</span>
                          <span className="text-primary">${calculateTotal(formItems).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium mb-2">Adjuntar imagen o PDF del comprobante (opcional)</label>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full px-4 py-2.5 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  {formAttachmentName || 'Seleccionar archivo...'}
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
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-3">
              <button onClick={resetForm} className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition">
                Guardar comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
