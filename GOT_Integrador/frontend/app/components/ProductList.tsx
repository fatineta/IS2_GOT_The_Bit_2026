// src/app/components/ProductList.tsx
import { useState, useEffect } from 'react';
import { Search, ChevronLeft, Grid3x3, List, Package, TrendingUp, X, AlertTriangle } from 'lucide-react';
import { Product, StockStatus } from '../App';
import { Supplier } from './SupplierList';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../../services/api';

// ⭐ Interfaz para los datos de urgencia del Strategy Pattern
interface UrgencyData {
  nivel: string;
  factor: number;
}

interface ProductListProps {
  products: Product[];
  suppliers: Supplier[];
  getStockStatus: (product: Product) => StockStatus;
  onEditProduct: (product: Product) => void;
  onNewProduct: () => void;
  onNavigateBack: () => void;
  onUpdateProducts?: (updatedProducts: Product[]) => void;
  initialFilter?: 'all' | 'critico' | 'bajo';
}

export default function ProductList({
  products: initialProducts,
  suppliers,
  getStockStatus,
  onEditProduct,
  onNewProduct,
  onNavigateBack,
  onUpdateProducts,
  initialFilter = 'all'
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critico' | 'bajo'>(initialFilter);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField] = useState<'name' | 'stock'>('name');
  const [sortDirection] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);

  // ⭐ STATE PARA STRATEGY PATTERN - Urgencia de productos
  const [urgencyMap, setUrgencyMap] = useState<Record<string, UrgencyData>>({});
  const [loadingUrgency, setLoadingUrgency] = useState(false);

  // ── Estado del modal de inflación ──
  const [showInflacionModal, setShowInflacionModal] = useState(false);
  const [inflacionPorcentaje, setInflacionPorcentaje] = useState('');
  const [inflacionTipo, setInflacionTipo] = useState<'todos' | 'categoria' | 'producto'>('todos');
  const [inflacionCategoria, setInflacionCategoria] = useState('');
  const [inflacionProductoId, setInflacionProductoId] = useState('');
  const [inflacionBusqueda, setInflacionBusqueda] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [aplicado, setAplicado] = useState(false);

  // Obtener categorías desde la API
  const [categories, setCategories] = useState<string[]>([]);

  // ⭐ Cargar datos de urgencia del Strategy Pattern
  useEffect(() => {
    const loadUrgency = async () => {
      setLoadingUrgency(true);
      try {
        const data = await api.getUrgencyProducts();
        const urgencyMapData: Record<string, UrgencyData> = {};
        data.productos.forEach((p: any) => {
          urgencyMapData[String(p.productoId)] = {
            nivel: p.nivelUrgencia,
            factor: p.factorUrgencia
          };
        });
        setUrgencyMap(urgencyMapData);
      } catch (error) {
        console.error('Error al cargar datos de urgencia:', error);
      } finally {
        setLoadingUrgency(false);
      }
    };
    loadUrgency();
  }, []);

  // Cargar categorías al montar
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await api.getCategories();
        setCategories(data.map((c: any) => c.name));
      } catch (error) {
        console.error('Error loading categories:', error);
        const cats = Array.from(new Set(products.map(p => p.category)));
        setCategories(cats);
      }
    };
    loadCategories();
  }, []);

  // Actualizar productos cuando cambien los props
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // ⭐ Función para obtener el estado con urgencia (Strategy Pattern)
  const getStockStatusWithUrgency = (product: Product): StockStatus => {
    const urgency = urgencyMap[product.id];
    if (urgency) {
      switch (urgency.nivel) {
        case 'CRITICO': return 'critico';
        case 'ALTO': return 'bajo';
        case 'MEDIO': return 'normal';
        case 'BAJO': return 'normal';
        default: return 'normal';
      }
    }
    return getStockStatus(product);
  };

  // ⭐ Función para obtener el color de urgencia
  const getUrgencyColor = (nivel: string): string => {
    switch (nivel) {
      case 'CRITICO': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ALTO': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'MEDIO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'BAJO': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted/20 text-muted-foreground border-border';
    }
  };

  // ── ACTUALIZAR PRODUCTOS EN EL BACKEND ──
  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    setLoading(true);
    try {
      for (const product of updatedProducts) {
        const original = initialProducts.find(p => p.id === product.id);
        if (original && JSON.stringify(original) !== JSON.stringify(product)) {
          await api.updateProduct(product.id, {
            name: product.name,
            category: product.category,
            price: product.price,
            currentStock: product.currentStock,
            minStock: product.minStock,
            unit: product.unit,
            barcode: product.barcode,
            imageUrl: product.imageUrl,
            supplierId: product.supplierId
          });
        }
      }
      
      setProducts(updatedProducts);
      if (onUpdateProducts) {
        onUpdateProducts(updatedProducts);
      }
      
      const freshProducts = await api.getProducts();
      setProducts(freshProducts);
      if (onUpdateProducts) {
        onUpdateProducts(freshProducts);
      }
      
    } catch (error) {
      console.error('Error updating products:', error);
      alert('Error al actualizar los productos. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── FILTRADO DE PRODUCTOS (incluye urgencia) ──
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const status = getStockStatusWithUrgency(product);
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'critico' && status === 'critico') ||
                          (statusFilter === 'bajo' && status === 'bajo');
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else {
      return sortDirection === 'asc'
        ? a.currentStock - b.currentStock
        : b.currentStock - a.currentStock;
    }
  });

  // ⭐ Contar productos con urgencia crítica y baja
  const criticalCount = products.filter(p => getStockStatusWithUrgency(p) === 'critico').length;
  const lowCount = products.filter(p => getStockStatusWithUrgency(p) === 'bajo').length;

  const getStatusColor = (status: StockStatus) => {
    switch (status) {
      case 'critico': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300';
      case 'bajo': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';
      default: return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    }
  };

  const getStatusText = (status: StockStatus) => {
    switch (status) {
      case 'critico': return 'Crítico';
      case 'bajo': return 'Bajo';
      default: return 'Normal';
    }
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'Sin proveedor';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.nombre : 'Sin proveedor';
  };

  // ── Lógica del modal de inflación ──
  const porcentaje = parseFloat(inflacionPorcentaje) || 0;

  const productosAfectados = products.filter(p => {
    if (inflacionTipo === 'todos') return true;
    if (inflacionTipo === 'categoria') return p.category === inflacionCategoria;
    if (inflacionTipo === 'producto') return p.id === inflacionProductoId;
    return false;
  });

  const productosFiltradosBusqueda = products.filter(p =>
    p.name.toLowerCase().includes(inflacionBusqueda.toLowerCase()) ||
    p.category.toLowerCase().includes(inflacionBusqueda.toLowerCase())
  );

  const precioNuevo = (precio: number) =>
    Math.round(precio * (1 + porcentaje / 100) * 100) / 100;

  const resetModal = () => {
    setInflacionPorcentaje('');
    setInflacionTipo('todos');
    setInflacionCategoria('');
    setInflacionProductoId('');
    setInflacionBusqueda('');
    setPreviewMode(false);
    setAplicado(false);
    setShowInflacionModal(false);
  };

  const handleAplicarInflacion = async () => {
    const actualizados = products.map(p => {
      if (productosAfectados.find(af => af.id === p.id)) {
        return { ...p, price: precioNuevo(p.price) };
      }
      return p;
    });
    await handleUpdateProducts(actualizados);
    setAplicado(true);
    setPreviewMode(false);
  };

  if (loading || loadingUrgency) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
        <span className="text-foreground">Inicio / Productos</span>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-12 pr-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-3 rounded-lg border transition ${viewMode === 'grid' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-3 rounded-lg border transition ${viewMode === 'list' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Status Filters + Botones acción */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setStatusFilter('critico')}
            className={`px-4 py-2 rounded-lg border transition ${statusFilter === 'critico' ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-card border-border text-foreground hover:bg-muted'}`}
          >
            Crítico ({criticalCount})
          </button>
          <button
            onClick={() => setStatusFilter('bajo')}
            className={`px-4 py-2 rounded-lg border transition ${statusFilter === 'bajo' ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' : 'bg-card border-border text-foreground hover:bg-muted'}`}
          >
            Bajo ({lowCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg border transition ${statusFilter === 'all' ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-foreground hover:bg-muted'}`}
          >
            Todos
          </button>
        </div>

        <div className="sm:ml-auto flex gap-2">
          <button
            onClick={() => { setShowInflacionModal(true); setAplicado(false); }}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg border border-amber-500/30 transition flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Ajuste por inflación
          </button>
          <button
            onClick={onNewProduct}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg border border-primary/20 transition"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-sm text-muted-foreground mb-4">
        Mostrando {sortedProducts.length} productos
        {statusFilter !== 'all' && ` — filtro activo: Estado ${statusFilter}`}
      </div>

      {/* Grid View con Strategy Pattern */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedProducts.map(product => {
            const status = getStockStatusWithUrgency(product);
            const urgency = urgencyMap[product.id];
            return (
              <button
                key={product.id}
                onClick={() => onEditProduct(product)}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-lg hover:border-primary/50 transition text-left cursor-pointer group relative"
              >
                {/* ⭐ Badge de urgencia (Strategy Pattern) */}
                {urgency && (
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(urgency.nivel)}`}>
                    {urgency.nivel}
                  </div>
                )}
                <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden relative">
                  {product.imageUrl ? (
                    <ImageWithFallback
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </div>
                </div>
                <h3 className="font-medium text-sm mb-1 line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-primary">${product.price.toLocaleString()}</span>
                  <span className={`text-sm ${status === 'critico' ? 'text-red-500' : status === 'bajo' ? 'text-yellow-500' : 'text-green-500'}`}>
                    {product.currentStock} {product.unit}
                  </span>
                </div>
                {product.barcode && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">{product.barcode}</p>
                )}
                {/* ⭐ Mostrar factor de urgencia */}
                {urgency && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Factor: {urgency.factor.toFixed(2)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* List View con Strategy Pattern */}
      {viewMode === 'list' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Imagen</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Producto</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Categoría</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Proveedor</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Precio</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Stock</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Estado</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Urgencia</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map(product => {
                  const status = getStockStatusWithUrgency(product);
                  const urgency = urgencyMap[product.id];
                  return (
                    <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                          {product.imageUrl ? (
                            <ImageWithFallback src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        {product.barcode && <div className="text-xs text-muted-foreground font-mono">{product.barcode}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{getSupplierName(product.supplierId)}</td>
                      <td className="px-4 py-3 font-semibold">${product.price.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={status === 'critico' ? 'text-red-500' : status === 'bajo' ? 'text-yellow-500' : ''}>
                          {product.currentStock} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${getStatusColor(status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {getStatusText(status)}
                        </span>
                      </td>
                      {/* ⭐ Columna de Urgencia (Strategy Pattern) */}
                      <td className="px-4 py-3">
                        {urgency ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${getUrgencyColor(urgency.nivel)}`}>
                            {urgency.nivel} ({urgency.factor.toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onEditProduct(product)}
                          className="px-4 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded border border-primary/30 transition"
                        >
                          Ver
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

      {/* Modal de inflación (sin cambios) */}
      {showInflacionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Actualización de precios por inflación</h2>
                  <p className="text-sm text-muted-foreground">Ajustá los precios de venta en base a un porcentaje</p>
                </div>
              </div>
              <button onClick={resetModal} className="p-2 hover:bg-muted rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {aplicado && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
                  ✅ Precios actualizados correctamente. Los cambios se aplicaron a {productosAfectados.length} producto{productosAfectados.length !== 1 ? 's' : ''}.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Porcentaje de aumento <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder="Ej: 8.4"
                    value={inflacionPorcentaje}
                    onChange={e => { setInflacionPorcentaje(e.target.value); setPreviewMode(false); setAplicado(false); }}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                </div>
                {porcentaje > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Un producto de $1.000 pasará a costar ${precioNuevo(1000).toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">¿A qué productos aplicar?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'todos', label: 'Todos los productos', desc: `${products.length} productos` },
                    { value: 'categoria', label: 'Por categoría', desc: 'Elegir categoría' },
                    { value: 'producto', label: 'Producto específico', desc: 'Buscar uno' },
                  ].map(op => (
                    <button
                      key={op.value}
                      onClick={() => { setInflacionTipo(op.value as typeof inflacionTipo); setPreviewMode(false); setAplicado(false); }}
                      className={`p-3 rounded-lg border text-left transition ${
                        inflacionTipo === op.value
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium text-sm">{op.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{op.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {inflacionTipo === 'categoria' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Seleccionar categoría</label>
                  <select
                    value={inflacionCategoria}
                    onChange={e => { setInflacionCategoria(e.target.value); setPreviewMode(false); }}
                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Elegir categoría —</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat} ({products.filter(p => p.category === cat).length} productos)</option>
                    ))}
                  </select>
                </div>
              )}

              {inflacionTipo === 'producto' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Buscar producto</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Nombre o categoría..."
                      value={inflacionBusqueda}
                      onChange={e => setInflacionBusqueda(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {productosFiltradosBusqueda.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setInflacionProductoId(p.id); setInflacionBusqueda(p.name); setPreviewMode(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted transition ${inflacionProductoId === p.id ? 'bg-primary/20 text-primary' : ''}`}
                      >
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.category}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${p.price.toLocaleString()}</div>
                        </div>
                      </button>
                    ))}
                    {productosFiltradosBusqueda.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                    )}
                  </div>
                </div>
              )}

              {previewMode && porcentaje > 0 && productosAfectados.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">
                      Vista previa — {productosAfectados.length} producto{productosAfectados.length !== 1 ? 's' : ''} serán actualizados
                    </span>
                  </div>
                  <div className="bg-background border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-muted-foreground font-medium">Producto</th>
                          <th className="px-4 py-2 text-right text-muted-foreground font-medium">Precio actual</th>
                          <th className="px-4 py-2 text-right text-muted-foreground font-medium">Precio nuevo</th>
                          <th className="px-4 py-2 text-right text-muted-foreground font-medium">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {productosAfectados.slice(0, 8).map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.category}</div>
                            </td>
                            <td className="px-4 py-2 text-right text-muted-foreground">${p.price.toLocaleString()}</td>
                            <td className="px-4 py-2 text-right font-semibold text-green-400">${precioNuevo(p.price).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-amber-400">+${(precioNuevo(p.price) - p.price).toLocaleString()}</td>
                          </tr>
                        ))}
                        {productosAfectados.length > 8 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-center text-sm text-muted-foreground">
                              ...y {productosAfectados.length - 8} productos más
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
              <button onClick={resetModal} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition text-sm">
                Cancelar
              </button>
              <div className="flex gap-3">
                {!previewMode && !aplicado && (
                  <button
                    onClick={() => setPreviewMode(true)}
                    disabled={!porcentaje || (inflacionTipo === 'categoria' && !inflacionCategoria) || (inflacionTipo === 'producto' && !inflacionProductoId)}
                    className="px-4 py-2 bg-background border border-border hover:bg-muted rounded-lg transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Ver precios nuevos
                  </button>
                )}
                {previewMode && !aplicado && (
                  <button
                    onClick={handleAplicarInflacion}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition text-sm font-medium"
                  >
                    Confirmar y aplicar +{porcentaje}%
                  </button>
                )}
                {aplicado && (
                  <button onClick={resetModal} className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition text-sm font-medium">
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}