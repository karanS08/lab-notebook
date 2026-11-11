# Shelf media

`media.json` drives the speaker and the CD stack on the desk.

```json
{
  "song": {
    "title": "Song title",
    "artist": "Artist",
    "spotify": "https://open.spotify.com/track/XXXXXXXXXXXXXXXXXXXXXX"
  },
  "movies": [
    { "title": "Movie title", "year": 2010, "note": "optional one-liner on hover" }
  ]
}
```

- `spotify`: in Spotify, Share → Copy Song Link. Clicking the speaker opens Spotify's own
  player card (30 s preview for logged-out visitors, full song when logged in).
- `movies`: up to 10, top of the list is the bottom of the stack. Spines show the title
  and year only (no poster art).
