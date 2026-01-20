# AI Video Course Generator 🎥

An intelligent video course generator that creates educational videos with AI-generated content, text-to-speech narration, and interactive quizzes. Supports 8 languages including English and 7 Indian languages.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### 📹 Video Generation
- **AI-Powered Script Generation** using Google Gemini 2.5 Flash
- **Two Modes**:
  - **Crash Course**: 15-minute quick overview
  - **Full Course**: 30-60 minute comprehensive lessons (part-by-part)
- **Automated Slide Creation** with visual examples
- **High-Quality TTS** using Microsoft Edge TTS
- **Multi-Language Support**: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, Marathi

### 🧠 Quiz Generation
- **AI-Generated Questions** based on video content
- **10 Multiple-Choice Questions** per quiz
- **Difficulty Levels**: Easy (30%), Medium (50%), Hard (20%)
- **Instant Feedback** with detailed explanations
- **Score Grading**: A+ to D grading system
- **Multi-Language Support**: All 8 supported languages

### 🎨 Modern UI
- **Dark Mode** support
- **Responsive Design** for all screen sizes
- **Purple/Indigo Gradient** theme
- **Real-time Progress** tracking
- **Interactive Dashboard** with multiple tabs

## 🚀 Tech Stack

### Backend
- **Node.js** with Express
- **Google Gemini AI** for content generation
- **Microsoft Edge TTS** for voice synthesis
- **Puppeteer** for slide rendering
- **FFmpeg** for video processing

### Frontend
- **React** with TypeScript
- **Next.js** framework
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Axios** for API calls

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.7+ (for Edge TTS)
- **FFmpeg** installed and in PATH
- **Google Gemini API Key**

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/rak123456805/Text_to_video_Generator.git
cd "AI Video Course Generator"
```

### 2. Backend Setup
```bash
cd backend
npm install
pip install edge-tts
```

Create `.env` file:
```env
PORT=5000
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Install FFmpeg
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

## 🎯 Usage

### Start Backend
```bash
cd backend
npm run dev
```
Server runs on `http://localhost:5000`

### Start Frontend
```bash
cd frontend
npm run dev
```
App runs on `http://localhost:3000`

### Generate a Video
1. Open `http://localhost:3000`
2. Enter a topic (e.g., "Introduction to Python")
3. Select duration (15 min, 30 min, or 1 hour)
4. Choose language
5. Click "Generate Lesson"
6. Wait for video generation (2-5 minutes)

### Take a Quiz
1. After video generation, click "Quiz" in sidebar
2. Click "Generate Quiz"
3. Answer 10 questions
4. View your score and review answers

## 📁 Project Structure

```
AI Video Course Generator/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── videoController.js    # Video generation logic
│   │   │   └── quizController.js     # Quiz generation logic
│   │   ├── services/
│   │   │   ├── scriptService.js      # AI script generation
│   │   │   ├── tts/
│   │   │   │   └── index.js          # Edge TTS integration
│   │   │   ├── slideService.js       # Slide rendering
│   │   │   ├── videoService.js       # Video merging
│   │   │   └── quizService.js        # Quiz generation
│   │   └── routes/
│   │       ├── videoRoutes.js
│   │       └── quizRoutes.js
│   ├── fonts/                        # Indian language fonts
│   ├── generated/                    # Output videos
│   └── server.js                     # Express server
│
└── frontend/
    ├── src/
    │   └── app/
    │       ├── components/
    │       │   ├── DashboardPage.tsx
    │       │   ├── GenerateVideoSection.tsx
    │       │   ├── QuizSection.tsx
    │       │   └── DashboardSidebar.tsx
    │       └── styles/
    │           └── theme.css
    └── package.json
```

## 🌐 Supported Languages

| Language | Code | TTS Voice | Quiz Support |
|----------|------|-----------|--------------|
| English | en | en-IN-NeerjaNeural | ✅ |
| Hindi | hi | hi-IN-SwaraNeural | ✅ |
| Kannada | kn | kn-IN-GaganNeural | ✅ |
| Tamil | ta | ta-IN-PallaviNeural | ✅ |
| Telugu | te | te-IN-ShrutiNeural | ✅ |
| Malayalam | ml | ml-IN-SobhanaNeural | ✅ |
| Bengali | bn | bn-IN-TanishaaNeural | ✅ |
| Marathi | mr | mr-IN-AarohiNeural | ✅ |

## 🎬 Video Generation Process

1. **Topic Analysis** - Gemini AI analyzes topic feasibility
2. **Script Generation** - AI creates structured educational script
3. **Slide Creation** - Puppeteer renders slides with text and examples
4. **Audio Generation** - Edge TTS converts narration to speech
5. **Video Merging** - FFmpeg combines slides and audio
6. **Output** - MP4 video ready for download

## 🧪 Quiz Generation Process

1. **Content Analysis** - AI analyzes video script content
2. **Question Generation** - Creates 10 multiple-choice questions
3. **Difficulty Distribution** - Balances easy, medium, and hard questions
4. **Language Adaptation** - Generates questions in selected language
5. **Explanation Creation** - Provides detailed explanations for each answer

## 🔧 Configuration

### Video Settings
- **Slide Resolution**: 1280x720 (720p)
- **Audio Format**: MP3, 24kHz, 48kbps
- **Video Format**: MP4, H.264 codec
- **Frame Rate**: 30 fps

### Quiz Settings
- **Questions per Quiz**: 10
- **Options per Question**: 4 (A, B, C, D)
- **Difficulty Distribution**: 30% Easy, 50% Medium, 20% Hard

## 🐛 Troubleshooting

### Edge TTS Not Working
```bash
# Reinstall edge-tts
pip uninstall edge-tts
pip install edge-tts

# Verify installation
python -m edge_tts --version
```

### FFmpeg Not Found
- Ensure FFmpeg is installed and added to system PATH
- Restart terminal after installation
- Test: `ffmpeg -version`

### Gemini API Errors
- Check API key in `.env` file
- Verify API quota at [Google AI Studio](https://makersuite.google.com/app/apikey)
- If 503 error, wait and retry (API overloaded)

### Quiz Generation Fails
- Usually due to Gemini API being overloaded (503 error)
- Wait a few minutes and try again
- Check internet connection

## 📊 API Endpoints

### Video Generation
```
POST /api/video/analyze
POST /api/video/crash-course
POST /api/video/full-course/part
```

### Quiz Generation
```
POST /api/quiz/generate
```

## 🎨 UI Components

- **Dashboard** - Main navigation and overview
- **Generate Video** - Video creation interface
- **Videos** - Library of generated videos
- **Quiz** - Interactive quiz interface
- **Analytics** - Usage statistics (coming soon)
- **Settings** - App configuration (coming soon)

## 🔐 Environment Variables

```env
PORT=5000                    # Backend server port
GOOGLE_API_KEY=your_key      # Gemini AI API key
```

## 📝 License

MIT License - feel free to use this project for educational purposes.

## 👨‍💻 Author

**Rakshith H N**
- GitHub: [@rak123456805](https://github.com/rak123456805)
- Repository: [Text_to_video_Generator](https://github.com/rak123456805/Text_to_video_Generator)

## 🙏 Acknowledgments

- **Google Gemini AI** for content generation
- **Microsoft Edge TTS** for voice synthesis
- **FFmpeg** for video processing
- **Puppeteer** for slide rendering

## 🚧 Future Enhancements

- [ ] Quiz history and analytics
- [ ] User authentication
- [ ] Video templates
- [ ] Custom voice selection
- [ ] Subtitle generation
- [ ] Video editing capabilities
- [ ] Export to YouTube
- [ ] Collaborative features

## 📞 Support

For issues and questions:
1. Check [Troubleshooting](#-troubleshooting) section
2. Open an issue on GitHub
3. Contact via repository

---

**Made with ❤️ for education**
