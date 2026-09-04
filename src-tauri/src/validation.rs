use url::Url;

pub(crate) fn parse_http_url(value: &str) -> Option<Url> {
    let value = value.trim();
    let (_, authority) = value.split_once("://")?;
    if authority.is_empty() || authority.starts_with('/') {
        return None;
    }
    Url::parse(value).ok().filter(|url| {
        matches!(url.scheme(), "http" | "https")
            && url.host_str().is_some_and(|host| !host.is_empty())
    })
}

pub(crate) fn is_valid_hex_color(color: &str) -> bool {
    color.len() == 7
        && color.starts_with('#')
        && color[1..]
            .bytes()
            .all(|character| character.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::{is_valid_hex_color, parse_http_url};

    #[test]
    fn http_url_requires_a_supported_scheme_and_explicit_host() {
        assert!(parse_http_url("https://example.com/path").is_some());
        assert!(parse_http_url("HTTP://localhost:3000").is_some());
        assert!(parse_http_url("https:///missing-host").is_none());
        assert!(parse_http_url("file:///C:/Windows/win.ini").is_none());
        assert!(parse_http_url("javascript:alert(1)").is_none());
    }

    #[test]
    fn color_accepts_only_six_digit_hex() {
        assert!(is_valid_hex_color("#6366f1"));
        assert!(is_valid_hex_color("#ABCDEF"));
        assert!(!is_valid_hex_color("red"));
        assert!(!is_valid_hex_color("url(file:///C:/secret)"));
    }
}
