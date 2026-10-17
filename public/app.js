/* SECTION 1: Small helpers used throughout this file.
   Text is added with textContent so visitor input cannot become HTML. */
function select(selector) {
    return document.querySelector(selector);
}

function makeElement(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
}

// The bundled content loads first. Python may replace it with saved database data.
let portfolio = window.PORTFOLIO_DATA;
let selectedCategory = 'All';
let backendAvailable = false;

function makeTags(items) {
    const container = makeElement('div', undefined, 'tags');
    for (const text of items) {
        container.append(makeElement('span', text, 'tag'));
    }
    return container;
}

function imagePath(path) {
    // Relative paths also work at username.github.io/repository-name/.
    return './' + path.replace(/^\/+/, '');
}

// Return an actual image only. Projects without photos get no visual block.
function makeProjectVisual(project, onError = () => {}) {
    if (!project.image) return null;
    const image = makeElement('img');
    image.src = imagePath(project.image);
    image.alt = project.title + ' — image from the repository';
    image.loading = 'lazy';
    image.addEventListener('error', () => {
        image.remove();
        onError();
    });
    return image;
}

/* SECTION 2: Build a project card and its detail dialog. */
function openProject(project) {
    const detail = select('#detail');
    const heading = makeElement('h2', project.title);
    heading.id = 'detail-title';
    const image = makeProjectVisual(project);
    const sourceLink = makeElement('a', 'Explore source on GitHub ↗', 'text-link');
    sourceLink.href = project.repo;
    sourceLink.target = '_blank';
    sourceLink.rel = 'noopener';
    detail.replaceChildren(
        makeElement('div', project.category.toUpperCase() + ' / PROJECT NOTES', 'eyebrow'),
        heading,
        ...(image ? [image] : []),
        makeElement('p', project.details),
        makeTags(project.tags),
        makeElement('p', project.limitation, 'limitation'),
        sourceLink
    );
    select('#project-dialog').showModal();
}

function makeProjectCard(project, index) {
    const card = makeElement('article', undefined, 'project');
    const imageButton = makeElement('button', undefined, 'image-button');
    imageButton.setAttribute('aria-label', 'Explore ' + project.title);
    imageButton.addEventListener('click', () => openProject(project));
    const image = makeProjectVisual(project, () => imageButton.remove());
    if (image) imageButton.append(image);

    const metadata = makeElement('div', undefined, 'project-meta');
    const topLine = makeElement('div', undefined, 'project-top');
    topLine.append(
        makeElement('span', '[' + String(index + 1).padStart(2, '0') + '] ' + project.category.toUpperCase()),
        makeElement('span', project.pinned ? 'PINNED / GITHUB' : 'PROJECT / SOURCE')
    );
    const links = makeElement('div', undefined, 'project-links');
    const inspectButton = makeElement('button', 'Inspect project ↗');
    inspectButton.addEventListener('click', () => openProject(project));
    const githubLink = makeElement('a', 'GitHub ↗');
    githubLink.href = project.repo;
    githubLink.target = '_blank';
    githubLink.rel = 'noopener';
    links.append(inspectButton, githubLink);
    metadata.append(topLine, makeElement('h3', project.title), makeElement('p', project.summary), makeTags(project.tags), links);
    if (image) card.append(imageButton);
    card.append(metadata);
    return card;
}

/* SECTION 3: Search and category filters choose which cards to show. */
function renderProjects() {
    const searchText = select('#search').value.trim().toLowerCase();
    const matches = portfolio.projects.filter(project => {
        const categoryMatches = selectedCategory === 'All' || project.category === selectedCategory;
        const searchableText = [project.title, project.summary, ...project.tags].join(' ').toLowerCase();
        return categoryMatches && searchableText.includes(searchText);
    });
    select('#project-count').textContent = String(matches.length).padStart(2, '0') + ' PROJECTS / OPEN SOURCE';
    const cards = matches.map(project => makeProjectCard(project, portfolio.projects.indexOf(project)));
    if (!cards.length) cards.push(makeElement('p', 'No matching projects. Try another search or category.', 'empty'));
    select('#project-grid').replaceChildren(...cards);
}

function renderPortfolio() {
    const profile = portfolio.profile;
    const fields = {
        'hero-name': 'name',
        'profile-name': 'name',
        'role': 'role',
        'location': 'location',
        'education': 'education',
        'availability': 'availability',
        'bio': 'bio'
    };
    for (const [elementId, field] of Object.entries(fields)) {
        select('#' + elementId).textContent = profile[field];
    }
    // Keep resume skills grouped by category so recruiters can scan them quickly.
    const skillGroups = [
        ['Programming', ['Python', 'Java', 'JavaScript']],
        ['Frontend', ['React.js', 'HTML5', 'CSS3', 'Responsive Design']],
        ['Backend & APIs', ['Node.js', 'RESTful APIs', 'Python Backend', 'API Integration', 'Streamlit']],
        ['Databases & Cloud', ['MySQL', 'SQLite', 'MongoDB', 'Firebase', 'SQL / NoSQL', 'Database Design']],
        ['AI / ML & Computer Vision', ['Machine Learning', 'Deep Learning', 'Neural Networks', 'Jupyter Notebook', 'OpenCV', 'YuNet', 'SFace', 'MediaPipe', 'Gesture Recognition', 'Computer Vision']],
        ['Local AI', ['llama.cpp', 'Qwen3', 'GGUF', 'Local LLM Inference', 'SSE Streaming']],
        ['Mobile & IoT', ['Android Studio', 'GPS Integration', 'PWA', 'Arduino', 'IoT Systems', 'IoT Sensors']],
        ['Cybersecurity', ['OWASP', 'OWASP ZAP', 'Burp Suite', 'OSINT', 'Ethical Hacking', 'Security Testing', 'Web Application Security', 'Vulnerability Assessment', 'Threat Analysis']],
        ['Enterprise Technology', ['SAP', 'SAP ABAP · foundational knowledge']],
        ['Tools & Security Libraries', ['Git', 'GitHub', 'Figma', 'Android Studio', 'Fernet Encryption']]
    ];
    const skillContainer = select('#skills');
    skillContainer.classList.add('skill-groups');
    skillContainer.replaceChildren(...skillGroups.map(([groupName, skills]) => {
        const group = makeElement('section', undefined, 'skill-group');
        group.append(makeElement('h4', groupName));
        group.append(makeTags(skills));
        return group;
    }));
    // The summary is project-based and describes SAP ABAP as foundational knowledge, not job experience.
    select('#bio').textContent = 'Computer Science and Engineering graduate (2026) with hands-on project work across full-stack applications, AI/ML, local LLM systems, cybersecurity tools, mobile apps, and IoT prototypes. I enjoy turning practical problems into usable software, connecting interfaces with APIs and data, and documenting what I build. I also have foundational knowledge of SAP ABAP and am developing my understanding of enterprise application development. I am seeking an opportunity to contribute to a software team and keep growing through real engineering work.';
    const filters = select('#filters');
    filters.replaceChildren();
    const categories = ['All', ...new Set(portfolio.projects.map(project => project.category))];
    if (!categories.includes(selectedCategory)) selectedCategory = 'All';
    for (const category of categories) {
        const button = makeElement('button', category);
        button.setAttribute('aria-pressed', String(category === selectedCategory));
        button.addEventListener('click', () => {
            selectedCategory = category;
            for (const item of filters.querySelectorAll('button')) {
                item.setAttribute('aria-pressed', String(item === button));
            }
            renderProjects();
        });
        filters.append(button);
    }
    renderProjects();
}

/* SECTION 4: Fetch database content with a timeout.
   GitHub Pages uses bundled content; it does not have a Python API. */
async function fetchJSON(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(path, {
            ...options,
            signal: controller.signal,
            cache: 'no-store'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'The server could not complete the request.');
        return data;
    } finally {
        clearTimeout(timeout);
    }
}

function updateContactMode() {
    const button = select('#contact-form button');
    button.replaceChildren(document.createTextNode(backendAvailable ? 'Send message ' : 'Create email draft '), makeElement('span', '↗'));
    select('#contact-note').textContent = backendAvailable ?
        'Messages are saved in this portfolio’s inbox. You can also email or call me directly.' :
        'This form opens your email app with a draft. Review and send it there, or use the email link above.';
}

async function loadDatabaseContent() {
    // Pages never needs an API request. The exporter sets this flag for Pages.
    if (window.PORTFOLIO_STATIC_MODE) {
        updateContactMode();
        return;
    }
    try {
        const saved = await fetchJSON('./api/portfolio');
        if (!saved.profile || !Array.isArray(saved.projects)) throw new Error('Invalid portfolio data.');
        portfolio = saved;
        renderPortfolio();
        backendAvailable = true;
    } catch (error) {
        // The already-rendered local content remains visible on any static host.
        console.info('Using bundled portfolio content:', error.message);
    }
    updateContactMode();
}

/* SECTION 5: Connect buttons and forms to the functions above. */
select('#search').addEventListener('input', renderProjects);
select('.close').addEventListener('click', () => select('#project-dialog').close());
select('#project-dialog').addEventListener('click', event => {
    const dialog = select('#project-dialog');
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});

select('#contact-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const fields = Object.fromEntries(new FormData(form));
    const status = select('#form-status');
    const button = form.querySelector('button');
    status.className = '';

    if (!backendAvailable) {
        const subject = encodeURIComponent('Portfolio inquiry from ' + fields.name);
        const body = encodeURIComponent('Name: ' + fields.name + '\nReply to: ' + fields.email + '\n\n' + fields.message);
        window.location.href = 'mailto:kumarpanda1403@gmail.com?subject=' + subject + '&body=' + body;
        status.textContent = 'Email draft requested. Review and send it in your email app. If it did not open, use the direct email link.';
        return;
    }

    button.disabled = true;
    status.textContent = 'Saving message…';
    try {
        const result = await fetchJSON('./api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fields)
        });
        status.textContent = result.message;
        form.reset();
    } catch (error) {
        status.textContent = error.name === 'AbortError' ? 'The request timed out. Please try again or email me directly.' : error.message;
        status.className = 'error';
    } finally {
        button.disabled = false;
    }
});

// Show bundled data immediately, then refresh from Python when it is available.
if (portfolio && portfolio.profile && Array.isArray(portfolio.projects)) {
    renderPortfolio();
    loadDatabaseContent();
} else {
    select('#project-count').textContent = 'BUNDLED PROJECTS';
    select('#form-status').textContent = 'Use the direct email link to get in touch.';
}



/* === BACKGROUND-ONLY CINEMATIC ENERGY FIELD ===
   The effects stay behind all page content. Each click cycles to a new original
   superhero/sci-fi visual motif; no copyrighted movie footage or characters. */
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'power-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const core = document.createElement('div');
    core.id = 'power-core';
    core.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas, core);

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1;
    let x = innerWidth * .5, y = innerHeight * .5, tx = x, ty = y;
    let lastMove = performance.now(), lastIdleBurst = 0, themeIndex = 0;
    let particles = [], webs = [], flashes = [], glyphs = [];
    const themes = [
        {name:'web', colors:['#76f5ff','#00aaff','#d8fbff'], hue:190},
        {name:'lightning', colors:['#fff7a8','#ffe34d','#8b7bff'], hue:48},
        {name:'cosmic', colors:['#e3a5ff','#8e5dff','#ff73c8'], hue:275},
        {name:'plasma', colors:['#ffb36b','#ff4d6d','#ffe7bb'], hue:345},
        {name:'tech', colors:['#8dffca','#25d6a2','#d8fff1'], hue:155},
        {name:'nova', colors:['#ffffff','#82cfff','#6b78ff'], hue:220}
    ];
    let theme = themes[0];

    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 2);
        w = innerWidth; h = innerHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function burst(px, py, power = 1, changeTheme = false) {
        if (changeTheme) {
            themeIndex = (themeIndex + 1) % themes.length;
            theme = themes[themeIndex];
            document.documentElement.style.setProperty('--cinematic-hue', theme.hue + 'deg');
            document.documentElement.dataset.cinematicTheme = theme.name;
        }
        flashes.push({x:px,y:py,r:8,life:1,power,kind:theme.name});
        const count = Math.round(26 * power);
        for (let i=0;i<count;i++) {
            const a = Math.random()*Math.PI*2;
            const speed = (1.2 + Math.random()*5.2)*power;
            const color = theme.colors[Math.floor(Math.random()*theme.colors.length)];
            particles.push({x:px,y:py,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
                life:.6+Math.random()*.6,max:.6+Math.random()*.6,
                size:.8+Math.random()*2.4,color,trail:Math.random()>.32});
        }
        if (theme.name === 'web' || theme.name === 'tech') {
            for (let i=0;i<11;i++) {
                const a = i*Math.PI*2/11 + Math.random()*.12;
                webs.push({x:px,y:py,angle:a,length:45+Math.random()*125,life:.95,color:theme.colors[i%theme.colors.length]});
            }
        }
        if (theme.name === 'lightning') {
            for (let i=0;i<7;i++) glyphs.push({x:px,y:py,angle:i*Math.PI/3,reach:70+Math.random()*100,life:1,color:theme.colors[i%theme.colors.length],kind:'bolt'});
        } else if (theme.name === 'cosmic' || theme.name === 'nova') {
            for (let i=0;i<12;i++) glyphs.push({x:px,y:py,angle:i*Math.PI/6,reach:55+Math.random()*150,life:1,color:theme.colors[i%theme.colors.length],kind:'ray'});
        } else if (theme.name === 'plasma') {
            for (let i=0;i<5;i++) glyphs.push({x:px,y:py,angle:Math.random()*Math.PI*2,reach:50+Math.random()*110,life:1,color:theme.colors[i%theme.colors.length],kind:'arc'});
        }
        core.classList.remove('is-burst');
        void core.offsetWidth;
        core.classList.add('is-burst');
    }
    function drawWeb(item) {
        const ex=item.x+Math.cos(item.angle)*item.length, ey=item.y+Math.sin(item.angle)*item.length;
        ctx.strokeStyle=item.color || theme.colors[0]; ctx.globalAlpha=item.life*.75; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(item.x,item.y); ctx.lineTo(ex,ey);
        const mx=(item.x+ex)/2, my=(item.y+ey)/2;
        ctx.lineTo(mx+Math.cos(item.angle+1.4)*10,my+Math.sin(item.angle+1.4)*10); ctx.stroke();
        ctx.globalAlpha=1;
    }
    function drawGlyph(g) {
        const dx=Math.cos(g.angle), dy=Math.sin(g.angle), ex=g.x+dx*g.reach, ey=g.y+dy*g.reach;
        ctx.strokeStyle=g.color; ctx.globalAlpha=g.life*.8; ctx.lineWidth=g.kind==='bolt'?2:1.2;
        ctx.beginPath(); ctx.moveTo(g.x,g.y);
        if (g.kind==='bolt') {
            const mx=g.x+dx*g.reach*.48 + (-dy)*(Math.random()-.5)*34;
            const my=g.y+dy*g.reach*.48 + dx*(Math.random()-.5)*34;
            ctx.lineTo(mx,my); ctx.lineTo(ex,ey);
        } else if (g.kind==='arc') {
            const mx=(g.x+ex)/2-dy*22, my=(g.y+ey)/2+dx*22;
            ctx.quadraticCurveTo(mx,my,ex,ey);
        } else ctx.lineTo(ex,ey);
        ctx.stroke(); ctx.globalAlpha=1;
    }
    function animate(now) {
        ctx.clearRect(0,0,w,h);
        x+=(tx-x)*.22; y+=(ty-y)*.22;
        core.style.left=x+'px'; core.style.top=y+'px';
        core.classList.add('is-active');
        if (now-lastMove>850 && now-lastIdleBurst>1350) {
            burst(x,y,1.15,false); lastIdleBurst=now;
            core.classList.add('is-charging');
            setTimeout(()=>core.classList.remove('is-charging'),520);
        }
        particles=particles.filter(p=>p.life>0);
        for (const p of particles) {
            if (p.trail) { ctx.strokeStyle=p.color; ctx.globalAlpha=Math.max(0,p.life/p.max)*.65; ctx.lineWidth=p.size; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*3,p.y-p.vy*3); ctx.stroke(); }
            ctx.globalAlpha=Math.max(0,p.life/p.max); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
            p.x+=p.vx; p.y+=p.vy; p.vx*=.975; p.vy*=.975; p.life-=.022;
        }
        ctx.globalAlpha=1;
        flashes=flashes.filter(f=>f.life>0);
        for (const f of flashes) {
            ctx.strokeStyle=theme.colors[0]; ctx.globalAlpha=f.life*.72; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(f.x,f.y,f.r+(1-f.life)*76*f.power,0,Math.PI*2); ctx.stroke();
            f.r+=2.4; f.life-=.045;
        }
        webs=webs.filter(a=>a.life>0);
        for (const a of webs) { drawWeb(a); a.life-=.025; a.length+=.7; }
        glyphs=glyphs.filter(g=>g.life>0);
        for (const g of glyphs) { drawGlyph(g); g.life-=.035; g.reach+=1.2; }
        ctx.globalAlpha=1;
        requestAnimationFrame(animate);
    }
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;lastMove=performance.now();core.classList.remove('is-charging');},{passive:true});
    window.addEventListener('pointerdown',e=>{
        if(e.pointerType==='touch'){tx=e.clientX;ty=e.clientY;}
        burst(e.clientX,e.clientY,1.45,true);
    },{passive:true});
    // pointerdown changes the theme exactly once per physical click/tap; avoid a second burst on click.
    resize();
    requestAnimationFrame(animate);
})();


/* === Accessible skill-category dialogs === */
(() => {
  const dialog = document.getElementById('skill-dialog');
  const title = document.getElementById('skill-dialog-title');
  const tags = document.getElementById('skill-dialog-tags');
  if (!dialog || !title || !tags) return;
  const closeButton = dialog.querySelector('.skill-dialog-close');
  document.querySelectorAll('[data-skill-category][data-skills]').forEach(button => {
    button.addEventListener('click', () => {
      let skills = [];
      try { skills = JSON.parse(button.dataset.skills || '[]'); } catch (_) { skills = []; }
      title.textContent = button.dataset.skillCategory || 'Skills';
      tags.replaceChildren();
      skills.forEach(skill => { const tag=document.createElement('span'); tag.className='tag'; tag.textContent=skill; tags.appendChild(tag); });
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
    });
  });
  closeButton?.addEventListener('click', () => { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect=dialog.getBoundingClientRect();
    if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
  });
})();
