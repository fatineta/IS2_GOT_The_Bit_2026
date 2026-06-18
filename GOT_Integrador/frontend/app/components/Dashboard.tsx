// src/app/components/Dashboard.tsx
import { AlertCircle, ArrowUpDown, Search, ClipboardList, Loader2 } from 'lucide-react';
import { Product, Movement, StockStatus } from '../App';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../../services/api';
import { useState, useEffect } from 'react';

interface DashboardProps {
  products: Product[];
  movements: Movement[];
  getStockStatus: (product: Product) => StockStatus;
  onNavigateToReorder: () => void;
  onNavigateToProducts: (filter?: 'critico' | 'bajo' | 'all') => void;
  onNavigateToMovement: (type: 'entrada' | 'salida') => void;
}

// ⭐ Interfaz para los datos de urgencia del Strategy Pattern
interface UrgencyData {
  nivel: string;
  factor: number;
  cantidadRecomendada: number;
}

export default function Dashboard({ 
  products, 
  movements, 
  getStockStatus, 
  onNavigateToReorder, 
  onNavigateToProducts, 
  onNavigateToMovement 
}: DashboardProps) {
  // ⭐ ESTADO PARA STRATEGY PATTERN
  const [urgencyMap, setUrgencyMap] = useState<Record<string, UrgencyData>>({});
  const [loadingUrgency, setLoadingUrgency] = useState(false);
  const [criticalProductsFromStrategy, setCriticalProductsFromStrategy] = useState<Product[]>([]);

  // ⭐ Cargar datos de urgencia del Strategy Pattern
  useEffect(() => {
    const loadUrgency = async () => {
      setLoadingUrgency(true);
      try {
        const data = await api.getUrgencyProducts();
        const urgencyMapData: Record<string, UrgencyData> = {};
        const criticalIds: string[] = [];
        
        data.productos.forEach((p: any) => {
          urgencyMapData[String(p.productoId)] = {
            nivel: p.nivelUrgencia,
            factor: p.factorUrgencia,
            cantidadRecomendada: p.cantidadRecomendada
          };
          // Guardar IDs de productos críticos
          if (p.nivelUrgencia === 'CRITICO') {
            criticalIds.push(String(p.productoId));
          }
        });
        setUrgencyMap(urgencyMapData);
        
        // ⭐ Obtener productos críticos del backend
        const criticalProducts = products.filter(p => criticalIds.includes(p.id));
        setCriticalProductsFromStrategy(criticalProducts);
        
      } catch (error) {
        console.error('Error al cargar datos de urgencia:', error);
        // Fallback: usar getStockStatus
        const criticalFallback = products.filter(p => getStockStatus(p) === 'critico');
        setCriticalProductsFromStrategy(criticalFallback);
      } finally {
        setLoadingUrgency(false);
      }
    };
    loadUrgency();
  }, [products]);

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

  // ⭐ Usar productos críticos del Strategy Pattern si están disponibles
  const criticalProducts = criticalProductsFromStrategy.length > 0 
    ? criticalProductsFromStrategy 
    : products.filter(p => getStockStatusWithUrgency(p) === 'critico');
  
  const lowProducts = products.filter(p => getStockStatusWithUrgency(p) === 'bajo');

  const today = new Date();
  const todayMovements = movements.filter(m => {
    const movDate = new Date(m.date);
    return movDate.toDateString() === today.toDateString();
  });

  const recentMovements = movements.slice(0, 4);

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

  // ⭐ Obtener el factor de urgencia para mostrar en la alerta
  const getUrgencyFactor = (productId: string): number => {
    return urgencyMap[productId]?.factor || 0;
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
      {/* ⭐ Alert Banner con Strategy Pattern */}
      {criticalProducts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-red-700 dark:text-red-300 mb-1 font-medium">
                {criticalProducts.length} productos en estado CRÍTICO (Strategy Pattern)
              </p>
              <p className="text-sm text-red-600 dark:text-red-200 break-words">
                {criticalProducts.slice(0, 3).map(p => {
                  const factor = getUrgencyFactor(p.id);
                  return `${p.name} (factor: ${factor.toFixed(2)})`;
                }).join(', ')} — requieren reposición inmediata.{' '}
                <button
                  onClick={onNavigateToReorder}
                  className="underline hover:text-red-800 dark:hover:text-red-100 font-medium"
                >
                  Ver listado completo →
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <button
          onClick={() => onNavigateToProducts('all')}
          className="bg-card border border-border rounded-lg p-4 hover:bg-accent/30 transition text-left cursor-pointer"
        >
          <div className="text-sm text-muted-foreground mb-1">Total productos</div>
          <div className="text-2xl md:text-3xl font-semibold">{products.length}</div>
        </button>
        <button
          onClick={() => onNavigateToProducts('critico')}
          className="bg-card border border-border rounded-lg p-4 hover:bg-accent/30 transition text-left cursor-pointer"
        >
          <div className="text-sm text-muted-foreground mb-1">Stock crítico</div>
          <div className="text-2xl md:text-3xl font-semibold text-red-500">{criticalProducts.length}</div>
        </button>
        <button
          onClick={() => onNavigateToProducts('bajo')}
          className="bg-card border border-border rounded-lg p-4 hover:bg-accent/30 transition text-left cursor-pointer"
        >
          <div className="text-sm text-muted-foreground mb-1">Stock bajo</div>
          <div className="text-2xl md:text-3xl font-semibold text-yellow-500">{lowProducts.length}</div>
        </button>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Movimientos hoy</div>
          <div className="text-2xl md:text-3xl font-semibold text-green-500">{todayMovements.length}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => onNavigateToMovement('entrada')}
            className="bg-card border border-border rounded-lg p-4 md:p-6 hover:bg-accent/50 cursor-pointer transition text-left"
          >
            <div className="bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
              <ArrowUpDown className="w-5 h-5 text-primary" />
            </div>
            <div className="text-base font-medium mb-1">Registrar movimiento</div>
            <div className="text-sm text-muted-foreground">Registrar entrada o salida de stock</div>
          </button>
          <button
            onClick={() => onNavigateToProducts()}
            className="bg-card border border-border rounded-lg p-4 md:p-6 hover:bg-accent/50 cursor-pointer transition text-left"
          >
            <div className="bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="text-base font-medium mb-1">Buscar producto</div>
            <div className="text-sm text-muted-foreground">Consultar stock y detalle</div>
          </button>
          <button
            onClick={onNavigateToReorder}
            className="bg-card border border-border rounded-lg p-4 md:p-6 hover:bg-accent/50 cursor-pointer transition text-left"
          >
            <div className="bg-primary/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div className="text-base font-medium mb-1">Ver reposición</div>
            <div className="text-sm text-muted-foreground">Productos a pedir</div>
          </button>
        </div>
      </div>

      {/* Recent Products with Movement */}
      <div>
        <h2 className="text-lg mb-3">Productos recientes con movimiento</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Producto</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Stock actual</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Stock mín.</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Estado</th>
                  <th className="px-4 py-3 text-sm text-muted-foreground font-medium">Urgencia</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map(movement => {
                  const product = products.find(p => p.id === movement.productId);
                  if (!product) return null;
                  const status = getStockStatusWithUrgency(product);
                  const urgency = urgencyMap[product.id];

                  return (
                    <tr key={movement.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.category}</div>
                      </td>
                      <td className="px-4 py-3">{product.currentStock} {product.unit}</td>
                      <td className="px-4 py-3">{product.minStock} {product.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${getStatusColor(status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {urgency ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
                            urgency.nivel === 'CRITICO' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : urgency.nivel === 'ALTO'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : urgency.nivel === 'MEDIO'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}>
                            {urgency.nivel} (x{urgency.factor.toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}