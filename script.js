// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// Load environment variables
let config = {};

async function loadConfig() {
    try {
        const response = await fetch('/config');
        config = await response.json();
        if (!config.API_KEY || config.API_KEY === 'your-api-key-here') {
            console.error('API key not configured');
            alert('Please configure your API key in .env file');
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        alert('Error loading configuration. Please ensure the server is running and .env file exists.');
    }
}

// DOM elements
const fileInput = document.getElementById('pdf-file');
const extractBtn = document.getElementById('extract-btn');
const summarizeBtn = document.getElementById('summarize-btn');
const downloadBtn = document.getElementById('download-btn');
const extractedTextDiv = document.getElementById('extracted-text');
const summaryDiv = document.getElementById('summary');
const extractLoading = document.getElementById('extract-loading');
const summarizeLoading = document.getElementById('summarize-loading');
const summaryForecast = document.getElementById('summary-forecast');

// Settings elements
const chunkSizeInput = document.getElementById('chunk-size');
const contextOverlapInput = document.getElementById('context-overlap');
const summaryLengthInput = document.getElementById('summary-length');

let extractedText = '';
let finalSummary = '';
let wordCount = 0;

// Event listeners
fileInput.addEventListener('change', handleFileSelect);
extractBtn.addEventListener('click', extractText);
summarizeBtn.addEventListener('click', summarizeText);
downloadBtn.addEventListener('click', downloadSummary);

// Update forecast when settings change
[chunkSizeInput, contextOverlapInput, summaryLengthInput].forEach(input => {
    input.addEventListener('change', updateForecast);
});

// Load configuration when page loads
loadConfig();

function handleFileSelect(event) {
    if (event.target.files.length > 0) {
        extractBtn.disabled = false;
        summarizeBtn.disabled = true;
        downloadBtn.disabled = true;
        extractedTextDiv.textContent = '';
        summaryDiv.textContent = '';
        summaryForecast.textContent = '';
    }
}

function updateForecast() {
    if (!wordCount) return;
    
    const chunkSize = parseInt(chunkSizeInput.value);
    const summaryLength = parseInt(summaryLengthInput.value);
    
    const numChunks = Math.ceil(wordCount / chunkSize);
    const estimatedSummaryLength = numChunks * summaryLength;
    const compressionRatio = ((estimatedSummaryLength / wordCount) * 100).toFixed(1);
    
    summaryForecast.textContent = `Forecast:
• Total words in document: ${wordCount}
• Number of chunks: ${numChunks}
• Estimated summary length: ${estimatedSummaryLength} words
• Compression ratio: ${compressionRatio}%`;
}

function splitIntoChunks(text, chunkSize, contextOverlap) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
        let chunkStart = Math.max(0, i - contextOverlap);
        let chunkEnd = Math.min(words.length, i + chunkSize + contextOverlap);
        chunks.push(words.slice(chunkStart, chunkEnd).join(' '));
    }
    
    return chunks;
}

async function extractText() {
    const file = fileInput.files[0];
    if (!file) return;

    extractLoading.style.display = 'block';
    extractBtn.disabled = true;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let textContent = '';
        const numPages = pdf.numPages;
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const items = content.items;
            
            for (const item of items) {
                textContent += item.str + ' ';
            }
            textContent += '\n\n';
        }
        
        extractedText = textContent.trim();
        wordCount = extractedText.split(/\s+/).length;
        
        extractedTextDiv.textContent = extractedText;
        summarizeBtn.disabled = false;
        
        updateForecast();
        
    } catch (error) {
        console.error('Error extracting text:', error);
        extractedTextDiv.textContent = 'Error extracting text from PDF. Please try again.';
    }
    
    extractLoading.style.display = 'none';
}

async function summarizeText() {
    if (!extractedText || !config.API_KEY || config.API_KEY === 'your-api-key-here') {
        alert('Please configure your API key in .env file');
        return;
    }
    
    const chunkSize = parseInt(chunkSizeInput.value);
    const contextOverlap = parseInt(contextOverlapInput.value);
    const targetLength = parseInt(summaryLengthInput.value);
    
    summarizeLoading.style.display = 'block';
    summarizeBtn.disabled = true;
    summaryDiv.textContent = '';
    
    try {
        const chunks = splitIntoChunks(extractedText, chunkSize, contextOverlap);
        let fullSummary = '';
        
        for (let i = 0; i < chunks.length; i++) {
            summaryDiv.textContent += `\nProcessing chunk ${i + 1} of ${chunks.length}...\n`;
            
            const response = await fetch(config.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.API_KEY}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'PDF Chapter Summarizer'
                },
                body: JSON.stringify({
                    model: config.MODEL,
                    messages: [{
                        role: 'user',
                        content: `Please summarize the following text in approximately ${targetLength} words. Focus on the main points and key ideas. Format the summary in markdown:\n\n${chunks[i]}`
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error Response:', errorData);
                throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.choices?.[0]?.message?.content) {
                const chunkSummary = data.choices[0].message.content;
                fullSummary += chunkSummary + '\n\n---\n\n';
                summaryDiv.textContent = summaryDiv.textContent.split('Processing chunk')[0] + 
                    `Processing chunk ${i + 1} of ${chunks.length}...\n\n` + fullSummary;
            } else {
                console.error('Unexpected API response structure:', data);
                throw new Error(`Invalid response structure from AI service. Response: ${JSON.stringify(data)}`);
            }
            
            // Add a small delay between API calls
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        finalSummary = fullSummary;
        downloadBtn.disabled = false;
        
    } catch (error) {
        console.error('Error generating summary:', error);
        summaryDiv.textContent = `Error generating summary: ${error.message}. Please try again.`;
    }
    
    summarizeLoading.style.display = 'none';
    summarizeBtn.disabled = false;
}

function downloadSummary() {
    if (!finalSummary) return;
    
    const fileName = fileInput.files[0].name.replace('.pdf', '') + '_summary.txt';
    const blob = new Blob([finalSummary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
