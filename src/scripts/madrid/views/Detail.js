import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import worker from "madrid/utils/Worker";
import {fromDateToFloat,fromFloatToDate} from "madrid/utils/FloatDate";

export class Detail extends Component {
  constructor(props) {
    super(props);
    this.view = null;
    this.handleGoogleStreetView = this.handleGoogleStreetView.bind(this);
    this.handleGraph = this.handleGraph.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleMessage = this.handleMessage.bind(this);

    this._startDate = new Date(2016,11,1,0,0,0);
    this._endDate = new Date(2016,11,31,23,59,59);
    this._currentDate = new Date(2016,11,1,0,0,0);
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
        worker.postMessage({
          type: "id",
          id: measurePoint.id
        });
      }
    } else if (nextProps.progress !== this.props.progress) {
      const startTime = fromDateToFloat(this.props.startDate);
      const endTime = fromDateToFloat(this.props.endDate);
      const currentTime = ((endTime - startTime) * nextProps.progress) + startTime;
      worker.postMessage({
        type: "time",
        time: currentTime
      });
    } else if (nextProps.buffer !== this.props.buffer) {
      worker.postMessage({
        type: "buffer",
        buffer: nextProps.buffer
      });
    }
  }

  componentDidUpdate(prevProps,prevState) {
    // TODO: Esto debería renderizar una gráfica con los datos de la zona.
  }

  componentDidMount() {
    worker.addEventListener("message", this.handleMessage);
  }

  componentWillUnmount() {
    this.view.setVisible(false);
  }

  handleMessage(e) {
    console.log(e);
    const {type,data} = e.data;
    if (type === "item") {
      this.setState({ data });
    }
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

  getField(field) {
    const data = (this.state.data);
    if (data) {
      return data[field];
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
    const href = "";
    const {measurePoint} = this.props;
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
          <a className="Detail__downloadData" href={"http://datos.madrid.es/portal/site/egob/menuitem.c05c1f754a33a9fbe4b2e4b284f1a5a0/?vgnextoid=33cb30c367e78410VgnVCM1000000b205a0aRCRD&vgnextchannel=374512b9ace9f310VgnVCM100000171f5a0aRCRD&vgnextfmt=default"}>Descargar datos</a>
        </section>
      </div>
    );
  }
}

export default Detail;
