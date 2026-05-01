## A2. Análisis de usuario, tarea y contexto

### ¿Quiénes son los usuarios objetivo del sistema?

El sistema de control de stock está diseñado para ser utilizado por trabajadores de ferreterías pequeñas o medianas con una única sucursal física.  

Los perfiles de usuario contemplados son dos:

- **Encargado de ventas**: utiliza el sistema principalmente para consultar el stock disponible en tiempo real, lo que le permite responder con precisión las consultas de los clientes y confirmar la disponibilidad de productos durante la atención en mostrador.  
- **Encargado de compras**: utiliza el módulo de reposición para identificar qué productos necesitan ser pedidos a los proveedores. Este módulo presenta un sistema de **alarmas clasificadas por urgencia**, que se configura al momento de dar de alta cada producto definiendo su **stock mínimo aceptable**.

---

### ¿Qué tareas principales realizan y en qué contexto (dispositivo, entorno, restricciones)?

En cuanto al entorno de uso, el sistema opera en un contexto de **atención al público**, donde la velocidad de respuesta es importante.

- El **encargado de ventas** trabaja bajo presión, por lo que el sistema debe permitirle obtener información de stock en pocos segundos y sin pasos innecesarios.  
- El **encargado de compras** trabaja en un contexto más administrativo, revisando el estado del inventario de forma periódica para planificar pedidos.

En establecimientos pequeños, ambas funciones pueden recaer sobre la misma persona, por lo que el sistema fue diseñado para que ambos flujos sean accesibles desde una **única interfaz**, sin necesidad de configuraciones adicionales.

---

### Dispositivos y requisitos técnicos

- Se requiere al menos una **computadora de escritorio o notebook** con acceso a un navegador web.  
- Si las tareas están divididas entre personas distintas, se recomienda contar con **dos equipos independientes** para evitar interrupciones.  
- Se sugiere el uso de un **lector de código de barras compatible con entrada por teclado**, lo que permite agilizar el registro de productos sin ingresar códigos manualmente.

No se requiere formación técnica avanzada, ya que la interfaz fue diseñada siguiendo criterios de **usabilidad**, orientados a usuarios sin experiencia en software de gestión.
