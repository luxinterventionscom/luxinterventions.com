// Manual — español
export default {
  title: 'Manual de la aplicación INTERVENTIONS',
  sub: 'La central y sus aplicaciones — guía ilustrada',
  toc: 'Índice',
  shotsNote: 'Las capturas muestran datos de ejemplo ficticios.',
  sec: {
    intro: ['Visión general', `
<p>La aplicación reúne en una sola <b>central</b> todo lo necesario para gestionar inmuebles: intervenciones técnicas, inquilinos, alquileres, hoteles, Airbnb, taxis, agencias, propietarios y contabilidad. Alrededor de la central, cada persona recibe su propia aplicación, sin contraseña: basta un <b>código de acceso</b>.</p>
<table><tr><th>Aplicación</th><th>Para quién</th><th>Qué hace</th></tr>
<tr><td>🏢 Central</td><td>Usted (gestor)</td><td>Gestionarlo todo, crear los accesos de las otras aplicaciones</td></tr>
<tr><td>🏠 Espacio del inquilino</td><td>Inquilinos</td><td>Solicitudes de intervención, documentos, alquileres, mensajes</td></tr>
<tr><td>🛠️ Equipo</td><td>Técnicos</td><td>Intervenciones del día, fotos, firma, fin del trabajo</td></tr>
<tr><td>🛎️ Mi estancia</td><td>Clientes de hotel / Airbnb</td><td>Llegada, taxi, habitación, servicios, mensajes</td></tr>
<tr><td>🚕 Taxi</td><td>Empresas de taxi</td><td>Conductores, coches, tarifas, carreras por aceptar</td></tr>
<tr><td>📣 Anuncios</td><td>Restaurantes, bares (HORECA)</td><td>Publicidad, menús, eventos en las aplicaciones</td></tr>
<tr><td>🔑 Central del cliente</td><td>Administraciones, agencias, hoteles clientes</td><td>Su propia central, con licencia</td></tr></table>
<p>Todos los datos se <b>cifran en el dispositivo</b> antes de enviarse: el servidor solo guarda cajas fuertes ilegibles.</p>`],
    start: ['Primeros pasos', `
<ol><li>Abra la central en el móvil o en el ordenador y elija su <b>clave de acceso</b> (una frase larga que solo usted conoce). Guárdela en un lugar seguro: sin ella nadie — ni siquiera nosotros — puede leer los datos.</li>
<li>En el móvil, añada la central a la pantalla de inicio: se abrirá como una aplicación.</li>
<li>La central solo está abierta en <b>un dispositivo a la vez</b>. Si la abre en otro, toque <b>«Tomar el control»</b>: el otro dispositivo se cierra.</li>
<li>El idioma se elige en <b>Ajustes</b> (francés, italiano, alemán, inglés, portugués, español).</li></ol>
<p>En el móvil el menú es una barra abajo que se desliza con el dedo; en el ordenador está a la izquierda. Los botones <b>＋</b> crean directamente una ficha.</p>`],
    accueil: ['Inicio', `
<p>El inicio resume el día: intervenciones abiertas y urgentes, alquileres pendientes, llegadas al hotel, mensajes sin leer. Toque un número para ir directamente a la lista correspondiente.</p>`],
    maintenance: ['Mantenimiento e intervenciones', `
<p><b>Mantenimiento</b> reúne todas las intervenciones: las creadas por usted, las solicitadas por los inquilinos y las enviadas por sus clientes con licencia.</p>
<ol><li>Toque <b>＋</b> para crear una intervención: inmueble, vivienda, descripción, urgencia, fotos.</li>
<li>Elija el <b>técnico</b>: la recibe al instante en su aplicación Equipo.</li>
<li>Siga el estado: pendiente, en curso, terminada. El técnico añade fotos y firma; usted valida.</li></ol>
<p>La ficha de un técnico contiene sus datos, su oficio y la pestaña <b>App</b> que crea su código de acceso. La <b>Clasificación</b> premia a los inquilinos más activos («inquilino del año»).</p>`],
    proprietes: ['Mis propiedades', `
<p>Aquí registra sus inmuebles y sus viviendas (pisos, estudios, oficinas, garajes…). Cada vivienda puede recibir un inquilino. Las pestañas <b>Inquilinos</b> y <b>Gestión inq.</b> están en esta sección.</p>`],
    locataires: ['Inquilinos y su aplicación', `
<ol><li>En <b>Inquilinos</b>, toque <b>＋</b> y rellene la ficha: nombre, teléfono, vivienda, alquiler, gastos, inicio del contrato.</li>
<li>Abra la ficha, pestaña <b>Espacio</b>, y active el <b>espacio del inquilino</b>: aparece un código de acceso.</li>
<li>Envíe el enlace y el código al inquilino (WhatsApp, SMS, e-mail). Abre la aplicación, escribe el código y listo.</li>
<li>Si el inquilino pierde el código, abra de nuevo la pestaña <b>Espacio</b> y cree un <b>código nuevo</b>: el antiguo deja de funcionar.</li></ol>`],
    loyers: ['Alquileres', `
<p><b>Gestión inq.</b> muestra, mes a mes, los alquileres previstos, pagados y atrasados. Registre un pago con un toque; el inquilino encuentra los recibos en su aplicación.</p>`],
    hotel: ['Hotel', `
<p>La sección <b>Hotel</b> gestiona habitaciones y clientes.</p>
<ol><li><b>Ajustes del hotel</b>: nombre, dirección, servicios, menú en PDF.</li>
<li><b>Habitaciones</b>: número, planta, categoría, tipo, número de personas, m², descripción e <b>inventario de entrada</b> con fotos.</li>
<li><b>Cliente</b>: nombre, país (con bandera), fechas, habitación, régimen de comidas, preferencias y alergias, hasta 7 fotos. Al guardar se crea un <b>código</b> para la aplicación <b>Mi estancia</b>.</li>
<li>A la salida, haga el <b>inventario de salida</b> del cliente.</li></ol>`],
    airbnb: ['Airbnb', `
<p>La sección <b>Airbnb</b> funciona como el hotel, para alojamientos alquilados por noche: alojamientos, huéspedes, inventarios, código de la aplicación Mi estancia.</p>`],
    taxis: ['Taxis', `
<p>Registre las empresas de taxi asociadas. Cada empresa recibe un código para su aplicación <b>Taxi</b>, donde gestiona conductores, coches y tarifas. Cuando un cliente pide un taxi en Mi estancia, la empresa recibe la carrera, la acepta o la rechaza, y el cliente sigue la llegada.</p>`],
    agences: ['Agencias, propietarios y patrimonio', `
<p><b>Agencias</b>: las agencias inmobiliarias asociadas. Una agencia puede trabajar <b>por cuenta propia</b>, para <b>propietarios</b> o para <b>fondos de inversión</b>.</p>
<p><b>Propietarios</b>: los propietarios de los inmuebles que gestiona.</p>
<p><b>Patrimonio</b>: en cada ficha indique, por tipo de bien (pisos, estudios, garajes, plazas de aparcamiento, oficinas, restaurantes…), la cantidad con el menú 1…10 / 10+ y luego el número exacto.</p>`],
    gerances: ['Administraciones', `
<p>Las administraciones de fincas con las que trabaja: datos, inmuebles, patrimonio. También pueden recibir su propia central con licencia.</p>`],
    compta: ['Contabilidad, suscripciones y anunciantes', `
<p><b>Contabilidad</b>: ingresos y gastos, facturas de las intervenciones, totales mensuales.</p>
<p><b>Suscripciones</b>: las suscripciones de sus clientes y la pestaña <b>Anunciantes</b> (HORECA). Cree un anunciante: recibe un código para la aplicación <b>Anuncios</b>. Sus anuncios llegan aquí para su <b>aprobación</b> antes de aparecer en las aplicaciones.</p>
<p>El pago en línea aún no está conectado: el botón es visible pero indica «no conectado».</p>`],
    reglages: ['Ajustes', `
<p>Idioma, datos de la empresa, copia de seguridad: <b>Copia de seguridad cifrada</b> crea un archivo .ares legible solo con su clave, <b>Exportación legible</b> un archivo JSON sin cifrar, <b>Importar</b> carga uno u otro. Haga copias con regularidad y guárdelas fuera del móvil. Aquí están también las <b>Licencias</b>.</p>`],
    licences: ['Licencias', `
<p>Puede dar a sus clientes (administraciones, agencias, propietarios, hoteles, Airbnb) <b>su propia central</b>, separada y cifrada.</p>
<ol><li><b>Tarifas</b>: para cada sector, el precio de un año y el descuento para 2 y 3 años.</li>
<li><b>＋ Cliente</b>: sector, nombre, teléfono. El cliente empieza con una <b>prueba fija de 15 días</b> y recibe un código de acceso.</li>
<li>En la ficha del cliente elija el paquete de <b>1, 2 o 3 años</b>: el precio cambia según el paquete. Se crea una factura PDF, marcada pagada o pendiente.</li>
<li>Al vencer, la central del cliente pasa a <b>solo lectura</b>; puede <b>bloquearla</b>, crear un nuevo acceso o <b>borrarla</b> (se emite un certificado de borrado).</li></ol>
<p>La página Licencias muestra también estadísticas, registro y exportación CSV.</p>`],
    client: ['La central del cliente', `
<p>El cliente abre su central con su código y elige su propia clave. Solo ve las secciones de su sector, con un aviso de prueba o de vencimiento. Gestiona él mismo sus bienes; las <b>intervenciones</b> las sigue haciendo la central principal: sus <b>solicitudes</b> llegan cifradas directamente a su <b>Mantenimiento</b>.</p>`],
    appLoc: ['Aplicación Espacio del inquilino', `
<p>El inquilino ve su vivienda, alquileres y documentos. Envía una <b>solicitud de intervención</b> con fotos y sigue su avance. Recibe sus mensajes y avisos.</p>`],
    appEq: ['Aplicación Equipo', `
<p>El técnico ve las intervenciones del día con dirección y ruta. Añade fotos antes/después, recoge la firma y cierra la intervención: usted lo ve al instante en la central.</p>`],
    appSejour: ['Aplicación Mi estancia y página del conductor', `
<p>El cliente del hotel o del Airbnb abre <b>Mi estancia</b> con su código: estancia, habitación, servicios, menú, mensajes.</p>
<p><b>Llegada</b>: elige «por mi cuenta» o <b>taxi</b>. Con taxi ve la distancia en km y el precio en €, y sigue la hora de llegada del conductor. Durante la estancia puede reservar un conductor.</p>
<p>El conductor recibe un <b>enlace</b> (nada que instalar): «voy a recoger», «estoy en el lugar», «cliente a bordo», «llegado». Solo se transmite la hora de llegada, nunca la posición.</p>`],
    appTaxi: ['Aplicación Taxi', `
<p>La empresa de taxi registra sus <b>conductores</b> y <b>coches</b> en tres clases: <b>lujo</b>, <b>confort</b> y <b>eco</b>, con tarifas (bajada de bandera, km, hora, día) y extras (recepción, bebidas, guardaespaldas…). Recibe las carreras, las acepta o las rechaza y asigna el conductor.</p>`],
    appAnn: ['Aplicación Anuncios (HORECA)', `
<p>El restaurante o bar crea sus <b>anuncios</b>, menús y eventos: texto, imagen, días y horas, franja, aplicaciones destino y precio. Cada anuncio se envía para aprobación a la central antes de publicarse.</p>`],
    secu: ['Seguridad y buenas prácticas', `
<ul><li>Los datos se cifran en el dispositivo; su clave nunca se envía.</li>
<li>No comparta nunca su clave; las otras aplicaciones usan sus propios códigos, que puede sustituir en cualquier momento.</li>
<li>Haga copias de seguridad (Ajustes → Copia de seguridad cifrada) y guárdelas fuera del móvil; la exportación legible no está cifrada.</li>
<li>Solo un dispositivo abre la central: «Tomar el control» cierra el otro.</li></ul>`],
  },
};
