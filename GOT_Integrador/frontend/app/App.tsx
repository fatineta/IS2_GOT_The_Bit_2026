// src/app/App.tsx
import { useState, useEffect } from "react";
import {
  Home,
  Package,
  ArrowUpDown,
  ClipboardList,
  Menu,
  X,
  Moon,
  Sun,
  Building2,
  LogOut,
  Truck,
  FileText,
  CreditCard,
  Bell,
  ChevronDown,
  ShoppingCart,
} from "lucide-react";
import {
  ThemeProvider,
  useTheme,
} from "./context/ThemeContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProductList from "./components/ProductList";
import ProductForm from "./components/ProductForm";
import MovementForm from "./components/MovementForm";
import ReorderList from "./components/ReorderList";
import SupplierList, {
  Supplier,
} from "./components/SupplierList";
import SupplierForm from "./components/SupplierForm";
import PurchaseOrders, { PurchaseOrder } from "./components/PurchaseOrders";
import Vouchers, { Voucher } from "./components/Vouchers";
import Payments, { Payment } from "./components/Payments";
import { api } from "../services/api";

export type StockStatus = "normal" | "bajo" | "critico";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currentStock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  barcode?: string;
  supplierId?: string;
}

export interface Movement {
  id: string;
  productId: string;
  type: "entrada" | "salida";
  quantity: number;
  date: string;
  reason: string;
}

const CATEGORIES = [
  "Fijaciones",
  "Pinturas",
  "Herramientas",
  "Electricidad",
  "Adhesivos",
];

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [comprasExpanded, setComprasExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "products"
    | "product-form"
    | "movement"
    | "reorder"
    | "suppliers"
    | "supplier-form"
    | "purchase-orders"
    | "vouchers"
    | "payments"
    | "reports"
  >("dashboard");
  const [viewHistory, setViewHistory] = useState<
    Array<
      | "dashboard"
      | "products"
      | "product-form"
      | "movement"
      | "reorder"
      | "suppliers"
      | "supplier-form"
      | "purchase-orders"
      | "vouchers"
      | "payments"
      | "reports"
    >
  >(["dashboard"]);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] =
    useState<Supplier | null>(null);
  const [movementType, setMovementType] = useState<
    "entrada" | "salida"
  >("entrada");
  const [productFilter, setProductFilter] = useState<
    "all" | "critico" | "bajo"
  >("all");
  const [loading, setLoading] = useState(true);

  // ═══════════════════════════════════════════════
  //  ESTADOS
  // ═══════════════════════════════════════════════

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [initialVoucherOrderId, setInitialVoucherOrderId] = useState<string | undefined>();
  const [payments, setPayments] = useState<Payment[]>([]);

  // ═══════════════════════════════════════════════
  //  FUNCIONES DE CARGA
  // ═══════════════════════════════════════════════

  const loadSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      const mapped = data.map((s: any) => ({
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
      setSuppliers(mapped);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      setSuppliers(getDefaultSuppliers());
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      const mapped = data.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        price: p.price,
        currentStock: p.currentStock,
        minStock: p.minStock,
        unit: p.unit || 'u.',
        barcode: p.barcode,
        imageUrl: p.imageUrl,
        supplierId: p.supplierId ? String(p.supplierId) : undefined
      }));
      setProducts(mapped);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setProducts(getDefaultProducts());
    }
  };

  const loadMovements = async () => {
    try {
      const data = await api.getMovements();
      const mapped = data.map((m: any) => ({
        id: String(m.id),
        productId: String(m.productId),
        type: m.type?.toLowerCase() === 'entrada' ? 'entrada' : 'salida',
        quantity: m.quantity,
        date: m.date,
        reason: m.reason || ''
      }));
      setMovements(mapped);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    }
  };

  const refreshPurchaseOrders = async () => {
    try {
      const data = await api.getPurchaseOrders();
      const mapped = data.map((o: any) => ({
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
      setPurchaseOrders(mapped);
    } catch (error) {
      console.error('Error al recargar órdenes:', error);
    }
  };

  const refreshVouchers = async () => {
    try {
      const data = await api.getVouchers();
      const mapped = data.map((v: any) => ({
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
      setVouchers(mapped);
    } catch (error) {
      console.error('Error al recargar comprobantes:', error);
    }
  };

  const refreshPayments = async () => {
    try {
      const data = await api.getPayments();
      const mapped = data.map((p: any) => ({
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
      setPayments(mapped);
    } catch (error) {
      console.error('Error al recargar pagos:', error);
    }
  };

  const refreshSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      const mapped = data.map((s: any) => ({
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
      setSuppliers(mapped);
    } catch (error) {
      console.error('Error al recargar proveedores:', error);
    }
  };

  // ═══════════════════════════════════════════════
  //  DATOS DE RESPALDO
  // ═══════════════════════════════════════════════

  const getDefaultSuppliers = (): Supplier[] => [
    {
      id: "s1",
      nombre: "Ferretería Constructora S.A.",
      email: "ventas@ferreconstructora.com",
      telefono: "+54 11 4123-4567",
      direccion: "Av. Industrial 1234, CABA",
      ruc: "20123456789",
      razonSocial: "Ferretería Constructora S.A.C.",
      direccionFiscal: "Av. Industrial 1234, Buenos Aires",
      banco: "Banco Nación",
      tipoCuenta: "Corriente",
      numeroCuenta: "0110015930015012345678",
      bankName: "Banco Nación",
      cbu: "0110015930015012345678",
      alias: "FERREC.CONSTRUCTORA.SRL",
      titularCuenta: "Ferretería Constructora S.A.C.",
      cuitTitular: "30-12345678-9",
    },
    {
      id: "s2",
      nombre: "Distribuidora Eléctrica del Sur",
      email: "pedidos@electrisur.com",
      telefono: "+54 11 5678-9012",
      direccion: "Jr. Los Electricistas 567, GBA",
      ruc: "20987654321",
      razonSocial: "Distribuidora Eléctrica del Sur E.I.R.L.",
      direccionFiscal: "Jr. Los Electricistas 567, Buenos Aires",
      banco: "Mercado Pago",
      tipoCuenta: "Ahorros",
      numeroCuenta: "0000003100012987654321",
      bankName: "Mercado Pago",
      cvu: "0000003100012987654321",
      alias: "ELECTRISUR.PAGOS",
      titularCuenta: "Distribuidora Eléctrica del Sur",
      cuitTitular: "30-98765432-1",
    },
  ];

  const getDefaultProducts = (): Product[] => [
    {
      id: "1",
      name: "Tornillos 6×50mm",
      category: "Fijaciones",
      price: 0.15,
      currentStock: 5,
      minStock: 20,
      unit: "u.",
      barcode: "7891234567890",
      imageUrl: "https://images.unsplash.com/photo-1565372195458-9de0b320ef04?w=300&h=300&fit=crop",
      supplierId: "s1",
    },
    {
      id: "2",
      name: "Pintura blanca 4L",
      category: "Pinturas",
      price: 1200,
      currentStock: 2,
      minStock: 10,
      unit: "u.",
      barcode: "7891234567891",
      imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&h=300&fit=crop",
      supplierId: "s1",
    },
    {
      id: "3",
      name: "Taladro Bosch 500W",
      category: "Herramientas",
      price: 8500,
      currentStock: 14,
      minStock: 10,
      unit: "u.",
      barcode: "7891234567892",
      imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&h=300&fit=crop",
      supplierId: "s1",
    },
    {
      id: "4",
      name: "Cinta aisladora negra",
      category: "Electricidad",
      price: 85,
      currentStock: 8,
      minStock: 15,
      unit: "u.",
      barcode: "7891234567893",
      imageUrl: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=300&h=300&fit=crop",
      supplierId: "s2",
    },
    {
      id: "5",
      name: 'Llave inglesa 12"',
      category: "Herramientas",
      price: 450,
      currentStock: 6,
      minStock: 8,
      unit: "u.",
      barcode: "7891234567894",
      imageUrl: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=300&h=300&fit=crop",
      supplierId: "s1",
    },
    {
      id: "6",
      name: "Pegamento epoxi 250g",
      category: "Adhesivos",
      price: 380,
      currentStock: 4,
      minStock: 6,
      unit: "u.",
      barcode: "7891234567895",
      imageUrl: "https://images.unsplash.com/photo-1585859762337-81d399dc2f4d?w=300&h=300&fit=crop",
    },
  ];

  // ═══════════════════════════════════════════════
  //  EFECTO PARA CARGAR DATOS
  // ═══════════════════════════════════════════════

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        await loadSuppliers();
        await loadProducts();
        await loadMovements();
        await refreshPurchaseOrders();
        await refreshVouchers();
        await refreshPayments();
        console.log('✅ Todos los datos cargados correctamente');
      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // ═══════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════

  const handleUpdateSuppliers = async (updatedSuppliers: Supplier[]) => {
    setSuppliers(updatedSuppliers);
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      if (selectedProduct) {
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
        setProducts(products.map(p => p.id === product.id ? product : p));
      } else {
        const result = await api.createProduct({
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
        const newProduct = { ...product, id: result.id || Date.now().toString() };
        setProducts([...products, newProduct]);
      }
      await refreshSuppliers();
      setSelectedProduct(null);
      setCurrentView("products");
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto. Intenta nuevamente.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      setCurrentView("products");
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto. Intenta nuevamente.');
    }
  };

  const handleSaveMovement = async (movement: Omit<Movement, "id">) => {
    try {
      await api.createMovement({
        productId: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        date: movement.date,
        reason: movement.reason
      });

      await api.updateStock(parseInt(movement.productId), {
        cantidad: movement.quantity,
        tipo: movement.type === 'entrada' ? 'ENTRADA' : 'SALIDA',
        motivo: movement.reason
      });

      const newMovement: Movement = {
        ...movement,
        id: Date.now().toString(),
      };
      setMovements([newMovement, ...movements]);

      setProducts(
        products.map((p) => {
          if (p.id === movement.productId) {
            const change = movement.type === "entrada" ? movement.quantity : -movement.quantity;
            return { ...p, currentStock: p.currentStock + change };
          }
          return p;
        }),
      );

      setCurrentView("dashboard");
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      alert('Error al registrar el movimiento. Intenta nuevamente.');
    }
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    try {
      if (selectedSupplier) {
        await api.updateSupplier(supplier.id, {
          nombre: supplier.nombre,
          razonSocial: supplier.razonSocial,
          ruc: supplier.ruc,
          email: supplier.email,
          telefono: supplier.telefono,
          direccion: supplier.direccion,
          direccionFiscal: supplier.direccionFiscal,
          banco: supplier.banco,
          bankName: supplier.bankName,
          tipoCuenta: supplier.tipoCuenta,
          numeroCuenta: supplier.numeroCuenta,
          cbu: supplier.cbu,
          cvu: supplier.cvu,
          alias: supplier.alias,
          titularCuenta: supplier.titularCuenta,
          cuitTitular: supplier.cuitTitular
        });
        setSuppliers(suppliers.map(s => s.id === supplier.id ? supplier : s));
      } else {
        const result = await api.createSupplier({
          nombre: supplier.nombre,
          razonSocial: supplier.razonSocial,
          ruc: supplier.ruc,
          email: supplier.email,
          telefono: supplier.telefono,
          direccion: supplier.direccion,
          direccionFiscal: supplier.direccionFiscal,
          banco: supplier.banco,
          bankName: supplier.bankName,
          tipoCuenta: supplier.tipoCuenta,
          numeroCuenta: supplier.numeroCuenta,
          cbu: supplier.cbu,
          cvu: supplier.cvu,
          alias: supplier.alias,
          titularCuenta: supplier.titularCuenta,
          cuitTitular: supplier.cuitTitular
        });
        const newSupplier = { ...supplier, id: result.id || Date.now().toString() };
        setSuppliers([...suppliers, newSupplier]);
      }
      await refreshSuppliers();
      setSelectedSupplier(null);
      setCurrentView("suppliers");
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      alert('Error al guardar el proveedor. Intenta nuevamente.');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await api.deleteSupplier(id);
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      alert('Error al eliminar el proveedor. Intenta nuevamente.');
    }
  };

  // ── CREAR ORDEN DE COMPRA (SÍNCRONO - para PurchaseOrders) ──
  const handleCreateOrder = (order: Omit<PurchaseOrder, 'id' | 'orderNumber'>): PurchaseOrder => {
    console.log('📦 Creando orden...', order);
    
    const orderNumber = `OC-${String(purchaseOrders.length + 1).padStart(4, '0')}`;
    const newOrder: PurchaseOrder = {
      ...order,
      id: Date.now().toString(),
      orderNumber: orderNumber,
      status: 'sent'
    };
    
    setPurchaseOrders(prev => [...prev, newOrder]);
    
    // Guardar en backend en segundo plano
    const saveToBackend = async () => {
      try {
        const body = {
          proveedor_id: parseInt(order.supplierId),
          metodo_pago: order.paymentMethod || 'efectivo',
          cuotas: order.installments || 1,
          tipo_cambio: order.exchangeRate || null,
          total_estimado: order.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0),
          notas: order.notes || '',
          productos: order.items.map(item => ({
            producto_id: parseInt(item.productId),
            cantidad: item.quantity,
            precio_unitario: item.estimatedPrice
          }))
        };

        const result = await api.createPurchaseOrder(body);
        console.log('✅ Orden guardada en backend:', result);
        
        const updatedOrder: PurchaseOrder = {
          ...newOrder,
          id: result.id || newOrder.id,
          orderNumber: result.numero_orden || newOrder.orderNumber,
        };
        
        setPurchaseOrders(prev => prev.map(o => o.id === newOrder.id ? updatedOrder : o));
        await refreshPurchaseOrders();
      } catch (error) {
        console.error('❌ Error al guardar orden:', error);
      }
    };
    
    saveToBackend();
    return newOrder;
  };

  // ── ENVIAR PEDIDO (ASÍNCRONO - para ReorderList) ──
  const handleSendOrder = async (order: Omit<PurchaseOrder, 'id' | 'orderNumber'>): Promise<PurchaseOrder> => {
    console.log('📦 Enviando pedido...', order);
    
    try {
      const body = {
        proveedor_id: parseInt(order.supplierId),
        metodo_pago: order.paymentMethod || 'efectivo',
        cuotas: order.installments || 1,
        tipo_cambio: order.exchangeRate || null,
        total_estimado: order.items.reduce((sum, item) => sum + (item.quantity * item.estimatedPrice), 0),
        notas: order.notes || '',
        productos: order.items.map(item => ({
          producto_id: parseInt(item.productId),
          cantidad: item.quantity,
          precio_unitario: item.estimatedPrice
        }))
      };

      const result = await api.createPurchaseOrder(body);
      console.log('📦 Orden guardada en backend:', result);
      
      const nextNumber = purchaseOrders.length + 1;
      const orderNumber = result.numero_orden || `OC-${String(nextNumber).padStart(4, '0')}`;
      
      const newOrder: PurchaseOrder = {
        ...order,
        id: result.id || Date.now().toString(),
        orderNumber: orderNumber,
        status: 'sent'
      };
      
      setPurchaseOrders(prev => [...prev, newOrder]);
      await refreshPurchaseOrders();
      console.log('✅ Pedido enviado:', newOrder);
      return newOrder;
    } catch (error) {
      console.error('❌ Error al enviar pedido:', error);
      throw error;
    }
  };

  const handleUpdateOrder = async (order: PurchaseOrder) => {
    try {
      await api.updatePurchaseOrderStatus(order.id, order.status);
      setPurchaseOrders(purchaseOrders.map(o => o.id === order.id ? order : o));
      await refreshPurchaseOrders();
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      alert('Error al actualizar la orden. Intenta nuevamente.');
    }
  };

  const handleUpdateProducts = (updates: Array<{ productId: string; quantityReceived: number }>) => {
    setProducts(prev => prev.map(p => {
      const update = updates.find(u => u.productId === p.id);
      if (!update) return p;
      return { ...p, currentStock: p.currentStock + update.quantityReceived };
    }));
  };

  const handleCreateVoucher = async (voucher: Omit<Voucher, 'id'>) => {
    try {
      const body = {
        type: voucher.type,
        number: voucher.number,
        supplierId: parseInt(voucher.supplierId),
        purchaseOrderId: voucher.purchaseOrderId ? parseInt(voucher.purchaseOrderId) : null,
        issueDate: voucher.issueDate,
        dueDate: voucher.dueDate || null,
        ivaAmount: voucher.ivaAmount || 0,
        total: voucher.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 + item.ivaPercent / 100)), 0),
        status: voucher.status || 'pending',
        attachmentUrl: voucher.attachmentUrl || null,
        attachmentName: voucher.attachmentName || null,
        items: voucher.items.map(item => ({
          productId: item.productId ? parseInt(item.productId) : null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          ivaPercent: item.ivaPercent || 21
        }))
      };

      const result = await api.createVoucher(body);
      const newVoucher: Voucher = { ...voucher, id: result.id || Date.now().toString() };
      setVouchers(prev => [...prev, newVoucher]);
      await refreshVouchers();
      setInitialVoucherOrderId(undefined);
    } catch (error) {
      console.error('Error al crear comprobante:', error);
      alert('Error al guardar el comprobante. Intenta nuevamente.');
    }
  };

  const handleCreatePayment = async (payment: Omit<Payment, 'id'>) => {
    try {
      const body = {
        voucherId: payment.voucherId ? parseInt(payment.voucherId) : null,
        supplierId: parseInt(payment.supplierId),
        purchaseOrderId: payment.purchaseOrderId ? parseInt(payment.purchaseOrderId) : null,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method || 'transfer',
        bankOrigin: payment.bankOrigin || '',
        transferNumber: payment.transferNumber || '',
        reference: payment.reference || '',
        attachmentUrl: payment.attachmentUrl || null,
        attachmentName: payment.attachmentName || null
      };

      const result = await api.createPayment(body);
      const newPayment: Payment = { ...payment, id: result.id || Date.now().toString() };
      setPayments(prev => [...prev, newPayment]);
      
      setVouchers(prev => prev.map(v =>
        v.id === payment.voucherId ? { ...v, status: 'paid' as const } : v
      ));
      
      await refreshPayments();
    } catch (error) {
      console.error('Error al crear pago:', error);
      alert('Error al guardar el pago. Intenta nuevamente.');
    }
  };

  const handleLoadInvoice = (orderId: string) => {
    setInitialVoucherOrderId(orderId);
    setCurrentView('vouchers');
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // ═══════════════════════════════════════════════
  //  NAVEGACIÓN
  // ═══════════════════════════════════════════════

  const getStockStatus = (product: Product): StockStatus => {
    if (product.currentStock < product.minStock * 0.25) return "critico";
    if (product.currentStock < product.minStock) return "bajo";
    return "normal";
  };

  const navigateBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = [...viewHistory];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setCurrentView(previousView);
    } else {
      setCurrentView("dashboard");
    }
  };

  const handleLogin = (email: string, password: string) => {
    setUserName(email.split("@")[0]);
    setIsAuthenticated(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView("product-form");
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setCurrentView("product-form");
  };

  const handleNewMovement = (type: "entrada" | "salida") => {
    setMovementType(type);
    setCurrentView("movement");
  };

  const handleCancelForm = () => {
    setSelectedProduct(null);
    setCurrentView(currentView === "product-form" ? "products" : "dashboard");
  };

  const handleNavigateToProducts = (filter: "all" | "critico" | "bajo" = "all") => {
    setProductFilter(filter);
    setCurrentView("products");
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleNavigateToMovement = (type: "entrada" | "salida") => {
    setMovementType(type);
    setCurrentView("movement");
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleNewSupplier = () => {
    setSelectedSupplier(null);
    setCurrentView("supplier-form");
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setCurrentView("supplier-form");
  };

  const handleCancelSupplierForm = () => {
    setSelectedSupplier(null);
    setCurrentView("suppliers");
  };

  // ═══════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 hover:bg-muted rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="bg-primary p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg md:text-xl font-semibold">Inventario</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-muted rounded-lg transition"
            aria-label="Cambiar tema"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary" />}
          </button>
          <div className="text-sm text-muted-foreground hidden md:block">{userName} — Encargada</div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="p-2 hover:bg-destructive/10 rounded-lg transition text-destructive"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`
            fixed lg:sticky top-[64px] left-0 h-[calc(100vh-64px)] z-30
            bg-sidebar border-r border-sidebar-border
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-64 translate-x-0" : "w-0 lg:w-20 -translate-x-full lg:translate-x-0"}
            overflow-hidden overflow-y-auto
          `}
        >
          <nav className="p-2">
            <div className={`text-xs text-muted-foreground mb-2 px-3 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-0"}`}>
              PRINCIPAL
            </div>
            <button
              onClick={() => { setCurrentView("dashboard"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex ${sidebarOpen ? "flex-row items-center gap-3 px-3 py-2.5" : "lg:flex-col lg:items-center lg:gap-1 lg:px-2 lg:py-3"} rounded-lg mb-1 transition ${
                currentView === "dashboard" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              <span className={`${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100 text-xs"} whitespace-nowrap transition-opacity`}>Dashboard</span>
            </button>
            <button
              onClick={() => { setCurrentView("products"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex ${sidebarOpen ? "flex-row items-center gap-3 px-3 py-2.5" : "lg:flex-col lg:items-center lg:gap-1 lg:px-2 lg:py-3"} rounded-lg mb-1 transition ${
                currentView === "products" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`}
            >
              <Package className="w-5 h-5 flex-shrink-0" />
              <span className={`${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100 text-xs"} whitespace-nowrap transition-opacity`}>Productos</span>
            </button>

            <div className="mb-4">
              <button
                onClick={() => { if (sidebarOpen) { setComprasExpanded(!comprasExpanded); } else { setSidebarOpen(true); setComprasExpanded(true); } }}
                className={`w-full flex ${sidebarOpen ? "flex-row items-center gap-3 px-3 py-2.5" : "lg:flex-col lg:items-center lg:gap-1 lg:px-2 lg:py-3"} rounded-lg mb-1 transition hover:bg-sidebar-accent text-sidebar-foreground`}
              >
                <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                <span className={`${sidebarOpen ? "opacity-100 flex-1 text-left" : "opacity-0 lg:opacity-100 text-xs"} whitespace-nowrap transition-opacity`}>Compras</span>
                {sidebarOpen && <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${comprasExpanded ? "rotate-180" : ""}`} />}
              </button>

              {comprasExpanded && sidebarOpen && (
                <div className="ml-4 border-l border-sidebar-border pl-2">
                  <button
                    onClick={() => { setCurrentView("purchase-orders"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition text-sm ${
                      currentView === "purchase-orders" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 flex-shrink-0" />
                    <span>Órdenes de compra</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView("suppliers"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition text-sm ${
                      currentView === "suppliers" || currentView === "supplier-form" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <Truck className="w-4 h-4 flex-shrink-0" />
                    <span>Proveedores</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView("vouchers"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition text-sm ${
                      currentView === "vouchers" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span>Comprobantes</span>
                  </button>
                  <button
                    onClick={() => { setCurrentView("payments"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition text-sm ${
                      currentView === "payments" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    <span>Pagos</span>
                  </button>
                </div>
              )}
            </div>

            <div className={`text-xs text-muted-foreground mb-2 px-3 transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-0"}`}>
              ALARMAS
            </div>
            <button
              onClick={() => { setCurrentView("reorder"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex ${sidebarOpen ? "flex-row items-center gap-3 px-3 py-2.5" : "lg:flex-col lg:items-center lg:gap-1 lg:px-2 lg:py-3"} rounded-lg mb-4 transition ${
                currentView === "reorder" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`}
            >
              <Bell className="w-5 h-5 flex-shrink-0" />
              <span className={`${sidebarOpen ? "opacity-100" : "opacity-0 lg:opacity-100 text-xs"} whitespace-nowrap transition-opacity`}>Reposición</span>
            </button>
          </nav>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden top-[64px]" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-64px)] overflow-x-hidden">
          {currentView === "dashboard" && (
            <Dashboard
              products={products}
              movements={movements}
              getStockStatus={getStockStatus}
              onNavigateToReorder={() => { setCurrentView("reorder"); if (window.innerWidth < 1024) setSidebarOpen(false); }}
              onNavigateToProducts={handleNavigateToProducts}
              onNavigateToMovement={handleNavigateToMovement}
            />
          )}
          {currentView === "products" && (
            <ProductList
              products={products}
              suppliers={suppliers}
              getStockStatus={getStockStatus}
              onEditProduct={handleEditProduct}
              onNewProduct={handleNewProduct}
              onNavigateBack={navigateBack}
              initialFilter={productFilter}
              onUpdateProducts={(updated) => setProducts(updated)}
            />
          )}
          {currentView === "product-form" && (
            <ProductForm
              product={selectedProduct}
              categories={CATEGORIES}
              suppliers={suppliers}
              movements={movements}
              onSave={handleSaveProduct}
              onDelete={handleDeleteProduct}
              onCancel={handleCancelForm}
              onNavigateBack={navigateBack}
              getStockStatus={getStockStatus}
            />
          )}
          {currentView === "movement" && (
            <MovementForm
              type={movementType}
              products={products}
              getStockStatus={getStockStatus}
              onSave={handleSaveMovement}
              onCancel={() => setCurrentView("dashboard")}
              onNavigateBack={navigateBack}
            />
          )}
          {currentView === "reorder" && (
            <ReorderList
              products={products}
              suppliers={suppliers}
              getStockStatus={getStockStatus}
              onNavigateBack={navigateBack}
              onCreateOrder={handleCreateOrder}
              onSendOrder={handleSendOrder}
              sentOrders={purchaseOrders.filter(o => o.status === 'sent')}
            />
          )}
          {currentView === "suppliers" && (
            <SupplierList
              suppliers={suppliers}
              onNewSupplier={handleNewSupplier}
              onEditSupplier={handleEditSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onUpdateSuppliers={handleUpdateSuppliers}
            />
          )}
          {currentView === "supplier-form" && (
            <SupplierForm
              supplier={selectedSupplier}
              onSave={handleSaveSupplier}
              onCancel={handleCancelSupplierForm}
              onSuppliersUpdated={refreshSuppliers}
            />
          )}
          {currentView === "purchase-orders" && (
            <PurchaseOrders
              products={products}
              suppliers={suppliers}
              orders={purchaseOrders}
              onCreateOrder={handleCreateOrder}
              onUpdateOrder={handleUpdateOrder}
              onUpdateProducts={handleUpdateProducts}
              onLoadInvoice={handleLoadInvoice}
            />
          )}
          {currentView === "vouchers" && (
            <Vouchers
              key={initialVoucherOrderId ?? 'vouchers'}
              products={products}
              suppliers={suppliers}
              vouchers={vouchers}
              purchaseOrders={purchaseOrders}
              onCreateVoucher={(v) => { handleCreateVoucher(v); setInitialVoucherOrderId(undefined); }}
              initialPurchaseOrderId={initialVoucherOrderId}
            />
          )}
          {currentView === "payments" && (
            <Payments
              suppliers={suppliers}
              vouchers={vouchers}
              payments={payments}
              purchaseOrders={purchaseOrders}
              onCreatePayment={handleCreatePayment}
              onUpdatePayments={(updated: Payment[]) => setPayments(updated)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
