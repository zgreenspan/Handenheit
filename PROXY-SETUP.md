# Proxy Server Setup for AI Search

The AI search feature requires a proxy server to work around browser CORS restrictions. This is a simple Python server that forwards API requests to Anthropic.

## Quick Start

### Step 1: Install Python Dependencies

Open Terminal and navigate to the Attendees folder:

```bash
cd /Users/zacharygreenspan/Documents/Attendees
```

Install the required Python packages:

```bash
pip install flask flask-cors requests
```

Or if you're using Python 3:

```bash
pip3 install flask flask-cors requests
```

### Step 2: Start the Proxy Server

In Terminal, run:

```bash
python3 proxy-server.py
```

You should see:
```
Starting proxy server on http://localhost:5001
 * Running on http://localhost:5001
```

**Keep this Terminal window open** - the proxy server needs to run in the background.

### Step 3: Start the Main Application Server

Open a **second** Terminal window/tab and run:

```bash
cd /Users/zacharygreenspan/Documents/Attendees
python3 -m http.server 8000
```

You should see:
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

**Keep this Terminal window open too.**

### Step 4: Use the Application

1. Open your browser and go to: **http://localhost:8000/index.html**
2. Go to the Import/Export tab and enter your Anthropic API key
3. The AI search should now work!

## What's Running?

You now have TWO servers running:

1. **Port 8000**: Serves the HTML/CSS/JS files
2. **Port 5001**: Proxy server that handles API calls to Anthropic

Both need to be running for AI search to work.

## Troubleshooting

**"Address already in use" error**

If you get this error, one of the servers is already running. Find and kill the process:

```bash
# Find what's using port 8000
lsof -i :8000
# Kill it (replace PID with the actual process ID)
kill -9 PID

# Same for port 5001
lsof -i :5001
kill -9 PID
```

**"Module not found" error**

Make sure you installed the Python dependencies:

```bash
pip3 install flask flask-cors requests
```

**AI search still shows "Failed to fetch"**

1. Check that BOTH servers are running (Terminal windows open)
2. Make sure you're accessing via http://localhost:8000/index.html (not file://)
3. Check that your API key is saved in the Import/Export tab
4. Open browser console (F12) to see detailed error messages

**"Connection refused" error**

The proxy server (port 5001) isn't running. Start it with:

```bash
python3 proxy-server.py
```

## Why Do We Need This?

The Anthropic API doesn't allow direct calls from web browsers due to CORS (Cross-Origin Resource Sharing) security policies. The proxy server acts as a middleman:

1. Your browser sends requests to the proxy (localhost:5001)
2. The proxy forwards them to Anthropic's API
3. The proxy returns the results to your browser

This keeps your API key secure and bypasses CORS restrictions.

## Stopping the Servers

To stop either server, go to its Terminal window and press:

```
Ctrl + C
```

## Alternative: Use Without AI Search

If you don't want to set up the proxy server, you can use the application without AI search:

1. Just run the main server: `python3 -m http.server 8000`
2. Access via: http://localhost:8000/index.html
3. Use the regular search box (text search) instead of AI search
4. Everything else works normally
