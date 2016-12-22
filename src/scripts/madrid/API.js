import fetch from "madrid/http";
import qs from "querystring";

const API = "http://172.25.0.3:3002";

const measurePoint = {
  find(q) {
    return fetch(`${API}/measure-point`,q);
  },
  findById(id,q) {
    return fetch(`${API}/measure-point/${id}`,q);
  }
};

const measurePointLocation = {
  find(q) {
    return fetch(`${API}/measure-point-location`,q);
  },
  findById(id,q) {
    return fetch(`${API}/measure-point-location/${id}`,q);
  },
  findNear(q) {
    return fetch(`${API}/measure-point-location`,q);
  }
};

export default {
  measurePoint,
  measurePointLocation
};
