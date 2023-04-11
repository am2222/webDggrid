export var Webdggrid;
(function (Webdggrid) {
    function load() {
        return import('./webdggrid.js').then(mod => mod.Webdggrid.load());
    }
    Webdggrid.load = load;
})(Webdggrid || (Webdggrid = {}));
//# sourceMappingURL=index.js.map