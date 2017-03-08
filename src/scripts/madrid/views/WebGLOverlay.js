import {fromDateToFloat,fromFloatToDate} from "madrid/utils/FloatDate";

// indica el tamaño de una entrada (en bytes).
const ENTRY_SIZE = 40;

/**
 * Esta es la capa encargada de renderizar los puntos usando WebGL.
 */
export class WebGLOverlay extends google.maps.OverlayView {
  /**
   * constructor
   *
   * @param {google.maps.LatLngBounds} bounds
   * @param {ArrayBuffer} arrayBuffer
   */
  constructor(bounds, arrayBuffer) {
    super();

    // map data.
    this._bounds = bounds;

    // canvas data
    this._canvas = null;
    this._canvasWidth = 0;
    this._canvasHeight = 0;
    this._context = null;

    // rAF data
    this._frameID = null;
    this._frame = this._frame.bind(this);

    this._debug = null;

    // WebGL Matrices
    this._projectionMatrix = new Float32Array(16);
    this._mapMatrix = new Float32Array(16);

    this._mapMatrixLocation = null;
    this._positionLocation = null;
    this._measureLocation = null;
    this._timeLocation = null;

    this._fbMapMatrixLocation = null;
    this._fbPositionLocation = null;
    this._fbMeasureLocation = null;
    this._fbTimeLocation = null;

    // WebGL data
    this._program = null;

    this._vertexShaderColor = null;
    this._vertexShaderPicker = null;
    this._fragmentShaderColor = null;
    this._fragmentShaderPicker = null;

    this._buffer = null;
    this._renderBuffer = null;
    this._frameBuffer = null;

    this._startDate = new Date(2016,11,1,0,0,0);
    this._endDate = new Date(2016,11,31,23,59,59);
    this._currentDate = new Date(2016,11,1,0,0,0);

    this._pixel = new Uint8Array(4);
    this._isOver = false;

    this._posX = 0;
    this._posY = 0;

    this._progress = 0.0;

    this._topLeft = null;

    this._arrayBuffer = arrayBuffer || new ArrayBuffer(ENTRY_SIZE);
    if (!arrayBuffer) {
      this._arrayBufferView = new DataView(this._arrayBuffer);
      // NOTE: These are little-endian float32.
      this._arrayBufferView.setFloat32(0, 40.41912438501767, true);
      this._arrayBufferView.setFloat32(4, -3.720757259425547, true);
    }
  }

  get isOver() {
    return this._isOver;
  }

  /**
   * Obtiene el progreso.
   *
   * @return {number} Devuelve un valor entre 0 y 1
   */
  getProgress() {
    return this._progress;
  }

  /**
   * Establece el progreso.
   *
   * @param {number} newProgress - Establece el progreso entre 0 y 1.
   * @return {WebGLOverlay}
   */
  setProgress(newProgress) {
    this._progress = newProgress;
    return this;
  }

  /**
   * Devuelve el array buffer con los datos.
   */
  getBuffer() {
    return this._arrayBuffer;
  }

  /**
   * Establece un nuevo arraybuffer
   *
   * @param {ArrayBuffer} arrayBuffer
   * @return {WebGLOverlay}
   */
  setBuffer(arrayBuffer) {
    if (arrayBuffer !== this._arrayBuffer) {
      this._arrayBuffer = arrayBuffer;
      if (this._buffer) {
        const gl = this._context;
        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._arrayBuffer, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      }
    }
    return this;
  }

  onAdd() {
    const canvas = this._canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";

    const gl = this._context = canvas.getContext("webgl", {
      premultipliedAlpha: false
    });

    this._createShaders();
    this._createBuffer();
    this._createFrameBuffer();

    this._program = this._createProgram(this._vertexShaderColor, this._fragmentShaderColor);
    this._positionLocation = gl.getAttribLocation(this._program, "a_position");
    this._measureLocation = gl.getAttribLocation(this._program, "a_measure");
    this._mapMatrixLocation = gl.getUniformLocation(this._program, "u_mapMatrix");
    this._timeLocation = gl.getUniformLocation(this._program, "u_time");

    this._fbProgram = this._createProgram(this._vertexShaderPicker, this._fragmentShaderPicker);
    this._fbPositionLocation = gl.getAttribLocation(this._fbProgram, "a_position");
    this._fbMeasureLocation = gl.getAttribLocation(this._fbProgram, "a_measure");
    this._fbMapMatrixLocation = gl.getUniformLocation(this._fbProgram, "u_mapMatrix");
    this._fbTimeLocation = gl.getUniformLocation(this._fbProgram, "u_time");

    const panes = this.getPanes();
    panes.overlayLayer.appendChild(canvas);

    this._start();
  }

  _createShaders() {
    this._vertexShaderColor = this._createVertexShader(`
      precision highp float;

      attribute vec4 a_position;
      attribute vec4 a_measure;

      uniform vec3 u_time;
      uniform mat4 u_mapMatrix;

      varying vec4 v_measure;
      varying float v_distance;

      #define PI 3.141592653589793

      #define PI_180 PI / 180.0
      #define PI_4 PI * 4.0

      #define OUTSIDE -2.0

      #define MIN_SIZE 16.0
      #define MAX_SIZE 64.0

      // Este es el tiempo que permanece activo un punto.
      #define MIN_TIME 480.0

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

        float start = a_position.z - u_time.x;
        float current = a_position.z - u_time.y;
        float end = a_position.z - u_time.z;

        v_distance = 1.0 - (abs(current) / MIN_TIME);

        if (start < 0.0 || end > 0.0 || abs(current) > MIN_TIME) {
          gl_Position = vec4(OUTSIDE,OUTSIDE,OUTSIDE,OUTSIDE);
        } else {
          float progress = (v_measure.w / 100.0);
          gl_PointSize = (MIN_SIZE + (progress * (MAX_SIZE - MIN_SIZE)));

          gl_Position = u_mapMatrix * vec4(
            lngToX(a_position.y),
            latToY(a_position.x),
            0.0,
            1.0
          );
        }
      }
    `);

    this._vertexShaderPicker = this._createVertexShader(`
      precision highp float;

      attribute vec4 a_position;
      attribute vec4 a_measure;

      uniform vec3 u_time;
      uniform mat4 u_mapMatrix;

      varying vec4 v_measure;
      varying float v_distance;

      #define PI 3.141592653589793

      #define PI_180 PI / 180.0
      #define PI_4 PI * 4.0

      #define OUTSIDE -2.0

      #define MIN_SIZE 16.0
      #define MAX_SIZE 64.0

      // Este es el tiempo que permanece activo un punto.
      #define MIN_TIME 480.0

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

        float start = a_position.z - u_time.x;
        float current = a_position.z - u_time.y;
        float end = a_position.z - u_time.z;

        v_distance = 1.0 - (abs(current) / MIN_TIME);

        if (start < 0.0 || end > 0.0 || abs(current) > MIN_TIME) {
          gl_Position = vec4(OUTSIDE,OUTSIDE,OUTSIDE,OUTSIDE);
        } else {
          float progress = (v_measure.w / 100.0);
          gl_PointSize = (MIN_SIZE + (progress * (MAX_SIZE - MIN_SIZE)));

          gl_Position = u_mapMatrix * vec4(
            lngToX(a_position.y),
            latToY(a_position.x),
            0.0,
            1.0
          );
        }
      }
    `);

    this._fragmentShaderColor = this._createFragmentShader(`
      precision highp float;

      varying vec4 v_measure;
      varying float v_distance;

      vec3 getColor(float p) {
        if (p < 0.5) {
          return mix(
            vec3(0.16, 0.8, 0.46),
            vec3(0.92, 0.85, 0.27),
            clamp(p * 2.0, 0.0, 1.0)
          );
        } else if (p >= 0.5) {
          return mix(
            vec3(0.92, 0.85, 0.27),
            vec3(0.8, 0.16, 0.2),
            clamp((p - 0.5) * 2.0, 0.0, 1.0)
          );
        }
        return vec3(1.0,0.0,1.0);
      }

      vec4 getGradientColor(vec3 color, float p) {
        return mix(
          vec4(color.xyz,1.0),
          vec4(color.xyz,0.0),
          p
        );
      }

      void main(void) {
        vec2 d = gl_PointCoord.xy - 0.5;
        float p = length(d);
        if (p > 0.5) {
          discard;
        }
        vec3 color = getColor(1.0 - (max(0.0,v_measure.z) / 100.0));
        gl_FragColor = vec4(color,clamp(v_distance,0.0,1.0));
      }
    `);

    this._fragmentShaderPicker = this._createFragmentShader(`
      precision highp float;

      varying vec4 v_measure;
      varying float v_distance;

      #define MAX_BYTE 256.0
      #define MAX_SHORT 65536.0

      vec3 unpackColor(float f) {
        vec3 color;
        color.r = floor(f / MAX_SHORT);
        color.g = floor((f - color.r * MAX_SHORT) / MAX_BYTE);
        color.b = floor(f - color.r * MAX_SHORT - color.g * MAX_BYTE);
        return color / MAX_BYTE;
      }

      void main(void) {
        vec2 d = gl_PointCoord.xy - 0.5;
        float p = length(d);
        if (p > 0.5) {
          discard;
        }
        gl_FragColor = vec4(unpackColor(v_measure.x), 1.0);
      }
    `);
  }

  _createFrameBuffer() {
    const gl = this._context;
    const canvas = this._canvas;
    this._frameBuffer = gl.createFramebuffer();
    this._renderBuffer = gl.createRenderbuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, canvas.width, canvas.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._renderBuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(program);
    }
    return program;
  }

  _createProgramFromSource(vertexSource, fragmentSource) {
    const vertexShader = this._createVertexShader(vertexSource);
    const fragmentShader = this._createFragmentShader(fragmentSource);
    return this._createProgram(vertexShader, fragmentShader);
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

  _multiplyVector(out,mat,vec) {
    out[0] = mat[0] * vec[0] + mat[4] * vec[1] + mat[8] * vec[2] + mat[12] * vec[3];
    out[1] = mat[1] * vec[0] + mat[5] * vec[1] + mat[9] * vec[2] + mat[13] * vec[3];
    out[2] = mat[2] * vec[0] + mat[6] * vec[1] + mat[10] * vec[2] + mat[14] * vec[3];
    out[3] = mat[3] * vec[0] + mat[7] * vec[1] + mat[11] * vec[2] + mat[15] * vec[3];
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

  _render(time) {
    const progress = this._progress;

    const startTime = fromDateToFloat(this._startDate);
    const endTime = fromDateToFloat(this._endDate);

    const currentTime = ((endTime - startTime) * progress) + startTime;
    fromFloatToDate(this._currentDate, currentTime);

    const canvas = this._canvas;
    const gl = this._context;

    /**
     * Paso encargado de renderizar a un renderbuffer.
     */
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._frameBuffer);

    if (canvas.width !== this._canvasWidth
     || canvas.height !== this._canvasHeight) {
       const extension = gl.getExtension("EXT_sRGB");
       gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
       gl.renderbufferStorage(gl.RENDERBUFFER, extension.SRGB8_ALPHA8_EXT, canvas.width, canvas.height);
       gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._renderBuffer);
       gl.bindRenderbuffer(gl.RENDERBUFFER, null);
       gl.viewport(0,0,canvas.width,canvas.height);
    }
    gl.clearColor(0.0,0.0,0.0,0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    gl.useProgram(this._fbProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);

    gl.vertexAttribPointer(this._fbPositionLocation, 4, gl.FLOAT, gl.FALSE, ENTRY_SIZE, 0);
    gl.vertexAttribPointer(this._fbMeasureLocation, 4, gl.FLOAT, gl.FALSE, ENTRY_SIZE, 16);

    gl.enableVertexAttribArray(this._fbPositionLocation);
    gl.enableVertexAttribArray(this._fbMeasureLocation);

    gl.uniformMatrix4fv(this._fbMapMatrixLocation, false, this._mapMatrix);
    gl.uniform3f(this._fbTimeLocation, startTime, currentTime, endTime);

    gl.drawArrays(gl.POINTS, 0, this._arrayBuffer.byteLength / ENTRY_SIZE);

    gl.readPixels(this._posX,this._posY,1,1,gl.RGBA,gl.UNSIGNED_BYTE,this._pixel);
    const [,,,a] = this._pixel;
    if (a > 0) {
      this._isOver = true;
    } else {
      this._isOver = false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    /**
     * Paso encargado de renderizar a canvas.
     */
    if (canvas.width !== this._canvasWidth
     || canvas.height !== this._canvasHeight) {
      gl.viewport(0,0,canvas.width,canvas.height);
      this._canvasWidth = canvas.width;
      this._canvasHeight = canvas.height;
    }
    gl.clearColor(0.0,0.0,0.0,0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA);
/*
    gl.useProgram(this._fbProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);

    gl.vertexAttribPointer(this._fbPositionLocation, 4, gl.FLOAT, gl.FALSE, ENTRY_SIZE, 0);
    gl.vertexAttribPointer(this._fbMeasureLocation, 4, gl.FLOAT, gl.FALSE, ENTRY_SIZE, 16);

    gl.enableVertexAttribArray(this._fbPositionLocation);
    gl.enableVertexAttribArray(this._fbMeasureLocation);

    gl.uniformMatrix4fv(this._fbMapMatrixLocation, false, this._mapMatrix);
    gl.uniform3f(this._fbTimeLocation, startTime, currentTime, endTime);

    gl.drawArrays(gl.POINTS, 0, this._arrayBuffer.byteLength / ENTRY_SIZE);
*/
    gl.useProgram(this._program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);

    gl.vertexAttribPointer(this._positionLocation, 4, gl.FLOAT, gl.FALSE, ENTRY_SIZE, 0);
    gl.vertexAttribPointer(this._measureLocation, 4, gl.FLOAT, gl.FALSE, ENTRY_SIZE, 16);

    gl.enableVertexAttribArray(this._positionLocation);
    gl.enableVertexAttribArray(this._measureLocation);

    gl.uniformMatrix4fv(this._mapMatrixLocation, false, this._mapMatrix);
    gl.uniform3f(this._timeLocation, startTime, currentTime, endTime);

    gl.drawArrays(gl.POINTS, 0, this._arrayBuffer.byteLength / ENTRY_SIZE);
  }

  _frame(time) {
    this._update(time);
    this._render(time);
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

  getPosition() {
    return {
      x: this._posX,
      y: this._posY
    };
  }

  setPosition(x,y) {
    const canvas = this._canvas;
    if (canvas) {
      this._posX = x;
      this._posY = (canvas.height - y);
    }
    return this;
  }

  getId() {
    const [r,g,b,a] = this._pixel;
    if (a > 0) {
      console.log(r,g,b,a);
      return r << 16 | g << 8 | Math.floor(b / 16) * 16;
    }
    return undefined;
  }

  getColor() {
    return this._pixel;
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

export default WebGLOverlay;
