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
  const strokes = [];
  let brush = 12;
  let activeStroke = null;
  let activePointer = null;
  let pointsCount = 0;
  let paintFrame = 0;
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
  function flushPath() {
    if (!activeStroke) return;
    for (const layer of activeStroke.layers) {
      layer.node.setAttribute('d', milkRibbon(activeStroke, layer.scale));
    }
  }
  function milkRibbon(stroke, scale) {
    const samples = stroke.samples;
    const left = [];
    const right = [];
    const radii = [];
    const number = value => value.toFixed(2);
    for (let index = 0; index < samples.length; index++) {
      const point = samples[index];
      const before = samples[Math.max(0, index - 1)];
      const after = samples[Math.min(samples.length - 1, index + 1)];
      let dx = after.x - before.x;
      let dy = after.y - before.y;
      if (Math.hypot(dx, dy) < .01) {
        dx = after.x - point.x || point.x - before.x;
        dy = after.y - point.y || point.y - before.y;
      }
      const length = Math.hypot(dx, dy) || 1;
      const taper = stroke.settled && stroke.distance > stroke.width * 3
        ? .62 + .38 * Math.min(1, (stroke.distance - point.distance) / (stroke.width * 1.8))
        : 1;
      const radius = point.radius * scale * taper;
      const nx = samples.length === 1 ? 1 : -dy / length;
      const ny = samples.length === 1 ? 0 : dx / length;
      left.push({ x: point.x + nx * radius, y: point.y + ny * radius });
      right.push({ x: point.x - nx * radius, y: point.y - ny * radius });
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
  function schedulePaint() {
    if (paintFrame) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = 0;
      flushPath();
    });
  }
  function endStroke() {
    if (activeStroke) activeStroke.settled = true;
    flushPath();
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
      { name: 'diffusion', scale: 1.9 },
      { name: 'body', scale: 1.12 },
      { name: 'foam', scale: .66 }
    ].map(layer => {
      const part = document.createElementNS(svgNS, 'path');
      part.setAttribute('class', `latte-milk-path latte-milk-${layer.name}`);
      node.append(part);
      return { node: part, scale: layer.scale };
    });
    strokesLayer.append(node);
    activeStroke = { node, layers, samples: [{ x, y, radius: brush * .56, distance: 0 }], width: brush, distance: 0, points: 1, x, y, settled: false };
    strokes.push(activeStroke);
    pointsCount++;
    flushPath();
    updateControls();
    return true;
  }
  function extendStroke(x, y) {
    if (!activeStroke) return;
    if (Math.hypot(x - activeStroke.x, y - activeStroke.y) < 1.2) return;
    if (pointsCount >= maximumPoints || activeStroke.points >= 2200) {
      endInput();
      announce('Штрих завершён. Можно добавить ещё один или нажать «Готово».');
      return;
    }
    activeStroke.distance += Math.hypot(x - activeStroke.x, y - activeStroke.y);
    const flow = .89 + Math.sin(activeStroke.distance / 19) * .1 + Math.sin(x * .065 + y * .045) * .055;
    activeStroke.samples.push({ x, y, radius: activeStroke.width * .5 * flow, distance: activeStroke.distance });
    activeStroke.points++;
    activeStroke.x = x;
    activeStroke.y = y;
    pointsCount++;
    schedulePaint();
  }
  function finishDrawing() {
    endInput();
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
    if (paintFrame) cancelAnimationFrame(paintFrame);
    paintFrame = 0;
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
  positionCursor();
  updateControls();
})();
