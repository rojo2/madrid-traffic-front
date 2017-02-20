import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";

function getTimelineRangeOptionClasses(range, id) {
  return classNames("Timeline__rangeOption", {
    "is-active": range === id
  });
}

function getTimelineLegendItems(range, startDate, endDate) {
  switch (range) {
    default:
    case "day":
      return [
        "00:00",
        "01:00",
        "02:00",
        "03:00",
        "04:00",
        "05:00",
        "06:00",
        "07:00",
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00"
      ];

    case "week":
      return [
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
        "Domingo"
      ];

    case "month":
      const numDays = endDate.getDate() - startDate.getDate();
      const days = [];
      for (let i = 0; i <= numDays; i++) {
        days.push(i+1);
      }
      return days;
  }
}

export class Timeline extends Component {
  constructor(props) {
    super(props);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTimelineBase = this.handleTimelineBase.bind(this);
  }

  handleMouseDown(e) {
    if (e.button === 0) {
      document.addEventListener("mousemove", this.handleMouseMove);
      document.addEventListener("mouseup", this.handleMouseUp);
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) {
      document.removeEventListener("mousemove", this.handleMouseMove);
      document.removeEventListener("mouseup", this.handleMouseUp);
    }
  }

  handleMouseMove(e) {
    e.preventDefault();
    const container = this.timelineBase;
    const {left, width} = container.getBoundingClientRect();
    const progress = (e.clientX - left) / width;
    const clampedProgress = Math.max(0.0, Math.min(1.0, progress));
    this.props.onProgressChange(clampedProgress);
  }

  handleTimelineBase(element) {
    this.timelineBase = element;
  }

  render() {
    const props = this.props;
    const items = getTimelineLegendItems(props.range, props.startDate, props.endDate);
    const legends = items.map((legend) => {
      return (<div className="Timeline__legendValue">{legend}</div>);
    });
    const marks = items.map((legend) => {
      return (<div className="Timeline__mark"></div>);
    });
    const styles = { left: `${props.progress * 100}%` };
    const date = props.currentDate;
    return (
      <div className="Timeline">
        <nav className="Timeline__range">
          <a className={getTimelineRangeOptionClasses(props.range, "day")} onClick={(e) => { e.preventDefault(); props.onRangeChange("day"); }} href="#">Día</a>
          <a className={getTimelineRangeOptionClasses(props.range, "week")} onClick={(e) => { e.preventDefault(); props.onRangeChange("week"); }} href="#">Semana</a>
          <a className={getTimelineRangeOptionClasses(props.range, "month")} onClick={(e) => { e.preventDefault(); props.onRangeChange("month"); }} href="#">Mes</a>
        </nav>
        <div className="Timeline__legend">
          {legends}
        </div>
        <div className="Timeline__slider">
          <div className="Timeline__marks">
            {marks}
          </div>
          <div className="Timeline__base" ref={this.handleTimelineBase}>
            <div className="Timeline__handler" style={styles} onMouseDown={this.handleMouseDown}>

            </div>
          </div>
        </div>
        <div className="Timeline__date">
          {date.toISOString()}
        </div>
      </div>
    );
  }
}

export default Timeline;
