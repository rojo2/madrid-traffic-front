import Inferno from "inferno";
import Component from "inferno-component";

function Application(props) {
  return (
    <div>
      Hello World
      <Map />
      <Detail />
    </div>
  );
}

function Map(props) {
  return (
    <div>Map</div>
  );
}

function Detail(props) {
  return (
    <div>Detail</div>
  );
}

function Timeline(props) {
  return (
    <div>Timeline</div>
  );
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
