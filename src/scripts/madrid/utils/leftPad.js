export function leftPad(v,l = 2,chr = "0") {
  let str = String(v);
  while (str.length < l) {
    str = chr + str;
  }
  return str;
}

export default leftPad;
