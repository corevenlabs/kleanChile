/**
 * Lo que una subida le dice a quien está subiendo cuando algo falla.
 *
 * El navegador explica un fallo de red con "Failed to fetch" y nada más: lo
 * mismo si no hay internet, si el bucket rechazó el origen por CORS o si la
 * dirección firmada apunta a un host que no existe. Mostrar eso tal cual no le
 * dice nada a quien administra la tienda, así que cada paso de la subida tiene
 * su mensaje: qué pasó, qué hacer, y un código corto que, reenviado al equipo
 * técnico, dice en qué paso se cortó sin tener que reproducirlo.
 *
 * El error real va a la consola, que es donde lo va a buscar quien lo arregle.
 */

const MESSAGES = {
  // El Server Action que prepara la subida lanzó: casi siempre configuración.
  prepare:
    "No pudimos preparar la subida. Intenta de nuevo en unos minutos; si sigue pasando, avisa al equipo técnico (código SUBIDA-CONFIG).",
  // El PUT al bucket ni siquiera obtuvo respuesta: CORS, o un host que no existe.
  send: "No pudimos enviar el archivo al almacenamiento. Intenta de nuevo; si sigue pasando, avisa al equipo técnico (código SUBIDA-RED).",
  // El bucket respondió, pero con un error.
  rejected:
    "El almacenamiento rechazó el archivo. Intenta de nuevo; si sigue pasando, avisa al equipo técnico (código SUBIDA-RECHAZO).",
  // El original llegó al bucket pero el paso siguiente no respondió.
  process:
    "El archivo se subió, pero no pudimos terminar de procesarlo. Intenta de nuevo (código SUBIDA-PROCESO).",
  offline: "Parece que no hay conexión a internet. Revisa tu conexión e intenta de nuevo.",
};

/**
 * El mensaje para el paso que falló, registrando la causa real en la consola.
 *
 * Sin conexión es el único caso que la persona puede resolver sola, así que se
 * detecta antes que cualquier otro y no lleva código.
 */
export function uploadFailure(step, cause) {
  console.error(`[subida] falló en el paso «${step}»`, cause);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, message: MESSAGES.offline };
  }
  return { ok: false, message: MESSAGES[step] ?? MESSAGES.send };
}
