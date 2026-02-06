import json
import requests
from datetime import datetime
import os

def load_existing_data():
    """Lädt die bestehende data.json Datei."""
    try:
        with open('data.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print("data.json nicht gefunden. Erstelle neue Datei...")
        return []

def update_tool_prices(tools):
    """Aktualisiert Preise von KI-Tools (Beispiel-Implementierung)."""
    updated_count = 0
    for tool in tools:
        # Hier könntest du echte API-Aufrufe machen
        # Beispiel: Preis von ChatGPT prüfen
        if tool['id'] == 'chatgpt':
            # Simuliere Preisaktualisierung
            old_price = tool['priceDisplay']
            tool['priceDisplay'] = "Free/$25"  # Neuer Preis
            if old_price != tool['priceDisplay']:
                updated_count += 1
                print(f"Preis aktualisiert: {tool['name']} - {old_price} -> {tool['priceDisplay']}")
    
    return updated_count

def check_for_new_tools(existing_tools):
    """Prüft auf neue KI-Tools (Beispiel-Implementierung)."""
    # Hier könntest du APIs von Product Hunt, GitHub Trends, etc. abfragen
    new_tools = []
    
    # Beispiel: Ein neues Tool hinzufügen
    example_new_tool = {
        "id": "new-ai-tool-" + datetime.now().strftime("%Y%m%d"),
        "numericId": len(existing_tools) + 1,
        "name": "Neues KI Tool",
        "category": "text",
        "price": "freemium",
        "priceDisplay": "Free/$15",
        "rating": 4.5,
        "description": {
            "de": "Ein brandneues KI Tool für Texte.",
            "en": "A brand new AI tool for text."
        },
        "features": ["AI", "Text", "New"],
        "link": "https://example.com",
        "badge": "new",
        "useCases": ["writing", "editing"],
        "votes": 0,
        "hasLifetimeDeal": False
    }
    
    # Nur hinzufügen, wenn nicht bereits existiert
    if not any(t['name'] == example_new_tool['name'] for t in existing_tools):
        new_tools.append(example_new_tool)
    
    return new_tools

def update_ratings_based_on_votes(tools):
    """Aktualisiert Bewertungen basierend auf Votes."""
    for tool in tools:
        # Simuliere Rating-Anpassung basierend auf Popularität
        if tool['votes'] > 100:
            tool['rating'] = min(5.0, tool['rating'] + 0.1)
        elif tool['votes'] < 10:
            tool['rating'] = max(3.0, tool['rating'] - 0.1)

def main():
    print("Starte KI-Tools Datenaktualisierung...")
    print(f"Zeit: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Bestehende Daten laden
    tools = load_existing_data()
    original_count = len(tools)
    
    # Preise aktualisieren
    price_updates = update_tool_prices(tools)
    
    # Nach neuen Tools suchen
    new_tools = check_for_new_tools(tools)
    
    # Neue Tools hinzufügen
    for new_tool in new_tools:
        tools.append(new_tool)
    
    # Ratings aktualisieren
    update_ratings_based_on_votes(tools)
    
    # Daten speichern
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(tools, f, ensure_ascii=False, indent=2)
    
    print(f"\nZusammenfassung:")
    print(f"- Ursprüngliche Tools: {original_count}")
    print(f"- Preisaktualisierungen: {price_updates}")
    print(f"- Neue Tools hinzugefügt: {len(new_tools)}")
    print(f"- Gesamt Tools nach Update: {len(tools)}")
    print("\nUpdate abgeschlossen!")

if __name__ == "__main__":
    main()
