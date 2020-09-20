
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.25.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var ui = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getHightlightString = exports.LineType = exports.getHightlightPositions = exports.processDateTime = exports.ProcessDateTimeWhich = exports.initializeDateTime = exports.getStep = void 0;
    function getStep(decimalPlaceCount) {
        let i = 0;
        let r = "0.";
        while (i++ < decimalPlaceCount) {
            if (i >= decimalPlaceCount) {
                return r + "1";
            }
            r = r + "0";
        }
        return "1";
    }
    exports.getStep = getStep;
    function initializeDateTime(control) {
        const indexOfT = control.value.indexOf('T');
        const date = control.date ?
            control.date :
            indexOfT > -1 ?
                control.value.substring(0, indexOfT) :
                "";
        const time = control.time ?
            control.time :
            indexOfT > -1 ?
                control.value.substring(indexOfT + 1) :
                "";
        return { value: (date && time) ? date + 'T' + time : '', date, time };
    }
    exports.initializeDateTime = initializeDateTime;
    var ProcessDateTimeWhich;
    (function (ProcessDateTimeWhich) {
        ProcessDateTimeWhich["DATE"] = "DATE";
        ProcessDateTimeWhich["TIME"] = "TIME";
    })(ProcessDateTimeWhich = exports.ProcessDateTimeWhich || (exports.ProcessDateTimeWhich = {}));
    function processDateTime(control, which) {
        const indexOfT = control.value.indexOf('T');
        let date = control.value.substring(0, indexOfT);
        let time = control.value.substring(indexOfT + 1);
        if ((!date) || (which == ProcessDateTimeWhich.DATE)) {
            date = control.date || "";
        }
        if ((!time) || (which == ProcessDateTimeWhich.TIME)) {
            time = control.time || "";
        }
        return { value: (date && time) ? date + 'T' + time : '', date, time };
    }
    exports.processDateTime = processDateTime;
    function getHightlightPositions(params, bitOfSql) {
        function findAll(s, substring) {
            let lastPos = -1;
            let ret = [];
            while (!ret.some((r) => r === -1)) {
                lastPos = s.indexOf(substring, lastPos + 1);
                ret.push(lastPos);
            }
            return ret
                .filter((r) => r !== -1)
                .filter((r) => {
                return (((r == 0) || (!bitOfSql[r - 1].match(/[a-z0-9_]/))) &&
                    ((r + substring.length >= bitOfSql.length) || (!bitOfSql[r + substring.length].match(/[a-z0-9_]/))));
            })
                .map((r) => {
                return { begin: r, end: substring.length + r };
            });
        }
        return (params || []).filter((p) => p !== undefined).reduce((acc, param) => {
            return acc.concat(findAll(bitOfSql, "" + param));
        }, []);
    }
    exports.getHightlightPositions = getHightlightPositions;
    var LineType;
    (function (LineType) {
        LineType["Field"] = "Field";
        LineType["String"] = "String";
    })(LineType = exports.LineType || (exports.LineType = {}));
    function getHightlightString(highlightPositions, bitOfSql) {
        const sorted = highlightPositions.concat([]).sort((hpa, hpb) => hpa.begin - hpb.begin);
        let begin = 0;
        const r = [];
        sorted.forEach((hp) => {
            if (begin > hp.begin) {
                return;
            }
            r.push({ type: LineType.String, value: bitOfSql.substring(begin, hp.begin) });
            r.push({ type: LineType.Field, value: bitOfSql.substring(hp.begin, hp.end) });
            begin = hp.end;
        });
        r.push({ type: LineType.String, value: bitOfSql.substring(begin) });
        return r;
    }
    exports.getHightlightString = getHightlightString;
    });

    unwrapExports(ui);
    var ui_1 = ui.getHightlightString;
    var ui_2 = ui.LineType;
    var ui_3 = ui.getHightlightPositions;
    var ui_4 = ui.processDateTime;
    var ui_5 = ui.ProcessDateTimeWhich;
    var ui_6 = ui.initializeDateTime;
    var ui_7 = ui.getStep;

    /* src/Link.svelte generated by Svelte v3.25.1 */

    const file = "src/Link.svelte";

    function create_fragment(ctx) {
    	let a;
    	let t_value = /*link*/ ctx[0].text + "";
    	let t;
    	let a_href_value;
    	let a_class_value;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[0].href);
    			attr_dev(a, "class", a_class_value = /*link*/ ctx[0].class ? /*link*/ ctx[0].class : "");
    			add_location(a, file, 3, 0, 38);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*link*/ 1 && t_value !== (t_value = /*link*/ ctx[0].text + "")) set_data_dev(t, t_value);

    			if (dirty & /*link*/ 1 && a_href_value !== (a_href_value = /*link*/ ctx[0].href)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*link*/ 1 && a_class_value !== (a_class_value = /*link*/ ctx[0].class ? /*link*/ ctx[0].class : "")) {
    				attr_dev(a, "class", a_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Link", slots, []);
    	let { link } = $$props;
    	const writable_props = ["link"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("link" in $$props) $$invalidate(0, link = $$props.link);
    	};

    	$$self.$capture_state = () => ({ link });

    	$$self.$inject_state = $$props => {
    		if ("link" in $$props) $$invalidate(0, link = $$props.link);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [link];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { link: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*link*/ ctx[0] === undefined && !("link" in props)) {
    			console.warn("<Link> was created without expected prop 'link'");
    		}
    	}

    	get link() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set link(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /*
     * Generated by PEG.js 0.10.0.
     *
     * http://pegjs.org/
     */

    function peg$subclass(child, parent) {
      function ctor() { this.constructor = child; }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
    }

    function peg$SyntaxError(message, expected, found, location) {
      this.message  = message;
      this.expected = expected;
      this.found    = found;
      this.location = location;
      this.name     = "SyntaxError";

      if (typeof Error.captureStackTrace === "function") {
        Error.captureStackTrace(this, peg$SyntaxError);
      }
    }

    peg$subclass(peg$SyntaxError, Error);

    peg$SyntaxError.buildMessage = function(expected, found) {
      var DESCRIBE_EXPECTATION_FNS = {
            literal: function(expectation) {
              return "\"" + literalEscape(expectation.text) + "\"";
            },

            "class": function(expectation) {
              var escapedParts = "",
                  i;

              for (i = 0; i < expectation.parts.length; i++) {
                escapedParts += expectation.parts[i] instanceof Array
                  ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
                  : classEscape(expectation.parts[i]);
              }

              return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
            },

            any: function(expectation) {
              return "any character";
            },

            end: function(expectation) {
              return "end of input";
            },

            other: function(expectation) {
              return expectation.description;
            }
          };

      function hex(ch) {
        return ch.charCodeAt(0).toString(16).toUpperCase();
      }

      function literalEscape(s) {
        return s
          .replace(/\\/g, '\\\\')
          .replace(/"/g,  '\\"')
          .replace(/\0/g, '\\0')
          .replace(/\t/g, '\\t')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
      }

      function classEscape(s) {
        return s
          .replace(/\\/g, '\\\\')
          .replace(/\]/g, '\\]')
          .replace(/\^/g, '\\^')
          .replace(/-/g,  '\\-')
          .replace(/\0/g, '\\0')
          .replace(/\t/g, '\\t')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
      }

      function describeExpectation(expectation) {
        return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
      }

      function describeExpected(expected) {
        var descriptions = new Array(expected.length),
            i, j;

        for (i = 0; i < expected.length; i++) {
          descriptions[i] = describeExpectation(expected[i]);
        }

        descriptions.sort();

        if (descriptions.length > 0) {
          for (i = 1, j = 1; i < descriptions.length; i++) {
            if (descriptions[i - 1] !== descriptions[i]) {
              descriptions[j] = descriptions[i];
              j++;
            }
          }
          descriptions.length = j;
        }

        switch (descriptions.length) {
          case 1:
            return descriptions[0];

          case 2:
            return descriptions[0] + " or " + descriptions[1];

          default:
            return descriptions.slice(0, -1).join(", ")
              + ", or "
              + descriptions[descriptions.length - 1];
        }
      }

      function describeFound(found) {
        return found ? "\"" + literalEscape(found) + "\"" : "end of input";
      }

      return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
    };

    function peg$parse(input, options) {
      options = options !== void 0 ? options : {};

      var peg$FAILED = {},

          peg$startRuleFunctions = { Statement: peg$parseStatement },
          peg$startRuleFunction  = peg$parseStatement,

          peg$c0 = "{",
          peg$c1 = peg$literalExpectation("{", false),
          peg$c2 = "}",
          peg$c3 = peg$literalExpectation("}", false),
          peg$c4 = function(f, v) {return { function: (f && f.length) ? f : "noop", variable: v } },
          peg$c5 = " ",
          peg$c6 = peg$literalExpectation(" ", false),
          peg$c7 = function(v, vs) { return [v].concat(vs.map(([a, b]) => b)); },
          peg$c8 = function(f) { return f.reduce((acc, i) => acc + i, "") },
          peg$c9 = function(v) { return { type: "VARIABLE", function: "noop", variable: [v] } },
          peg$c10 = function(t) { return { type: "TEXT", text: t.reduce((acc, i) => acc + i, "") } },
          peg$c11 = "$$",
          peg$c12 = peg$literalExpectation("$$", false),
          peg$c13 = function() { return "$" },
          peg$c14 = "$",
          peg$c15 = peg$literalExpectation("$", false),
          peg$c16 = /^[^a-z{$]/,
          peg$c17 = peg$classExpectation([["a", "z"], "{", "$"], true, false),
          peg$c18 = function(x) { return "$" + x },
          peg$c19 = /^[a-z]/,
          peg$c20 = peg$classExpectation([["a", "z"]], false, false),
          peg$c21 = /^[a-z_]/,
          peg$c22 = peg$classExpectation([["a", "z"], "_"], false, false),
          peg$c23 = function(v, vs) { return v + vs.reduce((acc, i) => acc + i, "") },
          peg$c24 = /^[^$]/,
          peg$c25 = peg$classExpectation(["$"], true, false),

          peg$currPos          = 0,
          peg$posDetailsCache  = [{ line: 1, column: 1 }],
          peg$maxFailPos       = 0,
          peg$maxFailExpected  = [],
          peg$result;

      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
        }

        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }

      function peg$literalExpectation(text, ignoreCase) {
        return { type: "literal", text: text, ignoreCase: ignoreCase };
      }

      function peg$classExpectation(parts, inverted, ignoreCase) {
        return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
      }

      function peg$endExpectation() {
        return { type: "end" };
      }

      function peg$computePosDetails(pos) {
        var details = peg$posDetailsCache[pos], p;

        if (details) {
          return details;
        } else {
          p = pos - 1;
          while (!peg$posDetailsCache[p]) {
            p--;
          }

          details = peg$posDetailsCache[p];
          details = {
            line:   details.line,
            column: details.column
          };

          while (p < pos) {
            if (input.charCodeAt(p) === 10) {
              details.line++;
              details.column = 1;
            } else {
              details.column++;
            }

            p++;
          }

          peg$posDetailsCache[pos] = details;
          return details;
        }
      }

      function peg$computeLocation(startPos, endPos) {
        var startPosDetails = peg$computePosDetails(startPos),
            endPosDetails   = peg$computePosDetails(endPos);

        return {
          start: {
            offset: startPos,
            line:   startPosDetails.line,
            column: startPosDetails.column
          },
          end: {
            offset: endPos,
            line:   endPosDetails.line,
            column: endPosDetails.column
          }
        };
      }

      function peg$fail(expected) {
        if (peg$currPos < peg$maxFailPos) { return; }

        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }

        peg$maxFailExpected.push(expected);
      }

      function peg$buildStructuredError(expected, found, location) {
        return new peg$SyntaxError(
          peg$SyntaxError.buildMessage(expected, found),
          expected,
          found,
          location
        );
      }

      function peg$parseStatement() {
        var s0, s1;

        s0 = [];
        s1 = peg$parseComplexFunction();
        if (s1 === peg$FAILED) {
          s1 = peg$parseSimpleVariable();
          if (s1 === peg$FAILED) {
            s1 = peg$parseText();
          }
        }
        if (s1 !== peg$FAILED) {
          while (s1 !== peg$FAILED) {
            s0.push(s1);
            s1 = peg$parseComplexFunction();
            if (s1 === peg$FAILED) {
              s1 = peg$parseSimpleVariable();
              if (s1 === peg$FAILED) {
                s1 = peg$parseText();
              }
            }
          }
        } else {
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseComplexFunction() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parseDollar();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 123) {
            s2 = peg$c0;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            { peg$fail(peg$c1); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseFunctionCall();
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parseComplexVariable();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 125) {
                  s5 = peg$c2;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  { peg$fail(peg$c3); }
                }
                if (s5 !== peg$FAILED) {
                  s1 = peg$c4(s3, s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseComplexVariable() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parseValidVariableName();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 32) {
            s4 = peg$c5;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            { peg$fail(peg$c6); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseValidVariableName();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 32) {
              s4 = peg$c5;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              { peg$fail(peg$c6); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseValidVariableName();
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = peg$c7(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseFunctionCall() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parseFunction();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 32) {
            s2 = peg$c5;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            { peg$fail(peg$c6); }
          }
          if (s2 !== peg$FAILED) {
            s1 = peg$c8(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseSimpleVariable() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parseDollar();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseValidVariableName();
          if (s2 !== peg$FAILED) {
            s1 = peg$c9(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseText() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parseErrorDollar();
        if (s2 === peg$FAILED) {
          s2 = peg$parseEscapedDollar();
          if (s2 === peg$FAILED) {
            s2 = peg$parseNotDollar();
          }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parseErrorDollar();
            if (s2 === peg$FAILED) {
              s2 = peg$parseEscapedDollar();
              if (s2 === peg$FAILED) {
                s2 = peg$parseNotDollar();
              }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s1 = peg$c10(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parseEscapedDollar() {
        var s0, s1;

        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c11) {
          s1 = peg$c11;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          { peg$fail(peg$c12); }
        }
        if (s1 !== peg$FAILED) {
          s1 = peg$c13();
        }
        s0 = s1;

        return s0;
      }

      function peg$parseErrorDollar() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 36) {
          s1 = peg$c14;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          { peg$fail(peg$c15); }
        }
        if (s1 !== peg$FAILED) {
          if (peg$c16.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            s1 = peg$c18(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseFunction() {
        var s0, s1;

        s0 = [];
        if (peg$c19.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          { peg$fail(peg$c20); }
        }
        if (s1 !== peg$FAILED) {
          while (s1 !== peg$FAILED) {
            s0.push(s1);
            if (peg$c19.test(input.charAt(peg$currPos))) {
              s1 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              { peg$fail(peg$c20); }
            }
          }
        } else {
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseValidVariableName() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (peg$c19.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          { peg$fail(peg$c20); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (peg$c21.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            { peg$fail(peg$c22); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c21.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              { peg$fail(peg$c22); }
            }
          }
          if (s2 !== peg$FAILED) {
            s1 = peg$c23(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }

        return s0;
      }

      function peg$parseNotDollar() {
        var s0;

        if (peg$c24.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          { peg$fail(peg$c25); }
        }

        return s0;
      }

      function peg$parseDollar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 36) {
          s0 = peg$c14;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          { peg$fail(peg$c15); }
        }

        return s0;
      }

      peg$result = peg$startRuleFunction();

      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail(peg$endExpectation());
        }

        throw peg$buildStructuredError(
          peg$maxFailExpected,
          peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
          peg$maxFailPos < input.length
            ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
            : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
        );
      }
    }

    var parser = {
      SyntaxError: peg$SyntaxError,
      parse:       peg$parse
    };

    var convert = createCommonjsModule(function (module, exports) {
    var __read = (commonjsGlobal && commonjsGlobal.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    var __spread = (commonjsGlobal && commonjsGlobal.__spread) || function () {
        for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
        return ar;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    /* tslint:disable */

    var ParsedType;
    (function (ParsedType) {
        ParsedType["TEXT"] = "TEXT";
        ParsedType["VARIABLE"] = "VARIABLE";
    })(ParsedType = exports.ParsedType || (exports.ParsedType = {}));
    function rawParse(s) {
        return parser.parse(s);
    }
    exports.rawParse = rawParse;
    function removeLineBeginningWhitespace(s) {
        var postNewlineRemove = s.replace(/^\n/, "").match(/^([ \t]*)/);
        if (!postNewlineRemove) {
            return s;
        }
        return s.split("\n").map(function (line) {
            if (line.indexOf(postNewlineRemove[1]) === 0) {
                return line.replace(postNewlineRemove[1], "");
            }
            return line;
        }).join("\n");
    }
    exports.removeLineBeginningWhitespace = removeLineBeginningWhitespace;
    function normalize(parameters, statement) {
        var ret = typeof statement === "string" ?
            [statement] :
            statement;
        function getParameter(findingName) {
            var r = parameters.find(function (_a) {
                var name = _a.name;
                return name === findingName;
            });
            if (r === undefined) {
                throw new Error("Statement refers to parameter " + findingName + " but it does not exist");
            }
            return r;
        }
        function parameterReducer(acc, stat) {
            if (typeof stat !== "string") {
                return acc.concat(stat);
            }
            return rawParse(stat).reduce(function (innerAcc, item) {
                if (item.type === ParsedType.TEXT) {
                    return innerAcc.concat(item.text);
                }
                if (item.function !== "noop") {
                    throw new Error("The function for a variable must be noop");
                }
                if (item.variable.length !== 1) {
                    throw new Error("Only one variable for a ${} is allowed");
                }
                return innerAcc.concat(getParameter(item.variable[0]));
            }, acc);
        }
        return ret.reduce(parameterReducer, []);
    }
    exports.normalize = normalize;
    function newlineBreak(statement) {
        function allButLast(ar) {
            var ret = [];
            for (var i = 0; i < ar.length - 1; i++) {
                ret.push(ar[i]);
            }
            return ret;
        }
        function last(ar) {
            if (ar.length === 0) {
                throw new Error("newlineBreak: list: Empty");
            }
            return ar[ar.length - 1];
        }
        function reducer(acc, item) {
            if (typeof item !== "string") {
                return __spread(allButLast(acc), [
                    last(acc).concat([item]),
                ]);
            }
            var _a = __read(item.split(/[\r\n]/)), split0 = _a[0], splitRest = _a.slice(1);
            return __spread(allButLast(acc), [
                last(acc).concat([split0]),
            ]).concat(splitRest.map(function (r) { return [r]; }));
        }
        return statement.reduce(reducer, [[]]);
    }
    exports.newlineBreak = newlineBreak;
    function html_line(statement) {
        function pre(s) {
            var r = s.replace("\t", "    ");
            var m = r.match(/^ +/);
            if (m === null) {
                return r;
            }
            return m[0].replace(/ /g, " ") + r.substr(m[0].length);
        }
        function mapper(ed) {
            if (typeof ed === "string") {
                return { tagIdClass: "span", inner: pre(ed), attrs: {} };
            }
            ed = ed;
            if (ed.type === "select") {
                return {
                    tagIdClass: "select",
                    inner: [],
                    attrs: { name: ed.name },
                };
            }
            if (ed.type === "string") {
                return { tagIdClass: "input", inner: [], attrs: { name: ed.name } };
            }
            if (ed.type === "integer") {
                return { tagIdClass: "input", inner: [], attrs: { name: ed.name, type: "number" } };
            }
            if (ed.type === "server") {
                return { tagIdClass: "span", inner: "$" + pre(ed.name), attrs: {} };
            }
            throw new Error("Unknown parameter type " + ed.type);
        }
        return {
            tagIdClass: "div.line",
            inner: statement.map(mapper),
            attrs: {},
        };
    }
    exports.html_line = html_line;
    function html(statement) {
        return {
            tagIdClass: "div",
            attrs: {},
            inner: newlineBreak(statement).map(html_line),
        };
    }
    exports.html = html;
    function forHyper(h, hdoc) {
        return h([
            hdoc.tagIdClass,
            hdoc.inner instanceof Array ?
                hdoc.inner.map(function (hd) {
                    if (hd instanceof String) {
                        return hd;
                    }
                    return forHyper(h, hd);
                }) :
                hdoc.inner,
            hdoc.attrs,
        ]);
    }
    exports.forHyper = forHyper;
    });

    unwrapExports(convert);
    var convert_1 = convert.ParsedType;
    var convert_2 = convert.rawParse;
    var convert_3 = convert.removeLineBeginningWhitespace;
    var convert_4 = convert.normalize;
    var convert_5 = convert.newlineBreak;
    var convert_6 = convert.html_line;
    var convert_7 = convert.html;
    var convert_8 = convert.forHyper;

    var controls = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.queryComponentsToArguments = exports.pushBackToControlStore = exports.popBackFromArguments = exports.addBackValuesToControlStore = exports.getLink = exports.asRow = exports.normalizeLink = exports.serializeValues = exports.getControlStore = exports.addControlStoreToEsqlateQueryComponents = exports.urlSearchParamsToArguments = void 0;

    function urlSearchParamsToArguments(url) {
        let o = [];
        for (let [k, v] of url.entries()) {
            o.push({ name: k, val: v });
        }
        return o;
    }
    exports.urlSearchParamsToArguments = urlSearchParamsToArguments;
    /**
     * Merges `esqArg` and `cs` with cs taking precedence.
     */
    function addControlStoreToEsqlateQueryComponents(cs, esqArg) {
        const fromCs = new Set(Object.getOwnPropertyNames(cs));
        function getValue(o) {
            if (!o.hasOwnProperty("value")) {
                return "";
            }
            return o.value;
        }
        return Object.getOwnPropertyNames(cs).reduce((acc, k) => {
            return acc.concat([{ name: k, val: getValue(cs[k]) }]);
        }, esqArg.filter(({ name }) => !fromCs.has(name)));
    }
    exports.addControlStoreToEsqlateQueryComponents = addControlStoreToEsqlateQueryComponents;
    function getControlStore(query, esqlateDefinitionParameters, optionsForSelect) {
        const inputValues = query.reduce((acc, { name, val }) => {
            acc.set(name, val);
            return acc;
        }, new Map());
        function getOptions(parameter) {
            const ps = optionsForSelect.filter(o => o.parameter.name == parameter.name);
            if (ps.length === 0) {
                return [];
            }
            const result = ps[0].result;
            if ((result.status != "preview") && (result.status != "complete")) {
                return [];
            }
            let valueIndex = -1;
            let displayIndex = -1;
            result.fields.forEach((fld, index) => {
                if (fld.name == parameter.value_field) {
                    valueIndex = index;
                }
                if (fld.name == parameter.display_field) {
                    displayIndex = index;
                }
            });
            if ((valueIndex == -1) || (displayIndex == -1)) {
                return [];
            }
            return (result.rows).map((row) => {
                return {
                    display: "" + row[displayIndex],
                    value: "" + row[valueIndex]
                };
            });
        }
        function selectSetValue(value, options) {
            if (options.some((op) => op.value == value)) {
                return value;
            }
            if (options.length) {
                return options[0].value;
            }
            return "";
        }
        function reducer(acc, item) {
            let value = "";
            if (inputValues.has(item.name)) {
                value = inputValues.get(item.name);
            }
            if (item.type == "select") {
                const options = getOptions(item);
                return Object.assign(Object.assign({}, acc), { [item.name]: {
                        options,
                        value: selectSetValue(value, options)
                    } });
            }
            return Object.assign(Object.assign({}, acc), { [item.name]: { value } });
        }
        return esqlateDefinitionParameters.reduce(reducer, {});
    }
    exports.getControlStore = getControlStore;
    function serializeValues(values) {
        return values.map((ea) => {
            const v = (ea.val === undefined) ? "" : encodeURIComponent(ea.val);
            return `${encodeURIComponent(ea.name)}=${v}`;
        }).join('&');
    }
    exports.serializeValues = serializeValues;
    function normalizeLink(namesOfFields, e) {
        const params = new Set(namesOfFields.map((n) => n));
        const parameterCounts = {
            "noop": 1,
            "popup": 2,
        };
        function process(textOrHref) {
            const parsed = convert.rawParse(textOrHref);
            return parsed.map((par) => {
                if (par.type == convert.ParsedType.TEXT) {
                    return par.text;
                }
                if (parameterCounts[par.function] != par.variable.length) {
                    throw new Error(`Function ${par.function} takes ${parameterCounts[par.function]} parameters`);
                }
                par.variable.forEach((v) => {
                    if (!params.has(v)) {
                        throw new Error("Variable ${v} in link template, but not a known variable");
                    }
                });
                return { namesOfFields: par.variable, fun: par.function };
            });
        }
        return {
            class: e.hasOwnProperty("class") ? e.class : "",
            text: e.text ? process(e["text"]) : process(e["href"]),
            href: process(e["href"])
        };
    }
    exports.normalizeLink = normalizeLink;
    function asRow(rawRow, fields, args) {
        const argsAsOb = args.reduce((acc, arg) => {
            return Object.assign(Object.assign({}, acc), { [arg.name]: arg.val });
        }, {});
        return fields.reduce((acc, field, index) => {
            return Object.assign(Object.assign({}, acc), { [field.name]: rawRow[index] });
        }, argsAsOb);
    }
    exports.asRow = asRow;
    function renderLinkText(s, row, escape) {
        if (typeof s == "string") {
            throw new Error("renderLink: Requires normalizeLink to be called first: " + s);
        }
        function getParameters(nofs) {
            return nofs.map((nof) => {
                return "" + row[nof] || "";
            });
        }
        function callF(ela) {
            if (ela.fun == "noop") {
                return getParameters(ela.namesOfFields)[0];
            }
            if (ela.fun == "popup") {
                const params = getParameters(ela.namesOfFields);
                if (params.length != 2) {
                    throw new Error("generation of a popup link requires 2 params");
                }
                return encodeURIComponent(params[0]) + " " +
                    encodeURIComponent(params[1]);
            }
            throw new Error(`Unknown function '${ela.fun}'`);
        }
        return s.reduce((acc, ei) => {
            if (typeof ei == "string") {
                return acc = acc + ei;
            }
            if (escape) {
                return acc + encodeURIComponent(callF(ei));
            }
            return acc + callF(ei);
        }, "");
    }
    function getLink(e, row) {
        const text = e.hasOwnProperty("text") ? e.text : e.href;
        return {
            text: renderLinkText(text, row, false),
            href: renderLinkText(e.href, row, true),
            class: e.hasOwnProperty("class") ? e.class : "",
        };
    }
    exports.getLink = getLink;
    function addBackValuesToControlStore(qry, csv) {
        return qry.reduce((acc, esqArg) => {
            const m = esqArg.name.match(/^_b[a-z]{1,9}([0-9]{1,3})/);
            if (!m) {
                return acc;
            }
            return Object.assign(Object.assign({}, acc), { [m[0]]: { value: "" + esqArg.val } });
        }, csv);
    }
    exports.addBackValuesToControlStore = addBackValuesToControlStore;
    function getBackNumber(qry) {
        return qry.reduce((acc, esqArg) => {
            const m = esqArg.name.match(/^_burl([0-9]{1,3})/);
            if (!m) {
                return acc;
            }
            if (parseInt(m[1]) > acc) {
                return parseInt(m[1]);
            }
            return acc;
        }, -1);
    }
    function popBackFromArguments(qry) {
        const desiredNumber = getBackNumber(qry);
        if ((desiredNumber < 0)) {
            throw new Error("popBackFromArguments: No back links found");
        }
        return qry.reduce((acc, esqArg) => {
            const m = esqArg.name.match(/^_b([a-z]{0,9})([0-9]{1,3})/);
            if (!m) {
                return acc;
            }
            if (parseInt(m[2]) == desiredNumber) {
                return Object.assign(Object.assign({}, acc), { [m[1]]: decodeURIComponent(esqArg.val) });
            }
            return acc;
        }, { url: '', fld: '', def: '', dis: '', val: '' });
    }
    exports.popBackFromArguments = popBackFromArguments;
    function pushBackToControlStore(qry, url) {
        const desiredNumber = Object.getOwnPropertyNames(qry).reduce((acc, esqArg) => {
            const m = esqArg.match(/^_burl([0-9]{1,3})/);
            if (!m) {
                return acc;
            }
            if (parseInt(m[1]) > acc) {
                return parseInt(m[1]);
            }
            return acc;
        }, -1);
        return Object.assign(Object.assign({}, qry), { ["_burl" + (desiredNumber + 1)]: { value: url.url }, ["_bfld" + (desiredNumber + 1)]: { value: url.fld }, ["_bdef" + (desiredNumber + 1)]: { value: url.def }, ["_bdis" + (desiredNumber + 1)]: { value: url.dis }, ["_bval" + (desiredNumber + 1)]: { value: url.val } });
    }
    exports.pushBackToControlStore = pushBackToControlStore;
    function queryComponentsToArguments(params, queryComps) {
        // Popups are treated specially as thier value is urlencoded in the UI.
        const popups = new Set(params
            .filter((p) => p.type == "popup")
            .map((p) => p.name));
        const mapper = (qc) => {
            const v = qc.val === undefined ? "" : qc.val;
            if (popups.has(qc.name)) {
                const value = decodeURIComponent(("" + v).replace(/ .*/, ""));
                return { name: qc.name, value };
            }
            return { name: qc.name, value: v };
        };
        const filterer = (a) => {
            return a.name.substring(0, 1) !== "#";
        };
        return queryComps.map(mapper).filter(filterer);
    }
    exports.queryComponentsToArguments = queryComponentsToArguments;
    });

    unwrapExports(controls);
    var controls_1 = controls.queryComponentsToArguments;
    var controls_2 = controls.pushBackToControlStore;
    var controls_3 = controls.popBackFromArguments;
    var controls_4 = controls.addBackValuesToControlStore;
    var controls_5 = controls.getLink;
    var controls_6 = controls.asRow;
    var controls_7 = controls.normalizeLink;
    var controls_8 = controls.serializeValues;
    var controls_9 = controls.getControlStore;
    var controls_10 = controls.addControlStoreToEsqlateQueryComponents;
    var controls_11 = controls.urlSearchParamsToArguments;

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds. If `immediate` is passed, trigger the function on the
     * leading edge, instead of the trailing. The function also has a property 'clear' 
     * that is a function which will clear the timer to prevent previously scheduled executions. 
     *
     * @source underscore.js
     * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
     * @param {Function} function to wrap
     * @param {Number} timeout in ms (`100`)
     * @param {Boolean} whether to execute at the beginning (`false`)
     * @api public
     */
    function debounce(func, wait, immediate){
      var timeout, args, context, timestamp, result;
      if (null == wait) wait = 100;

      function later() {
        var last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            context = args = null;
          }
        }
      }
      var debounced = function(){
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };

      debounced.clear = function() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };
      
      debounced.flush = function() {
        if (timeout) {
          result = func.apply(context, args);
          context = args = null;
          
          clearTimeout(timeout);
          timeout = null;
        }
      };

      return debounced;
    }
    // Adds compatibility for ES modules
    debounce.debounce = debounce;

    var debounce_1 = debounce;

    /* src/ResultTable.svelte generated by Svelte v3.25.1 */

    const { Object: Object_1 } = globals;
    const file$1 = "src/ResultTable.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[23] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    // (112:2) {#if result && ((result.status == "complete") || (result.status == "preview"))}
    function create_if_block(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let table;
    	let thead;
    	let tr;
    	let t0;
    	let t1;
    	let tbody;
    	let t2;
    	let current;
    	let each_value_3 = /*result*/ ctx[1].fields;
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let if_block0 = (/*definition*/ ctx[0].row_links && /*definition*/ ctx[0].row_links.length || /*inPopup*/ ctx[2]) && create_if_block_8(ctx);
    	let each_value = /*result*/ ctx[1].rows || [];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	function select_block_type_2(ctx, dirty) {
    		if (/*inPopup*/ ctx[2]) return create_if_block_1;
    		if (!/*result*/ ctx[1].full_data_set) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			if_block1.c();
    			add_location(tr, file$1, 117, 10, 3436);
    			add_location(thead, file$1, 116, 8, 3418);
    			add_location(tbody, file$1, 126, 8, 3746);
    			attr_dev(table, "class", "results-head table table-striped table-hover");
    			set_style(table, "padding-bottom", "0");
    			set_style(table, "margin", "0");
    			add_location(table, file$1, 115, 6, 3312);
    			attr_dev(div0, "id", "table-holder");
    			attr_dev(div0, "class", "svelte-u220hq");
    			add_location(div0, file$1, 114, 6, 3282);
    			attr_dev(div1, "class", "column col-auto");
    			set_style(div1, "margin", "0 auto");
    			add_location(div1, file$1, 113, 4, 3223);
    			attr_dev(div2, "class", "columns");
    			add_location(div2, file$1, 112, 2, 3197);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(tr, null);
    			}

    			append_dev(tr, t0);
    			if (if_block0) if_block0.m(tr, null);
    			append_dev(table, t1);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			append_dev(div1, t2);
    			if_block1.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*alignment, result*/ 2) {
    				each_value_3 = /*result*/ ctx[1].fields;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tr, t0);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (/*definition*/ ctx[0].row_links && /*definition*/ ctx[0].row_links.length || /*inPopup*/ ctx[2]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					if_block0.m(tr, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*pick, result, inPopup, definition, getLink, normalizeLink, getFieldnames, args, asRow, alignment, getFormatter*/ 431) {
    				each_value = /*result*/ ctx[1].rows || [];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks_1, detaching);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(112:2) {#if result && ((result.status == \\\"complete\\\") || (result.status == \\\"preview\\\"))}",
    		ctx
    	});

    	return block;
    }

    // (119:12) {#each result.fields as field}
    function create_each_block_3(ctx) {
    	let th;
    	let t_value = /*field*/ ctx[24].name + "";
    	let t;
    	let th_style_value;

    	const block = {
    		c: function create() {
    			th = element("th");
    			t = text(t_value);
    			attr_dev(th, "style", th_style_value = "text-align: " + alignment(/*field*/ ctx[24]));
    			attr_dev(th, "class", "svelte-u220hq");
    			add_location(th, file$1, 119, 12, 3496);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 2 && t_value !== (t_value = /*field*/ ctx[24].name + "")) set_data_dev(t, t_value);

    			if (dirty & /*result*/ 2 && th_style_value !== (th_style_value = "text-align: " + alignment(/*field*/ ctx[24]))) {
    				attr_dev(th, "style", th_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(119:12) {#each result.fields as field}",
    		ctx
    	});

    	return block;
    }

    // (122:12) {#if (definition.row_links && definition.row_links.length) || inPopup}
    function create_if_block_8(ctx) {
    	let th;

    	const block = {
    		c: function create() {
    			th = element("th");
    			attr_dev(th, "class", "svelte-u220hq");
    			add_location(th, file$1, 122, 12, 3677);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(122:12) {#if (definition.row_links && definition.row_links.length) || inPopup}",
    		ctx
    	});

    	return block;
    }

    // (136:14) {:else}
    function create_else_block_2(ctx) {
    	let t_value = /*cell*/ ctx[21] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 2 && t_value !== (t_value = /*cell*/ ctx[21] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(136:14) {:else}",
    		ctx
    	});

    	return block;
    }

    // (134:60) 
    function create_if_block_7(ctx) {
    	let t_value = /*getFormatter*/ ctx[7](/*result*/ ctx[1].fields[/*i*/ ctx[23]].type)(/*cell*/ ctx[21]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*result*/ 2 && t_value !== (t_value = /*getFormatter*/ ctx[7](/*result*/ ctx[1].fields[/*i*/ ctx[23]].type)(/*cell*/ ctx[21]) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(134:60) ",
    		ctx
    	});

    	return block;
    }

    // (132:14) {#if cell === null}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("NULL");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(132:14) {#if cell === null}",
    		ctx
    	});

    	return block;
    }

    // (130:12) {#each row as cell, i}
    function create_each_block_2(ctx) {
    	let td;
    	let show_if;
    	let td_style_value;
    	let td_data_field_name_value;

    	function select_block_type(ctx, dirty) {
    		if (/*cell*/ ctx[21] === null) return create_if_block_6;
    		if (show_if == null || dirty & /*result*/ 2) show_if = !!/*getFormatter*/ ctx[7](/*result*/ ctx[1].fields[/*i*/ ctx[23]].type);
    		if (show_if) return create_if_block_7;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			td = element("td");
    			if_block.c();
    			attr_dev(td, "style", td_style_value = "text-align: " + alignment(/*result*/ ctx[1].fields[/*i*/ ctx[23]]));
    			attr_dev(td, "data-field-name", td_data_field_name_value = /*result*/ ctx[1].fields[/*i*/ ctx[23]].name);
    			add_location(td, file$1, 130, 12, 3859);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			if_block.m(td, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(td, null);
    				}
    			}

    			if (dirty & /*result*/ 2 && td_style_value !== (td_style_value = "text-align: " + alignment(/*result*/ ctx[1].fields[/*i*/ ctx[23]]))) {
    				attr_dev(td, "style", td_style_value);
    			}

    			if (dirty & /*result*/ 2 && td_data_field_name_value !== (td_data_field_name_value = /*result*/ ctx[1].fields[/*i*/ ctx[23]].name)) {
    				attr_dev(td, "data-field-name", td_data_field_name_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(130:12) {#each row as cell, i}",
    		ctx
    	});

    	return block;
    }

    // (141:12) {#if (definition.row_links && definition.row_links.length) || inPopup}
    function create_if_block_4(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_5, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*inPopup*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(141:12) {#if (definition.row_links && definition.row_links.length) || inPopup}",
    		ctx
    	});

    	return block;
    }

    // (146:12) {:else}
    function create_else_block_1(ctx) {
    	let td;
    	let current;
    	let each_value_1 = /*definition*/ ctx[0].row_links || [];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			td = element("td");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(td, "text-align", "left");
    			add_location(td, file$1, 146, 12, 4522);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(td, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*getLink, normalizeLink, getFieldnames, args, definition, asRow, result*/ 291) {
    				each_value_1 = /*definition*/ ctx[0].row_links || [];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(td, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(146:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (142:12) {#if inPopup}
    function create_if_block_5(ctx) {
    	let td;
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[10](/*row*/ ctx[15], ...args);
    	}

    	const block = {
    		c: function create() {
    			td = element("td");
    			button = element("button");
    			button.textContent = "Pick";
    			attr_dev(button, "class", "btn btn-link");
    			add_location(button, file$1, 143, 14, 4403);
    			set_style(td, "text-align", "center");
    			add_location(td, file$1, 142, 12, 4357);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(142:12) {#if inPopup}",
    		ctx
    	});

    	return block;
    }

    // (148:14) {#each definition.row_links  || [] as link}
    function create_each_block_1(ctx) {
    	let link;
    	let current;

    	link = new Link({
    			props: {
    				link: controls_5(controls_7(/*getFieldnames*/ ctx[8](/*args*/ ctx[5]), /*link*/ ctx[18]), controls_6(/*row*/ ctx[15], /*result*/ ctx[1].fields, /*args*/ ctx[5]))
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(link.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link_changes = {};
    			if (dirty & /*args, definition, result*/ 35) link_changes.link = controls_5(controls_7(/*getFieldnames*/ ctx[8](/*args*/ ctx[5]), /*link*/ ctx[18]), controls_6(/*row*/ ctx[15], /*result*/ ctx[1].fields, /*args*/ ctx[5]));
    			link.$set(link_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(148:14) {#each definition.row_links  || [] as link}",
    		ctx
    	});

    	return block;
    }

    // (128:10) {#each result.rows || [] as row}
    function create_each_block(ctx) {
    	let tr;
    	let t0;
    	let t1;
    	let current;
    	let each_value_2 = /*row*/ ctx[15];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block = (/*definition*/ ctx[0].row_links && /*definition*/ ctx[0].row_links.length || /*inPopup*/ ctx[2]) && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			add_location(tr, file$1, 128, 10, 3807);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tr, null);
    			}

    			append_dev(tr, t0);
    			if (if_block) if_block.m(tr, null);
    			append_dev(tr, t1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*alignment, result, getFormatter*/ 130) {
    				each_value_2 = /*row*/ ctx[15];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}

    			if (/*definition*/ ctx[0].row_links && /*definition*/ ctx[0].row_links.length || /*inPopup*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*definition, inPopup*/ 5) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(tr, t1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(128:10) {#each result.rows || [] as row}",
    		ctx
    	});

    	return block;
    }

    // (169:6) {:else}
    function create_else_block(ctx) {
    	let div;
    	let t0;
    	let a;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("All the results are showing but you can still ");
    			a = element("a");
    			a.textContent = "download the results";
    			t2 = text(".");
    			attr_dev(a, "href", "#show-downloads");
    			add_location(a, file$1, 170, 56, 5572);
    			attr_dev(div, "class", "toast toast-success toast-resultset-warning");
    			add_location(div, file$1, 169, 8, 5458);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, a);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = listen_dev(
    					a,
    					"click",
    					prevent_default(function () {
    						if (is_function(/*showDownloads*/ ctx[4])) /*showDownloads*/ ctx[4].apply(this, arguments);
    					}),
    					false,
    					true,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(169:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (165:39) 
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let a;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("⚠ Warning: This result set is very large and not all are shown. If you want to see the full results you will have to ");
    			a = element("a");
    			a.textContent = "download them";
    			t2 = text(".");
    			attr_dev(a, "href", "#show-downloads");
    			add_location(a, file$1, 166, 127, 5336);
    			attr_dev(div, "class", "toast toast-warning toast-resultset-warning");
    			add_location(div, file$1, 165, 8, 5150);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, a);
    			append_dev(div, t2);

    			if (!mounted) {
    				dispose = listen_dev(
    					a,
    					"click",
    					prevent_default(function () {
    						if (is_function(/*showDownloads*/ ctx[4])) /*showDownloads*/ ctx[4].apply(this, arguments);
    					}),
    					false,
    					true,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(165:39) ",
    		ctx
    	});

    	return block;
    }

    // (159:6) {#if inPopup}
    function create_if_block_1(ctx) {
    	let if_block_anchor;
    	let if_block = !/*result*/ ctx[1].full_data_set && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (!/*result*/ ctx[1].full_data_set) {
    				if (if_block) ; else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(159:6) {#if inPopup}",
    		ctx
    	});

    	return block;
    }

    // (160:8) {#if !result.full_data_set }
    function create_if_block_2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "⚠ The result set is very large and not all results are shown.";
    			attr_dev(div, "class", "toast toast-warning toast-resultset-warning");
    			add_location(div, file$1, 160, 8, 4943);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(160:8) {#if !result.full_data_set }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let style;
    	let style_id_value;
    	let t;
    	let current;
    	let if_block = /*result*/ ctx[1] && (/*result*/ ctx[1].status == "complete" || /*result*/ ctx[1].status == "preview") && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			style = element("style");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(style, "id", style_id_value = /*id*/ ctx[6] + "-style");
    			attr_dev(style, "class", "svelte-u220hq");
    			add_location(style, file$1, 109, 2, 3073);
    			attr_dev(div, "id", /*id*/ ctx[6]);
    			attr_dev(div, "class", "svelte-u220hq");
    			add_location(div, file$1, 108, 0, 3057);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, style);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*result*/ ctx[1] && (/*result*/ ctx[1].status == "complete" || /*result*/ ctx[1].status == "preview")) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*result*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function alignment(field) {
    	if (field.type.indexOf("text") > -1 || field.type.indexOf("char") > -1 || field.type.indexOf("date") > -1 || field.type.indexOf("time") > -1 || field.type.indexOf("jsonb") > -1) {
    		return "left";
    	}

    	return "right";
    }

    function getValuesFromControls(currentControls) {
    	return Object.getOwnPropertyNames(currentControls || {}).map(name => {
    		return { name, val: currentControls[name].value };
    	});
    }

    function getValuesFromResults(currentResults) {
    	if (!currentResults || !currentResults.rows || !currentResults.rows.length) {
    		return [];
    	}

    	return currentResults.fields.map((fld, i) => {
    		return {
    			name: fld.name,
    			val: currentResults.rows[0][i]
    		};
    	});
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ResultTable", slots, []);
    	let { definition } = $$props;
    	let { controls } = $$props;
    	let { result } = $$props;
    	let { inPopup } = $$props;
    	let { pick } = $$props;
    	let { showDownloads } = $$props;
    	const id = inPopup ? "in-popup-results" : "out-popup-results";

    	function syncTable() {
    		function resetStylesheet() {
    			const stylesheet = document.getElementById(id + "-style").sheet;

    			for (let i = 0; i < stylesheet.rules.length; i++) {
    				stylesheet.removeRule(0);
    			}

    			return stylesheet;
    		}

    		const stylesheet = resetStylesheet();

    		const requiredWidth = document.getElementById("code-input-area")
    		? document.getElementById("code-input-area").getBoundingClientRect().width
    		: 640;

    		stylesheet.insertRule(`#table-holder { min-width: ${requiredWidth}px }`);
    	}

    	const dateFormatter = new Intl.DateTimeFormat(window.navigator.language,
    	{
    			year: "numeric",
    			month: "2-digit",
    			day: "2-digit"
    		});

    	const timestampFormatter = new Intl.DateTimeFormat(window.navigator.language,
    	{
    			hour: "numeric",
    			minute: "numeric",
    			second: "numeric",
    			year: "numeric",
    			month: "2-digit",
    			day: "2-digit"
    		});

    	const formatters = {
    		"date": s => dateFormatter.format(new Date(s)),
    		"timestamp": s => timestampFormatter.format(new Date(s)),
    		"jsonb": s => JSON.stringify(s)
    	};

    	function getFormatter(sqlType) {
    		if (formatters.hasOwnProperty(sqlType)) {
    			return formatters[sqlType];
    		}

    		return null;
    	}

    	let args = [];

    	function getFieldnames(myArgs) {
    		return myArgs.map(({ name }) => name).concat(result && result.fields
    		? (result.fields || []).map(({ name }) => name)
    		: []);
    	}

    	afterUpdate(syncTable);
    	window.onresize = debounce_1(syncTable, 200);
    	const writable_props = ["definition", "controls", "result", "inPopup", "pick", "showDownloads"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ResultTable> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (row, c) => pick(row);

    	$$self.$$set = $$props => {
    		if ("definition" in $$props) $$invalidate(0, definition = $$props.definition);
    		if ("controls" in $$props) $$invalidate(9, controls = $$props.controls);
    		if ("result" in $$props) $$invalidate(1, result = $$props.result);
    		if ("inPopup" in $$props) $$invalidate(2, inPopup = $$props.inPopup);
    		if ("pick" in $$props) $$invalidate(3, pick = $$props.pick);
    		if ("showDownloads" in $$props) $$invalidate(4, showDownloads = $$props.showDownloads);
    	};

    	$$self.$capture_state = () => ({
    		Link,
    		onDestroy,
    		beforeUpdate,
    		afterUpdate,
    		writable,
    		getStoreValue: get_store_value,
    		asRow: controls_6,
    		normalizeLink: controls_7,
    		getLink: controls_5,
    		debounce: debounce_1,
    		definition,
    		controls,
    		result,
    		inPopup,
    		pick,
    		showDownloads,
    		id,
    		syncTable,
    		alignment,
    		dateFormatter,
    		timestampFormatter,
    		formatters,
    		getFormatter,
    		args,
    		getValuesFromControls,
    		getValuesFromResults,
    		getFieldnames
    	});

    	$$self.$inject_state = $$props => {
    		if ("definition" in $$props) $$invalidate(0, definition = $$props.definition);
    		if ("controls" in $$props) $$invalidate(9, controls = $$props.controls);
    		if ("result" in $$props) $$invalidate(1, result = $$props.result);
    		if ("inPopup" in $$props) $$invalidate(2, inPopup = $$props.inPopup);
    		if ("pick" in $$props) $$invalidate(3, pick = $$props.pick);
    		if ("showDownloads" in $$props) $$invalidate(4, showDownloads = $$props.showDownloads);
    		if ("args" in $$props) $$invalidate(5, args = $$props.args);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*controls, result*/ 514) {
    			 $$invalidate(5, args = getValuesFromControls(controls).concat(getValuesFromResults(result)));
    		}
    	};

    	return [
    		definition,
    		result,
    		inPopup,
    		pick,
    		showDownloads,
    		args,
    		id,
    		getFormatter,
    		getFieldnames,
    		controls,
    		click_handler
    	];
    }

    class ResultTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			definition: 0,
    			controls: 9,
    			result: 1,
    			inPopup: 2,
    			pick: 3,
    			showDownloads: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ResultTable",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*definition*/ ctx[0] === undefined && !("definition" in props)) {
    			console.warn("<ResultTable> was created without expected prop 'definition'");
    		}

    		if (/*controls*/ ctx[9] === undefined && !("controls" in props)) {
    			console.warn("<ResultTable> was created without expected prop 'controls'");
    		}

    		if (/*result*/ ctx[1] === undefined && !("result" in props)) {
    			console.warn("<ResultTable> was created without expected prop 'result'");
    		}

    		if (/*inPopup*/ ctx[2] === undefined && !("inPopup" in props)) {
    			console.warn("<ResultTable> was created without expected prop 'inPopup'");
    		}

    		if (/*pick*/ ctx[3] === undefined && !("pick" in props)) {
    			console.warn("<ResultTable> was created without expected prop 'pick'");
    		}

    		if (/*showDownloads*/ ctx[4] === undefined && !("showDownloads" in props)) {
    			console.warn("<ResultTable> was created without expected prop 'showDownloads'");
    		}
    	}

    	get definition() {
    		throw new Error("<ResultTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set definition(value) {
    		throw new Error("<ResultTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get controls() {
    		throw new Error("<ResultTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controls(value) {
    		throw new Error("<ResultTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get result() {
    		throw new Error("<ResultTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<ResultTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inPopup() {
    		throw new Error("<ResultTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inPopup(value) {
    		throw new Error("<ResultTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pick() {
    		throw new Error("<ResultTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pick(value) {
    		throw new Error("<ResultTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showDownloads() {
    		throw new Error("<ResultTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showDownloads(value) {
    		throw new Error("<ResultTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ParameterDateOrDatetime.svelte generated by Svelte v3.25.1 */
    const file$2 = "src/ParameterDateOrDatetime.svelte";

    function create_fragment$2(ctx) {
    	let input0;
    	let input0_data_highlight_fields_value;
    	let input0_id_value;
    	let input0_data_parameter_name_value;
    	let input0_value_value;
    	let t;
    	let input1;
    	let input1_data_highlight_fields_value;
    	let input1_id_value;
    	let input1_data_parameter_name_value;
    	let input1_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input0 = element("input");
    			t = space();
    			input1 = element("input");
    			attr_dev(input0, "data-highlight-fields", input0_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(input0, "id", input0_id_value = "input-" + /*parameter*/ ctx[1].name);
    			attr_dev(input0, "data-parameter-name", input0_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(input0, "type", "date");
    			input0.value = input0_value_value = ui_6(/*control*/ ctx[0]).date || "";
    			add_location(input0, file$2, 45, 0, 1256);
    			attr_dev(input1, "data-highlight-fields", input1_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(input1, "id", input1_id_value = "input-" + /*parameter*/ ctx[1].name + "-time");
    			attr_dev(input1, "data-parameter-name", input1_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(input1, "type", "time");
    			input1.value = input1_value_value = ui_6(/*control*/ ctx[0]).time || "";
    			add_location(input1, file$2, 53, 0, 1571);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, input1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						input0,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input0,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[2])) /*onblur*/ ctx[2].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input0, "change", /*onchangedate*/ ctx[4], false, false, false),
    					listen_dev(
    						input1,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input1,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[2])) /*onblur*/ ctx[2].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input1, "change", /*onchangetime*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*parameter*/ 2 && input0_data_highlight_fields_value !== (input0_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(input0, "data-highlight-fields", input0_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && input0_id_value !== (input0_id_value = "input-" + /*parameter*/ ctx[1].name)) {
    				attr_dev(input0, "id", input0_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && input0_data_parameter_name_value !== (input0_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input0, "data-parameter-name", input0_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1 && input0_value_value !== (input0_value_value = ui_6(/*control*/ ctx[0]).date || "")) {
    				prop_dev(input0, "value", input0_value_value);
    			}

    			if (dirty & /*parameter*/ 2 && input1_data_highlight_fields_value !== (input1_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(input1, "data-highlight-fields", input1_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && input1_id_value !== (input1_id_value = "input-" + /*parameter*/ ctx[1].name + "-time")) {
    				attr_dev(input1, "id", input1_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && input1_data_parameter_name_value !== (input1_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input1, "data-parameter-name", input1_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1 && input1_value_value !== (input1_value_value = ui_6(/*control*/ ctx[0]).time || "")) {
    				prop_dev(input1, "value", input1_value_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(input1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ParameterDateOrDatetime", slots, []);
    	let { parameter } = $$props;
    	let { control } = $$props;
    	let { onblur } = $$props;
    	let { onfocus } = $$props;
    	let { onerror } = $$props;
    	let { onfix } = $$props;
    	const dispatchNewValue = createEventDispatcher();

    	function emptyCheck() {
    		if (!parameter.empty_string_is_null) {
    			control.value != ""
    			? onfix(parameter.name, parameter.highlight_fields)
    			: onerror(parameter.name, parameter.highlight_fields);
    		}
    	}

    	function onchangedate({ target: { value: evtValue } }) {
    		try {
    			$$invalidate(0, control = ui_4({ ...control, date: evtValue }, "DATE"));
    			dispatchNewValue("newvalue", { name: parameter.name, control });
    			emptyCheck();
    		} catch(e) {
    			onerror(parameter.name, parameter.highlight_fields);
    		}
    	}

    	function onchangetime({ target: { value: evtValue } }) {
    		try {
    			$$invalidate(0, control = {
    				...ui_4({ ...control, time: evtValue }, "TIME")
    			});

    			dispatchNewValue("newvalue", { name: parameter.name, control });
    			emptyCheck();
    		} catch(e) {
    			onerror(parameter.name, parameter.highlight_fields);
    		}
    	}

    	emptyCheck();
    	const writable_props = ["parameter", "control", "onblur", "onfocus", "onerror", "onfix"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ParameterDateOrDatetime> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("parameter" in $$props) $$invalidate(1, parameter = $$props.parameter);
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("onblur" in $$props) $$invalidate(2, onblur = $$props.onblur);
    		if ("onfocus" in $$props) $$invalidate(3, onfocus = $$props.onfocus);
    		if ("onerror" in $$props) $$invalidate(6, onerror = $$props.onerror);
    		if ("onfix" in $$props) $$invalidate(7, onfix = $$props.onfix);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		initializeDateTime: ui_6,
    		processDateTime: ui_4,
    		getStoreValue: get_store_value,
    		writable,
    		parameter,
    		control,
    		onblur,
    		onfocus,
    		onerror,
    		onfix,
    		dispatchNewValue,
    		emptyCheck,
    		onchangedate,
    		onchangetime
    	});

    	$$self.$inject_state = $$props => {
    		if ("parameter" in $$props) $$invalidate(1, parameter = $$props.parameter);
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("onblur" in $$props) $$invalidate(2, onblur = $$props.onblur);
    		if ("onfocus" in $$props) $$invalidate(3, onfocus = $$props.onfocus);
    		if ("onerror" in $$props) $$invalidate(6, onerror = $$props.onerror);
    		if ("onfix" in $$props) $$invalidate(7, onfix = $$props.onfix);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		control,
    		parameter,
    		onblur,
    		onfocus,
    		onchangedate,
    		onchangetime,
    		onerror,
    		onfix
    	];
    }

    class ParameterDateOrDatetime extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			parameter: 1,
    			control: 0,
    			onblur: 2,
    			onfocus: 3,
    			onerror: 6,
    			onfix: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ParameterDateOrDatetime",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*parameter*/ ctx[1] === undefined && !("parameter" in props)) {
    			console.warn("<ParameterDateOrDatetime> was created without expected prop 'parameter'");
    		}

    		if (/*control*/ ctx[0] === undefined && !("control" in props)) {
    			console.warn("<ParameterDateOrDatetime> was created without expected prop 'control'");
    		}

    		if (/*onblur*/ ctx[2] === undefined && !("onblur" in props)) {
    			console.warn("<ParameterDateOrDatetime> was created without expected prop 'onblur'");
    		}

    		if (/*onfocus*/ ctx[3] === undefined && !("onfocus" in props)) {
    			console.warn("<ParameterDateOrDatetime> was created without expected prop 'onfocus'");
    		}

    		if (/*onerror*/ ctx[6] === undefined && !("onerror" in props)) {
    			console.warn("<ParameterDateOrDatetime> was created without expected prop 'onerror'");
    		}

    		if (/*onfix*/ ctx[7] === undefined && !("onfix" in props)) {
    			console.warn("<ParameterDateOrDatetime> was created without expected prop 'onfix'");
    		}
    	}

    	get parameter() {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parameter(value) {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get control() {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set control(value) {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onblur() {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onblur(value) {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onfocus() {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onfocus(value) {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onerror() {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onerror(value) {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onfix() {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onfix(value) {
    		throw new Error("<ParameterDateOrDatetime>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ParameterPopup.svelte generated by Svelte v3.25.1 */

    const file$3 = "src/ParameterPopup.svelte";

    function create_fragment$3(ctx) {
    	let strong;
    	let button;
    	let div;
    	let t0_value = getDisplayValue(/*control*/ ctx[1].value) + "";
    	let t0;
    	let t1;
    	let button_id_value;
    	let button_data_parameter_name_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			button = element("button");
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" ⯅");
    			add_location(div, file$3, 22, 4, 582);
    			attr_dev(button, "id", button_id_value = "input-" + /*parameter*/ ctx[0].name);
    			attr_dev(button, "data-parameter-name", button_data_parameter_name_value = /*parameter*/ ctx[0].name);
    			attr_dev(button, "class", "input-popup");
    			add_location(button, file$3, 21, 2, 440);
    			add_location(strong, file$3, 20, 0, 429);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, button);
    			append_dev(button, div);
    			append_dev(div, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*control*/ 2 && t0_value !== (t0_value = getDisplayValue(/*control*/ ctx[1].value) + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*parameter*/ 1 && button_id_value !== (button_id_value = "input-" + /*parameter*/ ctx[0].name)) {
    				attr_dev(button, "id", button_id_value);
    			}

    			if (dirty & /*parameter*/ 1 && button_data_parameter_name_value !== (button_data_parameter_name_value = /*parameter*/ ctx[0].name)) {
    				attr_dev(button, "data-parameter-name", button_data_parameter_name_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getDisplayValue(controlValue) {
    	return decodeURIComponent(controlValue.substr(controlValue.indexOf(" ") + 1));
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ParameterPopup", slots, []);
    	let { parameter } = $$props;
    	let { control } = $$props;
    	let { popup } = $$props;
    	let { onerror } = $$props;
    	let { onfix } = $$props;

    	if (!parameter.empty_string_is_null) {
    		control.value != ""
    		? onfix(parameter.name, parameter.highlight_fields)
    		: onerror(parameter.name, parameter.highlight_fields);
    	}

    	const writable_props = ["parameter", "control", "popup", "onerror", "onfix"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ParameterPopup> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => popup(parameter.name);

    	$$self.$$set = $$props => {
    		if ("parameter" in $$props) $$invalidate(0, parameter = $$props.parameter);
    		if ("control" in $$props) $$invalidate(1, control = $$props.control);
    		if ("popup" in $$props) $$invalidate(2, popup = $$props.popup);
    		if ("onerror" in $$props) $$invalidate(3, onerror = $$props.onerror);
    		if ("onfix" in $$props) $$invalidate(4, onfix = $$props.onfix);
    	};

    	$$self.$capture_state = () => ({
    		parameter,
    		control,
    		popup,
    		onerror,
    		onfix,
    		getDisplayValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("parameter" in $$props) $$invalidate(0, parameter = $$props.parameter);
    		if ("control" in $$props) $$invalidate(1, control = $$props.control);
    		if ("popup" in $$props) $$invalidate(2, popup = $$props.popup);
    		if ("onerror" in $$props) $$invalidate(3, onerror = $$props.onerror);
    		if ("onfix" in $$props) $$invalidate(4, onfix = $$props.onfix);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [parameter, control, popup, onerror, onfix, click_handler];
    }

    class ParameterPopup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			parameter: 0,
    			control: 1,
    			popup: 2,
    			onerror: 3,
    			onfix: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ParameterPopup",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*parameter*/ ctx[0] === undefined && !("parameter" in props)) {
    			console.warn("<ParameterPopup> was created without expected prop 'parameter'");
    		}

    		if (/*control*/ ctx[1] === undefined && !("control" in props)) {
    			console.warn("<ParameterPopup> was created without expected prop 'control'");
    		}

    		if (/*popup*/ ctx[2] === undefined && !("popup" in props)) {
    			console.warn("<ParameterPopup> was created without expected prop 'popup'");
    		}

    		if (/*onerror*/ ctx[3] === undefined && !("onerror" in props)) {
    			console.warn("<ParameterPopup> was created without expected prop 'onerror'");
    		}

    		if (/*onfix*/ ctx[4] === undefined && !("onfix" in props)) {
    			console.warn("<ParameterPopup> was created without expected prop 'onfix'");
    		}
    	}

    	get parameter() {
    		throw new Error("<ParameterPopup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parameter(value) {
    		throw new Error("<ParameterPopup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get control() {
    		throw new Error("<ParameterPopup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set control(value) {
    		throw new Error("<ParameterPopup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get popup() {
    		throw new Error("<ParameterPopup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set popup(value) {
    		throw new Error("<ParameterPopup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onerror() {
    		throw new Error("<ParameterPopup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onerror(value) {
    		throw new Error("<ParameterPopup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onfix() {
    		throw new Error("<ParameterPopup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onfix(value) {
    		throw new Error("<ParameterPopup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Parameter.svelte generated by Svelte v3.25.1 */
    const file$4 = "src/Parameter.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (57:0) {#if parameter.type != "server"}
    function create_if_block_12(ctx) {
    	let show_if_1 = !/*parameter*/ ctx[1].hasOwnProperty("name");
    	let t;
    	let show_if = !/*control*/ ctx[0] || !/*control*/ ctx[0].hasOwnProperty("value");
    	let if_block1_anchor;
    	let if_block0 = show_if_1 && create_if_block_14(ctx);
    	let if_block1 = show_if && create_if_block_13(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameter*/ 2) show_if_1 = !/*parameter*/ ctx[1].hasOwnProperty("name");

    			if (show_if_1) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_14(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*control*/ 1) show_if = !/*control*/ ctx[0] || !/*control*/ ctx[0].hasOwnProperty("value");

    			if (show_if) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_13(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(57:0) {#if parameter.type != \\\"server\\\"}",
    		ctx
    	});

    	return block;
    }

    // (58:2) {#if (!parameter.hasOwnProperty("name"))}
    function create_if_block_14(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Parameter should have 'name'";
    			attr_dev(div, "class", "deverror");
    			add_location(div, file$4, 58, 4, 1619);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(58:2) {#if (!parameter.hasOwnProperty(\\\"name\\\"))}",
    		ctx
    	});

    	return block;
    }

    // (61:2) {#if (!control || !control.hasOwnProperty("value"))}
    function create_if_block_13(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*parameter*/ ctx[1].name + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Control for ");
    			t1 = text(t1_value);
    			t2 = text(" should exist and have 'value'");
    			attr_dev(div, "class", "deverror");
    			add_location(div, file$4, 61, 4, 1743);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameter*/ 2 && t1_value !== (t1_value = /*parameter*/ ctx[1].name + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(61:2) {#if (!control || !control.hasOwnProperty(\\\"value\\\"))}",
    		ctx
    	});

    	return block;
    }

    // (100:2) {:else}
    function create_else_block_1$1(ctx) {
    	let strong;
    	let t0;
    	let t1_value = /*parameter*/ ctx[1].name + "";
    	let t1;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			t0 = text("$");
    			t1 = text(t1_value);
    			add_location(strong, file$4, 100, 4, 4292);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, t0);
    			append_dev(strong, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameter*/ 2 && t1_value !== (t1_value = /*parameter*/ ctx[1].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(100:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (98:2) {#if ("" + control.value) != "" }
    function create_if_block_11(ctx) {
    	let strong;
    	let t_value = /*control*/ ctx[0].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$4, 98, 4, 4245);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*control*/ 1 && t_value !== (t_value = /*control*/ ctx[0].value + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(98:2) {#if (\\\"\\\" + control.value) != \\\"\\\" }",
    		ctx
    	});

    	return block;
    }

    // (95:41) 
    function create_if_block_10(ctx) {
    	let parameterdateordatetime;
    	let current;

    	parameterdateordatetime = new ParameterDateOrDatetime({
    			props: {
    				onfix: /*onfix*/ ctx[6],
    				onerror: /*onerror*/ ctx[5],
    				onfocus: /*onfocus*/ ctx[3],
    				onblur: /*onblur*/ ctx[4],
    				control: /*control*/ ctx[0],
    				parameter: /*parameter*/ ctx[1]
    			},
    			$$inline: true
    		});

    	parameterdateordatetime.$on("newvalue", /*newvalue_handler*/ ctx[16]);

    	const block = {
    		c: function create() {
    			create_component(parameterdateordatetime.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(parameterdateordatetime, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const parameterdateordatetime_changes = {};
    			if (dirty & /*onfix*/ 64) parameterdateordatetime_changes.onfix = /*onfix*/ ctx[6];
    			if (dirty & /*onerror*/ 32) parameterdateordatetime_changes.onerror = /*onerror*/ ctx[5];
    			if (dirty & /*onfocus*/ 8) parameterdateordatetime_changes.onfocus = /*onfocus*/ ctx[3];
    			if (dirty & /*onblur*/ 16) parameterdateordatetime_changes.onblur = /*onblur*/ ctx[4];
    			if (dirty & /*control*/ 1) parameterdateordatetime_changes.control = /*control*/ ctx[0];
    			if (dirty & /*parameter*/ 2) parameterdateordatetime_changes.parameter = /*parameter*/ ctx[1];
    			parameterdateordatetime.$set(parameterdateordatetime_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(parameterdateordatetime.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(parameterdateordatetime.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(parameterdateordatetime, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(95:41) ",
    		ctx
    	});

    	return block;
    }

    // (93:36) 
    function create_if_block_9(ctx) {
    	let parameterpopup;
    	let current;

    	parameterpopup = new ParameterPopup({
    			props: {
    				popup: /*popup*/ ctx[2],
    				onfix: /*onfix*/ ctx[6],
    				onerror: /*onerror*/ ctx[5],
    				control: /*control*/ ctx[0],
    				parameter: /*parameter*/ ctx[1],
    				"data-parameter-name": /*parameter*/ ctx[1].name
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(parameterpopup.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(parameterpopup, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const parameterpopup_changes = {};
    			if (dirty & /*popup*/ 4) parameterpopup_changes.popup = /*popup*/ ctx[2];
    			if (dirty & /*onfix*/ 64) parameterpopup_changes.onfix = /*onfix*/ ctx[6];
    			if (dirty & /*onerror*/ 32) parameterpopup_changes.onerror = /*onerror*/ ctx[5];
    			if (dirty & /*control*/ 1) parameterpopup_changes.control = /*control*/ ctx[0];
    			if (dirty & /*parameter*/ 2) parameterpopup_changes.parameter = /*parameter*/ ctx[1];
    			if (dirty & /*parameter*/ 2) parameterpopup_changes["data-parameter-name"] = /*parameter*/ ctx[1].name;
    			parameterpopup.$set(parameterpopup_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(parameterpopup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(parameterpopup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(parameterpopup, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(93:36) ",
    		ctx
    	});

    	return block;
    }

    // (76:37) 
    function create_if_block_5$1(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*control*/ ctx[0].options) return create_if_block_6$1;
    		if ("" + /*control*/ ctx[0].value != "") return create_if_block_8$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(76:37) ",
    		ctx
    	});

    	return block;
    }

    // (74:37) 
    function create_if_block_4$1(ctx) {
    	let t0;
    	let t1_value = /*parameter*/ ctx[1].name + "";
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("$");
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameter*/ 2 && t1_value !== (t1_value = /*parameter*/ ctx[1].name + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(74:37) ",
    		ctx
    	});

    	return block;
    }

    // (72:38) 
    function create_if_block_3$1(ctx) {
    	let input;
    	let input_data_highlight_fields_value;
    	let input_id_value;
    	let input_step_value;
    	let input_name_value;
    	let input_data_parameter_name_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(input, "id", input_id_value = "input-" + /*parameter*/ ctx[1].name);
    			attr_dev(input, "step", input_step_value = ui_7(/*parameter*/ ctx[1].decimal_places));
    			attr_dev(input, "name", input_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "data-parameter-name", input_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			add_location(input, file$4, 72, 2, 2784);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*control*/ ctx[0].value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						input,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[4])) /*onblur*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input, "input", /*input_input_handler_3*/ ctx[14]),
    					listen_dev(input, "change", /*validator*/ ctx[7](/*isDecimalOk*/ ctx[10]), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*parameter*/ 2 && input_data_highlight_fields_value !== (input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_id_value !== (input_id_value = "input-" + /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_step_value !== (input_step_value = ui_7(/*parameter*/ ctx[1].decimal_places))) {
    				attr_dev(input, "step", input_step_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_name_value !== (input_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_data_parameter_name_value !== (input_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "data-parameter-name", input_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1 && to_number(input.value) !== /*control*/ ctx[0].value) {
    				set_input_value(input, /*control*/ ctx[0].value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(72:38) ",
    		ctx
    	});

    	return block;
    }

    // (70:38) 
    function create_if_block_2$1(ctx) {
    	let input;
    	let input_data_highlight_fields_value;
    	let input_id_value;
    	let input_name_value;
    	let input_data_parameter_name_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(input, "id", input_id_value = "input-" + /*parameter*/ ctx[1].name);
    			attr_dev(input, "name", input_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "data-parameter-name", input_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			add_location(input, file$4, 70, 2, 2464);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*control*/ ctx[0].value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						input,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[4])) /*onblur*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input, "input", /*input_input_handler_2*/ ctx[13]),
    					listen_dev(input, "change", /*validator*/ ctx[7](/*isIntegerOk*/ ctx[9]), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*parameter*/ 2 && input_data_highlight_fields_value !== (input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_id_value !== (input_id_value = "input-" + /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_name_value !== (input_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_data_parameter_name_value !== (input_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "data-parameter-name", input_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1 && to_number(input.value) !== /*control*/ ctx[0].value) {
    				set_input_value(input, /*control*/ ctx[0].value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(70:38) ",
    		ctx
    	});

    	return block;
    }

    // (68:35) 
    function create_if_block_1$1(ctx) {
    	let input;
    	let input_data_highlight_fields_value;
    	let input_id_value;
    	let input_name_value;
    	let input_data_parameter_name_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(input, "id", input_id_value = "input-" + /*parameter*/ ctx[1].name);
    			attr_dev(input, "name", input_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(input, "type", "date");
    			attr_dev(input, "data-parameter-name", input_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			add_location(input, file$4, 68, 2, 2149);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*control*/ ctx[0].value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						input,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[4])) /*onblur*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[12]),
    					listen_dev(input, "change", /*validator*/ ctx[7](/*isDateOk*/ ctx[8]), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*parameter*/ 2 && input_data_highlight_fields_value !== (input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_id_value !== (input_id_value = "input-" + /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_name_value !== (input_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_data_parameter_name_value !== (input_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "data-parameter-name", input_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1) {
    				set_input_value(input, /*control*/ ctx[0].value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(68:35) ",
    		ctx
    	});

    	return block;
    }

    // (66:0) {#if parameter.type == "string"}
    function create_if_block$1(ctx) {
    	let input;
    	let input_data_highlight_fields_value;
    	let input_id_value;
    	let input_name_value;
    	let input_data_parameter_name_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(input, "id", input_id_value = "input-" + /*parameter*/ ctx[1].name);
    			attr_dev(input, "name", input_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(input, "data-parameter-name", input_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			add_location(input, file$4, 66, 2, 1880);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*control*/ ctx[0].value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						input,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[4])) /*onblur*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*parameter*/ 2 && input_data_highlight_fields_value !== (input_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(input, "data-highlight-fields", input_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_id_value !== (input_id_value = "input-" + /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_name_value !== (input_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*parameter*/ 2 && input_data_parameter_name_value !== (input_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(input, "data-parameter-name", input_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1 && input.value !== /*control*/ ctx[0].value) {
    				set_input_value(input, /*control*/ ctx[0].value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(66:0) {#if parameter.type == \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (89:4) {:else}
    function create_else_block$1(ctx) {
    	let strong;
    	let t0;
    	let t1_value = /*parameter*/ ctx[1].name + "";
    	let t1;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			t0 = text("$");
    			t1 = text(t1_value);
    			add_location(strong, file$4, 89, 6, 3777);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, t0);
    			append_dev(strong, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameter*/ 2 && t1_value !== (t1_value = /*parameter*/ ctx[1].name + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(89:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (87:4) {#if ("" + control.value) != "" }
    function create_if_block_8$1(ctx) {
    	let strong;
    	let t_value = /*control*/ ctx[0].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$4, 87, 6, 3726);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*control*/ 1 && t_value !== (t_value = /*control*/ ctx[0].value + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8$1.name,
    		type: "if",
    		source: "(87:4) {#if (\\\"\\\" + control.value) != \\\"\\\" }",
    		ctx
    	});

    	return block;
    }

    // (77:2) {#if control.options }
    function create_if_block_6$1(ctx) {
    	let select;
    	let if_block_anchor;
    	let select_data_highlight_fields_value;
    	let select_id_value;
    	let select_name_value;
    	let select_data_parameter_name_value;
    	let mounted;
    	let dispose;
    	let if_block = /*parameter*/ ctx[1].empty_string_is_null && create_if_block_7$1(ctx);
    	let each_value = /*control*/ ctx[0].options;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			select = element("select");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(select, "data-highlight-fields", select_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields));
    			attr_dev(select, "id", select_id_value = "input-" + /*parameter*/ ctx[1].name);
    			attr_dev(select, "name", select_name_value = /*parameter*/ ctx[1].name);
    			attr_dev(select, "data-parameter-name", select_data_parameter_name_value = /*parameter*/ ctx[1].name);
    			if (/*control*/ ctx[0].value === void 0) add_render_callback(() => /*select_change_handler*/ ctx[15].call(select));
    			add_location(select, file$4, 77, 4, 3229);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);
    			if (if_block) if_block.m(select, null);
    			append_dev(select, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*control*/ ctx[0].value);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						select,
    						"focus",
    						function () {
    							if (is_function(/*onfocus*/ ctx[3])) /*onfocus*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						select,
    						"blur",
    						function () {
    							if (is_function(/*onblur*/ ctx[4])) /*onblur*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*parameter*/ ctx[1].empty_string_is_null) {
    				if (if_block) ; else {
    					if_block = create_if_block_7$1(ctx);
    					if_block.c();
    					if_block.m(select, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*control*/ 1) {
    				each_value = /*control*/ ctx[0].options;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*parameter*/ 2 && select_data_highlight_fields_value !== (select_data_highlight_fields_value = JSON.stringify(/*parameter*/ ctx[1].highlight_fields))) {
    				attr_dev(select, "data-highlight-fields", select_data_highlight_fields_value);
    			}

    			if (dirty & /*parameter*/ 2 && select_id_value !== (select_id_value = "input-" + /*parameter*/ ctx[1].name)) {
    				attr_dev(select, "id", select_id_value);
    			}

    			if (dirty & /*parameter*/ 2 && select_name_value !== (select_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(select, "name", select_name_value);
    			}

    			if (dirty & /*parameter*/ 2 && select_data_parameter_name_value !== (select_data_parameter_name_value = /*parameter*/ ctx[1].name)) {
    				attr_dev(select, "data-parameter-name", select_data_parameter_name_value);
    			}

    			if (dirty & /*control*/ 1) {
    				select_option(select, /*control*/ ctx[0].value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(77:2) {#if control.options }",
    		ctx
    	});

    	return block;
    }

    // (79:6) {#if parameter.empty_string_is_null}
    function create_if_block_7$1(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file$4, 79, 8, 3511);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$1.name,
    		type: "if",
    		source: "(79:6) {#if parameter.empty_string_is_null}",
    		ctx
    	});

    	return block;
    }

    // (82:6) {#each control.options as opt}
    function create_each_block$1(ctx) {
    	let option;
    	let t_value = /*opt*/ ctx[18].display + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*opt*/ ctx[18].value;
    			option.value = option.__value;
    			add_location(option, file$4, 82, 8, 3595);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*control*/ 1 && t_value !== (t_value = /*opt*/ ctx[18].display + "")) set_data_dev(t, t_value);

    			if (dirty & /*control*/ 1 && option_value_value !== (option_value_value = /*opt*/ ctx[18].value)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(82:6) {#each control.options as opt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let t;
    	let current_block_type_index;
    	let if_block1;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*parameter*/ ctx[1].type != "server" && create_if_block_12(ctx);

    	const if_block_creators = [
    		create_if_block$1,
    		create_if_block_1$1,
    		create_if_block_2$1,
    		create_if_block_3$1,
    		create_if_block_4$1,
    		create_if_block_5$1,
    		create_if_block_9,
    		create_if_block_10,
    		create_if_block_11,
    		create_else_block_1$1
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*parameter*/ ctx[1].type == "string") return 0;
    		if (/*parameter*/ ctx[1].type == "date") return 1;
    		if (/*parameter*/ ctx[1].type == "integer") return 2;
    		if (/*parameter*/ ctx[1].type == "decimal") return 3;
    		if (/*parameter*/ ctx[1].type == "server") return 4;
    		if (/*parameter*/ ctx[1].type == "select") return 5;
    		if (/*parameter*/ ctx[1].type == "popup") return 6;
    		if (/*parameter*/ ctx[1].type == "datetime") return 7;
    		if ("" + /*control*/ ctx[0].value != "") return 8;
    		return 9;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*parameter*/ ctx[1].type != "server") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_12(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Parameter", slots, []);
    	const dispatchNewValue = createEventDispatcher();
    	let { parameter } = $$props;
    	let { control } = $$props;
    	let { popup } = $$props;
    	let { onfocus } = $$props;
    	let { onblur } = $$props;
    	let { onerror } = $$props;
    	let { onfix } = $$props;

    	function validator(validationFunc) {
    		return function () {
    			if (!validationFunc(control.value)) {
    				return onerror(parameter.name, parameter.highlight_fields);
    			}

    			onfix(parameter.name, parameter.highlight_fields);
    			dispatchNewValue("newvalue", { name: parameter.name, control });
    		};
    	}

    	function isDateOk() {
    		if (parameter.empty_string_is_null && control.value == "") {
    			return true;
    		}

    		return ("" + control.value).match(/\d\d\d\d\-\d\d-\d\d/);
    	}

    	function isIntegerOk() {
    		if (parameter.empty_string_is_null && control.value == "") {
    			return true;
    		}

    		return "" + parseInt(control.value) == control.value;
    	}

    	function isDecimalOk() {
    		if (parameter.empty_string_is_null && control.value == "") {
    			return true;
    		}

    		return ("" + control.value).match(/^-?(0|[1-9]\d*)(\.\d+)?$/);
    	}

    	if (parameter.type == "integer") {
    		validator(isIntegerOk)();
    	}

    	if (parameter.type == "decimal") {
    		validator(isDecimalOk)();
    	}

    	if (parameter.type == "date") {
    		validator(isDateOk)();
    	}

    	const writable_props = ["parameter", "control", "popup", "onfocus", "onblur", "onerror", "onfix"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Parameter> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		control.value = this.value;
    		$$invalidate(0, control);
    	}

    	function input_input_handler_1() {
    		control.value = this.value;
    		$$invalidate(0, control);
    	}

    	function input_input_handler_2() {
    		control.value = to_number(this.value);
    		$$invalidate(0, control);
    	}

    	function input_input_handler_3() {
    		control.value = to_number(this.value);
    		$$invalidate(0, control);
    	}

    	function select_change_handler() {
    		control.value = select_value(this);
    		$$invalidate(0, control);
    	}

    	function newvalue_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("parameter" in $$props) $$invalidate(1, parameter = $$props.parameter);
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("popup" in $$props) $$invalidate(2, popup = $$props.popup);
    		if ("onfocus" in $$props) $$invalidate(3, onfocus = $$props.onfocus);
    		if ("onblur" in $$props) $$invalidate(4, onblur = $$props.onblur);
    		if ("onerror" in $$props) $$invalidate(5, onerror = $$props.onerror);
    		if ("onfix" in $$props) $$invalidate(6, onfix = $$props.onfix);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatchNewValue,
    		ParameterDateOrDatetime,
    		ParameterPopup,
    		getStep: ui_7,
    		parameter,
    		control,
    		popup,
    		onfocus,
    		onblur,
    		onerror,
    		onfix,
    		validator,
    		isDateOk,
    		isIntegerOk,
    		isDecimalOk
    	});

    	$$self.$inject_state = $$props => {
    		if ("parameter" in $$props) $$invalidate(1, parameter = $$props.parameter);
    		if ("control" in $$props) $$invalidate(0, control = $$props.control);
    		if ("popup" in $$props) $$invalidate(2, popup = $$props.popup);
    		if ("onfocus" in $$props) $$invalidate(3, onfocus = $$props.onfocus);
    		if ("onblur" in $$props) $$invalidate(4, onblur = $$props.onblur);
    		if ("onerror" in $$props) $$invalidate(5, onerror = $$props.onerror);
    		if ("onfix" in $$props) $$invalidate(6, onfix = $$props.onfix);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		control,
    		parameter,
    		popup,
    		onfocus,
    		onblur,
    		onerror,
    		onfix,
    		validator,
    		isDateOk,
    		isIntegerOk,
    		isDecimalOk,
    		input_input_handler,
    		input_input_handler_1,
    		input_input_handler_2,
    		input_input_handler_3,
    		select_change_handler,
    		newvalue_handler
    	];
    }

    class Parameter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			parameter: 1,
    			control: 0,
    			popup: 2,
    			onfocus: 3,
    			onblur: 4,
    			onerror: 5,
    			onfix: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Parameter",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*parameter*/ ctx[1] === undefined && !("parameter" in props)) {
    			console.warn("<Parameter> was created without expected prop 'parameter'");
    		}

    		if (/*control*/ ctx[0] === undefined && !("control" in props)) {
    			console.warn("<Parameter> was created without expected prop 'control'");
    		}

    		if (/*popup*/ ctx[2] === undefined && !("popup" in props)) {
    			console.warn("<Parameter> was created without expected prop 'popup'");
    		}

    		if (/*onfocus*/ ctx[3] === undefined && !("onfocus" in props)) {
    			console.warn("<Parameter> was created without expected prop 'onfocus'");
    		}

    		if (/*onblur*/ ctx[4] === undefined && !("onblur" in props)) {
    			console.warn("<Parameter> was created without expected prop 'onblur'");
    		}

    		if (/*onerror*/ ctx[5] === undefined && !("onerror" in props)) {
    			console.warn("<Parameter> was created without expected prop 'onerror'");
    		}

    		if (/*onfix*/ ctx[6] === undefined && !("onfix" in props)) {
    			console.warn("<Parameter> was created without expected prop 'onfix'");
    		}
    	}

    	get parameter() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parameter(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get control() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set control(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get popup() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set popup(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onfocus() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onfocus(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onblur() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onblur(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onerror() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onerror(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onfix() {
    		throw new Error("<Parameter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onfix(value) {
    		throw new Error("<Parameter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Highlighter.svelte generated by Svelte v3.25.1 */
    const file$5 = "src/Highlighter.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (19:0) {:else}
    function create_else_block$2(ctx) {
    	let span;
    	let t_value = /*part*/ ctx[3].value + "";
    	let t;
    	let span_data_field_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "field_highlight");
    			attr_dev(span, "data-field", span_data_field_value = /*part*/ ctx[3].value);
    			add_location(span, file$5, 19, 0, 534);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameters, item*/ 3 && t_value !== (t_value = /*part*/ ctx[3].value + "")) set_data_dev(t, t_value);

    			if (dirty & /*parameters, item*/ 3 && span_data_field_value !== (span_data_field_value = /*part*/ ctx[3].value)) {
    				attr_dev(span, "data-field", span_data_field_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:0) {#if part.type == "String"}
    function create_if_block$2(ctx) {
    	let span;
    	let t_value = /*part*/ ctx[3].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$5, 17, 0, 500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*parameters, item*/ 3 && t_value !== (t_value = /*part*/ ctx[3].value + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(17:0) {#if part.type == \\\"String\\\"}",
    		ctx
    	});

    	return block;
    }

    // (16:0) {#each getParts(parameters, item) as part}
    function create_each_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*part*/ ctx[3].type == "String") return create_if_block$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(16:0) {#each getParts(parameters, item) as part}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let each_1_anchor;
    	let each_value = /*getParts*/ ctx[2](/*parameters*/ ctx[1], /*item*/ ctx[0]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*getParts, parameters, item*/ 7) {
    				each_value = /*getParts*/ ctx[2](/*parameters*/ ctx[1], /*item*/ ctx[0]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Highlighter", slots, []);
    	let { item } = $$props;
    	let { parameters } = $$props;

    	function getParts(params, theItem) {
    		const parameterNames = Array.from(new Set(params.reduce((acc, { name, highlight_fields }) => acc.concat(highlight_fields || [name]), [])));
    		return ui_1(ui_3(parameterNames, theItem), theItem);
    	}

    	const writable_props = ["item", "parameters"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Highlighter> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("parameters" in $$props) $$invalidate(1, parameters = $$props.parameters);
    	};

    	$$self.$capture_state = () => ({
    		getHightlightPositions: ui_3,
    		getHightlightString: ui_1,
    		item,
    		parameters,
    		getParts
    	});

    	$$self.$inject_state = $$props => {
    		if ("item" in $$props) $$invalidate(0, item = $$props.item);
    		if ("parameters" in $$props) $$invalidate(1, parameters = $$props.parameters);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [item, parameters, getParts];
    }

    class Highlighter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { item: 0, parameters: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Highlighter",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*item*/ ctx[0] === undefined && !("item" in props)) {
    			console.warn("<Highlighter> was created without expected prop 'item'");
    		}

    		if (/*parameters*/ ctx[1] === undefined && !("parameters" in props)) {
    			console.warn("<Highlighter> was created without expected prop 'parameters'");
    		}
    	}

    	get item() {
    		throw new Error("<Highlighter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Highlighter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parameters() {
    		throw new Error("<Highlighter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parameters(value) {
    		throw new Error("<Highlighter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/MainLinks.svelte generated by Svelte v3.25.1 */

    const { Object: Object_1$1 } = globals;
    const file$6 = "src/MainLinks.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (47:2) {#each the_links as link}
    function create_each_block$3(ctx) {
    	let link;
    	let current;

    	link = new Link({
    			props: { link: /*link*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(link.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link_changes = {};
    			if (dirty & /*the_links*/ 1) link_changes.link = /*link*/ ctx[5];
    			link.$set(link_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(47:2) {#each the_links as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let current;
    	let each_value = /*the_links*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "id", "main_links");
    			add_location(div, file$6, 45, 0, 1117);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*the_links*/ 1) {
    				each_value = /*the_links*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getValuesFromControls$1(currentControls) {
    	return Object.getOwnPropertyNames(currentControls || {}).map(name => {
    		return { name, val: currentControls[name].value };
    	});
    }

    function getValuesFromResults$1(currentResults) {
    	if (!currentResults || !currentResults.rows || !currentResults.rows.length) {
    		return [];
    	}

    	return currentResults.fields.map((fld, i) => {
    		return {
    			name: fld.name,
    			val: currentResults.rows[0][i]
    		};
    	});
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MainLinks", slots, []);
    	let { links } = $$props;
    	let { controls } = $$props;
    	let { result } = $$props;
    	let args = [];
    	let the_links = [];
    	const writable_props = ["links", "controls", "result"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MainLinks> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("links" in $$props) $$invalidate(1, links = $$props.links);
    		if ("controls" in $$props) $$invalidate(2, controls = $$props.controls);
    		if ("result" in $$props) $$invalidate(3, result = $$props.result);
    	};

    	$$self.$capture_state = () => ({
    		asRow: controls_6,
    		normalizeLink: controls_7,
    		getLink: controls_5,
    		Link,
    		links,
    		controls,
    		result,
    		getValuesFromControls: getValuesFromControls$1,
    		getValuesFromResults: getValuesFromResults$1,
    		args,
    		the_links
    	});

    	$$self.$inject_state = $$props => {
    		if ("links" in $$props) $$invalidate(1, links = $$props.links);
    		if ("controls" in $$props) $$invalidate(2, controls = $$props.controls);
    		if ("result" in $$props) $$invalidate(3, result = $$props.result);
    		if ("args" in $$props) $$invalidate(4, args = $$props.args);
    		if ("the_links" in $$props) $$invalidate(0, the_links = $$props.the_links);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*controls, result*/ 12) {
    			 $$invalidate(4, args = getValuesFromControls$1(controls || {}).concat(getValuesFromResults$1(result)));
    		}

    		if ($$self.$$.dirty & /*links, args*/ 18) {
    			 $$invalidate(0, the_links = (links || []).reduce(
    				(acc, link) => {
    					try {
    						return acc.concat([
    							controls_5(controls_7(args.map(({ name }) => name), link), controls_6(args.map(({ name }) => name), [], args))
    						]);
    					} catch(e) {
    						return acc;
    					}
    				},
    				[]
    			));
    		}
    	};

    	return [the_links, links, controls, result];
    }

    class MainLinks extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { links: 1, controls: 2, result: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MainLinks",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*links*/ ctx[1] === undefined && !("links" in props)) {
    			console.warn("<MainLinks> was created without expected prop 'links'");
    		}

    		if (/*controls*/ ctx[2] === undefined && !("controls" in props)) {
    			console.warn("<MainLinks> was created without expected prop 'controls'");
    		}

    		if (/*result*/ ctx[3] === undefined && !("result" in props)) {
    			console.warn("<MainLinks> was created without expected prop 'result'");
    		}
    	}

    	get links() {
    		throw new Error("<MainLinks>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set links(value) {
    		throw new Error("<MainLinks>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get controls() {
    		throw new Error("<MainLinks>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set controls(value) {
    		throw new Error("<MainLinks>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get result() {
    		throw new Error("<MainLinks>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set result(value) {
    		throw new Error("<MainLinks>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.25.1 */
    const file$7 = "src/App.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	child_ctx[40] = list;
    	child_ctx[41] = i;
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	child_ctx[37] = list;
    	child_ctx[38] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    // (180:6) {#each ($viewStore.menu || []) as item}
    function create_each_block_4(ctx) {
    	let li;
    	let a;
    	let t0_value = /*item*/ ctx[36].title + "";
    	let t0;
    	let a_href_value;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "href", a_href_value = "#/" + /*item*/ ctx[36].name);
    			add_location(a, file$7, 181, 8, 5290);
    			add_location(li, file$7, 180, 6, 5277);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*hideSidebar*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$viewStore*/ 4096 && t0_value !== (t0_value = /*item*/ ctx[36].title + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*$viewStore*/ 4096 && a_href_value !== (a_href_value = "#/" + /*item*/ ctx[36].name)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(180:6) {#each ($viewStore.menu || []) as item}",
    		ctx
    	});

    	return block;
    }

    // (203:4) {:else}
    function create_else_block$3(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let button0;
    	let t0;
    	let div0;
    	let t2;
    	let t3;
    	let div17;
    	let a0;
    	let t5;
    	let div16;
    	let div15;
    	let div9;
    	let div8;
    	let div7;
    	let div5;
    	let h3;
    	let t6_value = /*$viewStore*/ ctx[12].definition.title + "";
    	let t6;
    	let div4;
    	let span0;
    	let t7;
    	let span1;
    	let span2;
    	let t10;
    	let div6;
    	let a1;
    	let t12;
    	let div10;
    	let current_block_type_index;
    	let if_block1;
    	let t13;
    	let div14;
    	let div13;
    	let div12;
    	let div11;
    	let t14;
    	let button1;
    	let t15_value = (/*$viewStore*/ ctx[12].definition.statement_type || "EXECUTE") + "";
    	let t15;
    	let button1_class_value;
    	let t16;
    	let div16_style_value;
    	let div17_class_value;
    	let div17_style_value;
    	let t17;
    	let t18;
    	let if_block5_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*$viewStore*/ ctx[12].asPopup && create_if_block_12$1(ctx);
    	const if_block_creators = [create_if_block_7$2, create_else_block_4];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*$viewStore*/ ctx[12].showingSql) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block2 = /*$viewStore*/ ctx[12].asPopup && create_if_block_6$2(ctx);
    	let if_block3 = /*$viewStore*/ ctx[12].asPopup && create_if_block_5$2(ctx);
    	let if_block4 = /*$viewStore*/ ctx[12].showingDownload && create_if_block_2$2(ctx);
    	let if_block5 = !/*$viewStore*/ ctx[12].asPopup && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "xx";
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			div17 = element("div");
    			a0 = element("a");
    			a0.textContent = " ";
    			t5 = space();
    			div16 = element("div");
    			div15 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			h3 = element("h3");
    			t6 = text(t6_value);
    			div4 = element("div");
    			span0 = element("span");
    			t7 = text("a");
    			span1 = element("span");
    			span1.textContent = "b";
    			span2 = element("span");
    			span2.textContent = "c";
    			t10 = space();
    			div6 = element("div");
    			a1 = element("a");
    			a1.textContent = "⚙";
    			t12 = space();
    			div10 = element("div");
    			if_block1.c();
    			t13 = space();
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			if (if_block2) if_block2.c();
    			t14 = space();
    			button1 = element("button");
    			t15 = text(t15_value);
    			t16 = space();
    			if (if_block3) if_block3.c();
    			t17 = space();
    			if (if_block4) if_block4.c();
    			t18 = space();
    			if (if_block5) if_block5.c();
    			if_block5_anchor = empty();
    			attr_dev(button0, "class", "btn btn-clear float-right");
    			attr_dev(button0, "onclick", "esqlateHideToastError()");
    			add_location(button0, file$7, 206, 10, 6117);
    			attr_dev(div0, "id", "toast-error-wrapper-text");
    			set_style(div0, "padding", "1em");
    			add_location(div0, file$7, 207, 10, 6213);
    			attr_dev(div1, "class", "toast toast-error");
    			add_location(div1, file$7, 205, 8, 6075);
    			attr_dev(div2, "class", "column col-auto");
    			set_style(div2, "margin", "3rem auto 0 auto");
    			add_location(div2, file$7, 204, 6, 6004);
    			attr_dev(div3, "class", "columns");
    			attr_dev(div3, "id", "toast-error-wrapper");
    			set_style(div3, "display", "none");
    			add_location(div3, file$7, 203, 4, 5930);
    			attr_dev(a0, "href", "#close");
    			attr_dev(a0, "class", "modal-overlay");
    			attr_dev(a0, "aria-label", "Close");
    			add_location(a0, file$7, 223, 6, 6684);
    			add_location(h3, file$7, 230, 18, 7110);
    			attr_dev(span0, "id", "color-finder-error");
    			attr_dev(span0, "class", "text-error");
    			add_location(span0, file$7, 230, 103, 7195);
    			attr_dev(span1, "id", "color-finder-warning");
    			attr_dev(span1, "class", "text-warning");
    			add_location(span1, file$7, 230, 160, 7252);
    			attr_dev(span2, "id", "color-finder-success");
    			attr_dev(span2, "class", "text-success");
    			add_location(span2, file$7, 230, 221, 7313);
    			attr_dev(div4, "id", "color-finder");
    			set_style(div4, "display", "none");
    			add_location(div4, file$7, 230, 58, 7150);
    			attr_dev(div5, "class", "column col-9");
    			add_location(div5, file$7, 229, 16, 7065);
    			set_style(a1, "text-decoration", "none");
    			set_style(a1, "float", "right");
    			set_style(a1, "font-size", "200%");
    			attr_dev(a1, "href", "#close");
    			add_location(a1, file$7, 233, 16, 7463);
    			attr_dev(div6, "class", "column col-3");
    			add_location(div6, file$7, 232, 16, 7420);
    			attr_dev(div7, "class", "columns");
    			add_location(div7, file$7, 228, 35, 7027);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file$7, 228, 12, 7004);
    			attr_dev(div9, "class", "modal-header");
    			add_location(div9, file$7, 227, 10, 6965);
    			attr_dev(div10, "class", "modal-body");
    			set_style(div10, "overflow", "unset");
    			add_location(div10, file$7, 238, 10, 7661);
    			attr_dev(button1, "class", button1_class_value = "btn btn-primary " + buttonClass(/*$viewStore*/ ctx[12].definition.statement_type));
    			add_location(button1, file$7, 299, 12, 10819);
    			attr_dev(div11, "class", "column col-12");
    			add_location(div11, file$7, 294, 68, 10572);
    			attr_dev(div12, "class", "col-gapless columns");
    			add_location(div12, file$7, 294, 35, 10539);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$7, 294, 12, 10516);
    			attr_dev(div14, "class", "modal-footer");
    			add_location(div14, file$7, 293, 10, 10477);
    			attr_dev(div15, "class", "column col-auto modal-container code-popup");
    			set_style(div15, "margin", "auto");
    			add_location(div15, file$7, 225, 8, 6876);
    			attr_dev(div16, "class", "columns");
    			attr_dev(div16, "style", div16_style_value = /*$viewStore*/ ctx[12].asPopup ? "" : "margin-top: 2rem");
    			add_location(div16, file$7, 224, 6, 6792);

    			attr_dev(div17, "class", div17_class_value = /*$viewStore*/ ctx[12].asPopup
    			? "modal active in-popup"
    			: "no-modal");

    			attr_dev(div17, "style", div17_style_value = /*$viewStore*/ ctx[12].statement.length
    			? ""
    			: "display: none");

    			add_location(div17, file$7, 222, 4, 6543);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			insert_dev(target, t2, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div17, anchor);
    			append_dev(div17, a0);
    			append_dev(div17, t5);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, h3);
    			append_dev(h3, t6);
    			append_dev(div5, div4);
    			append_dev(div4, span0);
    			append_dev(div4, t7);
    			append_dev(div4, span1);
    			append_dev(div4, span2);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			append_dev(div6, a1);
    			append_dev(div15, t12);
    			append_dev(div15, div10);
    			if_blocks[current_block_type_index].m(div10, null);
    			append_dev(div15, t13);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			if (if_block2) if_block2.m(div11, null);
    			append_dev(div11, t14);
    			append_dev(div11, button1);
    			append_dev(button1, t15);
    			append_dev(div15, t16);
    			if (if_block3) if_block3.m(div15, null);
    			insert_dev(target, t17, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert_dev(target, t18, anchor);
    			if (if_block5) if_block5.m(target, anchor);
    			insert_dev(target, if_block5_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						a0,
    						"click",
    						prevent_default(function () {
    							if (is_function(/*cancel*/ ctx[3])) /*cancel*/ ctx[3].apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					),
    					listen_dev(a1, "click", prevent_default(/*showConfig*/ ctx[16]), false, true, false),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*run*/ ctx[1])) /*run*/ ctx[1].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (!/*$viewStore*/ ctx[12].asPopup) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*$viewStore*/ 4096) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_12$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t3.parentNode, t3);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty[0] & /*$viewStore*/ 4096) && t6_value !== (t6_value = /*$viewStore*/ ctx[12].definition.title + "")) set_data_dev(t6, t6_value);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div10, null);
    			}

    			if (/*$viewStore*/ ctx[12].asPopup) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_6$2(ctx);
    					if_block2.c();
    					if_block2.m(div11, t14);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if ((!current || dirty[0] & /*$viewStore*/ 4096) && t15_value !== (t15_value = (/*$viewStore*/ ctx[12].definition.statement_type || "EXECUTE") + "")) set_data_dev(t15, t15_value);

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && button1_class_value !== (button1_class_value = "btn btn-primary " + buttonClass(/*$viewStore*/ ctx[12].definition.statement_type))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (/*$viewStore*/ ctx[12].asPopup) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty[0] & /*$viewStore*/ 4096) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_5$2(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div15, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && div16_style_value !== (div16_style_value = /*$viewStore*/ ctx[12].asPopup ? "" : "margin-top: 2rem")) {
    				attr_dev(div16, "style", div16_style_value);
    			}

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && div17_class_value !== (div17_class_value = /*$viewStore*/ ctx[12].asPopup
    			? "modal active in-popup"
    			: "no-modal")) {
    				attr_dev(div17, "class", div17_class_value);
    			}

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && div17_style_value !== (div17_style_value = /*$viewStore*/ ctx[12].statement.length
    			? ""
    			: "display: none")) {
    				attr_dev(div17, "style", div17_style_value);
    			}

    			if (/*$viewStore*/ ctx[12].showingDownload) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_2$2(ctx);
    					if_block4.c();
    					if_block4.m(t18.parentNode, t18);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (!/*$viewStore*/ ctx[12].asPopup) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);

    					if (dirty[0] & /*$viewStore*/ 4096) {
    						transition_in(if_block5, 1);
    					}
    				} else {
    					if_block5 = create_if_block_1$2(ctx);
    					if_block5.c();
    					transition_in(if_block5, 1);
    					if_block5.m(if_block5_anchor.parentNode, if_block5_anchor);
    				}
    			} else if (if_block5) {
    				group_outros();

    				transition_out(if_block5, 1, 1, () => {
    					if_block5 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block3);
    			transition_in(if_block5);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block3);
    			transition_out(if_block5);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t2);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div17);
    			if_blocks[current_block_type_index].d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching) detach_dev(t17);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach_dev(t18);
    			if (if_block5) if_block5.d(detaching);
    			if (detaching) detach_dev(if_block5_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(203:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (196:4) {#if $viewStore.showingMenu}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Welcome to eSQLate.";
    			t1 = space();
    			p = element("p");
    			p.textContent = "This tool enables you to create simple administration panels by writing SQL queries within a simple JSON document.";
    			add_location(h2, file$7, 198, 10, 5725);
    			add_location(p, file$7, 199, 10, 5764);
    			attr_dev(div0, "class", "column col-auto");
    			set_style(div0, "margin", "3rem auto 0 auto");
    			set_style(div0, "max-width", "40%");
    			add_location(div0, file$7, 197, 8, 5636);
    			attr_dev(div1, "class", "columns");
    			add_location(div1, file$7, 196, 6, 5606);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(196:4) {#if $viewStore.showingMenu}",
    		ctx
    	});

    	return block;
    }

    // (215:4) {#if !$viewStore.asPopup}
    function create_if_block_12$1(ctx) {
    	let mainlinks;
    	let current;

    	mainlinks = new MainLinks({
    			props: {
    				links: /*$viewStore*/ ctx[12].definition.top_links,
    				controls: /*$viewStore*/ ctx[12].controls,
    				result: /*$viewStore*/ ctx[12].result
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(mainlinks.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(mainlinks, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const mainlinks_changes = {};
    			if (dirty[0] & /*$viewStore*/ 4096) mainlinks_changes.links = /*$viewStore*/ ctx[12].definition.top_links;
    			if (dirty[0] & /*$viewStore*/ 4096) mainlinks_changes.controls = /*$viewStore*/ ctx[12].controls;
    			if (dirty[0] & /*$viewStore*/ 4096) mainlinks_changes.result = /*$viewStore*/ ctx[12].result;
    			mainlinks.$set(mainlinks_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(mainlinks.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(mainlinks.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(mainlinks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12$1.name,
    		type: "if",
    		source: "(215:4) {#if !$viewStore.asPopup}",
    		ctx
    	});

    	return block;
    }

    // (265:12) {:else}
    function create_else_block_4(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let div2;
    	let current;
    	let if_block = /*$viewStore*/ ctx[12].definition.description && create_if_block_11$1(ctx);
    	let each_value_3 = /*$viewStore*/ ctx[12].definition.parameters.filter(parameterIsAvailable(/*$viewStore*/ ctx[12].controls));
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "column-12");
    			attr_dev(div0, "id", "code-input-area");
    			add_location(div0, file$7, 266, 14, 9016);
    			attr_dev(div1, "class", "col-gapless columns code-description");
    			add_location(div1, file$7, 265, 12, 8951);
    			attr_dev(div2, "class", "form-horizontal code-form");
    			add_location(div2, file$7, 272, 12, 9278);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if (if_block) if_block.m(div0, null);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*$viewStore*/ ctx[12].definition.description) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_11$1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*$viewStore, onfix, onerror, popup, onnewcontrolvalue*/ 1839136) {
    				each_value_3 = /*$viewStore*/ ctx[12].definition.parameters.filter(parameterIsAvailable(/*$viewStore*/ ctx[12].controls));
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(265:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (240:12) {#if $viewStore.showingSql}
    function create_if_block_7$2(ctx) {
    	let div4;
    	let div1;
    	let div0;
    	let t;
    	let div3;
    	let div2;
    	let current;
    	let if_block = /*$viewStore*/ ctx[12].definition.description && create_if_block_9$1(ctx);
    	let each_value_1 = /*$viewStore*/ ctx[12].statement;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "column-12");
    			attr_dev(div0, "id", "code-description-area");
    			add_location(div0, file$7, 242, 16, 7850);
    			attr_dev(div1, "class", "col-gapless columns");
    			add_location(div1, file$7, 241, 14, 7800);
    			attr_dev(div2, "class", "code-code column col-12");
    			attr_dev(div2, "id", "code-input-area");
    			add_location(div2, file$7, 249, 16, 8180);
    			attr_dev(div3, "class", "col-gapless columns");
    			add_location(div3, file$7, 248, 14, 8130);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file$7, 240, 12, 7762);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div4, t);
    			append_dev(div4, div3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*$viewStore*/ ctx[12].definition.description) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_9$1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*$viewStore, onfix, onerror, popup, onnewcontrolvalue*/ 1839136) {
    				each_value_1 = /*$viewStore*/ ctx[12].statement;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7$2.name,
    		type: "if",
    		source: "(240:12) {#if $viewStore.showingSql}",
    		ctx
    	});

    	return block;
    }

    // (268:16) {#if $viewStore.definition.description }
    function create_if_block_11$1(ctx) {
    	let div;
    	let raw_value = /*md*/ ctx[13].render("" + /*$viewStore*/ ctx[12].definition.description) + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$7, 268, 16, 9134);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$viewStore*/ 4096 && raw_value !== (raw_value = /*md*/ ctx[13].render("" + /*$viewStore*/ ctx[12].definition.description) + "")) div.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11$1.name,
    		type: "if",
    		source: "(268:16) {#if $viewStore.definition.description }",
    		ctx
    	});

    	return block;
    }

    // (284:18) {:else}
    function create_else_block_5(ctx) {
    	let parameter;
    	let updating_control;
    	let current;

    	function parameter_control_binding_2(value) {
    		/*parameter_control_binding_2*/ ctx[25].call(null, value, /*parameter*/ ctx[39]);
    	}

    	let parameter_props = {
    		onfix: /*onfix*/ ctx[19],
    		onerror: /*onerror*/ ctx[18],
    		onfocus,
    		onblur,
    		popup: /*popup*/ ctx[5],
    		parameter: /*parameter*/ ctx[39]
    	};

    	if (/*$viewStore*/ ctx[12].controls[/*parameter*/ ctx[39].name] !== void 0) {
    		parameter_props.control = /*$viewStore*/ ctx[12].controls[/*parameter*/ ctx[39].name];
    	}

    	parameter = new Parameter({ props: parameter_props, $$inline: true });
    	binding_callbacks.push(() => bind(parameter, "control", parameter_control_binding_2));
    	parameter.$on("newvalue", /*onnewcontrolvalue*/ ctx[20]);

    	const block = {
    		c: function create() {
    			create_component(parameter.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(parameter, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const parameter_changes = {};
    			if (dirty[0] & /*popup*/ 32) parameter_changes.popup = /*popup*/ ctx[5];
    			if (dirty[0] & /*$viewStore*/ 4096) parameter_changes.parameter = /*parameter*/ ctx[39];

    			if (!updating_control && dirty[0] & /*$viewStore*/ 4096) {
    				updating_control = true;
    				parameter_changes.control = /*$viewStore*/ ctx[12].controls[/*parameter*/ ctx[39].name];
    				add_flush_callback(() => updating_control = false);
    			}

    			parameter.$set(parameter_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(parameter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(parameter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(parameter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_5.name,
    		type: "else",
    		source: "(284:18) {:else}",
    		ctx
    	});

    	return block;
    }

    // (280:18) {#if parameter.type == "static"}
    function create_if_block_10$1(ctx) {
    	let label;
    	let parameter;
    	let updating_control;
    	let label_for_value;
    	let current;

    	function parameter_control_binding_1(value) {
    		/*parameter_control_binding_1*/ ctx[24].call(null, value, /*parameter*/ ctx[39]);
    	}

    	let parameter_props = {
    		onfix: /*onfix*/ ctx[19],
    		onerror: /*onerror*/ ctx[18],
    		onfocus,
    		onblur,
    		popup: /*popup*/ ctx[5],
    		parameter: /*parameter*/ ctx[39]
    	};

    	if (/*$viewStore*/ ctx[12].controls[/*parameter*/ ctx[39].name] !== void 0) {
    		parameter_props.control = /*$viewStore*/ ctx[12].controls[/*parameter*/ ctx[39].name];
    	}

    	parameter = new Parameter({ props: parameter_props, $$inline: true });
    	binding_callbacks.push(() => bind(parameter, "control", parameter_control_binding_1));
    	parameter.$on("newvalue", /*onnewcontrolvalue*/ ctx[20]);

    	const block = {
    		c: function create() {
    			label = element("label");
    			create_component(parameter.$$.fragment);
    			attr_dev(label, "class", "form-label");
    			attr_dev(label, "for", label_for_value = "input-" + /*parameter*/ ctx[39].name);
    			add_location(label, file$7, 280, 18, 9776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			mount_component(parameter, label, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const parameter_changes = {};
    			if (dirty[0] & /*popup*/ 32) parameter_changes.popup = /*popup*/ ctx[5];
    			if (dirty[0] & /*$viewStore*/ 4096) parameter_changes.parameter = /*parameter*/ ctx[39];

    			if (!updating_control && dirty[0] & /*$viewStore*/ 4096) {
    				updating_control = true;
    				parameter_changes.control = /*$viewStore*/ ctx[12].controls[/*parameter*/ ctx[39].name];
    				add_flush_callback(() => updating_control = false);
    			}

    			parameter.$set(parameter_changes);

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && label_for_value !== (label_for_value = "input-" + /*parameter*/ ctx[39].name)) {
    				attr_dev(label, "for", label_for_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(parameter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(parameter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			destroy_component(parameter);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10$1.name,
    		type: "if",
    		source: "(280:18) {#if parameter.type == \\\"static\\\"}",
    		ctx
    	});

    	return block;
    }

    // (274:14) {#each $viewStore.definition.parameters.filter(parameterIsAvailable($viewStore.controls)) as parameter}
    function create_each_block_3$1(ctx) {
    	let div2;
    	let div0;
    	let label;
    	let t0_value = /*parameter*/ ctx[39].name + "";
    	let t0;
    	let label_for_value;
    	let t1;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let t2;
    	let current;
    	const if_block_creators = [create_if_block_10$1, create_else_block_5];
    	const if_blocks = [];

    	function select_block_type_3(ctx, dirty) {
    		if (/*parameter*/ ctx[39].type == "static") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_3(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			if_block.c();
    			t2 = space();
    			attr_dev(label, "class", "form-label");
    			attr_dev(label, "for", label_for_value = "input-" + /*parameter*/ ctx[39].name);
    			add_location(label, file$7, 276, 18, 9546);
    			attr_dev(div0, "class", "column col-5 col-sm-12");
    			add_location(div0, file$7, 275, 16, 9491);
    			attr_dev(div1, "class", "column col-7 col-sm-12");
    			add_location(div1, file$7, 278, 16, 9670);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$7, 274, 14, 9450);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, label);
    			append_dev(label, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			append_dev(div2, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*$viewStore*/ 4096) && t0_value !== (t0_value = /*parameter*/ ctx[39].name + "")) set_data_dev(t0, t0_value);

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && label_for_value !== (label_for_value = "input-" + /*parameter*/ ctx[39].name)) {
    				attr_dev(label, "for", label_for_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_3(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div1, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(274:14) {#each $viewStore.definition.parameters.filter(parameterIsAvailable($viewStore.controls)) as parameter}",
    		ctx
    	});

    	return block;
    }

    // (244:18) {#if $viewStore.definition.description }
    function create_if_block_9$1(ctx) {
    	let div;
    	let raw_value = /*md*/ ctx[13].render("" + /*$viewStore*/ ctx[12].definition.description) + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file$7, 244, 18, 7978);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$viewStore*/ 4096 && raw_value !== (raw_value = /*md*/ ctx[13].render("" + /*$viewStore*/ ctx[12].definition.description) + "")) div.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9$1.name,
    		type: "if",
    		source: "(244:18) {#if $viewStore.definition.description }",
    		ctx
    	});

    	return block;
    }

    // (256:20) {:else}
    function create_else_block_3(ctx) {
    	let parameter;
    	let updating_control;
    	let current;

    	function parameter_control_binding(value) {
    		/*parameter_control_binding*/ ctx[23].call(null, value, /*item*/ ctx[36]);
    	}

    	let parameter_props = {
    		onfix: /*onfix*/ ctx[19],
    		onerror: /*onerror*/ ctx[18],
    		onfocus,
    		onblur,
    		popup: /*popup*/ ctx[5],
    		parameter: /*item*/ ctx[36]
    	};

    	if (/*$viewStore*/ ctx[12].controls[/*item*/ ctx[36].name] !== void 0) {
    		parameter_props.control = /*$viewStore*/ ctx[12].controls[/*item*/ ctx[36].name];
    	}

    	parameter = new Parameter({ props: parameter_props, $$inline: true });
    	binding_callbacks.push(() => bind(parameter, "control", parameter_control_binding));
    	parameter.$on("newvalue", /*onnewcontrolvalue*/ ctx[20]);

    	const block = {
    		c: function create() {
    			create_component(parameter.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(parameter, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const parameter_changes = {};
    			if (dirty[0] & /*popup*/ 32) parameter_changes.popup = /*popup*/ ctx[5];
    			if (dirty[0] & /*$viewStore*/ 4096) parameter_changes.parameter = /*item*/ ctx[36];

    			if (!updating_control && dirty[0] & /*$viewStore*/ 4096) {
    				updating_control = true;
    				parameter_changes.control = /*$viewStore*/ ctx[12].controls[/*item*/ ctx[36].name];
    				add_flush_callback(() => updating_control = false);
    			}

    			parameter.$set(parameter_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(parameter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(parameter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(parameter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(256:20) {:else}",
    		ctx
    	});

    	return block;
    }

    // (254:20) {#if typeof item == "string"}
    function create_if_block_8$2(ctx) {
    	let highlighter;
    	let current;

    	highlighter = new Highlighter({
    			props: {
    				parameters: /*$viewStore*/ ctx[12].definition.parameters,
    				item: /*item*/ ctx[36]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(highlighter.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(highlighter, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const highlighter_changes = {};
    			if (dirty[0] & /*$viewStore*/ 4096) highlighter_changes.parameters = /*$viewStore*/ ctx[12].definition.parameters;
    			if (dirty[0] & /*$viewStore*/ 4096) highlighter_changes.item = /*item*/ ctx[36];
    			highlighter.$set(highlighter_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(highlighter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(highlighter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(highlighter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8$2.name,
    		type: "if",
    		source: "(254:20) {#if typeof item == \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (253:20) {#each line as item}
    function create_each_block_2$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_8$2, create_else_block_3];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (typeof /*item*/ ctx[36] == "string") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(253:20) {#each line as item}",
    		ctx
    	});

    	return block;
    }

    // (251:18) {#each $viewStore.statement as line}
    function create_each_block_1$1(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value_2 = /*line*/ ctx[33];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr_dev(div, "class", "line");
    			add_location(div, file$7, 251, 18, 8312);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$viewStore, onfix, onerror, popup, onnewcontrolvalue*/ 1839136) {
    				each_value_2 = /*line*/ ctx[33];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(251:18) {#each $viewStore.statement as line}",
    		ctx
    	});

    	return block;
    }

    // (296:12) {#if $viewStore.asPopup}
    function create_if_block_6$2(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Cancel";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Select Empty Value";
    			attr_dev(button0, "class", "btn btn-link");
    			add_location(button0, file$7, 296, 12, 10649);
    			attr_dev(button1, "class", "btn");
    			add_location(button1, file$7, 297, 12, 10724);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*cancel*/ ctx[3])) /*cancel*/ ctx[3].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*empty*/ ctx[4])) /*empty*/ ctx[4].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$2.name,
    		type: "if",
    		source: "(296:12) {#if $viewStore.asPopup}",
    		ctx
    	});

    	return block;
    }

    // (306:10) {#if $viewStore.asPopup}
    function create_if_block_5$2(ctx) {
    	let div;
    	let resulttable;
    	let current;

    	resulttable = new ResultTable({
    			props: {
    				controls: /*$viewStore*/ ctx[12].controls,
    				pick: /*pick*/ ctx[0],
    				inPopup: true,
    				definition: /*$viewStore*/ ctx[12].definition,
    				result: /*$viewStore*/ ctx[12].result
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(resulttable.$$.fragment);
    			attr_dev(div, "class", "modal-body");
    			add_location(div, file$7, 306, 10, 11108);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(resulttable, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const resulttable_changes = {};
    			if (dirty[0] & /*$viewStore*/ 4096) resulttable_changes.controls = /*$viewStore*/ ctx[12].controls;
    			if (dirty[0] & /*pick*/ 1) resulttable_changes.pick = /*pick*/ ctx[0];
    			if (dirty[0] & /*$viewStore*/ 4096) resulttable_changes.definition = /*$viewStore*/ ctx[12].definition;
    			if (dirty[0] & /*$viewStore*/ 4096) resulttable_changes.result = /*$viewStore*/ ctx[12].result;
    			resulttable.$set(resulttable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(resulttable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(resulttable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(resulttable);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$2.name,
    		type: "if",
    		source: "(306:10) {#if $viewStore.asPopup}",
    		ctx
    	});

    	return block;
    }

    // (316:4) {#if $viewStore.showingDownload}
    function create_if_block_2$2(ctx) {
    	let div6;
    	let a0;
    	let t1;
    	let div5;
    	let div1;
    	let a1;
    	let t3;
    	let div0;
    	let show_if_1;
    	let t4;
    	let div3;
    	let div2;
    	let show_if;
    	let t5;
    	let div4;
    	let a2;
    	let mounted;
    	let dispose;

    	function select_block_type_4(ctx, dirty) {
    		if (show_if_1 == null || dirty[0] & /*$viewStore*/ 4096) show_if_1 = !!getDownloads(/*$viewStore*/ ctx[12].result).length;
    		if (show_if_1) return create_if_block_4$2;
    		return create_else_block_2$1;
    	}

    	let current_block_type = select_block_type_4(ctx, [-1]);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_5(ctx, dirty) {
    		if (show_if == null || dirty[0] & /*$viewStore*/ 4096) show_if = !!getDownloads(/*$viewStore*/ ctx[12].result).length;
    		if (show_if) return create_if_block_3$2;
    		return create_else_block_1$2;
    	}

    	let current_block_type_1 = select_block_type_5(ctx, [-1]);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			a0 = element("a");
    			a0.textContent = " ";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			a1 = element("a");
    			a1.textContent = " ";
    			t3 = space();
    			div0 = element("div");
    			if_block0.c();
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			if_block1.c();
    			t5 = space();
    			div4 = element("div");
    			a2 = element("a");
    			a2.textContent = "Cancel";
    			attr_dev(a0, "href", "#close");
    			attr_dev(a0, "class", "modal-overlay");
    			attr_dev(a0, "aria-label", "Close");
    			add_location(a0, file$7, 317, 6, 11440);
    			attr_dev(a1, "href", "#close");
    			attr_dev(a1, "class", "btn btn-clear float-right");
    			attr_dev(a1, "aria-label", "Close");
    			add_location(a1, file$7, 320, 10, 11631);
    			attr_dev(div0, "class", "modal-title h5");
    			add_location(div0, file$7, 321, 10, 11763);
    			attr_dev(div1, "class", "modal-header");
    			add_location(div1, file$7, 319, 8, 11594);
    			attr_dev(div2, "class", "content");
    			set_style(div2, "min-height", "2rem");
    			add_location(div2, file$7, 330, 10, 12036);
    			attr_dev(div3, "class", "modal-body");
    			add_location(div3, file$7, 329, 8, 12001);
    			attr_dev(a2, "href", "#close");
    			attr_dev(a2, "aria-label", "Close");
    			add_location(a2, file$7, 343, 10, 12547);
    			attr_dev(div4, "class", "modal-footer");
    			add_location(div4, file$7, 342, 8, 12510);
    			attr_dev(div5, "class", "modal-container");
    			add_location(div5, file$7, 318, 6, 11556);
    			attr_dev(div6, "class", "modal active");
    			attr_dev(div6, "id", "modal-id");
    			add_location(div6, file$7, 316, 4, 11393);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, a0);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div1);
    			append_dev(div1, a1);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			if_block0.m(div0, null);
    			append_dev(div5, t4);
    			append_dev(div5, div3);
    			append_dev(div3, div2);
    			if_block1.m(div2, null);
    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			append_dev(div4, a2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						a0,
    						"click",
    						prevent_default(function () {
    							if (is_function(/*cancelDownload*/ ctx[2])) /*cancelDownload*/ ctx[2].apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					),
    					listen_dev(
    						a1,
    						"click",
    						prevent_default(function () {
    							if (is_function(/*cancelDownload*/ ctx[2])) /*cancelDownload*/ ctx[2].apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					),
    					listen_dev(
    						a2,
    						"click",
    						prevent_default(function () {
    							if (is_function(/*cancelDownload*/ ctx[2])) /*cancelDownload*/ ctx[2].apply(this, arguments);
    						}),
    						false,
    						true,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type !== (current_block_type = select_block_type_4(ctx, dirty))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_5(ctx, dirty)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(316:4) {#if $viewStore.showingDownload}",
    		ctx
    	});

    	return block;
    }

    // (325:12) {:else}
    function create_else_block_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Preparing downloads");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$1.name,
    		type: "else",
    		source: "(325:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (323:12) {#if getDownloads($viewStore.result).length }
    function create_if_block_4$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Please select a download");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(323:12) {#if getDownloads($viewStore.result).length }",
    		ctx
    	});

    	return block;
    }

    // (336:12) {:else}
    function create_else_block_1$2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "🕓";
    			set_style(div, "text-align", "center");
    			set_style(div, "font-size", "144pt");
    			add_location(div, file$7, 336, 14, 12360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(336:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (332:12) {#if getDownloads($viewStore.result).length }
    function create_if_block_3$2(ctx) {
    	let each_1_anchor;
    	let each_value = getDownloads(/*$viewStore*/ ctx[12].result);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*runDownload, $viewStore*/ 2101248) {
    				each_value = getDownloads(/*$viewStore*/ ctx[12].result);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(332:12) {#if getDownloads($viewStore.result).length }",
    		ctx
    	});

    	return block;
    }

    // (333:14) {#each getDownloads($viewStore.result) as link}
    function create_each_block$4(ctx) {
    	let a;
    	let t_value = /*link*/ ctx[30].type + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", "#download");
    			add_location(a, file$7, 333, 16, 12219);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					a,
    					"click",
    					prevent_default(function () {
    						if (is_function(/*runDownload*/ ctx[21](/*link*/ ctx[30].type))) /*runDownload*/ ctx[21](/*link*/ ctx[30].type).apply(this, arguments);
    					}),
    					false,
    					true,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$viewStore*/ 4096 && t_value !== (t_value = /*link*/ ctx[30].type + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(333:14) {#each getDownloads($viewStore.result) as link}",
    		ctx
    	});

    	return block;
    }

    // (350:4) {#if !$viewStore.asPopup}
    function create_if_block_1$2(ctx) {
    	let mainlinks;
    	let t;
    	let div;
    	let resulttable;
    	let div_class_value;
    	let current;

    	mainlinks = new MainLinks({
    			props: {
    				links: /*$viewStore*/ ctx[12].definition.links,
    				controls: /*$viewStore*/ ctx[12].controls,
    				result: /*$viewStore*/ ctx[12].result
    			},
    			$$inline: true
    		});

    	resulttable = new ResultTable({
    			props: {
    				showDownloads: /*showDownloads*/ ctx[7],
    				controls: /*$viewStore*/ ctx[12].controls,
    				inPopup: false,
    				definition: /*$viewStore*/ ctx[12].definition,
    				result: /*$viewStore*/ ctx[12].result
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(mainlinks.$$.fragment);
    			t = space();
    			div = element("div");
    			create_component(resulttable.$$.fragment);
    			set_style(div, "margin-top", "3em");
    			attr_dev(div, "class", div_class_value = /*$viewStore*/ ctx[12].asPopup ? "in-popup" : "");
    			add_location(div, file$7, 355, 4, 12861);
    		},
    		m: function mount(target, anchor) {
    			mount_component(mainlinks, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(resulttable, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const mainlinks_changes = {};
    			if (dirty[0] & /*$viewStore*/ 4096) mainlinks_changes.links = /*$viewStore*/ ctx[12].definition.links;
    			if (dirty[0] & /*$viewStore*/ 4096) mainlinks_changes.controls = /*$viewStore*/ ctx[12].controls;
    			if (dirty[0] & /*$viewStore*/ 4096) mainlinks_changes.result = /*$viewStore*/ ctx[12].result;
    			mainlinks.$set(mainlinks_changes);
    			const resulttable_changes = {};
    			if (dirty[0] & /*showDownloads*/ 128) resulttable_changes.showDownloads = /*showDownloads*/ ctx[7];
    			if (dirty[0] & /*$viewStore*/ 4096) resulttable_changes.controls = /*$viewStore*/ ctx[12].controls;
    			if (dirty[0] & /*$viewStore*/ 4096) resulttable_changes.definition = /*$viewStore*/ ctx[12].definition;
    			if (dirty[0] & /*$viewStore*/ 4096) resulttable_changes.result = /*$viewStore*/ ctx[12].result;
    			resulttable.$set(resulttable_changes);

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && div_class_value !== (div_class_value = /*$viewStore*/ ctx[12].asPopup ? "in-popup" : "")) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(mainlinks.$$.fragment, local);
    			transition_in(resulttable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(mainlinks.$$.fragment, local);
    			transition_out(resulttable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(mainlinks, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			destroy_component(resulttable);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(350:4) {#if !$viewStore.asPopup}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div3;
    	let a0;
    	let t1;
    	let div1;
    	let div0;
    	let t3;
    	let ul;
    	let div1_class_value;
    	let t4;
    	let a1;
    	let t6;
    	let div2;
    	let current_block_type_index;
    	let if_block;
    	let t7;
    	let div5;
    	let div4;
    	let div5_class_value;
    	let t9;
    	let div15;
    	let a2;
    	let t10;
    	let div14;
    	let div7;
    	let a3;
    	let t11;
    	let div6;
    	let t13;
    	let div13;
    	let div12;
    	let div11;
    	let div10;
    	let div8;
    	let label0;
    	let input0;
    	let input0_checked_value;
    	let t14;
    	let i0;
    	let t15;
    	let t16;
    	let div9;
    	let label1;
    	let input1;
    	let input1_checked_value;
    	let t17;
    	let i1;
    	let t18;
    	let div15_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_4 = /*$viewStore*/ ctx[12].menu || [];
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const if_block_creators = [create_if_block$3, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$viewStore*/ ctx[12].showingMenu) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			a0 = element("a");
    			a0.textContent = "☰";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "eSQLate";
    			t3 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			a1 = element("a");
    			a1.textContent = " ";
    			t6 = space();
    			div2 = element("div");
    			if_block.c();
    			t7 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "🕓";
    			t9 = space();
    			div15 = element("div");
    			a2 = element("a");
    			t10 = space();
    			div14 = element("div");
    			div7 = element("div");
    			a3 = element("a");
    			t11 = space();
    			div6 = element("div");
    			div6.textContent = "Display Configuration";
    			t13 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t14 = space();
    			i0 = element("i");
    			t15 = text("SQL - Show the detail of the SQL to be executed (instead of just the field names / values).");
    			t16 = space();
    			div9 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t17 = space();
    			i1 = element("i");
    			t18 = text("Extended Display - Display result set as one row per field, useful for really wide result sets.");
    			attr_dev(a0, "class", "off-canvas-toggle btn btn-link");
    			attr_dev(a0, "href", "#sidebar-id");
    			add_location(a0, file$7, 169, 2, 4917);
    			attr_dev(div0, "id", "logo");
    			add_location(div0, file$7, 177, 4, 5177);
    			attr_dev(ul, "id", "menu");
    			add_location(ul, file$7, 178, 4, 5210);
    			attr_dev(div1, "id", "sidebar-id");

    			attr_dev(div1, "class", div1_class_value = /*sidebarActive*/ ctx[10] || /*$viewStore*/ ctx[12].showingMenu
    			? "off-canvas-sidebar active"
    			: "off-canvas-sidebar");

    			add_location(div1, file$7, 176, 2, 5046);
    			attr_dev(a1, "class", "off-canvas-overlay");
    			attr_dev(a1, "href", "#close");
    			add_location(a1, file$7, 189, 2, 5425);
    			attr_dev(div2, "class", "off-canvas-content");
    			add_location(div2, file$7, 194, 2, 5534);
    			attr_dev(div3, "class", "off-canvas");
    			toggle_class(div3, "showing-menu", /*$viewStore*/ ctx[12].showingMenu);
    			toggle_class(div3, "extended-display", /*$viewStore*/ ctx[12].showingExtendedDisplay);
    			add_location(div3, file$7, 163, 0, 4740);
    			attr_dev(div4, "id", "loading-modal-content");
    			add_location(div4, file$7, 364, 2, 13226);

    			attr_dev(div5, "class", div5_class_value = /*$viewStore*/ ctx[12].loading
    			? "modal active"
    			: "modal");

    			attr_dev(div5, "id", "loading-modal");
    			add_location(div5, file$7, 363, 0, 13144);
    			attr_dev(a2, "href", "#close");
    			attr_dev(a2, "class", "modal-overlay");
    			attr_dev(a2, "aria-label", "Close");
    			add_location(a2, file$7, 371, 2, 13342);
    			attr_dev(a3, "href", "#close");
    			attr_dev(a3, "class", "btn btn-clear float-right");
    			attr_dev(a3, "aria-label", "Close");
    			add_location(a3, file$7, 374, 6, 13512);
    			attr_dev(div6, "class", "modal-title h5");
    			add_location(div6, file$7, 375, 6, 13631);
    			attr_dev(div7, "class", "modal-header");
    			add_location(div7, file$7, 373, 4, 13479);
    			attr_dev(input0, "type", "checkbox");
    			input0.checked = input0_checked_value = /*$viewStore*/ ctx[12].showingSql ? "checked" : "";
    			add_location(input0, file$7, 383, 16, 13917);
    			attr_dev(i0, "class", "form-icon");
    			add_location(i0, file$7, 384, 16, 14034);
    			attr_dev(label0, "class", "form-switch");
    			add_location(label0, file$7, 382, 14, 13873);
    			attr_dev(div8, "class", "column col-12");
    			add_location(div8, file$7, 381, 12, 13831);
    			attr_dev(input1, "type", "checkbox");

    			input1.checked = input1_checked_value = /*$viewStore*/ ctx[12].showingExtendedDisplay
    			? "checked"
    			: "";

    			add_location(input1, file$7, 389, 16, 14291);
    			attr_dev(i1, "class", "form-icon");
    			add_location(i1, file$7, 390, 16, 14432);
    			attr_dev(label1, "class", "form-switch");
    			add_location(label1, file$7, 388, 14, 14247);
    			attr_dev(div9, "class", "column col-12");
    			add_location(div9, file$7, 387, 12, 14205);
    			attr_dev(div10, "class", "columns");
    			add_location(div10, file$7, 380, 10, 13797);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file$7, 379, 8, 13763);
    			attr_dev(div12, "class", "content");
    			add_location(div12, file$7, 378, 6, 13733);
    			attr_dev(div13, "class", "modal-body");
    			add_location(div13, file$7, 377, 4, 13702);
    			attr_dev(div14, "class", "modal-container");
    			add_location(div14, file$7, 372, 2, 13445);
    			attr_dev(div15, "class", div15_class_value = /*configActive*/ ctx[11] ? "modal active" : "modal");
    			add_location(div15, file$7, 370, 0, 13284);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, a0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t3);
    			append_dev(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div3, t4);
    			append_dev(div3, a1);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			if_blocks[current_block_type_index].m(div2, null);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div15, anchor);
    			append_dev(div15, a2);
    			append_dev(div15, t10);
    			append_dev(div15, div14);
    			append_dev(div14, div7);
    			append_dev(div7, a3);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div14, t13);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div8, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t14);
    			append_dev(label0, i0);
    			append_dev(label0, t15);
    			append_dev(div10, t16);
    			append_dev(div10, div9);
    			append_dev(div9, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t17);
    			append_dev(label1, i1);
    			append_dev(label1, t18);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", prevent_default(/*showSidebar*/ ctx[14]), false, true, false),
    					listen_dev(a1, "click", prevent_default(/*hideSidebar*/ ctx[15]), false, true, false),
    					listen_dev(a2, "click", prevent_default(/*hideConfig*/ ctx[17]), false, true, false),
    					listen_dev(a3, "click", prevent_default(/*hideConfig*/ ctx[17]), false, true, false),
    					listen_dev(
    						input0,
    						"click",
    						function () {
    							if (is_function(/*toggleShowingSql*/ ctx[8])) /*toggleShowingSql*/ ctx[8].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						input1,
    						"click",
    						function () {
    							if (is_function(/*toggleShowingExtendedDisplay*/ ctx[9])) /*toggleShowingExtendedDisplay*/ ctx[9].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*$viewStore, hideSidebar*/ 36864) {
    				each_value_4 = /*$viewStore*/ ctx[12].menu || [];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}

    			if (!current || dirty[0] & /*sidebarActive, $viewStore*/ 5120 && div1_class_value !== (div1_class_value = /*sidebarActive*/ ctx[10] || /*$viewStore*/ ctx[12].showingMenu
    			? "off-canvas-sidebar active"
    			: "off-canvas-sidebar")) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div2, null);
    			}

    			if (dirty[0] & /*$viewStore*/ 4096) {
    				toggle_class(div3, "showing-menu", /*$viewStore*/ ctx[12].showingMenu);
    			}

    			if (dirty[0] & /*$viewStore*/ 4096) {
    				toggle_class(div3, "extended-display", /*$viewStore*/ ctx[12].showingExtendedDisplay);
    			}

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && div5_class_value !== (div5_class_value = /*$viewStore*/ ctx[12].loading
    			? "modal active"
    			: "modal")) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && input0_checked_value !== (input0_checked_value = /*$viewStore*/ ctx[12].showingSql ? "checked" : "")) {
    				prop_dev(input0, "checked", input0_checked_value);
    			}

    			if (!current || dirty[0] & /*$viewStore*/ 4096 && input1_checked_value !== (input1_checked_value = /*$viewStore*/ ctx[12].showingExtendedDisplay
    			? "checked"
    			: "")) {
    				prop_dev(input1, "checked", input1_checked_value);
    			}

    			if (!current || dirty[0] & /*configActive*/ 2048 && div15_class_value !== (div15_class_value = /*configActive*/ ctx[11] ? "modal active" : "modal")) {
    				attr_dev(div15, "class", div15_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div15);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function resetStylesheet(name) {
    	let styleEl = document.getElementById(name);

    	if (!styleEl) {
    		const head = document.head || document.getElementsByTagName("head")[0];
    		styleEl = document.createElement("style");
    		styleEl.id = name;
    		head.appendChild(styleEl);
    	}

    	while (styleEl.sheet.rules.length > 0) {
    		styleEl.sheet.removeRule(0);
    	}

    	return styleEl.sheet;
    }

    function onfocus({ target }) {
    	const stylesheet = resetStylesheet("onblur-onfocus-style");
    	let flds = JSON.parse(target && target.dataset && target.dataset.highlightFields || "[]");

    	if (flds.length == 0) {
    		flds = [target.name];
    	}

    	flds.forEach(fld => {
    		stylesheet.insertRule(`.field_highlight[data-field="${fld}"] { font-weight: bold; color: black; }`);
    	});
    }

    function onblur({ target }) {
    	resetStylesheet("onblur-onfocus-style");
    }

    function buttonClass(statementType) {
    	switch (statementType) {
    		case "INSERT":
    		case "DELETE":
    		case "UPDATE":
    			return "btn-error";
    		case "SELECT":
    			return "btn-success";
    	}

    	return "";
    }

    function getDownloads(result) {
    	if (result && result.full_format_urls && result.full_format_urls.length) {
    		return result.full_format_urls;
    	}

    	return [];
    }

    function parameterIsAvailable(controls) {
    	return p => {
    		return controls.hasOwnProperty(p.name);
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $viewStore,
    		$$unsubscribe_viewStore = noop,
    		$$subscribe_viewStore = () => ($$unsubscribe_viewStore(), $$unsubscribe_viewStore = subscribe(viewStore, $$value => $$invalidate(12, $viewStore = $$value)), viewStore);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_viewStore());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { pick } = $$props;
    	let { run } = $$props;
    	let { cancelDownload } = $$props;
    	let { cancel } = $$props;
    	let { empty } = $$props;
    	let { popup } = $$props;
    	let { viewStore } = $$props;
    	validate_store(viewStore, "viewStore");
    	$$subscribe_viewStore();
    	let { download } = $$props;
    	let { showDownloads } = $$props;
    	let { toggleShowingSql } = $$props;
    	let { toggleShowingExtendedDisplay } = $$props;
    	let getColorCache = new Map();

    	function getColor(s) {
    		if (getColorCache.has(s)) {
    			return getColorCache.get(s);
    		}

    		

    		let r = Array.from(document.querySelectorAll(`#color-finder-${s}`)).reduce(
    			(acc, el) => {
    				return window.getComputedStyle(el).color;
    			},
    			null
    		);

    		if (r != null) {
    			getColorCache.set(s, r);
    		}

    		return r;
    	}

    	let md = new window.markdownit();
    	let sidebarActive = false;

    	function showSidebar() {
    		$$invalidate(10, sidebarActive = true);
    	}

    	function hideSidebar() {
    		$$invalidate(10, sidebarActive = false);
    	}

    	let configActive = false;

    	function showConfig() {
    		$$invalidate(11, configActive = true);
    	}

    	function hideConfig() {
    		$$invalidate(11, configActive = false);
    	}

    	let errorFields = new Map();

    	function redrawErrorStylesheet() {
    		const stylesheet = resetStylesheet("onerror");
    		const allErrors = new Set();

    		for (const [name, set] of errorFields) {
    			let addedError = false;

    			for (const s of set) {
    				allErrors.add(s);

    				if (!addedError) {
    					stylesheet.insertRule(`.input-popup[data-parameter-name="${name}"], input[data-parameter-name="${name}"], select[data-parameter-name="${name}"] { border-color:${getColor("error")} !important; }`);
    					addedError = true;
    				}
    			}
    		}

    		for (const errorField of allErrors) {
    			stylesheet.insertRule(`.field_highlight[data-field="${errorField}"] { color: ${getColor("error")} !important; }`);
    		}
    	}

    	function onerror(name, highlightFields) {
    		if (!errorFields.has(name)) {
    			errorFields.set(name, new Set());
    		}

    		(highlightFields || [name]).forEach(hf => {
    			errorFields.get(name).add(hf);
    		});

    		redrawErrorStylesheet();
    	}

    	function onfix(name, highlightFields) {
    		(highlightFields || [name]).forEach(hf => {
    			errorFields.get(name) && errorFields.get(name).delete(hf);
    		});

    		redrawErrorStylesheet();
    	}

    	function onnewcontrolvalue({ detail: { name, control } }) {
    		viewStore.update(vs => {
    			return {
    				...vs,
    				controls: { ...vs.controls, [name]: { ...control } }
    			};
    		});
    	}

    	function runDownload(mimeType) {
    		return () => download(mimeType);
    	}

    	afterUpdate(() => {
    		if (get_store_value(viewStore).definition && get_store_value(viewStore).definition.title) {
    			window.document.title = `eSQLate: ${get_store_value(viewStore).definition.title}`;
    		}

    		if (get_store_value(viewStore).loading) {
    			setTimeout(
    				() => {
    					if (get_store_value(viewStore).loading) {
    						document.getElementById("loading-modal").classList.add("loading-notification");
    					}
    				},
    				250
    			);
    		} else {
    			document.getElementById("loading-modal").classList.remove("loading-notification");
    		}
    	});

    	const writable_props = [
    		"pick",
    		"run",
    		"cancelDownload",
    		"cancel",
    		"empty",
    		"popup",
    		"viewStore",
    		"download",
    		"showDownloads",
    		"toggleShowingSql",
    		"toggleShowingExtendedDisplay"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function parameter_control_binding(value, item) {
    		$viewStore.controls[item.name] = value;
    		viewStore.set($viewStore);
    	}

    	function parameter_control_binding_1(value, parameter) {
    		$viewStore.controls[parameter.name] = value;
    		viewStore.set($viewStore);
    	}

    	function parameter_control_binding_2(value, parameter) {
    		$viewStore.controls[parameter.name] = value;
    		viewStore.set($viewStore);
    	}

    	$$self.$$set = $$props => {
    		if ("pick" in $$props) $$invalidate(0, pick = $$props.pick);
    		if ("run" in $$props) $$invalidate(1, run = $$props.run);
    		if ("cancelDownload" in $$props) $$invalidate(2, cancelDownload = $$props.cancelDownload);
    		if ("cancel" in $$props) $$invalidate(3, cancel = $$props.cancel);
    		if ("empty" in $$props) $$invalidate(4, empty = $$props.empty);
    		if ("popup" in $$props) $$invalidate(5, popup = $$props.popup);
    		if ("viewStore" in $$props) $$subscribe_viewStore($$invalidate(6, viewStore = $$props.viewStore));
    		if ("download" in $$props) $$invalidate(22, download = $$props.download);
    		if ("showDownloads" in $$props) $$invalidate(7, showDownloads = $$props.showDownloads);
    		if ("toggleShowingSql" in $$props) $$invalidate(8, toggleShowingSql = $$props.toggleShowingSql);
    		if ("toggleShowingExtendedDisplay" in $$props) $$invalidate(9, toggleShowingExtendedDisplay = $$props.toggleShowingExtendedDisplay);
    	};

    	$$self.$capture_state = () => ({
    		getHightlightPositions: ui_3,
    		getHightlightString: ui_1,
    		afterUpdate,
    		getStoreValue: get_store_value,
    		ResultTable,
    		Parameter,
    		Highlighter,
    		MainLinks,
    		pick,
    		run,
    		cancelDownload,
    		cancel,
    		empty,
    		popup,
    		viewStore,
    		download,
    		showDownloads,
    		toggleShowingSql,
    		toggleShowingExtendedDisplay,
    		getColorCache,
    		getColor,
    		md,
    		sidebarActive,
    		showSidebar,
    		hideSidebar,
    		configActive,
    		showConfig,
    		hideConfig,
    		resetStylesheet,
    		onfocus,
    		onblur,
    		errorFields,
    		redrawErrorStylesheet,
    		onerror,
    		onfix,
    		onnewcontrolvalue,
    		buttonClass,
    		getDownloads,
    		runDownload,
    		parameterIsAvailable,
    		$viewStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("pick" in $$props) $$invalidate(0, pick = $$props.pick);
    		if ("run" in $$props) $$invalidate(1, run = $$props.run);
    		if ("cancelDownload" in $$props) $$invalidate(2, cancelDownload = $$props.cancelDownload);
    		if ("cancel" in $$props) $$invalidate(3, cancel = $$props.cancel);
    		if ("empty" in $$props) $$invalidate(4, empty = $$props.empty);
    		if ("popup" in $$props) $$invalidate(5, popup = $$props.popup);
    		if ("viewStore" in $$props) $$subscribe_viewStore($$invalidate(6, viewStore = $$props.viewStore));
    		if ("download" in $$props) $$invalidate(22, download = $$props.download);
    		if ("showDownloads" in $$props) $$invalidate(7, showDownloads = $$props.showDownloads);
    		if ("toggleShowingSql" in $$props) $$invalidate(8, toggleShowingSql = $$props.toggleShowingSql);
    		if ("toggleShowingExtendedDisplay" in $$props) $$invalidate(9, toggleShowingExtendedDisplay = $$props.toggleShowingExtendedDisplay);
    		if ("getColorCache" in $$props) getColorCache = $$props.getColorCache;
    		if ("md" in $$props) $$invalidate(13, md = $$props.md);
    		if ("sidebarActive" in $$props) $$invalidate(10, sidebarActive = $$props.sidebarActive);
    		if ("configActive" in $$props) $$invalidate(11, configActive = $$props.configActive);
    		if ("errorFields" in $$props) errorFields = $$props.errorFields;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		pick,
    		run,
    		cancelDownload,
    		cancel,
    		empty,
    		popup,
    		viewStore,
    		showDownloads,
    		toggleShowingSql,
    		toggleShowingExtendedDisplay,
    		sidebarActive,
    		configActive,
    		$viewStore,
    		md,
    		showSidebar,
    		hideSidebar,
    		showConfig,
    		hideConfig,
    		onerror,
    		onfix,
    		onnewcontrolvalue,
    		runDownload,
    		download,
    		parameter_control_binding,
    		parameter_control_binding_1,
    		parameter_control_binding_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$7,
    			create_fragment$7,
    			safe_not_equal,
    			{
    				pick: 0,
    				run: 1,
    				cancelDownload: 2,
    				cancel: 3,
    				empty: 4,
    				popup: 5,
    				viewStore: 6,
    				download: 22,
    				showDownloads: 7,
    				toggleShowingSql: 8,
    				toggleShowingExtendedDisplay: 9
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pick*/ ctx[0] === undefined && !("pick" in props)) {
    			console.warn("<App> was created without expected prop 'pick'");
    		}

    		if (/*run*/ ctx[1] === undefined && !("run" in props)) {
    			console.warn("<App> was created without expected prop 'run'");
    		}

    		if (/*cancelDownload*/ ctx[2] === undefined && !("cancelDownload" in props)) {
    			console.warn("<App> was created without expected prop 'cancelDownload'");
    		}

    		if (/*cancel*/ ctx[3] === undefined && !("cancel" in props)) {
    			console.warn("<App> was created without expected prop 'cancel'");
    		}

    		if (/*empty*/ ctx[4] === undefined && !("empty" in props)) {
    			console.warn("<App> was created without expected prop 'empty'");
    		}

    		if (/*popup*/ ctx[5] === undefined && !("popup" in props)) {
    			console.warn("<App> was created without expected prop 'popup'");
    		}

    		if (/*viewStore*/ ctx[6] === undefined && !("viewStore" in props)) {
    			console.warn("<App> was created without expected prop 'viewStore'");
    		}

    		if (/*download*/ ctx[22] === undefined && !("download" in props)) {
    			console.warn("<App> was created without expected prop 'download'");
    		}

    		if (/*showDownloads*/ ctx[7] === undefined && !("showDownloads" in props)) {
    			console.warn("<App> was created without expected prop 'showDownloads'");
    		}

    		if (/*toggleShowingSql*/ ctx[8] === undefined && !("toggleShowingSql" in props)) {
    			console.warn("<App> was created without expected prop 'toggleShowingSql'");
    		}

    		if (/*toggleShowingExtendedDisplay*/ ctx[9] === undefined && !("toggleShowingExtendedDisplay" in props)) {
    			console.warn("<App> was created without expected prop 'toggleShowingExtendedDisplay'");
    		}
    	}

    	get pick() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pick(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get run() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set run(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cancelDownload() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cancelDownload(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cancel() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cancel(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get empty() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set empty(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get popup() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set popup(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewStore() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewStore(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get download() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set download(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showDownloads() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showDownloads(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleShowingSql() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleShowingSql(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleShowingExtendedDisplay() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleShowingExtendedDisplay(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var dist = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    function waitForImpl(repeatEvery, finishRepeatUntil, getTime, f, getNewDelay) {
        var requestStartTime = getTime();
        var attempts = 0;
        var inProgress = false;
        return new Promise(function (resolve, reject) {
            function caller() {
                requestStartTime = getTime();
                inProgress = true;
                attempts = attempts + 1;
                try {
                    f().then(function (r) {
                        inProgress = false;
                        if (r.complete) {
                            finishRepeatUntil(interval);
                            return resolve(r.value);
                        }
                    }).catch(function (e) {
                        finishRepeatUntil(interval);
                        reject(e);
                    });
                }
                catch (e) {
                    finishRepeatUntil(interval);
                    reject(e);
                }
            }
            caller();
            var interval = repeatEvery(function () {
                if (inProgress) {
                    return;
                }
                if (getTime() - requestStartTime > getNewDelay(attempts)) {
                    caller();
                }
            }, 10);
        });
    }
    exports.waitForImpl = waitForImpl;
    function waitFor(f, getNewDelay) {
        return waitForImpl(setInterval, clearTimeout, function () { return new Date().getTime(); }, f, getNewDelay);
    }
    exports.waitFor = waitFor;
    exports.default = waitFor;
    });

    unwrapExports(dist);
    var dist_1 = dist.waitForImpl;
    var dist_2 = dist.waitFor;

    var getFullUrlFromResponseUrl_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getFullUrlFromResponseUrl = void 0;
    function getFullUrlFromResponseUrl(apiRoot, responseUrl) {
        // It may be full...
        try {
            return new URL(responseUrl).href;
        }
        catch (_e) { }
        // May not include the protocol
        const apiRootUrl = new URL(apiRoot);
        if (responseUrl.substring(0, 2) == "//") {
            return apiRootUrl.protocol + responseUrl;
        }
        // May be an absolute path
        if (responseUrl.substring(0, 1) == "/") {
            return apiRoot.replace(/\/$/, '') + responseUrl;
            // return apiRootUrl.protocol + "//" + apiRootUrl.hostname +
            // (apiRootUrl.port ? ":" + apiRootUrl.port : "") +
            // responseUrl;
        }
        // Or something else...
        throw new Error("Cannot handle location for: " + responseUrl);
    }
    exports.getFullUrlFromResponseUrl = getFullUrlFromResponseUrl;
    });

    unwrapExports(getFullUrlFromResponseUrl_1);
    var getFullUrlFromResponseUrl_2 = getFullUrlFromResponseUrl_1.getFullUrlFromResponseUrl;

    var io = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.errorHandler = exports.postRequest = exports.getRequest = exports.getApiRoot = exports.getURLSearchParams = void 0;

    function getURLSearchParams() {
        return new URLSearchParams(window.location.hash.replace(/.*\?/, ''));
    }
    exports.getURLSearchParams = getURLSearchParams;
    function getApiRoot() {
        const bodyElement = document.querySelector("body");
        const url = bodyElement.dataset.apiServer.replace(/\/$/, '');
        if (!url.match(/https?:/)) {
            return getFullUrlFromResponseUrl_1.getFullUrlFromResponseUrl(window.location.origin, url);
        }
        return url;
    }
    exports.getApiRoot = getApiRoot;
    function throwOnInvalidStatusCodes(apiUrl, resp) {
        if ((resp.status < 200) || (resp.status >= 300)) {
            throw new Error(`HTTP Request to ${apiUrl} returned status code ` +
                `${resp.status} but I was expecting something in the ` +
                `200 range`);
        }
        return resp;
    }
    function getRequest(apiUrl) {
        const url = getFullUrlFromResponseUrl_1.getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
        const opts = {
            mode: "cors",
            cache: "no-cache",
            headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
        };
        return fetch(url, opts)
            .then(throwOnInvalidStatusCodes.bind(null, apiUrl));
    }
    exports.getRequest = getRequest;
    function postRequest(apiUrl, data) {
        const url = getFullUrlFromResponseUrl_1.getFullUrlFromResponseUrl(getApiRoot(), apiUrl);
        const opts = {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: { "x-no-redirect": "1", "Content-Type": "application/json" },
            body: JSON.stringify(data)
        };
        return fetch(url, opts)
            .then(throwOnInvalidStatusCodes.bind(null, apiUrl));
    }
    exports.postRequest = postRequest;
    function errorHandler(e) {
        alert(e.message);
    }
    exports.errorHandler = errorHandler;
    });

    unwrapExports(io);
    var io_1 = io.errorHandler;
    var io_2 = io.postRequest;
    var io_3 = io.getRequest;
    var io_4 = io.getApiRoot;
    var io_5 = io.getURLSearchParams;

    var middleware = createCommonjsModule(function (module, exports) {
    var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.loadResults = exports.getLoadDefinition = exports.getInitilizeControls = exports.resultDemandHTTP = exports.loadDefinitionHTTP = exports.getInitialViewStore = void 0;




    function getInitialViewStore() {
        return {
            showingSql: true,
            showingMenu: false,
            loading: false,
            showingDownload: false,
            definition: {
                description: "",
                name: "",
                parameters: [],
                links: [],
                row_links: [],
                statement: "",
                title: "",
            },
            statement: [],
            result: false,
            controls: {},
            asPopup: false,
            menu: [],
        };
    }
    exports.getInitialViewStore = getInitialViewStore;
    function loadDefinitionHTTP(definitionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `/definition/${definitionName}`;
            const resp = yield io.getRequest(url);
            return yield resp.json();
        });
    }
    exports.loadDefinitionHTTP = loadDefinitionHTTP;
    function resultDemandHTTP(definitionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = { "arguments": [] };
            const url = `/demand/${definitionName}`;
            return io.postRequest(url, data)
                .then(resp => resp.json());
        });
    }
    exports.resultDemandHTTP = resultDemandHTTP;
    function getInitilizeControls(viewStore, getURLSearchParams, cacheSuccessResultForSelect) {
        return function loadDefinition(ctx) {
            return __awaiter(this, void 0, void 0, function* () {
                const definition = ctx.definition;
                const selects = definition.parameters.filter((p) => {
                    return p.type == "select";
                });
                const options = yield Promise.all(selects.map((parameter) => {
                    return cacheSuccessResultForSelect(parameter.definition)
                        .then((result) => {
                        return { parameter, result };
                    });
                }));
                const controls$1 = controls.getControlStore(controls.urlSearchParamsToArguments(getURLSearchParams()), definition.parameters, options);
                const statement = convert.newlineBreak(convert.normalize(definition.parameters, (typeof definition.statement == "string") ?
                    convert.removeLineBeginningWhitespace(definition.statement) :
                    definition.statement));
                viewStore.update((vs) => (Object.assign(Object.assign({}, vs), { statement, controls: controls$1 })));
                return ctx;
            });
        };
    }
    exports.getInitilizeControls = getInitilizeControls;
    function getLoadDefinition(cacheDefinition, viewStore) {
        return function loadDefinition(ctx) {
            return __awaiter(this, void 0, void 0, function* () {
                const definition = yield cacheDefinition(ctx.params.definitionName);
                viewStore.update((vs) => (Object.assign(Object.assign({}, vs), { showingMenu: false, definition })));
                return Object.assign(Object.assign({}, ctx), { definition });
            });
        };
    }
    exports.getLoadDefinition = getLoadDefinition;
    function loadResults(fetcher, viewStore, desiredState) {
        return __awaiter(this, void 0, void 0, function* () {
            function inDesiredState(statusStr) {
                return desiredState.indexOf(statusStr) > -1;
            }
            function calculateNewDelay(attemptsSoFar) {
                return attemptsSoFar * 300;
            }
            function perform() {
                return __awaiter(this, void 0, void 0, function* () {
                    const j = yield fetcher();
                    if (inDesiredState(j.status)) {
                        return { complete: true, value: j };
                    }
                    return { complete: false };
                });
            }
            if (viewStore.result && inDesiredState(viewStore.result.status)) {
                return Promise.resolve(Object.assign({}, viewStore));
            }
            return dist.waitFor(perform, calculateNewDelay)
                .then((json) => {
                return Object.assign(Object.assign({}, viewStore), { result: Object.assign(Object.assign({}, viewStore.result), json) });
            });
        });
    }
    exports.loadResults = loadResults;
    });

    unwrapExports(middleware);
    var middleware_1 = middleware.loadResults;
    var middleware_2 = middleware.getLoadDefinition;
    var middleware_3 = middleware.getInitilizeControls;
    var middleware_4 = middleware.resultDemandHTTP;
    var middleware_5 = middleware.loadDefinitionHTTP;
    var middleware_6 = middleware.getInitialViewStore;

    var dist$1 = createCommonjsModule(function (module, exports) {
    var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var esqlate_waitfor_1 = __importDefault(dist);
    function getCache(f) {
        var retreiving = new Set();
        var values = new Map();
        var errors = new Map();
        function getWaitForF(k) {
            return function () {
                if (retreiving.has(k)) {
                    return Promise.resolve({ complete: false });
                }
                return Promise.resolve({ complete: true, value: true });
            };
        }
        return function getCacheImpl() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var cacheKey = JSON.stringify(args);
            if (values.has(cacheKey)) {
                return Promise.resolve(values.get(cacheKey));
            }
            if (retreiving.has(cacheKey)) {
                return esqlate_waitfor_1.default(getWaitForF(cacheKey), function (_n) { return 50; }).then(function () {
                    if (values.has(cacheKey)) {
                        return Promise.resolve(values.get(cacheKey));
                    }
                    if (errors.has(cacheKey)) {
                        return Promise.reject(errors.get(cacheKey));
                    }
                    throw new Error("Esqlate Cache: WaitFor: Ended without success or error?");
                });
            }
            retreiving.add(cacheKey);
            return f.apply(null, args)
                .then(function (value) {
                values.set(cacheKey, value);
                retreiving.delete(cacheKey);
                return value;
            })
                .catch(function (e) {
                errors.set(cacheKey, e);
                throw e;
            });
        };
    }
    exports.default = getCache;
    });

    var getCache = unwrapExports(dist$1);

    function promiseChain(errorHandler, funcs) {
        let myFuncs = [...funcs];
        return function promiseChainImpl(...args) {
            return new Promise((resolve) => {
                let index = 0;
                function catcher(e) {
                    errorHandler(e);
                }
                function thenF(res) {
                    if (myFuncs.length && (index < myFuncs.length)) {
                        let f = myFuncs[index++];
                        const r = f(res);
                        if (r && r.then) {
                            return r.then(thenF).catch(catcher);
                        }
                        return r;
                    }
                    return resolve(res);            }
                thenF(args);
            });
        };
    }

    var userActions = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pick = exports.getPopupLinkCreator = void 0;

    function getPopupLinkCreator(getURLSearchParams) {
        return function popup(parameterName, definition, controls$1) {
            const definitionName = definition.name;
            const parameter = definition.parameters
                .reduce((acc, p) => {
                return p.name == parameterName ? p : acc;
            });
            if (!parameter) {
                throw new Error(`Could not find Select(name=${parameterName})`);
            }
            const qs = controls.serializeValues(controls.addControlStoreToEsqlateQueryComponents(controls$1, []));
            const backRoute = encodeURIComponent(`/${encodeURIComponent(definitionName)}?${qs}`);
            const existingBack = controls.addBackValuesToControlStore(controls.urlSearchParamsToArguments(getURLSearchParams()), {});
            const newBacks = controls.pushBackToControlStore(existingBack, {
                url: backRoute,
                def: definitionName,
                fld: parameter.name,
                val: parameter.value_field,
                dis: parameter.display_field
            });
            const newQs = controls.serializeValues(controls.addControlStoreToEsqlateQueryComponents(newBacks, []));
            return `/${encodeURIComponent(parameter.definition)}?${newQs}`;
        };
    }
    exports.getPopupLinkCreator = getPopupLinkCreator;
    function pick(row, query, fields, setNull = false) {
        const back = controls.popBackFromArguments(query);
        function getFieldIndex(desiredFieldName) {
            return fields.reduce((acc, f, i) => {
                if (f.name == desiredFieldName) {
                    return i;
                }
                return acc;
            }, -1);
        }
        function getEncodedValue() {
            const valueIndex = getFieldIndex(back.val);
            const displayIndex = getFieldIndex(back.dis);
            if (valueIndex == -1) {
                throw new Error(`Return is a field that doesn't exist ${back.val}`);
            }
            return encodeURIComponent(row[valueIndex]) + " " +
                encodeURIComponent(row[displayIndex]);
        }
        const usp = new URLSearchParams(back.url.replace(/.*\?/, ''));
        const newQsValues = controls.urlSearchParamsToArguments(usp)
            .filter((esqArg) => esqArg.name != back.fld)
            .concat([{
                name: back.fld,
                val: setNull ? "" : getEncodedValue(),
            }]);
        const qs = controls.serializeValues(controls.addControlStoreToEsqlateQueryComponents({}, newQsValues));
        return `/${encodeURIComponent(back.def)}?${qs}`;
    }
    exports.pick = pick;
    });

    unwrapExports(userActions);
    var userActions_1 = userActions.pick;
    var userActions_2 = userActions.getPopupLinkCreator;

    function popup(row) {
        const runPopup = userActions_2(io_5);
        const route = runPopup(row, get_store_value(viewStore).definition, get_store_value(viewStore).controls);
        router.setRoute(route);
    }

    function pick(row) {
        const route = userActions_1(
            row,
            controls_11(
                io_5()
            ),
            get_store_value(viewStore).result.fields
        );
        router.setRoute(route);
    }

    function download(mimeType) {
        const otherFormat = get_store_value(viewStore).result.full_format_urls.filter(
            (ffu) => ffu.type == mimeType
        );
        if (otherFormat.length == 0) {
            throw Error(`Mime type ${mimeType} was requested but not found`);
        }
        window.location = getFullUrlFromResponseUrl_2(io_4(), otherFormat[0].location);
    }


    function cancelDownload() {
        router.setRoute(
            window.location.hash.replace(
                /^#\/?([^\/]+)\/((result)|(download))/,
                "/$1/result"
            )
        );
    }

    function showDownloads() {
        router.setRoute(
            window.location.hash.replace(
                /^#\/?([^\/]+)\/((result)|(download))/,
                "/$1/download"
            )
        );
    }

    function empty$1() {
        const route = userActions_1(
            [],
            controls_11(io_5()),
            get_store_value(viewStore).result.fields,
            true
        );
        router.setRoute(route);
    }

    function cancel() {
        router.setRoute(controls_3(
            controls_11(io_5())
        ).url);
    }

    function run$1() {
        const definitionName = get_store_value(viewStore).definition.name;

        const qs = controls_8(
            controls_10(
                get_store_value(viewStore).controls,
                controls_11(io_5())
            )
        );
        const route = `/${encodeURIComponent(definitionName)}/request?${qs}`;
        router.setRoute(route);
    }


    function toggleShowingSql() {
        viewStore.update((vs) => {
            const value = !vs.showingSql;
            window.localStorage.setItem('showingSql', value);
            return {...vs, showingSql: value }
        });
    }


    function toggleShowingExtendedDisplay() {
        viewStore.update((vs) => {
            const value = !vs.showingExtendedDisplay;
            window.localStorage.setItem('showingExtendedDisplay', value);
            return {...vs, showingExtendedDisplay: value }
        });
    }


    function hideResults(ctx) {
        viewStore.update((vs) => ({...vs, result: false }));
        return Promise.resolve(ctx);
    }


    function createRequest(ctx) {

        const data = {
            "arguments": controls_1(
                get_store_value(viewStore).definition.parameters,
                controls_10(
                    get_store_value(viewStore).controls,
                    controls_11(
                        io_5()
                    )
                )
            )
        };

        const url = `/request/${ctx.params.definitionName}`;

        const query = controls_8(
            controls_10(
                get_store_value(viewStore).controls,
                data.arguments.map(({ name, value }) => ({ name, val: value }))
            )
        );

        // TODO: Catch 422 etc
        return io_2(url, data)
            .then(resp => resp.json())
            .then((json) => {
                const url = `/${encodeURIComponent(ctx.params.definitionName)}/request/${encodeURIComponent(json.location)}?${query}`;
                router.setRoute(url);
                return ctx;
            });
    }


    function waitForRequest(ctx) {

        function getReady() {
            return io_3(ctx.params.requestLocation)
                .then(resp => resp.json())
                .then((j) => {
                    if ((j.status == "preview") || (j.status == "complete")) {
                        return { complete: true, value: j.location };
                    }
                    return { complete: false };
                });
        }

        function calculateNewDelay(attemptsSoFar) { return attemptsSoFar * 300; }

        const qry = controls_10(
            get_store_value(viewStore).controls,
            controls_11(io_5())
        );

        return dist_2(getReady, calculateNewDelay)
            .then((loc) => {
                const url = `/${encodeURIComponent(ctx.params.definitionName)}/result/${encodeURIComponent(loc)}?${controls_8(qry)}`;
                router.setRoute(url);
                return ctx;
            });

    }


    function loadResults(ctx) {

        async function fetcher() {
            const resp = await io_3(ctx.params.resultLocation);
            return await resp.json();
        }

        const desiredStatus = ctx.params.showingDownload ?
            ["error", "complete"] :
            ["error", "complete", "preview"];


        viewStore.update((vs) => {
            return {
                ...vs,
                showingDownload: ctx.params.showingDownload
            }
        });

        return middleware_1(fetcher, get_store_value(viewStore), desiredStatus)
            .then((vs) => {
                viewStore.set(vs);
                return ctx;
            });
    }


    function setPopupMode(ctx) {
        viewStore.update((vs) => {
            const asPopup = controls_11(io_5())
                .reduce(
                    (acc, esqArg) => {
                        return esqArg.name == '_burl0' ? true : acc;
                    },
                    false
                );
            return {...vs, asPopup };
        });
        return Promise.resolve(ctx);
    }

    function errorHandler(error) {
        console.log(error);
        let message = error;
        if (error.message) {
            message = error.message;
        }
        document.getElementById("loading-modal").classList.remove("active");
        esqlateShowToastError(message);
    }

    function finishedLoading(ctx) {
        viewStore.update((vs) => {
            return {...vs, loading: false}
        });
        return Promise.resolve(ctx);
    }
    function setLoading(ctx) {
        viewStore.update((vs) => {
            return {...vs, loading: true}
        });
        return Promise.resolve(ctx);
    }

    const viewStore = writable({
        ...middleware_6(),
        showingSql: (window.localStorage.getItem('showingSql') === "false") ?
            false :
            true,
        showingExtendedDisplay: (window.localStorage.getItem('showingExtendedDisplay') === "true") ?
            true :
            false,
    });

    io_3("/definition")
        .then(resp => resp.json())
        .then((menu) => viewStore.update((vs) => ({...vs, menu })));


    const cacheDefinition = getCache(middleware_5);
    const cacheCompleteResultForSelect = getCache(middleware_4);


    const app = new App({
    	target: document.body,
    	props: {
            viewStore,
            toggleShowingSql,
            toggleShowingExtendedDisplay,
            run: run$1,
            popup,
            pick,
            empty: empty$1,
            cancel,
            cancelDownload,
            showDownloads,
            download,
        }
    });


    var routes = {
        '/': promiseChain(errorHandler, [
            ([definitionName]) => {
                console.log("ROUTE:", '/', window.location);
                viewStore.update((vs) => ({...vs, showingMenu: true }));
                return Promise.resolve({ params: { definitionName } });
            }
        ]),
        '/:definitionName': promiseChain(errorHandler, [
            setLoading,
            ([definitionName]) => {
                console.log("ROUTE:", '/:definitionName', [definitionName], window.location);
                return Promise.resolve({ params: { definitionName } });
            },
            hideResults,
            setPopupMode,
            middleware_2(cacheDefinition, viewStore),
            middleware_3(viewStore, io_5, cacheCompleteResultForSelect),
            hideResults,
            finishedLoading,
        ]),
        '/:definitionName/request': promiseChain(errorHandler, [
            setLoading,
            ([definitionName]) => {
                console.log("ROUTE:", '/:definitionName/request', [definitionName], window.location);
                return Promise.resolve({ params: { definitionName } });
            },
            hideResults,
            setPopupMode,
            middleware_2(cacheDefinition, viewStore),
            middleware_3(viewStore, io_5, cacheCompleteResultForSelect),
            hideResults,
            createRequest,
        ]),
        '/:definitionName/request/:requestLocation': promiseChain(errorHandler, [
            setLoading,
            ([definitionName, requestLocation]) => {
                console.log("ROUTE:", '/:definitionName/request/:requestLocation', [definitionName, requestLocation], window.location);
                return Promise.resolve({
                    params: {
                        definitionName,
                        requestLocation: decodeURIComponent(requestLocation)
                    }
                });
            },
            hideResults,
            setPopupMode,
            hideResults,
            middleware_2(cacheDefinition, viewStore),
            middleware_3(viewStore, io_5, cacheCompleteResultForSelect),
            waitForRequest,
        ]),
        '/:definitionName/:resultOrDownload/:resultLocation': promiseChain(errorHandler, [
            ([definitionName, resultOrDownload, requestLocation]) => {
                console.log("ROUTE:", '/:definitionName/result/:resultLocation', [definitionName, requestLocation], window.location);
                if (resultOrDownload == "result") {
                    setLoading();
                }
                return Promise.resolve({
                    params: {
                        showingDownload: (resultOrDownload == "download"),
                        definitionName,
                        resultLocation: decodeURIComponent(requestLocation)
                    }
                });
            },
            setPopupMode,
            middleware_2(cacheDefinition, viewStore),
            middleware_3(viewStore, io_5, cacheCompleteResultForSelect),
            loadResults,
            (ctx) => {
                const result = get_store_value(viewStore).result;
                if (result && result.message) {
                    esqlateShowToastError(result.message);
                }
                return Promise.resolve(ctx);
            },
            finishedLoading,
        ]),
    };

    if (window.location.hash == "") {
        window.location.hash = "/";
    }

    let router;
    router = window.Router(routes);
    router.configure({
        notfound: (_r) => {
            router.setRoute("/");
        },
    });
    router.init();


    window.onerror = errorHandler;

    return app;

}());
//# sourceMappingURL=bundle.js.map
