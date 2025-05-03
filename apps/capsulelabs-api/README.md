# CapsuleLab

CapsuleLab is an experimental platform for building interactive, trigger-based digital capsules. These capsules can contain messages, media, puzzles, or tasks, and unlock based on unique conditions such as time, location, or player interaction. Each capsule feature explores a different mechanic or concept, allowing for modular development and creative experimentation.

## Core Ideas

- **Capsule Base Model**: Shared model used across all capsule features
- **Modular Architecture**: Each feature (like TimeBomb) is isolated in its own route and logic
- **Pluggable Triggers**: Unlock conditions include time expiry, geolocation, puzzles, and more

## Capsule Features

- **TimeBomb** – Plant time-sensitive capsules that others nearby must defuse before they expire

---

## TimeBomb

### Description

**TimeBomb** is a game-like capsule mode where users plant digital "bombs" (capsules) that self-destruct after a set time unless nearby users find and defuse them. These capsules can carry media or messages that are only revealed upon defusal.

### Installation

\`\`\`bash
$ npm install
\`\`\`

### Configuration

Create a \`.env\` file in the root directory with the following variables:

\`\`\`
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/timebomb

# Storage Configuration
STORAGE_TYPE=local
UPLOAD_DIR=uploads
BASE_URL=http://localhost:3000

# AWS S3 Configuration (only needed if STORAGE_TYPE=s3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name
\`\`\`

### Running the App

\`\`\`bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
\`\`\`

### API Endpoints

#### User Management
- \`POST /users\` – Create a new user

#### Media Upload
- \`POST /media/upload\` – Get signed URL for media upload
- \`POST /media/upload/local\` – Upload directly to local storage

#### TimeBomb Capsules
- \`POST /timebomb/plant\` – Plant a new TimeBomb capsule
- \`GET /timebomb/:id\` – Retrieve a TimeBomb capsule by ID
- \`GET /timebomb/nearby\` – Discover nearby active capsules
- \`POST /timebomb/:id/defuse\` – Defuse a capsule
- \`POST /timebomb/trigger-expiry-check\` – Manually check for expired capsules

### TimeBomb Features

1. **Plant Capsules** with text or media that self-destruct after a timer.
2. **Nearby Discovery** via geolocation within 300 meters.
3. **Defuse Mechanic** reveals capsule content.
4. **Auto Expiry** cleans up expired capsules automatically.
5. **Notifications** for creators when capsules expire or are defused.

### Architecture

- **NestJS Framework**
- **MongoDB + Mongoose**
- **Geospatial Queries**
- **Scheduled Tasks** via \`@nestjs/schedule\`
- **Media Storage** via Local or AWS S3
