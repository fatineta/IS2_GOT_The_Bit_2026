# Mejoras Implementadas

## Aplicación del Patrón Strategy para el Motor de Urgencia

En el TP2, todos los productos eran evaluados mediante una única regla de negocio para determinar la urgencia de reposición. Esto provocaba que artículos con comportamientos comerciales muy diferentes recibieran exactamente la misma alerta.

Por ejemplo, una caja de tornillos de alta rotación y una amoladora de baja rotación eran tratadas de la misma manera, generando reposiciones tardías en algunos casos y compras innecesarias en otros.

Para solucionar este problema se implementó el patrón de diseño **Strategy**, permitiendo que cada categoría de producto utilice una lógica de cálculo específica.

### Estrategias implementadas

- **Alta Rotación:** la alerta ALTA se genera cuando el stock alcanza el mínimo definido.
- **Baja Rotación:** la alerta ALTA se genera cuando el stock cae a un cuarto del mínimo.
- **General:** mantiene el comportamiento original del TP2 para asegurar compatibilidad.

### Beneficios

- Mayor precisión en las decisiones de compra.
- Reducción del riesgo de quiebre de stock.
- Disminución del sobrestock en productos costosos.
- Facilidad para agregar nuevas categorías sin modificar el código existente.

---

## Incorporación de Lectura por Código de Barras

Se incorporó la lectura de códigos de barras EAN-13 para agilizar la identificación de productos.

En la versión anterior, el usuario debía buscar manualmente cada artículo, aumentando el tiempo de operación y la probabilidad de errores de carga.

### Funcionalidades agregadas

- Búsqueda automática mediante scanner.
- Identificación instantánea de productos.
- Compatibilidad con ingreso manual y búsqueda mediante la tecla Enter.
- Actualización rápida de movimientos de stock.

### Beneficios

- Reducción de errores de tipeo.
- Mayor velocidad de atención al cliente.
- Mejor experiencia de uso.
- Mayor eficiencia operativa.

---

## Automatización de Órdenes de Compra

Se automatizó el proceso de generación de órdenes de compra cuando el sistema detecta la necesidad de reposición.

Anteriormente, el encargado debía identificar los faltantes, confeccionar el pedido y enviarlo manualmente al proveedor.

### Nuevo flujo

1. El sistema detecta la necesidad de reposición.
2. El usuario confirma la acción.
3. Se genera automáticamente una orden de compra en formato PDF.
4. El sistema envía el documento por correo electrónico al proveedor.
5. Se registra la operación en el sistema.

### Beneficios

- Menor carga administrativa.
- Reducción de errores humanos.
- Mayor rapidez en el proceso de compra.
- Optimización de la gestión de reposición de stock.

---

## Mejoras Arquitectónicas

La implementación del patrón Strategy permitió desacoplar la lógica de negocio y mejorar la estructura interna del sistema.

### Ventajas obtenidas

- Código más mantenible.
- Mayor escalabilidad.
- Menor acoplamiento entre componentes.
- Cumplimiento del principio Open/Closed.
- Incorporación sencilla de nuevas reglas de negocio.

---

## Resultados Obtenidos

Las mejoras implementadas permiten que el sistema:

- Detecte con mayor precisión cuándo reponer productos.
- Registre movimientos de stock de forma más rápida.
- Automatice la comunicación con proveedores.
- Reduzca errores operativos.
- Mejore la gestión del inventario.
- Facilite futuras ampliaciones del software.

En conjunto, estas mejoras transforman el sistema de un simple gestor de inventario en una herramienta capaz de asistir activamente en la toma de decisiones de compra y reposición dentro de la ferretería.
