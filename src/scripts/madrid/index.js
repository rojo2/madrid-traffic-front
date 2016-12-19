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

function Map(props) {
  return (
    <div className="Map"></div>
  );
}

function Detail(props) {
  return (
    <div className="Detail">
        <section className="Detail__section">
            <div className="Detail__mainInfo">
                <div className="Detail__address">Av. Buenos Aires - Arroyo del Olivar-Av. Palomeras</div>
                <div className="Detail__streetView">
                    <img src="http://placekitten.com/1024/768"/>
                </div>
            </div>
        </section>
        <section className="Detail__section">
            <div className="Detail__dataField">
                <label>Nº coches</label>
                <div className="Detail__dataFieldValue">456</div>
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
    <div className="Timeline">Timeline</div>
  );
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
