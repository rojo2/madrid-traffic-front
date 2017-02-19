import Inferno from "inferno";
import Component from "inferno-component";
import classNames from "classnames";
import API from "madrid/API";

class Application extends Component {
  constructor(props) {
    super(props);
    this.handleDetailOpen = this.handleDetailOpen.bind(this);
    this.handleDetailClose = this.handleDetailClose.bind(this);
  }

  handleDetailOpen(measurePoint) {
    this.setState({
      measurePoint
    });
  }

  handleDetailClose() {
    this.setState({
      measurePoint: null
    });
  }

  render() {
    return (
      <div className="Page">
        <Map onDetail={this.handleDetailOpen} measurePoint={this.state.measurePoint} />
        <div className="Page__UI">
            <Detail onClose={this.handleDetailClose} measurePoint={this.state.measurePoint} />
            <Timeline />
        </div>
      </div>
    );
  }
}

class WebGLOverlay extends google.maps.OverlayView {
  constructor(bounds) {
    super();

    // map data.
    this._bounds = bounds;

    // canvas data
    this._canvas = null;
    this._context = null;

    // rAF data
    this._frameID = null;
    this._frame = this._frame.bind(this);

    // WebGL Matrices
    this._projectionMatrix = new Float32Array(16);
    this._mapMatrix = new Float32Array(16);

    this._mapMatrixLocation = null;
    this._positionLocation = null;
    this._measureLocation = null;

    // WebGL data
    this._program = null;
    this._vertexShader = null;
    this._fragmentShader = null;
    this._buffer = null;

    this._topLeft = null;

    this._arrayBuffer = new ArrayBuffer(36);
    this._arrayBufferView = new DataView(this._arrayBuffer);
    this._arrayBufferView.setFloat32(0, 40.41912438501767);
    this._arrayBufferView.setFloat32(4, -3.720757259425547);
  }

  onAdd() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";

    this._canvas = canvas;
    const gl = this._context = canvas.getContext("webgl");

    this._createBuffer();

    this._createProgramFromSource(`
      precision highp float;

      attribute vec4 a_position;
      attribute vec4 a_measure;

      uniform mat4 u_mapMatrix;

      varying vec4 v_measure;

      #define PI 3.141592653589793
      #define PI_180 PI / 180.0
      #define PI_4 PI * 4.0

      float latToY(float lat) {
        float merc = -log(tan((0.25 + lat / 360.0) * PI));
        return 128.0 * (1.0 + merc / PI);
      }

      float lngToX(float lng) {
        if (lng > 180.0) {
          return 256.0 * (lng / 360.0 - 0.5);
        }
        return 256.0 * (lng / 360.0 + 0.5);
      }

      vec2 getLatLng(vec2 latLng) {
        float sinLat = sin(latLng.x * PI_180);
        float y = (0.5 - log((1.0 + sinLat) / (1.0 - sinLat)) / (PI_4)) * 256.0;
        float x = ((latLng.y + 180.0) / 360.0) * 256.0;
        return vec2(x,y);
      }

      void main(void) {
        v_measure = a_measure;

        gl_PointSize = 64.0;

        gl_Position = u_mapMatrix * vec4(
          lngToX(a_position.y),
          latToY(a_position.x),
          0.0,
          1.0
        );
      }
    `, `
      precision highp float;

      varying vec4 v_measure;

      void main(void) {
        gl_FragColor = vec4(v_measure.x,1.0,1.0,1.0);
      }
    `);

    const panes = this.getPanes();
    panes.overlayLayer.appendChild(canvas);

    this._start();
  }

  _createBuffer() {
    const gl = this._context;
    const buffer = this._buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._arrayBuffer, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }

  _createShader(type, source) {
    const gl = this._context;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(shader);
    }
    return shader;
  }

  _createFragmentShader(source) {
    const gl = this._context;
    return this._createShader(gl.FRAGMENT_SHADER, source);
  }

  _createVertexShader(source) {
    const gl = this._context;
    return this._createShader(gl.VERTEX_SHADER, source);
  }

  _createProgram(vertexShader, fragmentShader) {
    const gl = this._context;
    const program = this._program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(program);
    }
    this._positionLocation = gl.getAttribLocation(this._program, "a_position");
    this._measureLocation = gl.getAttribLocation(this._program, "a_measure");
    this._mapMatrixLocation = gl.getUniformLocation(this._program, "u_mapMatrix");

    return program;
  }

  _createProgramFromSource(vertexSource, fragmentSource) {
    const vertexShader = this._vertexShader = this._createVertexShader(vertexSource);
    const fragmentShader = this._fragmentShader = this._createFragmentShader(fragmentSource);
    return this._program = this._createProgram(vertexShader, fragmentShader);
  }

  _updateCanvas() {
    const map = this.getMap();

    const width = map.getDiv().offsetWidth;
    const height = map.getDiv().offsetHeight;

    const top = map.getBounds().getNorthEast().lat();
    const center = map.getCenter();
    const scale = Math.pow(2, map.getZoom());
    const left = center.lng() - (width * 180) / (256 * scale);
    this._topLeft = new google.maps.LatLng(top, left);

    const projection = this.getProjection();
    const canvasCenter = projection.fromLatLngToDivPixel(center);

    // Resize the image's div to fit the indicated dimensions.
    const canvas = this._canvas;
    canvas.style.width = width;
    canvas.style.height = height;
    canvas.width = width;
    canvas.height = height;
    const offsetX = -Math.round(width * 0.5 - canvasCenter.x);
    const offsetY = -Math.round(height * 0.5 - canvasCenter.y);
    canvas.style.transform = `translate(${offsetX}px,${offsetY}px)`;
  }

  _transformationMatrix(out, tx, ty, scale) {
    this._scaleMatrix(out,scale);
    this._translateMatrix(out,tx,ty);
    return out;
  }

  _scaleMatrix(out, scale) {
    out[0] *= scale;
    out[1] *= scale;
    out[2] *= scale;
    out[3] *= scale;

    out[4] *= scale;
    out[5] *= scale;
    out[6] *= scale;
    out[7] *= scale;
    return out;
  }

  _translateMatrix(out,tx,ty) {
    out[12] += out[0]*tx + out[4]*ty;
    out[13] += out[1]*tx + out[5]*ty;
    out[14] += out[2]*tx + out[6]*ty;
    out[15] += out[3]*tx + out[7]*ty;
    return out;
  }

  _updateMatrix() {
    const map = this.getMap();
    const canvas = this._canvas;
    const scale = Math.pow(2, map.getZoom());

    // sets the projection matrix.
    this._projectionMatrix.set([
      2 / canvas.width, 0, 0, 0,
      0, -2 / canvas.height, 0, 0,
      0, 0, 0, 0,
      -1, 1, 0, 1
    ]);

    const projection = map.getProjection();
    const offset = projection.fromLatLngToPoint(this._topLeft);

    // updates the map matrix.
    this._mapMatrix.set(this._projectionMatrix);
    this._transformationMatrix(this._mapMatrix, -offset.x, -offset.y, scale);
  }

  _update(time) {
    this._updateCanvas();
    this._updateMatrix();
  }

  _render() {
    const canvas = this._canvas;
    const gl = this._context;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0.0,0.0,0.0,0.5);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);

    gl.vertexAttribPointer(this._positionLocation, 4, gl.FLOAT, gl.FALSE, 36, 0);
    gl.vertexAttribPointer(this._measureLocation, 4, gl.FLOAT, gl.FALSE, 36, 12);

    gl.enableVertexAttribArray(this._positionLocation);
    gl.enableVertexAttribArray(this._measureLocation);

    gl.uniformMatrix4fv(this._mapMatrixLocation, false, this._mapMatrix);

    gl.drawArrays(gl.POINTS, 0, this._arrayBuffer.byteLength / 36);
  }

  _frame(time) {
    this._update(time);
    this._render();
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

  _stop() {
    this._cancelFrame();
  }

  _start() {
    this._requestFrame();
  }

  draw() {

  }

  onRemove() {
    this._stop();

    const canvas = this._canvas;
    const gl = this._context;

    const extension = gl.getExtension("WEBGL_lose_context")
    if (extension) {
      extension.lose();
    }
    canvas.parentNode.removeChild(canvas);

    this._canvas = null;
    this._context = null;
  }
}

class Map extends Component {
  constructor(props) {
    super(props);
    this.map = null;
    this.selectedMarker = null;
    this.handleGoogleMaps = this.handleGoogleMaps.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.measurePoint === null) {
      if (this.selectedMarker !== null) {
        this.selectedMarker.setAnimation(null);
        this.selectedMarker = null;
      }
    }
  }

  handleDetail(marker,measurePoint) {
    if (this.selectedMarker !== marker) {
      if (this.selectedMarker !== null) {
        this.selectedMarker.setAnimation(null);
      }
      this.selectedMarker = marker;
      this.selectedMarker.setAnimation(google.maps.Animation.BOUNCE);
    } else {
      if (this.selectedMarker !== null) {
        this.selectedMarker.setAnimation(null);
      }
      this.selectedMarker = null;
    }

    if (this.selectedMarker === null) {
      this.props.onDetail(null);
    } else {
      this.props.onDetail(measurePoint);
    }
  }

  handleGoogleMaps(mapElement) {
    const mapStyles = [
        {
            "stylers": [
                {
                    "saturation": -50
                },
                {
                    "gamma": 1
                }
            ]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "poi.business",
            "elementType": "labels.text",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "poi.business",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "poi.place_of_worship",
            "elementType": "labels.text",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "poi.place_of_worship",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "water",
            "stylers": [
                {
                    "visibility": "on"
                },
                {
                    "saturation": 50
                },
                {
                    "gamma": 0
                },
                {
                    "hue": "#50a5d1"
                }
            ]
        },
        {
            "featureType": "administrative.neighborhood",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#333333"
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text",
            "stylers": [
                {
                    "weight": 0.5
                },
                {
                    "color": "#333333"
                }
            ]
        },
        {
            "featureType": "transit.station",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "gamma": 1
                },
                {
                    "saturation": 50
                }
            ]
        }
    ];

    const styledMap = new google.maps.StyledMapType(mapStyles, {name: "Styled Map"});

    const map = this.map = new google.maps.Map(mapElement, {
      center: {lat: 40.4308087, lng: -3.6755942},
      mapTypeControl: false,
      scrollwheel: true,
      streetViewControl: false,
      zoom: 13,
      styles: mapStyles
    });

    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(40.41912438501767, -3.720757259425547)
    });

    marker.setMap(map);
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(40.33245364116177, -3.8369430001853404),
      new google.maps.LatLng(40.51340889639223, -3.580713428117341),
    );

    const overlay = window.overlay = new WebGLOverlay(bounds);
    overlay.setMap(map);

    API.measurePointLocation.find().then((measurePoints) => {
      measurePoints.forEach((measurePoint) => {
        const {load} = measurePoint;
        const [measurePointInfo] = measurePoint.pos;
        if (measurePointInfo && measurePointInfo.location) {
          const [lat,lng] = measurePointInfo.location.coordinates;
          const i = 3 - Math.floor(load / 25);
          const icon = new google.maps.MarkerImage("img/spritepoint.png", new google.maps.Size(16,16), new google.maps.Point(i * 20,0));
          const marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat,lng),
            map: map,
            title: measurePointInfo.description,
            icon: icon
          });
          marker.addListener("click", this.handleDetail.bind(this,marker,measurePointInfo));
        }
      });
    });
  }

  render() {
    return (<div className="Map" id="map" ref={this.handleGoogleMaps}></div>);
  }
}

class Detail extends Component {
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

function Timeline(props) {
  return (
    <div className="Timeline">
        <nav className="Timeline__range">
            <a className="Timeline__rangeOption" href="#">Día</a>
            <a className="Timeline__rangeOption" href="#">Semana</a>
            <a className="Timeline__rangeOption" href="#">Mes</a>
        </nav>
        <div className="Timeline__legend">
            <div className="Timeline__legendValue">7:00</div>
            <div className="Timeline__legendValue">9:00</div>
            <div className="Timeline__legendValue">11:00</div>
            <div className="Timeline__legendValue">13:00</div>
            <div className="Timeline__legendValue">15:00</div>
            <div className="Timeline__legendValue">17:00</div>
            <div className="Timeline__legendValue">19:00</div>
            <div className="Timeline__legendValue">21:00</div>
            <div className="Timeline__legendValue">23:00</div>
            <div className="Timeline__legendValue">1:00</div>
            <div className="Timeline__legendValue">3:00</div>
            <div className="Timeline__legendValue">5:00</div>
        </div>
        <div className="Timeline__slider">
            <div className="Timeline__marks">
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
                <div className="Timeline__mark"></div>
            </div>
            <div className="Timeline__base">
                <div className="Timeline__handler"></div>
            </div>
        </div>
    </div>
  );
}

Inferno.render(
  <Application />,
  document.getElementById("Application")
);
