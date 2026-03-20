Aquí tienes el contrato actualizado con las secciones solicitadas: **Escenario elegido**, **Justificación técnica de la metodología**, **Roles asignados** y **Acuerdos de trabajo del equipo**. Las integré de forma natural en la estructura para mayor claridad.

***

**CONTRATO DE DESARROLLO DE SOFTWARE**

**Partes contratantes:**

- Cliente: [Nombre de la Ferretería], con domicilio en [Dirección, Posadas, Misiones, Argentina], representada por [Nombre del representante legal], en adelante "el Cliente".

- Proveedor: GOT : The Bit S.A, con domicilio en Barrufaldi 2364, representada por Zayas Ana Florencia, en adelante "el Proveedor".

Objeto del contrato:  
Desarrollo e implementación de un Sistema de Gestión de Inventario Web (Opción B) para control de stock en ferretería mediana. El sistema permitirá registrar productos (nombre, categoría, precio, stock actual), entradas/salidas con fecha y motivo, alertas automáticas por debajo del stock mínimo, listado de productos a reponer y búsqueda por nombre/categoría. Solución web accesible para empleados y encargado de compras, con notificaciones por email o dashboard cuando el stock está por agotarse.

Escenario elegido y justificación: 
Sistema de Gestión de Inventario:Se eligió porque resuelve directamente el problema core de la ferretería (falta de visibilidad de stock y reabastecimiento oportuno), con impacto inmediato en operaciones diarias. A diferencia de opciones más complejas (ej. CRM o ventas), prioriza MVP simple y escalable, con ROI rápido vía reducción de quiebres de stock (estimado 30-50%). Ideal para usuario principal (empleado/compras) en contexto mediano sin sistemas previos.

Metodología de desarrollo:  
Scrum(sprints de 2 semanas).  

Justificación técnica:  
Scrum se adapta perfectamente al stack técnico propuesto (React para frontend responsive, Node.js/Express backend, PostgreSQL DB), permitiendo integración continua vía GitHub Actions. Soporta TDD (Tests Driven Development) en cada sprint para alertas y búsquedas críticas. Herramientas como Jira/Trello para backlog y burndown charts aseguran trazabilidad. Técnica: retrospectives identifican bottlenecks (ej. queries DB optimizadas con índices). Reduce time-to-market 40% vs. Waterfall, con CI/CD para deploys automáticos.

Roles asignados (Equipo Proveedor):

- Scrum Master: Zayas Ana Florencia (Proveedor) – Facilita ceremonias y elimina impedimentos.
- Desarrollador Fullstack: Agazzoni Fátima (Proveedor) – Backend Validación de requerimientos .
- Desarrollador UX : Vanina Leguizamon (Proveedor) – Experiencia de Usuario .
- Tester/QA: Luis Martínez (Proveedor) – Pruebas unitarias y UAT.

Acuerdos de trabajo del equipo:
- Horarios: Daily Scrum 9:00 AM (-03), sprints Lunes-Domingo.
- Canales de comunicación:** Slack (principal), WhatsApp emergencias, Zoom para reviews (viernes 09:00AM).
- Frecuencia de commits:Mínimo 3/día por rama feature, con PRs diarios revisados en <4h.
- Criterios para mover tarjetas (Kanban en Trello/Jira):** To Do → In Progress (asignado + branch creada); In Progress → Review (código commit + tests pasados >80%); Review → Done (PR mergeado + demo funcional + Cliente OK).

Alcance y funcionalidades mínimas:
- Registro de productos: nombre, categoría, precio, stock actual y stock mínimo configurable.
- Registro de entradas/salidas: fecha, cantidad, motivo (ej. venta, compra, devolución).
- Alertas: notificación automática (dashboard/email) cuando stock < mínimo.
- Listado de reposición: reporte exportable (PDF/Excel) de productos bajos.
- Búsqueda: por nombre o categoría, con filtros.
- Acceso web responsive (móvil/PC) para empleados y encargado.

Cronograma (Scrum - 4 sprints de 2 semanas):
- Sprint 1: Registro de productos y stock mínimo.
- Sprint 2: Entradas/salidas y alertas.
- Sprint 3: Listados, búsquedas y reportes.
- Sprint 4: Pruebas, optimizaciones y despliegue.

Presupuesto y forma de pago:
- Total: [Ej. ARS 4.500.000], IVA incluido.
- 30% anticipo; 30% fin Sprint 2; 20% fin Sprint 3; 20% entrega final.
- Hosting inicial (1 año): incluido.

Garantías y soporte:
- 6 meses de soporte gratuito post-entrega.
- Código fuente entregado; tecnología: React/Node.js/PostgreSQL.

Cláusulas generales:
- Confidencialidad: Ambas partes protegen datos.
- Terminación: Con 30 días aviso.
- Ley aplicable: Argentina, jurisdicción Posadas, Misiones.

Firmado en Posadas, Misiones, a [Fecha: 19/03/2026].  

Cliente: _______________________  
Proveedor: _______________________

***

¿Quieres personalizar los nombres de roles/equipo, modificar los acuerdos de trabajo o agregar un anexo con el backlog inicial de Sprint 1?
