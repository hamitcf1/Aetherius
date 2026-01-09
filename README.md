<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Skyrim Aetherius - Interactive Roleplay Campaign Manager

A sophisticated web application for creating, managing, and developing Skyrim Elder Scrolls roleplay characters with AI-powered storytelling, character generation, and game state management.

## 🎮 Features

### Character Creation & Management
- **Multiple Creation Methods**
  - Manual creation with customizable stats and attributes
  - AI-powered random generation for instant characters
  - Interactive Scribe Chat for guided character creation
  - Text import to convert existing character sheets
  
- **Editable Character Details**
  - Rename characters and profiles at any time
  - Manage character stats: Health, Magicka, Stamina (slider + numeric input)
  - Track 18 unique Skyrim skills with individual levels
  - Define psychological traits: identity, psychology, moral code
  - Manage perks and milestones
  - Auto-generated profile photos for each race

### Inventory System
- Track weapons, armor, potions, ingredients, and miscellaneous items
- Manage equipped items
- Track character wealth (gold)
- Organize items by type

### Quest Management
- Create custom quests with objectives and tracking
- Track quest status: active, completed, failed
- Set quest locations and due dates
- Link quests to character progression

### Story & Narrative
- **Create Chapters Manually** - Write your own story entries
- **AI-Powered Chapter Generation** - Describe what happens, AI generates context-aware narrative
- **Story Finalization** - Export complete chronicle as PDF
- **Memory Visualization** - Generate AI art to visualize story scenes
- **Context-Aware Storytelling** - AI considers character stats, quests, and items when generating chapters

### Journal & Personal Notes
- Track character thoughts and experiences
- Organize entries by date and title
- Personal narrative development

### Game Master Integration
- AI Game Master responses to character actions
- Dynamic game state updates based on narrative
- Automatic quest and item management via AI

### Data Management
- **Automatic Cloud Sync** - Firebase integration for automatic saving
- **Manual Save Button** - Explicitly save all data to database
- **User Profiles** - Support multiple character profiles per user
- **Data Persistence** - All changes saved to Firebase Realtime Database

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Firebase account
- Google Gemini API key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Aetherius

# Install dependencies
npm install

# Create .env file with credentials
# See .env.local.example for all required variables

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

1. **Register/Login** - Create account or log in with email
2. **Select Profile** - Choose or create a user profile
3. **Create Character** - Generate character using one of four methods
4. **Develop Character** - Edit stats, skills, psychology, and backstory
5. **Manage Inventory** - Add items and track equipment
6. **Create Quests** - Set up character objectives and missions
7. **Write Story** - Create chapters or let AI generate narrative
8. **Save Progress** - Click "Save" button or rely on auto-save

## 📖 Tabs Overview

### Hero Tab
- Main character sheet with all attributes
- View and edit stats with dual controls (slider + numeric)
- Manage skills, perks, and milestones
- Set psychological traits and roleplay constraints
- Generate profile photo
- Export full record as PDF

### Items Tab
- Inventory management with categorization
- Track equipped items
- Manage character wealth
- Add/remove items from inventory

### Quests Tab
- Active quest tracking
- Create new quests with objectives
- Update quest status
- Manage quest locations and deadlines

### Story Tab
- Timeline view of all chapters
- Create new chapters (manual or AI-generated)
- Visualize story scenes with AI-generated images
- Export complete story as PDF

### Journal Tab
- Personal diary entries
- Track character thoughts and experiences
- Date-organized narrative

## 🤖 AI Integration

### Character Generation
Uses Gemini API to generate:
- Unique character profiles based on descriptions
- Stat distributions balanced to gameplay
- Starting inventory appropriate to class
- Opening story chapters

### Story Generation
- Context-aware chapter generation considering:
  - Current character stats
  - Active quests
  - Recent journal entries
  - Inventory items
- Maintains narrative continuity

### Image Generation
- Character profile portraits for each race
- Story scene visualizations
- Fantasy art style Skyrim-themed imagery

## 🔐 Authentication

- Firebase Authentication with email/password
- Secure user account management
- Per-user data isolation
- Cloud persistence with real-time sync

## 🔧 Technical Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Realtime Database + Authentication)
- **AI**: Google Gemini API
- **PDF Export**: jsPDF + html2canvas
- **Icons**: Lucide React

## ⚙️ Configuration

### Firebase Setup
1. Create Firebase project at console.firebase.google.com
2. Enable Realtime Database
3. Set up Authentication with email/password
4. Copy credentials to environment variables

### Gemini API Setup
1. Get API key from Google AI Studio (ai.google.dev)
2. Enable Generative AI API
3. Set quota limits appropriate for your usage

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify
```bash
npm run build
# Deploy dist/ folder to Netlify
```

## 📈 Performance Notes

- Large PDF exports may take 5-10 seconds
- Image generation is rate-limited by Gemini API
- Auto-save triggers on state changes (debounced)
- Lazy loading of jsPDF for smaller initial bundle

## 🐛 Known Issues & Limitations

- Gemini free tier has rate limits (429 quota errors)
- Large character imports may timeout
- PDF export size grows with story length
- Image generation requires quota availability

## 💬 Support & Contributing

For issues or questions:
1. Check console for error messages
2. Verify Firebase configuration
3. Check API quota limits
4. Review browser compatibility

## 📄 License

Project developed for Skyrim roleplay community.

## 🙏 Credits

- Skyrim/Elder Scrolls - Bethesda Game Studios
- AI Integration - Google Gemini API
- Backend - Firebase
- Icons - Lucide React

---

**Version**: 1.0.0  
**Last Updated**: January 2026
