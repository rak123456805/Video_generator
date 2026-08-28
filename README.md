# AI Video Course Generator 🎥

An intelligent video course generator that creates educational videos with AI-generated content, text-to-speech narration, and interactive quizzes. Supports 8 languages including English and 7 Indian languages.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 Features

### 📹 Video Generation & Intelligent Scene Planning
- **AI-Powered Script Generation** using Google Gemini 2.5 Flash
- **TextRank Algorithmic NLP Engine** for intelligent scene planning, concept centrality ranking, and visual emphasis prioritization
- **Two Generation Modes**:
  - **Crash Course**: 15-minute quick overview
  - **Full Course**: 30-60 minute comprehensive lessons (part-by-part)
- **Automated Slide Creation** with dynamic HTML templates and Puppeteer rendering
- **High-Quality TTS** using Microsoft Edge TTS
- **Multi-Language Support**: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, Marathi
- **Asynchronous Pipeline** with real-time per-component progress tracking

### ☁️ Per-User Google Drive Cloud Storage
- **Direct Cloud Upload**: Generated videos automatically save to each user's personal Google Drive in a dedicated `TextToVideo` folder
- **Seamless Streaming**: Blob URL video player with chunked streaming and CORS handling
- **AES-256-CBC Encryption** for secure storage of OAuth refresh tokens

### 🧠 Interactive Quizzes & Analytics
- **AI-Generated Questions** automatically tailored to video script content
- **10 Multiple-Choice Questions** per quiz with balanced difficulty (Easy 30%, Medium 50%, Hard 20%)
- **Score Analytics & History**: Persistent quiz results, grade tracking (A+ to D), and accuracy statistics in Supabase
- **Instant Explanations** for every question

### 🎨 Modern UI & Authentication
- **Dark Mode & Purple Gradient** aesthetic
- **Responsive Layout** for desktop, tablet, and mobile
- **Supabase Authentication**: Email/Password and OAuth (Google, GitHub)
- **Interactive Dashboard**: Tabs for Generation, Video Library, Interactive Quizzes, Analytics, and Google Drive Cloud integration

## 🚀 Tech Stack

### Backend
- **Node.js & Express**
- **Google Gemini 2.5 Flash** for content and quiz generation
- **TextRank NLP Engine** (Pure JS implementation with TF-IDF, Cosine Similarity, and PageRank power iteration)
- **Microsoft Edge TTS** (`edge-tts` Python engine) for natural voice synthesis
- **Puppeteer** (Chrome) for high-definition slide generation
- **FFmpeg & Fluent-FFmpeg** for slide sequencing and audio/video merging
- **Google Drive API (v3)** & **Crypto (AES-256-CBC)** for cloud storage and token security
- **Supabase Admin SDK** with PostgreSQL for persistent storage

### Frontend
- **React** with TypeScript
- **Next.js / Vite** with modern Tailwind CSS & Theme Tokens
- **Framer Motion** for sleek micro-animations
- **Lucide React** for UI icons
- **Axios** with JWT interceptors
- **Supabase JS Client** for auth & session management

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.7+ (for Edge TTS)
- **FFmpeg** installed and in system PATH
- **Google Gemini API Key**
- **Supabase Project** (Database & Auth)
- **Google Cloud Console OAuth 2.0 Credentials** (Optional, for Google Drive upload)

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/rak123456805/Text_to_video_Generator.git
cd Text_to_video_Generator
```

### 2. Backend Setup
```bash
cd backend
npm install
pip install edge-tts
```

Create `backend/.env`:
```env
PORT=5000
GOOGLE_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Drive OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-drive/callback
GOOGLE_DRIVE_ENCRYPTION_KEY=your_64_character_hex_key

FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
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
Runs on `http://localhost:5000`

### Start Frontend
```bash
cd frontend
npm run dev
```
Runs on `http://localhost:5173`

---

## 📁 Project Structure

```
Text_to_video_Generator/
├── backend/
│   ├── scripts/
│   │   ├── ensureChrome.mjs          # Puppeteer browser validation
│   │   └── test-textrank.js          # TextRank algorithm test suite
│   ├── src/
│   │   ├── config/
│   │   │   ├── ffmpeg.js             # FFmpeg binary config
│   │   │   └── supabaseAdmin.js      # Supabase admin client
│   │   ├── controllers/
│   │   │   ├── videoController.js    # Video generation & TextRank endpoints
│   │   │   ├── quizController.js     # Quiz generation, results & stats
│   │   │   └── googleDriveController.js # Drive OAuth, uploads & streaming
│   │   ├── middleware/
│   │   │   └── authMiddleware.js     # Supabase JWT token verification
│   │   ├── routes/
│   │   │   ├── videoRoutes.js        # /api/video routes
│   │   │   ├── quizRoutes.js         # /api/quiz routes
│   │   │   └── googleDriveRoutes.js  # /api/google-drive routes
│   │   └── services/
│   │       ├── textRankService.js    # Pure TextRank NLP & Scene Planner
│   │       ├── pipelineService.js    # Async generation orchestrator
│   │       ├── scriptService.js      # Gemini script generation
│   │       ├── slideService.js       # Puppeteer slide rendering
│   │       ├── slideVideoService.js  # Slide-to-video compilation
│   │       ├── videoMergeService.js  # FFmpeg audio/video merging
│   │       ├── googleDriveService.js # Drive API v3 & token encryption
│   │       ├── encryptionService.js  # AES-256-CBC token encryption
│   │       ├── quizService.js        # Gemini quiz generation
│   │       ├── jobStore.js           # In-memory async job manager
│   │       └── tts/
│   │           └── index.js          # Edge TTS multi-language voice engine
│   ├── generated/                    # Temporary & cached output MP4s/slides
│   └── server.js                     # Express app setup & CORS config
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios client with auth interceptors
│   │   │   ├── quizApi.ts            # Quiz submission & analytics API
│   │   │   └── googleDriveApi.ts     # Drive connection & status API
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── DashboardPage.tsx # Main dashboard layout
│   │   │   │   ├── GenerateVideoSection.tsx # Video prompt interface
│   │   │   │   ├── RecentVideos.tsx  # Video library & Drive stream player
│   │   │   │   ├── QuizSection.tsx   # Interactive quiz component
│   │   │   │   └── AnalyticsSection.tsx # Quiz score trends & statistics
│   │   │   └── contexts/
│   │   │       ├── AuthContext.tsx   # User authentication context
│   │   │       └── VideoContext.tsx  # Video state & history context
│   │   └── styles/
│   │       └── theme.css
│   └── package.json
│
└── supabase/
    └── migrations/                   # SQL migrations for connections & quizzes
```

---

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

---

## 🎬 Video Generation Process

1. **Topic Feasibility Check** - Gemini analyzes topic density and estimates course parts.
2. **Script Generation** - Gemini creates structured scene narration and bullets.
3. **TextRank NLP Scene Planning** - TextRank builds a TF-IDF cosine similarity graph, computes PageRank importance scores, ranks key concepts, and assigns visual emphasis tiers.
4. **Slide Rendering** - Puppeteer renders high-resolution 720p slide frames.
5. **Voice Synthesis** - Microsoft Edge TTS generates crystal-clear narration.
6. **Video Merging** - FFmpeg calculates slide durations and merges audio + video into MP4.
7. **Cloud Upload** - Video is automatically saved to the user's personal Google Drive folder.

---

## 📊 API Endpoints Reference

### Video Generation (`/api/video`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/video/analyze` | Analyze topic feasibility and part estimation |
| `POST` | `/api/video/crash-course` | Start 15-minute crash course generation |
| `POST` | `/api/video/full-course/part` | Start full course part generation |
| `GET` | `/api/video/status/:jobId` | Poll per-component status of active job |
| `GET` | `/api/video/list` | List completed local and Google Drive videos |
| `POST` | `/api/video/text-rank/analyze` | Standalone TextRank NLP analysis testing endpoint |

### Quiz & Analytics (`/api/quiz`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quiz/:jobId` | Fetch quiz for a specific video job |
| `POST` | `/api/quiz/result` | Save user quiz answers, score, and grade |
| `GET` | `/api/quiz/results` | Fetch user's quiz attempt history |
| `GET` | `/api/quiz/stats` | Fetch aggregate quiz analytics (quizzes taken, avg score, grade distribution) |

### Google Drive Storage (`/api/google-drive`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/google-drive/auth-url` | Get Google OAuth 2.0 consent URL |
| `GET` | `/api/google-drive/callback` | OAuth redirect callback (exchanges code & encrypts token) |
| `GET` | `/api/google-drive/status` | Check if user has active Google Drive connection |
| `GET` | `/api/google-drive/stream/:fileId` | Stream video file from Drive with HTTP Range support |
| `POST` | `/api/google-drive/disconnect` | Revoke and delete user's Google Drive connection |

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000                    # Backend server port
GOOGLE_API_KEY=your_key      # Gemini AI API key
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_project_url          # Supabase project URL
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key        # Supabase anon key
```

## ☁️ Google Drive Integration Setup

The app supports saving generated videos directly to each user's personal Google Drive in a folder named `TextToVideo`. Follow the steps below to configure Google Cloud Console and set up the integration.

### 1. Google Cloud Project Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Search for and enable the **Google Drive API**.
4. Configure the **OAuth consent screen**:
   - Select **External** user type.
   - Fill in the App name, User support email, and Developer contact information.
   - Under **Scopes**, click **Add or Remove Scopes** and add:
     `https://www.googleapis.com/auth/drive.file` (access to files created/opened by the app)
     `https://www.googleapis.com/auth/userinfo.email` (read user's email address)
   - Add your test Google Account(s) under **Test Users** (crucial while in Testing status).
5. Create **Credentials**:
   - Click **Create Credentials** → **OAuth client ID**.
   - Select **Web application** as application type.
   - Add an **Authorized Redirect URI**:
     - Local development: `http://localhost:5000/api/google-drive/callback`
     - Production: `https://your-backend-domain.com/api/google-drive/callback`
   - Save your **Client ID** and **Client Secret**.

### 2. Encryption Key Generation
We encrypt the refresh tokens before storing them in Supabase. Generate a 32-byte (64 character hex) key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Backend Environment Variables
Update `backend/.env` with your credentials:
```env
# Supabase Admin configuration (Required to verify user JWTs and write connection details)
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Drive OAuth Config
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google-drive/callback
GOOGLE_DRIVE_ENCRYPTION_KEY=your_generated_64_character_hex_key

# App URLs for redirection post-auth
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

### 4. Database Setup
Create the required `google_drive_connections` table in your Supabase database by executing the SQL migration located at `supabase/migrations/20240101000000_create_google_drive_connections.sql` in the Supabase SQL editor.

---

## 🔬 TextRank-Based Intelligent Scene Selection

### 1. What is TextRank?
**TextRank** is a graph-based ranking algorithm for Natural Language Processing (NLP) inspired by Google's PageRank algorithm (Mihalcea & Tarau, 2004). Rather than treating a script as an unordered sequence of words, TextRank models the relationship between sentences as an interconnected, weighted graph to quantify concept centrality and relative sentence importance.

### 2. Why is TextRank Used in This Project?
In educational video generation, AI models generate comprehensive scripts that vary in technical density across sections. TextRank acts as an algorithmic, explainable NLP prioritization layer that:
- Identifies core concept sentences vs introductory/filler content.
- Measures concept centrality across all generated scenes without deleting educational content.
- Assigns importance scores to individual scenes to drive visual emphasis and asset allocation.

### 3. Architecture & Pipeline

```
User Topic
    ↓
Google Gemini 2.5 Flash
    ↓
AI-Generated Script & Narration
    ↓
Sentence Segmentation & Preprocessing (Stopwords, Tokenization)
    ↓
TF-IDF Vector Numerical Representation
    ↓
Cosine Similarity Matrix Computation
    ↓
Weighted Sentence Graph Construction
    ↓
TextRank / PageRank Power Iteration (d = 0.85)
    ↓
Sentence Importance Scores & Key Concepts
    ↓
Intelligent Scene Planner (Visual Emphasis & Prioritization)
    ↓
Puppeteer Slide Rendering & TTS Audio Generation
    ↓
FFmpeg Video Merging & Google Drive Upload
```

### 4. Mathematical Foundation

#### A. TF-IDF Representation
Each preprocessed sentence $d$ in corpus $D$ is converted into a vector:
$$\text{TF}(t, d) = \frac{f_{t, d}}{|d|}$$
$$\text{IDF}(t, D) = \ln\left(1 + \frac{|D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
$$\vec{S}_d[t] = \text{TF}(t, d) \times \text{IDF}(t, D)$$

#### B. Cosine Similarity Matrix
The similarity weight $W_{ij}$ between two sentences $\vec{S}_i$ and $\vec{S}_j$ is computed as:
$$\text{sim}(\vec{S}_i, \vec{S}_j) = \frac{\vec{S}_i \cdot \vec{S}_j}{\|\vec{S}_i\|_2 \times \|\vec{S}_j\|_2} = \frac{\sum_k \vec{S}_i[k] \vec{S}_j[k]}{\sqrt{\sum_k \vec{S}_i[k]^2} \sqrt{\sum_k \vec{S}_j[k]^2}}$$
Edges are added to the sentence graph where $\text{sim}(\vec{S}_i, \vec{S}_j) \ge 0.05$.

#### C. TextRank Power Iteration
Vertex scores are iteratively converged using the standard damping factor $d = 0.85$:
$$WS(V_i) = (1 - d) + d \sum_{V_j \in \text{In}(V_i)} \left( \frac{W_{ji}}{\sum_{V_k \in \text{Out}(V_j)} W_{jk}} \right) WS(V_j)$$

### 5. Scene Planning & Visual Emphasis
TextRank scores enrich each scene with:
- `importanceScore`: Aggregated concept weight of the scene.
- `textRankRank`: Relative importance rank across all scenes.
- `visualEmphasis`: Categorization (`high`, `medium`, `standard`) informing slide styling and image generation prioritization.
- `keyConcepts`: High-centrality summary sentences extracted for visual highlights.

### 6. Academic Explanation
> *"We use the TextRank graph-based NLP algorithm to rank sentences and identify important concepts in the AI-generated script. Sentence similarity is calculated using cosine similarity over TF-IDF representations, which is used to construct a weighted sentence graph. TextRank then assigns an importance score to each sentence. These scores are used by our scene-planning component to prioritize important concepts and improve the relevance and visual organization of generated video scenes."*

---

## 📝 License

## 👨‍💻 Author

**Rakshith H N**
- GitHub: [@rak123456805](https://github.com/rak123456805)
- Repository: [Text_to_video_Generator](https://github.com/rak123456805/Text_to_video_Generator)

opr## 🙏 Acknowledgments

- **Google Gemini AI** for content generation
- **Microsoft Edge TTS** for voice synthesis
- **FFmpeg** for video processing
- **Puppeteer** for slide rendering

## 🚧 Future Enhancements

- [ ] Quiz history and analytics
- [ ] Video templates
- [ ] Custom voice selection
- [ ] Subtitle generation
- [ ] Video editing capabilities
- [ ] Export to YouTube
- [ ] Collaborative features
- [ ] User profiles and preferences

## 📞 Support

For issues and questions:
1. Check [Troubleshooting](#-troubleshooting) section
2. Open an issue on GitHub
3. Contact via repository

---

**Made with ❤️ for education**
