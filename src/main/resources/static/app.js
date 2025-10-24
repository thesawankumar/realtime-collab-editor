let stompClient = null;
let currentVersion = -1; // Local version tracker

const documentEditor = document.getElementById('documentEditor');
const statusDisplay = document.getElementById('status');
const versionDisplay = document.getElementById('version');
const errorDisplay = document.getElementById('error');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');

let typingTimeout;
let sendTimeout;
let isTyping = false;

// -------------------- Connect WebSocket --------------------
function connect() {
    const socket = new SockJS('https://realtime-collab-editor-m5ld.onrender.com/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function (frame) {
        statusDisplay.textContent = 'Connected!';
        sendButton.disabled = false;
        console.log('Connected: ' + frame);

        // -------------------- Subscribe to document updates --------------------
        stompClient.subscribe('/topic/document/updates', function (message) {
            const documentState = JSON.parse(message.body);

            // Update editor only if content differs (avoid cursor jump)
            if (documentEditor.value !== documentState.content) {
                const cursorPos = documentEditor.selectionStart;
                documentEditor.value = documentState.content;
                documentEditor.selectionStart = documentEditor.selectionEnd = cursorPos;
            }

            currentVersion = documentState.version;
            versionDisplay.textContent = currentVersion;
            errorDisplay.textContent = '';
        });

        // -------------------- Subscribe to errors --------------------
        stompClient.subscribe('/user/queue/errors', function (message) {
            console.error("Conflict Error: ", message.body);
            errorDisplay.textContent = message.body + " The document has been updated with the latest version.";
        });

        // -------------------- Subscribe to typing indicator --------------------
        stompClient.subscribe('/topic/document/typing', function (message) {
            const typingUsers = JSON.parse(message.body);
            if (typingUsers.length === 0) {
                typingIndicator.classList.remove('show');
                typingIndicator.textContent = '';
            } else if (typingUsers.length === 1) {
                typingIndicator.classList.add('show');
                typingIndicator.textContent = `${typingUsers[0]} is typing...`;
            } else {
                typingIndicator.classList.add('show');
                typingIndicator.textContent = `${typingUsers.join(' and ')} are typing...`;
            }
        });

        // -------------------- Request current document --------------------
        stompClient.send("/app/document/get", {}, {});
    });
}

// -------------------- Update Editor --------------------
function updateEditor(content, version) {
    documentEditor.value = content;
    currentVersion = version;
    versionDisplay.textContent = version;
}

// -------------------- Send Edits Button --------------------
sendButton.addEventListener('click', function () {
    const content = documentEditor.value;
    if (stompClient && stompClient.connected) {
        const documentState = {
            content: content,
            version: currentVersion
        };
        stompClient.send("/app/document/edit", {}, JSON.stringify(documentState));
        console.log("Sent edit with version:", currentVersion);
    }
});

// -------------------- Typing & Live Updates --------------------
documentEditor.addEventListener('input', () => {
    if (!stompClient || !stompClient.connected) return;

    // Typing indicator
    if (!isTyping) {
        stompClient.send("/app/document/typing", {}, JSON.stringify({ typing: true }));
        isTyping = true;
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stompClient.send("/app/document/typing", {}, JSON.stringify({ typing: false }));
        isTyping = false;
    }, 1000);

    // Live content update (debounce 300ms)
    clearTimeout(sendTimeout);
    sendTimeout = setTimeout(() => {
        const documentState = {
            content: documentEditor.value,
            version: currentVersion
        };
        stompClient.send("/app/document/edit", {}, JSON.stringify(documentState));
        console.log("Live update sent, version:", currentVersion);
    }, 100); // 0.3 seconds after last keystroke
});

// -------------------- Initialize --------------------
connect();
