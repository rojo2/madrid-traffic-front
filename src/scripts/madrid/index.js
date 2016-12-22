import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";

class Application extends Component {
  constructor(props) {
    super(props);
    this.handleDetail = this.handleDetail.bind(this);
  }

  handleDetail(measurePoint) {
    this.setState({ measurePoint });
  }

  render() {
    return (
      <div className="Page">
        <Map onDetail={this.handleDetail} />
        <Detail measurePoint={this.state.measurePoint} />
        <Timeline />
      </div>
    );
  }
}

class Map extends Component {
  constructor(props) {
    super(props);
    this.map = null;
    this.selectedMarker = null;
    this.handleGoogleMaps = this.handleGoogleMaps.bind(this);
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
    const map = this.map = new google.maps.Map(mapElement, {
      center: {lat: 40.4308087, lng: -3.6755942},
      mapTypeControl: false,
      scrollwheel: true,
      streetViewControl: false,
      zoom: 13
    });

    API.measurePointLocation.find().then((measurePoints) => {
      measurePoints.forEach((measurePoint) => {
        const [lat,lng] = measurePoint.location.coordinates;
        const marker = new google.maps.Marker({
          position: new google.maps.LatLng(lat,lng),
          map: map,
          title: measurePoint.description
        });
        marker.addListener("click", this.handleDetail.bind(this,marker,measurePoint));
      });
    });
  }

  render() {
    return (<div className="Map" id="map" ref={this.handleGoogleMaps}></div>);
  }
}

class Detail extends Component {
  constructor(props) {
    super(props);
    this.view = null;
    this.handleGoogleStreetView = this.handleGoogleStreetView.bind(this);
  }

  handleGoogleStreetView(streetViewElement) {
    const {measurePoint} = this.props;
    if (measurePoint) {
      const [lat,lng] = measurePoint.location.coordinates;
      const view = this.view = new google.maps.StreetViewPanorama(streetViewElement, {
        position: new google.maps.LatLng(lat,lng),
        disableDefaultUI: true,
        zoom: 1
      });
    } else {
      const view = this.view = new google.maps.StreetViewPanorama(streetViewElement, {
        disableDefaultUI: true,
        zoom: 1
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.measurePoint !== this.props.measurePoint) {
      const {measurePoint} = nextProps;
      if (measurePoint === null) {
        this.view.setVisible(false);
      } else {
        const [lat,lng] = measurePoint.location.coordinates;
        this.view.setPosition(new google.maps.LatLng(lat,lng));
        this.view.setVisible(true);

        //console.log(measurePoint);
        API.measurePoint.findById(measurePoint.id).then((mp) => {
          console.log(mp);
        }).catch((err) => {
          console.error(err);
        });
      }
    }
  }

  componentWillUnmount() {
    this.view.setVisible(false);
  }

  render() {
    const {measurePoint} = this.props;
    const href = API.url("measure-point");
    const classes = classNames("Detail", {
      "is--hidden": !measurePoint
    });
    return (
      <div className={classes}>
        <section className="Detail__section">
          <div className="Detail__mainInfo">
            <div className="Detail__address">
              {measurePoint && measurePoint.description}
            </div>
            <div className="Detail__streetView" ref={this.handleGoogleStreetView}>
              <img src="http://placekitten.com/1200/600"/>
            </div>
          </div>
        </section>
        <section className="Detail__section">
          <div className="Detail__dataField">
            <label>Intensidad</label>
            <div className="Detail__dataFieldValue">
              460
            </div>
          </div>
          <div className="Detail__dataField">
            <label>Ocupación</label>
            <div className="Detail__dataFieldValue">
              3
            </div>
          </div>
        </section>
        <section className="Detail__section">
          <div className="Detail__graph">Graph</div>
          <div className="Detail__graph">Graph</div>
        </section>
        <section className="Detail__section">
          <a download href={href}>Descargar datos</a>
        </section>
      </div>
    );
  }
}

function Timeline(props) {
  return (
    <div className="Timeline">
        <nav className="Timeline__range">
            <a className="Timeline__rangeOption" href="#">Día</a>
            <a className="Timeline__rangeOption" href="#">Semana</a>
            <a className="Timeline__rangeOption" href="#">Mes</a>
        </nav>
        <div className="Timeline__slider">
            <div className="Timeline__base">
                <div className="Timeline__handler"></div>
            </div>
        </div>
    </div>
  );
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
