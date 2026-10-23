/* React Bits "Target Cursor" for plain HTML: brackets lock onto interactive elements. */
(function () {
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SEL = '.cursor-target, a, button, input, textarea, .project, .skill-category-button';
  var tc = document.createElement('div'), dot = document.createElement('div');
  tc.className = 'tc'; dot.className = 'tc-dot';
  tc.innerHTML = '<div class="tc-ring"><i></i><i></i><i></i><i></i></div>';
  tc.style.setProperty('--w', '28px'); tc.style.setProperty('--h', '28px');
  document.body.append(tc, dot);
  document.body.classList.add('has-tc');
  var mx = innerWidth / 2, my = innerHeight / 2, target = null;
  function place() {
    var x = mx, y = my, w = 28, h = 28;
    if (target && document.contains(target)) {
      var r = target.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + r.height / 2; w = r.width + 10; h = r.height + 10;
    } else target = null;
    tc.classList.toggle('locked', !!target);
    tc.style.setProperty('--w', w + 'px'); tc.style.setProperty('--h', h + 'px');
    tc.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    tc.style.transition = target ? 'transform .15s ease' : 'transform .08s linear';
  }
  addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    target = e.target.closest ? e.target.closest(SEL) : null;
    place();
  });
  addEventListener('scroll', function () { if (target) place(); }, { passive: true });
  place();
})();
