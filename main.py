from flask import Flask, render_template, url_for
from flask_cors import CORS
import os

# Get the absolute path of the current directory
template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))

# Create Flask app with explicit template and static folder paths
app = Flask(__name__, 
            template_folder=template_dir,
            static_folder=static_dir)
CORS(app)

@app.route('/')
def home():
    # Check if logo exists
    logo_exists = os.path.exists(os.path.join(static_dir, 'reddit-logo.png'))
    return render_template('index.html', logo_exists=logo_exists)

if __name__ == '__main__':
    print("Starting Reddit Piano Tiles server...")
    print("Open http://localhost:5000 in your web browser")
    print(f"Template directory: {template_dir}")
    app.run(debug=True) 