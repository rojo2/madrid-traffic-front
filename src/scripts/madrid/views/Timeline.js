import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";

import leftPad from "madrid/utils/leftPad";

const DAY_LENGTH = 86400000;
const WEEK_LENGTH = 604800000;

function getTimelineRangeOptionClasses(range, id) {
  return classNames("Timeline__rangeOption", {
    "is-active": range === id
  });
}

function getTimelineLegendItems(range, startDate, endDate) {
  switch (range) {
    default:
    case "day":
      const start = startDate.getHours();
      const minutes = startDate.getMinutes();
      const hours = Math.min(24, Math.round((endDate.getTime() - startDate.getTime()) / 3600000));
      const list = [];
      for (let index = start; index <= start + hours; index++) {
        list.push(`${leftPad(index % 24)}:${leftPad(minutes)}`);
      }
      return list;

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

function toRange(progress, currentProgress, range, startDate, endDate) {
  let total, lapse, start, length;
  switch(range) {
    case "day":
      total = Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_LENGTH);
      lapse = Math.floor(currentProgress * total);
      start = (lapse / total);
      length = 1 / total;
      return (Math.min(0.9999,progress) * length) + start; // Usamos min para prevenir que no se pase al siguiente día por error.

    case "week":
      total = Math.ceil((endDate.getTime() - startDate.getTime()) / WEEK_LENGTH);
      lapse = Math.floor(currentProgress * total);
      start = (lapse / total);
      length = 1 / total;
      return (Math.min(0.9999,progress) * length) + start; // Usamos min para prevenir que no se pase a la siguiente semana por error.

    case "month":
      return progress;
  }
}

function fromRange(progress, range, startDate, endDate) {
  let total, lapse, start, length;
  switch(range) {
    case "day":
      total = Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_LENGTH);
      lapse = Math.floor(progress * total);
      start = (lapse / total);
      length = 1 / total;
      return (progress - start) / length;

    case "week":
      total = Math.ceil((endDate.getTime() - startDate.getTime()) / WEEK_LENGTH);
      lapse = Math.floor(progress * total);
      start = (lapse / total);
      length = 1 / total;
      return (progress - start) / length;

    case "month":
      return progress;
  }
}

function getTimelineProgress(progress, range, startDate, endDate) {
  return fromRange(progress, range, startDate, endDate);
}

export class Timeline extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTimelineBase = this.handleTimelineBase.bind(this);
  }

  handleClick(e) {
    if (e.button === 0) {
      e.preventDefault();
      const props = this.props;
      const container = this.timelineBase;
      const {left, width} = container.getBoundingClientRect();
      const progress = (e.clientX - left) / width;
      const clampedProgress = Math.max(0.0, Math.min(1.0, progress));
      this.props.onProgressChange(toRange(clampedProgress, props.progress, props.range, props.startDate, props.endDate));
    }
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
      this.props.onRelease();
    }
  }

  handleMouseMove(e) {
    e.preventDefault();
    const props = this.props;
    const container = this.timelineBase;
    const {left, width} = container.getBoundingClientRect();
    const progress = (e.clientX - left) / width;
    const clampedProgress = Math.max(0.0, Math.min(1.0, progress));
    this.props.onProgressChange(toRange(clampedProgress, props.progress, props.range, props.startDate, props.endDate));
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
    const progress = getTimelineProgress(props.progress, props.range, props.startDate, props.endDate);
    const styles = { left: `${progress * 100}%` };
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
        <div className="Timeline__slider" onClick={this.handleClick}>
          <div className="Timeline__marks">
            {marks}
          </div>
          <div className="Timeline__base" ref={this.handleTimelineBase}>
            <div className="Timeline__handler" style={styles} onMouseDown={this.handleMouseDown}>

            </div>
          </div>
        </div>
        <div className="Timeline__date">
          {date.toString()}
        </div>
      </div>
    );
  }
}

export default Timeline;
