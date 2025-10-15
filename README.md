# YOURWAV - AI-Powered Audio Processing Studio

A web-based platform for AI-powered vocal separation, audio effects, and transcription.

## Features

- AI-powered vocal and instrumental separation
- Audio effects: pitch shift, speed control, reverb
- Automatic lyric transcription
- Real-time audio visualization
- Processing history and file management

## Tech Stack

**Frontend**
- Next.js 15 (App Router)
- React + TypeScript
- Tailwind CSS + ShadCN/UI
- WaveSurfer.js

**Backend**
- Next.js API Routes
- MongoDB Atlas
- Python (subprocess integration)

**Audio Processing**
- librosa, soundfile, numpy
- PyTorch (vocal separation model)
- FFmpeg
- OpenAI Whisper

## Prerequisites

- Node.js 18+
- Python 3.8+
- MongoDB
- FFmpeg

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/Audio-Spleeter.git
cd Audio-Spleeter
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Download Vocal Separation Model

Download the pre-trained model from [vocal-remover](https://github.com/tsurumeso/vocal-remover):

```bash
# The vocal-remover directory should contain the model files
# Download the baseline model from the repository
```

**Manual Download:**
1. Visit https://github.com/tsurumeso/vocal-remover
2. Download the baseline model file (.pth)
3. Place it in the `vocal-remover/` directory

### 5. Setup Environment Variables

Create `.env.local` file:

```env
MONGODB_URI=your_mongodb_connection_string
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
NEXTAUTH_SECRET=your_random_secret_key
NEXTAUTH_URL=http://localhost:3000
UPLOAD_DIR=./public/uploads
```

### 6. Install FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
yourwav/
├── audio/                # Audio processing directory
├── public/               # Static files and uploads
├── src/                  # Source code
├── vocal-remover/        # Vocal separation model
├── .env.local            # Environment variables (create this)
├── .gitignore           
├── components.json       # ShadCN/UI config
├── eslint.config.mjs     # ESLint configuration
├── middleware.ts         # Next.js middleware
├── next-env.d.ts        
├── next.config.ts        # Next.js configuration
├── package.json          # Node dependencies
├── package-lock.json    
├── postcss.config.mjs    # PostCSS config
├── README.md            
├── requirements.txt      # Python dependencies
└── tsconfig.json         # TypeScript configuration
```

## Usage

1. **Register/Login** - Create an account
2. **Upload Audio** - Upload MP3 or WAV file
3. **Select Process** - Choose vocal separation, effects, or transcription
4. **Download** - Get your processed audio
5. **History** - Access all processed files from dashboard

## API Endpoints

```
POST   /api/auth/register       - User registration
POST   /api/auth/login          - User login
POST   /api/upload              - Upload audio file
POST   /api/process/separate    - Separate vocals
POST   /api/process/effects     - Apply audio effects
POST   /api/process/transcribe  - Generate transcription
GET    /api/history             - Get user history
GET    /api/download/:fileId    - Download file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add NewFeature'`)
4. Push to branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

## License

MIT License

## Author

Dev Trivedi
