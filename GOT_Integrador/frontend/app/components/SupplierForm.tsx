// src/app/components/SupplierForm.tsx
import { useState } from 'react';
import { ArrowLeft, Save, X, Loader2 } from 'lucide-react';
import { Supplier } from './SupplierList';
import { api } from '../../services/api';

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSave: (supplier: Supplier) => void;
  onCancel: () => void;
  onSuppliersUpdated?: () => void; // ⬅️ NUEVO: callback para recargar proveedores
}

export default function SupplierForm({ 
  supplier, 
  onSave, 
  onCancel,
  onSuppliersUpdated // ⬅️ NUEVO
}: SupplierFormProps) {
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState<Supplier>(
    supplier || {
      id: '',
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      ruc: '',
      razonSocial: '',
      direccionFiscal: '',
      banco: '',
      tipoCuenta: 'Ahorros',
      numeroCuenta: '',
      cbu: '',
      cvu: '',
      alias: '',
      bankName: '',
      titularCuenta: '',
      cuitTitular: '',
    }
  );

  const isEditing = !!supplier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.nombre.trim()) {
      setSaveMessage({ type: 'error', text: '❌ El nombre es obligatorio' });
      return;
    }
    if (!formData.email.trim()) {
      setSaveMessage({ type: 'error', text: '❌ El email es obligatorio' });
      return;
    }
    if (!formData.ruc.trim()) {
      setSaveMessage({ type: 'error', text: '❌ El RUC es obligatorio' });
      return;
    }

    setLoading(true);
    setSaveMessage(null);

    try {
      let result;
      if (isEditing) {
        // Actualizar proveedor existente
        result = await api.updateSupplier(formData.id, {
          nombre: formData.nombre,
          razonSocial: formData.razonSocial,
          ruc: formData.ruc,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          direccionFiscal: formData.direccionFiscal,
          banco: formData.banco,
          bankName: formData.bankName,
          tipoCuenta: formData.tipoCuenta,
          numeroCuenta: formData.numeroCuenta,
          cbu: formData.cbu,
          cvu: formData.cvu,
          alias: formData.alias,
          titularCuenta: formData.titularCuenta,
          cuitTitular: formData.cuitTitular,
        });
        setSaveMessage({ type: 'success', text: '✅ Proveedor actualizado exitosamente' });
      } else {
        // Crear nuevo proveedor
        result = await api.createSupplier({
          nombre: formData.nombre,
          razonSocial: formData.razonSocial,
          ruc: formData.ruc,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          direccionFiscal: formData.direccionFiscal,
          banco: formData.banco,
          bankName: formData.bankName,
          tipoCuenta: formData.tipoCuenta,
          numeroCuenta: formData.numeroCuenta,
          cbu: formData.cbu,
          cvu: formData.cvu,
          alias: formData.alias,
          titularCuenta: formData.titularCuenta,
          cuitTitular: formData.cuitTitular,
        });
        
        if (result.id) {
          formData.id = result.id;
        }
        setSaveMessage({ type: 'success', text: '✅ Proveedor creado exitosamente' });
      }

      // ⭐ IMPORTANTE: Recargar proveedores desde el backend
      if (onSuppliersUpdated) {
        await onSuppliersUpdated();
      }

      // Esperar un momento para mostrar el mensaje
      setTimeout(() => {
        onSave(formData);
      }, 1000);

    } catch (error: any) {
      console.error('Error al guardar proveedor:', error);
      setSaveMessage({ 
        type: 'error', 
        text: `❌ Error al guardar: ${error.message || 'Intenta nuevamente'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Supplier, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (saveMessage) setSaveMessage(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-muted rounded-lg transition"
          aria-label="Volver"
          disabled={loading}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold mb-1">
            {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <p className="text-muted-foreground">
            {isEditing ? 'Actualiza la información del proveedor' : 'Registra un nuevo proveedor'}
          </p>
        </div>
      </div>

      {/* Mensaje de estado */}
      {saveMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          saveMessage.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Datos Básicos */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Datos Básicos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre Completo <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Ingrese el nombre completo"
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="ejemplo@email.com"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Teléfono <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  placeholder="+51 999 999 999"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Dirección <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                placeholder="Ingrese la dirección"
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Datos de Registro */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Datos de Registro</h3>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  RUC <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ruc}
                  onChange={(e) => handleChange('ruc', e.target.value)}
                  placeholder="20123456789"
                  required
                  maxLength={11}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Razón Social <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.razonSocial}
                  onChange={(e) => handleChange('razonSocial', e.target.value)}
                  placeholder="Ingrese la razón social"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Dirección Fiscal <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.direccionFiscal}
                onChange={(e) => handleChange('direccionFiscal', e.target.value)}
                placeholder="Ingrese la dirección fiscal"
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Datos para Transferencia */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-1">Datos para Transferencia</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Información bancaria para realizar pagos por transferencia
          </p>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Banco / Billetera</label>
                <select
                  value={formData.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">Seleccionar</option>
                  <optgroup label="Bancos">
                    <option value="Banco Nación">Banco Nación</option>
                    <option value="Banco Provincia">Banco Provincia</option>
                    <option value="BBVA">BBVA</option>
                    <option value="Santander">Santander</option>
                    <option value="Galicia">Galicia</option>
                    <option value="HSBC">HSBC</option>
                    <option value="Macro">Macro</option>
                    <option value="ICBC">ICBC</option>
                  </optgroup>
                  <optgroup label="Billeteras virtuales">
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Ualá">Ualá</option>
                    <option value="Naranja X">Naranja X</option>
                    <option value="Personal Pay">Personal Pay</option>
                    <option value="Cuenta DNI">Cuenta DNI</option>
                  </optgroup>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de cuenta</label>
                <select
                  value={formData.tipoCuenta}
                  onChange={(e) => handleChange('tipoCuenta', e.target.value as 'Ahorros' | 'Corriente')}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="Corriente">Corriente</option>
                  <option value="Ahorros">Caja de ahorro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CBU (22 dígitos)</label>
              <input
                type="text"
                value={formData.cbu || ''}
                onChange={(e) => handleChange('cbu', e.target.value)}
                placeholder="0000000000000000000000"
                maxLength={22}
                disabled={loading}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CVU (22 dígitos — billeteras virtuales)</label>
              <input
                type="text"
                value={formData.cvu || ''}
                onChange={(e) => handleChange('cvu', e.target.value)}
                placeholder="0000003100075555555555"
                maxLength={22}
                disabled={loading}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Alias</label>
              <input
                type="text"
                value={formData.alias || ''}
                onChange={(e) => handleChange('alias', e.target.value)}
                placeholder="proveedor.nombre.alias"
                disabled={loading}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titular de la cuenta</label>
                <input
                  type="text"
                  value={formData.titularCuenta || ''}
                  onChange={(e) => handleChange('titularCuenta', e.target.value)}
                  placeholder="Nombre completo o razón social"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CUIT del titular</label>
                <input
                  type="text"
                  value={formData.cuitTitular || ''}
                  onChange={(e) => handleChange('cuitTitular', e.target.value)}
                  placeholder="20-12345678-9"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end sticky bottom-0 bg-background py-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-border rounded-lg hover:bg-muted transition flex items-center gap-2"
            disabled={loading}
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}