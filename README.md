# PDF Chapter Summarizer

A web-based tool that summarizes PDF documents using AI, processing the text in configurable chunks with context overlap.

## Features

- PDF text extraction with PDF.js
- Configurable chunk size for processing
- Context overlap between chunks for better continuity
- Customizable summary length per chunk
- Real-time summary length forecasting
- Progress tracking during summarization
- Downloadable summaries in markdown format
- Environment-based configuration

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Install dependencies:
```bash
npm install
```

3. Configure the environment:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API credentials
nano .env
```

4. Get an API key:
- Sign up at [OpenRouter](https://openrouter.ai/)
- Create an API key
- Add the key to your `.env` file

5. Start the server:
```bash
npm start
```

6. Open the application:
- Visit http://localhost:8000 in your web browser

## Usage

1. Upload a PDF file using the file selector
2. Configure the summarization settings:
   - Words per chunk: How many words to process at once
   - Context overlap: Words to include from previous/next chunks
   - Summary length: Target length for each chunk's summary
3. Click "Extract Text" to process the PDF
4. Review the forecast for estimated summary length
5. Click "Summarize" to begin the AI summarization
6. Download the final summary as a markdown file

## Configuration

The following settings can be configured in `.env`:

- `API_KEY`: Your OpenRouter API key
- `API_ENDPOINT`: The API endpoint (default: OpenRouter's completion endpoint)
- `MODEL`: The AI model to use (default: gpt-4-mini)

## Requirements

- Node.js 14.0 or higher
- Modern web browser with JavaScript enabled
- Internet connection for API access
- OpenRouter API key

## License

MIT License
