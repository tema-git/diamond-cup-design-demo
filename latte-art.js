(() => {
  'use strict';
  const section = document.querySelector('#latte-art');
  if (!section) return;
  const canvas = section.querySelector('#latte-drawing');
  const strokesLayer = section.querySelector('#latte-strokes');
  const guide = section.querySelector('#latte-guide');
  const guideButton = section.querySelector('#latte-guide-toggle');
  const undoButton = section.querySelector('#latte-undo');
  const clearButton = section.querySelector('#latte-clear');
  const finishButton = section.querySelector('#latte-finish');
  const finishLabel = section.querySelector('#latte-finish-label');
  const finishIcon = section.querySelector('#latte-finish-icon');
  const status = section.querySelector('#latte-status');
  const seal = section.querySelector('#latte-result-seal');
  const cursor = section.querySelector('#latte-draw-cursor');
  const brushButtons = [...section.querySelectorAll('[data-latte-brush]')];
  const svgNS = 'http://www.w3.org/2000/svg';
  const maximumStrokes = 80;
  const maximumPoints = 15000;
  const diffusionDuration = 1450;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const developingStrokes = new Set();
  const strokes = [];
  let brush = 12;
  let activeStroke = null;
  let activePointer = null;
  let pointsCount = 0;
  let paintFrame = 0;
  let lastPaintTime = 0;
  let milkInView = true;
  let bounds = null;
  let finished = false;
  let finishedAt = 0;
  let pouring = false;
  let guideVisible = false;
  let cursorX = 200;
  let cursorY = 200;

  function updateControls() {
    const empty = strokes.length === 0;
    undoButton.disabled = empty || finished;
    clearButton.disabled = empty || finished;
    finishButton.disabled = empty;
    guideButton.disabled = finished;
    for (const button of brushButtons) button.disabled = finished;
  }
  function announce(message) { status.textContent = message; }
  function positionCursor() {
    cursor.setAttribute('transform', `translate(${cursorX.toFixed(2)} ${cursorY.toFixed(2)})`);
    cursor.classList.toggle('is-pouring', pouring);
    cursor.querySelector('.latte-cursor-ring').setAttribute('r', String(brush / 2 + 5));
  }
  // The drawing stays vector based. Only recently poured milk develops; no
  // permanent fluid loop or offscreen simulation runs once the wake has settled.
  function developSamples(stroke, now, settled = false) {
    return stroke.samples.map((point, index, samples) => {
      const before = samples[Math.max(0, index - 1)];
      const after = samples[Math.min(samples.length - 1, index + 1)];
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      const length = Math.hypot(dx, dy);
      const tx = length > .01 ? dx / length : 1;
      const ty = length > .01 ? dy / length : 0;
      const age = settled || reducedMotion.matches ? 1 : Math.min(1, Math.max(0, (now - point.time) / diffusionDuration));
      const spread = 1 - Math.pow(1 - age, 3);
      const phase = stroke.phase + point.distance * .055;
      // Unequal sides and a small downstream drift make milk mingle with crema
      // instead of drawing a constant-width white marker line.
      const drift = Math.sin(phase) * stroke.width * .16 * spread;
      return {
        x: point.x - ty * drift - tx * spread * .7,
        y: point.y + tx * drift - ty * spread * .7,
        nx: -ty, ny: tx, tx, ty,
        radius: point.radius * (1 + spread * .45),
        distance: point.distance,
        spread,
        phase
      };
    });
  }
  function milkRibbon(stroke, samples, layer) {
    const left = [];
    const right = [];
    const radii = [];
    const number = value => value.toFixed(2);
    for (const point of samples) {
      const taper = stroke.settled && stroke.distance > stroke.width * 3
        ? .48 + .52 * Math.min(1, (stroke.distance - point.distance) / (stroke.width * 2.2))
        : 1;
      const uneven = 1 + Math.sin(point.phase * 1.7) * .14 + Math.sin(point.distance * .23 + stroke.phase) * .055;
      const radius = Math.max(.15, point.radius * layer.scale * taper * uneven);
      const displacement = layer.name === 'foam' ? Math.sin(point.phase * .8) * radius * .6 : 0;
      const leftScale = 1 + Math.sin(point.phase) * .17;
      const rightScale = 1 - Math.sin(point.phase * 1.3 + .8) * .16;
      left.push({ x: point.x + point.nx * (radius * leftScale + displacement), y: point.y + point.ny * (radius * leftScale + displacement) });
      right.push({ x: point.x - point.nx * (radius * rightScale - displacement), y: point.y - point.ny * (radius * rightScale - displacement) });
      radii.push(radius);
    }
    function edge(points, move) {
      let path = `${move}${number(points[0].x)} ${number(points[0].y)}`;
      for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const point = points[index];
        path += `Q${number(previous.x)} ${number(previous.y)} ${number((previous.x + point.x) / 2)} ${number((previous.y + point.y) / 2)}`;
      }
      const last = points[points.length - 1];
      return `${path}L${number(last.x)} ${number(last.y)}`;
    }
    const last = samples.length - 1;
    const endRadius = number(radii[last]);
    const startRadius = number(radii[0]);
    return `${edge(left, 'M')}A${endRadius} ${endRadius} 0 0 0 ${number(right[last].x)} ${number(right[last].y)}${edge(right.reverse(), 'L')}A${startRadius} ${startRadius} 0 0 0 ${number(left[0].x)} ${number(left[0].y)}Z`;
  }
  function milkEddies(stroke, samples) {
    let curls = '';
    let veins = '';
    let lastDistance = -stroke.width * 2;
    let curlIndex = 0;
    const number = value => value.toFixed(2);
    for (const point of samples) {
      if (point.distance - lastDistance < 14 + stroke.width * 1.15 || point.distance < 4) continue;
      lastDistance = point.distance;
      const side = curlIndex++ % 2 ? -1 : 1;
      const radius = point.radius * (.75 + point.spread * .7);
      const tail = Math.min(27, 8 + stroke.width * .75) * (.55 + point.spread * .45);
      const offset = (forward, outward) => `${number(point.x + point.tx * forward + point.nx * outward * side)} ${number(point.y + point.ty * forward + point.ny * outward * side)}`;
      // A broad, curved tongue of milk folds back into the coffee. The narrow
      // caramel seam gives the swirl depth without outlining the user's stroke.
      curls += `M${offset(3, radius * .25)}C${offset(-tail * .2, radius * 1.1)} ${offset(-tail * .9, radius * 2.5)} ${offset(-tail * 1.3, radius * 1.3)}C${offset(-tail * 1.6, radius * .35)} ${offset(-tail * .65, radius * .18)} ${offset(-tail * .8, radius * .85)}C${offset(-tail * .5, radius * .45)} ${offset(-tail * .15, radius * .35)} ${offset(3, radius * .25)}Z`;
      veins += `M${offset(-tail * .15, radius * .83)}C${offset(-tail * .65, radius * 1.8)} ${offset(-tail * 1.25, radius * 1.85)} ${offset(-tail * 1.13, radius * .95)}`;
    }
    return { curls, veins };
  }
  function flushPath(stroke = activeStroke, now = performance.now(), settled = false) {
    if (!stroke) return;
    const samples = developSamples(stroke, now, settled);
    for (const layer of stroke.layers) layer.node.setAttribute('d', milkRibbon(stroke, samples, layer));
    const eddies = milkEddies(stroke, samples);
    stroke.curls.setAttribute('d', eddies.curls);
    stroke.veins.setAttribute('d', eddies.veins);
  }
  function paintMilk(now) {
    paintFrame = 0;
    // A short 24 fps settling pass is enough for slow liquid diffusion. Pointer
    // input still lands immediately, and only the last few strokes are animated.
    if (now - lastPaintTime >= 1000 / 24) {
      lastPaintTime = now;
      for (const stroke of developingStrokes) {
        flushPath(stroke, now);
        if (reducedMotion.matches || now - stroke.lastPour >= diffusionDuration) developingStrokes.delete(stroke);
      }
    }
    if (developingStrokes.size && !document.hidden && milkInView) paintFrame = requestAnimationFrame(paintMilk);
    else strokesLayer.setAttribute('data-milk-state', 'settled');
  }
  function schedulePaint() {
    if (document.hidden || !milkInView || reducedMotion.matches) {
      flushPath(activeStroke, performance.now(), true);
      settleMilk();
      return;
    }
    if (activeStroke) {
      developingStrokes.add(activeStroke);
      // Keep a long drawing session bounded even when the user draws many tiny
      // disconnected marks in quick succession.
      while (developingStrokes.size > 4) {
        const oldest = developingStrokes.values().next().value;
        flushPath(oldest, performance.now(), true);
        developingStrokes.delete(oldest);
      }
    }
    if (!paintFrame && developingStrokes.size) {
      strokesLayer.setAttribute('data-milk-state', 'settling');
      paintFrame = requestAnimationFrame(paintMilk);
    }
  }
  function settleMilk() {
    if (paintFrame) cancelAnimationFrame(paintFrame);
    paintFrame = 0;
    for (const stroke of developingStrokes) flushPath(stroke, performance.now(), true);
    developingStrokes.clear();
    strokesLayer.setAttribute('data-milk-state', 'settled');
  }
  function endStroke() {
    if (activeStroke) {
      activeStroke.settled = true;
      flushPath();
      schedulePaint();
    }
    activeStroke = null;
    updateControls();
  }
  function endInput() {
    const pointer = activePointer;
    activePointer = null;
    pouring = false;
    endStroke();
    if (pointer !== null && canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    positionCursor();
  }
  function constrainPoint(x, y) {
    const dx = x - 200;
    const dy = y - 200;
    const radius = 198 - brush / 2;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      x = 200 + dx / distance * radius;
      y = 200 + dy / distance * radius;
    }
    return { x, y };
  }
  function pointerPoint(event) {
    if (!bounds) bounds = canvas.getBoundingClientRect();
    return constrainPoint((event.clientX - bounds.left) / bounds.width * 400, (event.clientY - bounds.top) / bounds.height * 400);
  }
  function beginStroke(x, y) {
    if (finished) return false;
    if (strokes.length >= maximumStrokes || pointsCount >= maximumPoints) {
      announce('В чашке уже много молочной пены. Нажмите «Готово» или отмените часть штрихов.');
      return false;
    }
    const node = document.createElementNS(svgNS, 'g');
    node.setAttribute('class', 'latte-milk-stroke');
    const layers = [
      { name: 'diffusion', scale: 2.9 },
      { name: 'wake', scale: 2.15 },
      { name: 'blend', scale: 1.52 },
      { name: 'body', scale: 1 },
      { name: 'foam', scale: .43 }
    ].map(layer => {
      const part = document.createElementNS(svgNS, 'path');
      part.setAttribute('class', `latte-milk-path latte-milk-${layer.name}`);
      node.append(part);
      return { node: part, name: layer.name, scale: layer.scale };
    });
    const curls = document.createElementNS(svgNS, 'path');
    curls.setAttribute('class', 'latte-milk-path latte-milk-curls');
    const veins = document.createElementNS(svgNS, 'path');
    veins.setAttribute('class', 'latte-milk-veins');
    node.insertBefore(curls, layers[3].node);
    node.append(veins);
    strokesLayer.append(node);
    const now = performance.now();
    activeStroke = {
      node, layers, curls, veins,
      samples: [{ x, y, radius: brush * .7, distance: 0, time: now }],
      width: brush, distance: 0, points: 1, x, y, settled: false,
      lastPour: now, phase: strokes.length * 1.79
    };
    strokes.push(activeStroke);
    pointsCount++;
    flushPath();
    schedulePaint();
    updateControls();
    return true;
  }
  function extendStroke(x, y) {
    if (!activeStroke) return;
    if (Math.hypot(x - activeStroke.x, y - activeStroke.y) < 1.8) return;
    if (pointsCount >= maximumPoints || activeStroke.points >= 1000) {
      endInput();
      announce('Штрих завершён. Можно добавить ещё один или нажать «Готово».');
      return;
    }
    const now = performance.now();
    const distance = Math.hypot(x - activeStroke.x, y - activeStroke.y);
    const speed = distance / Math.max(8, now - activeStroke.lastPour);
    activeStroke.distance += distance;
    const flow = 1.08 - Math.min(.35, speed * .13) + Math.sin(activeStroke.distance / 19) * .13 + Math.sin(x * .065 + y * .045) * .065;
    activeStroke.samples.push({ x, y, radius: activeStroke.width * .65 * flow, distance: activeStroke.distance, time: now });
    activeStroke.lastPour = now;
    activeStroke.points++;
    activeStroke.x = x;
    activeStroke.y = y;
    pointsCount++;
    schedulePaint();
  }
  function finishDrawing() {
    endInput();
    settleMilk();
    if (!strokes.length) {
      announce('Сначала проведите по кофе, чтобы появился ваш узор.');
      return;
    }
    finished = true;
    finishedAt = performance.now();
    canvas.setAttribute('data-finished', 'true');
    canvas.setAttribute('aria-label', 'Ваш готовый рисунок на капучино');
    guide.toggleAttribute('hidden', true);
    seal.hidden = false;
    finishLabel.textContent = 'Нарисовать ещё';
    finishIcon.setAttribute('d', 'M20 7v5h-5M19 12a7 7 0 1 0-2 5');
    announce('Ваш авторский капучино готов. Узор остался в чашке — можно полюбоваться им или нарисовать новый.');
    updateControls();
  }
  function resetDrawing(focusCanvas) {
    endInput();
    settleMilk();
    strokesLayer.replaceChildren();
    strokes.length = 0;
    pointsCount = 0;
    finished = false;
    cursorX = cursorY = 200;
    canvas.setAttribute('data-finished', 'false');
    canvas.setAttribute('aria-label', 'Чашка для рисования молочной пеной');
    seal.hidden = true;
    guide.toggleAttribute('hidden', !guideVisible);
    finishLabel.textContent = 'Готово';
    finishIcon.setAttribute('d', 'm5 12 4 4L19 6');
    announce('Чистая чашка. Нарисуйте новый узор молочной пеной.');
    updateControls();
    positionCursor();
    if (focusCanvas) canvas.focus({ preventScroll: true });
  }
  canvas.addEventListener('pointerdown', event => {
    if (finished || activePointer !== null || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    endInput();
    bounds = canvas.getBoundingClientRect();
    const point = pointerPoint(event);
    cursorX = point.x;
    cursorY = point.y;
    canvas.setAttribute('data-input', 'pointer');
    canvas.focus({ preventScroll: true });
    if (!beginStroke(point.x, point.y)) return;
    activePointer = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    announce('Рисуйте в своём ритме. Когда узор будет готов, нажмите «Готово».');
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== activePointer || !activeStroke || finished) return;
    const point = pointerPoint(event);
    cursorX = point.x;
    cursorY = point.y;
    extendStroke(point.x, point.y);
  });
  function stopPointer(event) {
    if (event.pointerId === activePointer) endInput();
  }
  canvas.addEventListener('pointerup', stopPointer);
  canvas.addEventListener('pointercancel', stopPointer);
  canvas.addEventListener('lostpointercapture', stopPointer);
  canvas.addEventListener('keydown', event => {
    if (activePointer !== null) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar', 'Enter', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' && event.repeat) return;
    canvas.setAttribute('data-input', 'keyboard');
    if (finished) {
      if (event.key === 'Enter' && performance.now() - finishedAt >= 350) resetDrawing(true);
      return;
    }
    if (event.key === 'Enter') { finishDrawing(); return; }
    if (event.key === 'Escape') {
      pouring = false;
      endStroke();
      positionCursor();
      announce('Молочная линия выключена. Перемещайте кисть стрелками; пробел снова включит рисование.');
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      if (event.repeat) return;
      pouring = !pouring;
      if (pouring && !beginStroke(cursorX, cursorY)) {
        pouring = false;
        positionCursor();
        return;
      }
      if (!pouring) endStroke();
      positionCursor();
      if (pouring) announce('Молочная линия включена. Рисуйте стрелками. Пробел завершит штрих, Enter — весь рисунок.');
      else if (activeStroke === null) announce('Молочная линия выключена. Перемещайте кисть стрелками без рисования.');
      return;
    }
    const step = event.shiftKey ? 16 : 6;
    let x = cursorX;
    let y = cursorY;
    if (event.key === 'ArrowLeft') x -= step;
    if (event.key === 'ArrowRight') x += step;
    if (event.key === 'ArrowUp') y -= step;
    if (event.key === 'ArrowDown') y += step;
    const point = constrainPoint(x, y);
    cursorX = point.x;
    cursorY = point.y;
    if (pouring) extendStroke(cursorX, cursorY);
    positionCursor();
  });
  canvas.addEventListener('blur', endInput);
  function pauseInput() {
    endInput();
    settleMilk();
  }
  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      milkInView = entries[0].isIntersecting;
      if (!milkInView) pauseInput();
    });
    visibility.observe(canvas);
  }
  window.addEventListener('blur', pauseInput);
  window.addEventListener('pagehide', pauseInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseInput(); });
  window.addEventListener('resize', () => { bounds = null; }, { passive: true });
  window.addEventListener('scroll', () => { bounds = null; }, { passive: true });
  for (const button of brushButtons) button.addEventListener('click', () => {
    if (finished) return;
    endInput();
    brush = Number(button.dataset.latteBrush);
    for (const other of brushButtons) other.setAttribute('aria-pressed', String(other === button));
    positionCursor();
  });
  guideButton.addEventListener('click', () => {
    if (finished) return;
    guideVisible = !guideVisible;
    guide.toggleAttribute('hidden', !guideVisible);
    guideButton.setAttribute('aria-pressed', String(guideVisible));
    announce(guideVisible ? 'Пунктир показывает контур сердца. Обведите его молочной линией или придумайте свой узор.' : 'Контур скрыт. В чашке остался только ваш рисунок.');
  });
  undoButton.addEventListener('click', () => {
    if (finished) return;
    endInput();
    const removed = strokes.pop();
    if (!removed) return;
    developingStrokes.delete(removed);
    removed.node.remove();
    pointsCount -= removed.points;
    updateControls();
    announce(strokes.length ? 'Последний штрих убран. Можно продолжать рисунок.' : 'Чашка снова чистая. Нарисуйте первый штрих.');
  });
  clearButton.addEventListener('click', () => { if (!finished) resetDrawing(false); });
  finishButton.addEventListener('click', () => {
    if (finished && performance.now() - finishedAt < 350) return;
    if (finished) resetDrawing(true);
    else finishDrawing();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) settleMilk();
  });
  // One shared filter composites all pours at the size of the cup. Keeping the
  // filter on this single bounded layer avoids one costly blur surface per mark.
  const blendFilter = canvas.querySelector('#latte-milk-blend');
  if (blendFilter) {
    blendFilter.querySelector('feTurbulence')?.setAttribute('baseFrequency', '.035 .052');
    blendFilter.querySelector('feDisplacementMap')?.setAttribute('scale', '3.3');
    blendFilter.querySelector('feGaussianBlur')?.setAttribute('stdDeviation', '.55');
  }
  strokesLayer.setAttribute('data-milk-state', 'settled');
  positionCursor();
  updateControls();
})();
