import "./app.pcss";
import App from "./App.svelte";

let mounted = false;

function mount() {
  if (mounted) return;
  mounted = true;
  new App({
    target: document.getElementById("app"),
  });
}

try {
  WebFont.load({
    google: {
      families: ['Rubik']
    },
    active: function () {
      setTimeout(mount, 100)
    },
    inactive: mount,
  });
} catch (e) {
  console.warn('WebFont unavailable, mounting without it', e)
  mount()
}

// safety net: if neither callback fires (blocked CDN, slow font), mount anyway
setTimeout(mount, 3000)

// export default app;
