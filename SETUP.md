# Environment Setup Guide

## Required Environment Variables

To fix the "Failed to fetch" error, you need to create a `.env.local` file in the root directory of your project with the following variables:

### 1. Create `.env.local` file

Create a file named `.env.local` in the root directory of your project and add the following content:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# OpenAI Configuration (if needed)
OPENAI_API_KEY=your_openai_api_key_here

# HeyGen Configuration (if needed)
HEYGEN_API_KEY=your_heygen_api_key_here
```

### 2. Configure the API URL

Replace `http://localhost:8000` with the actual URL of your backend API server. If you're running the backend locally, it might be:
- `http://localhost:3000`
- `http://localhost:5000`
- `http://localhost:8000`
- Or any other port your backend is running on

### 3. Restart the Development Server

After creating the `.env.local` file, restart your Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Error Details

The "Failed to fetch" error occurs because:
1. The `NEXT_PUBLIC_API_URL` environment variable is not set
2. This causes the fetch requests to try to call `undefined/chat` instead of a proper URL
3. The browser cannot make requests to `undefined`, resulting in the fetch error

## Verification

To verify that the environment variable is properly set, check the browser console. You should see:
```
process.env.NEXT_PUBLIC_API_URL http://localhost:8000
```

Instead of:
```
process.env.NEXT_PUBLIC_API_URL undefined
```

## Additional Notes

- The `.env.local` file is already in `.gitignore`, so it won't be committed to version control
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Make sure your backend API server is running and accessible at the specified URL 