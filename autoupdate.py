import requests
import json
from datetime import datetime, timedelta
import pytz

def update_json():
    # 1. Set the timezone to Pacific
    pacific = pytz.timezone('US/Pacific')
    now = datetime.now(pacific)
    
    # 2. Target Yesterday
    yesterday = (now - timedelta(days=1)).strftime('%Y-%m-%d')
    
    url = f"https://www.nytimes.com/svc/wordle/v2/{yesterday}.json"
    
    print(f"--- Running Cleanup for: {yesterday} ---")
    
    try:
        response = requests.get(url)
        if response.status_code != 200:
            print(f"Error: Could not find the archived word for {yesterday}")
            return
            
        data_nyt = response.json()
        past_word = data_nyt.get('solution', '').lower()
        
        if not past_word:
            print("Error: NYT data format has changed.")
            return
            
        print(f"Archiving completed word: {past_word.upper()}")

        with open('all_words.json', 'r') as f:
            local_data = json.load(f)
        
        if past_word in local_data:
            if local_data[past_word] != 'A':
                local_data[past_word] = 'A'
                with open('all_words.json', 'w') as f:
                    json.dump(local_data, f, indent=4)
                print(f"SUCCESS: Moved '{past_word.upper()}' to Category A.")
            else:
                print(f"NOTICE: '{past_word.upper()}' was already archived.")
        else:
            print(f"WARNING: '{past_word.upper()}' not found in dictionary.")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    update_json()
