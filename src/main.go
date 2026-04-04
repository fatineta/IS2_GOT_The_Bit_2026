package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var db *sql.DB

// ==================== ESTRUCTURAS ====================

type Producto struct {
	IDProducto   int64   `json:"id"`
	CodigoSKU    string  `json:"sku"`
	Nombre       string  `json:"nombre"`
	MarcaID      int64   `json:"marca_id"`
	CategoriaID  int64   `json:"categoria_id"`
	ProveedorID  int64   `json:"proveedor_id"`
	PrecioCompra float64 `json:"precio_compra"`
	PrecioVenta  float64 `json:"precio_venta"`
	UnidadMedida string  `json:"unidad_medida"`
	StockActual  int     `json:"stock_actual"`
	StockMinimo  int     `json:"stock_minimo"`
	StockMaximo  int     `json:"stock_maximo"`
	PuntoReorden int     `json:"punto_reorden"`
	EstadoID     int64   `json:"estado_id"`
}

type AlertaStock struct {
	IDAlerta     int       `json:"id"`
	ProductoID   int64     `json:"producto_id"`
	NombreProd   string    `json:"producto_nombre"`
	StockActual  int       `json:"stock_actual"`
	PuntoReorden int       `json:"punto_reorden"`
	FechaAlerta  time.Time `json:"fecha_alerta"`
}

type Movimiento struct {
	Tipo        string    `json:"tipo"`
	Cantidad    int       `json:"cantidad"`
	StockAntes  int       `json:"stock_antes"`
	StockDespues int      `json:"stock_despues"`
	Fecha       time.Time `json:"fecha"`
	Comentario  string    `json:"comentario"`
}

type DashboardStats struct {
	TotalProductos  int `json:"total_productos"`
	StockCritico    int `json:"stock_critico"`
	StockBajo       int `json:"stock_bajo"`
	MovimientosHoy  int `json:"movimientos_hoy"`
}

type DetallePedido struct {
	ProductoID     int64   `json:"producto_id"`
	Cantidad       int     `json:"cantidad"`
	PrecioUnitario float64 `json:"precio_unitario"`
	Subtotal       float64 `json:"subtotal"`
	ProductoNombre string  `json:"producto_nombre"`
}

type Pedido struct {
	IDVenta      int64           `json:"id_venta"`
	NumeroVenta  int             `json:"numero_venta"`
	Total        float64         `json:"total"`
	Fecha        time.Time       `json:"fecha"`
	VendedorID   int64           `json:"vendedor_id"`
	ClienteID    int64           `json:"cliente_id"`
	EstadoID     int64           `json:"estado_id"`
	EstadoActual EstadoPedido    `json:"-"`
	EstadoNombre string          `json:"estado"`
	Items        []DetallePedido `json:"items"`
}

// ==================== PATRON STATE ====================

type EstadoPedido interface {
	Procesar(p *Pedido) error
	Pagar(p *Pedido) error
	Entregar(p *Pedido) error
	Cancelar(p *Pedido) error
	EnviarAlmacen(p *Pedido) error
	GetNombre() string
}

type PendienteState struct{}
type ConfirmadoState struct{}
type PagadoState struct{}
type EnAlmacenState struct{}
type EntregadoState struct{}
type CanceladoState struct{}

func (s *PendienteState) Procesar(pedido *Pedido) error {
	for _, item := range pedido.Items {
		stock, err := GetStockProducto(item.ProductoID)
		if err != nil {
			return err
		}
		if stock < item.Cantidad {
			return fmt.Errorf("stock insuficiente para '%s' (disponible: %d, requerido: %d)",
				item.ProductoNombre, stock, item.Cantidad)
		}
	}
	pedido.EstadoActual = &ConfirmadoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 2)
	return nil
}
func (s *PendienteState) Pagar(p *Pedido) error        { return errors.New("primero debe procesar el pedido") }
func (s *PendienteState) Entregar(p *Pedido) error     { return errors.New("pedido no procesado") }
func (s *PendienteState) EnviarAlmacen(p *Pedido) error { return errors.New("primero confirme el pedido") }
func (s *PendienteState) Cancelar(pedido *Pedido) error {
	pedido.EstadoActual = &CanceladoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 5)
	return nil
}
func (s *PendienteState) GetNombre() string { return "PENDIENTE" }

func (s *ConfirmadoState) Procesar(p *Pedido) error { return errors.New("ya confirmado") }
func (s *ConfirmadoState) Pagar(pedido *Pedido) error {
	pedido.EstadoActual = &PagadoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 3)
	return nil
}
func (s *ConfirmadoState) Entregar(p *Pedido) error { return errors.New("pague primero") }
func (s *ConfirmadoState) Cancelar(pedido *Pedido) error {
	pedido.EstadoActual = &CanceladoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 5)
	return nil
}
func (s *ConfirmadoState) EnviarAlmacen(pedido *Pedido) error {
	pedido.EstadoActual = &EnAlmacenState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 4)
	return nil
}
func (s *ConfirmadoState) GetNombre() string { return "CONFIRMADO" }

func (s *PagadoState) Procesar(p *Pedido) error      { return errors.New("ya pagado") }
func (s *PagadoState) Pagar(p *Pedido) error          { return errors.New("ya pagado") }
func (s *PagadoState) Entregar(p *Pedido) error       { return errors.New("envíe a almacén primero") }
func (s *PagadoState) Cancelar(pedido *Pedido) error {
	pedido.EstadoActual = &CanceladoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 5)
	return nil
}
func (s *PagadoState) EnviarAlmacen(pedido *Pedido) error {
	pedido.EstadoActual = &EnAlmacenState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 4)
	return nil
}
func (s *PagadoState) GetNombre() string { return "PAGADO" }

func (s *EnAlmacenState) Procesar(p *Pedido) error      { return errors.New("ya en almacén") }
func (s *EnAlmacenState) Pagar(p *Pedido) error          { return errors.New("ya pagado") }
func (s *EnAlmacenState) EnviarAlmacen(p *Pedido) error  { return errors.New("ya está en almacén") }
func (s *EnAlmacenState) Cancelar(pedido *Pedido) error {
	pedido.EstadoActual = &CanceladoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 5)
	return nil
}
func (s *EnAlmacenState) Entregar(pedido *Pedido) error {
	for _, item := range pedido.Items {
		ActualizarStockDefinitivo(item.ProductoID, item.Cantidad, pedido.IDVenta)
	}
	pedido.EstadoActual = &EntregadoState{}
	pedido.EstadoNombre = pedido.EstadoActual.GetNombre()
	ActualizarEstadoPedido(pedido.IDVenta, 4)
	return nil
}
func (s *EnAlmacenState) GetNombre() string { return "EN_ALMACEN" }

func (s *EntregadoState) Procesar(p *Pedido) error      { return errors.New("ya entregado") }
func (s *EntregadoState) Pagar(p *Pedido) error          { return errors.New("ya entregado") }
func (s *EntregadoState) Entregar(p *Pedido) error       { return errors.New("ya entregado") }
func (s *EntregadoState) Cancelar(p *Pedido) error       { return errors.New("no se puede cancelar") }
func (s *EntregadoState) EnviarAlmacen(p *Pedido) error  { return errors.New("ya entregado") }
func (s *EntregadoState) GetNombre() string               { return "ENTREGADO" }

func (s *CanceladoState) Procesar(p *Pedido) error      { return errors.New("pedido cancelado") }
func (s *CanceladoState) Pagar(p *Pedido) error          { return errors.New("pedido cancelado") }
func (s *CanceladoState) Entregar(p *Pedido) error       { return errors.New("pedido cancelado") }
func (s *CanceladoState) Cancelar(p *Pedido) error       { return errors.New("ya cancelado") }
func (s *CanceladoState) EnviarAlmacen(p *Pedido) error  { return errors.New("pedido cancelado") }
func (s *CanceladoState) GetNombre() string               { return "CANCELADO" }

// Cache de pedidos activos en memoria (en producción usaría Redis o persistencia)
var pedidosActivos = map[int64]*Pedido{}

func estadoDesdeNombre(nombre string) EstadoPedido {
	switch nombre {
	case "CONFIRMADO":
		return &ConfirmadoState{}
	case "PAGADO":
		return &PagadoState{}
	case "EN_ALMACEN":
		return &EnAlmacenState{}
	case "ENTREGADO":
		return &EntregadoState{}
	case "CANCELADO":
		return &CanceladoState{}
	default:
		return &PendienteState{}
	}
}

// ==================== PATRON OBSERVER ====================

type StockObserver interface {
	Update(p *ProductoFerreteria)
}

type ProductoFerreteria struct {
	*Producto
	observers []StockObserver
}

func NewProductoFerreteria(p *Producto) *ProductoFerreteria {
	return &ProductoFerreteria{Producto: p, observers: []StockObserver{}}
}

func (p *ProductoFerreteria) AddObserver(o StockObserver) {
	p.observers = append(p.observers, o)
}

func (p *ProductoFerreteria) SetStockActual(nuevo int) error {
	anterior := p.StockActual
	p.StockActual = nuevo
	if err := ActualizarStockProducto(p.IDProducto, nuevo); err != nil {
		return err
	}
	RegistrarMovimientoStock(p.IDProducto, anterior, nuevo, "AJUSTE")
	if nuevo <= p.PuntoReorden && anterior > p.PuntoReorden {
		p.notifyObservers()
	}
	return nil
}

func (p *ProductoFerreteria) notifyObservers() {
	for _, o := range p.observers {
		o.Update(p)
	}
}

type SistemaNotificacionesObserver struct{}

func (s *SistemaNotificacionesObserver) Update(p *ProductoFerreteria) {
	RegistrarAlertaStock(p.IDProducto, p.StockActual, p.PuntoReorden)
}

// ==================== FUNCIONES DB ====================

func GetStockProducto(id int64) (int, error) {
	var stock int
	err := db.QueryRow("SELECT stock_actual FROM tblproductos WHERE idProducto = ?", id).Scan(&stock)
	return stock, err
}

func ActualizarStockProducto(id int64, nuevo int) error {
	_, err := db.Exec("UPDATE tblproductos SET stock_actual = ? WHERE idProducto = ?", nuevo, id)
	return err
}

func ActualizarEstadoPedido(ventaID, estadoID int64) error {
	_, err := db.Exec("UPDATE tblventas SET estado_id = ? WHERE idVenta = ?", estadoID, ventaID)
	return err
}

func ActualizarStockDefinitivo(productoID int64, cantidad int, ventaID int64) error {
	result, err := db.Exec(
		"UPDATE tblproductos SET stock_actual = stock_actual - ? WHERE idProducto = ? AND stock_actual >= ?",
		cantidad, productoID, cantidad)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("stock insuficiente")
	}
	_, err = db.Exec(`INSERT INTO tblmovimientos_stock 
		(producto_id, tipo, cantidad, stock_anterior, stock_nuevo, usuario_id, referencia_id, comentario) 
		SELECT ?, 'SALIDA', ?, stock_actual + ?, stock_actual, 1, ?, 'Venta realizada' 
		FROM tblproductos WHERE idProducto = ?`,
		productoID, cantidad, cantidad, ventaID, productoID)
	return err
}

func RegistrarMovimientoStock(prodID int64, anterior, nuevo int, tipo string) error {
	cant := nuevo - anterior
	if cant < 0 {
		cant = -cant
	}
	_, err := db.Exec(`INSERT INTO tblmovimientos_stock 
		(producto_id, tipo, cantidad, stock_anterior, stock_nuevo, usuario_id, comentario) 
		VALUES (?, ?, ?, ?, ?, 1, 'Actualización manual')`,
		prodID, tipo, cant, anterior, nuevo)
	return err
}

func RegistrarAlertaStock(prodID int64, stockActual, puntoReorden int) error {
	_, err := db.Exec(`INSERT INTO tblalertas_stock (producto_id, stock_actual, punto_reorden, procesada) 
		VALUES (?, ?, ?, false)`, prodID, stockActual, puntoReorden)
	return err
}

func nullStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func nullInt(i int64) interface{} {
	if i == 0 {
		return nil
	}
	return i
}

// ==================== HANDLERS ====================

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func jsonOK(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// GET /api/dashboard
func handleDashboard(w http.ResponseWriter, r *http.Request) {
	var stats DashboardStats

	db.QueryRow("SELECT COUNT(*) FROM tblproductos WHERE estado_id = 1").Scan(&stats.TotalProductos)
	db.QueryRow(`SELECT COUNT(*) FROM tblproductos 
		WHERE estado_id = 1 AND stock_actual > 0 AND stock_actual <= stock_minimo / 2`).Scan(&stats.StockCritico)
	db.QueryRow(`SELECT COUNT(*) FROM tblproductos 
		WHERE estado_id = 1 AND stock_actual > stock_minimo / 2 AND stock_actual <= stock_minimo`).Scan(&stats.StockBajo)
	db.QueryRow(`SELECT COUNT(*) FROM tblmovimientos_stock WHERE DATE(fecha) = CURDATE()`).Scan(&stats.MovimientosHoy)

	// Productos con stock crítico para la tabla del dashboard
	rows, err := db.Query(`
		SELECT idProducto, nombre, stock_actual, stock_minimo
		FROM tblproductos
		WHERE estado_id = 1 AND stock_actual <= punto_reorden
		ORDER BY stock_actual ASC LIMIT 10`)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	type ProdAlerta struct {
		ID          int64  `json:"id"`
		Nombre      string `json:"nombre"`
		StockActual int    `json:"stock_actual"`
		StockMinimo int    `json:"stock_minimo"`
	}
	var criticos []ProdAlerta
	for rows.Next() {
		var p ProdAlerta
		rows.Scan(&p.ID, &p.Nombre, &p.StockActual, &p.StockMinimo)
		criticos = append(criticos, p)
	}

	jsonOK(w, map[string]interface{}{
		"stats":   stats,
		"criticos": criticos,
	})
}

// GET /api/productos
func handleListarProductos(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT idProducto, COALESCE(codigo_sku,''), nombre, COALESCE(marca_id,0),
		       categoria_id, COALESCE(proveedor_id,0), COALESCE(precio_compra,0),
		       precio_venta, unidad_medida, stock_actual, stock_minimo,
		       COALESCE(stock_maximo,0), COALESCE(punto_reorden,0), estado_id
		FROM tblproductos WHERE estado_id = 1 ORDER BY nombre`)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var productos []Producto
	for rows.Next() {
		var p Producto
		rows.Scan(&p.IDProducto, &p.CodigoSKU, &p.Nombre, &p.MarcaID, &p.CategoriaID,
			&p.ProveedorID, &p.PrecioCompra, &p.PrecioVenta, &p.UnidadMedida,
			&p.StockActual, &p.StockMinimo, &p.StockMaximo, &p.PuntoReorden, &p.EstadoID)
		productos = append(productos, p)
	}
	if productos == nil {
		productos = []Producto{}
	}
	jsonOK(w, productos)
}

// POST /api/productos
func handleCrearProducto(w http.ResponseWriter, r *http.Request) {
	var p Producto
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		jsonErr(w, "JSON inválido", 400)
		return
	}
	if p.Nombre == "" || p.PrecioVenta <= 0 {
		jsonErr(w, "nombre y precio_venta son obligatorios", 400)
		return
	}
	if p.UnidadMedida == "" {
		p.UnidadMedida = "unidades"
	}
	if p.CategoriaID == 0 {
		p.CategoriaID = 1
	}
	result, err := db.Exec(`INSERT INTO tblproductos 
		(codigo_sku, nombre, categoria_id, proveedor_id, precio_compra, precio_venta,
		 unidad_medida, stock_actual, stock_minimo, stock_maximo, punto_reorden, estado_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
		nullStr(p.CodigoSKU), p.Nombre, p.CategoriaID, nullInt(p.ProveedorID),
		p.PrecioCompra, p.PrecioVenta, p.UnidadMedida,
		p.StockActual, p.StockMinimo, nullInt(int64(p.StockMaximo)), p.PuntoReorden)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	id, _ := result.LastInsertId()
	p.IDProducto = id
	jsonOK(w, p)
}

// PUT /api/productos/{id}/stock
func handleMovimientoStock(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, "ID inválido", 400)
		return
	}

	var body struct {
		Tipo     string `json:"tipo"`     // "ENTRADA" | "SALIDA" | "AJUSTE"
		Cantidad int    `json:"cantidad"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonErr(w, "JSON inválido", 400)
		return
	}

	var p Producto
	err = db.QueryRow(`
		SELECT idProducto, COALESCE(codigo_sku,''), nombre, COALESCE(marca_id,0),
		       categoria_id, COALESCE(proveedor_id,0), COALESCE(precio_compra,0),
		       precio_venta, unidad_medida, stock_actual, stock_minimo,
		       COALESCE(stock_maximo,0), COALESCE(punto_reorden,0), estado_id
		FROM tblproductos WHERE idProducto = ?`, id).Scan(
		&p.IDProducto, &p.CodigoSKU, &p.Nombre, &p.MarcaID, &p.CategoriaID,
		&p.ProveedorID, &p.PrecioCompra, &p.PrecioVenta, &p.UnidadMedida,
		&p.StockActual, &p.StockMinimo, &p.StockMaximo, &p.PuntoReorden, &p.EstadoID)
	if err != nil {
		jsonErr(w, "Producto no encontrado", 404)
		return
	}

	var nuevoStock int
	switch body.Tipo {
	case "ENTRADA":
		nuevoStock = p.StockActual + body.Cantidad
	case "SALIDA":
		if body.Cantidad > p.StockActual {
			jsonErr(w, fmt.Sprintf("stock insuficiente (disponible: %d)", p.StockActual), 400)
			return
		}
		nuevoStock = p.StockActual - body.Cantidad
	case "AJUSTE":
		nuevoStock = body.Cantidad
	default:
		jsonErr(w, "tipo debe ser ENTRADA, SALIDA o AJUSTE", 400)
		return
	}

	prod := NewProductoFerreteria(&p)
	prod.AddObserver(&SistemaNotificacionesObserver{})

	if body.Tipo == "ENTRADA" {
		ActualizarStockProducto(id, nuevoStock)
		RegistrarMovimientoStock(id, p.StockActual, nuevoStock, "ENTRADA")
	} else {
		prod.SetStockActual(nuevoStock)
	}

	alertaGenerada := nuevoStock <= p.PuntoReorden && p.StockActual > p.PuntoReorden

	jsonOK(w, map[string]interface{}{
		"stock_anterior": p.StockActual,
		"stock_nuevo":    nuevoStock,
		"alerta_generada": alertaGenerada,
		"mensaje":        fmt.Sprintf("Stock actualizado de %d a %d", p.StockActual, nuevoStock),
	})
}

// PUT /api/productos/{id}/umbrales
func handleActualizarUmbrales(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, "ID inválido", 400)
		return
	}
	var body struct {
		StockMinimo  int `json:"stock_minimo"`
		StockMaximo  int `json:"stock_maximo"`
		PuntoReorden int `json:"punto_reorden"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonErr(w, "JSON inválido", 400)
		return
	}
	_, err = db.Exec("UPDATE tblproductos SET stock_minimo=?, stock_maximo=?, punto_reorden=? WHERE idProducto=?",
		body.StockMinimo, body.StockMaximo, body.PuntoReorden, id)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	jsonOK(w, map[string]string{"mensaje": "Umbrales actualizados"})
}

// GET /api/alertas
func handleListarAlertas(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT a.idAlerta, a.producto_id, p.nombre, a.stock_actual, a.punto_reorden, a.fecha_alerta
		FROM tblalertas_stock a
		JOIN tblproductos p ON p.idProducto = a.producto_id
		WHERE a.procesada = false
		ORDER BY a.fecha_alerta DESC`)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var alertas []AlertaStock
	for rows.Next() {
		var a AlertaStock
		rows.Scan(&a.IDAlerta, &a.ProductoID, &a.NombreProd, &a.StockActual, &a.PuntoReorden, &a.FechaAlerta)
		alertas = append(alertas, a)
	}
	if alertas == nil {
		alertas = []AlertaStock{}
	}
	jsonOK(w, alertas)
}

// POST /api/alertas/{id}/procesar
func handleProcesarAlerta(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		jsonErr(w, "ID inválido", 400)
		return
	}

	var body struct {
		Accion   string `json:"accion"`   // "reabastecer" | "ignorar"
		Cantidad int    `json:"cantidad"` // solo para reabastecer
	}
	json.NewDecoder(r.Body).Decode(&body)

	if body.Accion == "reabastecer" {
		// obtener producto_id de la alerta
		var prodID int64
		var stockActual int
		db.QueryRow("SELECT producto_id, stock_actual FROM tblalertas_stock WHERE idAlerta = ?", id).
			Scan(&prodID, &stockActual)

		if body.Cantidad <= 0 {
			// calcular sugerido
			var stockMax int
			db.QueryRow("SELECT COALESCE(stock_maximo,0), punto_reorden FROM tblproductos WHERE idProducto = ?", prodID).
				Scan(&stockMax)
			body.Cantidad = stockMax - stockActual
			if body.Cantidad <= 0 {
				body.Cantidad = 50
			}
		}

		nuevoStock := stockActual + body.Cantidad
		ActualizarStockProducto(prodID, nuevoStock)
		RegistrarMovimientoStock(prodID, stockActual, nuevoStock, "ENTRADA")
	}

	db.Exec("UPDATE tblalertas_stock SET procesada = true WHERE idAlerta = ?", id)
	jsonOK(w, map[string]string{"mensaje": "Alerta procesada"})
}

// GET /api/movimientos?producto_id=X
func handleMovimientos(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("producto_id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, "producto_id inválido", 400)
		return
	}
	rows, err := db.Query(`
		SELECT tipo, cantidad, stock_anterior, stock_nuevo, fecha, COALESCE(comentario,'')
		FROM tblmovimientos_stock
		WHERE producto_id = ?
		ORDER BY fecha DESC LIMIT 30`, id)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var movs []Movimiento
	for rows.Next() {
		var m Movimiento
		rows.Scan(&m.Tipo, &m.Cantidad, &m.StockAntes, &m.StockDespues, &m.Fecha, &m.Comentario)
		movs = append(movs, m)
	}
	if movs == nil {
		movs = []Movimiento{}
	}
	jsonOK(w, movs)
}

// POST /api/pedidos
func handleCrearPedido(w http.ResponseWriter, r *http.Request) {
	var body struct {
		VendedorID int64           `json:"vendedor_id"`
		ClienteID  int64           `json:"cliente_id"`
		Items      []DetallePedido `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonErr(w, "JSON inválido", 400)
		return
	}
	if len(body.Items) == 0 {
		jsonErr(w, "el pedido debe tener al menos un item", 400)
		return
	}
	if body.VendedorID == 0 {
		body.VendedorID = 1
	}
	if body.ClienteID == 0 {
		body.ClienteID = 2
	}

	// enriquecer items con nombre y precio si faltan
	for i := range body.Items {
		var p Producto
		err := db.QueryRow("SELECT nombre, precio_venta FROM tblproductos WHERE idProducto = ?",
			body.Items[i].ProductoID).Scan(&p.Nombre, &p.PrecioVenta)
		if err != nil {
			jsonErr(w, fmt.Sprintf("producto %d no encontrado", body.Items[i].ProductoID), 404)
			return
		}
		body.Items[i].ProductoNombre = p.Nombre
		if body.Items[i].PrecioUnitario == 0 {
			body.Items[i].PrecioUnitario = p.PrecioVenta
		}
		body.Items[i].Subtotal = float64(body.Items[i].Cantidad) * body.Items[i].PrecioUnitario
	}

	var total float64
	for _, item := range body.Items {
		total += item.Subtotal
	}

	numeroVenta := rand.Intn(90000) + 10000
	result, err := db.Exec(`INSERT INTO tblventas (numero_venta, total, vendedor_id, cliente_id, estado_id) 
		VALUES (?, ?, ?, ?, 1)`, numeroVenta, total, body.VendedorID, body.ClienteID)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	ventaID, _ := result.LastInsertId()

	for _, item := range body.Items {
		db.Exec(`INSERT INTO tbldetalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
			VALUES (?, ?, ?, ?, ?)`,
			ventaID, item.ProductoID, item.Cantidad, item.PrecioUnitario, item.Subtotal)
	}

	pedido := &Pedido{
		IDVenta: ventaID, NumeroVenta: numeroVenta, Total: total,
		Fecha: time.Now(), VendedorID: body.VendedorID, ClienteID: body.ClienteID,
		EstadoID: 1, EstadoActual: &PendienteState{}, EstadoNombre: "PENDIENTE",
		Items: body.Items,
	}
	pedidosActivos[ventaID] = pedido

	jsonOK(w, pedido)
}

// POST /api/pedidos/{id}/accion
func handleAccionPedido(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonErr(w, "ID inválido", 400)
		return
	}

	var body struct {
		Accion string `json:"accion"` // procesar | pagar | almacen | entregar | cancelar
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonErr(w, "JSON inválido", 400)
		return
	}

	pedido, ok := pedidosActivos[id]
	if !ok {
		// reconstruir desde DB si no está en memoria
		var estadoID int64
		var items []DetallePedido
		err := db.QueryRow(`SELECT idVenta, numero_venta, total, vendedor_id, cliente_id, estado_id 
			FROM tblventas WHERE idVenta = ?`, id).Scan(
			&id, &id, &id, &id, &id, &estadoID)
		if err != nil {
			jsonErr(w, "Pedido no encontrado", 404)
			return
		}
		nombre := map[int64]string{1: "PENDIENTE", 2: "CONFIRMADO", 3: "PAGADO", 4: "EN_ALMACEN", 5: "CANCELADO"}[estadoID]
		pedido = &Pedido{IDVenta: id, EstadoActual: estadoDesdeNombre(nombre), EstadoNombre: nombre, Items: items}
		pedidosActivos[id] = pedido
	}

	var accionErr error
	switch body.Accion {
	case "procesar":
		accionErr = pedido.EstadoActual.Procesar(pedido)
	case "pagar":
		accionErr = pedido.EstadoActual.Pagar(pedido)
	case "almacen":
		accionErr = pedido.EstadoActual.EnviarAlmacen(pedido)
	case "entregar":
		accionErr = pedido.EstadoActual.Entregar(pedido)
	case "cancelar":
		accionErr = pedido.EstadoActual.Cancelar(pedido)
	default:
		jsonErr(w, "accion inválida", 400)
		return
	}

	if accionErr != nil {
		jsonErr(w, accionErr.Error(), 400)
		return
	}

	jsonOK(w, pedido)
}

// GET /api/reposicion
func handleReposicion(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT idProducto, nombre, stock_actual, stock_minimo, COALESCE(stock_maximo,0), COALESCE(punto_reorden,0)
		FROM tblproductos
		WHERE estado_id = 1 AND stock_actual <= punto_reorden
		ORDER BY stock_actual ASC`)
	if err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	type ItemRepo struct {
		ID          int64  `json:"id"`
		Nombre      string `json:"nombre"`
		StockActual int    `json:"stock_actual"`
		StockMinimo int    `json:"stock_minimo"`
		StockMaximo int    `json:"stock_maximo"`
		Faltante    int    `json:"faltante"`
		Urgencia    string `json:"urgencia"`
	}
	var items []ItemRepo
	for rows.Next() {
		var it ItemRepo
		rows.Scan(&it.ID, &it.Nombre, &it.StockActual, &it.StockMinimo, &it.StockMaximo, &it.Faltante)
		it.Faltante = it.StockMaximo - it.StockActual
		if it.Faltante < 0 {
			it.Faltante = it.StockMinimo * 2
		}
		if it.StockActual == 0 {
			it.Urgencia = "CRITICO"
		} else if it.StockActual <= it.StockMinimo/2 {
			it.Urgencia = "ALTA"
		} else {
			it.Urgencia = "MEDIA"
		}
		items = append(items, it)
	}
	if items == nil {
		items = []ItemRepo{}
	}
	jsonOK(w, items)
}

// ==================== MAIN ====================

func main() {
	user := os.Getenv("DBUSER")
	pass := os.Getenv("DBPASS")
	host := os.Getenv("DBHOST")
	dbName := os.Getenv("DBNAME")
	port := os.Getenv("PORT")

	if user == "" { user = "root" }
	if host == "" { host = "127.0.0.1:3306" }
	if dbName == "" { dbName = "FERRETERIA_DB" }
	if port == "" { port = "8080" }

	dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s?parseTime=true", user, pass, host, dbName)
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error abriendo conexión:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("No se pudo conectar a la base de datos: %v\nVariables: DBUSER, DBPASS, DBHOST, DBNAME\n", err)
	}
	log.Println("Conectado a la base de datos")

	// Servir el HTML estático
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})

	// API endpoints
	http.HandleFunc("/api/dashboard",         cors(handleDashboard))
	http.HandleFunc("/api/productos",          cors(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handleCrearProducto(w, r)
		} else {
			handleListarProductos(w, r)
		}
	}))
	http.HandleFunc("/api/productos/stock",    cors(handleMovimientoStock))
	http.HandleFunc("/api/productos/umbrales", cors(handleActualizarUmbrales))
	http.HandleFunc("/api/alertas",            cors(handleListarAlertas))
	http.HandleFunc("/api/alertas/procesar",   cors(handleProcesarAlerta))
	http.HandleFunc("/api/movimientos",        cors(handleMovimientos))
	http.HandleFunc("/api/pedidos",            cors(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			handleCrearPedido(w, r)
		}
	}))
	http.HandleFunc("/api/pedidos/accion",     cors(handleAccionPedido))
	http.HandleFunc("/api/reposicion",         cors(handleReposicion))

	log.Printf("Servidor corriendo en http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
