import App from "./App.svelte";

const backendAddress =
  window.location.search.replace("?backend=", "") || "localhost:17246";

const app = new App({
  target: document.body,
  props: { backendAddress },
});

export default app;
