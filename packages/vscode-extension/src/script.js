(function () {
    const vscode = acquireVsCodeApi();

    const dateInput = document.getElementById('date');
    const userIdInput = document.getElementById('userId');
    const gitAuthorInput = document.getElementById('gitAuthor');
    const folderList = document.getElementById('folderList');
    const addFolderBtn = document.getElementById('addFolderBtn');
    const getCommitsBtn = document.getElementById('getCommitsBtn');
    const fetchHistoryBtn = document.getElementById('fetchHistoryBtn');
    const resultsArea = document.getElementById('resultsArea');
    const jsonOutput = document.getElementById('jsonOutput');
    const copyBtn = document.getElementById('copyBtn');
    const sendBtn = document.getElementById('sendBtn');

    let currentData = null;

    // Set default date to today
    dateInput.valueAsDate = new Date();

    // Restore state
    const oldState = vscode.getState() || {};
    if (oldState.userId) userIdInput.value = oldState.userId;
    if (oldState.gitAuthor) gitAuthorInput.value = oldState.gitAuthor;


    addFolderBtn.addEventListener('click', () => {
        vscode.postMessage({ command: 'selectFolder' });
    });

    // Initialize with saved folders
    // window.initialFolders is injected by the webview HTML
    const initialFolders = window.initialFolders || [];
    renderFolders(initialFolders);

    document.getElementById('clearFoldersBtn').addEventListener('click', () => {
        vscode.postMessage({ command: 'clearFolders' });
    });

    getCommitsBtn.addEventListener('click', () => {
        const date = dateInput.value;
        const userId = userIdInput.value;
        const gitAuthor = gitAuthorInput.value || userId;

        vscode.setState({ ...vscode.getState(), userId, gitAuthor });

        vscode.postMessage({
            command: 'getCommits',
            data: { date, author: gitAuthor, userId }
        });
    });

    fetchHistoryBtn.addEventListener('click', () => {
        console.log(dateInput.value);
        // Using the actual date input value now, assuming previous hardcoded '2025-05-20' was for testing
        const date = dateInput.value;
        const userId = userIdInput.value;
        vscode.postMessage({
            command: 'fetchHistory',
            data: { date, userId }
        });
    });

    copyBtn.addEventListener('click', () => {
        if (currentData) {
            let textToCopy = '';
            if (currentData.today && currentData.yesterday) {
                textToCopy = formatStandup(currentData);
            } else {
                // Fallback for normal summary
                const summaryEl = document.getElementById('summaryContent');
                textToCopy = summaryEl.textContent;
            }

            vscode.postMessage({ command: 'copyToClipboard', data: { text: textToCopy } });
        }
    });

    sendBtn.addEventListener('click', () => {
        if (currentData) {
            vscode.postMessage({ command: 'sendToApi', data: currentData });
        }
    });

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'updateFolders':
                renderFolders(message.folders);
                break;
            case 'showResults':
                currentData = message.data;
                renderResults(message.data);
                break;
        }
    });

    function formatSection(summaryText) {
        if (!summaryText) return 'No data';

        const lines = summaryText.split('\n');
        const formatted = [];
        let currentRepo = null;

        for (const raw of lines) {
            const line = raw.trim();

            // Skip useless summary headers
            if (!line ||
                line.startsWith('LogMyCode') ||
                line.startsWith('Total commits') ||
                line === 'Repos:' ||
                line === 'Repos') {
                continue;
            }

            // Repo line: "• RepoName"
            if (line.startsWith('• ')) {
                const content = line.substring(2).trim();

                // Repo names NEVER start with verbs, commit bullets do.
                const looksLikeAction =
                    content.match(/^(added|updated|fixed|refactored|removed|optimized|Completed)/i);

                if (!looksLikeAction) {
                    // It's a repo name
                    currentRepo = content;
                    formatted.push(` ${content}`);   // 1-space indent
                    continue;
                }

                // It's a commit bullet
                formatted.push(`  - ${content}`);   // 2-space indent + dash
            }
        }

        return formatted.join('\n');
    }

    function formatStandup(data) {
        const yesterdaySummary = formatSection(data.yesterday.summary || '');
        const todaySummary = formatSection(data.today.summary || '');

        return 'Q1: What DID you work yesterday?\n' +
            yesterdaySummary + '\n\n' +
            'Q2: What ARE you working today?\n' +
            todaySummary + '\n\n' +
            'Q3: Any BOTTLE NECK or ISSUES to complete your task?\n' +
            'No';
    }

    function renderResults(data) {
        resultsArea.classList.remove('hidden');
        const summaryContent = document.getElementById('summaryContent');

        if (data.today && data.yesterday) {
            // It's the history response
            summaryContent.classList.remove('hidden');
            summaryContent.textContent = formatStandup(data);
            sendBtn.style.display = 'none'; // Hide send btn since it's just history
        } else if (data.summary) {
            // Standard single summary
            summaryContent.classList.remove('hidden');
            summaryContent.textContent = data.summary;
            sendBtn.style.display = 'inline-block';
        } else {
            summaryContent.classList.add('hidden');
            sendBtn.style.display = 'inline-block';
        }

        // Pretty print JSON
        jsonOutput.textContent = JSON.stringify(data, null, 2);
    }

    function renderFolders(folders) {
        if (folders.length === 0) {
            folderList.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--vscode-descriptionForeground);">No folders selected</div>';
            return;
        }
        folderList.innerHTML = folders.map(f => `
            <div class="folder-item">
                <span title="${f}">${f.split(/[\\\/]/).pop()} <span style="opacity:0.5; font-size: 0.8em">(${f})</span></span>
            </div>
        `).join('');
    }
})();
