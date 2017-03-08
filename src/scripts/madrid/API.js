import { loadJSON, loadBuffer, getUrl } from "madrid/http";
import qs from "querystring";

//const API = "http://172.25.0.3:3002";
const API = "http://localhost:3000";

const measurePoint = {
  get(q) {
    return loadBuffer(`${API}/bin/2016-12.bin`,q);
  },
  find(q) {
    return loadJSON(`${API}/measure-point`,q);
  },
  findById(id,q) {
    return loadJSON(`${API}/measure-point/${id}`,q);
  }
};

const measurePointLocation = {
  find(q) {
    return loadJSON(`${API}/measure-point-location`,q);
  },
  findById(id,q) {
    return loadJSON(`${API}/measure-point-location/${id}`,q);
  },
  findNear(q) {
    return loadJSON(`${API}/measure-point-location`,q);
  }
};

function url(u,q) {
  return getUrl(`${API}/${u}`,q);
}

export default {
  url,
  measurePoint,
  measurePointLocation
};
