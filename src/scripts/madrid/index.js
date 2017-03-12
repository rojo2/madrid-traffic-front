import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import Map from "madrid/views/Map";
import Detail from "madrid/views/Detail";
import Timeline from "madrid/views/Timeline";
import Loader from "madrid/views/Loader";
import {START_DATE,END_DATE,DURATION,TIMEOUT,FRAME_RATE} from "madrid/constants";
import moment from "moment";
import locale from "moment/locale/es";

class Application extends Component {
  constructor(props) {
    super(props);

    moment.updateLocale("es", locale);

    this.handleDetailOpen = this.handleDetailOpen.bind(this);
    this.handleDetailClose = this.handleDetailClose.bind(this);

    this.handleTimelineRelease = this.handleTimelineRelease.bind(this);
    this.handleTimelineRangeChange = this.handleTimelineRangeChange.bind(this);
    this.handleTimelineProgressChange = this.handleTimelineProgressChange.bind(this);

    this.handleLoadStart = this.handleLoadStart.bind(this);
    this.handleLoadEnd = this.handleLoadEnd.bind(this);
    this.handleLoadError = this.handleLoadError.bind(this);

    this.handleToggle = this.handleToggle.bind(this);

    this._frame = this._frame.bind(this);
    this._frameID = null;

    this._startTime = null;
    this._currentTime = null;
    this._previousTime = null;
    this._cancelTime = 0;

    this._timeoutID = null;

    this.state = {
      isRunning: true,
      measurePoint: null,
      progress: 0.0,
      range: "day",
      autoplay: false,
      buffer: null
    };
  }

  _frame() {
    this._currentTime = Date.now();
    const t = this._currentTime - this._startTime;
    const delta = (this._currentTime - this._previousTime) / FRAME_RATE;
    this._previousTime = this._currentTime;
    this.setState({
      progress: this.state.progress + (delta / DURATION)
    });
    this._requestFrame();
  }

  _cancelFrame() {
    if (this._frameID !== null) {
      window.cancelAnimationFrame(this._frameID);
      this._frameID = null;
      this._cancelTime = this._currentTime - this._startTime;
      this._startTime = null;
      this._currentTime = null;
    }
  }

  _requestFrame() {
    if (this._startTime === null) {
      this._previousTime = this._currentTime = Date.now();
      this._startTime = this._currentTime - this._cancelTime;
    }
    this._frameID = window.requestAnimationFrame(this._frame);
  }

  _cancelTimeout() {
    if (this._timeoutID !== null) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
  }

  _requestTimeout() {
    this._timeoutID = setTimeout(() => {
      this._requestFrame();
      this._timeoutID = null;
    }, TIMEOUT);
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
    this.setState({
      progress: progress,
      isRunning: false
    });
  }

  handleTimelineRangeChange(range) {
    this.setState({ range: range });
  }

  handleLoadStart() {
    this._cancelFrame();
  }

  handleLoadEnd(buffer) {
    this.setState({ buffer });
    this._requestFrame();
  }

  handleLoadError() {

  }

  handleToggle() {
    if (this.state.isRunning) {
      this._cancelFrame();
    } else {
      this._requestFrame();
    }
    this.setState({ isRunning: !this.state.isRunning });
  }

  componentWillUnmount() {
    this._cancelFrame();
  }

  render() {
    const startDate = START_DATE;
    const endDate = END_DATE;
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const timeSpan = endTime - startTime;
    const progress = this.state.progress;
    const isRunning = this.state.isRunning;
    const currentDate = new Date((timeSpan * progress) + startTime);
    return (
      <div className="Page">
        <Map buffer={this.state.buffer} startDate={startDate} endDate={endDate} currentDate={currentDate} progress={progress} onDetail={this.handleDetailOpen} />
        <div className="Page__UI">
          <Detail isRunning={isRunning} buffer={this.state.buffer} startDate={startDate} endDate={endDate} progress={progress} onClose={this.handleDetailClose} measurePoint={this.state.measurePoint} />
          <Loader onStart={this.handleLoadStart} onEnd={this.handleLoadEnd} onError={this.handleLoadError} url={`http://localhost:3000/bin/2016-12.bin`} />
          <Timeline isRunning={isRunning} startDate={startDate} endDate={endDate} currentDate={currentDate} progress={progress} range={this.state.range} onProgressChange={this.handleTimelineProgressChange} onRangeChange={this.handleTimelineRangeChange} onRelease={this.handleTimelineRelease} onToggle={this.handleToggle} />
        </div>
      </div>
    );
  }
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
