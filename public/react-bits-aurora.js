/* React Bits "Aurora" background, packaged to drop into a plain HTML site.
   Needs React + ReactDOM (UMD) loaded first. No build step, no other libraries. */
(function () {
  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var mount = document.getElementById('react-bits-bg');
  if (!React || !ReactDOM || !mount) return;

  var VERT = '#version 300 es\n' +
    'in vec2 position;\n' +
    'void main() { gl_Position = vec4(position, 0.0, 1.0); }';

  var FRAG = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform float uTime;\n' +
    'uniform float uAmplitude;\n' +
    'uniform vec3 uColorStops[3];\n' +
    'uniform vec2 uResolution;\n' +
    'uniform float uBlend;\n' +
    'out vec4 fragColor;\n' +
    'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }\n' +
    'float snoise(vec2 v) {\n' +
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\n' +
    '  vec2 i = floor(v + dot(v, C.yy));\n' +
    '  vec2 x0 = v - i + dot(i, C.xx);\n' +
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n' +
    '  vec4 x12 = x0.xyxy + C.xxzz;\n' +
    '  x12.xy -= i1;\n' +
    '  i = mod(i, 289.0);\n' +
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\n' +
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\n' +
    '  m = m * m; m = m * m;\n' +
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n' +
    '  vec3 h = abs(x) - 0.5;\n' +
    '  vec3 ox = floor(x + 0.5);\n' +
    '  vec3 a0 = x - ox;\n' +
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);\n' +
    '  vec3 g;\n' +
    '  g.x = a0.x * x0.x + h.x * x0.y;\n' +
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n' +
    '  return 130.0 * dot(m, g);\n' +
    '}\n' +
    'void main() {\n' +
    '  vec2 uv = gl_FragCoord.xy / uResolution;\n' +
    '  vec3 rampColor = uv.x < 0.5\n' +
    '    ? mix(uColorStops[0], uColorStops[1], uv.x / 0.5)\n' +
    '    : mix(uColorStops[1], uColorStops[2], (uv.x - 0.5) / 0.5);\n' +
    '  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;\n' +
    '  height = exp(height);\n' +
    '  height = (uv.y * 2.0 - height + 0.2);\n' +
    '  float intensity = 0.6 * height;\n' +
    '  float midPoint = 0.20;\n' +
    '  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);\n' +
    '  vec3 auroraColor = intensity * rampColor;\n' +
    '  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);\n' +
    '}';

  function hexToRgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Aurora shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function Aurora(props) {
    var hostRef = React.useRef(null);

    React.useEffect(function () {
      var host = hostRef.current;
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) return; // no WebGL2: the existing dark gradient stays as the background

      var vs = compile(gl, gl.VERTEX_SHADER, VERT);
      var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return;
      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      gl.useProgram(program);

      // One oversized triangle that covers the whole screen.
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      var uTime = gl.getUniformLocation(program, 'uTime');
      var uRes = gl.getUniformLocation(program, 'uResolution');
      gl.uniform1f(gl.getUniformLocation(program, 'uAmplitude'), props.amplitude);
      gl.uniform1f(gl.getUniformLocation(program, 'uBlend'), props.blend);
      gl.uniform3fv(
        gl.getUniformLocation(program, 'uColorStops'),
        new Float32Array(props.colorStops.reduce(function (a, c) { return a.concat(hexToRgb(c)); }, []))
      );
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      host.appendChild(canvas);

      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var raf = 0;

      function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap for performance
        var w = Math.max(1, Math.floor(host.clientWidth * dpr));
        var h = Math.max(1, Math.floor(host.clientHeight * dpr));
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      }

      function draw(t) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uTime, t * 0.001 * props.speed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      function loop(t) {
        draw(t);
        raf = requestAnimationFrame(loop);
      }

      var ro = new ResizeObserver(function () {
        resize();
        if (reduce) draw(0);
      });
      ro.observe(host);
      resize();
      if (reduce) draw(4000); else raf = requestAnimationFrame(loop);

      return function () {
        cancelAnimationFrame(raf);
        ro.disconnect();
        if (canvas.parentNode === host) host.removeChild(canvas);
        var ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      };
    }, []);

    return React.createElement('div', {
      ref: hostRef,
      style: { width: '100%', height: '100%' }
    });
  }

  // Colors match the page's existing cyan / violet / teal glow.
  var el = React.createElement(Aurora, {
    colorStops: ['#00bfff', '#9128ff', '#00ffdc'],
    amplitude: 1.0,
    blend: 0.5,
    speed: 1.0
  });

  if (ReactDOM.createRoot) ReactDOM.createRoot(mount).render(el);
  else ReactDOM.render(el, mount);
})();
