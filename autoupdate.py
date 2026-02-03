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
            current_entry = local_data[past_word]
            
            # Check if we need to update:
            # - If category isn't "A" OR
            # - If the date is missing (null) OR
            # - If the date is different from 'yesterday'
            needs_update = (current_entry.get('category') != 'A' or 
                            current_entry.get('date') != yesterday)

            if needs_update:
                local_data[past_word]['category'] = 'A'
                local_data[past_word]['date'] = yesterday
                
                with open('all_words.json', 'w') as f:
                    json.dump(local_data, f, indent=4)
                print(f"SUCCESS: Updated '{past_word.upper()}' to Category A with date {yesterday}.")
            else:
                print(f"NOTICE: '{past_word.upper()}' is already up-to-date (Category A, Date: {yesterday}).")
        else:
            print(f"ERROR: '{past_word.upper()}' not found in local dictionary.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    update_json()
