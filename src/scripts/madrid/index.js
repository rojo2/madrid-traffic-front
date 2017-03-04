import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";
import Map from "madrid/views/Map";
import Detail from "madrid/views/Detail";
import Timeline from "madrid/views/Timeline";

const DURATION = 60000;
const TIMEOUT = 10000;

class Application extends Component {
  constructor(props) {
    super(props);
    this.handleDetailOpen = this.handleDetailOpen.bind(this);
    this.handleDetailClose = this.handleDetailClose.bind(this);
    this.handleTimelineRangeChange = this.handleTimelineRangeChange.bind(this);
    this.handleTimelineProgressChange = this.handleTimelineProgressChange.bind(this);
    this._frame = this._frame.bind(this);
    this._frameID = null;
    this._timeoutID = null;
    this.state = {
      measurePoint: null,
      progress: 0.0,
      range: "day"
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

  handleTimelineProgressChange(progress) {
    this._cancelFrame();
    this._requestTimeout();
    this.setState({ progress: progress });
  }

  handleTimelineRangeChange(range) {
    this.setState({ range: range });
  }

  componentWillMount() {
    this._requestFrame();
  }

  render() {
    // TODO: Buscar una manera de determinar la fecha.
    const startDate = new Date(2016,6,1,19,30,0);
    const endDate = new Date(2016,6,31,0,0,0);
    const progress = this.state.progress;
    const currentDate = new Date(((endDate.getTime() - startDate.getTime()) * progress) + startDate.getTime());
    return (
      <div className="Page">
        <Map startDate={startDate} endDate={endDate} progress={progress} onDetail={this.handleDetailOpen} measurePoint={this.state.measurePoint} />
        <div className="Page__UI">
          <Detail onClose={this.handleDetailClose} measurePoint={this.state.measurePoint} />
          <Timeline startDate={startDate} endDate={endDate} currentDate={currentDate} progress={progress} range={this.state.range} onProgressChange={this.handleTimelineProgressChange} onRangeChange={this.handleTimelineRangeChange} />
        </div>
      </div>
    );
  }
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
