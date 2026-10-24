(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const navigation = document.querySelector('#navigation');
  const menuButton = document.querySelector('.menu-button');
  function closeMenu() {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    navigation.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) navigation.querySelector('a').focus();
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.querySelector('.contact-link').addEventListener('click', closeMenu);
  document.querySelector('.brand').addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) { closeMenu(); menuButton.focus(); }
  });
  matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);

  const ingredients = {
    espresso: { label: 'Эспрессо', color: '#653b25' },
    water: { label: 'Вода', color: '#bad7dc' },
    milk: { label: 'Молоко', color: '#e4c9a1' },
    foam: { label: 'Пена', color: '#fffdf4' },
    cocoa: { label: 'Какао', color: '#9e6440' }
  };
  const orders = [
    { name: 'Американо', steps: ['espresso', 'water'], caption: 'Чистый кофейный характер. Первый стакан готов.' },
    { name: 'Латте', steps: ['espresso', 'milk', 'foam'], caption: 'Кофе, молоко, мягкая пена. Второй стакан готов.' },
    { name: 'Какао', steps: ['cocoa', 'milk', 'foam'], caption: 'Уютный финал. Все три стакана готовы.' }
  ];
  let orderIndex = 0;
  let stepIndex = 0;
  let completed = 0;
  let orderComplete = false;
  const ingredientControls = document.querySelector('#ingredient-controls');
  const ingredientButtons = [...ingredientControls.querySelectorAll('button')];
  const recipeSteps = document.querySelector('#recipe-steps');
  const gameFeedback = document.querySelector('#game-feedback');
  const cup = document.querySelector('#mixing-cup');
  const cupLayers = document.querySelector('#drink-layers');
  const nextDrink = document.querySelector('#next-drink');
  const gameWin = document.querySelector('#game-win');
  const cupCaption = document.querySelector('#cup-caption');
  const cupLabel = document.querySelector('#cup-label');
  let layerAnimations = [];

  function clearLayerAnimations() {
    for (const animation of layerAnimations) animation.cancel();
    layerAnimations = [];
  }
  function renderRecipe() {
    const order = orders[orderIndex];
    document.querySelector('#order-number').textContent = `Стакан ${orderIndex + 1} / 3`;
    document.querySelector('#drink-name').textContent = order.name;
    recipeSteps.innerHTML = order.steps.map((id, index) => `<li class="${index < stepIndex ? 'is-done' : index === stepIndex ? 'is-next' : ''}"${index === stepIndex ? ' aria-current="step"' : ''}>${ingredients[id].label}</li>`).join('');
    document.querySelector('#drinks-done').textContent = completed;
    document.querySelectorAll('.order-progress span').forEach((item, index) => item.classList.toggle('is-done', index < completed));
    for (const button of ingredientButtons) button.setAttribute('aria-disabled', String(orderComplete));
  }
  function beginOrder(announce = true) {
    clearLayerAnimations();
    stepIndex = 0; orderComplete = false;
    cupLayers.replaceChildren();
    cup.setAttribute('aria-label', `Пустой игровой стакан для напитка «${orders[orderIndex].name}»`);
    cupLabel.textContent = 'Стакан ждёт первый ингредиент';
    cupCaption.textContent = 'Никакой спешки. Рецепт всегда перед вами.';
    nextDrink.hidden = true; gameWin.hidden = true;
    renderRecipe();
    if (announce) gameFeedback.textContent = `Готовим ${orders[orderIndex].name.toLowerCase()}. Сначала — ${ingredients[orders[orderIndex].steps[0]].label.toLowerCase()}.`;
  }
  function addLayer(id) {
    const order = orders[orderIndex];
    const height = 225 / order.steps.length;
    const y = 390 - height * (stepIndex + 1);
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'drink-layer');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '90'); rect.setAttribute('y', String(y)); rect.setAttribute('width', '240'); rect.setAttribute('height', String(height + 1)); rect.setAttribute('fill', ingredients[id].color);
    group.append(rect);
    if (id === 'foam') {
      const bubbles = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bubbles.setAttribute('d', `M130 ${y+24}h5m30 20h5m40-13h5m35 26h5m20-32h5`);
      bubbles.setAttribute('stroke', '#c6ad8d'); bubbles.setAttribute('stroke-width', '5'); bubbles.setAttribute('stroke-linecap', 'round');
      group.append(bubbles);
    }
    cupLayers.append(group);
    if (!reducedMotion.matches && group.animate) {
      const animation = group.animate([{opacity:.35,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}], {duration:300,easing:'ease-out'});
      layerAnimations.push(animation);
    }
  }
  ingredientControls.addEventListener('click', event => {
    const button = event.target.closest('[data-ingredient]');
    if (!button || orderComplete) return;
    const id = button.dataset.ingredient;
    const order = orders[orderIndex];
    const expected = order.steps[stepIndex];
    if (id !== expected) {
      gameFeedback.textContent = `${ingredients[id].label} пока подождёт. Сейчас нужен следующий ингредиент: ${ingredients[expected].label.toLowerCase()}.`;
      if (!reducedMotion.matches && button.animate) button.animate([{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}], {duration:180,easing:'ease-out'});
      return;
    }
    addLayer(id);
    stepIndex++;
    cup.setAttribute('aria-label', `${order.name}: добавлены ${order.steps.slice(0,stepIndex).map(item => ingredients[item].label.toLowerCase()).join(', ')}. ${stepIndex} из ${order.steps.length} ингредиентов.`);
    cupLabel.textContent = `${order.name} · ${stepIndex} из ${order.steps.length} ингредиентов`;
    if (stepIndex === order.steps.length) {
      orderComplete = true; completed++;
      cupCaption.textContent = order.caption;
      if (completed === orders.length) {
        gameFeedback.textContent = 'Три из трёх! Американо, латте и какао готовы. Вы прошли кофейную смену.';
        gameWin.hidden = false;
      } else {
        gameFeedback.textContent = `${order.name} готов! Можно переходить к следующему стакану.`;
        nextDrink.hidden = false;
      }
    } else {
      gameFeedback.textContent = `Готово: ${ingredients[id].label.toLowerCase()}. Теперь добавьте ${ingredients[order.steps[stepIndex]].label.toLowerCase()}.`;
    }
    renderRecipe();
    refreshScroll();
  });
  nextDrink.addEventListener('click', () => {
    if (!orderComplete || orderIndex >= orders.length - 1) return;
    orderIndex++; beginOrder();
    ingredientButtons[0].focus({preventScroll: true});
    document.querySelector('#recipe-ticket').scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
    refreshScroll();
  });
  document.querySelector('#game-restart').addEventListener('click', () => {
    orderIndex = 0; completed = 0; beginOrder();
    gameFeedback.textContent = 'Новая кофейная смена. Начните с эспрессо для американо.';
    refreshScroll();
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) clearLayerAnimations(); });
  beginOrder(false);

  const contactForm = document.querySelector('#contact-form');
  const formFields = document.querySelector('#form-fields');
  const formSuccess = document.querySelector('#form-success');
  const contactInputs = [...contactForm.querySelectorAll('input,select')];
  function fieldError(input) {
    const value = input.value.trim();
    if (input.id === 'contact-name') {
      if (value.length < 2 || value.length > 60) return 'Введите имя длиной от 2 до 60 символов.';
      if (!/^[\p{L}][\p{L}\p{M} .’'–-]*$/u.test(value) || value.replace(/[^\p{L}]/gu,'').length < 2) return 'Используйте в имени буквы, пробелы или дефис.';
    }
    if (input.id === 'contact-phone') {
      const digits = value.replace(/\D/g,'');
      if (!/^\+?[\d()\s-]+$/.test(value) || !/^[78]\d{10}$/.test(digits)) return 'Введите 11 цифр российского номера, начиная с 7 или 8.';
      if (/^[78]0{10}$/.test(digits)) return 'Проверьте номер: после кода страны не могут быть только нули.';
    }
    if (input.id === 'contact-topic' && !['menu','visit','question'].includes(value)) return 'Выберите тему разговора.';
    return '';
  }
  function validateField(input) {
    const error = fieldError(input);
    input.setAttribute('aria-invalid', String(Boolean(error)));
    document.querySelector(`#${input.id}-error`).textContent = error;
    return error;
  }
  for (const input of contactInputs) {
    input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('change', () => { if (input.hasAttribute('aria-invalid')) validateField(input); });
  }
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    let firstInvalid = null;
    for (const input of contactInputs) if (validateField(input) && !firstInvalid) firstInvalid = input;
    if (firstInvalid) { firstInvalid.focus(); refreshScroll(); return; }
    contactForm.reset();
    for (const input of contactInputs) { input.removeAttribute('aria-invalid'); document.querySelector(`#${input.id}-error`).textContent = ''; }
    formFields.hidden = true; formSuccess.hidden = false;
    formSuccess.focus({preventScroll:true});
    formSuccess.scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
    refreshScroll();
  });
  document.querySelector('#form-again').addEventListener('click', () => {
    formFields.hidden = false; formSuccess.hidden = true;
    document.querySelector('#contact-name').focus({preventScroll:true});
    contactForm.scrollIntoView({block:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
    refreshScroll();
  });
  document.querySelector('#form-submit').disabled = false;
  window.addEventListener('pagehide', () => contactForm.reset());

  const pointerScenes = [];
  function addPointerScene(surface, layers) {
    const state = { surface, layers, visible:false, rect:null, x:0, y:0, tx:0, ty:0, frame:0, lastTime:0 };
    pointerScenes.push(state);
    function render() {
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        layer.el.style.transform = `translate3d(${state.x*layer.move}px,${state.y*layer.move}px,0) rotate(${layer.base + state.x*layer.turn}deg)`;
      }
    }
    function tick(time) {
      state.frame = 0;
      const dt = state.lastTime ? Math.min(64,time-state.lastTime) : 16;
      state.lastTime = time;
      const ease = 1-Math.pow(.82,dt/16);
      state.x += (state.tx-state.x)*ease; state.y += (state.ty-state.y)*ease;
      if (Math.abs(state.tx-state.x)<.002 && Math.abs(state.ty-state.y)<.002) {
        state.x = state.tx; state.y = state.ty; state.lastTime = 0;
        for (let i = 0; i < layers.length; i++) layers[i].el.style.removeProperty('will-change');
      } else state.frame = requestAnimationFrame(tick);
      render();
    }
    function start() {
      if (!state.frame) {
        for (let i = 0; i < layers.length; i++) layers[i].el.style.willChange = 'transform';
        state.frame = requestAnimationFrame(tick);
      }
    }
    state.stop = () => {
      cancelAnimationFrame(state.frame); state.frame = 0; state.lastTime = 0;
      state.x = state.y = state.tx = state.ty = 0;
      for (let i = 0; i < layers.length; i++) { layers[i].el.style.removeProperty('transform'); layers[i].el.style.removeProperty('will-change'); }
    };
    surface.addEventListener('pointerenter', () => { state.rect = null; }, {passive:true});
    surface.addEventListener('pointermove', event => {
      if (!finePointer.matches || reducedMotion.matches || !state.visible || document.hidden || event.pointerType === 'touch') return;
      if (!state.rect) state.rect = surface.getBoundingClientRect();
      state.tx = Math.max(-1,Math.min(1,(event.clientX-state.rect.left)/state.rect.width*2-1));
      state.ty = Math.max(-1,Math.min(1,(event.clientY-state.rect.top)/state.rect.height*2-1));
      start();
    }, {passive:true});
    surface.addEventListener('pointerleave', () => { state.rect = null; if (state.frame || state.x || state.y) { state.tx = state.ty = 0; start(); } }, {passive:true});
  }
  addPointerScene(document.querySelector('.hero'), [
    {el:document.querySelector('.hero-picture'),move:12,turn:3.5,base:0},
    {el:document.querySelector('.coffee-stamp'),move:-15,turn:-12,base:-13},
    {el:document.querySelector('.hero-bean'),move:-24,turn:22,base:13}
  ]);
  addPointerScene(document.querySelector('.cup-stage'), [{el:cup,move:11,turn:5,base:0}]);
  const sceneObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = pointerScenes.find(item => item.surface === entry.target);
      scene.visible = entry.isIntersecting;
      if (!scene.visible) scene.stop();
    }
  });
  for (const scene of pointerScenes) sceneObserver.observe(scene.surface);
  function stopPointerScenes() { for (const scene of pointerScenes) { scene.rect = null; scene.stop(); } }
  reducedMotion.addEventListener('change', stopPointerScenes);
  finePointer.addEventListener('change', stopPointerScenes);
  window.addEventListener('resize', stopPointerScenes, {passive:true});
  document.addEventListener('visibilitychange', stopPointerScenes);
  window.addEventListener('scroll', () => { for (const scene of pointerScenes) scene.rect = null; }, {passive:true});

  function refreshScroll() { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }
  if (window.gsap && window.ScrollTrigger) {
    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add({wide:'(min-width: 681px)',small:'(max-width: 680px)',reduce:'(prefers-reduced-motion: reduce)'}, context => {
      if (context.conditions.reduce) return;
      const wide = context.conditions.wide;
      gsap.to('.hero-scroll-layer', {y:wide?70:35,rotation:wide?-5:-3,ease:'none',scrollTrigger:{trigger:'.hero-scene',start:'clamp(top 25%)',end:'bottom top',scrub:.6}});
      gsap.fromTo('.ribbon-track', {x:wide?160:40}, {x:wide?-180:-200,ease:'none',scrollTrigger:{trigger:'.coffee-ribbon',start:'top bottom',end:'bottom top',scrub:.5}});
      gsap.to('.ribbon-track svg', {rotation:180,ease:'none',scrollTrigger:{trigger:'.coffee-ribbon',start:'top bottom',end:'bottom top',scrub:.5}});
      const route = document.querySelector('.coffee-route');
      const length = route.getTotalLength();
      gsap.fromTo(route, {strokeDasharray:length,strokeDashoffset:length}, {strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.ritual-layout',start:'top 90%',end:'center 45%',scrub:.6}});
      gsap.fromTo('.ritual-cup', {y:35,rotation:-8,svgOrigin:'365 208'}, {y:-15,rotation:8,svgOrigin:'365 208',ease:'none',scrollTrigger:{trigger:'.ritual-layout',start:'top bottom',end:'bottom top',scrub:.65}});
      gsap.fromTo('.recipe-ticket', {rotation:-4,y:22}, {rotation:0,y:0,ease:'none',scrollTrigger:{trigger:'.order-desk',start:'top 95%',end:'top 40%',scrub:.5}});
      gsap.fromTo('.wayfinding-floor', {x:-25,rotation:-13}, {x:12,rotation:-3,ease:'none',scrollTrigger:{trigger:'.wayfinding',start:'top bottom',end:'bottom 20%',scrub:.65}});
      gsap.to('.floor-arrow', {rotation:90,ease:'none',scrollTrigger:{trigger:'.wayfinding',start:'top bottom',end:'bottom top',scrub:.45}});
      document.querySelectorAll('.scroll-arrow').forEach(arrow => {
        if (arrow.closest('[hidden]') || arrow.closest('dialog')) return;
        gsap.fromTo(arrow, {rotation:0}, {rotation:360,ease:'none',scrollTrigger:{trigger:arrow.closest('section')||arrow.parentElement,start:'clamp(top bottom)',end:'clamp(bottom top)',scrub:.45}});
      });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshScroll);
    window.addEventListener('load', refreshScroll, {once:true});
  }

  const demoDialog = document.querySelector('#demo-dialog');
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => demoDialog.showModal()));
  demoDialog.querySelector('.dialog-close').addEventListener('click', () => demoDialog.close());
  demoDialog.addEventListener('click', event => {
    if (event.target !== demoDialog) return;
    const rect = demoDialog.getBoundingClientRect();
    if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) demoDialog.close();
  });
})();
