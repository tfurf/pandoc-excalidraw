# pandoc-excalidraw

Pandoc filter that renders [Excalidraw](https://excalidraw.com) diagrams to SVG (HTML outputs) or PNG (all other outputs).

## Prerequisites

- Node.js ≥ 18
- [Pandoc](https://pandoc.org)

## Install

For a document repo, install the filter locally as a dev dependency:

```sh
npm install --save-dev pandoc-excalidraw
```

You can also install directly from GitHub:

```sh
npm install --save-dev github:tfurf/pandoc-excalidraw
```

Global install is optional for one-off local use:

```sh
npm install -g pandoc-excalidraw
```

## Usage

Reference `.excalidraw` files as images in Markdown:

```markdown
![My diagram](diagram.excalidraw)
```

Run Pandoc with the filter:

```sh
pandoc --filter ./node_modules/.bin/pandoc-excalidraw input.md -o output.html
pandoc --filter ./node_modules/.bin/pandoc-excalidraw input.md -o output.pdf
```

If you installed globally, you can use `pandoc-excalidraw` directly.

Example `package.json` for a document repo:

```json
{
	"devDependencies": {
		"pandoc-excalidraw": "^0.1.0"
	},
	"scripts": {
		"build:html": "pandoc --filter ./node_modules/.bin/pandoc-excalidraw input.md -o output.html",
		"build:pdf": "pandoc --filter ./node_modules/.bin/pandoc-excalidraw input.md -o output.pdf"
	}
}
```

The rendered image is written alongside the source `.excalidraw` file as `diagram.svg` or `diagram.png`.

## Partial export

Export a subset of a large canvas using image attributes:

| Attribute  | Description                       | Example                         |
|------------|-----------------------------------|---------------------------------|
| `ex-frame` | Frame element id                  | `{ex-frame="abc123"}`           |
| `ex-ids`   | Comma-separated element ids       | `{ex-ids="id1,id2"}`            |
| `ex-area`  | Bounding box `x,y,width,height`   | `{ex-area="0,0,800,600"}`       |
| `ex-pad`   | Padding in px around selection    | `{ex-pad="24"}`                 |
| `ex-scale` | PNG scale factor (default 1)      | `{ex-scale="2"}`                |

Selection priority: `ex-ids` > `ex-frame` > `ex-area` > full canvas.

```markdown
![Section A](diagram.excalidraw){ex-frame="frame-id" ex-pad="16"}
```

Output filenames include a fingerprint of the selector so different exports from the same source file never collide:

```
diagram--frame-abc123.svg
diagram--ids-id1-id2.png
diagram--area-0-0-800-600.svg
```

## Development

```sh
npm install
npm test        # run tests
npm run build   # compile TypeScript to dist/
```

## License

MIT.
