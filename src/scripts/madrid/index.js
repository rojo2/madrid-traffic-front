import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";
import Map from "madrid/views/Map";
import Detail from "madrid/views/Detail";
import Timeline from "madrid/views/Timeline";
import Loader from "madrid/views/Loader";

/**
 * Duración del progreso.
 */
const DURATION = 240000;

/**
 * Tiempo en el que termina el timeout y vuelve a comenzar
 * la ejecución del progreso.
 */
const TIMEOUT = 10000;

class Application extends Component {
  constructor(props) {
    super(props);
    this.handleDetailOpen = this.handleDetailOpen.bind(this);
    this.handleDetailClose = this.handleDetailClose.bind(this);

    this.handleTimelineRelease = this.handleTimelineRelease.bind(this);
    this.handleTimelineRangeChange = this.handleTimelineRangeChange.bind(this);
    this.handleTimelineProgressChange = this.handleTimelineProgressChange.bind(this);

    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.handleLoadEnd = this.handleLoadEnd.bind(this);
    this.handleLoadError = this.handleLoadError.bind(this);

    this._frame = this._frame.bind(this);
    this._frameID = null;

    this._timeoutID = null;

    this.state = {
      measurePoint: null,
      progress: 0.0,
      range: "day",
      autoplay: true,
      buffer: null
    };
  }

  _frame(t) {
    this.setState({ progress: (t % DURATION) / DURATION });
    this._requestFrame();
  }

  _cancelFrame() {
    if (this._frameID !== null) {
      window.cancelAnimationFrame(this._frameID);
      this._frameID = null;
    }
  }

  _requestFrame() {
    this._frameID = window.requestAnimationFrame(this._frame);
  }

  _cancelTimeout() {
    if (this._timeoutID !== null) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
  }

  _requestTimeout() {
    this._timeoutID = setTimeout(() => this._requestFrame(), TIMEOUT);
  }

  handleDetailOpen(measurePoint) {
    this.setState({ measurePoint });
  }

  handleDetailClose() {
    this.setState({ measurePoint: null });
  }

  handleTimelineRelease() {
    if (this.state.autoplay) {
      this._requestTimeout();
    }
  }

  handleTimelineProgressChange(progress) {
    this._cancelFrame();
    this.setState({ progress: progress });
  }

  handleTimelineRangeChange(range) {
    this.setState({ range: range });
  }

  handleLoadStart() {
    this._cancelFrame();
  }

  handleLoadEnd(buffer) {
    console.log("hola", buffer);
    this.setState({ buffer });
    this._requestFrame();
  }

  handleLoadError() {

  }

  componentWillUnmount() {
    this._cancelFrame();
  }

  render() {
    // TODO: Buscar una manera de determinar la fecha.
    const startDate = new Date(2016,6,1,19,30,0);
    const endDate = new Date(2016,6,31,0,0,0);
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const timeSpan = endTime - startTime;
    const progress = this.state.progress;
    const currentDate = new Date((timeSpan * progress) + startTime);
    return (
      <div className="Page">
        <Map buffer={this.state.buffer} startDate={startDate} endDate={endDate} progress={progress} onDetail={this.handleDetailOpen} />
        <div className="Page__UI">
          <Detail onClose={this.handleDetailClose} measurePoint={this.state.measurePoint} />
          <Loader onStart={this.handleLoadStart} onEnd={this.handleLoadEnd} onError={this.handleLoadError} url={`http://localhost:3000/bin/12-2016.bin`} />
          <Timeline startDate={startDate} endDate={endDate} currentDate={currentDate} progress={progress} range={this.state.range} onProgressChange={this.handleTimelineProgressChange} onRangeChange={this.handleTimelineRangeChange} onRelease={this.handleTimelineRelease} />
        </div>
      </div>
    );
  }
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
