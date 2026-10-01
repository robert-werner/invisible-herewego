# HERE WeGo API key generator

This project includes a small Node.js microfrontend around `main.py`.

## Run

```bash
npm start
```

Open `http://127.0.0.1:3000` and click **GENERATE**.

The server uses `.venv/bin/python` automatically when it exists. To use a
different Python interpreter:

```bash
PYTHON_BIN=/path/to/python npm start
```

Optional environment variables:

- `PORT` — HTTP port, defaults to `3000`
- `HOST` — bind address, defaults to `127.0.0.1`
- `PYTHON_BIN` — Python executable used to run `main.py`

## Test

```bash
npm test
```
