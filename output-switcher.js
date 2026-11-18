// Output Switcher: un botón en la barra de reproducción para elegir por dónde suena Spotify
// (altavoces, auriculares, pantalla…) sin entrar en Ajustes
(function outputSwitcher() {
  const P = Spicetify?.Platform;
  if (!P?.ExclusiveModeAPI?.setSelectedAudioOutputDevice || !P?.AudioOutputDevicesAPI?.getDevices || !Spicetify.Playbar?.Button) {
    // La opción de salida es nueva en Spotify: en versiones que no la tienen, la extensión no hace nada
    if (!outputSwitcher.tries || outputSwitcher.tries < 100) {
      outputSwitcher.tries = (outputSwitcher.tries || 0) + 1;
      setTimeout(outputSwitcher, 300);
    }
    return;
  }
  const exclusive = P.ExclusiveModeAPI;
  const outputs = P.AudioOutputDevicesAPI;
  // Spotify usa un identificador vacío para "la salida predeterminada del sistema"
  const SYSTEM_DEFAULT = "";

  const ICONS = {
    headphones: `<path d="M8 1.5A6.5 6.5 0 0 0 1.5 8v4.25A2.25 2.25 0 0 0 3.75 14.5h.5A1.75 1.75 0 0 0 6 12.75v-2.5A1.75 1.75 0 0 0 4.25 8.5H3V8a5 5 0 0 1 10 0v.5h-1.25A1.75 1.75 0 0 0 10 10.25v2.5c0 .97.78 1.75 1.75 1.75h.5a2.25 2.25 0 0 0 2.25-2.25V8A6.5 6.5 0 0 0 8 1.5zM3 10h1.25a.25.25 0 0 1 .25.25v2.5a.25.25 0 0 1-.25.25h-.5a.75.75 0 0 1-.75-.75V10zm10 0v2.25a.75.75 0 0 1-.75.75h-.5a.25.25 0 0 1-.25-.25v-2.5a.25.25 0 0 1 .25-.25H13z"/>`,
    speakers: `<path d="M4 1.5A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V3A1.5 1.5 0 0 0 12 1.5H4zM4 3h8v10H4V3zm4 1.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM8 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"/>`,
    display: `<path d="M1 3a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 15 3v7a1.5 1.5 0 0 1-1.5 1.5H8.75V13h2.75v1.5h-7V13h2.75v-1.5H2.5A1.5 1.5 0 0 1 1 10V3zm1.5 0v7h11V3h-11z"/>`,
    system: `<path d="M2.5 2A1.5 1.5 0 0 0 1 3.5v6A1.5 1.5 0 0 0 2.5 11H7v1.5H4.5V14h7v-1.5H9V11h4.5A1.5 1.5 0 0 0 15 9.5v-6A1.5 1.5 0 0 0 13.5 2h-11zm0 1.5h11v6h-11v-6z"/>`,
    check: `<path d="M13.985 2.383 5.127 12.754 1.388 8.375l-.658.77 4.397 5.149 9.618-11.262z"/>`,
  };
  // Los iconos de Spotify llenan todo su cuadro de 16 px: cada dibujo se encuadra para ocupar lo mismo
  const FRAME = { headphones: "1.5 1.5 13 13", speakers: "1.5 1.5 13 13", display: "1 1 14 14", system: "1 1 14 14", check: "0 0 16 16" };
  const svg = (name, size = 16) => `<svg width="${size}" height="${size}" viewBox="${FRAME[name]}" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`;
  const kindOf = (device) => {
    if (!device) return "system";
    if (/headphone|headset|earphone/i.test(device.terminalType) || /bluetooth/i.test(device.transportType)) return "headphones";
    if (/display|hdmi/i.test(device.terminalType + device.transportType)) return "display";
    return "speakers";
  };

  const style = document.createElement("style");
  style.textContent = `
    /* Spicetify deja el icono en línea con el texto y queda 2 px más arriba que los de Spotify: se centra igual que ellos */
    button[aria-label^="Audio output"] { display: inline-flex !important; align-items: center; justify-content: center; }
    button[aria-label^="Audio output"] > span { display: flex !important; }
    button[aria-label^="Audio output"] svg { display: block; }
    .os-menu {
      position: fixed;
      z-index: 9999;
      min-width: 260px;
      max-width: 340px;
      padding: 6px;
      border-radius: 12px;
      background: var(--spice-card, #242424);
      color: var(--spice-text, #fff);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      font-family: var(--encore-body-font-stack, inherit);
      animation: os-in 0.16s ease-out;
    }
    @keyframes os-in { from { opacity: 0; transform: translateY(6px); } }
    .os-menu h2 {
      margin: 6px 10px 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.6;
    }
    .os-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 9px 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
    }
    .os-item:hover, .os-item:focus-visible { background: rgba(255, 255, 255, 0.1); outline: none; }
    .os-item[aria-checked="true"] { color: var(--spice-button, #1ed760); }
    .os-item > svg:first-child { flex: none; opacity: 0.85; }
    .os-item span { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .os-item small { display: block; font-size: 12px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; }
    .os-item .os-check { flex: none; visibility: hidden; }
    .os-item[aria-checked="true"] .os-check { visibility: visible; }
    @media (prefers-reduced-motion: reduce) { .os-menu { animation: none; } }
  `;
  document.head.append(style);

  let devices = [];
  let selected = SYSTEM_DEFAULT;
  let menu = null;

  async function refresh() {
    try {
      devices = (await outputs.getDevices()) ?? [];
      selected = (await exclusive.getSelectedAudioOutputDevice()) ?? SYSTEM_DEFAULT;
    } catch {
      return;
    }
    const current = devices.find((d) => d.id === selected);
    const label = current ? `Audio output: ${current.fullName ?? current.name}` : "Audio output: system default";
    button.label = label;
    button.icon = svg(kindOf(current));
    button.element?.setAttribute("aria-label", label);
  }

  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    document.removeEventListener("pointerdown", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
    button.active = false;
  }

  const onOutside = (event) => {
    if (!menu?.contains(event.target) && !button.element?.contains(event.target)) closeMenu();
  };
  const onKey = (event) => {
    if (!menu) return;
    const items = [...menu.querySelectorAll(".os-item")];
    const at = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      button.element?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
      items[next]?.focus();
    }
  };

  async function choose(id) {
    closeMenu();
    try {
      await exclusive.setSelectedAudioOutputDevice(id, true);
    } catch {
      Spicetify.showNotification?.("Spotify couldn't switch to that output.", true);
    }
    await refresh();
    const now = devices.find((d) => d.id === selected);
    Spicetify.showNotification?.(`Playing on ${now ? now.fullName ?? now.name : "the system default output"}`);
  }

  async function openMenu() {
    await refresh();
    closeMenu();
    menu = document.createElement("div");
    menu.className = "os-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Audio output");
    const title = document.createElement("h2");
    title.textContent = "Play audio on";
    menu.append(title);
    const systemDevice = devices.find((d) => d.isDefaultDevice);
    const entries = [{ id: SYSTEM_DEFAULT, name: "System default", detail: systemDevice ? systemDevice.fullName ?? systemDevice.name : "", kind: "system" }, ...devices.map((d) => ({ id: d.id, name: d.name, detail: d.fullName && d.fullName !== d.name ? d.fullName : "", kind: kindOf(d) }))];
    for (const entry of entries) {
      const item = document.createElement("button");
      item.className = "os-item";
      item.type = "button";
      item.setAttribute("role", "menuitemradio");
      item.setAttribute("aria-checked", String(entry.id === selected));
      item.innerHTML = `${svg(entry.kind)}<span></span>${svg("check")}`;
      item.lastElementChild.classList.add("os-check");
      const text = item.querySelector("span");
      text.textContent = entry.name;
      if (entry.detail) {
        const small = document.createElement("small");
        small.textContent = entry.detail;
        text.append(small);
      }
      item.addEventListener("click", () => choose(entry.id));
      menu.append(item);
    }
    document.body.append(menu);
    // Encima del botón, sin salirse de la ventana
    const anchor = button.element?.getBoundingClientRect();
    if (anchor) {
      const box = menu.getBoundingClientRect();
      const left = Math.min(window.innerWidth - box.width - 8, Math.max(8, anchor.left + anchor.width / 2 - box.width / 2));
      menu.style.left = `${left}px`;
      menu.style.top = `${Math.max(8, anchor.top - box.height - 10)}px`;
    }
    button.active = true;
    document.addEventListener("pointerdown", onOutside, true);
    document.addEventListener("keydown", onKey, true);
    (menu.querySelector('[aria-checked="true"]') ?? menu.querySelector(".os-item"))?.focus();
  }

  const button = new Spicetify.Playbar.Button("Audio output", svg("system"), () => (menu ? closeMenu() : openMenu()), false, false);
  button.register();
  button.element?.setAttribute("aria-haspopup", "menu");

  // Si cambias la salida en Ajustes o conectas unos auriculares, el icono se actualiza solo
  for (const api of [exclusive, outputs]) {
    try {
      const events = api.getEvents?.();
      events?.addListener?.("*", refresh);
      for (const name of ["audio_output_device_changed", "devices_changed", "device_list_changed", "exclusive_mode_changed"]) events?.addListener?.(name, refresh);
    } catch {}
  }
  setInterval(() => {
    if (!document.hidden && !menu) refresh();
  }, 5000);
  refresh();
})();
