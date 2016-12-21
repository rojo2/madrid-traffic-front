import Inferno from "inferno";
import Component from "inferno-component";

function Application(props) {
  return (
    <div className="Page">
      <Map />
      <Detail />
      <Timeline />
    </div>
  );
}

class Map extends Component {
  createGoogleMap(mapElement) {
    const map = new google.maps.Map(mapElement, {
      center: {lat: 40.4308087, lng: -3.6755942},
      mapTypeControl: false,
      scrollwheel: true,
      streetViewControl: false,
      zoom: 13
    });
  }

  render() {
    return (<div className="Map" id="map" ref={this.createGoogleMap.bind(this)}></div>);
  }
}

function Detail(props) {
  return (
    <div className="Detail">
        <section className="Detail__section">
            <div className="Detail__mainInfo">
                <div className="Detail__address">Av. Buenos Aires - Arroyo del Olivar-Av. Palomeras</div>
                <div className="Detail__streetView">
                    <img src="http://placekitten.com/1200/600"/>
                </div>
            </div>
        </section>
        <section className="Detail__section">
            <div className="Detail__dataField">
                <label>Intensidad</label>
                <div className="Detail__dataFieldValue">460</div>
            </div>
            <div className="Detail__dataField">
                <label>Ocupación</label>
                <div className="Detail__dataFieldValue">3</div>
            </div>
        </section>
        <section className="Detail__section">
            <div className="Detail__graph">Graph</div>
            <div className="Detail__graph">Graph</div>
        </section>
    </div>
  );
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
