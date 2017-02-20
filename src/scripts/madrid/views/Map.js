import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";
import MapStyles from "madrid/views/MapStyles";
import WebGLOverlay from "madrid/views/WebGLOverlay";

export class Map extends Component {
  constructor(props) {
    super(props);
    this.map = null;
    this.overlay = null;
    this.selectedMarker = null;
    this.handleGoogleMaps = this.handleGoogleMaps.bind(this);
    this.handleDetail = this.handleDetail.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.measurePoint === null) {
      if (this.selectedMarker !== null) {
        this.selectedMarker.setAnimation(null);
        this.selectedMarker = null;
      }
    }

    if (nextProps.progress) {
      if (nextProps.progress !== this.props.progress && this.overlay !== null) {
        this.overlay.setProgress(nextProps.progress);
      }
    }
  }

  handleDetail(marker,measurePoint) {
    if (this.selectedMarker !== marker) {
      if (this.selectedMarker !== null) {
        this.selectedMarker.setAnimation(null);
      }
      this.selectedMarker = marker;
      this.selectedMarker.setAnimation(google.maps.Animation.BOUNCE);
    } else {
      if (this.selectedMarker !== null) {
        this.selectedMarker.setAnimation(null);
      }
      this.selectedMarker = null;
    }

    if (this.selectedMarker === null) {
      this.props.onDetail(null);
    } else {
      this.props.onDetail(measurePoint);
    }
  }

  handleGoogleMaps(mapElement) {
    const mapStyles = MapStyles;

    const styledMap = new google.maps.StyledMapType(mapStyles, {name: "Styled Map"});

    const map = this.map = new google.maps.Map(mapElement, {
      center: {lat: 40.4308087, lng: -3.6755942},
      mapTypeControl: false,
      scrollwheel: true,
      streetViewControl: false,
      zoom: 13,
      styles: mapStyles
    });

    //marker.setMap(map);
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(40.33245364116177, -3.8369430001853404),
      new google.maps.LatLng(40.51340889639223, -3.580713428117341),
    );

    API.measurePoint.get().then((buffer) => {
      console.log(buffer.byteLength / 36);
      const overlay = this.overlay = new WebGLOverlay(bounds, buffer);
      overlay.setMap(map);
    });

    /*
    API.measurePointLocation.find().then((measurePoints) => {
      measurePoints.forEach((measurePoint) => {
        const {load} = measurePoint;
        const [measurePointInfo] = measurePoint.pos;
        if (measurePointInfo && measurePointInfo.location) {
          const [lat,lng] = measurePointInfo.location.coordinates;
          const i = 3 - Math.floor(load / 25);
          const icon = new google.maps.MarkerImage("img/spritepoint.png", new google.maps.Size(16,16), new google.maps.Point(i * 20,0));
          const marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat,lng),
            map: map,
            title: measurePointInfo.description,
            icon: icon
          });
          marker.addListener("click", this.handleDetail.bind(this,marker,measurePointInfo));
        }
      });
    });
    */
  }

  render() {
    return (<div className="Map" id="map" ref={this.handleGoogleMaps}></div>);
  }
}

export default Map;
