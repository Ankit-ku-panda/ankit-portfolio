/* ==========================================================================
   MUSIC SCENE: a 3D night drive (three.js r128, built from simple shapes).
   Every song gets its own palette and car colour. The car bounces, weaves and
   flashes its tail lights on the beat. YouTube does not share audio data, so
   the beat is a clock: each song gets a BPM guess, and the TAP button on the
   page lets you set the real tempo and line the car up with the music.

   window.MusicScene.create(hostEl) -> { set, fx, sync, dispose } or null
   ========================================================================== */
(function () {
  'use strict';
  var T = window.THREE;
  if (!T) return;

  var PAL = {
    Chill: { top: '#0a0f2e', hor: '#2fb8b0', s1: '#fff0a8', s2: '#4fe0c8', g1: '#5ef7e9', g2: '#8d6bff' },
    Retro: { top: '#12062e', hor: '#ff7a59', s1: '#fff08a', s2: '#ff6fa8', g1: '#ff5ac8', g2: '#00e6ff' },
    Rock:  { top: '#090305', hor: '#c9281a', s1: '#ffd27a', s2: '#ff2d2d', g1: '#ff4a2a', g2: '#ffb347' },
    Pop:   { top: '#1a0b4d', hor: '#ff8fd0', s1: '#fff6a0', s2: '#ff4fa3', g1: '#ff7ad9', g2: '#5ff2ff' }
  };
  var KEYS = ['Chill', 'Retro', 'Rock', 'Pop'];
  var BPM = { Chill: 80, Retro: 112, Rock: 124, Pop: 104 };

  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function family(id, tag) { return PAL[tag] ? tag : KEYS[hash(id || '') % 4]; }
  function defaultBpm(id, tag) { return BPM[family(id, tag)] + (hash(id + 'b') % 17) - 8; }

  function create(host) {
    var gl;
    try { gl = new T.WebGLRenderer({ antialias: true }); } catch (e) { return null; }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    gl.domElement.className = 'mx-scene-canvas';
    host.appendChild(gl.domElement);
    var flash = document.createElement('div');
    flash.className = 'mx-flash';
    host.appendChild(flash);

    var scene = new T.Scene();
    var cam = new T.PerspectiveCamera(58, 1, 0.1, 400);
    scene.fog = new T.Fog(0x000000, 30, 190);
    var sunL = new T.DirectionalLight(0xffffff, 0.8);
    sunL.position.set(3, 8, 12);
    scene.add(new T.HemisphereLight(0xffffff, 0x221144, 0.9), sunL);

    var P = {};
    function tex(w, h, fn) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var t = new T.CanvasTexture(c);
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
      t.redraw = function () { fn(c.getContext('2d'), w, h); t.needsUpdate = true; };
      return t;
    }
    var skyT = tex(2, 256, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, P.top); g.addColorStop(0.44, P.hor); g.addColorStop(0.441, '#000'); g.addColorStop(1, '#000');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    var sunT = tex(256, 256, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.1, P.s1); g.addColorStop(0.8, P.s2);
      x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, 7); x.fill();
      x.globalCompositeOperation = 'destination-out';
      for (var i = 0; i < 6; i++) x.fillRect(0, h * 0.52 + i * h * 0.075, w, 2 + i * 2.2);
      x.globalCompositeOperation = 'source-over';
    });
    var gridT = tex(64, 64, function (x, w, h) {
      x.fillStyle = '#10052a'; x.fillRect(0, 0, w, h);
      x.fillStyle = P.g1; x.fillRect(0, 0, 2, h);
      x.fillStyle = P.g2; x.fillRect(0, 0, w, 2);
    });
    var roadT = tex(64, 64, function (x, w, h) {
      x.fillStyle = '#07030f'; x.fillRect(0, 0, w, h);
      x.fillStyle = P.g1; x.fillRect(0, 0, 3, h); x.fillRect(w - 3, 0, 3, h);
      x.fillStyle = '#fff'; x.fillRect(w / 2 - 1.5, 6, 3, 26);
    });
    gridT.repeat.set(60, 100);
    roadT.repeat.set(1, 100);

    var floor = new T.Mesh(new T.PlaneGeometry(240, 400), new T.MeshBasicMaterial({ map: gridT }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = -150; scene.add(floor);
    var road = new T.Mesh(new T.PlaneGeometry(7, 400), new T.MeshBasicMaterial({ map: roadT }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -150); scene.add(road);

    var sun = new T.Mesh(new T.CircleGeometry(24, 48), new T.MeshBasicMaterial({ map: sunT, transparent: true, fog: false, depthWrite: false }));
    sun.position.set(0, 15, -170); scene.add(sun);

    var mountM = new T.MeshBasicMaterial({ wireframe: true, fog: false, transparent: true, opacity: 0.75 });
    for (var m = -3; m <= 3; m++) {
      var mt = new T.Mesh(new T.ConeGeometry(20 + (m & 1) * 8, 24 + ((m + 3) % 3) * 8, 4, 1), mountM);
      mt.position.set(m * 48, 12, -140); mt.rotation.y = Math.PI / 4; scene.add(mt);
    }

    // roadside pylons that rush past
    var pyl = [], postG = new T.BoxGeometry(0.2, 6, 0.2), capG = new T.BoxGeometry(0.5, 0.5, 0.5);
    var postM = new T.MeshBasicMaterial({ color: 0x120a2a });
    var capMs = [new T.MeshBasicMaterial(), new T.MeshBasicMaterial()];
    for (var i = 0; i < 28; i++) {
      var side = i % 2 ? 1 : -1, pg = new T.Group();
      var post = new T.Mesh(postG, postM); post.position.y = 3;
      var cap = new T.Mesh(capG, capMs[side > 0 ? 0 : 1]); cap.position.y = 6.2;
      pg.add(post, cap);
      pg.position.set(side * (8 + (i % 4) * 1.5), 0, -Math.floor(i / 2) * 16 + 8);
      scene.add(pg); pyl.push(pg);
    }

    // the car, seen from behind
    var car = new T.Group();
    var carM = new T.MeshLambertMaterial({ color: 0xff3d81 });
    var darkM = new T.MeshLambertMaterial({ color: 0x0a0d1e });
    var tailM = new T.MeshBasicMaterial({ color: 0xff2030 });
    var glowM = new T.MeshBasicMaterial({ transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
    function part(g, mat, x, y, z) { var p = new T.Mesh(g, mat); p.position.set(x, y, z); car.add(p); return p; }
    part(new T.BoxGeometry(1.9, 0.5, 4.2), carM, 0, 0.55, 0);
    part(new T.BoxGeometry(1.5, 0.42, 1.7), darkM, 0, 1.0, 0.2);
    part(new T.BoxGeometry(1.8, 0.07, 0.45), carM, 0, 1.18, 1.95);
    part(new T.BoxGeometry(0.08, 0.3, 0.08), darkM, -0.6, 0.98, 1.9);
    part(new T.BoxGeometry(0.08, 0.3, 0.08), darkM, 0.6, 0.98, 1.9);
    part(new T.BoxGeometry(0.55, 0.14, 0.05), tailM, -0.6, 0.66, 2.11);
    part(new T.BoxGeometry(0.55, 0.14, 0.05), tailM, 0.6, 0.66, 2.11);
    var glow = part(new T.PlaneGeometry(2.4, 4.8), glowM, 0, 0.1, 0);
    glow.rotation.x = -Math.PI / 2;
    var wheels = [], wheelG = new T.CylinderGeometry(0.38, 0.38, 0.3, 16);
    [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]].forEach(function (p) {
      var piv = new T.Group(); piv.position.set(p[0], 0.38, p[1]);
      var w = new T.Mesh(wheelG, darkM); w.rotation.z = Math.PI / 2;
      piv.add(w); car.add(piv); wheels.push(piv);
    });
    scene.add(car);

    // laser beams from the horizon
    var lz = new T.Group(), lasers = [], beamG = new T.BoxGeometry(0.15, 0.15, 180);
    beamG.translate(0, 0, 90);
    for (var b = 0; b < 6; b++) {
      var bm = new T.Mesh(beamG, new T.MeshBasicMaterial({ transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      bm.position.set(-30 + b * 12, 0.5, -120); lz.add(bm); lasers.push(bm);
    }
    lz.visible = false; scene.add(lz);

    function paint(id, tag) {
      var base = PAL[family(id, tag)], hs = ((hash(id + 'h') % 41) - 20) / 360, k;
      P = {};
      for (k in base) { var c = new T.Color(base[k]); c.offsetHSL(hs, 0, 0); P[k] = c.getStyle(); }
      skyT.redraw(); sunT.redraw(); gridT.redraw(); roadT.redraw();
      scene.background = skyT;
      scene.fog.color.set(P.hor);
      capMs[0].color.set(P.g1); capMs[1].color.set(P.g2);
      glowM.color.set(P.g1); mountM.color.set(P.g2); sunL.color.set(P.g1);
      lasers.forEach(function (l, i) { l.material.color.set(i % 2 ? P.g1 : P.g2); });
      carM.color.setHSL((hash(id || 'x') % 360) / 360, 0.85, 0.52);
    }
    paint('', 'Retro');

    var S = { playing: false, scratch: false, bpm: 100, rate: 1, id: null, tag: null };
    var beat = 0, tt = 0, speed = 3, wx = 0, laserT = 0, turboT = 0, flipT = 0, last = 0, raf = 0, beatEl = null, lastB = -1, flashTimer = 0;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!dt) return;
      tt += dt;
      var mo = reduce ? 0.3 : 1, live = S.playing || S.scratch;
      if (live) beat += dt * S.bpm * S.rate / 60;
      var pulse = live ? Math.exp(-(beat % 1) * 5) : 0;
      turboT = Math.max(0, turboT - dt); laserT = Math.max(0, laserT - dt); flipT = Math.max(0, flipT - dt);

      // holding the record stops the road; playing speeds it up
      var tgt = (S.playing ? 16 * S.rate : (S.scratch ? 0 : 3)) * (turboT > 0 ? 2.4 : 1) * mo;
      speed += (tgt - speed) * Math.min(1, dt * 2.5);
      var d = speed * dt;
      gridT.offset.y += d / 4; roadT.offset.y += d / 4;
      pyl.forEach(function (g) { g.position.z += d; if (g.position.z > 12) g.position.z -= 224; });
      wheels.forEach(function (w) { w.rotation.x -= d * 2.6; });

      var ph8 = beat * Math.PI / 4;
      wx += ((live ? Math.sin(ph8) * 1.5 * mo : 0) - wx) * Math.min(1, dt * 4);
      car.position.set(wx, pulse * 0.09 * mo, 0);
      car.rotation.set(-pulse * 0.03, live ? -Math.cos(ph8) * 0.12 * mo : 0, live ? -Math.cos(ph8) * 0.06 * mo : 0);
      if (S.scratch) car.rotation.y += Math.sin(tt * 45) * 0.07;
      if (flipT > 0) { var f = 1 - flipT / 1.1; car.rotation.z += f * Math.PI * 2; car.position.y += Math.sin(f * Math.PI) * 2.4; }
      tailM.color.setRGB(0.35 + 0.65 * pulse, 0.03, 0.06 + 0.1 * pulse);
      glowM.opacity = 0.3 + 0.5 * pulse;
      sun.scale.setScalar(1 + pulse * 0.05);

      cam.position.set(wx * 0.5, 2.6 + (turboT > 0 ? Math.sin(tt * 60) * 0.04 : 0), 8.5);
      cam.lookAt(wx * 0.2, 1.2, -12);
      var fov = 58 + (turboT > 0 ? 12 : 0) + pulse * 1.5;
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov += (fov - cam.fov) * 0.2; cam.updateProjectionMatrix(); }

     lz.visible = laserT > 0 || S.playing;
if (lz.visible) lasers.forEach(function (l, i) {
  l.rotation.y = Math.sin(tt * 1.6 + i) * 0.5 + (i < 3 ? -0.25 : 0.25);
  l.rotation.x = -0.05 - 0.1 * (0.5 + 0.5 * Math.sin(tt * 2.3 + i * 1.7));
  l.material.opacity = 0.35 + 0.5 * pulse;
});

      // let the DJ deck glow on the beat
      if (!beatEl) beatEl = document.getElementById('mx-dj');
      if (beatEl) {
        var q = Math.round(pulse * 20) / 20;
        if (q !== lastB) { lastB = q; beatEl.style.setProperty('--beat', q); }
      }
      gl.render(scene, cam);
    }

    function resize() {
      var w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
      gl.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    resize();
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);

    return {
      set: function (o) {
        for (var k in o) if (o[k] !== undefined) S[k] = o[k];
        if (o.id !== undefined && (o.id !== this._id || o.tag !== this._tag)) { this._id = o.id; this._tag = o.tag; paint(o.id, o.tag); }
      },
      sync: function () { beat = Math.round(beat); },
      fx: function (n) {
        if (n === 'laser') laserT = 4;
        else if (n === 'turbo') turboT = 2.4;
        else if (n === 'flip' && flipT <= 0) flipT = 1.1;
        else if (n === 'strobe') {
          flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
          clearTimeout(flashTimer); flashTimer = setTimeout(function () { flash.classList.remove('on'); }, 1300);
        }
      },
      dispose: function () {
        cancelAnimationFrame(raf); clearTimeout(flashTimer);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        gl.dispose(); gl.domElement.remove(); flash.remove();
      }
    };
  }

  window.MusicScene = { create: create, defaultBpm: defaultBpm };
})();
