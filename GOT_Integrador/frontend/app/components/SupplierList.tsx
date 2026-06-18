// src/app/components/SupplierList.tsx
import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export interface Supplier {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ruc: string;
  razonSocial: string;
  direccionFiscal: string;
  banco: string;
  tipoCuenta: 'Ahorros' | 'Corriente';
  numeroCuenta: string;
  cbu?: string;
  cvu?: string;
  alias?: string;
  bankName?: string;
  titularCuenta?: string;
  cuitTitular?: string;
}

interface SupplierListProps {
  suppliers: Supplier[];
  onNewSupplier: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onUpdateSuppliers?: (suppliers: Supplier[]) => void; // ⬅️ NUEVO
}

export default function SupplierList({
  suppliers: initialSuppliers,
  onNewSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onUpdateSuppliers, // ⬅️ NUEVO
}: SupplierListProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Actualizar cuando cambien los props
  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  // ── ELIMINAR PROVEEDOR ──
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    
    setDeleteLoading(id);
    try {
      await api.deleteSupplier(id);
      
      const updatedSuppliers = suppliers.filter(s => s.id !== id);
      setSuppliers(updatedSuppliers);
      
      if (onUpdateSuppliers) {
        onUpdateSuppliers(updatedSuppliers);
      }
      onDeleteSupplier(id);
      
    } catch (error: any) {
      console.error('Error al eliminar proveedor:', error);
      alert(`Error al eliminar: ${error.message || 'Intenta nuevamente'}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  // ── RECARGAR DESDE EL BACKEND ──
  const refreshSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
      if (onUpdateSuppliers) {
        onUpdateSuppliers(data);
      }
    } catch (error) {
      console.error('Error al recargar proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const term = searchTerm.toLowerCase();
    return (
      supplier.nombre.toLowerCase().includes(term) ||
      supplier.ruc.toLowerCase().includes(term) ||
      supplier.email.toLowerCase().includes(term) ||
      supplier.razonSocial.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (suppliers.length === 0 && !searchTerm) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-1">Proveedores</h2>
            <p className="text-muted-foreground">Gestiona tus proveedores</p>
          </div>
          <button
            onClick={onNewSupplier}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Proveedor
          </button>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
            <Plus className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay proveedores registrados</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Comienza agregando tu primer proveedor para gestionar tus compras y pagos
          </p>
          <button
            onClick={onNewSupplier}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Agregar Proveedor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Proveedores</h2>
          <p className="text-muted-foreground">Gestiona tus proveedores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshSuppliers}
            className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition text-sm"
            disabled={loading}
          >
            {loading ? 'Cargando...' : '🔄 Actualizar'}
          </button>
          <button
            onClick={onNewSupplier}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUC, email o razón social..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Results count */}
      {searchTerm && (
        <div className="text-sm text-muted-foreground mb-4">
          Mostrando {filteredSuppliers.length} de {suppliers.length} proveedores
        </div>
      )}

      {/* Suppliers Grid */}
      <div className="grid gap-4">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No se encontraron proveedores</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{supplier.nombre}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{supplier.razonSocial}</p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">RUC:</span>{' '}
                      <span className="font-medium">{supplier.ruc}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Teléfono:</span>{' '}
                      <span className="font-medium">{supplier.telefono}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <span className="font-medium">{supplier.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Banco:</span>{' '}
                      <span className="font-medium">{supplier.banco || supplier.bankName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dirección:</span>{' '}
                      <span className="font-medium">{supplier.direccion}</span>
                    </div>
                    {supplier.cbu && (
                      <div>
                        <span className="text-muted-foreground">CBU:</span>{' '}
                        <span className="font-mono text-xs">{supplier.cbu}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEditSupplier(supplier)}
                    className="p-2 hover:bg-muted rounded-lg transition"
                    title="Editar"
                    disabled={deleteLoading === supplier.id}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition"
                    title="Eliminar"
                    disabled={deleteLoading === supplier.id}
                  >
                    {deleteLoading === supplier.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}