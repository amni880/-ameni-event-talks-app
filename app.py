from flask import Flask, jsonify, render_template
import feedparser
import requests

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def release_notes():
    try:
        # Fetch the feed XML with a timeout
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        feed = feedparser.parse(response.text)
        
        entries = []
        for entry in feed.entries:
            entries.append({
                'id': entry.get('id', ''),
                'title': entry.get('title', ''),
                'link': entry.get('link', ''),
                'updated': entry.get('updated', ''),
                'summary': entry.get('summary', '')
            })
            
        return jsonify({
            'success': True,
            'title': feed.feed.get('title', 'BigQuery Release Notes'),
            'entries': entries
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
