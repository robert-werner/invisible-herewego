"""Print the API key used by HERE WeGo's geocode requests."""

from urllib.parse import parse_qs, urlsplit

from invisible_playwright import InvisiblePlaywright
from invisible_playwright._pw.sync_api import TimeoutError as PlaywrightTimeoutError

WEGO_URL = "https://wego.here.com"
GEOCODE_HOST = "geocode.search.hereapi.com"
REQUEST_TIMEOUT_MS = 30_000


def geocode_api_key(request_url: str) -> str | None:
    """Return a nonempty key only for the expected geocode endpoint."""
    url = urlsplit(request_url)
    if (
        url.scheme != "https"
        or url.hostname != GEOCODE_HOST
        or url.path != "/v1/geocode"
    ):
        return None

    return next(
        (key for key in parse_qs(url.query).get("apikey", []) if key),
        None,
    )


def main() -> None:
    with InvisiblePlaywright() as browser:
        page = browser.new_page()
        try:
            # Subscribe before navigation so requests during page load are not missed.
            with page.expect_request(
                lambda request: geocode_api_key(request.url) is not None,
                timeout=REQUEST_TIMEOUT_MS,
            ) as request_info:
                page.goto(WEGO_URL, wait_until="domcontentloaded")
            api_key = geocode_api_key(request_info.value.url)
        except PlaywrightTimeoutError as exc:
            raise SystemExit(
                "Timed out loading HERE WeGo or waiting for a geocode request "
                "containing an API key."
            ) from exc

        print(api_key)


if __name__ == "__main__":
    main()
