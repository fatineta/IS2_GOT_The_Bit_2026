// src/app/components/ProductForm.tsx
import { useState, useEffect } from 'react';
import { ChevronLeft, Check, AlertTriangle, Loader2, Camera } from 'lucide-react';
import { Product, Movement, StockStatus } from '../App';
import { Supplier } from './SupplierList';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../../services/api';
import BarcodeScanner from './BarcodeScanner';

interface ProductFormProps {
  product: Product | null;
  categories: string[];
  suppliers: Supplier[];
  movements: Movement[];
  onSave: (product: Product) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  onNavigateBack: () => void;
  getStockStatus: (product: Product) => StockStatus;
}

interface UrgencyData {
  nivel: string;
  factor: number;
  cantidadRecomendada: number;
}

export default function ProductForm({ 
  product, 
  categories, 
  suppliers, 
  movements, 
  onSave, 
  onDelete, 
  onCancel, 
  onNavigateBack, 
  getStockStatus 
}: ProductFormProps) {
  const [formData, setFormData] = useState<Product>(
    product || {
      id: '',
      name: '',
      category: categories[0] || '',
      price: 0,
      currentStock: 0,
      minStock: 0,
      unit: 'u.',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [urgencyData, setUrgencyData] = useState<UrgencyData | null>(null);
  const [loadingUrgency, setLoadingUrgency] = useState(false);

  const isEditing = !!product;
  const status = getStockStatus(formData);
  const productMovements = isEditing
    ? movements.filter(m => m.productId === product.id).slice(0, 3)
    : [];

  // ⭐ Cargar datos de urgencia del producto (Strategy Pattern)
  useEffect(() => {
    if (product && isEditing) {
      const loadUrgency = async () => {
        setLoadingUrgency(true);
        try {
          const data = await api.getUrgencyProducts();
          const found = data.productos.find((p: any) => p.productoId === parseInt(product.id));
          if (found) {
            setUrgencyData({
              nivel: found.nivelUrgencia,
              factor: found.factorUrgencia,
              cantidadRecomendada: found.cantidadRecomendada
            });
          }
        } catch (error) {
          console.error('Error al cargar factor de urgencia:', error);
        } finally {
          setLoadingUrgency(false);
        }
      };
      loadUrgency();
    }
  }, [product]);

  const handleChange = (field: keyof Product, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
    if (saveMessage) setSaveMessage(null);
  };

  const handleBarcodeScan = (code: string) => {
    setFormData({ ...formData, barcode: code });
    setShowScanner(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio';
    if (formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';
    if (formData.currentStock < 0) newErrors.currentStock = 'El stock no puede ser negativo';
    if (formData.minStock <= 0) newErrors.minStock = 'El stock mínimo debe ser mayor a 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── GUARDAR PRODUCTO EN EL BACKEND ──
  const handleSubmit = async () => {
    if (!validate()) return;
    
    setLoading(true);
    setSaveMessage(null);
    
    try {
      if (isEditing) {
        await api.updateProduct(formData.id, {
          name: formData.name,
          category: formData.category,
          price: formData.price,
          currentStock: formData.currentStock,
          minStock: formData.minStock,
          unit: formData.unit,
          barcode: formData.barcode,
          imageUrl: formData.imageUrl,
          supplierId: formData.supplierId
        });
        setSaveMessage({ type: 'success', text: '✅ Producto actualizado exitosamente' });
      } else {
        const result = await api.createProduct({
          name: formData.name,
          category: formData.category,
          price: formData.price,
          currentStock: formData.currentStock,
          minStock: formData.minStock,
          unit: formData.unit,
          barcode: formData.barcode,
          imageUrl: formData.imageUrl,
          supplierId: formData.supplierId
        });
        if (result.id) {
          formData.id = result.id;
        }
        setSaveMessage({ type: 'success', text: '✅ Producto creado exitosamente' });
      }
      
      setTimeout(() => {
        onSave(formData);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      setSaveMessage({ 
        type: 'error', 
        text: `❌ Error al guardar: ${error.message || 'Intenta nuevamente'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // ── ELIMINAR PRODUCTO ──
  const handleDelete = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      await api.deleteProduct(product.id);
      setSaveMessage({ type: 'success', text: '✅ Producto eliminado exitosamente' });
      
      setTimeout(() => {
        onDelete(product.id);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      setSaveMessage({ 
        type: 'error', 
        text: `❌ Error al eliminar: ${error.message || 'Intenta nuevamente'}` 
      });
      setLoading(false);
    }
  };

  const stockPercentage = formData.minStock > 0 
    ? (formData.currentStock / formData.minStock) * 100 
    : 0;
  const isBelowMinimum = formData.currentStock < formData.minStock;

  const getUrgencyColor = (nivel: string): string => {
    switch (nivel) {
      case 'CRITICO': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700';
      case 'ALTO': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
      case 'MEDIO': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
      case 'BAJO': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';
      default: return 'text-muted-foreground bg-muted/30 border-border';
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

  const formatMovementDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return 'Hoy ' + format(date, 'HH:mm', { locale: es });
    }
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  if (loadingUrgency) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button onClick={onNavigateBack} className="hover:text-foreground flex items-center gap-1 transition">
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
        <span>/</span>
        <span className="text-foreground">Inicio / Productos / {isEditing ? 'Editar producto' : 'Nuevo producto'}</span>
      </div>

      {/* Mensaje de guardado */}
      {saveMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Product Information */}
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <h2 className="text-lg mb-6">Información del producto</h2>

          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="ej. Tornillos 6×50mm"
                disabled={loading}
              />
              {formData.name && !errors.name && (
                <div className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Nombre válido
                </div>
              )}
              {errors.name && (
                <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Proveedor
              </label>
              <select
                value={formData.supplierId || ''}
                onChange={(e) => handleChange('supplierId', e.target.value || undefined)}
                className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              >
                <option value="">Sin proveedor asignado</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.nombre}</option>
                ))}
              </select>
            </div>

            {/* Price and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Precio unitario <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-input-background border border-border rounded-lg pl-8 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                </div>
                {errors.price && (
                  <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</div>
                )}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Unidad de medida
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                >
                  <option value="u.">Unidades (u.)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="L">Litros (L)</option>
                  <option value="m">Metros (m)</option>
                </select>
              </div>
            </div>

            {/* ⭐ Barcode con escáner */}
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Código de barras
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode || ''}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  className="flex-1 bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Código de barras"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition flex items-center gap-2"
                  disabled={loading}
                >
                  <Camera className="w-5 h-5" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
              </div>
            </div>

            {/* Stock Control */}
            <div>
              <h3 className="text-base mb-3 font-medium">Control de stock</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Stock actual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => handleChange('currentStock', parseInt(e.target.value) || 0)}
                    className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                  {errors.currentStock && (
                    <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.currentStock}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Stock mínimo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                    className="w-full bg-input-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                  {errors.minStock && (
                    <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.minStock}</div>
                  )}
                </div>
              </div>
              {isBelowMinimum && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Por debajo del mínimo configurado
                </div>
              )}
              <div className="mt-2 text-sm text-muted-foreground">
                El sistema alertará al llegar a este valor
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {isEditing && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2.5 bg-card border border-red-500 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                disabled={loading}
              >
                Eliminar producto
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* Right Column - Stock Status & Strategy Pattern */}
        <div className="space-y-6">
          {/* Strategy Pattern - Urgencia Card */}
          {isEditing && urgencyData && (
            <div className={`p-4 rounded-lg border-2 ${getUrgencyColor(urgencyData.nivel)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Factor de Urgencia (Strategy Pattern)</h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">{urgencyData.factor.toFixed(2)}</span>
                    <span className="ml-2 text-sm text-muted-foreground">/ 1.0</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      urgencyData.nivel === 'CRITICO' ? 'bg-red-500/20 text-red-400' :
                      urgencyData.nivel === 'ALTO' ? 'bg-yellow-500/20 text-yellow-400' :
                      urgencyData.nivel === 'MEDIO' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {urgencyData.nivel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Cantidad recomendada: {urgencyData.cantidadRecomendada} uds.
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Basado en la categoría</div>
                  <div className="text-sm font-medium">{formData.category}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      urgencyData.factor > 0.7 ? 'bg-red-500' :
                      urgencyData.factor > 0.4 ? 'bg-yellow-500' :
                      urgencyData.factor > 0.2 ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, urgencyData.factor * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Bajo</span>
                  <span>Alto</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                El factor de urgencia se calcula automáticamente según la categoría del producto.
                {urgencyData.nivel === 'CRITICO' && ' ⚠️ ¡Requiere atención inmediata!'}
              </p>
            </div>
          )}

          {/* Stock Status */}
          <div className="bg-card border border-border rounded-lg p-4 md:p-6">
            <h2 className="text-lg mb-4">Estado actual de stock</h2>

            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">Stock actual vs. mínimo requerido</div>
              <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all ${
                    status === 'critico' ? 'bg-red-500' : status === 'bajo' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, stockPercentage)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-xs text-foreground">
                  <span>0</span>
                  <span>Mín: {formData.minStock}</span>
                </div>
              </div>
            </div>

            <div className={`text-lg font-medium ${getStatusColor(status)}`}>
              Estado: {getStatusText(status)} — {formData.currentStock} / {formData.minStock} unidades
            </div>
          </div>

          {/* Recent History */}
          {isEditing && productMovements.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-4 md:p-6">
              <h2 className="text-lg mb-4">Historial reciente</h2>
              <div className="space-y-3">
                {productMovements.map(movement => (
                  <div key={movement.id} className="pb-3 border-b border-border last:border-0">
                    <div className="flex items-start justify-between mb-1">
                      <span className={movement.type === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {movement.type === 'entrada' ? '↑' : '↓'} {movement.type === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                      <span className="text-sm text-muted-foreground">{formatMovementDate(movement.date)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {movement.type === 'entrada' ? '+' : '-'}{movement.quantity} {formData.unit} · {movement.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded-lg p-4">
              <p className="text-blue-700 dark:text-blue-300 mb-3">
                Para eliminar este producto, primero asegurate de que no tenga movimientos pendientes. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-card border border-border text-foreground rounded-lg hover:bg-muted transition"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ⭐ Modal del escáner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
