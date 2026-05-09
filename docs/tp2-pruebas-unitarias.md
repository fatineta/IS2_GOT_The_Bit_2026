# TP2 — Pruebas Unitarias con TDD

## Información general

| Campo | Detalle |
|---|---|
| Proyecto | Sistema de Gestión de Ferretería |
| Lenguaje | Go 1.22 |
| Archivo de pruebas | `test/unit/ferreteria_test.go` |
| Total de casos | 21 |
| Funciones cubiertas | 5 (`calcularNuevoStock`, `calcularUrgencia`, `validarProducto`, `estadoDesdeNombre`, `calcularFaltante`) + Patrón State (`EstadoPedido`) |

---

## Estrategia de pruebas

Las pruebas se organizan con **TDD** (Test-Driven Development):
la lógica de negocio pura fue extraída del `main.go` original en funciones
independientes (sin dependencias de base de datos), permitiendo verificarlas
de forma aislada.

Se aplican dos técnicas:

- **Partición de equivalencia**: se agrupa el dominio de entrada en clases cuyos valores se comportan de igual forma. Se elige un representante de cada clase.
- **Análisis de valores límite**: se prueban los extremos de cada clase (mínimo, máximo, justo debajo/arriba del umbral).

---

## Marco teórico

### ¿Qué es una clase de equivalencia y cómo se aplica para diseñar casos de prueba?

La clase de equivalencia es una técnica de diseño de pruebas de caja negra que consiste en dividir el conjunto total de posibles datos de entrada de un sistema en particiones lógicas. La premisa fundamental es que el software se comportará de la misma manera para cualquier valor que pertenezca a una misma partición, permitiendo que un solo dato represente a todo el grupo.

Para diseñar los casos de prueba, se identifican tanto las **clases válidas** (datos que el sistema debe procesar exitosamente) como las **clases inválidas** (datos erróneos que el sistema debe rechazar o manejar mediante excepciones). Al seleccionar un representante de cada clase, se logra una cobertura de pruebas eficiente y exhaustiva, reduciendo la redundancia de datos y optimizando el tiempo de ejecución de la suite de tests.

---

### ¿Qué es un valor límite y cómo se aplica para encontrar defectos?

El valor límite es una técnica de diseño de pruebas de caja negra que se enfoca en los extremos o fronteras de las clases de equivalencia. Su importancia radica en que, estadísticamente, la mayor cantidad de errores de software se concentran en los puntos donde el comportamiento del sistema cambia, habitualmente debido a fallos en la implementación de operadores relacionales (como usar `<` en lugar de `<=`).

Para identificar fallos de manera efectiva, esta técnica no se limita a probar el valor exacto del límite, sino que evalúa una "triangulación" en la frontera:

- **El valor límite exacto:** para verificar que el sistema cambie de estado en el punto preciso definido por la regla de negocio.
- **El valor inmediatamente anterior (Límite - 1):** para asegurar que el sistema mantiene el comportamiento previo justo antes de la transición.
- **El valor inmediatamente posterior (Límite + 1):** para confirmar que la nueva lógica se activa correctamente tras superar la frontera.

Al estresar estos bordes, el desarrollador puede detectar errores de "desplazamiento por uno" (*off-by-one errors*) que las pruebas generales suelen pasar por alto, garantizando que restricciones críticas como umbrales de stock, límites de crédito o capacidades de almacenamiento operen con precisión matemática. En el contexto del proyecto de la ferretería, esto asegura, por ejemplo, que una alerta de reposición se dispare exactamente cuando el `stock_actual` iguala al `stock_minimo`.

---

## Casos de prueba

### Función: `calcularNuevoStock(stockActual, cantidad int, tipo string) (int, error)`

Reproduce la lógica del `handleMovimientoStock` del sistema original.

---

#### TC-01 — ENTRADA válida

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `stockActual=10`, `cantidad=5`, `tipo="ENTRADA"` |
| **Resultado esperado** | `nuevoStock=15`, `error=nil` |
| **Nombre del test** | `TestCalcularNuevoStock_EntradaValida` |

Clase de equivalencia válida: `tipo = "ENTRADA"` con cantidad positiva suma correctamente al stock.

---

#### TC-02 — SALIDA exactamente igual al stock disponible

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `stockActual=5`, `cantidad=5`, `tipo="SALIDA"` |
| **Resultado esperado** | `nuevoStock=0`, `error=nil` |
| **Nombre del test** | `TestCalcularNuevoStock_SalidaExactaAlStock` |

Límite inferior permitido: la cantidad retirada es exactamente igual al stock. El resultado debe ser 0 sin error.

---

#### TC-03 — SALIDA con cantidad = stock + 1 (supera el límite)

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `stockActual=5`, `cantidad=6`, `tipo="SALIDA"` |
| **Resultado esperado** | Error `"stock insuficiente"` |
| **Nombre del test** | `TestCalcularNuevoStock_SalidaExcedeStock` |

Un valor justo por encima del límite permitido debe producir error.

---

#### TC-04 — AJUSTE reemplaza el stock

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `stockActual=100`, `cantidad=30`, `tipo="AJUSTE"` |
| **Resultado esperado** | `nuevoStock=30`, `error=nil` |
| **Nombre del test** | `TestCalcularNuevoStock_AjusteValido` |

Clase válida: cualquier valor de ajuste reemplaza directamente el stock independientemente del valor anterior.

---

#### TC-05 — Tipo de movimiento inválido

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `stockActual=10`, `cantidad=5`, `tipo="DEVOLUCION"` |
| **Resultado esperado** | Error `"tipo inválido"` |
| **Nombre del test** | `TestCalcularNuevoStock_TipoInvalido` |

Clase inválida: cualquier tipo distinto de `ENTRADA`, `SALIDA` o `AJUSTE` es rechazado.

---

### Función: `calcularUrgencia(stockActual, stockMinimo int) string`

Reproduce la clasificación de urgencia del `handleReposicion`.

---

#### TC-06 — Stock igual a 0 → urgencia CRITICO

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `stockActual=0`, `stockMinimo=10` |
| **Resultado esperado** | `"CRITICO"` |
| **Nombre del test** | `TestCalcularUrgencia_StockCero` |

El valor 0 es el límite absoluto inferior: representa ausencia total de stock, caso más crítico posible.

---

#### TC-07 — Stock = stockMinimo/2 (límite entre ALTA y MEDIA)

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `stockActual=5`, `stockMinimo=10` |
| **Resultado esperado** | `"ALTA"` |
| **Nombre del test** | `TestCalcularUrgencia_StockEnLimiteAlta` |

El umbral exacto `stock <= stockMinimo/2` clasifica como `ALTA`. Se prueba el valor en el límite.

---

#### TC-08 — Stock = stockMinimo/2 + 1 (pasa a MEDIA)

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `stockActual=6`, `stockMinimo=10` |
| **Resultado esperado** | `"MEDIA"` |
| **Nombre del test** | `TestCalcularUrgencia_StockSobreLimiteAlta` |

Un valor justo por encima del umbral abandona la clase `ALTA` y cae en `MEDIA`.

---

### Función: `validarProducto(nombre string, precioVenta float64) error`

Reproduce la validación de campos obligatorios del `handleCrearProducto`.

---

#### TC-09 — Producto con datos válidos

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `nombre="Martillo"`, `precioVenta=150.0` |
| **Resultado esperado** | `error=nil` |
| **Nombre del test** | `TestValidarProducto_DatosValidos` |

Clase válida: nombre no vacío y precio positivo deben pasar sin error.

---

#### TC-10 — Nombre vacío

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `nombre=""`, `precioVenta=150.0` |
| **Resultado esperado** | Error |
| **Nombre del test** | `TestValidarProducto_NombreVacio` |

Clase inválida: nombre vacío es campo obligatorio faltante.

---

#### TC-11 — Precio exactamente 0 (límite inferior inválido)

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `nombre="Llave"`, `precioVenta=0` |
| **Resultado esperado** | Error |
| **Nombre del test** | `TestValidarProducto_PrecioCero` |

El precio 0 es el límite que divide válido (>0) de inválido (≤0).

---

#### TC-12 — Precio negativo

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `nombre="Llave"`, `precioVenta=-1.0` |
| **Resultado esperado** | Error |
| **Nombre del test** | `TestValidarProducto_PrecioNegativo` |

Valor por debajo del límite 0: confirma que la clase inválida incluye negativos.

---

### Patrón State — `EstadoPedido`

Las transiciones del patrón State se prueban de forma pura, sin BD.

---

#### TC-13 — PendienteState: cancelar es una transición válida

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | Pedido en estado `PENDIENTE`, acción `Cancelar` |
| **Resultado esperado** | Estado cambia a `"CANCELADO"`, `error=nil` |
| **Nombre del test** | `TestPendienteState_Cancelar` |

---

#### TC-14 — PendienteState: pagar sin procesar es inválido

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | Pedido en estado `PENDIENTE`, acción `Pagar` |
| **Resultado esperado** | Error (transición no permitida) |
| **Nombre del test** | `TestPendienteState_PagarSinProcesar` |

---

#### TC-15 — ConfirmadoState: pagar avanza a PAGADO

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | Pedido en estado `CONFIRMADO`, acción `Pagar` |
| **Resultado esperado** | Estado cambia a `"PAGADO"`, `error=nil` |
| **Nombre del test** | `TestConfirmadoState_Pagar` |

---

#### TC-16 — EntregadoState: no puede cancelarse

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | Pedido en estado `ENTREGADO`, acción `Cancelar` |
| **Resultado esperado** | Error `"no se puede cancelar"` |
| **Nombre del test** | `TestEntregadoState_NoPuedeCancelarse` |

---

#### TC-17 — EnAlmacenState: entregar avanza a ENTREGADO

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | Pedido en estado `EN_ALMACEN`, acción `Entregar` |
| **Resultado esperado** | Estado cambia a `"ENTREGADO"`, `error=nil` |
| **Nombre del test** | `TestEnAlmacenState_Entregar` |

---

### Función: `estadoDesdeNombre(nombre string) EstadoPedido`

---

#### TC-18 — Nombre desconocido devuelve PENDIENTE por defecto

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `nombre="INEXISTENTE"` |
| **Resultado esperado** | Estado con `GetNombre() == "PENDIENTE"` |
| **Nombre del test** | `TestEstadoDesdeNombre_Default` |

Clase inválida: cualquier nombre no reconocido cae al estado por defecto.

---

#### TC-19 — Nombre "EN_ALMACEN" resuelve correctamente

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `nombre="EN_ALMACEN"` |
| **Resultado esperado** | Estado con `GetNombre() == "EN_ALMACEN"` |
| **Nombre del test** | `TestEstadoDesdeNombre_EnAlmacen` |

---

### Función: `calcularFaltante(stockActual, stockMinimo, stockMaximo int) int`

---

#### TC-20 — stockMaximo < stockActual → faltante = stockMinimo * 2

| Campo | Detalle |
|---|---|
| **Técnica** | Valor límite |
| **Datos de entrada** | `stockActual=80`, `stockMinimo=10`, `stockMaximo=50` |
| **Resultado esperado** | `20` (= 10 × 2) |
| **Nombre del test** | `TestCalcularFaltante_StockMaximoMenorQueActual` |

Límite especial: cuando la diferencia es negativa se aplica la fórmula alternativa.

---

#### TC-21 — Caso normal: stockMaximo > stockActual

| Campo | Detalle |
|---|---|
| **Técnica** | Partición de equivalencia |
| **Datos de entrada** | `stockActual=10`, `stockMinimo=5`, `stockMaximo=100` |
| **Resultado esperado** | `90` |
| **Nombre del test** | `TestCalcularFaltante_CasoNormal` |

---

## Resumen de cobertura

| Función / Método | Casos | Técnicas usadas |
|---|---|---|
| `calcularNuevoStock` | TC-01 a TC-05 | Equivalencia + Valor límite |
| `calcularUrgencia` | TC-06 a TC-08 | Valor límite |
| `validarProducto` | TC-09 a TC-12 | Equivalencia + Valor límite |
| Patrón State `EstadoPedido` | TC-13 a TC-17 | Equivalencia |
| `estadoDesdeNombre` | TC-18 a TC-19 | Equivalencia |
| `calcularFaltante` | TC-20 a TC-21 | Equivalencia + Valor límite |
| **Total** | **21** | |

---

## Ejecución

```bash
cd test/unit
go test ./... -v
```

Salida esperada: todos los tests con estado `PASS`.

```
--- PASS: TestCalcularNuevoStock_EntradaValida (0.00s)
--- PASS: TestCalcularNuevoStock_SalidaExactaAlStock (0.00s)
...
PASS
ok      ferreteria_tests    0.002s
```

---

## Diseño Conceptual de Pruebas de Integración y Mocks

Las pruebas unitarias validadas en las secciones anteriores cubren la lógica de negocio pura de forma aislada. Sin embargo, existe una capa de comportamiento que sólo puede verificarse cuando los componentes interactúan entre sí: la integración entre la lógica de negocio, la capa de persistencia y el patrón Observer. Esta sección presenta el diseño conceptual de dicho nivel de pruebas.

---

### Limitación de las pruebas unitarias actuales — Punto de partida para la siguiente etapa de testeo

Las funciones extraídas para las pruebas unitarias no invocan la base de datos. Esto es intencional para las pruebas unitarias, pero significa que los siguientes escenarios no están cubiertos:

- Que al ejecutar `SetStockActual()` con un stock inferior al punto de reorden, el Observer notifique correctamente y se persista una alerta en la tabla `tblalertas_stock`.
- Que el handler `handleMovimientoStock` rechace una SALIDA cuando el stock real en MySQL es insuficiente.
- Que el flujo completo de un pedido (creación → confirmación → pago → almacén → entrega) actualice correctamente todas las tablas relacionadas.

---

### Estrategia de mocks mediante interfaces

En Go, la forma idiomática de inyectar dependencias testeables es mediante interfaces. En lugar de que las funciones de negocio llamen directamente a `db.QueryRow(...)`, se define una interfaz de repositorio que abstrae el acceso a datos:

```go
// Interfaz que abstrae el acceso a datos de stock
type StockRepository interface {
    GetStock(productoID int64) (int, error)
    ActualizarStock(productoID int64, nuevoStock int) error
    RegistrarMovimiento(prodID int64, anterior, nuevo int, tipo string) error
    RegistrarAlerta(prodID int64, stock, puntoReorden int) error
}

// Implementación real (usa MySQL)
type MySQLStockRepository struct{ db *sql.DB }

// Implementación mock (para tests, en memoria)
type MockStockRepository struct {
    StockSimulado    map[int64]int
    AlertasGeneradas []int64
}
```

Con este diseño, en producción se inyecta `MySQLStockRepository` y en los tests de integración se inyecta `MockStockRepository`, eliminando la necesidad de una base de datos real sin perder cobertura de los flujos completos.

---

### Escenarios de integración planificados

Los siguientes escenarios serían cubiertos en una suite de pruebas de integración:

| ID | Escenario | Componentes involucrados | Resultado esperado |
|---|---|---|---|
| TI-01 | SALIDA con stock suficiente → Observer no dispara alerta | `calcularNuevoStock` + MockRepo + Observer | Stock actualizado, 0 alertas |
| TI-02 | SALIDA que cruza el punto de reorden → Observer registra alerta | `SetStockActual` + Observer + MockRepo | Stock actualizado + 1 alerta generada |
| TI-03 | Flujo completo de pedido PENDIENTE → ENTREGADO | Todos los estados del patrón State + MockRepo | Estado final ENTREGADO, stock reducido |
| TI-04 | Cancelación de pedido EN_ALMACEN → stock no se modifica | `EnAlmacenState.Cancelar` + MockRepo | Estado CANCELADO, stock sin cambios |
| TI-05 | Crear producto sin nombre → error 400 en el handler | `handleCrearProducto` + MockRepo | HTTP 400, mensaje de error correcto |
