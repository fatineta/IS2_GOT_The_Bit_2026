3.2. Patrón N°2: State
3.2.1.Intención Original según GoF
El patrón State es uno de los patrones de comportamiento definidos por la GoF. Su objetivo principal es permitir que un objeto altere su comportamiento cuando su estado interno cambia, dándole al objeto la apariencia de que ha cambiado de clase. Esencialmente resuelve los problemas altamente dependientes en estructuras como if-else o switch-case. Cada estado posible se encapsula en una clase concreta que implementa una interfaz común, y el objeto delega su comportamiento al estado actual en lugar de ramificar su lógica internamente.

3.2.2. Problema de Diseño en el Sistema

En el sistema de gestión de inventario, la tabla tblestado define cinco estados posibles: Activo, Inactivo, Pendiente, Finalizado y Cancelado. Estos estados aplican tanto a productos (tblproductos.estado_id) como a movimientos de entrada (tblentradas.estado_id) y ventas (tblventas.estado_id).
El problema concreto aparece cuando se intenta controlar qué operaciones son válidas según el estado actual de un objeto. Por ejemplo:

Un Producto en estado Inactivo no debería poder registrar nuevas ventas ni entradas de stock.
Una Entrada en estado Cancelado no debería poder modificar el stock_actual del producto asociado.
Una Entrada en estado Pendiente debería poder confirmarse o cancelarse, pero no finalizarse directamente.

Sin el patrón State, toda esta lógica de validación se acumularía dentro de los métodos de Producto, Entrada o Venta en forma de bloques if-else que consultan el estado_id antes de ejecutar cada operación. Esto viola el principio de responsabilidad única (SRP), hace el código difícil de leer y extender, y vuelve prácticamente imposible testear cada estado de forma aislada sin instanciar toda la lógica del objeto.
Esto se refleja directamente en la interfaz: el flujo de tres pasos para registrar movimientos (v-mov) implica transiciones de estado (Paso 1 → Paso 2 → Paso 3 → Confirmado), y el Dashboard muestra badges de estado crítico, bajo y normal que representan comportamientos distintos del mismo objeto Producto.

3.2.3.Justificación Técnica y Alternativas Descartadas (Dimensión 3)

¿Por qué State y no otra solución?
La alternativa más obvia fue mantener el campo estado_id como un simple entero y controlar todo mediante if-else o switch-case dentro de cada método. Esta solución fue descartada porque a medida que crecen los estados o las operaciones, el código se vuelve inmantenible: cada nueva regla de negocio obliga a modificar múltiples métodos en múltiples clases, violando el principio abierto/cerrado (OCP).
Otra alternativa evaluada fue usar una tabla de transiciones válidas en la base de datos, consultando antes de cada operación si la transición está permitida. Si bien esto es útil como respaldo en la capa de persistencia, no resuelve el problema en la capa de objetos: la lógica de comportamiento diferenciado por estado sigue sin tener un lugar claro en el código.
El patrón State fue elegido porque encapsula el comportamiento de cada estado en su propia clase. Cada estado sabe exactamente qué operaciones permite y hacia qué otros estados puede transicionar. Esto hace que agregar un nuevo estado (por ejemplo, "En revisión") solo requiera crear una nueva clase sin tocar las existentes. Además, cada clase de estado es testeable de forma completamente aislada, lo que es fundamental para la etapa de TDD en el TP2.
La elección también es coherente con el diagrama de casos de uso: el caso "Verificar stock mínimo" y "Señal de alarma" implican que un Producto se comporta de manera diferente según si está en estado normal, bajo o crítico, lo cual es exactamente el escenario que State resuelve con elegancia.
