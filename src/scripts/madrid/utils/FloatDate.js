/**
 * ¿Qué es el FloatDate?
 *
 * La imposibilidad de trabajar con fechas (y sobretodo con doubles) en WebGL
 * hace necesario crear un formato de fechas optimizado para el render.
 *
 * La fecha inicial en vez de ser la EPOCH, ésta es mucho más reciente, el
 * 1 de Julio de 2013 (que es la fecha a partir de la cuál tenemos datos de
 * tráfico).
 *
 * El marco de tiempo es el minuto, así como las fechas de 64bits son los
 * milisegundos, en nuestro caso son los minutos ya que las mediciones ocurren
 * cada pocos minutos.
 */
const TIME_FRAME = 60000;

const INITIAL_DATE = new Date(2013,6,1,0,0,0);

/**
 * Transforma una fecha en el formato Float32 definido por Madrid Traffic.
 *
 * @param {Date} date
 * @return {number}
 */
export function fromDateToFloat(date) {
  return (date.getTime() - INITIAL_DATE.getTime()) / TIME_FRAME;
}

/**
 * Transforma una fecha de Float32 a un objeto Date.
 *
 * @param {Date} date
 * @param {number} value
 * @return {Date}
 */
export function fromFloatToDate(date, value) {
  date.setTime((value * TIME_FRAME) + INITIAL_DATE.getTime());
  return date;
}

export default {
  fromDateToFloat,
  fromFloatToDate
}
