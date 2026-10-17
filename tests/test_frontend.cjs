/* Run with: node tests/test_frontend.cjs
   A small DOM substitute checks rendering without installing a browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

class Element {
    constructor(tag = 'div') {
        this.tag = tag;
        this.children = [];
        this.events = {};
        this.attributes = {};
        this.value = '';
    }
    append(...nodes) {
        this.children.push(...nodes);
    }
    replaceChildren(...nodes) {
        this.children = nodes;
    }
    setAttribute(key, value) {
        this.attributes[key] = value;
    }
    addEventListener(name, callback) {
        this.events[name] = callback;
    }
    querySelectorAll(tag) {
        return this.children.filter(node => node.tag === tag);
    }
    showModal() {
        this.open = true;
    }
    close() {
        this.open = false;
    }
}

async function checkMode(staticMode, fetchResult) {
    const elements = new Map();
    const document = {
        querySelector(selector) {
            if (!elements.has(selector)) elements.set(selector, new Element());
            return elements.get(selector);
        },
        createElement: tag => new Element(tag),
        createTextNode: text => ({
            textContent: text
        })
    };
    const context = vm.createContext({
        document,
        window: {
            PORTFOLIO_STATIC_MODE: staticMode,
            location: {}
        },
        console,
        setTimeout,
        clearTimeout,
        AbortController,
        fetch: async () => {
            if (fetchResult === 'fail') throw new Error('API unavailable');
            return {
                ok: true,
                json: async () => fetchResult
            };
        }
    });
    vm.runInContext(fs.readFileSync(path.join(root, 'public/content.js'), 'utf8'), context);
    context.window.PORTFOLIO_STATIC_MODE = staticMode;
    vm.runInContext(fs.readFileSync(path.join(root, 'public/app.js'), 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    const grid = document.querySelector('#project-grid');
    assert.equal(grid.children.length, context.window.PORTFOLIO_DATA.projects.length, 'Six projects must render without waiting for API');
    assert.equal(document.querySelector('#profile-name').textContent, 'Ankit Kumar Panda');
    const search = document.querySelector('#search');
    search.value = 'terrapath';
    search.events.input();
    assert.equal(grid.children.length, 1);
    assert.equal(grid.children[0].children[0].children[0].src, './assets/terrapath.png');
    grid.children[0].children[0].events.click();
    assert.equal(document.querySelector('#project-dialog').open, true);
    search.value = '';
    search.events.input();
    const physicalFilter = document.querySelector('#filters').children.find(button => button.textContent === 'Physical computing');
    physicalFilter.events.click();
    assert.equal(grid.children.length, 2, 'Category filter should show two hardware projects');
    // A project without a photo must contain only its metadata, no cover.
    const plainCard = vm.runInContext("makeProjectCard({title:'Text only',category:'Tools',summary:'Content',details:'Details',limitation:'Prototype',repo:'https://github.com/Ankit-ku-panda/demo',image:'',tags:[]},0)", context);
    assert.equal(plainCard.children.length, 1);
    assert.equal(plainCard.children[0].className, 'project-meta');
    console.log('PASS:', staticMode ? 'Pages mode' : fetchResult === 'fail' ? 'API failure fallback' : 'Python API mode');
}

(async () => {
    await checkMode(true, 'fail');
    await checkMode(false, 'fail');
    const data = JSON.parse(fs.readFileSync(path.join(root, 'content/portfolio.json'), 'utf8'));
    await checkMode(false, data);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
