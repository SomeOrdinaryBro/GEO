# GEO Monitoring Site

Static site that visualizes automated audits and monitors the [DNA Behavior](https://dnabehavior.com) website.

## Development

```bash
python scripts/run_audit.py      # generate data/report.json
python scripts/check_dna_behavior.py  # quick uptime check
```

## GitHub Actions

- `Build Report` runs weekly to refresh `data/report.json`.
- `Monitor DNA Behavior` pings the site every 30 minutes.

Site can be served via GitHub Pages from the `main` branch.
