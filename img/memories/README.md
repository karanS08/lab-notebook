# Memory board

Photos for the green soft board on the left of the desk.

1. Put the photo in this folder (jpg/png/webp, about 1000 px on the long side is plenty).
2. Add an entry to `memories.json`, in the order you want them pinned (up to 15):

```json
[
  { "photo": "2017-hot-glue-arm.jpg", "date": "14 . 11 . 2017", "note": "first arm. hot glue everywhere" },
  { "photo": "uts-first-day.jpg", "date": "Feb 2025", "note": "first day at UTS", "focus": [0.5, 0.3] }
]
```

- `photo`: file name in this folder.
- `date`, `note`: handwritten on the white border (keep the note short, it wraps over two lines).
- `focus` (optional): which part of the photo stays in the square crop, `[x, y]` from 0 to 1. Default is the centre.

Empty slots show placeholder photos until there are at least 8 entries.
