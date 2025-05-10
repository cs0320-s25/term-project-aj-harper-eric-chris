# MimiCap Captcha Backend

This is the Node.js backend for the MimiCap captcha functionality, including both audio and facial expression challenges.

## Overview

The backend provides API endpoints for generating and verifying both audio-based and facial expression-based CAPTCHAs:

- Generating tone-based and facial expression CAPTCHA challenges
- Verifying user's audio and facial responses to these challenges
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

### Audio Captcha

#### Generate Challenge

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

#### Get Tone

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

#### Verify Response

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

### Facial Expression Captcha

#### Generate Challenge

```
GET /api/facial-captcha/generate
```

Generates a new facial expression CAPTCHA challenge.

**Response:**

```json
{
  "success": true,
  "challengeId": "string",
  "currentExpression": "happy",
  "totalExpressions": 3,
  "message": "Facial expression challenge generated successfully"
}
```

#### Verify Expression

```
POST /api/facial-captcha/verify
```

Verifies a user's facial expression against the current step in the challenge.

**Request Body:**

```json
{
  "challengeId": "string",
  "expressionData": {
    "expression": "happy",
    "confidence": 0.75,
    "timestamp": 1692835256789
  }
}
```

**Response (Success, Challenge Complete):**

```json
{
  "success": true,
  "message": "Facial expression challenge completed successfully",
  "isComplete": true
}
```

**Response (Success, Next Expression):**

```json
{
  "success": true,
  "message": "Expression verified successfully",
  "isComplete": false,
  "nextExpression": "sad",
  "remainingExpressions": 1
}
```

**Response (Failure):**

```json
{
  "success": false,
  "message": "Expression not matched with sufficient confidence",
  "expectedExpression": "happy",
  "receivedConfidence": 0.3,
  "requiredConfidence": "easy"
}
```

#### Skip Expression

```
POST /api/facial-captcha/skip
```

Skips the current expression and provides a new one.

**Request Body:**

```json
{
  "challengeId": "string"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Expression skipped successfully",
  "newExpression": "surprised"
}
```

#### Get Challenge Status

```
GET /api/facial-captcha/status/:id
```

Returns the current status of a facial expression challenge.

**Parameters:**

- `id`: Challenge ID

**Response:**

```json
{
  "success": true,
  "message": "Challenge status retrieved successfully",
  "currentExpression": "happy",
  "currentIndex": 0,
  "totalExpressions": 3,
  "timeRemaining": 240000
}
```

## Security Measures

The backend implements several security features:

1. Rate limiting to prevent brute force attacks
2. Challenge expiration (5 minutes)
3. Replay attack protection for both audio and facial responses
4. Server-side verification of all challenge responses
5. Tolerance-based verification that adapts to difficulty

## Architecture

The backend uses an in-memory store for challenges in this implementation. In a production environment, you would want to use a database to store challenge data.

## Future Improvements

1. Add database persistence for challenges
2. Add more complex tone patterns (multiple tones, varying durations)
3. Implement more facial expression combinations
4. Add behavioral analysis to detect bots
5. Add rate limiting and additional security measures on a per-IP basis
