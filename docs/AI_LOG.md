## Registro de uso de IA
 
---
 
### Entrada 001
**Fecha:** 30/03/2026  
**Integrante:** Vanina Leguizamón  
**Herramienta:** Figma AI (OpenAI y Gemini)  
 
**Qué se generó:**  
Se generó un primer borrador con diseños de interfaces (UI) funcionales a partir de una descripción en texto.
 
**Qué modificamos:**  
Acorde a la base proporcionada por Figma, se realizaron ajustes según los requerimientos del sistema, mejoras en la navegación, cambios en el diseño visual y eliminación de errores o elementos innecesarios.
 
**Justificación:**  
Se utilizó Figma AI como apoyo para generar un primer borrador de interfaces. Luego, los diseños fueron analizados y modificados por el equipo según los requerimientos y criterios de usabilidad.
 
---
 
### Entrada 002
**Fecha:** 02/04/2026  
**Integrante:** Fátima Agazzoni  
**Herramienta:** Claude  
 
**Qué se generó:**  
Conexión y ajustes de lógica en el código de `main.go` para mantener constante la comunicación entre las operaciones que interactúan con la interfaz y la base de datos.
 
**Qué modificamos:**  
Funciones relacionadas con los patrones **Observer** y **State**, principalmente.
 
**Justificación:**  
Se utilizó IA para acelerar la generación del boilerplate, mientras que la lógica principal fue desarrollada y adaptada por el equipo.
 
---
 
### Entrada 003
**Fecha:** 05/05/2026  
**Integrante:** Ana Zayas
**Herramienta:** Claude (Anthropic)  
 
**Qué se generó:**  
Se generó el archivo de pruebas unitarias `ferreteria_test.go` ubicado en `test/unit/`, aplicando la disciplina de Desarrollo Guiado por Pruebas (TDD). El archivo incluye 21 casos de prueba que cubren 6 funciones del sistema: `calcularNuevoStock`, `calcularUrgencia`, `validarProducto`, `calcularFaltante`, `estadoDesdeNombre` y el patrón State (`EstadoPedido`). También se generó la documentación técnica asociada en `docs/tp2-pruebas-unitarias.md` y el workflow de CI/CD en `.github/workflows/tests.yml`.
 
**Qué modificamos:**  
- Se revisó cada caso de prueba generado para verificar que los datos de entrada y resultados esperados coincidieran con el comportamiento real del `main.go`.  
- Se ajustaron las funciones extraídas para que reflejaran fielmente la lógica original sin dependencias de base de datos.  
- Se corrigió la ruta del workflow (`test/unit/` en lugar de `tests/unit/`) para adaptarla a la estructura real del repositorio.  
- Se agregó el archivo `go.sum` vacío necesario para la ejecución del pipeline de GitHub Actions.
**Justificación:**  
Se utilizó Claude para identificar las funciones de negocio puras dentro del `main.go`, diseñar los casos de prueba aplicando partición de equivalencia y análisis de valores límite, y generar el código correspondiente. Cada artefacto fue revisado y validado por el equipo antes de su incorporación al repositorio, verificando que los tests pasaran correctamente y que la documentación fuera precisa.
 
---
 
## Eje 3: Análisis de estándares HCI y sistemas críticos
 
### Herramienta utilizada
ChatGPT
 
---
 
### Tipo de uso
Asistencia en formateo y estructuración de contenido en Markdown para GitHub.
 
---
 
### Prompts utilizados
- "podrías aplicar un formato de letra apto para un documento dentro de un repositorio de github?"
- "realizar lo mismo sin parafrasear nada"
- "formatear el texto en markdown profesional sin modificar contenido"
---
 
### Alcance del uso de IA
 
La herramienta fue utilizada exclusivamente para:
 
- Dar formato en Markdown al contenido
- Mejorar la estructura visual (títulos, tablas, secciones)
- Adaptar el texto para correcta visualización en GitHub
No se utilizó IA para:
 
- Generar contenido conceptual
- Modificar redacción original
- Agregar ideas o interpretaciones
Todo el contenido teórico, análisis y redacción fue elaborado de forma propia, manteniendo fidelidad total en los textos formateados.
 
---
 
### Observaciones
 
El uso de IA permitió mejorar la presentación del documento, facilitando su lectura y alineándolo con buenas prácticas de documentación técnica en repositorios GitHub.
 
