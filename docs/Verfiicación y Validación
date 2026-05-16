# === PREGUNTAS DISPARADORAS ===

## 1. Verificación vs Validación

La diferencia clave es el objetivo de la evaluación:

- **Verificación** → pregunta: *“¿Estamos construyendo el sistema correctamente?”*  
  Se enfoca en el código, el diseño y el cumplimiento de las reglas técnicas.

- **Validación** → pregunta: *“¿Estamos construyendo el sistema correcto?”*  
  Se enfoca en si el sistema realmente resuelve el problema del usuario.

### Ejemplo de verificación en nuestro proyecto

Los **21 casos de prueba unitaria con TDD** verifican que funciones como `calcularNuevoStock`, `calcularUrgencia` y el patrón **State** funcionan correctamente según las reglas definidas.

Por ejemplo:

- **TC-03** verifica que el sistema rechace una salida cuando la cantidad supera el stock disponible.

En este caso se verifica que el código cumple correctamente la lógica programada.

### Ejemplo de validación en nuestro proyecto

La **auditoría de usabilidad basada en ISO 9241-11** es un ejemplo de validación.

Se pidió a un usuario externo realizar la tarea:

> “Registrar salida de 5 unidades de Tornillo 6mm”.

Gracias a esto se detectó que:

- el flujo tenía 6 pasos en vez de 5,
- y que las opciones de entrada/salida podían confundirse visualmente.

El código funcionaba bien, pero la experiencia del usuario no era la ideal.

---

# 2. Planificación de V&V para el próximo sprint

## Actividad 1 – Verificación

### Pruebas de integración con mocks (B3)

Implementar los 5 escenarios de integración (`TI-01` a `TI-05`) utilizando `MockStockRepository`.

Estas pruebas verificarán:

- la conexión entre `calcularNuevoStock`,
- el patrón **Observer**,
- y la persistencia de datos.

Esto es verificación porque comprueba que los componentes funcionan correctamente entre sí.

---

## Actividad 2 – Validación

### Prueba de usabilidad con el prototipo Figma corregido

Aplicar las mejoras detectadas en la auditoría:

- separación visual entre entrada y salida,
- buscador con autocompletado.

Luego realizar nuevamente la prueba con un usuario real para verificar si:

- puede completar el flujo sin errores,
- y en menos pasos.

Esto corresponde a validación porque se evalúa si el sistema resulta útil y cómodo para el usuario final.

---

# 3. Inspecciones de código vs pruebas automáticas

## Inspección de código

Es una revisión manual del código fuente sin ejecutarlo.

Permite detectar problemas como:

- código muerto,
- nombres poco claros,
- errores de diseño,
- malas prácticas,
- vulnerabilidades.

### Ejemplo en nuestro proyecto

Antes de incorporar los tests generados con ayuda de Claude, el equipo revisó manualmente que las funciones extraídas respetaran la lógica original de `main.go`.

---

## Pruebas automáticas

Ejecutan el código con entradas específicas y verifican si el resultado obtenido es el esperado.

Sirven para detectar errores de funcionamiento y regresiones.

### Ejemplo en nuestro proyecto

El pipeline de **GitHub Actions** ejecuta automáticamente los 21 tests en cada `push`.

---

## ¿Cuándo conviene cada una?

### Conviene una inspección cuando:

- el código es complejo,
- hay cambios importantes de arquitectura,
- se integra código externo,
- se necesita revisar calidad y legibilidad.

### Convienen pruebas automáticas cuando:

- hay cambios frecuentes,
- se necesita rapidez,
- se quiere evitar romper funcionalidades existentes.

Ambas técnicas se complementan:

- la inspección encuentra problemas que los tests no detectan,
- y los tests detectan errores que pueden pasar desapercibidos visualmente.

---

# 4. Análisis estático automatizado

Una herramienta que utilizamos es **SonarQube**.

Esta herramienta puede detectar errores sin ejecutar el programa, por ejemplo:

- código duplicado,
- variables no utilizadas,
- posibles `nil pointer`,
- funciones demasiado complejas,
- problemas de seguridad,
- baja cobertura de tests.

En nuestro proyecto podría detectar funciones con demasiadas responsabilidades o código repetido dentro de la gestión de stock.

---

# 5. Métodos formales de verificación

Los métodos formales son imprescindibles en sistemas críticos donde un error puede generar consecuencias graves.

## Ejemplos

- sistemas aeronáuticos,
- software médico,
- centrales nucleares,
- sistemas bancarios,
- vehículos autónomos.

Se utilizan porque permiten demostrar matemáticamente que el sistema cumple determinadas propiedades.

---

## ¿Por qué no se usan siempre?

Porque:

- requieren mucho tiempo,
- son costosos,
- necesitan conocimientos matemáticos avanzados,
- y aumentan la complejidad del desarrollo.

Por eso, en la mayoría de los proyectos comerciales se utilizan pruebas automatizadas e inspecciones en lugar de métodos formales completos.

---

# 6. Reuniones de validación en Scrum/XP

## Rol del Product Owner en la Sprint Review

El **Product Owner** valida si las funcionalidades desarrolladas cumplen las necesidades del negocio y las expectativas del usuario.

Durante la Sprint Review:

- revisa el incremento desarrollado,
- da feedback,
- acepta o rechaza funcionalidades,
- y propone mejoras para el próximo sprint.

---

## Relación con las pruebas automatizadas

Las pruebas automatizadas verifican técnicamente que el sistema funcione correctamente.

El Product Owner, en cambio, valida si ese funcionamiento realmente aporta valor al usuario.

Por ejemplo:

- los tests pueden indicar que el cálculo de stock es correcto,
- pero el Product Owner puede detectar que el flujo es confuso para el empleado de la ferretería.

Por eso:

- las pruebas automatizadas ayudan a la **verificación**,
- mientras que la Sprint Review ayuda a la **validación**.
