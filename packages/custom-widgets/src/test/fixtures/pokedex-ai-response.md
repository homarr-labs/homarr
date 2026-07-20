```json
{
  "$schema": "homarr-custom-widget-v2",
  "name": "Pokédex",
  "description": "Browse Pokémon from PokeAPI, view stats/types/abilities, and keep a list of favorites. Every section can be shown or hidden.",
  "iconUrl": "https://raw.githubusercontent.com/PokeAPI/media/master/logo/pokeapi_256.png",
  "sources": [
    {
      "id": "default",
      "name": "PokeAPI",
      "baseUrl": "https://pokeapi.co/api/v2",
      "networkScope": "public",
      "auth": { "type": "none" }
    }
  ],
  "requests": [
    {
      "id": "list",
      "sourceId": "default",
      "kind": "query",
      "method": "GET",
      "pathTemplate": "/pokemon",
      "parameters": { "pokemonLimit": { "type": "number" } },
      "queryTemplate": { "limit": { "$param": "pokemonLimit" }, "offset": 0 },
      "auth": "inherit",
      "minimumBoardPermission": "view",
      "trigger": "load",
      "invalidates": []
    },
    {
      "id": "detail",
      "sourceId": "default",
      "kind": "query",
      "method": "GET",
      "pathTemplate": "/pokemon/{name}",
      "parameters": { "name": { "type": "string" } },
      "auth": "inherit",
      "minimumBoardPermission": "view",
      "trigger": "manual",
      "invalidates": []
    }
  ],
  "optionsSchema": {
    "type": "object",
    "properties": {
      "pokemonLimit": {
        "type": "number",
        "title": "Number of Pokémon to load",
        "minimum": 1,
        "maximum": 1000,
        "x-homarr": { "control": "number" }
      },
      "showSprite": { "type": "boolean", "title": "Show sprite image", "x-homarr": { "control": "switch" } },
      "showTypes": { "type": "boolean", "title": "Show type badges", "x-homarr": { "control": "switch" } },
      "showStats": { "type": "boolean", "title": "Show base stats", "x-homarr": { "control": "switch" } },
      "showAbilities": { "type": "boolean", "title": "Show abilities", "x-homarr": { "control": "switch" } },
      "showPhysical": { "type": "boolean", "title": "Show height and weight", "x-homarr": { "control": "switch" } },
      "showFavoritesBar": {
        "type": "boolean",
        "title": "Show favorites-only toggle",
        "x-homarr": { "control": "switch" }
      },
      "accentColor": { "type": "string", "title": "Accent color", "x-homarr": { "control": "color" } }
    },
    "additionalProperties": false
  },
  "defaultOptions": {
    "pokemonLimit": 151,
    "showSprite": true,
    "showTypes": true,
    "showStats": true,
    "showAbilities": true,
    "showPhysical": true,
    "showFavoritesBar": true,
    "accentColor": "#e3350d"
  },
  "stateSchema": {
    "type": "object",
    "properties": {
      "selectedPokemon": { "type": "string" },
      "favorites": { "type": "array", "items": { "type": "string" } },
      "favoritesOnly": { "type": "boolean" }
    }
  },
  "defaultState": { "selectedPokemon": "", "favorites": [], "favoritesOnly": false },
  "template": "**HOMARR\_TEMPLATE**"
}
```
