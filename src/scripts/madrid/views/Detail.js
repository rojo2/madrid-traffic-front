import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";

export class Detail extends Component {
  constructor(props) {
    super(props);
    this.view = null;
    this.handleGoogleStreetView = this.handleGoogleStreetView.bind(this);
    this.handleGraph = this.handleGraph.bind(this);
    this.handleClose = this.handleClose.bind(this);
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
          this.setState({
            data: mp
          });
          //console.log(mp);
        }).catch((err) => {
          console.error(err);
        });
      }
    }
  }

  componentDidUpdate(prevProps,prevState) {
    if (this.state.data !== prevState.data) {
      this.renderGraph(this.graph, ["intensity","load"]);
    }
  }

  componentWillUnmount() {
    this.view.setVisible(false);
  }

  handleGraph(canvas) {
    this.graph = canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  handleClose(e) {
    e.preventDefault();
    this.props.onClose();
  }

  renderGraphBackground(context) {
    const {data} = this.state;
    const {canvas} = context;
    const cw = Math.floor(canvas.width / data.length);
    let cx = canvas.width;
    for (let index = data.length - 1; index >= 0; index--) {
      context.beginPath();
      context.moveTo(cx,0);
      context.lineTo(cx,canvas.height);
      context.strokeStyle = "#eee";
      context.stroke();
      //context.closePath();
      cx -= cw + 1;
    }

    const lines = 5;
    for (let index = 0; index < lines; index++) {
      const py = index / (lines - 1);
      const cy = py * canvas.height;
      context.beginPath();
      context.moveTo(0,cy);
      context.lineTo(canvas.width,cy);
      context.strokeStyle = "#eee";
      context.stroke();
    }
  }

  renderGraphLine(context,field,color) {
    const {data} = this.state;
    const {canvas} = context;
    const [first] = data.slice(0,1);
    const [last] = data.slice(-1);
    const values = data.map((current) => current[field]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const cw = Math.floor(canvas.width / values.length);
    let cx = canvas.width;
    context.beginPath();
    for (let index = values.length - 1; index >= 0; index--) {
      const current = values[index];
      const px = index / (values.length - 1);
      const py = (current - min) / (max - min);
      const cy = Math.floor(canvas.height - (py * canvas.height));
      const ch = Math.ceil(py * canvas.height);
      cx -= cw + 1;
      if (index === values.length - 1) {
        context.moveTo(cx,cy);
      } else {
        context.lineTo(cx,cy);
      }
    }
    context.lineWidth = 2;
    context.strokeStyle = color;
    context.stroke();
  }

  renderGraph(canvas, fields) {
    const {data} = this.state;
    const colors = ["#29cc75","#ebda47","#cc6a29","#cc2933"];
    if (data) {
      const context = canvas.getContext("2d");
      context.clearRect(0,0,canvas.width,canvas.height);
      this.renderGraphBackground(context);
      for (let index = 0; index < fields.length; index++) {
        const color = colors[index];
        const field = fields[index];
        this.renderGraphLine(context, field, color);
      }
    }
  }

  getField(field) {
    const {data} = this.state;
    if (data) {
      const [first] = data.slice(0,1);
      if ((first.kind === "PUNTOS MEDIDA M-30" && field === "average") || field !== "average") {
        return first[field];
      }
    }
    return "-";
  }

  getIntensity() {
    return this.getField("intensity");
  }

  getLoad() {
    return this.getField("load");
  }

  getOccupancy() {
    return this.getField("occupancy");
  }

  getAverageVelocity() {
    return this.getField("average");
  }

  render() {
    const {measurePoint} = this.props;
    const href = API.url("measure-point");
    const classes = classNames("Detail", {
      "is--hidden": !measurePoint
    });
    return (
      <div className={classes}>
        <a className="Detail__close" href="#" onClick={this.handleClose}>
          ×
        </a>
        <section className="Detail__section">
          <div className="Detail__mainInfo">
            <div className="Detail__address">
              {(measurePoint && measurePoint.description) || "-"}
            </div>
            <div className="Detail__streetView" ref={this.handleGoogleStreetView}>
              <img src=""/>
            </div>
          </div>
        </section>
        <section className="Detail__stats">
          <div className="Detail__dataField">
            <label className="Detail__dataFieldLabel">Intensidad</label>
            <div className="Detail__dataFieldValue">{this.getIntensity()}</div>
          </div>
          <div className="Detail__dataField">
            <label className="Detail__dataFieldLabel">Carga</label>
            <div className="Detail__dataFieldValue">{this.getLoad()}</div>
          </div>
          <div className="Detail__dataField">
            <label className="Detail__dataFieldLabel">Ocupación</label>
            <div className="Detail__dataFieldValue">{this.getOccupancy()}</div>
          </div>
          <div className="Detail__dataField">
            <label className="Detail__dataFieldLabel">Velocidad media</label>
            <div className="Detail__dataFieldValue">{this.getAverageVelocity()}</div>
          </div>
        </section>
        <section className="Detail__section">
          <div className="Detail__graph">
            <canvas className="Detail__graphContainer" ref={this.handleGraph}></canvas>
          </div>
        </section>
        <section className="Detail__footer">
          <a className="Detail__downloadData" download href={href}>Descargar datos</a>
        </section>
      </div>
    );
  }
}

export default Detail;
