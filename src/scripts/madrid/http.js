import qs from "querystring";

export function getUrl(url,q) {
  if (q) {
    if (url.indexOf("?") < 0) {
      return `${url}?${qs.stringify(q)}`;
    } else {
      return `${url}&${qs.stringify(q)}`;
    }
  }
  return url;
}

export function loadBuffer(url,q) {
  return new Promise((resolve,reject) => {
    function handler(e) {
      const xhr = e.target;
      xhr.removeEventListener("load", handler);
      if (e.type === "load") {
        return resolve(xhr.response);
      } else {
        return reject();
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", handler);
    xhr.addEventListener("abort", handler);
    xhr.addEventListener("error", handler);
    xhr.addEventListener("timeout", handler);
    xhr.responseType = "arraybuffer";
    xhr.open("GET",getUrl(url,q),true);
    xhr.send();
  });
}

export function loadJSON(url,q) {
  return new Promise((resolve,reject) => {
    function handler(e) {
      const xhr = e.target;
      xhr.removeEventListener("load", handler);
      if (e.type === "load") {
        return resolve(xhr.response);
      } else {
        return reject();
      }
    }

    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", handler);
    xhr.addEventListener("abort", handler);
    xhr.addEventListener("error", handler);
    xhr.addEventListener("timeout", handler);
    xhr.responseType = "json";
    xhr.open("GET",getUrl(url,q),true);
    xhr.send();
  });
}

export default {
  loadJSON,
  loadBuffer,
  getUrl
};
