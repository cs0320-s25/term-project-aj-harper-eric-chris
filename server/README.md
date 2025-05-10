# MimiCap Audio Captcha Backend

This is the Node.js backend for the MimiCap audio captcha functionality.

## Overview

The backend provides API endpoints for generating and verifying audio-based CAPTCHAs:

- Generating tone-based CAPTCHA challenges
- Verifying user's audio responses to these challenges
- Streaming tone data for playback in the browser

## Getting Started

### Prerequisites

- Node.js v14+ installed
- npm or yarn package manager

### Installation

1. Make sure all dependencies are installed:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev:server
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### Generate Challenge

```
GET /api/audio-captcha/generate
```

Generates a new audio CAPTCHA challenge.

**Response:**

```json
{
  "success": true,
  "challengeId": "string",
  "message": "Audio challenge generated successfully"
}
```

### Get Tone

```
GET /api/audio-captcha/tone/:id
```

Returns the tone data for a specific challenge.

**Parameters:**

- `id`: Challenge ID

**Response:**

```json
{
  "success": true,
  "frequency": 300,
  "message": "Tone data retrieved successfully"
}
```

### Verify Response

```
POST /api/audio-captcha/verify
```

Verifies a user's audio response against the challenge.

**Request Body:**

```json
{
  "challengeId": "string",
  "recordedFrequency": 310
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Audio challenge verified successfully"
}
```

**Response (Failure):**

```json
{
  "success": false,
  "message": "Audio response does not match the challenge",
  "expected": 300,
  "received": 400,
  "tolerance": "±45.00 Hz"
}
```

## Architecture

The backend uses an in-memory store for challenges in this implementation. In a production environment, you would want to use a database to store challenge data.

## Future Improvements

1. Add database persistence for challenges
2. Add more complex tone patterns (multiple tones, varying durations)
3. Implement actual audio file generation and streaming
4. Add rate limiting and additional security measures
