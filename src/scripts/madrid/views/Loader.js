import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";

export class Loader extends Component {
  constructor(props) {
    super(props);
    this._cancel = this._cancel.bind(this);
    this._handler = this._handler.bind(this);
    this._load = this._load.bind(this);
    this._xhr = null;
    this.state = {
      progress: 0,
      hasFailed: false,
      isComplete: false
    };
  }

  _handler(e) {
    if (e.type === "progress") {
      this.setState({
        progress: e.loaded / e.total,
        hasFailed: false,
        isComplete: false
      });
    } else if (e.type === "error"
            || e.type === "abort"
            || e.type === "timeout") {
      this.setState({
        hasFailed: true
      });
      this._removeListeners();
      this._xhr = null;
      this.props.onError();
    } else if (e.type === "load") {
      this.setState({
        progress: 1.0,
        isComplete: true
      });
      this._removeListeners();
      this.props.onEnd(this._xhr.response);
    } else if (e.type === "loadstart") {
      this.props.onStart();
    }
  }

  _load(url) {
    this._cancel();

    const xhr = this._xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "arraybuffer";
    xhr.addEventListener("load", this._handler);
    xhr.addEventListener("loadstart", this._handler);
    xhr.addEventListener("loadend", this._handler);
    xhr.addEventListener("abort", this._handler);
    xhr.addEventListener("error", this._handler);
    xhr.addEventListener("timeout", this._handler);
    xhr.addEventListener("progress", this._handler);
    xhr.send();
  }

  _removeListeners() {
    this._xhr.removeEventListener("load", this._handler);
    this._xhr.removeEventListener("loadstart", this._handler);
    this._xhr.removeEventListener("loadend", this._handler);
    this._xhr.removeEventListener("abort", this._handler);
    this._xhr.removeEventListener("error", this._handler);
    this._xhr.removeEventListener("timeout", this._handler);
    this._xhr.removeEventListener("progress", this._handler);
  }

  _cancel() {
    if (this._xhr) {
      this._removeListeners();
      this._xhr.cancel();
      this._xhr = null;
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.url) {
      if (nextProps.url !== this.props.url) {
        this._load(nextProps.url);
      }
    }
  }

  componentWillMount() {
    if (this.props.url) {
      this._load(this.props.url);
    }
  }

  render() {
    const styles = {
      transform: `scaleX(${this.state.progress})`
    };
    const classes = classNames("Loading", {
      "has--failed": this.state.hasFailed,
      "is--complete": this.state.isComplete
    });
    return (
      <div className={classes}>
        <div className="Loading__progress" style={styles}>

        </div>
      </div>
    );
  }
}

export default Loader;
