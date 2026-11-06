# Archivo fotográfico de la Colección Jesús Retana

La aplicación puede abrir una ficha real para cada uno de los 1,582 registros de `Sheet3` y mostrar fotografías documentales en 1,423 de ellos. El valor del conjunto está en la relación entre nombre, categoría, contenido, destilería, folio e imagen. Una futura visita de Jesús al estante permitiría añadir ubicación física, testimonios y correspondencia con el ejemplar actual.

## Lectura de las tres hojas

| Hoja | Filas con nombre | Papel en el proyecto | Precaución de interpretación |
| --- | ---: | --- | --- |
| BASE | 2,922 | Vista extensa con nombre, categoría, contenido y la columna `Bottle No.`. Algunas filas posteriores incorporan datos adicionales. | `Bottle No.` tiene vacíos y valores repetidos. Se preserva en el libro original y se excluye del cruce fotográfico. |
| Sheet2 | 2,676 | Vista de descripción con categoría, detalle, contenido, productor, NOM y `% Agave`. | A2 dice `Foto`, pero la columna A carece de valores en las filas de datos. |
| Sheet3 | 1,582 | Catálogo de consulta. C contiene `#`, D contiene `FOTO` y F identifica `TEQUILA`. Las columnas G:M contienen categoría, detalle, contenido, destilería, NOM, tipo y grado. | Los 1,582 números de C son únicos y cubren 1–1582. Una fila constituye una entrada documental. El número físico de botellas requiere conciliación. |

En una comparación conservadora por **nombre + categoría + contenido**, 1,434 filas de `Sheet3` encuentran esa misma combinación en `BASE` y 1,436 en `Sheet2`. Sólo 1,219 y 1,221, respectivamente, forman pares únicos en ambas hojas. Para comparar se normalizaron espacios, mayúsculas y acentos. Se mantuvieron las denominaciones y unidades de origen. Estas coincidencias explican por qué los totales de las hojas deben leerse por separado. La suma de filas duplicaría parte del archivo.

El libro tiene dos comentarios de celda y carece de fórmulas en las tres hojas. No hay fotografías incrustadas en `xl/media`. Las fotografías llegan en el ZIP separado. El libro y el ZIP se abrieron en modo lectura. Sus huellas SHA-256 están en `auditoria.json`.

## Cruce documental de fotos

El ZIP contiene 3,118 entradas, de las cuales 1,558 son JPEG en la carpeta de imágenes, 1,559 pertenecen a `__MACOSX` y una es el directorio principal. Se leyeron los 1,558 JPEG completos. Todos tienen 600 píxeles de altura y anchuras entre 124 y 1,027 píxeles. No hay duplicados exactos por SHA-256 dentro de esos JPEG.

Para vincular una foto se toma cada referencia explícita de `Sheet3!D`. Se exigen cuatro dígitos iniciales y se conserva el sufijo completo. Se compara con el nombre de un JPEG `BOTELLA-…`, ignorando sólo mayúsculas, acentos, espacios, guiones, separadores y las terminaciones de producción `_WB` o `_WB_CC`. Se exige un solo archivo para esa clave y una sola fila de destino. Por ejemplo, `0332caja` corresponde a `Botella-0332Caja_WB_CC.jpg`. Los archivos llamados `…Blan` y las referencias que terminan en `blanco` se reservan para revisión. El folio identifica una referencia fotográfica. La posición del estante sigue pendiente de levantamiento.

| Resultado | Cantidad | Lectura |
| --- | ---: | --- |
| Fichas con todas sus referencias resueltas | 1,385 | Tienen al menos una fotografía. |
| Fichas con enlace parcial | 38 | Una o más fotos están disponibles y parte de las referencias sigue pendiente. |
| Fichas pendientes de foto | 159 | Se conservan en el catálogo y son consultables por sus demás datos. |
| Fotografías con enlace único | 1,519 | Representan 1,423 fichas, un 89.9 % del catálogo principal. |
| Fotografías sin enlace seguro | 39 | Requieren revisar abreviaturas, referencias o conflictos. |

Hay 1,339 fichas con una fotografía, 76 con dos, seis con tres, una con cuatro y una con seis. Quedan 241 referencias de celda sin resolver bajo la regla adoptada: 225 sin coincidencia de nombre, 10 con más de un archivo candidato y seis con folio compartido entre filas. Por ejemplo, las filas 366 y 367 usan el mismo `1148` para dos registros. El archivo fotográfico de ese folio se dejó pendiente. En `referencias-por-cotejar.csv` consta el motivo de cada excepción y en `archivos-zip.csv` figura la procedencia de cada JPEG.

## Cobertura y calidad del archivo principal

| Campo | Registros disponibles / 1,582 | Tratamiento |
| --- | ---: | --- |
| Nombre | 1,582 | Se conserva la grafía de la fuente, incluidas marcas escritas como números. Hay 846 nombres distintos después de normalizar espacios. |
| Categoría | 1,582 | Se conservan 57 denominaciones literales. `Silver`, `Plata`, `White` y `Blanco` siguen siendo filtros distintos. |
| Contenido neto | 1,546 | Se mantienen las unidades consignadas y se dejan vacías las menciones explícitas sin información. |
| Destilería o productor | 1,560 | Es el texto de la columna J, que a menudo incluye localidad. |
| NOM de cuatro dígitos | 1,278 | Conteo por formato. En otras 90 filas aparece `DGN` (73), `856` (14) o `740` (3). Se conserva la anotación de origen sin completar ni certificar códigos. |
| TIPO expresado como porcentaje | 888 | El valor 1 con formato porcentual se presenta como 100 % y 0.99 como 99 %. El encabezado de `Sheet3` dice `TIPO`; `Sheet2` emplea `% Agave`. |
| GRADO | 113 | Se conserva el literal de la columna M, por ejemplo `38% Alc. Vol.`. |
| Detalle disponible para la interfaz | 363 | Se excluyó una anotación familiar. Las columnas auxiliares y comentarios internos quedan en el original. |

Predominan Reposado (596), Blanco (379), Añejo (261), Joven (79), Gold (72) y Silver (43). Son descripciones del archivo familiar. Se conservan para que Jesús pueda validar su terminología antes de establecer un vocabulario curatorial.

## Seis estaciones con evidencia

Se eligieron seis fichas por su diversidad visual, la referencia fotográfica única y su valor para explicar cómo se lee un objeto. Las imágenes de estas seis estaciones se inspeccionaron visualmente. Las atribuciones de productor, material, época o edición se presentan como datos del archivo cuando así constan.

| Estación | Registro y fila | Referencia fotográfica | Qué se puede explicar |
| --- | --- | --- | --- |
| 3 Magueyes | RET-1110 · Sheet3 fila 36 | 0304 | Perfil redondo y etiqueta. El calificativo «antigua» procede del campo detalle y carece de fecha confirmada. |
| Cuervo 1800 | RET-0703 · fila 354 | 0332, 0332caja | Botella y estuche en vistas separadas. La fuente consigna tapón de cristal y anotación `DGN`. |
| Don Tacho Milenio | RET-1346 · fila 534 | 0526, 0526-bis | Presentación del envase junto a su estuche. El nombre de la edición está documentado en la ficha. |
| Jorongo «Dios Tlaloc» | RET-1143 · fila 893 | 1372 | Forma escultórica y cerámica mate según el detalle de la hoja. |
| Ley .925 | RET-0418 · fila 1001 | 0782 | La superficie y el diseño de la etiqueta invitan a una lectura detallada. La composición material requiere documentación adicional. |
| Manuel Allende R. | RET-1042 · fila 1043 | 0616 | Revestimiento de paja visible. La ficha carece de contenido neto documentado. |

Las fotografías vinculadas permiten mostrar el frente y algunas vistas adicionales. La reconstrucción en 3D aporta un lugar de visita y un punto para abrir estas fichas. Un modelo tridimensional preciso de cada botella exigiría vistas y medidas adicionales. Las coordenadas de las estaciones son decisiones de exposición digital.

## Entrega y comprobación

`catalogo.json` contiene las 1,582 fichas, el índice de las seis estaciones y las estadísticas. `fotos/` contiene 1,519 derivados WebP con metadatos de origen retirados, aspecto conservado y enlace al nombre del JPEG original en el JSON. `seleccion.json` describe las seis estaciones. Los trazados técnicos se conservan en `auditoria.json`, `archivos-zip.csv` y `referencias-por-cotejar.csv`. `filas-otras-hojas.csv` permite ubicar los nombres de BASE y Sheet2 sin trasladar anotaciones personales al catálogo.

Cada ruta fotográfica del catálogo se comprobó en disco. Las 1,582 claves son únicas y proceden de `Sheet3!C4:C1585`. Los derivados del ZIP conservan en cada ficha el número de fila y el nombre exacto de su fuente para facilitar una futura revisión de Jesús.
