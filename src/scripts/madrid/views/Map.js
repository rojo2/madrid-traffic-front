import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";
import MapStyles from "madrid/views/MapStyles";
import WebGLOverlay from "madrid/views/WebGLOverlay";
import mappedLocations from "madrid/data/mappedLocations";

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
        const map = this._map;
        const overlay = this._overlay = new WebGLOverlay(bounds, nextProps.buffer);
        overlay.setMap(map);
        google.maps.event.addListener(map, "mousemove", function(e) {
          if (e && e.pixel) {
            overlay.setPosition(e.pixel.x,e.pixel.y);
            if (overlay.isOver) {
              map.setOptions({ draggableCursor: "pointer" });
            } else {
              map.setOptions({ draggableCursor: "move" });
            }
          }
        });
        google.maps.event.addListener(map, "click", function(e) {
          if (e && e.pixel) {
            overlay.setPosition(e.pixel.x,e.pixel.y);

            const id = overlay.getId();
            console.log(id);
            const mappedLocation = mappedLocations[id];
            console.log(mappedLocation);
          }
        });
      } else {
        const overlay = this._overlay;
        overlay.setBuffer(nextProps.buffer);
      }
    }
  }

  handleGoogleMaps(mapElement) {
    console.log("hey");
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
