/* ==========================================================================
   DUMB ARCADE: three small, silly games on one page.
     1. Duck Dash   (3D runner, three.js)
     2. Cheese Tower (3D stacker, three.js)
     3. Potato Whack (2D, plain DOM)
   No model or image files: every 3D object is built from basic shapes.
   ========================================================================== */
(function () {
  'use strict';

  function $(s) { return document.querySelector(s); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- saved best scores ---------- */
  function getBest(id) { try { return Number(localStorage.getItem('akp-dumb-' + id)) || 0; } catch (e) { return 0; } }
  function setBest(id, v) { try { localStorage.setItem('akp-dumb-' + id, String(v)); } catch (e) { /* ignore */ } }

  /* ---------- tiny sound effects (made with the browser, no files) ---------- */
  var AC = null, muted = false;
  function beep(freq, dur, type, vol, slide) {
    if (muted) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* audio not available */ }
  }
  var SFX = {
    quack: function () { beep(560, 0.12, 'sawtooth', 0.06, 0.6); setTimeout(function () { beep(440, 0.1, 'sawtooth', 0.05, 0.7); }, 110); },
    coin: function () { beep(880, 0.07, 'square', 0.05); setTimeout(function () { beep(1320, 0.1, 'square', 0.05); }, 70); },
    boom: function () { beep(160, 0.35, 'sawtooth', 0.09, 0.3); },
    place: function () { beep(300, 0.08, 'triangle', 0.1, 1.4); },
    perfect: function () { beep(660, 0.08, 'square', 0.05); setTimeout(function () { beep(990, 0.08, 'square', 0.05); }, 80); setTimeout(function () { beep(1480, 0.14, 'square', 0.05); }, 160); },
    splat: function () { beep(240, 0.12, 'square', 0.07, 0.4); },
    bad: function () { beep(200, 0.25, 'sawtooth', 0.07, 0.5); }
  };

  /* ---------- page elements ---------- */
  var board = $('#gm-board'), glCanvas = $('#gl'), whackEl = $('#whack'), holesEl = $('#holes');
  var overlay = $('#gm-overlay'), ovTitle = $('#ov-title'), ovText = $('#ov-text'), ovBtn = $('#ov-btn'), ovKeys = $('#ov-keys');
  var toastEl = $('#gm-toast'), statusEl = $('#gm-status'), muteBtn = $('#gm-mute');
  var hud = { score: $('#hud-score'), best: $('#hud-best'), k3: $('#hud-k3'), v3: $('#hud-v3') };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.gm-tab'));

  var overAt = 0;
  var mode = 'menu';          // menu | play | pause | over
  var score = 0;
  var cur = null, curId = null, curDef = null;
  var renderer = null;

  function popEl(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  var api = {
    setScore: function (v) { score = v; hud.score.textContent = v; popEl(hud.score); },
    setStat: function (label, v) { hud.k3.textContent = label; hud.v3.textContent = v; },
    toast: function (text) {
      toastEl.textContent = text;
      toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show');
    },
    end: function (msg) { endGame(msg); },
    playing: function () { return mode === 'play'; },
    sfx: SFX
  };

  /* ======================================================================
     GAME 1: DUCK DASH (3D)
     ====================================================================== */
  function makeDuck(api) {
    var T = THREE;
    var scene = new T.Scene();
    scene.background = new T.Color(0x8fd3ff);
    scene.fog = new T.Fog(0x8fd3ff, 24, 64);
    var camera = new T.PerspectiveCamera(58, 0.75, 0.1, 100);
    var camBase = { x: 0, y: 4.6, z: 7.6 };
    camera.position.set(camBase.x, camBase.y, camBase.z);
    camera.lookAt(0, 0.8, -7);
    scene.add(new T.HemisphereLight(0xffffff, 0x6fae55, 0.95));
    var sun = new T.DirectionalLight(0xffffff, 0.7);
    sun.position.set(4, 9, 6); scene.add(sun);

    function lam(c) { return new T.MeshLambertMaterial({ color: c }); }
    var LANES = [-2.4, 0, 2.4];

    // ground, road and lane dashes
    var ground = new T.Mesh(new T.PlaneGeometry(70, 150), lam(0x7ed957));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -55; scene.add(ground);
    var road = new T.Mesh(new T.PlaneGeometry(7.6, 150), lam(0x5b6178));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, -55); scene.add(road);
    var dashGeo = new T.BoxGeometry(0.16, 0.02, 1.6), dashMat = lam(0xffffff), dashes = [];
    [-1.2, 1.2].forEach(function (x) {
      for (var i = 0; i < 16; i++) {
        var d = new T.Mesh(dashGeo, dashMat); d.position.set(x, 0.04, 6 - i * 5.2); scene.add(d); dashes.push(d);
      }
    });

    // roadside trees
    var trees = [];
    var trunkGeo = new T.CylinderGeometry(0.25, 0.3, 1.2, 8), leafGeo = new T.ConeGeometry(1.1, 2.6, 9);
    var trunkMat = lam(0x7a4b25), leafMats = [lam(0x2f9e44), lam(0x37b24d), lam(0x2b8a3e)];
    for (var i = 0; i < 26; i++) {
      var tr = new T.Group();
      var tk = new T.Mesh(trunkGeo, trunkMat); tk.position.y = 0.6; tr.add(tk);
      var lf = new T.Mesh(leafGeo, pick(leafMats)); lf.position.y = 2.4; tr.add(lf);
      var side = i % 2 ? 1 : -1;
      tr.position.set(side * rand(6, 11), 0, 6 - (i >> 1) * 7);
      tr.scale.setScalar(rand(0.8, 1.4));
      scene.add(tr); trees.push(tr);
    }

    // the duck (faces away from the camera, wears a party hat)
    var duck = new T.Group();
    var yel = lam(0xffe14d), org = lam(0xff9b2f), dark = new T.MeshBasicMaterial({ color: 0x111111 });
    var body = new T.Mesh(new T.SphereGeometry(0.6, 18, 14), yel);
    body.scale.set(1, 0.85, 1.25); body.position.y = 0.6; duck.add(body);
    var tail = new T.Mesh(new T.ConeGeometry(0.2, 0.42, 8), yel);
    tail.rotation.x = Math.PI / 2.6; tail.position.set(0, 0.85, 0.78); duck.add(tail);
    var head = new T.Mesh(new T.SphereGeometry(0.37, 16, 12), yel);
    head.position.set(0, 1.22, -0.5); duck.add(head);
    var beak = new T.Mesh(new T.ConeGeometry(0.15, 0.4, 8), org);
    beak.rotation.x = -Math.PI / 2; beak.position.set(0, 1.14, -0.92); duck.add(beak);
    [-1, 1].forEach(function (s) {
      var eye = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), dark); eye.position.set(s * 0.17, 1.3, -0.76); duck.add(eye);
      var wing = new T.Mesh(new T.SphereGeometry(0.3, 10, 8), lam(0xf2c92e));
      wing.scale.set(0.35, 0.8, 1); wing.position.set(s * 0.62, 0.65, 0.05); duck.add(wing);
    });
    var hat = new T.Mesh(new T.ConeGeometry(0.17, 0.46, 10), lam(0xff4fa3));
    hat.position.set(0, 1.78, -0.5); hat.rotation.z = 0.2; duck.add(hat);
    var pom = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), lam(0xffffff)); pom.position.set(-0.04, 2.03, -0.5); duck.add(pom);
    var feet = [-1, 1].map(function (s) {
      var f = new T.Mesh(new T.BoxGeometry(0.32, 0.1, 0.46), org); f.position.set(s * 0.26, 0.07, -0.1); duck.add(f); return f;
    });
    scene.add(duck);

    // obstacle and collectible builders
    var donutGeo = new T.TorusGeometry(0.3, 0.13, 8, 18), donutMat = lam(0xff7ab8);
    function buildObstacle(type) {
      var g = new T.Group(), o = { mesh: g, type: type, w: 1.4, d: 1, h: 1 };
      if (type === 'toaster') {
        var b = new T.Mesh(new T.BoxGeometry(1.5, 1, 1), lam(0xcfd3da)); b.position.y = 0.5; g.add(b);
        [-0.32, 0.32].forEach(function (x) {
          var slot = new T.Mesh(new T.BoxGeometry(0.4, 0.04, 0.8), lam(0x333a44)); slot.position.set(x, 1.01, 0); g.add(slot);
          var bread = new T.Mesh(new T.BoxGeometry(0.36, 0.5, 0.1), lam(0xd9a066)); bread.position.set(x, 1.2, 0); g.add(bread);
        });
        var lever = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.2), lam(0xff4d4d)); lever.position.set(0.9, 0.6, 0); g.add(lever);
        o.w = 1.5; o.d = 1; o.h = 1.05;
      } else if (type === 'sock') {
        var s = new T.Mesh(new T.BoxGeometry(1, 0.45, 0.7), lam(0xff7ab8)); s.position.y = 0.23; g.add(s);
        var st = new T.Mesh(new T.BoxGeometry(1.02, 0.12, 0.72), lam(0xffffff)); st.position.y = 0.3; g.add(st);
        o.w = 1; o.d = 0.7; o.h = 0.45;
      } else {
        var bn = new T.Mesh(new T.TorusGeometry(0.55, 0.16, 8, 14, Math.PI), lam(0xffe135));
        bn.rotation.x = -Math.PI / 2; bn.position.y = 0.17; g.add(bn);
        o.w = 1.3; o.d = 0.7; o.h = 0.38;
      }
      return o;
    }

    var S = {};           // run state
    var obstacles = [], donuts = [];
    function reset() {
      obstacles.forEach(function (o) { scene.remove(o.mesh); }); obstacles = [];
      donuts.forEach(function (d) { scene.remove(d.mesh); }); donuts = [];
      S = { lane: 1, x: 0, y: 0, vy: 0, time: 0, dist: 0, got: 0, lives: 3, invuln: 0, shake: 0, next: 10, lastScore: -1, speed: 14 };
    }
    reset();

    function spawnRow() {
      var z = -62;
      var lane = Math.floor(Math.random() * 3);
      if (Math.random() < 0.65) {
        var o = buildObstacle(pick(['toaster', 'sock', 'banana', 'sock']));
        o.mesh.position.set(LANES[lane], 0, z); o.x = LANES[lane]; o.z = z;
        scene.add(o.mesh); obstacles.push(o);
        if (Math.random() < 0.5) addDonutLine((lane + 1 + Math.floor(Math.random() * 2)) % 3, z);
      } else {
        addDonutLine(lane, z);
      }
    }
    function addDonutLine(lane, z) {
      for (var i = 0; i < 3; i++) {
        var m = new T.Mesh(donutGeo, donutMat); m.position.set(LANES[lane], 0.95, z - i * 2.6); scene.add(m);
        donuts.push({ mesh: m, x: LANES[lane], z: z - i * 2.6 });
      }
    }

    function jump() { if (S.y <= 0.001) { S.vy = 11.5; api.sfx.quack(); } }
    function lane(dir) { S.lane = clamp(S.lane + dir, 0, 2); }

    var down = null;
    return {
      scene: scene, camera: camera,
      start: function () { reset(); api.setStat('LIVES', '\u2665\u2665\u2665'); },
      resize: function (a) { camera.aspect = a; camera.updateProjectionMatrix(); },
      key: function (code) {
        if (code === 'ArrowLeft' || code === 'KeyA') lane(-1);
        else if (code === 'ArrowRight' || code === 'KeyD') lane(1);
        else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') jump();
      },
      pointer: function (type, e) {
        if (type === 'down') { down = { x: e.clientX, y: e.clientY }; return; }
        if (type === 'up' && down) {
          var dx = e.clientX - down.x, dy = e.clientY - down.y;
          if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) lane(dx > 0 ? 1 : -1);
          else if (dy < -28) jump();
          else jump();
          down = null;
        }
      },
      update: function (dt, playing) {
        S.time += dt;
        var speed = playing ? 14 + Math.min(16, S.time * 0.4) : 5;
        S.speed = speed;
        // scenery scrolls toward the camera
        dashes.forEach(function (d) { d.position.z += speed * dt; if (d.position.z > 7) d.position.z -= 83.2; });
        trees.forEach(function (t) { t.position.z += speed * dt; if (t.position.z > 8) { t.position.z -= 92; t.position.x = (t.position.x > 0 ? 1 : -1) * rand(6, 11); } });

        // duck movement
        S.x += (LANES[S.lane] - S.x) * Math.min(1, dt * 12);
        if (S.y > 0 || S.vy > 0) { S.vy -= 32 * dt; S.y += S.vy * dt; if (S.y <= 0) { S.y = 0; S.vy = 0; } }
        var onGround = S.y <= 0.001;
        duck.position.set(S.x, S.y, 0);
        duck.rotation.z = onGround ? Math.sin(S.time * 14) * 0.13 : (S.x - LANES[S.lane]) * -0.1;
        duck.rotation.x = onGround ? 0 : clamp(-S.vy * 0.03, -0.35, 0.35);
        duck.position.y += onGround ? Math.abs(Math.sin(S.time * 14)) * 0.07 : 0;
        feet[0].position.z = -0.1 + Math.sin(S.time * 14) * 0.18;
        feet[1].position.z = -0.1 - Math.sin(S.time * 14) * 0.18;
        S.invuln = Math.max(0, S.invuln - dt);
        duck.visible = S.invuln <= 0 || Math.floor(S.time * 14) % 2 === 0;

        if (playing) {
          S.dist += speed * dt;
          S.next -= speed * dt;
          if (S.next <= 0) { spawnRow(); S.next = rand(9, 15); }

          for (var i = obstacles.length - 1; i >= 0; i--) {
            var o = obstacles[i];
            o.z += speed * dt; o.mesh.position.z = o.z;
            if (o.z > 9) { scene.remove(o.mesh); obstacles.splice(i, 1); continue; }
            if (S.invuln <= 0 && Math.abs(o.z) < o.d / 2 + 0.55 && Math.abs(o.x - S.x) < o.w / 2 + 0.4 && S.y < o.h) {
              scene.remove(o.mesh); obstacles.splice(i, 1);
              S.lives -= 1; S.invuln = 1.3; S.shake = reduce ? 0 : 0.5;
              api.sfx.boom();
              api.toast(pick(['OOF!', 'QUACKTASTROPHE', 'MY HAT!', 'BONK', 'WHY']));
              api.setStat('LIVES', S.lives > 0 ? new Array(S.lives + 1).join('\u2665') : '-');
              if (S.lives <= 0) { api.end(pick([
                'The duck missed its nap. It is very upset.',
                'A toaster won. Nobody is proud of this.',
                'That duck had a hat and big dreams.'
              ])); return; }
            }
          }
          for (var j = donuts.length - 1; j >= 0; j--) {
            var d = donuts[j];
            d.z += speed * dt; d.mesh.position.z = d.z; d.mesh.rotation.y += dt * 4; d.mesh.rotation.x = 1.2;
            if (d.z > 9) { scene.remove(d.mesh); donuts.splice(j, 1); continue; }
            if (Math.abs(d.z) < 0.9 && Math.abs(d.x - S.x) < 0.9 && Math.abs(S.y + 0.6 - 0.95) < 1.1) {
              scene.remove(d.mesh); donuts.splice(j, 1); S.got += 1; api.sfx.coin();
              if (S.got % 5 === 0) api.toast(pick(['DONUT HEAVEN', 'SO SWEET', 'NOM NOM NOM']));
            }
          }
          var sc = Math.floor(S.dist / 4) + S.got * 10;
          if (sc !== S.lastScore) { S.lastScore = sc; api.setScore(sc); }
        } else {
          donuts.forEach(function (d) { d.mesh.rotation.y += dt * 4; });
        }

        S.shake = Math.max(0, S.shake - dt * 1.4);
        camera.position.x = camBase.x + (S.x * 0.35) + (Math.random() - 0.5) * S.shake * 0.5;
        camera.position.y = camBase.y + (Math.random() - 0.5) * S.shake * 0.4 + S.y * 0.25;
      },
      dispose: function () { disposeScene(scene); }
    };
  }

  /* ======================================================================
     GAME 2: CHEESE TOWER (3D)
     ====================================================================== */
  function makeStack(api) {
    var T = THREE;
    var scene = new T.Scene();
    scene.background = new T.Color(0xffc8dd);
    var viewH = 10, aspect = 0.75;
    var camera = new T.OrthographicCamera(-viewH * aspect / 2, viewH * aspect / 2, viewH / 2, -viewH / 2, -60, 120);
    scene.add(new T.AmbientLight(0xffffff, 0.75));
    var dl = new T.DirectionalLight(0xffffff, 0.7); dl.position.set(6, 12, 4); scene.add(dl);

    var plate = new T.Mesh(new T.CylinderGeometry(3.6, 3.6, 0.25, 40), new T.MeshLambertMaterial({ color: 0xffffff }));
    plate.position.y = -0.125; scene.add(plate);

    var H = 0.4, AMP = 3.5, MAXW = 3;
    var blocks = [], debris = [], S = {};
    var camY = 0;

    function color(level) { return new T.Color().setHSL(((level * 17) % 360) / 360, 0.75, 0.6); }
    function addBlock(x, z, w, d, level) {
      var m = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: color(level) }));
      m.scale.set(w, H, d); m.position.set(x, H / 2 + level * H, z); scene.add(m); return m;
    }
    function clear() {
      blocks.forEach(function (b) { scene.remove(b.mesh); }); blocks = [];
      debris.forEach(function (b) { scene.remove(b.mesh); }); debris = [];
    }
    function spawnMoving() {
      var prev = blocks[blocks.length - 1];
      S.level = blocks.length;
      S.axis = S.level % 2 ? 'x' : 'z';
      S.ph = -Math.PI / 2;
      var m = addBlock(prev.x, prev.z, prev.w, prev.d, S.level);
      S.mesh = m; S.w = prev.w; S.d = prev.d;
    }
    function begin() {
      clear();
      S = { level: 0, perf: 0, over: false, endT: 0, t: 0 };
      var base = addBlock(0, 0, MAXW, MAXW, 0);
      blocks.push({ mesh: base, x: 0, z: 0, w: MAXW, d: MAXW });
      spawnMoving();
      camY = 0;
    }
    function dropDebris(x, y, z, w, d, level) {
      var m = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: color(level) }));
      m.scale.set(w, H, d); m.position.set(x, y, z); scene.add(m);
      debris.push({ mesh: m, vy: 0, vr: rand(-2, 2) });
    }

    function place() {
      if (S.over) return;
      var a = S.axis, size = a === 'x' ? 'w' : 'd';
      var prev = blocks[blocks.length - 1];
      var pc = prev[a], ps = prev[size];
      var pos = S.mesh.position[a];
      var delta = pos - pc, ad = Math.abs(delta);
      var y = S.mesh.position.y;
      var other = a === 'x' ? 'z' : 'x';

      if (ad >= ps) {                       // missed the tower completely
        S.over = true;
        debris.push({ mesh: S.mesh, vy: 0, vr: rand(-2, 2) });
        api.sfx.boom();
        S.endT = 0.9;
        return;
      }
      var newSize = ps, newCenter = pc;
      if (ad < 0.14) {                      // PERFECT
        S.perf += 1;
        pos = pc;
        if (S.perf >= 3 && ps < MAXW) newSize = Math.min(MAXW, ps + 0.35);
        api.toast(S.perf >= 3 ? 'COMBO x' + S.perf : 'PERFECT!');
        api.sfx.perfect();
      } else {
        S.perf = 0;
        newSize = ps - ad;
        newCenter = pc + delta / 2;
        var dc = (pc + pos) / 2 + (delta > 0 ? ps / 2 : -ps / 2);
        var dx = a === 'x' ? dc : prev.x, dz = a === 'z' ? dc : prev.z;
        dropDebris(dx, y, dz, a === 'x' ? ad : prev.w, a === 'z' ? ad : prev.d, S.level);
        api.sfx.place();
        if (Math.random() < 0.35) api.toast(pick(['Wobbly!', 'Cheesy!', 'Load-bearing?', 'Gravity is shy', 'Sturdy-ish']));
      }
      var rec = { mesh: S.mesh, x: prev.x, z: prev.z, w: prev.w, d: prev.d };
      rec[a] = (ad < 0.14) ? pc : newCenter;
      rec[size] = newSize;
      rec.mesh.scale.set(rec.w, H, rec.d);
      rec.mesh.position.x = rec.x; rec.mesh.position.z = rec.z;
      blocks.push(rec);
      api.setScore(blocks.length - 1);
      api.setStat('PERFECT', S.perf);
      spawnMoving();
    }

    function updateCamera() {
      var targetY = Math.max(0, (blocks.length - 1) * H);
      camY += (targetY - camY) * 0.08;
      camera.position.set(8, 8 + camY, 8);
      camera.lookAt(0, camY, 0);
    }
    begin();
    updateCamera();

    return {
      scene: scene, camera: camera,
      start: function () { begin(); api.setStat('PERFECT', 0); },
      resize: function (a) {
        aspect = a;
        camera.left = -viewH * a / 2; camera.right = viewH * a / 2; camera.updateProjectionMatrix();
      },
      key: function (code) { if (code === 'Space' || code === 'Enter' || code === 'ArrowDown') place(); },
      pointer: function (type) { if (type === 'down') place(); },
      update: function (dt, playing) {
        S.t += dt;
        if (!S.over) {
          var speed = Math.min(5, 2.2 + S.level * 0.07);
          S.ph += dt * speed;
          S.mesh.position[S.axis] = Math.sin(S.ph) * AMP;
        }
        for (var i = debris.length - 1; i >= 0; i--) {
          var d = debris[i];
          d.vy -= 24 * dt; d.mesh.position.y += d.vy * dt; d.mesh.rotation.z += d.vr * dt;
          if (d.mesh.position.y < -14) { scene.remove(d.mesh); debris.splice(i, 1); }
        }
        if (S.over) {
          S.endT -= dt;
          if (S.endT <= 0 && mode === 'play') {
            api.end(pick([
              'The tower said NOPE and left.',
              'That cheese was not load-bearing.',
              'A very confident tower, until it was not.'
            ]));
          }
        }
        updateCamera();
      },
      dispose: function () { disposeScene(scene); }
    };
  }

  /* ======================================================================
     GAME 3: POTATO WHACK (2D)
     ====================================================================== */
  function makeWhack(api) {
    var holes = [], S = {};
    holesEl.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      (function (idx) {
        var el = document.createElement('button');
        el.type = 'button'; el.className = 'gm-hole'; el.setAttribute('aria-label', 'Hole ' + (idx + 1));
        var pop = document.createElement('span'); pop.className = 'gm-pop'; el.appendChild(pop);
        holesEl.appendChild(el);
        var h = { el: el, pop: pop, type: null, t: 0, up: false };
        el.addEventListener('pointerdown', function (e) { e.preventDefault(); whack(h); });
        holes.push(h);
      })(i);
    }

    function hide(h) { h.up = false; h.type = null; h.el.classList.remove('up', 'hit'); }
    function reset() {
      holes.forEach(hide);
      S = { time: 30, spawnT: 0.5, n: 0, running: true };
      api.setStat('TIME', 30);
    }
    function whack(h) {
      if (!api.playing() || !h.up) return;
      var type = h.type; h.up = false;
      h.el.classList.add('hit');
      setTimeout(function () { hide(h); }, 280);
      if (type === 'potato') {
        S.n += 1; api.setScore(score + 1); api.sfx.splat();
        if (Math.random() < 0.2) api.toast(pick(['SPLAT!', 'MASHED!', 'TOO EASY', 'SPUD DOWN']));
      } else if (type === 'gold') {
        S.n += 1; api.setScore(score + 5); api.sfx.coin(); api.toast('GOLDEN SPUD +5');
      } else {
        api.setScore(Math.max(0, score - 3)); api.sfx.bad(); api.toast(pick(['NOT THE DUCK!', 'THE DUCK HAS RIGHTS', 'WHY WOULD YOU']));
      }
    }
    function spawn() {
      var free = holes.filter(function (h) { return !h.up; });
      if (!free.length) return;
      var h = pick(free), r = Math.random();
      h.type = r < 0.74 ? 'potato' : r < 0.84 ? 'gold' : 'duck';
      h.pop.textContent = h.type === 'potato' ? '\uD83E\uDD54' : h.type === 'gold' ? '\uD83C\uDF60' : '\uD83E\uDD86';
      var elapsed = 30 - S.time;
      h.t = Math.max(0.5, rand(0.85, 1.4) - elapsed * 0.012);
      h.up = true; h.el.classList.remove('hit'); h.el.classList.add('up');
    }
    reset();

    return {
      start: reset,
      resize: function () {},
      key: function () {},
      pointer: function () {},
      update: function (dt, playing) {
        if (!playing) return;
        S.time -= dt;
        api.setStat('TIME', Math.max(0, Math.ceil(S.time)));
        S.spawnT -= dt;
        if (S.spawnT <= 0) { spawn(); S.spawnT = Math.max(0.28, 0.8 - (30 - S.time) * 0.016); }
        holes.forEach(function (h) { if (h.up) { h.t -= dt; if (h.t <= 0) hide(h); } });
        if (S.time <= 0) api.end(S.n >= 25 ? 'Potato destroyer. The farm will remember.' : S.n >= 12 ? 'Decent whacking. The potatoes are scared.' : 'The potatoes won today.');
      },
      dispose: function () { holesEl.innerHTML = ''; }
    };
  }

  /* ---------- helpers shared by the 3D games ---------- */
  function disposeScene(scene) {
    scene.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); }); }
    });
  }
  function ensureRenderer() {
    if (renderer) return true;
    if (typeof THREE === 'undefined') return false;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
      return true;
    } catch (e) { renderer = null; return false; }
  }
  function fit() {
    if (!renderer || !curDef || !curDef.three) return;
    var r = board.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(r.width, r.height, false);
    if (cur && cur.resize) cur.resize(r.width / r.height);
  }

  /* ---------- game list ---------- */
  var DEFS = {
    duck: {
      three: true, make: makeDuck, title: 'Duck Dash',
      text: 'A duck in a party hat is late for a very important nap. Dodge toasters and bananas, jump over socks, collect donuts.',
      keys: 'Arrows or A / D change lane. Space, W or Up jumps. On a phone, swipe or tap.',
      over: ['Quack-tastrophe', 'Nap cancelled', 'Duck down']
    },
    stack: {
      three: true, make: makeStack, title: 'Cheese Tower',
      text: 'Stack slabs of questionable cheese. Tap when the slab lines up with the one below. Anything that hangs over gets chopped off.',
      keys: 'Click, tap, or press Space to drop a slab. Three perfect drops in a row make slabs grow back.',
      over: ['Tower down', 'Cheese everywhere', 'Gravity wins']
    },
    whack: {
      three: false, make: makeWhack, title: 'Potato Whack',
      text: 'Whack the potatoes. Golden sweet potatoes are worth 5. Do not whack the duck. You have 30 seconds.',
      keys: 'Click or tap the potatoes as they pop up.',
      over: ['Time!', 'Spud season over', 'The farm is quiet']
    }
  };

  /* ---------- flow ---------- */
  function showOverlay(title, text, btn, keys) {
    ovTitle.textContent = title; ovText.textContent = text; ovBtn.textContent = btn; ovKeys.textContent = keys || '';
    overlay.classList.remove('hide');
    try { ovBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function hideOverlay() { overlay.classList.add('hide'); }

  function select(id) {
    if (cur) { cur.dispose(); cur = null; }
    curId = id; curDef = DEFS[id]; mode = 'menu'; score = 0;
    tabs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.game === id)); });
    glCanvas.hidden = !curDef.three;
    whackEl.hidden = curDef.three;
    hud.score.textContent = '0';
    hud.best.textContent = getBest(id);
    if (curDef.three && !ensureRenderer()) {
      cur = null;
      showOverlay('3D is not available', 'This browser could not start WebGL, or the 3D library did not load. Try Potato Whack instead, or reload with an internet connection.', 'OK', '');
      api.setStat('-', '-');
      return;
    }
    cur = curDef.make(api);
    api.setStat(id === 'duck' ? 'LIVES' : id === 'stack' ? 'PERFECT' : 'TIME', id === 'duck' ? '\u2665\u2665\u2665' : id === 'stack' ? '0' : '30');
    fit();
    showOverlay(curDef.title, curDef.text, 'Start', curDef.keys);
  }

  function startGame() {
    if (!cur) return;
    score = 0; hud.score.textContent = '0';
    cur.start();
    mode = 'play';
    hideOverlay();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    statusEl.textContent = curDef.title + ' started';
  }
  function pauseGame() {
    if (mode !== 'play') return;
    mode = 'pause';
    showOverlay('Paused', 'Take a breather. The duck can wait.', 'Resume', '');
  }
  function endGame(msg) {
    if (mode !== 'play') return;
    mode = 'over'; overAt = performance.now();
    var fresh = score > getBest(curId);
    if (fresh) { setBest(curId, score); hud.best.textContent = score; }
    statusEl.textContent = 'Game over. Score ' + score;
    showOverlay(fresh ? 'New best!' : pick(curDef.over), (msg || '') + ' You scored ' + score + '.' + (fresh ? ' That is your best yet.' : ''), 'Play again', '');
  }

  ovBtn.addEventListener('click', function () {
    if (mode === 'pause') { mode = 'play'; hideOverlay(); ovBtn.blur(); }
    else if (cur) startGame();
    else select(curId);
  });
  tabs.forEach(function (b) { b.addEventListener('click', function () { select(b.dataset.game); b.blur(); }); });
  muteBtn.addEventListener('click', function () {
    muted = !muted;
    muteBtn.textContent = 'SOUND: ' + (muted ? 'OFF' : 'ON');
    muteBtn.setAttribute('aria-pressed', String(muted));
  });

  /* ---------- input ---------- */
  window.addEventListener('keydown', function (e) {
    var code = e.code;
    if (mode === 'play' && cur) {
      if (code === 'KeyP' || code === 'Escape') { pauseGame(); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(code) !== -1) e.preventDefault();
      if (!e.repeat) cur.key(code);
      return;
    }
    if ((code === 'Enter' || code === 'Space') && !overlay.classList.contains('hide') && document.activeElement !== ovBtn &&
        !(document.activeElement && document.activeElement.classList.contains('gm-tab'))) {
      e.preventDefault();
      // ignore key-mashing right after a game ends so the result can be read
      if (mode === 'over' && performance.now() - overAt < 900) return;
      ovBtn.click();
    }
  });
  glCanvas.addEventListener('pointerdown', function (e) { if (mode === 'play' && cur) cur.pointer('down', e); });
  glCanvas.addEventListener('pointerup', function (e) { if (mode === 'play' && cur) cur.pointer('up', e); });
  window.addEventListener('resize', fit);
  window.addEventListener('blur', pauseGame);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pauseGame(); });

  /* ---------- main loop ---------- */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (cur) {
      cur.update(dt, mode === 'play');
      if (cur.scene && renderer && curDef.three) renderer.render(cur.scene, cur.camera);
    }
    requestAnimationFrame(frame);
  }

  select('duck');
  requestAnimationFrame(frame);
})();
