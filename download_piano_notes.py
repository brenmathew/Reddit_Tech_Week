import os
import requests
from pydub import AudioSegment

# Create audio directory if it doesn't exist
os.makedirs('static/audio', exist_ok=True)

# Piano notes from freesound.org (these are example URLs - you'll need to replace with actual URLs)
notes = {
    'c4': 'https://cdn.freesound.org/previews/68/68437_774-lq.mp3',
    'e4': 'https://cdn.freesound.org/previews/68/68441_774-lq.mp3',
    'g4': 'https://cdn.freesound.org/previews/68/68448_774-lq.mp3',
    'b4': 'https://cdn.freesound.org/previews/68/68435_774-lq.mp3'
}

def download_and_convert_note(note_name, url):
    # Download the MP3
    response = requests.get(url)
    if response.status_code == 200:
        # Save the raw MP3
        temp_path = f'static/audio/{note_name}_temp.mp3'
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        
        # Convert to proper format and duration
        audio = AudioSegment.from_mp3(temp_path)
        # Trim to 300ms and normalize volume
        audio = audio[:300].normalize()
        # Export as MP3
        audio.export(f'static/audio/{note_name}.mp3', format='mp3')
        
        # Clean up temp file
        os.remove(temp_path)
        print(f'Successfully processed {note_name}')
    else:
        print(f'Failed to download {note_name}')

# Download and process each note
for note_name, url in notes.items():
    download_and_convert_note(note_name, url) 