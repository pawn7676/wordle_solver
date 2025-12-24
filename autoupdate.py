import requests
from bs4 import BeautifulSoup
import json
import sys

def update_json():
    # The URL you suggested
    url = "https://wordfinder.yourdictionary.com/wordle/answers/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    print("--- Starting Daily Update ---")
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # This targets the bold word in the first table cell of that site
        answer_cell = soup.find('td')
        if not answer_cell:
            print("Error: Could not find the answer table on the website.")
            return
            
        today_word = answer_cell.find('b').text.strip().lower()
        print(f"Scraper found today's word: {today_word.upper()}")

        if len(today_word) == 5:
            with open('all_words.json', 'r') as f:
                data = json.load(f)
            
            if today_word in data:
                if data[today_word] != 'A':
                    data[today_word] = 'A'
                    with open('all_words.json', 'w') as f:
                        json.dump(data, f, indent=4)
                    print(f"SUCCESS: '{today_word.upper()}' updated to Category A.")
                else:
                    print(f"NOTICE: '{today_word.upper()}' was already Category A. No change needed.")
            else:
                print(f"WARNING: '{today_word.upper()}' not found in your dictionary.")
        else:
            print(f"Error: Scraped word '{today_word}' is not 5 letters.")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    update_json()
