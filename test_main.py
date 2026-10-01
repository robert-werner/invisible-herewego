import unittest
from contextlib import contextmanager
from unittest.mock import patch

from main import GEOCODE_HOST, REQUEST_TIMEOUT_MS, WEGO_URL, geocode_api_key, main


class GeocodeApiKeyTests(unittest.TestCase):
    def test_extracts_key_from_matching_request(self):
        self.assertEqual(
            geocode_api_key(
                f"https://{GEOCODE_HOST}/v1/geocode?q=Berlin&apikey=example-key"
            ),
            "example-key",
        )

    def test_ignores_other_hosts_and_paths(self):
        self.assertIsNone(
            geocode_api_key("https://untrusted.example/v1/geocode?apikey=wrong")
        )
        self.assertIsNone(
            geocode_api_key(f"https://{GEOCODE_HOST}/v1/other?apikey=wrong")
        )
        self.assertIsNone(
            geocode_api_key(f"http://{GEOCODE_HOST}/v1/geocode?apikey=wrong")
        )

    def test_ignores_missing_or_empty_keys(self):
        self.assertIsNone(geocode_api_key(f"https://{GEOCODE_HOST}/v1/geocode"))
        self.assertIsNone(
            geocode_api_key(f"https://{GEOCODE_HOST}/v1/geocode?apikey=")
        )


class MainTests(unittest.TestCase):
    def test_subscribes_before_navigation_and_prints_key(self):
        events = []
        request_url = f"https://{GEOCODE_HOST}/v1/geocode?apikey=example-key"

        class FakeRequest:
            url = request_url

        class FakePage:
            @contextmanager
            def expect_request(self, predicate, *, timeout):
                events.append("subscribe")
                self.request_matches = predicate(FakeRequest())
                self.timeout = timeout
                yield self

            def goto(self, url, *, wait_until):
                events.append("navigate")
                self.url = url
                self.wait_until = wait_until

            @property
            def value(self):
                return FakeRequest()

        class FakeBrowser:
            def __enter__(self):
                return self

            def __exit__(self, *_):
                pass

            def new_page(self):
                return page

        page = FakePage()
        with patch("main.InvisiblePlaywright", return_value=FakeBrowser()):
            with patch("builtins.print") as print_mock:
                main()

        self.assertEqual(events, ["subscribe", "navigate"])
        self.assertTrue(page.request_matches)
        self.assertEqual(page.url, WEGO_URL)
        self.assertEqual(page.wait_until, "domcontentloaded")
        self.assertEqual(page.timeout, REQUEST_TIMEOUT_MS)
        print_mock.assert_called_once_with("example-key")


if __name__ == "__main__":
    unittest.main()
