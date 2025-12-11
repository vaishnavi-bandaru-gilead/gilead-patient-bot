import os
import requests
from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Route: API to generate the Direct Line Token
@app.route('/api/directline/token', methods=['GET'])
def get_token():
    secret = os.getenv('DIRECT_LINE_SECRET')

    if not secret:
        return jsonify({'error': 'Direct Line Secret is missing'}), 500

    url = 'https://a26b9f3d97e6e3f0840cb199d34fcf.0b.environment.api.powerplatform.com/powervirtualagents/botsbyschema/crc60_hcpBot/directline/tokens/generate'
    headers = {'Authorization': f'Bearer {secret}'}

    try:
        response = requests.post(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return jsonify({
            'token': data['token'],
            'conversationId': data['conversationId']
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'Failed to generate token'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)