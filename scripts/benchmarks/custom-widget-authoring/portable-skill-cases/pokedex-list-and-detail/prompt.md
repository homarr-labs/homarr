---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write]
---

Create a complete Pokédex widget using PokéAPI. It must have a substantial polished UI with a direct name lookup, a searchable loaded list that stays visible while details open in a separate responsive result area, sprites, types, abilities, base-stat progress bars, and clear initial, loading, empty, failure, and success states. Use a restrained accent and flexible tile sizing rather than repetitive nested cards or a fixed-height list. Completeness must come from tested useful interactions, not filler JSX.

API notes I verified: Use GET /api/v2/pokemon?limit=<option>&offset=<option> for the list and GET /api/v2/pokemon/{param:name} as a manual detail query for both direct typed lookup and selected list items. Keep the list visible while rendering detail output. Prefer sprites.other.official-artwork.front_default from the tested detail response rather than parsing an ID from a list URL. PokeAPI needs no authentication.
Docs: https://pokeapi.co/docs/v2

Sample responses from my instance:

GET /api/v2/pokemon/{param:name}:

```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "sprites": {
    "other": {
      "official-artwork": {
        "front_default": "https://example.test/pikachu.png"
      }
    }
  },
  "types": [
    {
      "slot": 1,
      "type": {
        "name": "electric"
      }
    }
  ],
  "abilities": [
    {
      "ability": {
        "name": "static"
      },
      "is_hidden": false
    }
  ],
  "stats": [
    {
      "base_stat": 35,
      "stat": {
        "name": "hp"
      }
    },
    {
      "base_stat": 90,
      "stat": {
        "name": "speed"
      }
    }
  ]
}
```

GET /api/v2/pokemon:

```json
{
  "count": 1302,
  "next": "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
  "previous": null,
  "results": [
    {
      "name": "bulbasaur",
      "url": "https://pokeapi.co/api/v2/pokemon/1/"
    },
    {
      "name": "pikachu",
      "url": "https://pokeapi.co/api/v2/pokemon/25/"
    }
  ]
}
```

Homarr isn't connected to this chat, so give me the widget definition to import.
