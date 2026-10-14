# Análisis del proyecto app-series

Fecha: 13 de octubre de 2026, zona America/La_Paz.

El proyecto tiene una estructura sencilla y apropiada para una aplicación pequeña de uso compartido. Los módulos principales están separados y el catálogo, los mensajes y los recuerdos tienen flujos reconocibles. Sin embargo, hay fallos comprobados de autorización, ejecución de JavaScript en el navegador, manejo de fotos y fechas. La configuración de sesiones y las migraciones tampoco permiten considerar el despliegue suficientemente protegido y reproducible.

La prioridad es corregir esos puntos antes de seguir ampliando funcionalidades. No hace falta cambiar Express ni convertir la aplicación en una SPA para resolverlos.

## Alcance y límites de la revisión

Se revisaron los 18 archivos JavaScript del proyecto, las 14 plantillas Handlebars, el CSS, las rutas, los controladores, la configuración, la migración SQL, los dos archivos de dependencias y los cambios locales existentes. Al comenzar había 16 archivos modificados y un `desktop.ini` sin seguimiento. Esta revisión preserva esos cambios.

Se ejecutaron comprobaciones de sintaxis, renderizado de plantillas y peticiones HTTP a la aplicación real con un cliente Supabase simulado. Las pruebas no escribieron en Supabase, no ejecutaron la migración y no alteraron las cuentas ni sus contraseñas. Las reproducciones de inyección se ejecutaron en un contexto JavaScript aislado con un indicador inocuo.

No se verificaron el esquema, las políticas, los permisos del bucket ni la configuración efectiva del servidor desplegado. La revisión visual procede del código y la cascada CSS; no incluye una inspección del navegador en distintos dispositivos. Cuando un riesgo depende de esos elementos externos, se indica expresamente.

## Arquitectura y funcionalidades

| Componente | Implementación | Observación |
| --- | --- | --- |
| Servidor | Node.js, CommonJS, Express 5; entrada en `app.js` | Configura parsers, sesiones, vistas, archivos estáticos y rutas. |
| Vistas | express-handlebars, Bootstrap, Font Awesome, CSS propio | Renderizado en servidor; JavaScript y estilos adicionales dentro de las plantillas. |
| Persistencia | Cliente Supabase único en `src/config/supabase.js` | Los controladores consultan directamente tablas y Storage. |
| Acceso | Dos editores y un invitado; express-session | Usuarios fijos en código. Los roles locales no se transmiten como identidades de Supabase Auth. |
| Catálogo | Series, películas, estados, temporadas, cuatro géneros y valoraciones | Hay interfaz HTML y una API JSON con reglas distintas. |
| Mensajes | Tablas separadas para Emi y Deli | Dashboard y selección aleatoria de mensajes flotantes. |
| Recuerdos | Lugares, citas, fotos, collage y galería | Cada solicitud admite hasta 20 archivos y el collage se limita a cinco IDs. |
| Despliegue | `render.yaml`, `npm install`, `npm start` | No declara secreto de sesión ni un proceso de migraciones. |
| Música | Tarjeta 44-FM en el hub | Es una función pendiente; solo muestra un aviso. |

Aspectos bien resueltos: separación básica de rutas/controladores/vistas; protección de la mayoría de operaciones de edición; mensajes restringidos a editores también en servidor; texto de mensajes flotantes mediante `textContent`; renderizado normal con escape HTML; posters del catálogo con carga diferida; consultas mediante el cliente Supabase sin concatenar SQL.

## Hallazgos de prioridad alta

### 1. Un invitado puede crear contenido mediante la API JSON

**Referencia:** `src/routes/seriesRoutes.js:8`, `src/controllers/SupabaseSeriesController.js:18`, montaje en `app.js:67`.

`POST /love-view/series` no usa `requireEditor`. El montaje superior exige una sesión, pero entrar como invitado es libre. Por eso el permiso de escritura de esta API es distinto al del formulario habitual.

**Reproducción:** iniciar sesión como invitado y enviar JSON a esa ruta. La aplicación devolvió HTTP **201** y alcanzó la inserción en el cliente simulado. La ruta `/love-view/create` sí bloqueó al mismo invitado.

**Corrección:** incorporar `requireEditor` a todas las rutas que escriban y compartir la validación y la creación de series entre la API y la interfaz. Añadir una prueba que espere un rechazo y ninguna escritura para invitados. La persistencia real depende de los permisos de Supabase; la ausencia de autorización en Express está comprobada.

### 2. Títulos y nombres de género se interpolan dentro de JavaScript ejecutable

**Referencias:** `src/views/management.hbs:96`, `src/views/genres/index.hbs:36`.

Los atributos `onclick` construyen una llamada a `confirm()` que contiene `{{title}}` o `{{name}}` dentro de una cadena JavaScript. Handlebars escapa para HTML, pero el navegador decodifica las entidades del atributo antes de ejecutar su JavaScript. Una comilla en un título normal ya puede romper la confirmación; contenido preparado puede ejecutar instrucciones al pulsar Eliminar.

**Reproducción:** renderizar ambas plantillas con una cadena de prueba y evaluar el manejador después de decodificar el atributo. En las dos vistas se ejecutó el indicador de prueba. Se usó Handlebars 4.7.9, el que resuelve el motor de vistas instalado.

Este fallo puede combinarse con la API abierta a invitados: un invitado alcanza la creación de una serie cuyo título se muestra después a un editor.

**Corrección:** quitar datos dinámicos de manejadores inline. Guardarlos en atributos `data-*` con escape HTML y leerlos desde un listener JavaScript; construir el texto de confirmación como un valor, sin evaluar código. Validar los protocolos de enlaces también: `src/views/planner/places-list.hbs:41` usa `location_url` directamente como `href` y el servidor no limita su esquema a HTTP/HTTPS.

### 3. Las contraseñas de editores están en texto plano dentro del código

**Referencia:** `src/controllers/AuthController.js:1`.

Las credenciales de ambos editores forman parte del objeto de usuarios. Cualquier persona con acceso al código conoce las contraseñas. Tampoco hay límite de intentos de login. Este informe no reproduce sus valores.

**Corrección:** cambiar las credenciales actuales y eliminar el almacenamiento de contraseñas en texto plano. Para mantener el tamaño del proyecto, es viable usar hashes de contraseña configurados fuera del repositorio; si se quiere vincular permisos de base de datos a cada usuario, conviene integrar Supabase Auth. Aplicar un límite de intentos y validar los tipos de entrada.

### 4. La migración habilita RLS, pero declara políticas que permiten todas las operaciones

**Referencia:** `migration.sql:33`.

Las políticas de `Genres` y `Series` son `FOR ALL USING (true)` y no restringen roles. Si esas políticas están activas y el rol anónimo tiene los permisos de tabla correspondientes, el acceso directo a Supabase puede leer y escribir sin pasar por los permisos de Express.

El cliente utiliza una misma clave para todas las sesiones; no se establece una identidad de Supabase Auth para Emi, Deli o el invitado. Por eso el rol `editor` guardado en Express no diferencia usuarios dentro de Supabase.

**Corrección:** decidir un modelo de acceso coherente. Con Supabase Auth, definir políticas por usuario/rol y operación; con un backend que concentra las escrituras, restringir el acceso público de tablas y mantener cualquier credencial privilegiada exclusivamente en el servidor. Comprobar también los permisos de mensajes, citas, lugares y fotos, ausentes de la migración. [Documentación oficial de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Matiz sobre `.env`:** está seguido por Git y existe en `HEAD`. Contiene `SUPABASE_URL`, `SUPABASE_KEY` y `PORT`. La clave registrada se clasificó como **publishable**; no se encontró en ese archivo una clave administrativa por esta comprobación. Una clave publishable está diseñada para exposición pública y depende de las políticas de acceso. No equivale por sí sola a una filtración de un secreto de servidor. Aun así, dejar `.env` seguido expone futuras variables privadas; `.gitignore` no deja de seguir un archivo que ya está registrado. [Tipos de claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

### 5. Los borrados usan GET y no hay protección CSRF

**Referencias:** `src/routes/seriesRoutes.js:16`, `genreRoutes.js:11`, `messageRoutes.js:9`, `placeRoutes.js:13`, `dateRoutes.js:16` y `dateRoutes.js:17`.

Una visita a una URL elimina datos. El `confirm()` de la interfaz no protege la ruta: se puede llamar directamente. Una navegación GET inducida desde otro sitio puede enviar la cookie de sesión, incluso con el comportamiento Lax habitual de los navegadores.

**Corrección:** usar POST o DELETE para operaciones destructivas y añadir protección CSRF a las operaciones autenticadas que cambian estado. Ajustar las vistas a formularios y conservar la confirmación como ayuda de interfaz. El cierre de sesión también utiliza GET.

### 6. Sesiones configuradas para desarrollo

**Referencias:** `app.js:25`, `src/controllers/AuthController.js:25` y `:41`, `render.yaml:8`.

Se mantiene un secreto de respaldo fijo, `secure: false`, sin `SameSite` explícito, sin vencimiento configurado y sin un store persistente. Al pasar de invitado a editor no se regenera la sesión: la prueba conservó el mismo identificador. La cookie sí tiene `HttpOnly` por defecto; no falta esa protección.

**Corrección:** exigir un secreto aleatorio externo, regenerar el identificador al autenticar, definir vencimiento y `SameSite`, y configurar cookies Secure en HTTPS con el proxy correctamente delimitado. Usar un store persistente para producción. El store por defecto mantiene las sesiones en memoria del proceso, por lo que los reinicios las pierden y varios procesos no las comparten. [Documentación oficial de express-session](https://expressjs.com/en/resources/middleware/session/).

No se demostró un secuestro de sesión; se comprobó la configuración y la conservación del identificador al elevar privilegios.

### 7. Cargas de archivos sin límite de bytes ni validación de imagen

**Referencia:** `src/routes/dateRoutes.js:6`.

`multer.memoryStorage()` guarda los archivos completos en RAM. El límite de 20 archivos no limita su tamaño. No hay `limits.fileSize`, un filtro de tipo ni verificación del contenido. El atributo HTML `accept="image/*"` solo ayuda al selector del navegador y no protege el servidor.

**Corrección:** limitar tamaño, archivos y campos; comprobar formatos y contenido real de la imagen; rechazar archivos no admitidos con un error comprensible. Evitar retener grandes lotes completos en memoria. La documentación de Multer advierte sobre agotamiento de memoria con MemoryStorage. [Documentación oficial de Multer](https://expressjs.com/en/resources/middleware/multer/).

### 8. Fotos huérfanas y errores de guardado ocultos

**Referencias:** `src/controllers/DateController.js:143`, `:154`, `:174`, `:269`, `:288`, `:309`, `:321`.

La cita se guarda antes de subir sus fotos. Si la subida funciona pero falla la inserción de `DatePhotos`, se ignora `photoErr` y el archivo queda en Storage. En creación no se revisa el resultado al guardar el collage; en edición se registra su error y se redirige como si todo hubiera funcionado. Eliminar una foto o una cita no elimina sus objetos de Storage.

**Reproducción:** simular un error al insertar `DatePhotos` después de una subida correcta. El controlador redirigió a `/dates`, hizo una subida y ninguna limpieza. También se verificó que `deletePhoto` filtra únicamente por ID de foto, sin exigir su relación con `dateId`.

**Corrección:** comprobar cada operación y mostrar fallos parciales. Registrar la ruta del objeto, eliminarlo al borrar su foto y compensar las subidas cuando falla el registro. Limitar el borrado por foto y cita. Definir las relaciones y cascadas de la base de datos; una cascada de filas por sí sola no borra archivos de Storage.

La aplicación construye URLs públicas para las fotos. Si el bucket es público, esas URLs permiten acceder sin sesión de Express; si es privado, ese mecanismo no entrega acceso autenticado. El estado real del bucket requiere comprobación externa.

## Fallos funcionales y de integridad

| Hallazgo | Evidencia / efecto | Corrección |
| --- | --- | --- |
| Seleccionar 21 fotos produce un error 500 | `src/views/planner/date-form.hbs:314` previsualiza las primeras 20 y anuncia que solo se subirán esas, pero no reduce `input.files`. Multer rechaza la solicitud completa. Se reprodujo por HTTP con 21 archivos pequeños. | Rechazar la selección antes de enviar o construir una lista recortada; capturar `MulterError` y devolver un error de validación. |
| El límite de 20 no es por recuerdo | El controlador limita cada lote, sin consultar cuántas fotos ya existen. Editar permite seguir agregando lotes de 20, aunque el formulario anuncia 20 en total. | Contar fotos existentes y limitar el total también en servidor, contemplando solicitudes simultáneas. |
| La selección de collage existente y nueva usa contadores separados | Se pueden elegir cinco existentes y cinco nuevas; `DateController.js:285` conserva las primeras cinco. Las nuevas pueden quedar fuera sin explicación. | Un solo límite para ambas selecciones; deduplicar y verificar que los IDs pertenecen a la cita. |
| Editar cambia la representación horaria | `DateController.js:199` convierte a UTC con `toISOString()` y recorta para un `datetime-local`. Una cita del 13/10 a las 23:30 con offset -04:00 pasó al 14/10 a las 03:30 en el formulario. | Definir la zona horaria del producto; convertir explícitamente entre hora local e instante UTC al leer y escribir. |
| La hora mostrada depende del servidor | Los formatos de fechas y mensajes usan `toLocaleString` sin `timeZone`; la entrada `datetime-local` se envía sin offset. | Usar una zona consistente, por ejemplo America/La_Paz si corresponde al uso previsto. Verificar el tipo real de `date_time`. |
| El filtro ignora géneros secundarios | `SeriesController.js:24` solo consulta `GenreId`, pese a existir tres campos adicionales. Dos entradas con el género buscado en `Genre2Id` devolvieron cero grupos en la prueba. | Filtrar cualquiera de los cuatro campos; más adelante, una tabla de relación simplificaría esta lógica. |
| Series y películas homónimas se mezclan | `SeriesController.js:50` agrupa por título y estado. En la prueba, una película y una serie quedaron en una tarjeta con dos elementos y tipo representativo Serie. | Incluir el tipo y una identidad de obra estable; ordenar las temporadas. |
| No hay validación suficiente en servidor | `SeriesController.js:155` y `:220` aceptan valores convertidos parcialmente. La prueba alcanzó la inserción con título de espacios, temporada -2 y ratings -4 y 9. | Validar tipos, títulos no vacíos, enums, IDs, temporadas positivas y ratings 0–5; añadir restricciones de integridad en SQL. Los permisos/restricciones reales pueden rechazarlo después, pero Express no lo valida. |
| Un usuario de login mal formado rompe el JavaScript de la página | `src/views/login.hbs:781` interpola el usuario recibido dentro de un script. Un nombre que termina en barra invertida produce un error de sintaxis. Un usuario no previsto también puede buscar un botón inexistente. | Validar el usuario contra una lista cerrada y transferirlo por datos HTML; mantener una respuesta de error utilizable. |
| Los errores de recursos inexistentes suelen ser 500 | Los controladores tratan el error de `.single()` como error general antes de distinguir ausencia de registro. | Separar 400, 404, 409 y errores de servicio; verificar también si una actualización o un borrado afectó filas. |

El planificador fuerza `status = 'completed'` al crear y editar. Es coherente con la interfaz de recuerdos pasados, pero no permite gestionar planes futuros aunque el hub y varios títulos hablen de “Planes y Citas”. Conviene alinear el lenguaje con la función actual o implementar estados de planificación.

## Base de datos y despliegue

1. **La migración no reconstruye la aplicación desde cero.** Solo crea `Genres` y `Series`; el código también requiere `Places`, `Dates`, `DatePhotos`, `MessagesEmi` y `MessagesDeli`. La última sentencia intenta alterar `Dates` sin haberla creado. Faltan además el bucket y sus reglas. Preparar migraciones completas y versionadas, incluyendo relaciones, permisos y constraints.
2. **Se elimina un trigger y no se vuelve a crear.** `migration.sql:55` elimina `update_series_updated_at`. Solo existe la creación del trigger de géneros. Después de aplicar este archivo, `Series.updatedAt` deja de actualizarse por ese trigger. Restaurar su definición.
3. **El ejemplo de entorno no corresponde al código.** `.env.example:1` declara `DATABASE_URL`, que no usa la aplicación; faltan `SUPABASE_URL`, `SUPABASE_KEY` y `SESSION_SECRET`. Con solo ese ejemplo, `createClient()` no tiene configuración válida. Validar variables al iniciar y dar errores claros sin imprimir credenciales.
4. **Dos gestores producen entornos diferentes.** Hay `package-lock.json` y `pnpm-lock.yaml`. El lock de npm fija Supabase 2.99.3; el entorno local resuelve 2.106.2 mediante pnpm. El motor de vistas resuelve Handlebars 4.7.9, mientras el import raíz resuelve 4.7.8. `npm ls` también muestra numerosos paquetes sobrantes de instalaciones mezcladas. Elegir un gestor, una versión de Node y una instalación reproducible. Para npm, usar `npm ci` con el lock mantenido.
5. **Falta soporte operativo.** No hay README, CI, comando de lint ni pruebas automatizadas reales. `app.js` inicia el servidor al importarlo y no exporta la aplicación, lo que dificulta pruebas. Separar creación de la aplicación e inicio del servidor; añadir documentación mínima y una comprobación de salud que no revele datos.

`pg` y `pg-hstore` no se utilizan en los archivos de la aplicación. `path` es un módulo incorporado de Node, por lo que su dependencia npm no hace falta para el import actual. Los scripts `tmp_debug_index.js` y `tmp_test_fks.js` son diagnósticos contra Supabase, no una suite de pruebas; uno intenta una RPC que puede no existir. Revisar y retirar dependencias y scripts que no tengan un uso mantenido.

## Dependencias: resultado de npm audit

`npm audit --omit=dev --json` consultó el registro y devolvió **8 paquetes afectados: 2 críticos, 4 altos, 1 moderado y 1 bajo**. Estos niveles pertenecen a los avisos de las bibliotecas, no equivalen a ocho ataques reproducidos contra esta aplicación.

| Paquete | Severidad máxima del resultado | Alcance observado |
| --- | --- | --- |
| handlebars | Crítica | Plantillas del servidor. Los avisos sobre compilar AST no confiables dependen de una condición que no se observó en esta aplicación. |
| proxy-addr | Crítica | Dependencia de Express; el ataque informado depende de una configuración de confianza de proxy específica, no presente en `app.js`. |
| multer | Alta | Dependencia directa, usada en cargas autenticadas. Revisar especialmente los avisos de campos multipart. |
| path-to-regexp | Alta | Enrutamiento; revisar las condiciones de patrones afectadas al actualizar. |
| brace-expansion | Alta | Dependencia transitiva; no se observó entrada del usuario enviada a expansiones. |
| ws | Alta | Dependencia transitiva; no se observó un endpoint WebSocket propio. |
| qs | Moderada | Dependencia transitiva; los avisos tienen condiciones específicas. |
| body-parser | Baja | La condición avisada de límite inválido no aparece en la configuración actual. |

La auditoría de npm debe interpretarse junto al lock de npm; no certifica por sí sola todo el árbol instalado mediante pnpm. La discrepancia de gestores debe resolverse antes de cerrar este punto. No se ejecutó `npm audit fix` ni se actualizaron paquetes.

Actualizar a versiones que resuelvan los avisos vigentes, revisar sus cambios y repetir las pruebas. Como referencia, el aviso de Handlebars sobre AST indica expresamente que solo usar strings de plantilla no activa ese vector; el aviso de Multer describe fallos en el tratamiento de campos multipart. [Aviso del mantenedor de Handlebars](https://github.com/handlebars-lang/handlebars.js/security/advisories/GHSA-8r5x-fm3f-whwj), [aviso del mantenedor de Multer](https://github.com/expressjs/multer/security/advisories/GHSA-wc9g-mqfw-jrwm).

## Interfaz, accesibilidad y mantenimiento

- **Contraste inconsistente:** `public/css/style.css:175` mantiene `--bs-table-bg: #ffffff`, mientras títulos y ratings de gestión usan blanco translúcido. Los formularios de lugares/citas también mezclan fondos claros y texto claro. Unificar variables de Bootstrap y estilos de controles con el tema oscuro; verificar contraste en navegador.
- **Estilos del login en conflicto:** la regla global `.lv-input` en `style.css:1154` tiene padding con `!important`; prevalece sobre el padding lateral del login destinado a sus iconos. Acotar los estilos por componente y evitar overrides globales innecesarios.
- **Uso de teclado:** tarjetas desplegables, zonas de media estrella y puntos de galería son `div`/`span` con listeners de clic sin semántica de control ni manejo equivalente de teclado. Usar botones, nombres accesibles y estado expandido; gestionar foco en el lightbox.
- **Animaciones continuas:** no hay ajuste para `prefers-reduced-motion`; el canvas del login y los orbes se animan continuamente. Respetar esa preferencia y revisar consumo en móviles.
- **Login en pantallas bajas:** su raíz es fija con `overflow: hidden`. El teclado móvil y el zoom pueden dejar controles fuera del área visible. Permitir desplazamiento y probar alturas reducidas.
- **Idioma:** `src/views/layouts/main.hbs:2` declara `lang="en"`, aunque la mayor parte del contenido está en español. Cambiarlo a `es` y unificar los textos residuales en inglés.
- **HTML de la lista de citas:** `src/views/planner/dates-list.hbs` contiene un cierre `</div>` adicional al final y el estado vacío queda fuera de la fila. Corregir la estructura; el renderizado Handlebars correcto no valida el árbol HTML.
- **Errores de imágenes:** varios `onerror` reasignan un placeholder externo sin desactivar el mismo manejador. Si falla también ese recurso, pueden repetir intentos. Usar un fallback local y de una sola aplicación.
- **Código de interfaz duplicado:** el catálogo repite tarjetas para cada estado y el CSS conserva reglas de la interfaz anterior. Extraer parciales y archivos JS por función reduciría divergencias y facilitaría una política CSP.
- **Listados sin paginación:** se consultan todas las filas y relaciones; la lista de citas pide todas las URLs de fotos para mostrar solo la primera. Reducir columnas y relaciones, añadir paginación y orden explícito. Supabase devuelve por defecto un máximo configurado de filas, normalmente 1.000; los listados completos pueden truncarse al crecer. [Referencia oficial de select](https://supabase.com/docs/reference/javascript/select).
- **Mantenimiento y errores:** varias operaciones parecidas repiten conversión, consultas y manejo de excepciones. Centralizar validadores y funciones de datos; añadir un middleware de errores y mensajes de validación que conserven el formulario. Reducir los logs temporales del collage.

## Comprobaciones realizadas

| Comprobación | Resultado |
| --- | --- |
| Sintaxis de los 18 archivos JavaScript | Correcta. |
| Renderizado de 14 plantillas, en 42 casos representativos | Correcto; no garantiza validez HTML ni accesibilidad. |
| Sintaxis de 17 bloques de script renderizados | Correcta con datos habituales; falla el caso adicional de login mal formado. |
| Acceso al catálogo sin sesión | Redirige a login. |
| Formulario de creación y API de mensajes como invitado | Bloqueados. |
| Creación por API JSON como invitado | Fallo reproducido: 201 y escritura alcanzada en el mock. |
| Inyección en confirmaciones de series y géneros | Fallo reproducido en contexto aislado. |
| Regeneración de sesión al autenticar editor | No se regenera. |
| Carga HTTP de 21 archivos pequeños | Fallo reproducido: 500 antes de entrar al controlador. |
| Filtro por género secundario y agrupación entre tipos | Fallos reproducidos con fixtures. |
| Entrada de edición de fecha con offset -04:00 | Muestra UTC como hora local. |
| Fallo al registrar foto después de subirla | Se oculta al usuario y no se limpia Storage. |
| `npm test` | Sale con código 1: el script solo dice que no hay pruebas. |
| `npm audit --omit=dev` | 8 paquetes afectados; ver matices de alcance anteriores. |

No se validó una instalación limpia, una ejecución de SQL en una base vacía, el despliegue en Render, el envío real de fotos ni las políticas efectivas de Supabase. Esos son los siguientes puntos de integración a comprobar después de corregir el código.

## Orden recomendado de trabajo

1. **Permisos y seguridad:** cerrar la API de escritura a invitados, eliminar interpolaciones JavaScript, cambiar credenciales y restringir las políticas de base de datos según el modelo elegido.
2. **Operaciones autenticadas:** cambiar borrados a POST/DELETE, añadir CSRF y configurar sesiones para producción.
3. **Fotos y datos:** límites de archivos, validación, errores parciales, limpieza de Storage, límite total y collage compartido.
4. **Reproducibilidad:** migraciones completas, trigger faltante, ejemplo de entorno, un gestor de dependencias, versiones corregidas y pruebas de los fallos anteriores.
5. **Comportamiento e interfaz:** zona horaria, géneros secundarios, identidad de agrupación, contraste, teclado y estilos por componente.

Las primeras pruebas permanentes deberían verificar permisos por rol, entradas inválidas, confirmaciones seguras, selección de más de 20 fotos, errores de subida, limpieza de Storage y conservación de fechas. Son flujos con fallos reales y riesgo de regresión, por lo que aportan más que pruebas que solo repitan la implementación.
