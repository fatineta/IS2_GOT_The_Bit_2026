La diferencia clave entre validar y verificar es que: verificar implica confirmar que el desarrollo del producto se está llevando a cabo correctamente; mientras que, validar implica que se está desarrollando el producto adecuado, siguiendo las especificaciones del cliente.

### Ejemplo de verificación

El proceso que llevamos a cabo al momento de testear nuestro producto, a fin de corroborar que cada parte tanto por separado como ensamblada funcione correctamente. Es decir, corroborar que la base de datos se comunique con el backend y que el contrato de abstracciones entre back y front se efectúe.

### Ejemplo de validación

Si bien no contamos con un cliente puntual, podemos verlo desde el punto de vista académico. Al saber que a nuestro profesor le gusta la incorporación de exportación de datos en `.csv` o `.xlsx`, buscaremos validar que en nuestro desarrollo se incluya esa especificación, a fin de garantizar la mayor satisfacción.

---

Para el próximo sprint se proponen dos actividades concretas que surgen directamente de lo que el TP2 dejó pendiente.

La primera es de Verificación e implica implementar las pruebas de integración que B3 diseñó conceptualmente pero no ejecutó, usando el `MockStockRepository` ya definido.

Los dos escenarios prioritarios son:

- el disparo del Observer cuando una salida de stock cruza el punto de reorden,
- y el flujo completo de un pedido desde `PENDIENTE` hasta `ENTREGADO`.

El criterio de éxito es técnico y binario: los nuevos tests se suman al archivo `ferreteria_test.go` existente y el pipeline de GitHub Actions los ejecuta automáticamente en cada push.

La segunda actividad es de Validación y cierra el ciclo que A3 dejó abierto: las métricas de eficacia y eficiencia fueron definidas y simuladas en el TP2 pero nunca medidas con un usuario real.

Se propone una sesión de observación donde una persona ajena al desarrollo intenta completar el flujo de reposición sin recibir instrucciones previas, registrando si se alcanzan los umbrales ya establecidos de:

- 80% de completitud sin error,
- y 5 clics máximos.

Los resultados de esa sesión se comparan contra el baseline del TP2 y alimentan las mejoras del siguiente sprint, cerrando la cuarta fase del ciclo ISO 13407 que la auditoría de usabilidad había dejado pendiente.

---

Para el próximo sprint se proponen dos actividades concretas que surgen directamente de lo que el TP2 dejó pendiente: B3 diseñó los mocks pero no los implementó, y A3 definió métricas pero solo las simuló. Cada actividad cierra una de esas brechas.

| Actividad 1 Verificación | Actividad 2 |
|---|---|
| **Qué es** | |
| Implementar las pruebas de integración diseñadas en B3 usando MockStockRepository | Prueba de usabilidad con usuario real sobre el flujo de reposición |
| **Qué cubre** | |
| Flujos que las pruebas unitarias no alcanzan: Observer + base de datos, flujo completo de pedido | Métricas de A3 que solo fueron simuladas: tasa de completitud y cantidad de clics |
| **Escenarios prioritarios** | |
| TI-02: SALIDA cruza punto de reorden → Observer dispara alerta. TI-03: flujo PENDIENTE → ENTREGADO completo | Tarea: "Hay productos a reponer, hacé lo que harías normalmente" sin instrucciones previas |
| **Métrica de éxito** | |
| 0 tests fallidos en GitHub Actions al incorporar los nuevos casos | ≥ 80% completitud sin error · ≤ 5 clics para completar el flujo |
| **Evidencia** | |
| Los nuevos tests se suman a ferreteria_test.go y el pipeline CI/CD los ejecuta automáticamente | Registro escrito de la sesión con puntos de fricción y comparación contra baseline del TP2 |
| **Marco teórico** | |
| Verificación: ¿el sistema hace lo que la especificación dice? | Validación: ¿el sistema resuelve el problema real del usuario? (ISO 13407 fase 4) |

---

La inspección de código es una revisión manual del código sin ejecutarlo, mientras que las pruebas automáticas sí ejecutan el programa para verificar resultados.

Por un lado, la inspección sirve para encontrar:

- problemas de lógica,
- malas prácticas,
- o código confuso.

Por otro lado, las pruebas automáticas sirven para detectar errores en el funcionamiento del sistema.

En nuestro proyecto usamos inspección cuando revisamos el código antes de subirlo, y usamos pruebas automáticas en GitHub Actions para ejecutar los tests cada vez que hacemos cambios.

---

Para el desarrollo de nuestro proyecto, consideramos apropiada como herramienta de análisis estático automatizado `golangci-lint`, un agregador de linters especializado en el lenguaje Go, que fue el elegido para la implementación del backend.

Esta herramienta permite examinar directamente el código fuente sin necesidad de compilarlo ni ejecutar el sistema, identificando posibles errores, malas prácticas y vulnerabilidades de manera temprana dentro del proceso de desarrollo.

Un ejemplo concreto de problema que puede detectar es la omisión del manejo de errores devueltos por una función, verificada mediante el linter `errcheck`.

Supongamos que contamos con una función encargada de actualizar el inventario de la ferretería, la cual devuelve tanto el nuevo valor del stock como un posible error:

```go
// La función devuelve el nuevo stock y un posible error
nuevoStock, err := calcularNuevoStock(stockActual, cantidad, "SALIDA")
```

Si por descuido se invoca la función ignorando el error retornado, por ejemplo:

```go
nuevoStock, _ := calcularNuevoStock(stockActual, cantidad, "SALIDA")
// O incluso llamando la función sin capturar el error devuelto
```

El linter integrado en `golangci-lint` detectará inmediatamente esta práctica incorrecta y generará una advertencia antes de la compilación o del envío del código al repositorio.

Esta advertencia indica que se está ignorando un posible comportamiento inesperado (como un stock negativo, inconsistencias en el cálculo o fallos al persistir datos) sin implementar el correspondiente control mediante un bloque `if err != nil`.

De esta manera, el análisis estático contribuye a mejorar la calidad y robustez del backend, permitiendo anticipar errores potenciales sin necesidad de ejecutar pruebas dinámicas.

---

Los métodos formales son imprescindibles en sistemas donde un error puede causar consecuencias muy graves, como accidentes o pérdidas de vidas.

### Ejemplos

- aviones,
- frenos ABS,
- marcapasos,
- o trenes.

En estos casos, no alcanza con hacer pruebas comunes, porque las pruebas solo revisan situaciones que el programador pensó previamente.

Los métodos formales, en cambio, usan matemática y lógica para demostrar que el sistema funciona correctamente en todos los casos posibles.

### No se utilizan siempre porque:

- son muy costosos y difíciles de aplicar: requieren mucho tiempo y personas especializadas en matemáticas y lógica,
- son complicados para sistemas grandes: verificar programas muy complejos puede llevar más tiempo que desarrollarlos,
- y no siempre vale la pena: en aplicaciones comunes, como un sistema de ferretería, un error puede causar problemas operativos, pero se puede corregir después con una actualización. En cambio, en un sistema crítico, un error podría provocar una tragedia.

---

El Product Owner (PO) en la sprint review es la persona que verifica si el sistema realmente sirve para resolver el problema del negocio.

Su tarea no es revisar el código ni los tests, sino comprobar si lo que desarrolló el equipo tiene utilidad para el usuario final.

En el proyecto de la ferretería, el PO representaría al dueño del negocio.

Las pruebas automatizadas tienen una relación indirecta con esto.

Los tests le dan seguridad al equipo de que el sistema funciona correctamente antes de mostrarlo.

Por ejemplo, los 21 tests aprobados en GitHub Actions son una garantía técnica interna del equipo.

El PO no necesita ver esos tests, pero gracias a ellos recibe un sistema más estable y confiable.

Si los tests fallaran, el equipo no debería presentar el incremento en la sprint review.

Por eso, las pruebas automatizadas son una base necesaria para que el PO pueda validar el sistema de manera correcta.
