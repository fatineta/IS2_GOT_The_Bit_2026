-- Limpiar todo si existe
DROP DATABASE IF EXISTS FERRETERIA_DB;
CREATE DATABASE FERRETERIA_DB;
USE FERRETERIA_DB;

-- 1. Tablas independientes (sin FK)
CREATE TABLE tbltipo_usuario (
    idTipo_usuario TINYINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(45) NOT NULL
);

CREATE TABLE tbltipo_identificacion (
    idTipo_Id TINYINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(45) NOT NULL
);

CREATE TABLE tblestado (
    idEstado TINYINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(45) NOT NULL
);

CREATE TABLE tblcategoria (
    idCategoria TINYINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL
);

CREATE TABLE tblmarca (
    idMarca SMALLINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL
);

-- 2. Tabla usuarios (depende de tipo_usuario y tipo_identificacion)
CREATE TABLE tblusuarios (
    idUsuario INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tipo_identificacion TINYINT NOT NULL,
    identificacion VARCHAR(20) NOT NULL UNIQUE,
    nombres VARCHAR(100) NULL,
    apellido_paterno VARCHAR(45) NULL,
    apellido_materno VARCHAR(45) NULL,
    razon_social VARCHAR(100) NULL,
    direccion VARCHAR(150) NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    tipo_usuario TINYINT NOT NULL,
    password VARCHAR(255) NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tipo_usuario) REFERENCES tbltipo_usuario(idTipo_usuario),
    FOREIGN KEY (tipo_identificacion) REFERENCES tbltipo_identificacion(idTipo_Id)
);

-- 3. Tabla productos (depende de categoria, usuario, estado, marca)
CREATE TABLE tblproductos (
    idProducto INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo_sku VARCHAR(50) UNIQUE NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    marca_id SMALLINT NULL,
    categoria_id TINYINT NOT NULL,
    proveedor_id INT NULL,
    precio_compra DECIMAL(10,2) NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'unidades',
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    stock_maximo INT NULL,
    punto_reorden INT NULL,
    estado_id TINYINT NOT NULL DEFAULT 1,
    imagen VARCHAR(255) NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES tblcategoria(idCategoria),
    FOREIGN KEY (proveedor_id) REFERENCES tblusuarios(idUsuario),
    FOREIGN KEY (estado_id) REFERENCES tblestado(idEstado),
    FOREIGN KEY (marca_id) REFERENCES tblmarca(idMarca)
);

-- 4. Tabla ventas
CREATE TABLE tblventas (
    idVenta INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    numero_venta INT NOT NULL UNIQUE,
    total DECIMAL(12,2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    vendedor_id INT NOT NULL,
    cliente_id INT NOT NULL,
    estado_id TINYINT NOT NULL,
    FOREIGN KEY (vendedor_id) REFERENCES tblusuarios(idUsuario),
    FOREIGN KEY (cliente_id) REFERENCES tblusuarios(idUsuario),
    FOREIGN KEY (estado_id) REFERENCES tblestado(idEstado)
);

-- 5. Detalle ventas
CREATE TABLE tbldetalle_ventas (
    idDetalle INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES tblventas(idVenta),
    FOREIGN KEY (producto_id) REFERENCES tblproductos(idProducto)
);

-- 6. Entradas (compras)
CREATE TABLE tblentradas (
    idEntrada INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(50) NOT NULL UNIQUE,
    total DECIMAL(12,2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    estado_id TINYINT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES tblusuarios(idUsuario),
    FOREIGN KEY (proveedor_id) REFERENCES tblusuarios(idUsuario),
    FOREIGN KEY (estado_id) REFERENCES tblestado(idEstado)
);

-- 7. Detalle entradas
CREATE TABLE tbldetalle_entradas (
    idDetalle INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    entrada_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (entrada_id) REFERENCES tblentradas(idEntrada),
    FOREIGN KEY (producto_id) REFERENCES tblproductos(idProducto)
);

-- 8. Movimientos stock
CREATE TABLE tblmovimientos_stock (
    idMovimiento INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    tipo ENUM('ENTRADA', 'SALIDA', 'AJUSTE') NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_nuevo INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INT NOT NULL,
    referencia_id INT NULL,
    comentario VARCHAR(255) NULL,
    FOREIGN KEY (producto_id) REFERENCES tblproductos(idProducto)
);

-- 9. Alertas stock
CREATE TABLE tblalertas_stock (
    idAlerta INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    stock_actual INT NOT NULL,
    punto_reorden INT NOT NULL,
    fecha_alerta DATETIME DEFAULT CURRENT_TIMESTAMP,
    procesada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (producto_id) REFERENCES tblproductos(idProducto)
);

-- 10. Insertar datos básicos
INSERT INTO tbltipo_usuario (descripcion) VALUES 
('Administrador'), ('Vendedor'), ('Cliente'), ('Proveedor');

INSERT INTO tbltipo_identificacion (descripcion) VALUES 
('DNI'), ('CUIT'), ('CUIL'), ('Pasaporte');

INSERT INTO tblestado (descripcion) VALUES 
('Activo'), ('Inactivo'), ('Pendiente'), ('Finalizado'), ('Cancelado');

INSERT INTO tblcategoria (descripcion) VALUES ('Materiales de Construcción');

INSERT INTO tblmarca (nombre) VALUES ('Genérica');

INSERT INTO tblusuarios (tipo_identificacion, identificacion, nombres, tipo_usuario) VALUES 
(1, 'ADMIN001', 'Administrador', 1),
(1, 'CLI001', 'Cliente Test', 3),
(2, 'PROV001', 'Proveedor Test', 4);

INSERT INTO tblproductos (nombre, stock_actual, stock_minimo, stock_maximo, punto_reorden, proveedor_id, categoria_id, precio_venta, estado_id) VALUES
('Cemento Portland 42.5kg', 50, 10, 200, 30, 3, 1, 25.50, 1),
('Varilla 3/8" x 6m', 40, 8, 150, 25, 3, 1, 15.00, 1);

SELECT 'TABLAS CREADAS EXITOSAMENTE' as Mensaje;
SHOW TABLES;