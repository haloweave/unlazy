# Unlazy.ai 🧠

An AI tool that encourages cognitive engagement before revealing answers. Think before you answer!

## 🚀 Features

- **Cognitive Engagement**: GPT responds with thinking prompts before providing answers
- **Brain Food Counter**: Gamified system that tracks your thinking progress
- **Analytics Dashboard**: View your thinking metrics, topics, and progress
- **User Authentication**: Secure login with Clerk
- **Real-time Chat**: Fluid conversation interface with animations
- **Topic Detection**: Automatically categorizes your questions and interests

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: TailwindCSS + Framer Motion
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Clerk account
- Supabase account
- OpenAI API key

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd unlazy-ai
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Copy your Supabase URL and keys to `.env.local`

### 4. Clerk Setup

1. Create a Clerk application
2. Configure your sign-in methods
3. Add your domain to allowed origins
4. Copy your Clerk keys to `.env.local`

### 5. OpenAI Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Add it to your `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Chat API with OpenAI integration
│   │   └── brain-metrics/route.ts # Analytics API
│   ├── brain/page.tsx             # Analytics dashboard
│   ├── chat/page.tsx              # Main chat interface
│   ├── profile/page.tsx           # User profile
│   ├── layout.tsx                 # Root layout with Clerk provider
│   └── page.tsx                   # Landing page
├── components/
│   ├── BrainFoodCounter.tsx       # Animated brain food counter
│   └── ChatInterface.tsx          # Main chat component
└── lib/
    └── supabase.ts               # Supabase client and types
```

## 🗄️ Database Schema

### Tables

1. **users**: Stores user information linked to Clerk
2. **chats**: Stores all chat messages with session tracking
3. **brain_metrics**: Stores user analytics and brain food counts

### Key Features

- Row Level Security (RLS) enabled
- Automatic user creation on first login
- Session-based chat tracking
- Topic detection and categorization

## 🎨 Design System

- **Colors**: Indigo/blue gradient theme
- **Typography**: Inter font family
- **Animations**: Framer Motion for smooth interactions
- **Layout**: Responsive design with TailwindCSS

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all environment variables in your deployment platform:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## 🔧 API Endpoints

### POST /api/chat
Handles chat messages and OpenAI integration

**Request:**
```json
{
  "message": "What is machine learning?",
  "sessionId": "session_123"
}
```

**Response:**
```json
{
  "thinkingPrompt": "You're getting smarter... Think before you answer.",
  "response": "Great question! Machine learning is...",
  "brainFoodEarned": 1
}
```

### GET /api/brain-metrics
Returns user analytics and progress data

**Response:**
```json
{
  "metrics": {
    "brain_food_count": 42,
    "total_questions": 15,
    "total_thinking_time": 3600
  },
  "weeklyProgress": [...],
  "topics": ["AI/ML", "JavaScript"]
}
```

## 🧠 How It Works

1. **User asks a question** → Message sent to API
2. **GPT generates thinking prompt** → Encourages user to think
3. **User responds with thoughts** → Cognitive engagement
4. **GPT provides refined answer** → Builds on user's thinking
5. **Brain food earned** → Gamified progress tracking
6. **Analytics updated** → Track thinking patterns and topics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support, email support@unlazy.ai or create an issue in this repository.

---

Built with ❤️ to make thinking fun again!