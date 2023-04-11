export namespace Webdggrid {
  export function load() {
      return import('./webdggrid.js').then(mod => mod.Webdggrid.load());
  }
}