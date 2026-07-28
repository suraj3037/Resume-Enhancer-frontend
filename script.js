// Configuration: Pointing to your live Vercel backend
const BACKEND_URL = "https://resume-enhancer-backend-nine.vercel.app/api/v1/enhance-resume-stream";

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileDisplay = document.getElementById('file-display');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const analyzeBtn = document.getElementById('analyze-btn');
const resultsSection = document.getElementById('results-section');
const outputContent = document.getElementById('output-content');
const streamStatus = document.getElementById('stream-status');
const loader = document.getElementById('loader');

let selectedFile = null;

// Drag and drop event listeners
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect, false);
removeFileBtn.addEventListener('click', resetFileSelection);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) validateAndSetFile(files[0]);
}

function handleFileSelect(e) {
    if (e.target.files.length) validateAndSetFile(e.target.files[0]);
}

function validateAndSetFile(file) {
    if (file.type !== "application/pdf") {
        alert("Invalid file format. Please upload a PDF file only.");
        return;
    }
    selectedFile = file;
    fileName.textContent = file.name;
    fileDisplay.style.display = "flex";
    analyzeBtn.disabled = false;
}

function resetFileSelection(e) {
    if(e) e.stopPropagation();
    selectedFile = null;
    fileInput.value = "";
    fileDisplay.style.display = "none";
    analyzeBtn.disabled = true;
}

// Handle Streaming API Request
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // UI state updates
    analyzeBtn.disabled = true;
    loader.style.display = "inline-block";
    resultsSection.style.display = "block";
    outputContent.innerHTML = "";
    streamStatus.textContent = "Streaming live...";
    streamStatus.style.color = "var(--success)";
    streamStatus.style.borderColor = "rgba(16, 185, 129, 0.2)";
    streamStatus.style.background = "rgba(16, 185, 129, 0.1)";

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
        }

        // Initialize ReadableStream reader
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let rawText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the stream chunk and append to UI
            const chunk = decoder.decode(value, { stream: true });
            rawText += chunk;
            
            // Enhanced formatting to clean up LLM Markdown output
            outputContent.innerHTML = formatStreamedText(rawText);
            
            // Auto-scroll to the bottom of the card as content arrives
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

        streamStatus.textContent = "✨ Analysis Complete";
        streamStatus.style.color = "#38bdf8";
        streamStatus.style.borderColor = "rgba(56, 189, 248, 0.2)";
        streamStatus.style.background = "rgba(56, 189, 248, 0.1)";

    } catch (error) {
        outputContent.innerHTML = `<div style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);"><strong>Error generating feedback:</strong> ${error.message}</div>`;
        streamStatus.textContent = "Failed";
        streamStatus.style.color = "#ef4444";
        streamStatus.style.borderColor = "rgba(239, 68, 68, 0.2)";
        streamStatus.style.background = "rgba(239, 68, 68, 0.1)";
    } finally {
        analyzeBtn.disabled = false;
        loader.style.display = "none";
    }
});

// Upgraded markdown parser for better visual structure
function formatStreamedText(text) {
    return text
        // Format bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Format markdown H3 headers (### Header)
        .replace(/^###\s+(.*$)/gim, '<h3>$1</h3>')
        // Format markdown H2 headers (## Header)
        .replace(/^##\s+(.*$)/gim, '<h3 style="font-size:1.3rem; color:#60a5fa;">$1</h3>')
        // Format bullet points visually
        .replace(/^\*\s+(.*$)/gim, '<div style="display:flex; gap:0.5rem; margin-left:0.5rem;"><span style="color:#60a5fa;">•</span><span>$1</span></div>');
}