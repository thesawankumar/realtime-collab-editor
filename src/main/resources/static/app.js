let stompClient = null;
let currentVersion = -1;

const documentEditor = document.getElementById('documentEditor');
const statusDisplay = document.getElementById('status');
const versionDisplay = document.getElementById('version');
const errorDisplay = document.getElementById('error');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');

let typingTimeout;
let isTyping = false;

function connect() {
//    const socket = new SockJS('http://localhost:8080/ws');
    const socket = new SockJS('https://realtime-collab-editor-m5ld.onrender.com/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function(frame) {
        statusDisplay.textContent = 'Connected!';
        sendButton.disabled = false;

        // document updates
        stompClient.subscribe('/topic/document/updates', (message) => {
            const data = JSON.parse(message.body);
            documentEditor.value = data.content;
            currentVersion = data.version;
            versionDisplay.textContent = currentVersion;
        });

        // typing updates
        stompClient.subscribe('/topic/document/typing', (message) => {
            const users = JSON.parse(message.body);

            // remove self from typing indicator
            // optional if you have username, here anonymous so just display all
            if (users.length === 0) {
                typingIndicator.classList.remove('show');
                typingIndicator.textContent = '';
            } else if (users.length === 1) {
                typingIndicator.classList.add('show');
                typingIndicator.textContent = `${users[0]} is typing...`;
            } else {
                typingIndicator.classList.add('show');
                typingIndicator.textContent = `${users.join(' and ')} are typing...`;
            }
        });

        stompClient.send("/app/document/get", {}, {});
    });
}

// send edits
sendButton.addEventListener('click', () => {
    const content = documentEditor.value;
    if (stompClient && stompClient.connected) {
        stompClient.send("/app/document/edit", {}, JSON.stringify({content, version: currentVersion}));
    }
});

// typing indicator
documentEditor.addEventListener('input', () => {
    if (!stompClient || !stompClient.connected) return;

    if (!isTyping) {
        stompClient.send("/app/document/typing", {}, JSON.stringify({typing: true}));
        isTyping = true;
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stompClient.send("/app/document/typing", {}, JSON.stringify({typing: false}));
        isTyping = false;
    }, 1000);
});

connect();
