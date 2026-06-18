// src/app/components/MovementForm.tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Check, ArrowUp, ArrowDown, Scan, Loader2 } from 'lucide-react';
import { Product, Movement, StockStatus } from '../App';
import { format } from 'date-fns';
import { api } from '../../services/api';

interface MovementFormProps {
  type: 'entrada' | 'salida';
  products: Product[];
  getStockStatus: (product: Product) => StockStatus;
  onSave: (movement: Omit<Movement, 'id'>) => void;
  onCancel: () => void;
  onNavigateBack: () => void;
}

export default function MovementForm({ 
  type, 
  products, 
  getStockStatus, 
  onSave, 
  onCancel, 
  onNavigateBack 
}: MovementFormProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<'entrada' | 'salida'>(type);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(p => p.id === formData.productId);
  const newStock = selectedProduct
    ? selectedProduct.currentStock + (selectedType === 'entrada' ? formData.quantity : -formData.quantity)
    : 0;

  const newStatus: StockStatus = selectedProduct
    ? newStock < selectedProduct.minStock * 0.25 ? 'critico'
    : newStock < selectedProduct.minStock ? 'bajo'
    : 'normal'
    : 'normal';

  const canProceedStep1 = selectedType && formData.productId;
  const canProceedStep2 = formData.quantity > 0 && formData.date && formData.reason.trim();

  const handleBarcodeSearch = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      setFormData({ ...formData, productId: product.id });
      setBarcodeInput('');
    }
  };

  const handleBarcodeInput = (value: string) => {
    setBarcodeInput(value);
    if (value.length >= 13) {
      handleBarcodeSearch(value);
    }
  };

  useEffect(() => {
    if (step === 1 && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [step]);

  // ── GUARDAR MOVIMIENTO EN EL BACKEND ──
// ── GUARDAR MOVIMIENTO EN EL BACKEND ──
const handleConfirm = async () => {
  setLoading(true);
  try {
    // 1. Registrar el movimiento en la BD
    const movementData = {
      productId: formData.productId,
      type: selectedType,
      quantity: formData.quantity,
      date: new Date(formData.date).toISOString(),
      reason: formData.reason,
    };
    
    await api.createMovement(movementData);
    
    // 2. Actualizar el stock del producto
    const stockUpdate = {
      cantidad: formData.quantity,
      tipo: selectedType === 'entrada' ? 'ENTRADA' as const : 'SALIDA' as const,
      motivo: formData.reason
    };
    
    await api.updateStock(parseInt(formData.productId), stockUpdate);
    
    // 3. Notificar al componente padre
    onSave(movementData);
    
  } catch (error: any) {
    console.error('Error al guardar movimiento:', error);
    alert(`Error al registrar el movimiento: ${error.message || 'Intenta nuevamente'}`);
    setLoading(false);
  }
};
  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'critico': return 'text-red-600 dark:text-red-400';
      case 'bajo': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const getStatusText = (status: StockStatus) => {
    switch (status) {
      case 'critico': return 'Crítico';
      case 'bajo': return 'Bajo';
      default: return 'Normal';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button onClick={onNavigateBack} className="hover:text-foreground flex items-center gap-1 transition">
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <span>/</span>
        <span className="text-foreground">Inicio / Registrar {selectedType}</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 md:gap-4 mb-8 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {step > 1 ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <span className={`text-sm md:text-base ${step >= 1 ? 'text-foreground' : 'text-muted-foreground'}`}>Tipo y producto</span>
        </div>
        <div className="flex-1 min-w-[40px] h-px bg-border" />
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {step > 2 ? <Check className="w-5 h-5" /> : '2'}
          </div>
          <span className={`text-sm md:text-base ${step >= 2 ? 'text-foreground' : 'text-muted-foreground'}`}>Cantidad y motivo</span>
        </div>
        <div className="flex-1 min-w-[40px] h-px bg-border" />
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            3
          </div>
          <span className={`text-sm md:text-base ${step >= 3 ? 'text-foreground' : 'text-muted-foreground'}`}>Confirmar</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          {step === 1 && (
            <div>
              <h2 className="text-lg mb-6">Tipo de movimiento</h2>

              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setSelectedType('entrada')}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedType === 'entrada'
                      ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'border-border bg-muted hover:border-primary/50'
                  }`}
                  disabled={loading}
                >
                  <ArrowUp className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                  <div className="text-center">Entrada de stock</div>
                </button>
                <button
                  onClick={() => setSelectedType('salida')}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedType === 'salida'
                      ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-border bg-muted hover:border-primary/50'
                  }`}
                  disabled={loading}
                >
                  <ArrowDown className="w-6 h-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
                  <div className="text-center">Salida de stock</div>
                </button>
              </div>

              {/* Barcode Scanner */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Escanear Código de Barras
                </label>
                <div className="relative">
                  <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => handleBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && barcodeInput) {
                        e.preventDefault();
                        handleBarcodeSearch(barcodeInput);
                      }
                    }}
                    placeholder="Escanee el código de barras o ingréselo manualmente"
                    className="w-full bg-input-background border border-border rounded-lg pl-12 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder-muted-foreground"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Presione Enter o escanee el código de barras del producto
                </p>
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  O seleccione manualmente <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map(product => {
                    const status = getStockStatus(product);
                    return (
                      <option key={product.id} value={product.id}>
                        {product.name} — Stock: {product.currentStock} {product.unit} ({status === 'critico' ? 'Crítico' : status === 'bajo' ? 'Bajo' : 'Normal'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1 || loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg mb-6">Detalles del movimiento</h2>

              <div className="space-y-4">
                {/* Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Cantidad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      Fecha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Motivo / Observación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    placeholder="ej. Compra a proveedor — Ferromax S.A. · Factura 00241"
                    className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition"
                  disabled={loading}
                >
                  ← Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2 || loading}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        {step === 3 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded-lg p-4 md:p-6">
            <h2 className="text-lg text-blue-700 dark:text-blue-300 mb-6 font-medium">Resumen — Confirmar antes de guardar</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b border-blue-300/30 dark:border-blue-600/30">
                <span className="text-muted-foreground">Tipo</span>
                <span className={selectedType === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {selectedType === 'entrada' ? '↑ Entrada' : '↓ Salida'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-blue-300/30 dark:border-blue-600/30">
                <span className="text-muted-foreground">Producto</span>
                <span className="text-foreground font-medium">{selectedProduct?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-blue-300/30 dark:border-blue-600/30">
                <span className="text-muted-foreground">Cantidad</span>
                <span className="text-foreground font-medium">
                  {selectedType === 'entrada' ? '+' : '-'} {formData.quantity} unidades
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-blue-300/30 dark:border-blue-600/30">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-foreground font-medium">{format(new Date(formData.date), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-blue-300/30 dark:border-blue-600/30">
                <span className="text-muted-foreground">Motivo</span>
                <span className="text-foreground font-medium text-right">{formData.reason}</span>
              </div>
            </div>

            {/* Stock Impact */}
            <div className="bg-card rounded-lg p-4 mb-6">
              <div className="text-sm text-muted-foreground mb-3">Impacto en stock:</div>
              <div className="flex items-center justify-between text-lg">
                <span className={selectedType === 'entrada' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>
                  {selectedProduct?.currentStock} {selectedProduct?.unit}
                </span>
                <span className="text-muted-foreground">→</span>
                <div className="text-right">
                  <div className={getStatusColor(newStatus) + ' font-medium'}>
                    {newStock} {selectedProduct?.unit} <Check className="w-4 h-4 inline" />
                  </div>
                  <div className={`text-sm ${getStatusColor(newStatus)}`}>
                    {getStatusText(newStatus)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-2.5 bg-card border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-muted transition"
                disabled={loading}
              >
                ← Editar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex items-center justify-center gap-2 transition"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar {selectedType}
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 text-sm text-blue-700 dark:text-blue-300">
              Al confirmar, el stock se actualizará de forma permanente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
