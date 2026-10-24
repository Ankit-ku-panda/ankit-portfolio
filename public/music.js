/* ==========================================================================
   MUSIC PAGE: React app (no build step, uses the React UMD files in music.html)

   HOW TO ADD SONGS
   Add a line to DEFAULT_TRACKS below. The id is the 11 characters after
   "v=" in a YouTube link:  youtube.com/watch?v=dQw4w9WgXcQ  ->  dQw4w9WgXcQ
   Visitors can also paste any YouTube link into the page itself.
   ========================================================================== */
(function () {
  'use strict';

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useMemo = React.useMemo;

  var DEFAULT_TRACKS = [
    
    { id: 'yKNxeF4KMsY', title: 'Yellow', artist: 'Coldplay', tag: 'Chill' },
    { id: 'djV11Xbc914', title: 'Take On Me', artist: 'a-ha', tag: 'Retro' },
    { id: 'FTQbiNvZqaY', title: 'Africa', artist: 'Toto', tag: 'Retro' },
    { id: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson', tag: 'Retro' },
    { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', tag: 'Retro' },
    { id: 'lnp08UzZJ-c', title: 'Hindi Song 1', artist: 'Hindi', tag: 'Hindi' },
    { id: 'c999H92thcw', title: 'Hindi Song 2', artist: 'Hindi', tag: 'Hindi' },
    { id: 'sCIiVN0zIGE', title: 'Hindi Song 3', artist: 'Hindi', tag: 'Hindi' },
    { id: 'SNo7YgLWYPY', title: 'Hindi Song 4', artist: 'Hindi', tag: 'Hindi' },
    { id: '5NV6Rdv1a3I', title: 'Get Lucky', artist: 'Daft Punk', tag: 'Retro' },
    { id: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', tag: 'Rock' },
    { id: 'kXYiU_JCYtU', title: 'Numb', artist: 'Linkin Park', tag: 'Rock' },
    { id: 'eVTXPUF4Oz4', title: 'In the End', artist: 'Linkin Park', tag: 'Rock' },
    { id: 'dvgZkm1xWPE', title: 'Viva La Vida', artist: 'Coldplay', tag: 'Rock' },
    { id: '7wtfhZwyrcc', title: 'Believer', artist: 'Imagine Dragons', tag: 'Rock' },
    { id: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', tag: 'Pop' },
    { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', tag: 'Pop' },
    { id: 'RgKAFK5djSk', title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', tag: 'Pop' },
    { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', tag: 'Pop' },
    { id: 'YkgkThdzX-8', title: 'Imagine', artist: 'John Lennon', tag: 'Retro' },
    { id: 'A_MjCqQoLLA', title: 'Hey Jude', artist: 'The Beatles', tag: 'Retro' },
    { id: 'QDYfEBY9NM4', title: 'Let It Be', artist: 'The Beatles', tag: 'Retro' },
    { id: 'NrgmdOz227I', title: 'Yesterday', artist: 'The Beatles', tag: 'Retro' },
    { id: 'sOnqjkJTMaA', title: 'Thriller', artist: 'Michael Jackson', tag: 'Retro' },
    { id: 'xFrGuyw1V8s', title: 'Dancing Queen', artist: 'ABBA', tag: 'Retro' },
    { id: 'izGwDsrQ1eQ', title: 'Careless Whisper', artist: 'George Michael', tag: 'Retro' },
    { id: 'OMOGaugKpzs', title: 'Every Breath You Take', artist: 'The Police', tag: 'Retro' },
    { id: '3T1c7GkzRQQ', title: 'Roxanne', artist: 'The Police', tag: 'Retro' },
    { id: 'qeMFqkcPYcg', title: 'Sweet Dreams', artist: 'Eurythmics', tag: 'Retro' },
    { id: 'PIb6AZdTr-A', title: 'Girls Just Want to Have Fun', artist: 'Cyndi Lauper', tag: 'Retro' },
    { id: 'VdQY7BusJNU', title: 'Time After Time', artist: 'Cyndi Lauper', tag: 'Retro' },
    { id: 'TvnYmWpD_T8', title: 'Purple Rain', artist: 'Prince', tag: 'Retro' },
    { id: 'a01QQZyl-_I', title: 'Under Pressure', artist: 'Queen & David Bowie', tag: 'Retro' },
    { id: 'F2RnxZnubCM', title: 'My Heart Will Go On', artist: 'Celine Dion', tag: 'Pop' },
    { id: '3JWTaaS7LdU', title: 'I Will Always Love You', artist: 'Whitney Houston', tag: 'Pop' },
    { id: '1vhFnTjia_I', title: 'Sweet Caroline', artist: 'Neil Diamond', tag: 'Pop' },
    { id: '1vrEljMfXYo', title: 'Take Me Home, Country Roads', artist: 'John Denver', tag: 'Retro' },
    { id: '09839DpTctU', title: 'Hotel California', artist: 'Eagles', tag: 'Rock' },
    { id: 'QkF3oxziUI4', title: 'Stairway to Heaven', artist: 'Led Zeppelin', tag: 'Rock' },
    { id: '1w7OgIMMRc4', title: "Sweet Child O' Mine", artist: "Guns N' Roses", tag: 'Rock' },
    { id: '8SbUC-UaAxE', title: 'November Rain', artist: "Guns N' Roses", tag: 'Rock' },
    { id: 'hTWKbfoikeg', title: 'Smells Like Teen Spirit', artist: 'Nirvana', tag: 'Rock' },
    { id: '1k8craCGpgs', title: "Don't Stop Believin'", artist: 'Journey', tag: 'Rock' },
    { id: 'lDK9QqIzhwk', title: "Livin' on a Prayer", artist: 'Bon Jovi', tag: 'Rock' },
    { id: 'bx1Bh8ZvH84', title: 'Wonderwall', artist: 'Oasis', tag: 'Rock' },
    { id: 'IXdNnw99-Ic', title: 'Wish You Were Here', artist: 'Pink Floyd', tag: 'Rock' },
    { id: '_FrOQC-zEog', title: 'Comfortably Numb', artist: 'Pink Floyd', tag: 'Rock' },
    { id: 'O4irXQhgMqg', title: 'Paint It Black', artist: 'The Rolling Stones', tag: 'Rock' },
    { id: 'nrIPxlFzDi0', title: '(I Can\'t Get No) Satisfaction', artist: 'The Rolling Stones', tag: 'Rock' },
    { id: 'l482T0yNkeo', title: 'Highway to Hell', artist: 'AC/DC', tag: 'Rock' },
    { id: 'pAgnJDJN4VA', title: 'Back in Black', artist: 'AC/DC', tag: 'Rock' },
    { id: 'CD-E-LDc384', title: 'Enter Sandman', artist: 'Metallica', tag: 'Rock' },
    { id: 'ye5BuYf8q4o', title: 'Sweet Home Alabama', artist: 'Lynyrd Skynyrd', tag: 'Rock' },
    { id: 'y8AWFf7EAc4', title: 'Hallelujah', artist: 'Jeff Buckley', tag: 'Chill' }
  ];

  var BASE_TAGS = ['All', 'Chill', 'Hindi', 'Retro', 'Rock', 'Pop'];
  var STORE_KEY = 'akp-music-custom-v1';

  /* ---------- helpers ---------- */
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function parseYouTubeId(input) {
    var s = (input || '').trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
      var u = new URL(s);
      var id = '';
      if (u.hostname.indexOf('youtu.be') !== -1) {
        id = u.pathname.split('/')[1] || '';
      } else if (u.hostname.indexOf('youtube.com') !== -1) {
        id = u.searchParams.get('v') || '';
        if (!id) {
          var m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
          id = m ? m[1] : '';
        }
      }
      return /^[\w-]{11}$/.test(id) ? id : null;
    } catch (e) {
      return null;
    }
  }

  var ytPromise = null;
  function loadYouTubeApi() {
    if (ytPromise) return ytPromise;
    ytPromise = new Promise(function (resolve) {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      var previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      if (!document.getElementById('yt-iframe-api')) {
        var tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
    return ytPromise;
  }

  /* ---------- React Bits style pieces (small hand-written versions) ---------- */

  // SplitText: letters pop in one by one. Words stay together so nothing breaks mid-word.
  function SplitText(props) {
    var words = props.text.split(' ');
    var count = props.start || 0;
    return h('span', { className: 'mx-split', 'aria-label': props.text },
      words.map(function (word, wi) {
        var letters = Array.from(word).map(function (ch) {
          var i = count++;
          return h('span', { key: i, 'aria-hidden': 'true', style: { '--i': i } }, ch);
        });
        count++; // the space
        return h('span', { key: wi, className: 'mx-word', 'aria-hidden': 'true' }, letters, wi < words.length - 1 ? ' ' : null);
      })
    );
  }

  // ShinyText: a highlight sweeps across the text.
  function ShinyText(props) {
    return h('span', { className: 'mx-shiny' }, props.children);
  }

  // PixelEqualizer: chunky 8-bit bars that dance while a song plays.
  // (YouTube does not expose audio data, so the motion is generated, not measured.)
  function PixelEqualizer(props) {
    var bars = useMemo(function () {
      var out = [];
      for (var i = 0; i < 32; i++) {
        out.push({
          dur: (0.45 + Math.random() * 0.9).toFixed(2) + 's',
          delay: '-' + (Math.random() * 1.2).toFixed(2) + 's'
        });
      }
      return out;
    }, []);
    return h('div', { className: 'mx-eq' + (props.on ? ' on' : ''), 'aria-hidden': 'true' },
      bars.map(function (b, i) {
        return h('i', { key: i, style: { '--n': i, '--d': b.dur, '--dl': b.delay } });
      })
    );
  }

  // Icons for the arcade buttons
  function Icon(props) {
    return h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', fill: 'currentColor' },
      h('path', { d: props.d }));
  }
  var ICON = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
    prev: 'M6 6h2v12H6zM9.5 12L18 18V6z',
    next: 'M16 6h2v12h-2zM6 18l8.5-6L6 6z'
  };

  /* ---------- the app ---------- */
  function App() {
    var customState = useState(function () {
      try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch (e) { return []; }
    });
    var custom = customState[0], setCustom = customState[1];

    var tracks = useMemo(function () { return custom.concat(DEFAULT_TRACKS); }, [custom]);

    var currentState = useState(DEFAULT_TRACKS[0].id);
    var currentId = currentState[0], setCurrentId = currentState[1];
    var statusState = useState('idle'); // idle | loading | playing | paused | error
    var status = statusState[0], setStatus = statusState[1];
    var curState = useState(0), cur = curState[0], setCur = curState[1];
    var durState = useState(0), dur = durState[0], setDur = durState[1];
    var volState = useState(70), vol = volState[0], setVol = volState[1];
    var muteState = useState(false), muted = muteState[0], setMuted = muteState[1];
    var readyState = useState(false), ready = readyState[0], setReady = readyState[1];
    var shuffleState = useState(false), shuffle = shuffleState[0], setShuffle = shuffleState[1];
    var filterState = useState('All'), filter = filterState[0], setFilter = filterState[1];
    var queryState = useState(''), query = queryState[0], setQuery = queryState[1];
    var linkState = useState(''), link = linkState[0], setLink = linkState[1];
    var msgState = useState(''), msg = msgState[0], setMsg = msgState[1];
    var metaState = useState({}), meta = metaState[0], setMeta = metaState[1];

    var holder = useRef(null);
    var playerRef = useRef(null);
    var pendingRef = useRef(null);
    var currentRef = useRef(currentId);
    var shuffleRef = useRef(false);
    var errRef = useRef(0);
    var visibleRef = useRef([]);
    var stepRef = useRef(function () {});
    var snapRef = useRef(DEFAULT_TRACKS[0]);
    var volRef = useRef(70);

    shuffleRef.current = shuffle;
    volRef.current = vol;

    // Show the latest title/artist that YouTube reported, if we have it
    function display(t) {
      var m = meta[t.id];
      return m ? { id: t.id, title: m.title, artist: m.artist, tag: t.tag, custom: t.custom } : t;
    }

    var found = tracks.filter(function (t) { return t.id === currentId; })[0];
    if (found) snapRef.current = found;
    var track = display(found || snapRef.current);
    var channel = Math.max(1, tracks.map(function (t) { return t.id; }).indexOf(currentId) + 1);

    var tags = BASE_TAGS.slice();
    if (custom.length) tags.push('Mine');

    var visible = useMemo(function () {
      var q = query.trim().toLowerCase();
      return tracks.filter(function (t) {
        var d = display(t);
        if (filter !== 'All' && t.tag !== filter) return false;
        if (!q) return true;
        return (d.title + ' ' + d.artist).toLowerCase().indexOf(q) !== -1;
      });
      // eslint-disable-next-line
    }, [tracks, filter, query, meta]);
    visibleRef.current = visible;

    // keep custom tracks saved on this device
    useEffect(function () {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(custom)); } catch (e) { /* storage blocked: fine */ }
    }, [custom]);

    function updateInfo(id, title, artist) {
      if (!id || !title) return;
      setMeta(function (m) {
        var old = m[id];
        if (old && old.title === title && old.artist === artist) return m;
        var next = Object.assign({}, m);
        next[id] = { title: title, artist: artist };
        return next;
      });
      setCustom(function (list) {
        var changed = false;
        var next = list.map(function (t) {
          if (t.id === id && (t.title !== title || t.artist !== artist)) {
            changed = true;
            return Object.assign({}, t, { title: title, artist: artist });
          }
          return t;
        });
        return changed ? next : list;
      });
    }

    function play(id) {
      currentRef.current = id;
      setCurrentId(id);
      setStatus('loading');
      setCur(0);
      setDur(0);
      setMsg('');
      var p = playerRef.current;
      if (p && p.loadVideoById) p.loadVideoById(id);
      else pendingRef.current = id;
    }

    stepRef.current = function (dir) {
      var list = visibleRef.current;
      if (!list.length) return;
      var i = list.map(function (t) { return t.id; }).indexOf(currentRef.current);
      var n;
      if (shuffleRef.current && list.length > 1) {
        do { n = Math.floor(Math.random() * list.length); } while (n === i);
      } else if (i < 0) {
        n = 0;
      } else {
        n = (i + dir + list.length) % list.length;
      }
      play(list[n].id);
    };

    // create the YouTube player once
    useEffect(function () {
      var dead = false;
      loadYouTubeApi().then(function (YT) {
        if (dead || !holder.current) return;
        var mount = document.createElement('div');
        holder.current.appendChild(mount);
        playerRef.current = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          videoId: currentRef.current,
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, disablekb: 1, iv_load_policy: 3 },
          events: {
            onReady: function (e) {
              e.target.setVolume(volRef.current);
              setReady(true);
              if (pendingRef.current) {
                e.target.loadVideoById(pendingRef.current);
                pendingRef.current = null;
              }
            },
            onStateChange: function (e) {
              var p = e.target;
              var S = YT.PlayerState;
              if (e.data === S.PLAYING) {
                errRef.current = 0;
                setStatus('playing');
                setDur(p.getDuration() || 0);
                try {
                  var d = p.getVideoData();
                  if (d && d.video_id) updateInfo(d.video_id, d.title, d.author);
                } catch (err) { /* ignore */ }
              } else if (e.data === S.PAUSED) {
                setStatus('paused');
              } else if (e.data === S.BUFFERING) {
                setStatus('loading');
              } else if (e.data === S.ENDED) {
                stepRef.current(1);
              } else if (e.data === S.CUED) {
                setStatus('idle');
                try {
                  var c = p.getVideoData();
                  if (c && c.video_id) updateInfo(c.video_id, c.title, c.author);
                } catch (err2) { /* ignore */ }
              }
            },
            onError: function () {
              setStatus('error');
              errRef.current += 1;
              if (errRef.current < visibleRef.current.length) {
                setMsg('That video cannot be played here (the owner blocked embedding). Skipping to the next one.');
                setTimeout(function () { stepRef.current(1); }, 1800);
              } else {
                setMsg('None of these would play. Open the page over http(s), not as a local file, and check your connection.');
              }
            }
          }
        });
      });
      return function () {
        dead = true;
        try { if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy(); } catch (e) { /* ignore */ }
        playerRef.current = null;
      };
    }, []);

    // progress timer
    useEffect(function () {
      if (status !== 'playing') return undefined;
      var t = setInterval(function () {
        var p = playerRef.current;
        if (!p || !p.getCurrentTime) return;
        setCur(p.getCurrentTime());
        setDur(p.getDuration() || 0);
      }, 500);
      return function () { clearInterval(t); };
    }, [status]);

    // tab title shows what is playing
    useEffect(function () {
      document.title = (status === 'playing' ? '\u266A ' + track.title + ' \u00B7 ' : '') + 'Music \u00B7 Ankit Panda';
    }, [status, track.title]);

    function togglePlay() {
      var p = playerRef.current;
      if (!p) return;
      if (status === 'playing') p.pauseVideo();
      else if (status === 'error') play(currentRef.current);
      else p.playVideo();
    }

    function onSeek(e) {
      var v = Number(e.target.value);
      setCur(v);
      if (playerRef.current && playerRef.current.seekTo) playerRef.current.seekTo(v, true);
    }

    function onVolume(e) {
      var v = Number(e.target.value);
      setVol(v);
      var p = playerRef.current;
      if (!p) return;
      p.setVolume(v);
      if (v > 0 && muted) { p.unMute(); setMuted(false); }
    }

    function toggleMute() {
      var p = playerRef.current;
      if (!p) return;
      if (muted) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
    }

    function addLink(e) {
      e.preventDefault();
      var id = parseYouTubeId(link);
      if (!id) { setMsg('That does not look like a YouTube link.'); return; }
      var exists = tracks.some(function (t) { return t.id === id; });
      if (!exists) {
        setCustom(function (list) {
          return [{ id: id, title: 'Custom track', artist: 'YouTube', tag: 'Mine', custom: true }].concat(list);
        });
      }
      setLink('');
      setFilter('All');
      setQuery('');
      play(id);
    }

    function removeCustom(id) {
      setCustom(function (list) { return list.filter(function (t) { return t.id !== id; }); });
      if (filter === 'Mine' && custom.length <= 1) setFilter('All');
    }

    function spotlight(e) {
      var r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      e.currentTarget.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }

    var playing = status === 'playing';
    var osd = { idle: 'STOP \u25A0', loading: 'LOADING...', playing: 'PLAY \u25B6', paused: 'PAUSE \u275A\u275A', error: 'NO SIGNAL' }[status];
    var live = ready && dur === 0 && playing;
    var pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
    var chNum = (channel < 10 ? '0' : '') + channel;
    var marquee = '\u266A NOW PLAYING: ' + track.title + ' / ' + track.artist + ' \u266A   ';

    /* ----- pieces of the layout ----- */
    var hero = h('section', { className: 'mx-hero' },
      h('div', { className: 'eyebrow' }, h(ShinyText, null, '05 / SOUNDTRACK')),
      h('h1', null,
        h(SplitText, { text: 'Pick a song.' }),
        h('br'),
        h('mark', null, h(SplitText, { text: 'Stay a while.', start: 13 }))
      ),
      h('p', { className: 'mx-lede' },
        'Choose a track or paste any YouTube link. It plays right here on the page, so you do not need a second tab.')
    );

    var crt = h('div', { className: 'mx-crt' },
      h('div', { className: 'mx-screen' },
        h('div', { className: 'mx-yt', ref: holder }),
        h('div', { className: 'mx-shield', onClick: togglePlay, role: 'button', tabIndex: -1, 'aria-label': playing ? 'Pause' : 'Play' }),
        h('div', { className: 'mx-static', key: 'st-' + currentId }),
        h('div', { className: 'mx-scan' }),
        h('div', { className: 'mx-osd' },
          h('span', { className: 'mx-osd-l' + (status === 'paused' ? ' blink' : '') }, osd),
          h('span', { className: 'mx-osd-r' }, 'CH ' + chNum + '  ' + (live ? 'LIVE' : fmt(cur)))
        ),
        !ready && h('div', { className: 'mx-boot' }, 'WARMING UP THE TUBES...')
      ),
      h('div', { className: 'mx-crt-foot' },
        h('span', { className: 'mx-power' + (playing ? ' on' : '') }),
        h('span', { className: 'mx-brandplate' }, 'AKP-2026 / STEREO'),
        h('span', { className: 'mx-knobs', 'aria-hidden': 'true' }, h('i'), h('i'))
      )
    );

    var controls = h('div', { className: 'mx-controls' },
      h('div', { className: 'mx-btnrow' },
        h('button', { className: 'mx-btn', type: 'button', onClick: function () { stepRef.current(-1); }, 'aria-label': 'Previous track' }, h(Icon, { d: ICON.prev })),
        h('button', { className: 'mx-btn main', type: 'button', onClick: togglePlay, 'aria-label': playing ? 'Pause' : 'Play' }, h(Icon, { d: playing ? ICON.pause : ICON.play }), playing ? 'PAUSE' : 'PLAY'),
        h('button', { className: 'mx-btn', type: 'button', onClick: function () { stepRef.current(1); }, 'aria-label': 'Next track' }, h(Icon, { d: ICON.next })),
        h('button', { className: 'mx-btn', type: 'button', 'aria-pressed': shuffle, onClick: function () { setShuffle(!shuffle); } },
          h('span', { className: 'mx-dot' }), 'SHUFFLE')
      ),
      h('div', { className: 'mx-seekrow' },
        h('span', { className: 'mx-time' }, fmt(cur)),
        h('input', {
          className: 'mx-range', type: 'range', min: 0, max: dur > 0 ? Math.floor(dur) : 1, step: 1,
          value: dur > 0 ? Math.floor(cur) : 0, disabled: !(dur > 0), onChange: onSeek,
          style: { '--p': pct + '%' }, 'aria-label': 'Seek'
        }),
        h('span', { className: 'mx-time' }, live ? 'LIVE' : fmt(dur))
      ),
      h('div', { className: 'mx-volrow' },
        h('button', { className: 'mx-mini', type: 'button', onClick: toggleMute, 'aria-pressed': muted }, muted ? 'MUTED' : 'VOL'),
        h('input', {
          className: 'mx-range', type: 'range', min: 0, max: 100, step: 1, value: muted ? 0 : vol,
          onChange: onVolume, style: { '--p': (muted ? 0 : vol) + '%' }, 'aria-label': 'Volume'
        }),
        h('span', { className: 'mx-time' }, (muted ? 0 : vol) + '%')
      )
    );

    var deck = h('div', { className: 'mx-panel mx-deck' },
      h('div', { className: 'mx-led', 'aria-hidden': 'true' }, h('span', { key: track.id }, marquee + marquee)),
      h('p', { className: 'mx-sr', 'aria-live': 'polite' }, playing ? 'Now playing ' + track.title + ' by ' + track.artist : ''),
      crt,
      controls,
      h(PixelEqualizer, { on: playing })
    );

    var vinyl = h('div', { className: 'mx-panel mx-vinyl-card' },
      h('div', { className: 'mx-turntable', 'aria-hidden': 'true' },
        h('div', { className: 'mx-record' + (playing ? ' spin' : '') },
          h('img', { className: 'mx-label', src: 'https://i.ytimg.com/vi/' + currentId + '/mqdefault.jpg', alt: '' }),
          h('i', { className: 'mx-spindle' })
        ),
        h('div', { className: 'mx-arm' + (playing ? ' on' : '') })
      ),
      h('div', { className: 'mx-np' },
        h('span', { className: 'eyebrow' }, playing ? 'NOW SPINNING' : 'ON THE DECK'),
        h('h2', null, track.title),
        h('p', null, track.artist)
      )
    );

    var list = h('div', { className: 'mx-list' },
      visible.length === 0
        ? h('p', { className: 'mx-empty' }, 'Nothing matches. Try another word or paste a link above.')
        : visible.map(function (t) {
            var d = display(t);
            var isCur = t.id === currentId;
            return h('div', { className: 'mx-row', key: t.id },
              h('button', {
                className: 'mx-track' + (isCur ? ' on' : ''), type: 'button',
                onClick: function () { play(t.id); }, onMouseMove: spotlight,
                'aria-label': 'Play ' + d.title + ' by ' + d.artist,
                'aria-current': isCur ? 'true' : undefined
              },
                h('img', { src: 'https://i.ytimg.com/vi/' + t.id + '/default.jpg', alt: '', loading: 'lazy', width: 48, height: 36 }),
                h('span', { className: 'mx-track-text' },
                  h('strong', null, d.title),
                  h('small', null, d.artist)
                ),
                isCur && playing
                  ? h('span', { className: 'nav-eq mx-now', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))
                  : h('span', { className: 'mx-tag' }, t.tag)
              ),
              t.custom && h('button', { className: 'mx-del', type: 'button', onClick: function () { removeCustom(t.id); }, 'aria-label': 'Remove ' + d.title }, '\u00D7')
            );
          })
    );

    var playlist = h('div', { className: 'mx-panel mx-playlist' },
      h('h2', { className: 'mx-h2' }, h(ShinyText, null, 'Tracklist')),
      h('form', { className: 'mx-add', onSubmit: addLink },
        h('input', {
          type: 'text', value: link, placeholder: 'Paste a YouTube link...', 'aria-label': 'YouTube link',
          onChange: function (e) { setLink(e.target.value); }, autoComplete: 'off', spellCheck: false
        }),
        h('button', { className: 'mx-btn main', type: 'submit' }, 'ADD + PLAY')
      ),
      h('p', { className: 'mx-msg', role: 'status' }, msg),
      h('div', { className: 'mx-chips', role: 'group', 'aria-label': 'Filter by mood' },
        tags.map(function (t) {
          return h('button', { key: t, className: 'mx-chip', type: 'button', 'aria-pressed': filter === t, onClick: function () { setFilter(t); } }, t);
        })
      ),
      h('input', {
        className: 'mx-search', type: 'search', value: query, placeholder: 'Search the tracklist...', 'aria-label': 'Search tracks',
        onChange: function (e) { setQuery(e.target.value); }
      }),
      list
    );

    return h('div', { className: 'mx-wrap' },
      hero,
      h('div', { className: 'mx-grid' },
        deck,
        h('div', { className: 'mx-side' }, vinyl, playlist)
      )
    );
  }

  var root = ReactDOM.createRoot(document.getElementById('music-app'));
  root.render(h(App));
})();
