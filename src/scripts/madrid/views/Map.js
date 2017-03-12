import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import MapStyles from "madrid/views/MapStyles";
import WebGLOverlay from "madrid/views/WebGLOverlay";
import mappedLocations from "madrid/data/mappedLocations";
import {ENTRY_SIZE} from "madrid/constants";

export class Map extends Component {
  constructor(props) {
    super(props);
    this._map = null;
    this._overlay = null;
    this.handleGoogleMaps = this.handleGoogleMaps.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.progress) {
      if (nextProps.progress !== this.props.progress && this._overlay !== null) {
        this._overlay.setProgress(nextProps.progress);
      }
    }

    if (nextProps.buffer && this.props.buffer !== nextProps.buffer) {
      if (this._overlay === null) {
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(40.33245364116177, -3.8369430001853404),
          new google.maps.LatLng(40.51340889639223, -3.580713428117341),
        );

        // obtenemos el mapa.
        const map = this._map;

        // creamos el overlay.
        const overlay = this._overlay = new WebGLOverlay(
          bounds,
          nextProps.buffer,
          nextProps.startDate,
          nextProps.endDate
        );
        overlay.setMap(map);

        // Este evento es llamado cuando movemos el ratón sobre el mapa.
        google.maps.event.addListener(map, "mousemove", (e) => {
          if (e && e.pixel) {
            overlay.setPosition(e.pixel.x,e.pixel.y);
            if (overlay.isOver) {
              map.setOptions({ draggableCursor: "pointer" });
            } else {
              map.setOptions({ draggableCursor: "move" });
            }
          }
        });

        // Este evento es llamado cuando se hace click sobre el mapa.
        // Como utilizamos una técnica de "picking" usando WebGL necesitamos
        // obtener el identificador a partir del overlay.
        google.maps.event.addListener(map, "click", (e) => {
          if (e && e.pixel) {
            overlay.setPosition(e.pixel.x,e.pixel.y);
            const id = overlay.getId();
            if (id && mappedLocations[id]) {
              const offset = Math.floor(Math.floor(this.props.progress * this.props.buffer.byteLength) / ENTRY_SIZE) * ENTRY_SIZE;
              const data = this.props.buffer.slice(offset, offset + ENTRY_SIZE);
              const view = new Float32Array(data);
              // TODO: Datos.
              const averageSpeed = 0; //view[4];
              const occupancy = 0; //view[5];
              const load = 0; //view[6];
              const intensity = 0; //view[7];
              const mappedLocation = mappedLocations[id];
              const dataMappedLocation = Object.assign({},mappedLocation, {
                data: {
                  averageSpeed,
                  occupancy,
                  load,
                  intensity
                }
              });
              this.props.onDetail(dataMappedLocation);
            }
          }
        });
      } else {
        const overlay = this._overlay;
        overlay.setBuffer(nextProps.buffer);
      }
    }
  }

  handleGoogleMaps(mapElement) {
    const mapStyles = MapStyles;

    const styledMap = new google.maps.StyledMapType(mapStyles, {name: "Styled Map"});

    const map = this._map = new google.maps.Map(mapElement, {
      center: {
        lat: 40.4308087,
        lng: -3.6755942
      },
      mapTypeControl: false,
      scrollwheel: true,
      streetViewControl: false,
      zoom: 13,
      styles: mapStyles
    });

  }

  render() {
    return (
      <div className="Map" id="map" ref={this.handleGoogleMaps}>

      </div>
    );
  }
}

export default Map;
