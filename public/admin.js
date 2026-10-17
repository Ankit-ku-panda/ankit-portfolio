/* SECTION 1: Find elements and show feedback without injecting HTML. */
function select(selector) {
    return document.querySelector(selector);
}

function showStatus(message, isError = false) {
    select('#status').textContent = message;
    select('#status').className = isError ? 'error' : '';
}

/* SECTION 2: All admin requests go to the Python backend on this server. */
async function api(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json'
        },
        cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
}

/* SECTION 3: Display saved contact messages, with a delete action per message. */
async function loadInbox() {
    const messages = await api('./api/admin/messages');
    const inbox = select('#messages');
    inbox.replaceChildren();
    if (!messages.length) inbox.textContent = 'No messages yet.';

    for (const message of messages) {
        const card = document.createElement('article');
        card.className = 'message';
        const fields = [
            ['h3', message.name],
            ['small', message.email + ' · ' + message.created + ' UTC'],
            ['p', message.message]
        ];
        for (const [tag, text] of fields) {
            const element = document.createElement(tag);
            element.textContent = text;
            card.append(element);
        }
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete message';
        deleteButton.addEventListener('click', async () => {
            if (!confirm('Permanently delete this message?')) return;
            try {
                await api('./api/admin/messages/' + message.id, {
                    method: 'DELETE'
                });
                await loadInbox();
            } catch (error) {
                showStatus(error.message, true);
            }
        });
        card.append(deleteButton);
        inbox.append(card);
    }
}

/* SECTION 4: Load the JSON editor and save validated edits back to SQLite. */
async function loadDashboard() {
    try {
        const content = await api('./api/portfolio');
        select('#json').value = JSON.stringify(content, null, 4);
        await loadInbox();
        showStatus('Dashboard ready.');
    } catch (error) {
        showStatus('The admin dashboard needs the Python server. Open /admin from that server. ' + error.message, true);
    }
}

select('#editor').addEventListener('submit', async event => {
    event.preventDefault();
    try {
        const content = JSON.parse(select('#json').value);
        await api('./api/admin/portfolio', {
            method: 'PUT',
            body: JSON.stringify(content)
        });
        showStatus('Saved. Refresh the portfolio to see your changes. Export JSON to publish these changes on GitHub Pages.');
    } catch (error) {
        showStatus(error.message, true);
    }
});

/* SECTION 5: Refresh messages or download content for backup / static hosting. */
select('#refresh').addEventListener('click', () => {
    loadInbox().catch(error => showStatus(error.message, true));
});

select('#export').addEventListener('click', () => {
    try {
        const content = JSON.parse(select('#json').value);
        const file = new Blob([JSON.stringify(content, null, 4)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'portfolio.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        showStatus(error.message, true);
    }
});

loadDashboard();
