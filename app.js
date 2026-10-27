(() => {
  'use strict';
  let scrollRefreshFrame = 0;
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
      if (button.animate) button.animate([{opacity:1},{opacity:.45},{opacity:1}], {duration:180,easing:'ease-out'});
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

  const menuData = window.DIAMOND_MENU;
  const menuPanel = document.querySelector('#menu-panel');
  const menuSearch = document.querySelector('#drink-search');
  const clearSearch = document.querySelector('#clear-search');
  let touchedMenuRow = null;
  function clearMenuTouch() {
    if (touchedMenuRow) touchedMenuRow.classList.remove('touch-highlight');
    touchedMenuRow = null;
  }
  menuPanel.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    clearMenuTouch();
    touchedMenuRow = event.target.closest('.drink-row');
    if (touchedMenuRow) touchedMenuRow.classList.add('touch-highlight');
  }, {passive:true});
  window.addEventListener('pointerup', clearMenuTouch, {passive:true});
  window.addEventListener('pointercancel', clearMenuTouch, {passive:true});
  const categoryTabs = [...document.querySelectorAll('[data-category]')];
  const originalMenu = document.querySelector('#menu-original');
  let activeCategory = 'coffee';
  const menuFiles = {coffee:'coffee', tea:'tea', cold:'cold'};
  const normalize = value => value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[–—-]/g,' ');
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  function renderMenu() {
    if (!menuData) return;
    clearMenuTouch();
    const query = normalize(menuSearch.value.trim());
    const terms = query.split(/\s+/).filter(Boolean);
    const categories = query ? menuData.categories : menuData.categories.filter(category => category.id === activeCategory);
    let count = 0;
    const groups = [];
    for (const category of categories) {
      for (const section of category.sections) {
        const items = section.items.filter(item => {
          const haystack = normalize([item.name,item.description || '',item.note || ''].join(' '));
          return terms.every(term => haystack.includes(term));
        });
        if (!items.length) continue;
        count += items.length;
        const title = query ? `${category.id === 'coffee' ? 'Кофе' : category.id === 'tea' ? 'Не кофе' : 'Холодное'} · ${section.title}` : section.title;
        const sizes = section.sizes;
        const rows = items.map(item => {
          const prices = sizes.map(size => {
            const price = item.prices[size];
            return price === undefined ? `<span class="drink-price unavailable"><span class="visually-hidden">Размер ${size} отсутствует</span><span aria-hidden="true">—</span></span>` : `<span class="drink-price${sizes.length === 1 ? ' single-price' : ''}">${sizes.length === 1 ? `<small class="price-size">${size}</small>` : `<span class="visually-hidden">Размер ${size}: </span>`}<span>${price}<span class="price-unit" aria-hidden="true"> ₽</span><span class="visually-hidden"> рублей</span></span></span>`;
          }).join('');
          return `<div class="drink-row"><div class="drink-main"><p class="drink-name">${escape(item.name)}${item.isNew ? '<span class="new-badge">Новинка</span>' : ''}</p><div class="drink-prices">${prices}</div></div>${item.note ? `<p class="drink-note">${escape(item.note)}</p>` : ''}${item.description ? `<p class="drink-description">${escape(item.description)}</p>` : ''}</div>`;
        }).join('');
        groups.push(`<section class="menu-group" aria-label="${escape(title)}"><div class="menu-group-header"><h3>${escape(title)}</h3><div class="menu-sizes${sizes.length === 1 ? ' single-size' : ''}" aria-hidden="true">${sizes.map(size => `<span>${size}</span>`).join('')}</div></div><div class="drink-list">${rows}</div></section>`);
      }
    }
    menuPanel.innerHTML = groups.join('');
    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'menu-empty';
      const title = document.createElement('h3'); title.textContent = 'Пока не нашли такой напиток';
      const copy = document.createElement('p'); copy.textContent = 'Попробуйте другое название или вернитесь к полному меню.';
      const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Показать меню';
      reset.addEventListener('click', () => { menuSearch.value = ''; renderMenu(); menuSearch.focus({preventScroll:true}); });
      empty.append(title,copy,reset); menuPanel.append(empty);
    }
    clearSearch.hidden = !query;
    originalMenu.hidden = Boolean(query);
    const category = menuData.categories.find(category => category.id === activeCategory);
    document.querySelector('#menu-status').textContent = `${query ? 'Поиск по всему меню' : category.label} · позиций: ${count}`;
    if (query) {menuPanel.removeAttribute('aria-labelledby');menuPanel.setAttribute('aria-label','Результаты поиска по всему меню');}
    else {menuPanel.removeAttribute('aria-label');menuPanel.setAttribute('aria-labelledby', `tab-${activeCategory}`);}
    originalMenu.href = `assets/menu/${menuFiles[activeCategory]}-october-2026.png`;
    originalMenu.setAttribute('aria-label', `Открыть оригинал: ${category.label.toLowerCase()}`);
    refreshScroll();
  }
  function setCategory(tab) {
    activeCategory = tab.dataset.category;
    menuSearch.value = '';
    for (const item of categoryTabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    }
    renderMenu();
  }
  for (const [index,tab] of categoryTabs.entries()) {
    tab.addEventListener('click', () => setCategory(tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % categoryTabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + categoryTabs.length) % categoryTabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = categoryTabs.length - 1;
      else return;
      event.preventDefault(); setCategory(categoryTabs[next]); categoryTabs[next].focus({preventScroll:true});
    });
  }
  menuSearch.addEventListener('input', renderMenu);
  clearSearch.addEventListener('click', () => { menuSearch.value = ''; renderMenu(); menuSearch.focus({preventScroll:true}); });
  renderMenu();

  // Pointer motion belongs to decorative layers; text and controls never move.
  function setupSectionMotion(selectors) {
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const scenes = selectors.map(selector => document.querySelector(selector)).filter(Boolean).map(surface => ({surface,x:0,y:0,tx:0,ty:0,frame:0,time:0,rect:null,visible:false}));
    let windowFocused = document.hasFocus();
    const allowed = () => fine.matches && !reducedMotion.matches && !document.hidden && windowFocused;
    function syncPlayback() {
      document.documentElement.classList.toggle('motion-paused', document.hidden || !windowFocused);
    }
    function paint(scene) {
      scene.surface.style.setProperty('--pointer-x',scene.x.toFixed(4));
      scene.surface.style.setProperty('--pointer-y',scene.y.toFixed(4));
    }
    function stop(scene) {
      cancelAnimationFrame(scene.frame); scene.frame=0; scene.time=0;
      scene.x=scene.y=scene.tx=scene.ty=0; scene.rect=null;
      scene.surface.classList.remove('pointer-active','touch-active'); paint(scene);
    }
    function tick(scene,time) {
      scene.frame=0;
      if(!allowed() || !scene.visible) { stop(scene); return; }
      const delta=scene.time?Math.min(3,(time-scene.time)/16.67):1; scene.time=time;
      const ease=1-Math.pow(.78,delta);
      scene.x+=(scene.tx-scene.x)*ease; scene.y+=(scene.ty-scene.y)*ease;
      if(Math.abs(scene.tx-scene.x)+Math.abs(scene.ty-scene.y)<.002) {
        scene.x=scene.tx; scene.y=scene.ty; scene.time=0;
      } else scene.frame=requestAnimationFrame(time=>tick(scene,time));
      paint(scene);
    }
    function schedule(scene) { if(!scene.frame && allowed() && scene.visible) scene.frame=requestAnimationFrame(time=>tick(scene,time)); }
    function move(scene,event) {
      if(!allowed() || !scene.visible || event.pointerType==='touch') return;
      if(!scene.rect) scene.rect=scene.surface.getBoundingClientRect();
      scene.tx=Math.max(-1,Math.min(1,(event.clientX-scene.rect.left)/scene.rect.width*2-1));
      scene.ty=Math.max(-1,Math.min(1,(event.clientY-scene.rect.top)/scene.rect.height*2-1));
      scene.surface.classList.add('pointer-active'); schedule(scene);
    }
    for(const scene of scenes) {
      scene.surface.classList.add('pointer-scene');
      scene.surface.addEventListener('pointerenter',event=>{scene.rect=null;move(scene,event);},{passive:true});
      scene.surface.addEventListener('pointermove',event=>move(scene,event),{passive:true});
      scene.surface.addEventListener('pointerleave',()=>{scene.rect=null;scene.tx=scene.ty=0;scene.surface.classList.remove('pointer-active');schedule(scene);},{passive:true});
      scene.surface.addEventListener('pointercancel',()=>stop(scene),{passive:true});
      scene.surface.addEventListener('focusin',()=>scene.surface.classList.add('focus-active'));
      scene.surface.addEventListener('focusout',event=>{if(!scene.surface.contains(event.relatedTarget))scene.surface.classList.remove('focus-active');});
      scene.surface.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')scene.surface.classList.add('touch-active');},{passive:true});
      scene.surface.addEventListener('pointerup',()=>scene.surface.classList.remove('touch-active'),{passive:true});
    }
    if(window.IntersectionObserver) {
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        const scene=scenes.find(item=>item.surface===entry.target);
        scene.visible=entry.isIntersecting;
        scene.surface.classList.toggle('is-in-view', scene.visible);
        if(!scene.visible)stop(scene);
      }));
      scenes.forEach(scene=>observer.observe(scene.surface));
    } else scenes.forEach(scene=>{scene.visible=true;scene.surface.classList.add('is-in-view');});
    const reset=()=>{scenes.forEach(stop);clearMenuTouch();syncPlayback();};
    window.addEventListener('scroll',()=>scenes.forEach(scene=>scene.rect=null),{passive:true});
    window.addEventListener('resize',reset,{passive:true});
    window.addEventListener('blur',()=>{windowFocused=false;reset();});
    window.addEventListener('focus',()=>{windowFocused=true;syncPlayback();});
    window.addEventListener('pagehide',()=>{windowFocused=false;reset();});
    window.addEventListener('pageshow',()=>{windowFocused=document.hasFocus();syncPlayback();});
    document.addEventListener('visibilitychange',reset);
    reducedMotion.addEventListener('change',reset); fine.addEventListener('change',reset);
    syncPlayback();
  }
  setupSectionMotion(['.hero','.hero-scene','.coffee-ribbon','.menu-section','.menu-heading','.pause-section','.ritual-illustration','.barista-section','.cup-stage','.latte-section','.visit-section','.wayfinding','.contact-section','.contact-copy']);

  // Two identical tracks make a continuous loop; stop it when it cannot be seen.
  const ribbon=document.querySelector('.coffee-ribbon');
  let ribbonVisible=false, ribbonFocused=true;
  function syncRibbon() {
    const running=ribbonVisible && ribbonFocused && !document.hidden && !reducedMotion.matches;
    ribbon.classList.toggle('is-running',running);
  }
  if(window.IntersectionObserver) new IntersectionObserver(entries=>{ribbonVisible=entries[0].isIntersecting;syncRibbon();}).observe(ribbon);
  else {ribbonVisible=true;syncRibbon();}
  document.addEventListener('visibilitychange',syncRibbon);
  reducedMotion.addEventListener('change',syncRibbon);
  window.addEventListener('blur',()=>{ribbonFocused=false;syncRibbon();});
  window.addEventListener('focus',()=>{ribbonFocused=true;syncRibbon();});
  window.addEventListener('pagehide',()=>ribbon.classList.remove('is-running'));
  window.addEventListener('pageshow',syncRibbon);
  syncRibbon();

  function refreshScroll() {
    if (!window.ScrollTrigger || scrollRefreshFrame) return;
    scrollRefreshFrame = requestAnimationFrame(() => {
      scrollRefreshFrame = 0;
      const scrollTrigger = window.ScrollTrigger;
      // These unpinned scenes can be measured at the current scroll position.
      // A global refresh scrolls to zero during measurement and can jump on iOS.
      scrollTrigger.update();
      for (const instance of scrollTrigger.getAll()) instance.refresh();
      scrollTrigger.update();
    });
  }
  window.addEventListener('pagehide', () => { cancelAnimationFrame(scrollRefreshFrame); scrollRefreshFrame = 0; });
  window.addEventListener('pageshow', refreshScroll);
  if (window.gsap && window.ScrollTrigger) {
    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add({wide:'(min-width: 681px)',small:'(max-width: 680px)',reduce:'(prefers-reduced-motion: reduce)'}, context => {
      if (context.conditions.reduce) return;
      const wide = context.conditions.wide;
      gsap.to('.hero-scroll-layer', {y:wide?70:35,rotation:wide?-5:-3,ease:'none',scrollTrigger:{trigger:'.hero-scene',start:'clamp(top 25%)',end:'bottom top',scrub:.6}});
      const route = document.querySelector('.coffee-route');
      const length = route.getTotalLength();
      gsap.fromTo(route, {strokeDasharray:length,strokeDashoffset:length}, {strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.ritual-layout',start:'top 90%',end:'center 45%',scrub:.6}});
      gsap.fromTo('.ritual-cup', {y:35,rotation:-8,svgOrigin:'365 208'}, {y:-15,rotation:8,svgOrigin:'365 208',ease:'none',scrollTrigger:{trigger:'.ritual-layout',start:'top bottom',end:'bottom top',scrub:.65}});
      gsap.fromTo('.recipe-ticket', {rotation:-4,y:22}, {rotation:0,y:0,ease:'none',scrollTrigger:{trigger:'.order-desk',start:'top 95%',end:'top 40%',scrub:.5}});
      gsap.fromTo('.menu-decoration', {'--scroll-turn':'-18deg'}, {'--scroll-turn':'22deg',ease:'none',scrollTrigger:{trigger:'.menu-heading',start:'top bottom',end:'bottom top',scrub:.7}});
      gsap.fromTo('.cup-stage', {'--stage-ring-scale':.84}, {'--stage-ring-scale':1.1,ease:'none',scrollTrigger:{trigger:'.barista-game',start:'top bottom',end:'bottom top',scrub:.8}});
      const contactCup = document.querySelector('.contact-steam-art > path');
      const contactLength = contactCup.getTotalLength();
      gsap.fromTo(contactCup, {strokeDasharray:contactLength,strokeDashoffset:contactLength}, {strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.contact-steam-art',start:'top 94%',end:'top 65%',scrub:.5}});
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
