export function createFrameBuffer(gl) {
  const frameBuffer = gl.createFramebuffer();
  const renderBuffer = gl.createRenderBuffer();
  return {
    frameBuffer,
    renderBuffer
  };
}

export function createBuffer(gl, arrayBuffer) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, arrayBuffer, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
}

export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw gl.getShaderInfoLog(shader);
  }
  return shader;
}

export function createFragmentShader(gl, source) {
  return createShader(gl, gl.FRAGMENT_SHADER, source);
}

export function createVertexShader(gl, source) {
  return createShader(gl, gl.VERTEX_SHADER, source);
}

export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw gl.getProgramInfoLog(program);
  }
  return program;
}

export function createProgramFromSource(gl, vertexSource, fragmentSource) {
  const vertexShader = createVertexShader(gl, vertexSource);
  const fragmentShader = createFragmentShader(gl, fragmentSource);
  return createProgram(gl, vertexShader, fragmentShader);
}

export default {
  createFrameBuffer,
  createBuffer,
  createShader,
  createFragmentShader,
  createVertexShader,
  createProgram,
  createProgramFromSource
}
