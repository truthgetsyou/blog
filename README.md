# Jay's Blog

This repository powers my personal blog.

Live site: [https://truthgetsyou.github.io/blog/](https://truthgetsyou.github.io/blog/)

## Run locally

No build step is required.

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/`

## Write a new post

Add a markdown file under `contents/` (you can use folders).

## Deploy

Deploy all changes (notes, app code, styles, etc.):

```bash
./deploy.sh
```

Optional commit message:

```bash
./deploy.sh "Add new note"
```
